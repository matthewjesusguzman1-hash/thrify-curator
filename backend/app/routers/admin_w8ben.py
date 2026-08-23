"""W-8BEN document management routes for admin dashboard (foreign employees)."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid
import base64
import os

from app.database import db
from app.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin - W-8BEN Management"])

W8BEN_UPLOAD_DIR = "/app/backend/uploads/w8ben"
os.makedirs(W8BEN_UPLOAD_DIR, exist_ok=True)


@router.post("/employees/{employee_id}/w8ben")
async def upload_w8ben(employee_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    """Upload W-8BEN document for a foreign employee (supports multiple documents)."""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    doc_id = str(uuid.uuid4())
    
    w8ben_doc = {
        "id": doc_id,
        "employee_id": employee_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin["id"],
        "status": "submitted",
        "form_type": "W-8BEN"
    }
    
    await db.w8ben_documents.insert_one(w8ben_doc)
    
    # Update employee to mark as foreign worker with W-8BEN
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {
            "has_w8ben": True, 
            "w8ben_uploaded_at": w8ben_doc["uploaded_at"],
            "is_foreign_worker": True,
            "tax_form_type": "W-8BEN"
        }}
    )
    
    return {
        "message": "W-8BEN uploaded successfully",
        "id": doc_id,
        "filename": file.filename,
        "uploaded_at": w8ben_doc["uploaded_at"]
    }


@router.get("/employees/{employee_id}/w8ben/status")
async def get_w8ben_status(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get W-8BEN status summary for an employee."""
    w8ben_docs = await db.w8ben_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w8ben_docs:
        return {"has_w8ben": False, "status": "not_submitted", "w8ben_documents": []}
    
    latest = w8ben_docs[0]
    
    return {
        "has_w8ben": True,
        "status": latest.get("status", "submitted"),
        "filename": latest.get("filename"),
        "uploaded_at": latest.get("uploaded_at"),
        "total_documents": len(w8ben_docs),
        "w8ben_documents": w8ben_docs
    }


@router.get("/employees/{employee_id}/w8ben")
async def get_w8ben_documents(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get all W-8BEN documents for an employee."""
    w8ben_docs = await db.w8ben_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return {"documents": w8ben_docs, "total": len(w8ben_docs)}


@router.get("/employees/{employee_id}/w8ben/{doc_id}/download")
async def download_w8ben(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Download a specific W-8BEN document."""
    w8ben_doc = await db.w8ben_documents.find_one(
        {"id": doc_id, "employee_id": employee_id}
    )
    
    if not w8ben_doc:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    content = base64.b64decode(w8ben_doc["content"])
    
    return Response(
        content=content,
        media_type=w8ben_doc["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{w8ben_doc["filename"]}"'
        }
    )


@router.delete("/employees/{employee_id}/w8ben/{doc_id}")
async def delete_w8ben(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a specific W-8BEN document."""
    result = await db.w8ben_documents.delete_one({"id": doc_id, "employee_id": employee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    # Check if there are any remaining W-8BEN documents
    remaining = await db.w8ben_documents.count_documents({"employee_id": employee_id})
    
    if remaining == 0:
        await db.users.update_one(
            {"id": employee_id},
            {"$set": {"has_w8ben": False}, "$unset": {"w8ben_uploaded_at": ""}}
        )
    
    return {"message": "W-8BEN document deleted successfully"}


class W8BENStatusUpdate(BaseModel):
    status: str  # "approved", "rejected", "pending_review"
    notes: Optional[str] = None


@router.patch("/employees/{employee_id}/w8ben/{doc_id}/status")
async def update_w8ben_status(
    employee_id: str, 
    doc_id: str, 
    update: W8BENStatusUpdate, 
    admin: dict = Depends(get_admin_user)
):
    """Update the status of a W-8BEN document."""
    valid_statuses = ["submitted", "approved", "rejected", "needs_correction", "pending_review", "expired"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.w8ben_documents.update_one(
        {"id": doc_id, "employee_id": employee_id},
        {"$set": {
            "status": update.status,
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_by": admin["id"],
            "status_notes": update.notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    # Update user document
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"w8ben_status": update.status}}
    )
    
    return {"message": f"W-8BEN status updated to {update.status}"}


@router.post("/employees/{employee_id}/w8ben/{doc_id}/approve")
async def approve_w8ben(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a W-8BEN document."""
    result = await db.w8ben_documents.update_one(
        {"id": doc_id, "employee_id": employee_id},
        {"$set": {
            "status": "approved",
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_by": admin.get("name", admin["id"]),
            "status_notes": None
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"w8ben_status": "approved"}}
    )
    
    return {"success": True, "message": "W-8BEN approved"}


class W8BENRejectRequest(BaseModel):
    feedback: Optional[str] = None


@router.post("/employees/{employee_id}/w8ben/{doc_id}/reject")
async def reject_w8ben(
    employee_id: str, 
    doc_id: str, 
    request: W8BENRejectRequest,
    admin: dict = Depends(get_admin_user)
):
    """Reject a W-8BEN document - employee must re-submit."""
    result = await db.w8ben_documents.update_one(
        {"id": doc_id, "employee_id": employee_id},
        {"$set": {
            "status": "needs_correction",
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_by": admin.get("name", admin["id"]),
            "status_notes": request.feedback or "Please review and re-submit"
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"w8ben_status": "needs_correction"}}
    )
    
    return {"success": True, "message": "W-8BEN rejected - employee must re-submit"}


@router.get("/w8ben/pending")
async def get_pending_w8bens(admin: dict = Depends(get_admin_user)):
    """Get all W-8BEN documents pending review."""
    pending = await db.w8ben_documents.find(
        {"status": {"$in": ["submitted", "pending_review"]}},
        {"_id": 0, "content": 0}
    ).to_list(100)
    
    return {"pending": pending, "count": len(pending)}


# Employee self-service endpoints
employee_router = APIRouter(prefix="/time-tracking", tags=["Employee - W-8BEN"])


@employee_router.get("/w8ben/status")
async def get_employee_w8ben_status(user: dict = Depends(get_current_user)):
    """Get employee's W-8BEN submission status."""
    w8ben_docs = await db.w8ben_documents.find(
        {"employee_id": user["id"]},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w8ben_docs:
        return {"status": "not_submitted", "has_w8ben": False, "can_upload": True, "w8ben_documents": []}
    
    latest = w8ben_docs[0]
    
    return {
        "status": latest.get("status", "submitted"),
        "has_w8ben": True,
        "can_upload": True,
        "total_documents": len(w8ben_docs),
        "latest_uploaded_at": latest.get("uploaded_at"),
        "latest_filename": latest.get("filename"),
        "w8ben_documents": w8ben_docs
    }


@employee_router.post("/w8ben/upload")
async def employee_upload_w8ben(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Employee self-service W-8BEN upload."""
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    doc_id = str(uuid.uuid4())
    
    w8ben_doc = {
        "id": doc_id,
        "employee_id": user["id"],
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": user["id"],
        "self_submitted": True,
        "status": "submitted",
        "form_type": "W-8BEN"
    }
    
    await db.w8ben_documents.insert_one(w8ben_doc)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "has_w8ben": True, 
            "w8ben_uploaded_at": w8ben_doc["uploaded_at"],
            "is_foreign_worker": True,
            "tax_form_type": "W-8BEN"
        }}
    )
    
    return {
        "message": "W-8BEN uploaded successfully",
        "id": doc_id,
        "filename": file.filename,
        "uploaded_at": w8ben_doc["uploaded_at"]
    }
