import os
import uuid
import base64
import logging
import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import requests as sync_requests

from app.database import db
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

# --- Emergent Object Storage ---
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "thrifty-curator"

_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = sync_requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_LLM_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = sync_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = sync_requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    resp = sync_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = sync_requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# --- Pydantic Models ---
class CreateConversationRequest(BaseModel):
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    text: str
    image_ids: Optional[List[str]] = None


# --- System prompt for the listing assistant ---
SYSTEM_PROMPT = """You are the Thrifty Curator Listing Assistant — a resale product specialist helping employees list items on Vendoo. Be concise and copy-paste ready. Do not include blank templates or fill-in-the-blank sections — the business has its own templates."""


# In-memory LlmChat instances keyed by conversation_id
_chat_sessions: dict = {}

# Max image size: 5MB
MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


# --- Helpers ---
async def _get_or_create_chat(conversation_id: str, history: list = None, user_id: str = None):
    """Get existing chat session or create new one with history replay including images."""
    if conversation_id in _chat_sessions:
        return _chat_sessions[conversation_id]

    from emergentintegrations.llm.chat import LlmChat, ImageContent

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=SYSTEM_PROMPT,
        )
        .with_model("gemini", "gemini-3.7-flash")
    )

    # Replay stored history with images so LLM has full visual+text context
    # Format must match what _add_user_message produces:
    #   text  -> {"role":"user","content":[{"type":"text","text":"..."}]}
    #   image -> {"role":"user","content":[{"type":"image_url","image_url":{"url":"data:mime;base64,..."}}]}
    #   each image is a SEPARATE message (library convention)
    if history:
        for msg in history:
            role = msg.get("role", "")
            text = msg.get("text", "")
            image_ids = msg.get("image_ids", [])

            if role == "user":
                if text:
                    chat.messages.append({"role": "user", "content": [{"type": "text", "text": text}]})
                if image_ids and user_id:
                    for img_id in image_ids:
                        img_doc = await db.ai_images.find_one(
                            {"id": img_id, "user_id": user_id, "is_deleted": False},
                            {"_id": 0, "base64_data": 1},
                        )
                        if img_doc and img_doc.get("base64_data"):
                            b64 = img_doc["base64_data"]
                            mime = ImageContent.get_mime_type(b64)
                            chat.messages.append({
                                "role": "user",
                                "content": [{"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}],
                            })
            elif role == "assistant" and text:
                chat.messages.append({"role": "assistant", "content": text})

    _chat_sessions[conversation_id] = chat
    return chat


def _cleanup_chat(conversation_id: str):
    """Remove a chat session from memory."""
    _chat_sessions.pop(conversation_id, None)


# --- Endpoints ---

@router.post("/conversations")
async def create_conversation(
    body: CreateConversationRequest,
    user: dict = Depends(get_current_user),
):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conv = {
        "id": conv_id,
        "user_id": user["id"],
        "title": body.title or "New Chat",
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.ai_conversations.insert_one(conv)
    return {"id": conv_id, "title": conv["title"], "created_at": now}


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    cursor = db.ai_conversations.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "title": 1, "created_at": 1, "updated_at": 1},
    ).sort("updated_at", -1).limit(50)
    convs = await cursor.to_list(50)
    return convs


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    conv = await db.ai_conversations.find_one(
        {"id": conv_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    result = await db.ai_conversations.delete_one({"id": conv_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _cleanup_chat(conv_id)
    return {"deleted": True}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Only JPEG, PNG, and WEBP images are allowed. Got: {file.content_type}",
        )

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"

    image_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/ai-images/{user['id']}/{image_id}.{ext}"

    try:
        result = put_object(storage_path, data, file.content_type)
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

    # Store reference in DB
    image_doc = {
        "id": image_id,
        "user_id": user["id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    }
    await db.ai_images.insert_one(image_doc)

    # Also store base64 for sending to Gemini later
    b64 = base64.b64encode(data).decode("utf-8")
    await db.ai_images.update_one(
        {"id": image_id},
        {"$set": {"base64_data": b64}},
    )

    return {
        "id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
    }


@router.get("/images/{image_id}")
async def get_image(
    image_id: str,
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Serve an uploaded image. Accepts auth via Authorization header or ?token= query param."""
    from fastapi.responses import Response
    import jwt as pyjwt

    # Resolve token from header or query param
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization[7:]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    from app.config import JWT_SECRET, JWT_ALGORITHM
    try:
        payload = pyjwt.decode(auth_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    img = await db.ai_images.find_one(
        {"id": image_id, "user_id": user_id, "is_deleted": False}, {"_id": 0}
    )
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        data, content_type = get_object(img["storage_path"])
    except Exception as e:
        logger.error(f"Failed to fetch image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image")

    return Response(content=data, media_type=img.get("content_type", content_type))


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: str,
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
):
    # Verify conversation belongs to user
    conv = await db.ai_conversations.find_one(
        {"id": conv_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc).isoformat()

    # Build user message record
    user_msg_doc = {
        "role": "user",
        "text": body.text,
        "image_ids": body.image_ids or [],
        "timestamp": now,
    }

    # Prepare image attachments for Gemini
    from emergentintegrations.llm.chat import UserMessage, ImageContent, TextDelta, StreamDone
    import asyncio

    # Run DB writes + image fetches in parallel to minimize time-to-first-token
    async def save_user_msg():
        await db.ai_conversations.update_one(
            {"id": conv_id},
            {"$push": {"messages": user_msg_doc}, "$set": {"updated_at": now}},
        )
        if conv.get("title") == "New Chat" and len(conv.get("messages", [])) == 0:
            short_title = body.text[:50] + ("..." if len(body.text) > 50 else "")
            await db.ai_conversations.update_one(
                {"id": conv_id}, {"$set": {"title": short_title}}
            )

    async def fetch_image(img_id):
        doc = await db.ai_images.find_one(
            {"id": img_id, "user_id": user["id"], "is_deleted": False},
            {"_id": 0, "base64_data": 1},
        )
        if doc and doc.get("base64_data"):
            return ImageContent(image_base64=doc["base64_data"])
        return None

    tasks = [save_user_msg()]
    if body.image_ids:
        tasks.extend(fetch_image(iid) for iid in body.image_ids)

    results = await asyncio.gather(*tasks)
    file_contents = [r for r in results[1:] if r is not None]

    chat = await _get_or_create_chat(conv_id, history=conv.get("messages", []), user_id=user["id"])
    user_message = UserMessage(
        text=body.text,
        file_contents=file_contents if file_contents else None,
    )

    async def stream_response():
        full_response = ""
        try:
            async for ev in chat.stream_message(user_message):
                if isinstance(ev, TextDelta):
                    full_response += ev.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break

            yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"

            # Save assistant response in background (don't block the stream close)
            assistant_msg = {
                "role": "assistant",
                "text": full_response,
                "image_ids": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await db.ai_conversations.update_one(
                {"id": conv_id},
                {
                    "$push": {"messages": assistant_msg},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                },
            )
        except Exception as e:
            logger.error(f"AI streaming error: {e}")
            error_msg = "Sorry, I encountered an error. Please try again."
            # Save error as assistant message
            await db.ai_conversations.update_one(
                {"id": conv_id},
                {
                    "$push": {
                        "messages": {
                            "role": "assistant",
                            "text": error_msg,
                            "image_ids": [],
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                    }
                },
            )
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --- Saved Prompts ---

class SavePromptRequest(BaseModel):
    label: str
    text: str


class UpdatePromptRequest(BaseModel):
    label: Optional[str] = None
    text: Optional[str] = None


@router.get("/prompts")
async def list_prompts(user: dict = Depends(get_current_user)):
    cursor = db.ai_prompts.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(100)


@router.post("/prompts")
async def create_prompt(
    body: SavePromptRequest,
    user: dict = Depends(get_current_user),
):
    if not body.label.strip() or not body.text.strip():
        raise HTTPException(status_code=400, detail="Label and text are required")

    prompt_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": prompt_id,
        "user_id": user["id"],
        "label": body.label.strip(),
        "text": body.text.strip(),
        "created_at": now,
    }
    await db.ai_prompts.insert_one(doc)
    return {"id": prompt_id, "label": doc["label"], "text": doc["text"], "created_at": now}


@router.put("/prompts/{prompt_id}")
async def update_prompt(
    prompt_id: str,
    body: UpdatePromptRequest,
    user: dict = Depends(get_current_user),
):
    updates = {}
    if body.label is not None:
        updates["label"] = body.label.strip()
    if body.text is not None:
        updates["text"] = body.text.strip()
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = await db.ai_prompts.update_one(
        {"id": prompt_id, "user_id": user["id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"updated": True}


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, user: dict = Depends(get_current_user)):
    result = await db.ai_prompts.delete_one({"id": prompt_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"deleted": True}
