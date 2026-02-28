"""W-9 document management routes for admin dashboard."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, RedirectResponse
from datetime import datetime, timezone
import uuid
import base64
import os

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin - W-9 Management"])

W9_UPLOAD_DIR = "/app/backend/uploads/w9"
os.makedirs(W9_UPLOAD_DIR, exist_ok=True)


@router.post("/employees/{employee_id}/w9")
async def upload_w9(employee_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    """Upload W-9 document for an employee (supports multiple W-9s)."""
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
    
    w9_doc = {
        "id": doc_id,
        "employee_id": employee_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin["id"],
        "status": "submitted"
    }
    
    await db.w9_documents.insert_one(w9_doc)
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"has_w9": True, "w9_uploaded_at": w9_doc["uploaded_at"]}}
    )
    
    return {
        "message": "W-9 uploaded successfully",
        "id": doc_id,
        "filename": file.filename,
        "uploaded_at": w9_doc["uploaded_at"]
    }


@router.get("/employees/{employee_id}/w9/status")
async def get_w9_status(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get W-9 status summary for an employee."""
    w9_docs = await db.w9_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w9_docs:
        return {"has_w9": False, "status": "not_submitted", "w9_documents": []}
    
    latest = w9_docs[0]
    
    return {
        "has_w9": True,
        "status": latest.get("status", "submitted"),
        "total_documents": len(w9_docs),
        "w9_documents": w9_docs
    }


@router.get("/employees/{employee_id}/w9/latest")
async def get_employee_latest_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get the latest W-9 document for an employee as a file download."""
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": employee_id},
        {"_id": 0},
        sort=[("uploaded_at", -1)]
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found for this employee")
    
    content = w9_doc.get("content")
    if not content:
        raise HTTPException(status_code=404, detail="W-9 document content not found")
    
    try:
        file_bytes = base64.b64decode(content)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode W-9 document")
    
    filename = w9_doc.get("filename", "w9_document.pdf")
    content_type = w9_doc.get("content_type", "application/pdf")
    
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/employees/{employee_id}/w9/{doc_id}")
async def download_w9(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Download a specific W-9 document."""
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": employee_id, "id": doc_id},
        {"_id": 0}
    )
    if not w9_doc:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    content = base64.b64decode(w9_doc["content"])
    
    return Response(
        content=content,
        media_type=w9_doc["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{w9_doc["filename"]}"'
        }
    )


@router.get("/employees/{employee_id}/w9")
async def get_employee_w9s(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get all W-9 documents for an employee."""
    w9_docs = await db.w9_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return {"w9_documents": w9_docs}


@router.delete("/employees/{employee_id}/w9/all")
async def delete_all_w9s(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Delete all W-9 documents for an employee."""
    result = await db.w9_documents.delete_many({"employee_id": employee_id})
    
    await db.users.update_one(
        {"id": employee_id},
        {"$unset": {"has_w9": "", "w9_uploaded_at": "", "w9_status": ""}}
    )
    
    return {"message": f"Deleted {result.deleted_count} W-9 document(s) successfully"}


@router.delete("/employees/{employee_id}/w9/{doc_id}")
async def delete_w9(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a specific W-9 document."""
    result = await db.w9_documents.delete_one({"employee_id": employee_id, "id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    remaining = await db.w9_documents.count_documents({"employee_id": employee_id})
    if remaining == 0:
        await db.users.update_one(
            {"id": employee_id},
            {"$unset": {"has_w9": "", "w9_uploaded_at": ""}}
        )
    
    return {"message": "W-9 document deleted successfully"}


@router.get("/w9-form")
async def get_blank_w9_form(admin: dict = Depends(get_admin_user)):
    """Download blank W-9 form template."""
    return RedirectResponse(
        url="https://www.irs.gov/pub/irs-pdf/fw9.pdf",
        status_code=302
    )


@router.get("/w9/pending")
async def get_pending_w9s(admin: dict = Depends(get_admin_user)):
    """Get all W-9s pending review."""
    pending = await db.w9_documents.find(
        {"status": "pending_review"},
        {"_id": 0, "content": 0}
    ).to_list(100)
    
    for doc in pending:
        emp = await db.users.find_one({"id": doc["employee_id"]}, {"_id": 0, "name": 1, "email": 1})
        if emp:
            doc["employee_name"] = emp.get("name", "Unknown")
            doc["employee_email"] = emp.get("email", "")
    
    return pending


@router.post("/employees/{employee_id}/w9/approve")
async def approve_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Approve an employee's W-9 submission."""
    w9_doc = await db.w9_documents.find_one({"employee_id": employee_id}, {"_id": 0})
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found")
    
    await db.w9_documents.update_one(
        {"employee_id": employee_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin["id"]
        }}
    )
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"w9_status": "approved"}}
    )
    
    return {"message": "W-9 approved successfully"}


@router.post("/employees/{employee_id}/w9/{doc_id}/approve")
async def approve_specific_w9(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a specific W-9 document."""
    result = await db.w9_documents.update_one(
        {"employee_id": employee_id, "id": doc_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin["id"]
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    latest_doc = await db.w9_documents.find_one(
        {"employee_id": employee_id},
        {"_id": 0, "status": 1},
        sort=[("uploaded_at", -1)]
    )
    if latest_doc and latest_doc.get("id") == doc_id:
        await db.users.update_one(
            {"id": employee_id},
            {"$set": {"w9_status": "approved"}}
        )
    
    return {"message": "W-9 approved successfully"}


@router.post("/employees/{employee_id}/w9/reject")
async def reject_w9(employee_id: str, reject_data: dict, admin: dict = Depends(get_admin_user)):
    """Reject an employee's W-9 and request corrections."""
    w9_doc = await db.w9_documents.find_one({"employee_id": employee_id}, {"_id": 0})
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found")
    
    reason = reject_data.get("reason", "Please review and correct your W-9 form")
    
    await db.w9_documents.update_one(
        {"employee_id": employee_id},
        {"$set": {
            "status": "needs_correction",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin["id"],
            "rejection_reason": reason
        }}
    )
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"w9_status": "needs_correction"}}
    )
    
    return {"message": "W-9 returned for corrections", "reason": reason}
