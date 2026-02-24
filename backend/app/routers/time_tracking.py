from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List
from datetime import datetime, timezone, timedelta
import base64

from app.database import db
from app.dependencies import get_current_user
from app.models.time_entry import TimeEntry, ClockInOut

router = APIRouter(prefix="/time", tags=["Time Tracking"])


@router.post("/clock", response_model=TimeEntry)
async def clock_in_out(action: ClockInOut, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if action.action == "in":
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        today_entry = await db.time_entries.find_one(
            {"user_id": user["id"], "shift_date": today_start.strftime("%Y-%m-%d")},
            {"_id": 0}
        )
        
        if today_entry:
            await db.time_entries.update_one(
                {"id": today_entry["id"]},
                {"$set": {"clock_out": None, "last_clock_in": now_iso}}
            )
            today_entry["clock_out"] = None
            today_entry["last_clock_in"] = now_iso
            return TimeEntry(**today_entry)
        else:
            entry = TimeEntry(
                user_id=user["id"],
                user_name=user["name"],
                clock_in=now_iso,
                shift_date=today_start.strftime("%Y-%m-%d")
            )
            entry_dict = entry.model_dump()
            entry_dict["last_clock_in"] = now_iso
            entry_dict["accumulated_hours"] = 0.0
            await db.time_entries.insert_one(entry_dict)
            return entry
    
    elif action.action == "out":
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Not clocked in")
        
        last_clock_in = active.get("last_clock_in", active["clock_in"])
        clock_in_time = datetime.fromisoformat(last_clock_in)
        clock_out_time = now
        session_hours = round((clock_out_time - clock_in_time).total_seconds() / 3600, 2)
        
        accumulated_hours = active.get("accumulated_hours", 0.0) + session_hours
        total_hours = round(accumulated_hours, 2)
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {"$set": {"clock_out": now_iso, "total_hours": total_hours, "accumulated_hours": accumulated_hours}}
        )
        
        active["clock_out"] = now_iso
        active["total_hours"] = total_hours
        return TimeEntry(**active)
    
    raise HTTPException(status_code=400, detail="Invalid action")


@router.get("/status")
async def get_clock_status(user: dict = Depends(get_current_user)):
    active = await db.time_entries.find_one(
        {"user_id": user["id"], "clock_out": None}, {"_id": 0}
    )
    return {"clocked_in": active is not None, "entry": active}


@router.get("/entries", response_model=List[TimeEntry])
async def get_my_entries(user: dict = Depends(get_current_user)):
    entries = await db.time_entries.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("clock_in", -1).to_list(100)
    return entries


@router.get("/summary")
async def get_time_summary(user: dict = Depends(get_current_user)):
    from app.services.helpers import get_biweekly_period
    
    entries = await db.time_entries.find(
        {"user_id": user["id"], "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) for e in entries)
    
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_entries = [e for e in entries if datetime.fromisoformat(e["clock_in"].replace('Z', '+00:00')) >= week_start]
    week_hours = sum(e.get("total_hours", 0) for e in week_entries)
    
    payroll_settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = 15.00
    pay_period_start_date = "2026-01-06"
    
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 15.00)
        pay_period_start_date = payroll_settings.get("pay_period_start_date", "2026-01-06")
    
    period_start, period_end = get_biweekly_period(pay_period_start_date, 0)
    
    if hasattr(period_start, 'tzinfo') and period_start.tzinfo is None:
        period_start = period_start.replace(tzinfo=timezone.utc)
    if hasattr(period_end, 'tzinfo') and period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)
    
    period_entries = []
    for e in entries:
        try:
            clock_in_str = e["clock_in"]
            clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
            if period_start <= clock_in_dt <= period_end:
                period_entries.append(e)
        except (ValueError, KeyError, TypeError):
            pass
    
    period_hours = sum(e.get("total_hours", 0) for e in period_entries)
    period_shifts = len(period_entries)
    
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    hourly_rate = user_doc.get("hourly_rate") if user_doc else None
    if hourly_rate is None:
        hourly_rate = default_rate
    
    estimated_pay = round(period_hours * hourly_rate, 2)
    
    return {
        "total_hours": round(total_hours, 2),
        "week_hours": round(week_hours, 2),
        "total_shifts": len(entries),
        "period_hours": round(period_hours, 2),
        "period_shifts": period_shifts,
        "hourly_rate": hourly_rate,
        "estimated_pay": estimated_pay,
        "period_start": period_start.isoformat() if hasattr(period_start, 'isoformat') else str(period_start),
        "period_end": period_end.isoformat() if hasattr(period_end, 'isoformat') else str(period_end)
    }


# Employee W-9 submission endpoints - Multiple W-9s support
@router.get("/w9/status")
async def get_w9_status(user: dict = Depends(get_current_user)):
    """Get employee's W-9 submission status (all documents)"""
    w9_docs = await db.w9_documents.find(
        {"employee_id": user["id"]},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w9_docs:
        return {"status": "not_submitted", "has_w9": False, "can_upload": True, "w9_documents": []}
    
    latest = w9_docs[0]
    
    return {
        "status": latest.get("status", "submitted"),
        "has_w9": True,
        "can_upload": True,  # Always allow adding more W-9s
        "total_documents": len(w9_docs),
        "rejection_reason": latest.get("rejection_reason"),
        "reviewed_at": latest.get("reviewed_at"),
        "w9_documents": w9_docs
    }


@router.get("/w9/download/{doc_id}")
async def download_own_w9(doc_id: str, user: dict = Depends(get_current_user)):
    """Employee downloads a specific W-9 document"""
    from fastapi.responses import Response
    
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": user["id"], "id": doc_id},
        {"_id": 0}
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    return Response(
        content=base64.b64decode(w9_doc["content"]),
        media_type=w9_doc.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"inline; filename={w9_doc.get('filename', 'w9.pdf')}"}
    )


@router.get("/w9/download")
async def download_latest_w9(user: dict = Depends(get_current_user)):
    """Employee downloads their latest W-9 (backward compatibility)"""
    from fastapi.responses import Response
    
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": user["id"]},
        {"_id": 0},
        sort=[("uploaded_at", -1)]
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found")
    
    return Response(
        content=base64.b64decode(w9_doc["content"]),
        media_type=w9_doc.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"inline; filename={w9_doc.get('filename', 'w9.pdf')}"}
    )


@router.post("/w9/upload")
async def upload_w9_employee(
    file: UploadFile = File(...), 
    notes: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Employee uploads a new W-9"""
    import uuid
    
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    doc_id = str(uuid.uuid4())
    
    w9_doc = {
        "id": doc_id,
        "employee_id": user["id"],
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": user["id"],
        "status": "submitted",
        "notes": notes or ""
    }
    
    await db.w9_documents.insert_one(w9_doc)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"has_w9": True, "w9_uploaded_at": w9_doc["uploaded_at"]}}
    )
    
    return {
        "message": "W-9 uploaded successfully",
        "id": doc_id,
        "filename": file.filename,
        "uploaded_at": w9_doc["uploaded_at"]
    }


@router.delete("/w9/{doc_id}")
async def delete_own_w9(doc_id: str, user: dict = Depends(get_current_user)):
    """Employee deletes a specific W-9 (only if not yet approved)"""
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": user["id"], "id": doc_id},
        {"_id": 0}
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    if w9_doc.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot delete approved W-9")
    
    await db.w9_documents.delete_one({"employee_id": user["id"], "id": doc_id})
    
    # Check if employee has any remaining W-9s
    remaining = await db.w9_documents.count_documents({"employee_id": user["id"]})
    if remaining == 0:
        await db.users.update_one(
            {"id": user["id"]},
            {"$unset": {"has_w9": "", "w9_uploaded_at": "", "w9_status": ""}}
        )
    
    return {"message": "W-9 deleted successfully"}


@router.delete("/w9")
async def delete_latest_w9(user: dict = Depends(get_current_user)):
    """Delete latest W-9 (backward compatibility)"""
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": user["id"]},
        {"_id": 0},
        sort=[("uploaded_at", -1)]
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found")
    
    if w9_doc.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot delete approved W-9")
    
    await db.w9_documents.delete_one({"employee_id": user["id"], "id": w9_doc["id"]})
    
    remaining = await db.w9_documents.count_documents({"employee_id": user["id"]})
    if remaining == 0:
        await db.users.update_one(
            {"id": user["id"]},
            {"$unset": {"has_w9": "", "w9_uploaded_at": "", "w9_status": ""}}
        )
    
    return {"message": "W-9 deleted successfully"}
