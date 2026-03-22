from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List
from datetime import datetime, timezone, timedelta
import base64

from app.database import db
from app.dependencies import get_current_user
from app.models.time_entry import TimeEntry, ClockInOut
from app.models.notifications import AdminNotification

router = APIRouter(prefix="/time", tags=["Time Tracking"])


async def trigger_admin_live_activity_update():
    """Helper function to update all admin Live Activities with current clocked-in employees"""
    try:
        from app.services.apns_service import update_admin_live_activities
        
        # Get all currently clocked in employees
        clocked_in = await db.time_entries.find(
            {"clock_out": None},
            {"user_name": 1, "_id": 0}
        ).to_list(100)
        
        employee_names = [entry.get("user_name", "Unknown") for entry in clocked_in]
        employee_count = len(employee_names)
        
        await update_admin_live_activities(employee_count, employee_names)
    except Exception as e:
        print(f"Failed to trigger admin Live Activity update: {e}")


def round_to_nearest_minute(seconds: float) -> float:
    """Convert seconds to hours with full precision.
    Time is stored precisely - rounding to minute is done only for display.
    """
    return round(seconds / 3600, 4)  # Store with 4 decimal precision


@router.post("/clock", response_model=TimeEntry)
async def clock_in_out(action: ClockInOut, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Use "Administrator" for admin users instead of their personal name
    display_name = "Administrator" if user.get("role") == "admin" else user["name"]
    
    if action.action == "in":
        # Check if already clocked in
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        # Always create a new entry for each clock-in
        # This ensures that completed shifts (clocked out by admin or employee) 
        # are not accidentally reopened
        entry = TimeEntry(
            user_id=user["id"],
            user_name=display_name,
            clock_in=now_iso,
            shift_date=today_start.strftime("%Y-%m-%d")
        )
        entry_dict = entry.model_dump()
        entry_dict["last_clock_in"] = now_iso
        entry_dict["accumulated_hours"] = 0.0
        await db.time_entries.insert_one(entry_dict)
        
        # Create clock in notification
        notification = AdminNotification(
            type="clock_in",
            employee_id=user["id"],
            employee_name=display_name,
            message=f"{display_name} clocked in",
            details={"time": now_iso}
        )
        await db.admin_notifications.insert_one(notification.model_dump())
        
        # Trigger admin Live Activity update
        await trigger_admin_live_activity_update()
        
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
        # Calculate session time in seconds
        session_seconds = (clock_out_time - clock_in_time).total_seconds()
        
        # Calculate total hours (accumulated + current session), rounded to nearest minute
        accumulated_seconds = active.get("accumulated_hours", 0.0) * 3600
        total_seconds = accumulated_seconds + session_seconds
        total_hours = round_to_nearest_minute(total_seconds)
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {"$set": {"clock_out": now_iso, "total_hours": total_hours, "accumulated_hours": total_hours}}
        )
        
        active["clock_out"] = now_iso
        active["total_hours"] = total_hours
        
        # Create clock out notification
        notification = AdminNotification(
            type="clock_out",
            employee_id=user["id"],
            employee_name=display_name,
            message=f"{display_name} clocked out",
            details={"time": now_iso, "hours": total_hours}
        )
        await db.admin_notifications.insert_one(notification.model_dump())
        
        # Trigger admin Live Activity update
        await trigger_admin_live_activity_update()
        
        return TimeEntry(**active)
    
    raise HTTPException(status_code=400, detail="Invalid action")


@router.post("/verify-location")
async def verify_location(user: dict = Depends(get_current_user)):
    """Update the last verified location timestamp for the active time entry"""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    active = await db.time_entries.find_one(
        {"user_id": user["id"], "clock_out": None}, {"_id": 0}
    )
    
    if not active:
        raise HTTPException(status_code=400, detail="Not clocked in")
    
    await db.time_entries.update_one(
        {"id": active["id"]},
        {"$set": {"last_location_verified": now_iso}}
    )
    
    return {"success": True, "last_location_verified": now_iso}


@router.post("/auto-clock-out")
async def auto_clock_out(user: dict = Depends(get_current_user)):
    """Auto clock out using the last verified location time as the clock out time"""
    active = await db.time_entries.find_one(
        {"user_id": user["id"], "clock_out": None}, {"_id": 0}
    )
    
    if not active:
        raise HTTPException(status_code=400, detail="Not clocked in")
    
    # Use the last verified location time as clock out time, or current time if not available
    last_verified = active.get("last_location_verified")
    if last_verified:
        clock_out_time = datetime.fromisoformat(last_verified)
    else:
        clock_out_time = datetime.now(timezone.utc)
    
    clock_out_iso = clock_out_time.isoformat()
    
    # Calculate hours based on last_clock_in to clock_out_time
    last_clock_in = active.get("last_clock_in", active["clock_in"])
    clock_in_time = datetime.fromisoformat(last_clock_in)
    session_seconds = (clock_out_time - clock_in_time).total_seconds()
    
    # Ensure non-negative hours
    if session_seconds < 0:
        session_seconds = 0
    
    # Calculate total hours, rounded to nearest minute
    accumulated_seconds = active.get("accumulated_hours", 0.0) * 3600
    total_seconds = accumulated_seconds + session_seconds
    total_hours = round_to_nearest_minute(total_seconds)
    
    await db.time_entries.update_one(
        {"id": active["id"]},
        {"$set": {
            "clock_out": clock_out_iso, 
            "total_hours": total_hours, 
            "accumulated_hours": total_hours,
            "auto_clocked_out": True
        }}
    )
    
    active["clock_out"] = clock_out_iso
    active["total_hours"] = total_hours
    active["auto_clocked_out"] = True
    
    return {
        "success": True,
        "clock_out_time": clock_out_iso,
        "used_last_verified": last_verified is not None,
        "entry": TimeEntry(**active)
    }


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
        {"user_id": user["id"]}, {"_id": 0}
    ).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) or 0 for e in entries)
    
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_entries = [e for e in entries if datetime.fromisoformat(e["clock_in"].replace('Z', '+00:00')) >= week_start]
    week_hours = sum(e.get("total_hours", 0) or 0 for e in week_entries)
    
    payroll_settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = 15.00
    
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 15.00)
    
    # Use first Monday of year as anchor
    period_start, period_end = get_biweekly_period(period_index=0)
    
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
    
    period_hours = sum(e.get("total_hours", 0) or 0 for e in period_entries)
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
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Use "Administrator" for admin users instead of their personal name
    display_name = "Administrator" if user.get("role") == "admin" else user["name"]
    
    w9_doc = {
        "id": doc_id,
        "employee_id": user["id"],
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": now_iso,
        "uploaded_by": user["id"],
        "status": "submitted",
        "notes": notes or ""
    }
    
    await db.w9_documents.insert_one(w9_doc)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"has_w9": True, "w9_uploaded_at": w9_doc["uploaded_at"]}}
    )
    
    # Create W-9 submission notification
    notification = AdminNotification(
        type="w9_submission",
        employee_id=user["id"],
        employee_name=display_name,
        message=f"{display_name} submitted a W-9 form",
        details={"filename": file.filename, "time": now_iso}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return {
        "message": "W-9 uploaded successfully",
        "id": doc_id,
        "filename": file.filename,
        "uploaded_at": w9_doc["uploaded_at"]
    }


@router.delete("/w9/{doc_id}")
async def delete_own_w9(doc_id: str, user: dict = Depends(get_current_user)):
    """Employee deletes a specific W-9 (only if not yet approved, unless admin)"""
    w9_doc = await db.w9_documents.find_one(
        {"employee_id": user["id"], "id": doc_id},
        {"_id": 0}
    )
    
    if not w9_doc:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    # Admins can delete their own W-9s even if approved
    # Regular employees can only delete non-approved W-9s
    if w9_doc.get("status") == "approved" and user.get("role") != "admin":
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
