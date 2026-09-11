"""Business Documents vault – upload, organize, OCR-search, manage."""

import uuid
import os
import re
import base64
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/documents", tags=["documents"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "thriftycurator")

client: Optional[AsyncIOMotorClient] = None
db = None


def get_db():
    global client, db
    if db is None:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
    return db


# ── Auth dependency (admin only) ──────────────────────────────
from app.dependencies import get_current_user, get_admin_user


# ── Default folder list ──────────────────────────────────────
DEFAULT_FOLDERS = ["Banking", "Licenses", "Insurance", "Tax", "Legal", "Receipts", "Other"]


# ── Upload ────────────────────────────────────────────────────
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    folder: str = Form("Other"),
    tags: str = Form(""),
    display_name: str = Form(""),
    admin: dict = Depends(get_admin_user),
):
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 50 MB)")

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    content_type = file.content_type or "application/octet-stream"
    doc_id = str(uuid.uuid4())

    # Store in object storage
    from app.services.object_storage import put_object
    storage_path = f"documents/{doc_id}.{ext}" if ext else f"documents/{doc_id}"
    put_object(storage_path, content, content_type)

    # Generate preview for PDFs
    preview_path = ""
    if ext == "pdf":
        try:
            img_bytes = _pdf_to_image(content)
            preview_path = f"documents/previews/{doc_id}.png"
            put_object(preview_path, img_bytes, "image/png")
        except Exception:
            pass

    # OCR / text extraction
    extracted_text = ""
    if ext == "pdf":
        extracted_text = _extract_pdf_text(content)
    if not extracted_text.strip():
        try:
            if ext == "pdf":
                img_bytes = _pdf_to_image(content) if not preview_path else None
                if preview_path:
                    from app.services.object_storage import get_object
                    img_bytes, _ = get_object(preview_path)
            elif content_type.startswith("image/"):
                img_bytes = content
            else:
                img_bytes = None
            if img_bytes:
                extracted_text = await _ocr_document_text(img_bytes)
        except Exception:
            pass

    # Auto-detect display name if not provided
    if not display_name:
        display_name = file.filename or f"Document {doc_id[:8]}"
        # Strip extension for cleaner display
        if "." in display_name:
            display_name = display_name.rsplit(".", 1)[0]

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    doc = {
        "id": doc_id,
        "filename": file.filename or f"document.{ext}",
        "display_name": display_name,
        "folder": folder,
        "tags": tag_list,
        "content_type": content_type,
        "extension": ext,
        "file_size": len(content),
        "storage_path": storage_path,
        "preview_path": preview_path,
        "extracted_text": extracted_text,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin.get("email", ""),
    }

    database = get_db()
    await database.business_documents.insert_one(doc)

    return {
        "id": doc_id,
        "filename": doc["filename"],
        "display_name": display_name,
        "folder": folder,
        "tags": tag_list,
        "file_size": len(content),
        "content_type": content_type,
        "uploaded_at": doc["uploaded_at"],
    }


# ── List / Search ─────────────────────────────────────────────
@router.get("")
async def list_documents(
    folder: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    admin: dict = Depends(get_admin_user),
):
    database = get_db()
    query = {}

    if folder and folder != "All":
        query["folder"] = folder
    if tag:
        query["tags"] = tag

    if q:
        q_lower = q.lower()
        # Text search across display_name, tags, folder, extracted_text, filename
        query["$or"] = [
            {"display_name": {"$regex": q, "$options": "i"}},
            {"filename": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
            {"folder": {"$regex": q, "$options": "i"}},
            {"extracted_text": {"$regex": q, "$options": "i"}},
        ]

    docs = await database.business_documents.find(
        query, {"_id": 0, "extracted_text": 0}
    ).sort("uploaded_at", -1).to_list(500)

    return {"documents": docs, "total": len(docs)}


# ── Folders & Tags ────────────────────────────────────────────
@router.get("/folders")
async def list_folders(admin: dict = Depends(get_admin_user)):
    database = get_db()
    folders = await database.business_documents.distinct("folder")
    # Merge with defaults
    all_folders = list(set(DEFAULT_FOLDERS + folders))
    all_folders.sort()

    # Get counts
    pipeline = [{"$group": {"_id": "$folder", "count": {"$sum": 1}}}]
    counts_raw = await database.business_documents.aggregate(pipeline).to_list(100)
    counts = {c["_id"]: c["count"] for c in counts_raw}

    total = sum(counts.values())
    result = [{"name": "All", "count": total}]
    for f in all_folders:
        result.append({"name": f, "count": counts.get(f, 0)})

    return {"folders": result}


@router.get("/tags")
async def list_tags(admin: dict = Depends(get_admin_user)):
    database = get_db()
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    tags_raw = await database.business_documents.aggregate(pipeline).to_list(200)
    return {"tags": [{"name": t["_id"], "count": t["count"]} for t in tags_raw]}


# ── Get file / preview ────────────────────────────────────────
@router.get("/{doc_id}/file")
async def get_document_file(
    doc_id: str,
    token: Optional[str] = Query(None),
):
    import jwt as pyjwt
    from app.config import JWT_SECRET, JWT_ALGORITHM

    if not token:
        raise HTTPException(401, "Token required")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(401, "Invalid token")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    database = get_db()
    doc = await database.business_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")

    from app.services.object_storage import get_object
    from fastapi.responses import Response
    data, ct = get_object(doc["storage_path"])
    return Response(
        content=data,
        media_type=doc.get("content_type", ct),
        headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'},
    )


@router.get("/{doc_id}/preview")
async def get_document_preview(
    doc_id: str,
    token: Optional[str] = Query(None),
):
    import jwt as pyjwt
    from app.config import JWT_SECRET, JWT_ALGORITHM

    if not token:
        raise HTTPException(401, "Token required")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(401, "Invalid token")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    database = get_db()
    doc = await database.business_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")

    from fastapi.responses import Response

    if doc.get("content_type", "").startswith("image/"):
        from app.services.object_storage import get_object
        data, ct = get_object(doc["storage_path"])
        return Response(content=data, media_type=ct)

    if doc.get("preview_path"):
        from app.services.object_storage import get_object
        data, ct = get_object(doc["preview_path"])
        return Response(content=data, media_type="image/png")

    raise HTTPException(404, "No preview available")


# ── Update document ───────────────────────────────────────────
@router.patch("/{doc_id}")
async def update_document(
    doc_id: str,
    body: dict,
    admin: dict = Depends(get_admin_user),
):
    database = get_db()
    doc = await database.business_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    updates = {}
    if "display_name" in body:
        updates["display_name"] = body["display_name"]
    if "folder" in body:
        updates["folder"] = body["folder"]
    if "tags" in body:
        updates["tags"] = body["tags"] if isinstance(body["tags"], list) else [t.strip() for t in body["tags"].split(",") if t.strip()]

    if updates:
        await database.business_documents.update_one({"id": doc_id}, {"$set": updates})

    return {"success": True, "updated": list(updates.keys())}


# ── Delete ────────────────────────────────────────────────────
@router.delete("/{doc_id}")
async def delete_document(doc_id: str, admin: dict = Depends(get_admin_user)):
    database = get_db()
    doc = await database.business_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")

    # Note: object storage doesn't have a delete API; records removed from DB only

    await database.business_documents.delete_one({"id": doc_id})
    return {"success": True}


# ── Helpers ───────────────────────────────────────────────────
def _pdf_to_image(content: bytes) -> bytes:
    import fitz
    doc = fitz.open(stream=content, filetype="pdf")
    page = doc.load_page(0)
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")
    doc.close()
    return img_bytes


def _extract_pdf_text(content: bytes) -> str:
    text = ""
    try:
        import pdfplumber, io
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:5]:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception:
        pass
    if not text.strip():
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            for i in range(min(doc.page_count, 5)):
                t = doc.load_page(i).get_text()
                if t:
                    text += t + "\n"
            doc.close()
        except Exception:
            pass
    return text


async def _ocr_document_text(img_bytes: bytes) -> str:
    """Use Gemini vision to OCR a document image."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"doc-ocr-{uuid.uuid4()}",
            system_message="You are a document OCR assistant. Extract ALL visible text from the document image. Preserve structure and line breaks. Return only the extracted text, nothing else.",
        ).with_model("gemini", "gemini-3-flash-preview")

        msg = UserMessage(
            text="Extract all text from this document image.",
            file_contents=[ImageContent(image_base64=b64)],
        )

        result = ""
        async for event in chat.stream_message(msg):
            if isinstance(event, TextDelta):
                result += event.content
            elif isinstance(event, StreamDone):
                break

        return result.strip()
    except Exception:
        return ""
