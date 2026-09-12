from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re

from app.database import db
from app.dependencies import get_admin_user, get_current_user
from app.services.object_storage import put_object, get_object, APP_NAME


def _overlay_sku_on_image(img_bytes: bytes, sku_text: str) -> bytes:
    """Overlay SKU text onto a label image (bottom-right corner, bold, readable)."""
    from PIL import Image, ImageDraw, ImageFont
    import io

    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    w, h = img.size

    # Create overlay layer
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Scale font size based on image dimensions (target ~4% of height)
    font_size = max(24, int(h * 0.04))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

    # Measure text
    bbox = draw.textbbox((0, 0), sku_text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Position: bottom-left with padding
    padding = int(font_size * 0.5)
    x = padding * 2
    y = h - th - padding * 2

    # Draw semi-transparent white background
    draw.rectangle(
        [x - padding, y - padding, x + tw + padding, y + th + padding],
        fill=(255, 255, 255, 220)
    )
    # Draw black border
    draw.rectangle(
        [x - padding, y - padding, x + tw + padding, y + th + padding],
        outline=(0, 0, 0, 180), width=2
    )
    # Draw SKU text
    draw.text((x, y), sku_text, font=font, fill=(0, 0, 0, 255))

    # Composite and convert back to PNG bytes
    result = Image.alpha_composite(img, overlay).convert("RGB")
    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return buf.getvalue()


router = APIRouter(prefix="/orders", tags=["orders"])

# ============== MODELS ==============

class AssignOrdersRequest(BaseModel):
    employee_id: str
    since: Optional[str] = None
    until: Optional[str] = None
    label_ids: Optional[List[str]] = None
    notes: Optional[str] = None

class CompleteOrderRequest(BaseModel):
    notes: Optional[str] = None

# ============== LABEL UPLOAD ==============

@router.post("/labels/upload")
async def upload_label(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
):
    """Upload a shipping label file (PDF, image, etc.)."""
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    label_id = str(uuid.uuid4())
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "pdf"
    storage_path = f"{APP_NAME}/labels/{label_id}.{ext}"
    content_type = file.content_type or "application/octet-stream"

    put_object(storage_path, content, content_type)

    # Try to extract text from PDFs for matching
    extracted_text = ""
    if ext == "pdf":
        extracted_text = _extract_pdf_text(content)

    # Guess platform from filename or extracted text
    platform_guess = _guess_platform(file.filename or "", extracted_text)

    # Try to extract recipient name from label text
    display_name = _extract_recipient_name(extracted_text) if extracted_text else ""

    # If no name from text, try AI vision OCR on the label image
    if not display_name:
        try:
            if ext == "pdf":
                img_bytes = _pdf_to_image(content)
            elif content_type and content_type.startswith("image/"):
                img_bytes = content
            else:
                img_bytes = None
            if img_bytes:
                ocr_name = await _ocr_recipient_name(img_bytes)
                if ocr_name:
                    display_name = ocr_name
                    # Also try to get platform from OCR
                    if not platform_guess:
                        platform_guess = _guess_platform("", ocr_name)
        except Exception:
            pass

    doc = {
        "id": label_id,
        "filename": file.filename or f"label.{ext}",
        "display_name": display_name,
        "storage_path": storage_path,
        "content_type": content_type,
        "file_size": len(content),
        "extension": ext,
        "extracted_text": extracted_text[:2000] if extracted_text else "",
        "platform_guess": platform_guess,
        "sku_tag": "",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin.get("email", ""),
    }
    await db.shipping_labels.insert_one(doc)

    return {
        "id": label_id,
        "filename": doc["filename"],
        "display_name": display_name,
        "content_type": content_type,
        "file_size": len(content),
        "platform_guess": platform_guess,
        "uploaded_at": doc["uploaded_at"],
    }


@router.get("/labels")
async def list_labels(admin: dict = Depends(get_admin_user)):
    """List all uploaded shipping labels."""
    labels = await db.shipping_labels.find(
        {}, {"_id": 0, "extracted_text": 0}
    ).sort("uploaded_at", -1).to_list(length=500)
    return {"labels": labels, "total": len(labels)}


@router.delete("/labels/{label_id}")
async def delete_label(label_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a shipping label."""
    label = await db.shipping_labels.find_one({"id": label_id}, {"_id": 0})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    await db.shipping_labels.delete_one({"id": label_id})
    return {"deleted": True}


class UpdateLabelRequest(BaseModel):
    sku_tag: Optional[str] = None


@router.patch("/labels/{label_id}")
async def update_label(label_id: str, req: UpdateLabelRequest, admin: dict = Depends(get_admin_user)):
    """Update a label's SKU tag."""
    label = await db.shipping_labels.find_one({"id": label_id}, {"_id": 0})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    updates = {}
    if req.sku_tag is not None:
        updates["sku_tag"] = req.sku_tag.strip().upper()
    if updates:
        await db.shipping_labels.update_one({"id": label_id}, {"$set": updates})
    return {"updated": True, "sku_tag": updates.get("sku_tag", label.get("sku_tag", ""))}


def _extract_token(token_query: Optional[str], authorization: Optional[str]) -> str:
    """Extract JWT from query param or Authorization header."""
    import jwt as pyjwt
    from app.config import JWT_SECRET, JWT_ALGORITHM

    raw = token_query
    if not raw and authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    if not raw:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        payload = pyjwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return raw


@router.get("/labels/{label_id}/file")
async def get_label_file(
    label_id: str,
    token: Optional[str] = Query(None, description="Auth token for direct links"),
    authorization: Optional[str] = Header(None),
):
    """Serve a label file. Auth via ?token= query param or Authorization header."""
    _extract_token(token, authorization)

    label = await db.shipping_labels.find_one({"id": label_id}, {"_id": 0})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    from fastapi.responses import Response
    data, ct = get_object(label["storage_path"])
    return Response(
        content=data,
        media_type=label.get("content_type", ct),
        headers={"Content-Disposition": f'inline; filename="{label["filename"]}"'},
    )


@router.get("/labels/{label_id}/preview")
async def get_label_preview(
    label_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """Render first page of a PDF label as a PNG image preview, with SKU overlay if tagged."""
    _extract_token(token, authorization)

    label = await db.shipping_labels.find_one({"id": label_id}, {"_id": 0})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    sku_tag = (label.get("sku_tag") or "").strip()

    # Get the base image bytes
    if label.get("content_type", "").startswith("image/"):
        data, ct = get_object(label["storage_path"])
        img_bytes = data
    else:
        # Convert PDF first page to image
        try:
            data, _ = get_object(label["storage_path"])
            img_bytes = _pdf_to_image(data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

    # Overlay SKU if present
    if sku_tag:
        try:
            img_bytes = _overlay_sku_on_image(img_bytes, sku_tag)
        except Exception as e:
            print(f"[LabelPreview] SKU overlay failed: {e}")
            # Return image without overlay on failure

    from fastapi.responses import Response
    return Response(content=img_bytes, media_type="image/png")


# ============== ORDER ASSIGNMENTS ==============


@router.get("/preview-count")
async def preview_order_count(
    since: Optional[str] = None,
    until: Optional[str] = None,
    label_ids: Optional[str] = Query(None, description="Comma-separated label IDs"),
    admin: dict = Depends(get_admin_user),
):
    """Quick count of pull list items and label matches for the given date range."""
    pull_query = {"status": {"$regex": "sold", "$options": "i"}}
    if since or until:
        date_filter = {}
        if since:
            date_filter["$gte"] = since
        if until:
            date_filter["$lte"] = until
        pull_query["sold_date"] = date_filter
    count = await db.inventory_items.count_documents(pull_query)

    match_count = 0
    if label_ids:
        lid_list = [lid.strip() for lid in label_ids.split(",") if lid.strip()]
        if lid_list and count > 0:
            labels = await db.shipping_labels.find(
                {"id": {"$in": lid_list}}, {"_id": 0}
            ).to_list(length=500)
            items = await db.inventory_items.find(pull_query, {"_id": 0, "id": 1, "sku": 1}).to_list(length=5000)
            matches = _auto_match(items, labels)
            match_count = len(matches)

    return {"count": count, "match_count": match_count}


@router.post("/assign")
async def assign_orders(req: AssignOrdersRequest, admin: dict = Depends(get_admin_user)):
    """Admin assigns a set of orders (pull list range + labels) to an employee."""
    # Verify employee exists
    emp = await db.users.find_one({"id": req.employee_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Auto-replace any existing active assignment for this employee
    existing = await db.order_assignments.find_one(
        {"employee_id": req.employee_id, "status": "active"}, {"_id": 0}
    )
    if existing:
        await db.order_assignments.update_one(
            {"id": existing["id"]},
            {"$set": {"status": "incomplete", "replaced_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Fetch pull list items for this range
    pull_query = {"status": {"$regex": "sold", "$options": "i"}}
    if req.since or req.until:
        date_filter = {}
        if req.since:
            date_filter["$gte"] = req.since
        if req.until:
            date_filter["$lte"] = req.until
        pull_query["sold_date"] = date_filter

    pull_items = await db.inventory_items.find(pull_query, {"_id": 0}).to_list(length=5000)

    # Fetch selected labels
    labels = []
    if req.label_ids:
        labels = await db.shipping_labels.find(
            {"id": {"$in": req.label_ids}}, {"_id": 0}
        ).to_list(length=500)

    # Auto-match labels to pull items
    matches = _auto_match(pull_items, labels)

    assignment_id = str(uuid.uuid4())
    doc = {
        "id": assignment_id,
        "employee_id": req.employee_id,
        "employee_name": emp.get("name", ""),
        "employee_email": emp.get("email", ""),
        "since": req.since,
        "until": req.until,
        "label_ids": req.label_ids or [],
        "matches": matches,
        "notes": req.notes or "",
        "status": "active",
        "item_count": len(pull_items),
        "label_count": len(labels),
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": admin.get("email", ""),
        "completed_at": None,
    }
    await db.order_assignments.insert_one(doc)

    return {
        "id": assignment_id,
        "employee_name": emp["name"],
        "item_count": len(pull_items),
        "label_count": len(labels),
        "match_count": len(matches),
        "status": "active",
    }


@router.get("/assignments")
async def list_assignments(
    status: Optional[str] = Query(None),
    admin: dict = Depends(get_admin_user),
):
    """List order assignments (admin)."""
    query = {}
    if status:
        query["status"] = status
    assignments = await db.order_assignments.find(
        query, {"_id": 0, "matches": 0}
    ).sort("assigned_at", -1).to_list(length=200)
    return {"assignments": assignments, "total": len(assignments)}


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, admin: dict = Depends(get_admin_user)):
    """Admin permanently removes an assignment from the log."""
    result = await db.order_assignments.delete_one({"id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"deleted": True}


# ============== EMPLOYEE ENDPOINTS ==============

@router.get("/my-history")
async def get_my_history(user: dict = Depends(get_current_user)):
    """Employee fetches their past assignment history."""
    history = await db.order_assignments.find(
        {"employee_id": user["id"], "status": {"$ne": "active"}},
        {"_id": 0, "matches": 0, "label_ids": 0},
    ).sort("assigned_at", -1).to_list(length=50)
    return {"history": history}

@router.get("/my-assignment")
async def get_my_assignment(user: dict = Depends(get_current_user)):
    """Employee fetches their active order assignment."""
    assignment = await db.order_assignments.find_one(
        {"employee_id": user["id"], "status": "active"}, {"_id": 0}
    )
    if not assignment:
        return {"assignment": None}

    # Fetch the actual pull list items for the date range
    pull_query = {"status": {"$regex": "sold", "$options": "i"}}
    if assignment.get("since") or assignment.get("until"):
        date_filter = {}
        if assignment.get("since"):
            date_filter["$gte"] = assignment["since"]
        if assignment.get("until"):
            date_filter["$lte"] = assignment["until"]
        pull_query["sold_date"] = date_filter

    items = await db.inventory_items.find(pull_query, {"_id": 0}).to_list(length=5000)

    def sku_sort_key(item):
        sku = item.get("sku") or ""
        letters = ""
        numbers = ""
        for ch in sku:
            if ch.isalpha():
                letters += ch.upper()
            elif ch.isdigit():
                numbers += ch
        return (letters, int(numbers) if numbers else 0)
    items.sort(key=sku_sort_key)

    # Fetch labels
    labels = []
    if assignment.get("label_ids"):
        labels = await db.shipping_labels.find(
            {"id": {"$in": assignment["label_ids"]}},
            {"_id": 0, "extracted_text": 0},
        ).to_list(length=500)

    # Re-run matching on current data
    labels_with_text = []
    if assignment.get("label_ids"):
        labels_with_text = await db.shipping_labels.find(
            {"id": {"$in": assignment["label_ids"]}}, {"_id": 0}
        ).to_list(length=500)
    matches = _auto_match(items, labels_with_text)

    assignment["items"] = items
    assignment["labels"] = labels
    assignment["matches"] = matches
    return {"assignment": assignment}


@router.post("/my-assignment/mark-pulled")
async def employee_mark_pulled(
    item_ids: List[str],
    user: dict = Depends(get_current_user),
):
    """Employee marks items as pulled."""
    # Verify they have an active assignment
    assignment = await db.order_assignments.find_one(
        {"employee_id": user["id"], "status": "active"}, {"_id": 0, "id": 1}
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="No active order assignment")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.inventory_items.update_many(
        {"id": {"$in": item_ids}},
        {"$set": {"pulled": True, "pulled_at": now, "pulled_by": user.get("name", "")}},
    )
    return {"updated": result.modified_count}


@router.post("/my-assignment/reset-pulled")
async def employee_reset_pulled(
    item_ids: List[str],
    user: dict = Depends(get_current_user),
):
    """Employee un-marks items."""
    assignment = await db.order_assignments.find_one(
        {"employee_id": user["id"], "status": "active"}, {"_id": 0, "id": 1}
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="No active order assignment")

    result = await db.inventory_items.update_many(
        {"id": {"$in": item_ids}},
        {"$unset": {"pulled": "", "pulled_at": "", "pulled_by": ""}},
    )
    return {"updated": result.modified_count}


@router.post("/complete/{assignment_id}")
async def complete_assignment(
    assignment_id: str,
    req: CompleteOrderRequest = CompleteOrderRequest(),
    user: dict = Depends(get_current_user),
):
    """Employee marks their order assignment as complete."""
    assignment = await db.order_assignments.find_one(
        {"id": assignment_id, "employee_id": user["id"], "status": "active"},
        {"_id": 0},
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Active assignment not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.order_assignments.update_one(
        {"id": assignment_id},
        {"$set": {
            "status": "completed",
            "completed_at": now,
            "completion_notes": req.notes or "",
        }},
    )
    return {"completed": True, "completed_at": now}


# ============== MATCHING HELPERS ==============

async def _ocr_recipient_name(img_bytes: bytes) -> str:
    """Use Gemini vision to OCR a shipping label image and extract the recipient name."""
    import os
    import base64
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return ""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"label-ocr-{uuid.uuid4()}",
            system_message="You extract shipping information from label images. Reply ONLY with the recipient's full name — nothing else. No quotes, no explanation, no address. Just the name.",
        ).with_model("gemini", "gemini-3-flash-preview")

        image = ImageContent(image_base64=b64)
        msg = UserMessage(
            text="What is the recipient's name on this shipping label? Reply with ONLY the name.",
            file_contents=[image],
        )

        result = ""
        async for event in chat.stream_message(msg):
            if isinstance(event, TextDelta):
                result += event.content
            elif isinstance(event, StreamDone):
                break

        name = result.strip().strip('"').strip("'").strip()
        # Validate it looks like a name
        if name and _looks_like_name(name):
            return name
        # Try to clean up — sometimes model adds extra words
        for line in name.split("\n"):
            line = line.strip().strip('"').strip("'").strip()
            if line and _looks_like_name(line):
                return line
        return ""
    except Exception:
        return ""


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF for matching purposes. Tries pdfplumber first, then PyMuPDF."""
    text = ""
    # Try pdfplumber first
    try:
        import pdfplumber
        import io
        text_parts = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:3]:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        text = "\n".join(text_parts)
    except Exception:
        pass

    # Fallback to PyMuPDF if pdfplumber got nothing
    if not text.strip():
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            parts = []
            for i in range(min(doc.page_count, 3)):
                page = doc.load_page(i)
                t = page.get_text()
                if t:
                    parts.append(t)
            doc.close()
            text = "\n".join(parts)
        except Exception:
            pass

    return text


PLATFORM_PATTERNS = {
    "ebay": [r"ebay", r"e-bay"],
    "mercari": [r"mercari"],
    "depop": [r"depop"],
    "poshmark": [r"poshmark", r"posh\s*mark"],
    "pirate ship": [r"pirate\s*ship", r"pirateship"],
    "whatnot": [r"whatnot"],
}


def _extract_recipient_name(text: str) -> str:
    """Extract the recipient/ship-to name from shipping label text."""
    if not text:
        return ""
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    # Strategy 1: look for a line right after "SHIP TO" / "DELIVER TO"
    ship_to_idx = -1
    for i, ln in enumerate(lines):
        low = ln.lower()
        if any(kw in low for kw in ["ship to", "deliver to", "ship-to"]):
            ship_to_idx = i
            break

    if ship_to_idx >= 0:
        # The name is usually the next non-empty line (or same line after colon)
        same = lines[ship_to_idx]
        # Check if name is on the same line after a colon
        if ":" in same:
            after = same.split(":", 1)[1].strip()
            if after and _looks_like_name(after):
                return after
        # Check subsequent lines
        for j in range(ship_to_idx + 1, min(ship_to_idx + 4, len(lines))):
            candidate = lines[j]
            if _looks_like_name(candidate):
                return candidate

    # Strategy 2: scan all lines for a person-name-looking line
    # Skip common label noise: addresses, tracking nums, barcodes, platforms
    skip_patterns = [
        r"^\d", r"tracking", r"usps", r"fedex", r"ups\b", r"ebay", r"mercari",
        r"poshmark", r"depop", r"pirate", r"www\.", r"http", r"order",
        r"#\d", r"weight", r"lbs", r"oz\b", r"class", r"priority",
        r"first.class", r"parcel", r"package", r"return", r"from:",
        r"ship date", r"po box", r"apt\b", r"suite", r"@",
    ]
    for ln in lines:
        if _looks_like_name(ln) and not any(re.search(p, ln.lower()) for p in skip_patterns):
            return ln

    return ""


def _looks_like_name(s: str) -> bool:
    """Heuristic: a short title-case-ish string of 1-5 words, mostly alpha."""
    s = s.strip()
    words = s.split()
    if len(words) < 1 or len(words) > 5:
        return False
    if len(s) > 50:
        return False
    alpha_ratio = sum(c.isalpha() or c == ' ' for c in s) / max(len(s), 1)
    if alpha_ratio < 0.85:
        return False
    # At least first word should be capitalized
    if words[0][0].islower():
        return False
    return True


def _guess_platform(filename: str, text: str) -> str:
    """Guess the shipping platform from filename or extracted text."""
    combined = (filename + " " + text).lower()
    for platform, patterns in PLATFORM_PATTERNS.items():
        for p in patterns:
            if re.search(p, combined):
                return platform
    return ""


def _pdf_to_image(pdf_bytes: bytes) -> bytes:
    """Convert first page of PDF to PNG, removing marketplace order/buyer metadata."""
    import fitz  # PyMuPDF
    from PIL import Image, ImageDraw
    import io

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc.load_page(0)

    # Try text-based redaction first (works for text-layer PDFs)
    redact_patterns = ["Order #", "Order#", "Buyer @", "Buyer@", "Buyer:"]
    found_text = False
    for pattern in redact_patterns:
        hits = page.search_for(pattern)
        if hits:
            found_text = True
            for rect in hits:
                full_line = fitz.Rect(0, rect.y0 - 2, page.rect.width, rect.y1 + 2)
                page.add_redact_annot(full_line, fill=(1, 1, 1))
    if found_text:
        page.apply_redactions()

    # Render at 2x for clarity on mobile
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    raw_bytes = pix.tobytes("png")
    doc.close()

    img = Image.open(io.BytesIO(raw_bytes))
    w, h = img.size

    # For image-based PDFs: use OCR to find and white-out Order/Buyer lines
    if not found_text:
        try:
            import pytesseract
            ocr = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            buyer_y = None
            # Find "Buyer" text position (most reliably detected by OCR)
            for i, txt in enumerate(ocr["text"]):
                if "buyer" in txt.lower():
                    buyer_y = ocr["top"][i]
                    break
            if buyer_y is not None:
                # White-out both Order line (just above) and Buyer line
                draw = ImageDraw.Draw(img)
                margin = int(h * 0.06)  # cover ~6% of image height
                y_start = max(0, buyer_y - margin)
                y_end = min(h, buyer_y + int(margin * 0.6))
                draw.rectangle([0, y_start, w, y_end], fill=(255, 255, 255))
        except Exception as e:
            print(f"[LabelCrop] OCR whiteout failed: {e}")

    # Crop to 4×6 if page extends beyond label area
    label_h = int(w * 1.5)
    if h > label_h:
        img = img.crop((0, 0, w, label_h))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _auto_match(pull_items: list, labels: list) -> list:
    """
    Match labels to pull list items.
    Priority: exact SKU tag > fuzzy heuristics.
    Returns list of {label_id, item_id, confidence, reason}.
    """
    matches = []
    matched_items = set()
    matched_labels = set()

    # Pass 1: Exact SKU tag matches (100% confidence)
    for label in labels:
        sku_tag = (label.get("sku_tag") or "").strip().upper()
        if not sku_tag:
            continue
        for item in pull_items:
            if item.get("id") in matched_items:
                continue
            item_sku = (item.get("sku") or "").strip().upper()
            if item_sku and item_sku == sku_tag:
                matches.append({
                    "label_id": label["id"],
                    "item_id": item["id"],
                    "confidence": 100,
                    "reason": f"SKU match: {sku_tag}",
                })
                matched_items.add(item["id"])
                matched_labels.add(label["id"])
                break

    # Pass 2: Fuzzy heuristic matches for remaining
    for label in labels:
        if label["id"] in matched_labels:
            continue
        text = (label.get("extracted_text") or "").lower()
        fname = (label.get("filename") or "").lower()
        combined = fname + " " + text
        label_platform = label.get("platform_guess", "")

        best_match = None
        best_score = 0

        for item in pull_items:
            if item.get("id") in matched_items:
                continue

            score = 0
            reasons = []

            # Platform match
            item_platform = (item.get("platform") or "").lower()
            if label_platform and item_platform and label_platform in item_platform:
                score += 30
                reasons.append(f"platform: {label_platform}")

            # Title keyword overlap
            title = (item.get("title") or "").lower()
            if title:
                title_words = set(re.findall(r'\w{3,}', title))
                text_words = set(re.findall(r'\w{3,}', combined))
                overlap = title_words & text_words
                if overlap:
                    word_score = min(len(overlap) * 15, 60)
                    score += word_score
                    reasons.append(f"title words: {', '.join(list(overlap)[:5])}")

            # SKU in label text
            sku = (item.get("sku") or "").lower()
            if sku and len(sku) >= 2 and sku in combined:
                score += 20
                reasons.append(f"SKU: {sku}")

            if score > best_score:
                best_score = score
                best_match = {
                    "label_id": label["id"],
                    "item_id": item["id"],
                    "confidence": min(score, 100),
                    "reason": "; ".join(reasons),
                }

        if best_match and best_match["confidence"] >= 30:
            matches.append(best_match)
            matched_items.add(best_match["item_id"])
            matched_labels.add(best_match["label_id"])

    return matches
