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
DEFAULT_FOLDERS = ["Bank Account", "LLC Formation", "Tax", "Other"]


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

    # Generate previews for PDFs (all pages)
    preview_paths = []
    page_count = 1
    if ext == "pdf":
        try:
            import fitz
            pdf_doc = fitz.open(stream=content, filetype="pdf")
            page_count = pdf_doc.page_count
            mat = fitz.Matrix(2, 2)
            for i in range(page_count):
                page = pdf_doc.load_page(i)
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                p_path = f"documents/previews/{doc_id}_p{i}.png"
                put_object(p_path, img_bytes, "image/png")
                preview_paths.append(p_path)
            pdf_doc.close()
        except Exception:
            pass

    # OCR / text extraction
    extracted_text = ""
    if ext == "pdf":
        extracted_text = _extract_pdf_text(content)
    if not extracted_text.strip():
        try:
            if ext == "pdf":
                img_bytes = _pdf_to_image(content) if not preview_paths else None
                if preview_paths:
                    from app.services.object_storage import get_object
                    img_bytes, _ = get_object(preview_paths[0])
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
        "preview_paths": preview_paths,
        "page_count": page_count,
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
        headers={
            "Content-Disposition": f'attachment; filename="{doc["filename"]}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/{doc_id}/preview")
async def get_document_preview(
    doc_id: str,
    page: int = Query(0, description="Page number (0-indexed)"),
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

    # Image files: serve directly (single page)
    if doc.get("content_type", "").startswith("image/"):
        from app.services.object_storage import get_object
        data, ct = get_object(doc["storage_path"])
        return Response(content=data, media_type=ct)

    # PDF: serve the requested page preview
    preview_paths = doc.get("preview_paths", [])
    # Backward compat: old docs may have single preview_path
    if not preview_paths and doc.get("preview_path"):
        preview_paths = [doc["preview_path"]]

    if page < 0 or page >= len(preview_paths):
        # Fallback: generate on-the-fly if we have the PDF
        try:
            from app.services.object_storage import get_object
            import fitz
            data, _ = get_object(doc["storage_path"])
            pdf_doc = fitz.open(stream=data, filetype="pdf")
            if page < 0 or page >= pdf_doc.page_count:
                raise HTTPException(404, "Page not found")
            mat = fitz.Matrix(2, 2)
            pix = pdf_doc.load_page(page).get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            pdf_doc.close()
            return Response(content=img_bytes, media_type="image/png")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(404, "No preview available")

    from app.services.object_storage import get_object
    data, ct = get_object(preview_paths[page])
    return Response(content=data, media_type="image/png")


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
    if "page_count" in body and isinstance(body["page_count"], int):
        updates["page_count"] = body["page_count"]

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



@router.post("/backfill-pages")
async def backfill_page_counts(admin: dict = Depends(get_admin_user)):
    """Generate multi-page previews for existing PDFs missing page_count."""
    import fitz
    from app.services.object_storage import get_object, put_object

    database = get_db()
    docs = await database.business_documents.find(
        {"extension": "pdf", "$or": [{"page_count": {"$exists": False}}, {"page_count": None}]},
        {"_id": 0}
    ).to_list(500)

    results = []
    for doc in docs:
        doc_id = doc["id"]
        try:
            data, ct = get_object(doc["storage_path"])
            pdf_doc = fitz.open(stream=data, filetype="pdf")
            page_count = pdf_doc.page_count

            preview_paths = []
            mat = fitz.Matrix(2, 2)
            for i in range(page_count):
                p_path = f"documents/previews/{doc_id}_p{i}.png"
                page = pdf_doc.load_page(i)
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                put_object(p_path, img_bytes, "image/png")
                preview_paths.append(p_path)

            pdf_doc.close()

            await database.business_documents.update_one(
                {"id": doc_id},
                {"$set": {"page_count": page_count, "preview_paths": preview_paths}}
            )
            results.append({"name": doc["display_name"], "pages": page_count, "status": "ok"})
        except Exception as e:
            results.append({"name": doc["display_name"], "pages": 0, "status": str(e)})

    return {"processed": len(results), "results": results}


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
