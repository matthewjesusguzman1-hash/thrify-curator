from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re

from app.database import db
from app.dependencies import get_admin_user, get_current_user
from app.services.object_storage import put_object, get_object, APP_NAME

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

    doc = {
        "id": label_id,
        "filename": file.filename or f"label.{ext}",
        "storage_path": storage_path,
        "content_type": content_type,
        "file_size": len(content),
        "extension": ext,
        "extracted_text": extracted_text[:2000] if extracted_text else "",
        "platform_guess": platform_guess,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin.get("email", ""),
    }
    await db.shipping_labels.insert_one(doc)

    return {
        "id": label_id,
        "filename": doc["filename"],
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


@router.get("/labels/{label_id}/file")
async def get_label_file(
    label_id: str,
    token: Optional[str] = Query(None, description="Auth token for direct links"),
):
    """Serve a label file. Auth via ?token= query param."""
    import jwt as pyjwt
    from app.config import JWT_SECRET, JWT_ALGORITHM

    if not token:
        raise HTTPException(status_code=401, detail="Token required (?token=...)")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

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


# ============== ORDER ASSIGNMENTS ==============

@router.post("/assign")
async def assign_orders(req: AssignOrdersRequest, admin: dict = Depends(get_admin_user)):
    """Admin assigns a set of orders (pull list range + labels) to an employee."""
    # Verify employee exists
    emp = await db.users.find_one({"id": req.employee_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check no active assignment for this employee
    existing = await db.order_assignments.find_one(
        {"employee_id": req.employee_id, "status": "active"}, {"_id": 0}
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"{emp['name']} already has an active order assignment. Complete or cancel it first.",
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
async def cancel_assignment(assignment_id: str, admin: dict = Depends(get_admin_user)):
    """Cancel/delete an order assignment."""
    result = await db.order_assignments.delete_one({"id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"deleted": True}


# ============== EMPLOYEE ENDPOINTS ==============

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

def _extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF for matching purposes."""
    try:
        import pdfplumber
        import io
        text_parts = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:3]:  # First 3 pages max
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)
    except Exception:
        return ""


PLATFORM_PATTERNS = {
    "ebay": [r"ebay", r"e-bay"],
    "mercari": [r"mercari"],
    "depop": [r"depop"],
    "poshmark": [r"poshmark", r"posh\s*mark"],
    "pirate ship": [r"pirate\s*ship", r"pirateship"],
    "whatnot": [r"whatnot"],
}


def _guess_platform(filename: str, text: str) -> str:
    """Guess the shipping platform from filename or extracted text."""
    combined = (filename + " " + text).lower()
    for platform, patterns in PLATFORM_PATTERNS.items():
        for p in patterns:
            if re.search(p, combined):
                return platform
    return ""


def _auto_match(pull_items: list, labels: list) -> list:
    """
    Try to match labels to pull list items.
    Uses platform + title keyword overlap.
    Returns list of {label_id, item_id, confidence, reason}.
    """
    matches = []
    matched_items = set()
    matched_labels = set()

    for label in labels:
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
