from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone, timedelta
import base64

from app.database import db
from app.dependencies import get_current_user
from app.models.time_entry import TimeEntry, ClockInOut
from app.models.notifications import AdminNotification
from app.services.apns_service import send_admin_push_notification

router = APIRouter(prefix="/time", tags=["Time Tracking"])


async def trigger_admin_live_activity_update():
    """Helper function to update all admin Live Activities with current clocked-in employees"""
    try:
        from app.services.apns_service import update_admin_live_activities
        
        # Get all currently clocked in employees with their clock-in times
        clocked_in = await db.time_entries.find(
            {"clock_out": None},
            {"user_name": 1, "clock_in": 1, "_id": 0}
        ).to_list(100)
        
        # Format employee data with names and clock-in timestamps
        employee_data = []
        for entry in clocked_in:
            name = entry.get("user_name", "Unknown")
            clock_in = entry.get("clock_in", "")
            
            if clock_in:
                try:
                    # Parse and format the time
                    dt = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
                    time_str = dt.strftime("%-I:%M %p")  # e.g., "9:30 AM"
                    # Include timestamp for live timer calculation
                    timestamp = dt.timestamp()
                    employee_data.append(f"{name}|{time_str}|{timestamp}")
                except (ValueError, OSError):
                    employee_data.append(f"{name}|--|0")
            else:
                employee_data.append(f"{name}|--|0")
        
        employee_count = len(employee_data)
        
        await update_admin_live_activities(employee_count, employee_data)
    except Exception as e:
        print(f"Failed to trigger admin Live Activity update: {e}")


import math

def round_up_to_minute(seconds: float) -> float:
    """Convert seconds to hours, rounded UP to the next whole minute.
    This ensures employees are always paid for the full minute worked.
    Example: 1 hour 20 minutes 1 second = 1 hour 21 minutes (1.35 hours)
    
    Uses rounding to handle floating-point precision issues before ceiling.
    """
    if seconds <= 0:
        return 0
    # Round to 6 decimal places first to handle floating-point precision
    minutes_raw = round(seconds / 60, 6)
    # Then apply ceiling to get next whole minute
    total_minutes = math.ceil(minutes_raw)
    # Convert back to decimal hours
    return total_minutes / 60


# Geofence configuration - Business location coordinates (Omaha, NE area)
BUSINESS_LATITUDE = 41.13063
BUSINESS_LONGITUDE = -95.99024
GEOFENCE_RADIUS_METERS = 3219  # ~2 miles in meters for GPS variance (matching frontend)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def is_within_geofence(latitude: float, longitude: float) -> tuple[bool, float]:
    """Check if coordinates are within the business geofence. Returns (is_within, distance_meters)"""
    distance = calculate_distance(latitude, longitude, BUSINESS_LATITUDE, BUSINESS_LONGITUDE)
    return distance <= GEOFENCE_RADIUS_METERS, distance


@router.post("/clock", response_model=TimeEntry)
async def clock_in_out(action: ClockInOut, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Use "Administrator" for admin users instead of their personal name
    display_name = "Administrator" if user.get("role") == "admin" else user["name"]
    
    if action.action == "in":
        # Check if user is a remote worker - they cannot clock in directly
        if user.get("is_remote_worker"):
            raise HTTPException(
                status_code=403, 
                detail="Remote workers cannot clock in directly. Please use AnyDesk to connect to the company computer."
            )
        
        # Check geofencing - must be within business location to clock in
        # Skip geofence check for admin users
        if user.get("role") != "admin":
            if action.latitude is None or action.longitude is None:
                raise HTTPException(
                    status_code=400, 
                    detail="Location access is required to clock in. Please enable location services."
                )
            
            is_within, distance = is_within_geofence(action.latitude, action.longitude)
            if not is_within:
                raise HTTPException(
                    status_code=403, 
                    detail=f"You must be at the business location to clock in. You are {int(distance)} meters away."
                )
        
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
        
        # Send push notification for clock in
        try:
            await send_admin_push_notification(
                title="Employee Clocked In",
                body=f"{display_name} clocked in",
                notification_type="clock_in"
            )
        except Exception as e:
            print(f"Failed to send clock-in push notification: {e}")
        
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
        
        # Calculate total hours (accumulated + current session), rounded UP to nearest minute
        accumulated_seconds = active.get("accumulated_hours", 0.0) * 3600
        total_seconds = accumulated_seconds + session_seconds
        total_hours = round_up_to_minute(total_seconds)
        
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
        
        # Send push notification for clock out
        try:
            from app.services.apns_service import send_clock_out_notification
            await send_clock_out_notification(display_name, total_hours)
        except Exception as e:
            print(f"Failed to send clock-out push notification: {e}")
        
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
    
    # Calculate total hours, rounded UP to next whole minute
    accumulated_seconds = active.get("accumulated_hours", 0.0) * 3600
    total_seconds = accumulated_seconds + session_seconds
    total_hours = round_up_to_minute(total_seconds)
    
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
    default_rate = 20.00
    
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 20.00)
    
    # Helper function to filter entries by period
    def get_entries_for_period(start, end):
        if hasattr(start, 'tzinfo') and start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if hasattr(end, 'tzinfo') and end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        
        period_entries = []
        for e in entries:
            try:
                clock_in_str = e["clock_in"]
                clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
                if start <= clock_in_dt <= end:
                    period_entries.append(e)
            except (ValueError, KeyError, TypeError):
                pass
        return period_entries, start, end
    
    # Get current period
    current_period_start, current_period_end = get_biweekly_period(period_index=0)
    current_entries, current_start, current_end = get_entries_for_period(current_period_start, current_period_end)
    current_hours = sum(e.get("total_hours", 0) or 0 for e in current_entries)
    
    # If current period has no hours, use previous period instead
    if current_hours == 0 and len(current_entries) == 0:
        prev_period_start, prev_period_end = get_biweekly_period(period_index=-1)
        period_entries, period_start, period_end = get_entries_for_period(prev_period_start, prev_period_end)
        is_previous_period = True
    else:
        period_entries = current_entries
        period_start = current_start
        period_end = current_end
        is_previous_period = False
    
    period_hours = sum(e.get("total_hours", 0) or 0 for e in period_entries)
    period_shifts = len(period_entries)
    
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    user_name = user_doc.get("name", "") if user_doc else ""
    hourly_rate = user_doc.get("hourly_rate") if user_doc else None
    if hourly_rate is None:
        hourly_rate = default_rate
    
    # Round hours UP to nearest minute for pay calculation (benefits employee)
    rounded_hours = round_up_to_minute(period_hours * 3600)  # Convert to seconds then round up
    estimated_pay = round(rounded_hours * hourly_rate, 2)
    
    # Get YTD actual payments from payment records for this employee
    year_start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    ytd_paid = 0.0
    ytd_payment_count = 0
    
    # Find payments by employee name in check_records
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "amount": 1, "check_date": 1, "employee_name": 1}
    ).to_list(1000)
    
    for record in payment_records:
        # Match by employee name (case-insensitive)
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name == user_name.strip().lower():
            check_date_str = record.get("check_date", "")
            if check_date_str:
                try:
                    check_date = datetime.strptime(check_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    if check_date >= year_start:
                        ytd_paid += record.get("amount", 0) or 0
                        ytd_payment_count += 1
                except (ValueError, TypeError):
                    pass
    
    return {
        "total_hours": round(total_hours, 2),
        "week_hours": round(week_hours, 2),
        "total_shifts": len(entries),
        "period_hours": round(period_hours, 2),
        "period_shifts": period_shifts,
        "hourly_rate": hourly_rate,
        "estimated_pay": estimated_pay,
        "period_start": period_start.isoformat() if hasattr(period_start, 'isoformat') else str(period_start),
        "period_end": period_end.isoformat() if hasattr(period_end, 'isoformat') else str(period_end),
        "is_previous_period": is_previous_period,
        "ytd_paid": round(ytd_paid, 2),
        "ytd_payment_count": ytd_payment_count
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
    
    # Send push notification for W-9 submission
    try:
        await send_admin_push_notification(
            title="W-9 Submitted",
            body=f"{display_name} submitted a W-9 form",
            notification_type="w9_submission"
        )
    except Exception as e:
        print(f"Failed to send W-9 push notification: {e}")
    
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



# ==========================================
# Admin Endpoints for Viewing Employee Data
# ==========================================

from app.dependencies import get_admin_user

@router.get("/employees/{employee_id}/status")
async def get_employee_status_admin(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to get an employee's clock status"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Find any active time entry (no clock_out)
    entry = await db.time_entries.find_one(
        {"user_id": employee_id, "clock_out": None},
        {"_id": 0}
    )
    
    return {
        "clocked_in": entry is not None,
        "entry": entry
    }

@router.get("/employees/{employee_id}/entries")
async def get_employee_entries_admin(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to get an employee's time entries"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    entries = await db.time_entries.find(
        {"user_id": employee_id},
        {"_id": 0}
    ).sort("clock_in", -1).to_list(100)
    
    return entries

@router.get("/employees/{employee_id}/summary")
async def get_employee_summary_admin(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to get an employee's time summary"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get employee's hourly rate
    hourly_rate = employee.get("hourly_rate")
    if hourly_rate is None:
        # Get default rate from payroll settings
        settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
        hourly_rate = settings.get("default_hourly_rate", 20.00) if settings else 20.00
    
    # Get pay period settings
    pay_settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    
    # Determine current pay period
    today = datetime.now(timezone.utc)
    
    if pay_settings and pay_settings.get("pay_period_type") == "monthly":
        period_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if today.month == 12:
            period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(microseconds=1)
        else:
            period_end = today.replace(month=today.month + 1, day=1) - timedelta(microseconds=1)
    else:
        # Default bi-weekly (every 2 weeks starting from a reference date)
        reference = datetime(2024, 1, 1, tzinfo=timezone.utc)
        days_since = (today - reference).days
        period_num = days_since // 14
        period_start = reference + timedelta(days=period_num * 14)
        period_end = period_start + timedelta(days=14) - timedelta(microseconds=1)
    
    # Get entries for this period
    period_entries = await db.time_entries.find({
        "user_id": employee_id,
        "clock_in": {
            "$gte": period_start.isoformat(),
            "$lte": period_end.isoformat()
        }
    }, {"_id": 0}).to_list(500)
    
    # Calculate period hours
    period_hours = 0
    for entry in period_entries:
        if entry.get("clock_out"):
            try:
                cin = datetime.fromisoformat(entry["clock_in"].replace('Z', '+00:00'))
                cout = datetime.fromisoformat(entry["clock_out"].replace('Z', '+00:00'))
                period_hours += (cout - cin).total_seconds() / 3600
            except (ValueError, KeyError):
                pass
    
    # Get total entries
    all_entries = await db.time_entries.find({"user_id": employee_id}, {"_id": 0}).to_list(1000)
    
    total_hours = 0
    for entry in all_entries:
        if entry.get("clock_out"):
            try:
                cin = datetime.fromisoformat(entry["clock_in"].replace('Z', '+00:00'))
                cout = datetime.fromisoformat(entry["clock_out"].replace('Z', '+00:00'))
                total_hours += (cout - cin).total_seconds() / 3600
            except (ValueError, KeyError):
                pass
    
    return {
        "period_hours": round(period_hours, 2),
        "period_shifts": len(period_entries),
        "total_hours": round(total_hours, 2),
        "total_shifts": len(all_entries),
        "hourly_rate": hourly_rate,
        "estimated_pay": round(period_hours * hourly_rate, 2),
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "is_previous_period": False,
        "ytd_paid": 0,
        "ytd_payment_count": 0
    }

@router.get("/w9/admin/employee/{employee_id}/status")
async def get_employee_w9_status_admin(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to get an employee's W-9 status"""
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    w9_docs = await db.w9_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w9_docs:
        return {"status": "not_submitted", "has_w9": False, "can_upload": True, "w9_documents": []}
    
    latest = w9_docs[0]
    
    return {
        "status": latest.get("status", "submitted"),
        "has_w9": True,
        "can_upload": True,
        "total_documents": len(w9_docs),
        "rejection_reason": latest.get("rejection_reason"),
        "reviewed_at": latest.get("reviewed_at"),
        "w9_documents": w9_docs
    }



# Employee endpoint to download their own W-8BEN
@router.get("/w8ben/{doc_id}/download")
async def download_own_w8ben(doc_id: str, user: dict = Depends(get_current_user)):
    """Employee endpoint to download their own W-8BEN document"""
    w8ben_doc = await db.w8ben_documents.find_one(
        {"id": doc_id, "employee_id": user["id"]}
    )
    
    if not w8ben_doc:
        raise HTTPException(status_code=404, detail="W-8BEN document not found")
    
    import base64
    content = base64.b64decode(w8ben_doc["content"])
    
    return Response(
        content=content,
        media_type=w8ben_doc.get("content_type", "application/pdf"),
        headers={
            "Content-Disposition": f'inline; filename="{w8ben_doc["filename"]}"'
        }
    )


# Employee endpoint to save their AnyDesk address
class AnydeskAddressUpdate(BaseModel):
    anydesk_address: str

@router.post("/employees/me/anydesk")
async def update_my_anydesk_address(data: AnydeskAddressUpdate, current_user: dict = Depends(get_current_user)):
    """Employee updates their AnyDesk address - this will be visible to admin in Team Management"""
    
    user_id = current_user.get("id") or current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update user's anydesk address
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "anydesk_address": data.anydesk_address.strip(),
            "anydesk_shared_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get employee name for notification
    user = await db.users.find_one({"id": user_id}, {"name": 1, "email": 1})
    display_name = user.get("name", user.get("email", "Employee")) if user else "Employee"
    
    # Create notification for admin
    notification = AdminNotification(
        type="anydesk_shared",
        employee_id=user_id,
        employee_name=display_name,
        message=f"{display_name} shared their AnyDesk address",
        details={"anydesk_address": data.anydesk_address.strip()}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    # Send push notification to admin
    try:
        await send_admin_push_notification(
            title="AnyDesk Address Received",
            body=f"{display_name} shared their AnyDesk address: {data.anydesk_address.strip()}",
            notification_type="anydesk_shared"
        )
    except Exception as e:
        print(f"Failed to send AnyDesk push notification: {e}")
    
    return {"success": True, "message": "AnyDesk address saved successfully"}
