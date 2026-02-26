from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import base64
import os
import io
import csv

from app.database import db
from app.dependencies import get_admin_user
from app.models.user import UserResponse, CreateEmployee, UpdateEmployeeDetails, UpdateEmployeeRate
from app.models.time_entry import TimeEntry, EditTimeEntryRequest, CreateTimeEntryRequest
from app.models.payroll import ReportRequest

# PDF generation
try:
    from fpdf import FPDF
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False

# W-9 upload directory
W9_UPLOAD_DIR = "/app/backend/uploads/w9"
os.makedirs(W9_UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/admin", tags=["Admin"])


def format_hours_hms(decimal_hours: float) -> str:
    """Convert decimal hours to h:m format, rounded to nearest minute
    Used for all reporting, tracking, and viewing displays"""
    if decimal_hours is None or decimal_hours < 0:
        return "0h 0m"
    
    # Round to nearest minute
    total_minutes = round(decimal_hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    
    return f"{hours}h {minutes}m"


def round_to_nearest_minute(seconds: float) -> float:
    """Convert seconds to hours with full precision.
    Time is stored precisely - rounding to minute is done only for display.
    """
    return round(seconds / 3600, 4)  # Store with 4 decimal precision


@router.post("/create-employee", response_model=UserResponse)
async def create_employee(employee_data: CreateEmployee, admin: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({"email": employee_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": employee_data.email,
        "name": employee_data.name,
        "role": "employee",
        "phone": employee_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=employee_data.email,
        name=employee_data.name,
        role="employee",
        phone=employee_data.phone,
        created_at=user_doc["created_at"]
    )


@router.get("/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    
    # Batch fetch W-9 status for all users (optimized - single query instead of N+1)
    user_ids = [u["id"] for u in users]
    w9_docs = await db.w9_documents.find(
        {"employee_id": {"$in": user_ids}}, 
        {"_id": 0, "employee_id": 1, "status": 1}
    ).to_list(500)
    w9_map = {doc["employee_id"]: doc.get("status", "submitted") for doc in w9_docs}
    
    # Enrich users with W-9 status
    for user in users:
        user["w9_status"] = w9_map.get(user["id"])
    
    return [UserResponse(**u) for u in users]


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, admin: dict = Depends(get_admin_user)):
    if employee_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    await db.users.delete_one({"id": employee_id})
    await db.time_entries.delete_many({"user_id": employee_id})
    
    return {"message": "Employee deleted successfully"}


@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, update_data: UpdateEmployeeDetails, admin: dict = Depends(get_admin_user)):
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot edit admin account")
    
    update_fields = {}
    
    if update_data.name:
        update_fields["name"] = update_data.name
        await db.time_entries.update_many(
            {"user_id": employee_id},
            {"$set": {"user_name": update_data.name}}
        )
    
    if update_data.email:
        existing = await db.users.find_one({"email": update_data.email, "id": {"$ne": employee_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = update_data.email
    
    if update_data.hourly_rate is not None:
        if update_data.hourly_rate < 0:
            raise HTTPException(status_code=400, detail="Hourly rate cannot be negative")
        update_fields["hourly_rate"] = update_data.hourly_rate
    
    if update_data.role:
        if update_data.role not in ["employee", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'employee' or 'admin'")
        update_fields["role"] = update_data.role
    
    if update_data.phone is not None:
        update_fields["phone"] = update_data.phone
    
    # Handle employee start date
    if update_data.start_date is not None:
        if update_data.start_date == "":
            update_fields["start_date"] = None
        else:
            update_fields["start_date"] = update_data.start_date
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.users.update_one({"id": employee_id}, {"$set": update_fields})
    
    updated = await db.users.find_one({"id": employee_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated)


@router.put("/employees/{employee_id}/rate")
async def update_employee_rate(employee_id: str, rate_data: UpdateEmployeeRate, admin: dict = Depends(get_admin_user)):
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if rate_data.hourly_rate < 0:
        raise HTTPException(status_code=400, detail="Hourly rate cannot be negative")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"hourly_rate": rate_data.hourly_rate}}
    )
    
    updated = await db.users.find_one({"id": employee_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated)


@router.get("/employee/{employee_id}/entries")
async def get_employee_entries(employee_id: str, admin: dict = Depends(get_admin_user)):
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    entries = await db.time_entries.find(
        {"user_id": employee_id},
        {"_id": 0}
    ).sort("clock_in", -1).to_list(100)
    
    return entries


@router.get("/employee/{employee_id}/summary")
async def get_employee_summary_admin(employee_id: str, admin: dict = Depends(get_admin_user)):
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get employee time entries for summary calculation
    now = datetime.now(timezone.utc)
    
    # Calculate period start (biweekly from settings or default)
    settings = await db.payroll_settings.find_one({}, {"_id": 0})
    if settings and settings.get("pay_period_start_date"):
        start_str = settings["pay_period_start_date"]
        period_start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        # Ensure period_start is timezone-aware
        if period_start.tzinfo is None:
            period_start = period_start.replace(tzinfo=timezone.utc)
        while period_start + timedelta(days=14) < now:
            period_start += timedelta(days=14)
    else:
        period_start = now - timedelta(days=14)
    
    period_end = period_start + timedelta(days=14)
    
    # Get time entries in period
    entries = await db.time_entries.find({
        "user_id": employee_id
    }, {"_id": 0}).to_list(500)
    
    period_hours = 0
    period_shifts = 0
    total_hours = 0
    total_shifts = len(entries)
    
    for entry in entries:
        hours = entry.get("total_hours", 0) or 0
        total_hours += hours
        
        clock_in = entry.get("clock_in", "")
        if clock_in:
            try:
                entry_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
                # Ensure entry_time is timezone-aware for comparison
                if entry_time.tzinfo is None:
                    entry_time = entry_time.replace(tzinfo=timezone.utc)
                if period_start <= entry_time < period_end:
                    period_hours += hours
                    period_shifts += 1
            except (ValueError, TypeError):
                pass
    
    hourly_rate = employee.get("hourly_rate")
    if not hourly_rate:
        hourly_rate = settings.get("default_hourly_rate", 15.0) if settings else 15.0
    
    summary = {
        "period_hours": period_hours,
        "period_shifts": period_shifts,
        "total_hours": total_hours,
        "total_shifts": total_shifts,
        "hourly_rate": hourly_rate,
        "estimated_pay": period_hours * hourly_rate,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat()
    }
    
    return summary


@router.post("/reports")
async def generate_report(report_req: ReportRequest, admin: dict = Depends(get_admin_user)):
    try:
        start = datetime.fromisoformat(report_req.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(report_req.end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    query = {
        "clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if report_req.employee_id:
        query["user_id"] = report_req.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            employee_data[uid] = {
                "user_id": uid,
                "name": entry["user_name"],
                "total_hours": 0,
                "shifts": [],
                "shift_count": 0
            }
        employee_data[uid]["total_hours"] += entry.get("total_hours", 0)
        employee_data[uid]["shift_count"] += 1
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": entry.get("total_hours", 0)
        })
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_shifts = sum(e["shift_count"] for e in employee_data.values())
    
    return {
        "period": {
            "start": report_req.start_date,
            "end": report_req.end_date
        },
        "summary": {
            "total_hours": round(total_hours, 2),
            "total_shifts": total_shifts,
            "employee_count": len(employee_data)
        },
        "by_employee": list(employee_data.values())
    }


@router.post("/reports/pdf")
async def download_shift_report_pdf(report_req: ReportRequest, admin: dict = Depends(get_admin_user)):
    """Generate PDF for shift report download"""
    from fpdf import FPDF
    
    try:
        start = datetime.fromisoformat(report_req.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(report_req.end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    query = {
        "clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if report_req.employee_id:
        query["user_id"] = report_req.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            employee_data[uid] = {
                "user_id": uid,
                "name": entry["user_name"],
                "total_hours": 0,
                "shifts": [],
                "shift_count": 0
            }
        employee_data[uid]["total_hours"] += entry.get("total_hours", 0)
        employee_data[uid]["shift_count"] += 1
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": entry.get("total_hours", 0)
        })
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_shifts = sum(e["shift_count"] for e in employee_data.values())
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Thrifty Curator - Shift Report", ln=True, align="C")
    pdf.ln(5)
    
    # Period
    pdf.set_font("Helvetica", "", 12)
    start_str = start.strftime("%b %d, %Y")
    end_str = end.strftime("%b %d, %Y")
    pdf.cell(0, 10, f"Period: {start_str} - {end_str}", ln=True)
    pdf.ln(5)
    
    # Summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Total Hours: {total_hours:.2f}", ln=True)
    pdf.cell(0, 6, f"Total Shifts: {total_shifts}", ln=True)
    pdf.cell(0, 6, f"Employees: {len(employee_data)}", ln=True)
    pdf.ln(8)
    
    # Employee breakdown table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Employee Breakdown", ln=True)
    pdf.ln(3)
    
    # Table header
    pdf.set_fill_color(200, 200, 200)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Employee", border=1, fill=True)
    pdf.cell(40, 8, "Hours", border=1, fill=True, align="C")
    pdf.cell(40, 8, "Shifts", border=1, fill=True, align="C")
    pdf.ln()
    
    # Table rows
    pdf.set_font("Helvetica", "", 10)
    for emp in employee_data.values():
        pdf.cell(80, 8, emp["name"][:30], border=1)
        pdf.cell(40, 8, f"{emp['total_hours']:.2f} hrs", border=1, align="C")
        pdf.cell(40, 8, str(emp["shift_count"]), border=1, align="C")
        pdf.ln()
    
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, f"Generated on {datetime.now().strftime('%b %d, %Y at %I:%M %p')}", ln=True)
    
    # Return PDF
    pdf_bytes = pdf.output()
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=shift_report_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.pdf"}
    )


@router.get("/time-entries", response_model=List[TimeEntry])
async def get_all_time_entries(admin: dict = Depends(get_admin_user)):
    entries = await db.time_entries.find({}, {"_id": 0}).sort("clock_in", -1).to_list(500)
    return entries


@router.get("/summary")
async def get_admin_summary(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    entries = await db.time_entries.find({"total_hours": {"$ne": None}}, {"_id": 0}).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) for e in entries)
    
    user_hours = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in user_hours:
            user_hours[uid] = {"name": entry["user_name"], "hours": 0, "shifts": 0}
        user_hours[uid]["hours"] += entry.get("total_hours", 0)
        user_hours[uid]["shifts"] += 1
    
    return {
        "total_employees": len(users),
        "total_hours": round(total_hours, 2),
        "total_shifts": len(entries),
        "by_employee": [{"user_id": k, **v} for k, v in user_hours.items()]
    }


# Time Entry Management
@router.get("/time-entries/{entry_id}")
async def get_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return entry


@router.put("/time-entries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: EditTimeEntryRequest, admin: dict = Depends(get_admin_user)):
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    update_fields = {}
    
    if update_data.clock_in:
        try:
            datetime.fromisoformat(update_data.clock_in.replace('Z', '+00:00'))
            update_fields["clock_in"] = update_data.clock_in
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_in format")
    
    if update_data.clock_out:
        try:
            datetime.fromisoformat(update_data.clock_out.replace('Z', '+00:00'))
            update_fields["clock_out"] = update_data.clock_out
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
    clock_in = update_data.clock_in or entry.get("clock_in")
    clock_out = update_data.clock_out or entry.get("clock_out")
    
    # If total_hours is explicitly provided, use it directly (override mode)
    # The value should already be rounded to nearest minute from frontend
    if update_data.total_hours is not None:
        update_fields["total_hours"] = update_data.total_hours
        update_fields["adjusted_by_admin"] = True  # Mark as manually adjusted
    # Otherwise, if we have both clock times (and they were updated), calculate hours
    elif clock_in and clock_out and (update_data.clock_in or update_data.clock_out):
        try:
            in_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
            out_time = datetime.fromisoformat(clock_out.replace('Z', '+00:00'))
            # Round to nearest minute
            total_seconds = (out_time - in_time).total_seconds()
            calculated_hours = round_to_nearest_minute(total_seconds)
            update_fields["total_hours"] = calculated_hours
            update_fields["adjusted_by_admin"] = False  # Calculated from times
        except ValueError:
            pass
    
    # Handle admin note
    if update_data.admin_note is not None:
        update_fields["admin_note"] = update_data.admin_note if update_data.admin_note.strip() else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.time_entries.update_one({"id": entry_id}, {"$set": update_fields})
    
    updated_entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    return updated_entry


@router.delete("/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.time_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return {"message": "Time entry deleted"}


@router.post("/employee/{employee_id}/clock")
async def admin_clock_employee(employee_id: str, action: dict, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to clock in/out an employee"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    clock_action = action.get("action")
    if clock_action not in ["in", "out"]:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'in' or 'out'")
    
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if clock_action == "in":
        # Check if already clocked in
        active = await db.time_entries.find_one(
            {"user_id": employee_id, "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Employee is already clocked in")
        
        # Use "Administrator" for admin users instead of their personal name (for both employee and admin acting)
        employee_display_name = "Administrator" if employee.get("role") == "admin" else employee["name"]
        admin_display_name = "Administrator" if admin.get("role") == "admin" else admin["name"]
        
        # Always create new entry for each clock-in
        # This ensures that completed shifts are not accidentally reopened
        entry_id = str(uuid.uuid4())
        entry = {
            "id": entry_id,
            "user_id": employee_id,
            "user_name": employee_display_name,
            "clock_in": now_iso,
            "clock_out": None,
            "shift_date": today_start.strftime("%Y-%m-%d"),
            "last_clock_in": now_iso,
            "accumulated_hours": 0.0,
            "total_hours": None,
            "admin_clocked": True,
            "admin_id": admin["id"],
            "admin_name": admin_display_name
        }
        await db.time_entries.insert_one(entry)
        return {
            "message": f"Clocked in {employee_display_name}",
            "action": "in",
            "timestamp": now_iso,
            "employee_name": employee_display_name,
            "entry_id": entry_id
        }
    
    else:  # clock_action == "out"
        # Find active shift
        active = await db.time_entries.find_one(
            {"user_id": employee_id, "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Employee is not clocked in")
        
        # Calculate hours rounded to nearest minute
        last_clock_in = active.get("last_clock_in") or active.get("clock_in")
        accumulated_hours = active.get("accumulated_hours", 0.0)
        
        try:
            in_time = datetime.fromisoformat(last_clock_in.replace('Z', '+00:00'))
            session_seconds = (now - in_time).total_seconds()
            # Calculate total hours, rounded to nearest minute
            accumulated_seconds = accumulated_hours * 3600
            total_seconds = accumulated_seconds + session_seconds
            total_hours = round_to_nearest_minute(total_seconds)
        except (ValueError, TypeError, AttributeError):
            total_hours = accumulated_hours
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {
                "$set": {
                    "clock_out": now_iso,
                    "total_hours": total_hours,
                    "accumulated_hours": total_hours,
                    "admin_clocked_out": True,
                    "admin_out_id": admin["id"],
                    "admin_out_name": admin["name"]
                }
            }
        )
        
        return {
            "message": f"Clocked out {employee['name']}",
            "action": "out",
            "timestamp": now_iso,
            "employee_name": employee["name"],
            "total_hours": total_hours
        }


@router.get("/employee/{employee_id}/clock-status")
async def get_employee_clock_status(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get current clock status for an employee"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    active = await db.time_entries.find_one(
        {"user_id": employee_id, "clock_out": None}, {"_id": 0}
    )
    
    return {
        "is_clocked_in": active is not None,
        "clock_in_time": active.get("last_clock_in") or active.get("clock_in") if active else None,
        "entry_id": active.get("id") if active else None
    }


@router.post("/time-entries")
async def create_time_entry(entry_data: CreateTimeEntryRequest, admin: dict = Depends(get_admin_user)):
    employee = await db.users.find_one({"id": entry_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        clock_in_dt = datetime.fromisoformat(entry_data.clock_in.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid clock_in format")
    
    clock_out_str = None
    total_hours = None
    
    if entry_data.clock_out:
        try:
            clock_out_dt = datetime.fromisoformat(entry_data.clock_out.replace('Z', '+00:00'))
            clock_out_str = entry_data.clock_out
            # Round to nearest minute
            total_seconds = (clock_out_dt - clock_in_dt).total_seconds()
            total_hours = round_to_nearest_minute(total_seconds)
            
            if total_hours < 0:
                raise HTTPException(status_code=400, detail="Clock out must be after clock in")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
    # Use "Administrator" for admin users instead of their personal name
    display_name = "Administrator" if employee.get("role") == "admin" else employee["name"]
    
    entry = TimeEntry(
        user_id=entry_data.employee_id,
        user_name=display_name,
        clock_in=entry_data.clock_in,
        clock_out=clock_out_str,
        total_hours=total_hours
    )
    
    await db.time_entries.insert_one(entry.model_dump())
    
    return entry


# W-9 Document Management - Multiple W-9s per employee
@router.post("/employees/{employee_id}/w9")
async def upload_w9(employee_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    """Upload W-9 document for an employee (supports multiple W-9s)"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")
    
    # Read file content
    content = await file.read()
    
    # Size limit: 10MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Create unique document ID
    doc_id = str(uuid.uuid4())
    
    # Store file info in database
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
    
    # Insert new W-9 document
    await db.w9_documents.insert_one(w9_doc)
    
    # Update employee record to indicate W-9 is on file
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
    """Get W-9 status summary for an employee"""
    w9_docs = await db.w9_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    if not w9_docs:
        return {"has_w9": False, "status": "not_submitted", "w9_documents": []}
    
    # Get the latest document's status
    latest = w9_docs[0]
    
    return {
        "has_w9": True,
        "status": latest.get("status", "submitted"),
        "total_documents": len(w9_docs),
        "w9_documents": w9_docs
    }


@router.get("/employees/{employee_id}/w9/latest")
async def get_employee_latest_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get the latest W-9 document for an employee as a file download"""
    # Get the most recent W-9 document (need to include content this time)
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
    """Download a specific W-9 document"""
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
    """Get all W-9 documents for an employee"""
    w9_docs = await db.w9_documents.find(
        {"employee_id": employee_id},
        {"_id": 0, "content": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return {"w9_documents": w9_docs}


@router.delete("/employees/{employee_id}/w9/all")
async def delete_all_w9s(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Delete all W-9 documents for an employee"""
    result = await db.w9_documents.delete_many({"employee_id": employee_id})
    
    # Update user record
    await db.users.update_one(
        {"id": employee_id},
        {"$unset": {"has_w9": "", "w9_uploaded_at": "", "w9_status": ""}}
    )
    
    return {"message": f"Deleted {result.deleted_count} W-9 document(s) successfully"}


@router.delete("/employees/{employee_id}/w9/{doc_id}")
async def delete_w9(employee_id: str, doc_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a specific W-9 document"""
    result = await db.w9_documents.delete_one({"employee_id": employee_id, "id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="W-9 document not found")
    
    # Check if employee has any remaining W-9s
    remaining = await db.w9_documents.count_documents({"employee_id": employee_id})
    if remaining == 0:
        await db.users.update_one(
            {"id": employee_id},
            {"$unset": {"has_w9": "", "w9_uploaded_at": ""}}
        )
    
    return {"message": "W-9 document deleted successfully"}


@router.get("/w9-form")
async def get_blank_w9_form(admin: dict = Depends(get_admin_user)):
    """Download blank W-9 form template"""
    # Return a redirect to the official IRS W-9 form
    from fastapi.responses import RedirectResponse
    return RedirectResponse(
        url="https://www.irs.gov/pub/irs-pdf/fw9.pdf",
        status_code=302
    )


# W-9 Review endpoints
@router.get("/w9/pending")
async def get_pending_w9s(admin: dict = Depends(get_admin_user)):
    """Get all W-9s pending review"""
    pending = await db.w9_documents.find(
        {"status": "pending_review"},
        {"_id": 0, "content": 0}
    ).to_list(100)
    
    # Add employee names
    for doc in pending:
        emp = await db.users.find_one({"id": doc["employee_id"]}, {"_id": 0, "name": 1, "email": 1})
        if emp:
            doc["employee_name"] = emp.get("name", "Unknown")
            doc["employee_email"] = emp.get("email", "")
    
    return pending


@router.post("/employees/{employee_id}/w9/approve")
async def approve_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Approve an employee's W-9 submission"""
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
    """Approve a specific W-9 document"""
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
    
    # Update user's w9_status if this is their latest document
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
    """Reject an employee's W-9 and request corrections"""
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


# Shift Reports endpoints
@router.get("/reports/shifts")
async def get_shift_report(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get shift report data for the given date range"""
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        # Set end to end of day
        end = end.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Get default hourly rate from payroll settings
    payroll_settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = 15.00
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 15.00)
    
    # Build query
    query = {
        "clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }
    if employee_id:
        query["user_id"] = employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).sort("clock_in", 1).to_list(1000)
    
    # Get employee details
    employee_map = {}
    for entry in entries:
        if entry["user_id"] not in employee_map:
            emp = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0, "name": 1, "email": 1, "hourly_rate": 1})
            if emp:
                employee_map[entry["user_id"]] = emp
    
    # Format response
    report_data = []
    for entry in entries:
        emp = employee_map.get(entry["user_id"], {})
        # Use employee's custom rate if set, otherwise use default from payroll settings
        emp_rate = emp.get("hourly_rate") if emp.get("hourly_rate") is not None else default_rate
        report_data.append({
            "employee_id": entry["user_id"],
            "employee_name": entry.get("user_name") or emp.get("name", "Unknown"),
            "clock_in": entry["clock_in"],
            "clock_out": entry.get("clock_out"),
            "total_hours": entry.get("total_hours", 0),
            "admin_note": entry.get("admin_note"),
            "adjusted_by_admin": entry.get("adjusted_by_admin", False),
            "hourly_rate": emp_rate
        })
    
    # Calculate summary by employee
    summary = {}
    for item in report_data:
        emp_id = item["employee_id"]
        if emp_id not in summary:
            summary[emp_id] = {
                "employee_name": item["employee_name"],
                "total_hours": 0,
                "total_shifts": 0,
                "hourly_rate": item["hourly_rate"]
            }
        summary[emp_id]["total_hours"] += item["total_hours"] or 0
        summary[emp_id]["total_shifts"] += 1
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "entries": report_data,
        "summary": list(summary.values()),
        "total_entries": len(report_data)
    }


@router.get("/reports/shifts/csv")
async def download_shift_report_csv(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download shift report as CSV"""
    # Get report data
    report = await get_shift_report(start_date, end_date, employee_id, admin)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Employee Name", "Clock In", "Clock Out", "Hours", "Rate", "Est. Pay", "Admin Note", "Adjusted"
    ])
    
    # Data rows
    for entry in report["entries"]:
        clock_in = entry["clock_in"][:16].replace("T", " ") if entry["clock_in"] else ""
        clock_out = entry["clock_out"][:16].replace("T", " ") if entry["clock_out"] else "Active"
        hours = entry["total_hours"] or 0
        hourly_rate = entry.get("hourly_rate", 15.00)
        est_pay = hours * hourly_rate
        writer.writerow([
            entry["employee_name"],
            clock_in,
            clock_out,
            format_hours_hms(hours),
            f"${hourly_rate:.2f}/hr",
            f"${est_pay:.2f}",
            entry["admin_note"] or "",
            "Yes" if entry["adjusted_by_admin"] else "No"
        ])
    
    # Summary section
    writer.writerow([])
    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Employee", "Total Hours", "Total Shifts", "Rate", "Estimated Pay"])
    for s in report["summary"]:
        pay = s["total_hours"] * s["hourly_rate"]
        writer.writerow([
            s["employee_name"],
            format_hours_hms(s['total_hours']),
            s["total_shifts"],
            f"${s['hourly_rate']:.2f}/hr",
            f"${pay:.2f}"
        ])
    
    output.seek(0)
    
    # Generate filename
    filename = f"shift_report_{start_date[:10]}_to_{end_date[:10]}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/shifts/pdf")
async def get_shift_report_pdf(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download shift report as PDF"""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    # Get report data
    report = await get_shift_report(start_date, end_date, employee_id, admin)
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Thrifty Curator - Shift Report", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Period: {start_date[:10]} to {end_date[:10]}", ln=True, align="C")
    pdf.ln(5)
    
    # Summary section
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary by Employee", ln=True)
    pdf.set_font("Helvetica", "", 9)
    
    # Summary table header
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(60, 7, "Employee", border=1, fill=True)
    pdf.cell(30, 7, "Hours", border=1, fill=True, align="C")
    pdf.cell(30, 7, "Shifts", border=1, fill=True, align="C")
    pdf.cell(35, 7, "Est. Pay", border=1, fill=True, align="C")
    pdf.ln()
    
    total_hours = 0
    total_pay = 0
    for s in report["summary"]:
        pay = s["total_hours"] * s["hourly_rate"]
        total_hours += s["total_hours"]
        total_pay += pay
        pdf.cell(60, 6, s["employee_name"][:25], border=1)
        pdf.cell(30, 6, format_hours_hms(s['total_hours']), border=1, align="C")
        pdf.cell(30, 6, str(s["total_shifts"]), border=1, align="C")
        pdf.cell(35, 6, f"${pay:.2f}", border=1, align="C")
        pdf.ln()
    
    # Totals
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(60, 7, "TOTAL", border=1, fill=True)
    pdf.cell(30, 7, format_hours_hms(total_hours), border=1, fill=True, align="C")
    pdf.cell(30, 7, str(len(report["entries"])), border=1, fill=True, align="C")
    pdf.cell(35, 7, f"${total_pay:.2f}", border=1, fill=True, align="C")
    pdf.ln(10)
    
    # Detailed entries
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Detailed Shift Entries", ln=True)
    pdf.set_font("Helvetica", "", 8)
    
    # Table header
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(32, 6, "Employee", border=1, fill=True)
    pdf.cell(32, 6, "Clock In", border=1, fill=True)
    pdf.cell(32, 6, "Clock Out", border=1, fill=True)
    pdf.cell(15, 6, "Hours", border=1, fill=True, align="C")
    pdf.cell(22, 6, "Est. Pay", border=1, fill=True, align="C")
    pdf.cell(47, 6, "Admin Note", border=1, fill=True)
    pdf.ln()
    
    for entry in report["entries"]:
        clock_in = entry["clock_in"][5:16].replace("T", " ") if entry["clock_in"] else ""
        clock_out = entry["clock_out"][5:16].replace("T", " ") if entry["clock_out"] else "Active"
        note = (entry["admin_note"] or "")[:22]
        if entry["admin_note"] and len(entry["admin_note"]) > 22:
            note += "..."
        hours = entry["total_hours"] or 0
        hourly_rate = entry.get("hourly_rate", 15.00)
        est_pay = hours * hourly_rate
        
        pdf.cell(32, 5, entry["employee_name"][:16], border=1)
        pdf.cell(32, 5, clock_in, border=1)
        pdf.cell(32, 5, clock_out, border=1)
        pdf.cell(15, 5, format_hours_hms(hours), border=1, align="C")
        pdf.cell(22, 5, f"${est_pay:.2f}", border=1, align="C")
        pdf.cell(47, 5, note, border=1)
        pdf.ln()
    
    # Generate PDF bytes
    pdf_output = pdf.output()
    
    # Generate filename
    filename = f"shift_report_{start_date[:10]}_to_{end_date[:10]}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Mileage Reports endpoints
@router.get("/mileage/report")
async def get_mileage_report(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get mileage report data for the given date range"""
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        end = end.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Build query
    query = {
        "date": {"$gte": start.isoformat()[:10], "$lte": end.isoformat()[:10]}
    }
    if employee_id:
        query["user_id"] = employee_id
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # IRS standard mileage rate for 2026 (72.5 cents per mile)
    MILEAGE_RATE = 0.725
    
    # Calculate totals - use total_miles field from database
    total_miles = sum(e.get("total_miles", 0) for e in entries)
    total_deduction = total_miles * MILEAGE_RATE
    
    # Group by employee
    employee_summary = {}
    for entry in entries:
        uid = entry.get("user_id")
        if uid not in employee_summary:
            employee_summary[uid] = {
                "user_id": uid,
                "user_name": entry.get("user_name", "Unknown"),
                "total_miles": 0,
                "total_deduction": 0,
                "trip_count": 0
            }
        miles = entry.get("total_miles", 0)
        employee_summary[uid]["total_miles"] += miles
        employee_summary[uid]["total_deduction"] += miles * MILEAGE_RATE
        employee_summary[uid]["trip_count"] += 1
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "entries": entries,
        "employees": list(employee_summary.values()),
        "total_trips": len(entries),
        "total_miles": total_miles,
        "total_deduction": total_deduction
    }


@router.get("/mileage/report/csv")
async def download_mileage_report_csv(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download mileage report as CSV"""
    report = await get_mileage_report(start_date, end_date, employee_id, admin)
    
    # IRS standard mileage rate (72.5 cents per mile)
    MILEAGE_RATE = 0.725
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Employee", "Date", "From", "To", "Purpose", "Miles", "Deduction"])
    
    # Data rows
    for entry in report["entries"]:
        miles = entry.get("total_miles", 0)
        deduction = miles * MILEAGE_RATE
        writer.writerow([
            entry.get("user_name", "Unknown"),
            entry.get("date", ""),
            entry.get("start_address", ""),
            entry.get("end_address", ""),
            entry.get("purpose", ""),
            f"{miles:.1f}",
            f"${deduction:.2f}"
        ])
    
    # Summary
    writer.writerow([])
    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Employee", "Total Miles", "Total Deduction", "Trips"])
    for emp in report["employees"]:
        writer.writerow([
            emp["user_name"],
            f"{emp['total_miles']:.1f}",
            f"${emp['total_deduction']:.2f}",
            emp["trip_count"]
        ])
    
    writer.writerow([])
    writer.writerow(["GRAND TOTAL", f"{report['total_miles']:.1f}", f"${report['total_deduction']:.2f}", report["total_trips"]])
    
    output.seek(0)
    filename = f"mileage_report_{start_date[:10]}_to_{end_date[:10]}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/mileage/report/pdf")
async def download_mileage_report_pdf(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download mileage report as PDF"""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    report = await get_mileage_report(start_date, end_date, employee_id, admin)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Thrifty Curator - Mileage Report", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Period: {start_date[:10]} to {end_date[:10]}", ln=True, align="C")
    pdf.ln(5)
    
    # Summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Total Trips: {report['total_trips']}", ln=True)
    pdf.cell(0, 6, f"Total Miles: {report['total_miles']:.1f}", ln=True)
    pdf.cell(0, 6, f"Total Deduction: ${report['total_deduction']:.2f}", ln=True)
    pdf.ln(5)
    
    # By Employee
    if report["employees"]:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "By Employee", ln=True)
        pdf.set_font("Helvetica", "", 9)
        
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(60, 7, "Employee", border=1, fill=True)
        pdf.cell(30, 7, "Miles", border=1, fill=True, align="C")
        pdf.cell(35, 7, "Deduction", border=1, fill=True, align="C")
        pdf.cell(25, 7, "Trips", border=1, fill=True, align="C")
        pdf.ln()
        
        for emp in report["employees"]:
            pdf.cell(60, 6, emp["user_name"][:25], border=1)
            pdf.cell(30, 6, f"{emp['total_miles']:.1f}", border=1, align="C")
            pdf.cell(35, 6, f"${emp['total_deduction']:.2f}", border=1, align="C")
            pdf.cell(25, 6, str(emp["trip_count"]), border=1, align="C")
            pdf.ln()
    
    pdf.ln(5)
    
    # Detailed entries
    if report["entries"]:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Trip Details", ln=True)
        pdf.set_font("Helvetica", "", 8)
        
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(40, 6, "Employee", border=1, fill=True)
        pdf.cell(25, 6, "Date", border=1, fill=True)
        pdf.cell(70, 6, "Purpose", border=1, fill=True)
        pdf.cell(20, 6, "Miles", border=1, fill=True, align="C")
        pdf.cell(25, 6, "Deduction", border=1, fill=True, align="C")
        pdf.ln()
        
        # IRS standard mileage rate (72.5 cents per mile)
        MILEAGE_RATE = 0.725
        
        for entry in report["entries"][:50]:
            purpose = (entry.get("purpose", "") or "")[:35]
            miles = entry.get("total_miles", 0)
            deduction = miles * MILEAGE_RATE
            pdf.cell(40, 5, entry.get("user_name", "")[:20], border=1)
            pdf.cell(25, 5, entry.get("date", "")[:10], border=1)
            pdf.cell(70, 5, purpose, border=1)
            pdf.cell(20, 5, f"{miles:.1f}", border=1, align="C")
            pdf.cell(25, 5, f"${deduction:.2f}", border=1, align="C")
            pdf.ln()
    
    pdf_output = pdf.output()
    filename = f"mileage_report_{start_date[:10]}_to_{end_date[:10]}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# W-9 Report endpoints
@router.get("/reports/w9")
async def get_w9_report(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get W-9 status report for all employees (including admins)"""
    # Get all users including admins
    query = {}
    if employee_id:
        query["id"] = employee_id
    
    users = await db.users.find(query, {"_id": 0}).to_list(500)
    
    # Get all W-9 documents
    w9_docs = await db.w9_documents.find({}, {"_id": 0, "content": 0}).to_list(1000)
    
    # Create a map of employee_id to their W-9 documents
    w9_by_employee = {}
    for doc in w9_docs:
        emp_id = doc.get("employee_id")
        if emp_id not in w9_by_employee:
            w9_by_employee[emp_id] = []
        w9_by_employee[emp_id].append(doc)
    
    # Build employee report data
    employees = []
    summary = {"total_employees": 0, "approved": 0, "pending": 0, "not_submitted": 0}
    
    for user in users:
        user_id = user.get("id")
        user_w9s = w9_by_employee.get(user_id, [])
        
        # Determine W-9 status
        if user_w9s:
            # Sort by uploaded_at to get latest
            sorted_docs = sorted(user_w9s, key=lambda x: x.get("uploaded_at", ""), reverse=True)
            latest_status = sorted_docs[0].get("status", "submitted")
            last_updated = sorted_docs[0].get("uploaded_at")
        else:
            latest_status = "not_submitted"
            last_updated = None
        
        # Count for summary
        if latest_status == "approved":
            summary["approved"] += 1
        elif latest_status in ["submitted", "pending", "pending_review"]:
            summary["pending"] += 1
        else:
            summary["not_submitted"] += 1
        
        summary["total_employees"] += 1
        
        # Use "Administrator" for admin users instead of their personal name
        display_name = "Administrator" if user.get("role") == "admin" else user.get("name", "Unknown")
        
        employees.append({
            "id": user_id,
            "name": display_name,
            "email": user.get("email", ""),
            "role": user.get("role", "employee"),
            "start_date": user.get("start_date"),
            "w9_status": latest_status,
            "document_count": len(user_w9s),
            "last_updated": last_updated
        })
    
    # Sort by name
    employees.sort(key=lambda x: x.get("name", "").lower())
    
    return {
        "summary": summary,
        "employees": employees,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/reports/w9/csv")
async def get_w9_report_csv(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download W-9 status report as CSV"""
    report = await get_w9_report(employee_id, admin)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["W-9 Status Report", f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"])
    writer.writerow([])
    
    # Summary
    writer.writerow(["Summary"])
    writer.writerow(["Total Employees", report["summary"]["total_employees"]])
    writer.writerow(["Approved", report["summary"]["approved"]])
    writer.writerow(["Pending", report["summary"]["pending"]])
    writer.writerow(["Not Submitted", report["summary"]["not_submitted"]])
    writer.writerow([])
    
    # Employee details
    writer.writerow(["Employee Name", "Email", "Role", "Start Date", "W-9 Status", "Document Count", "Last Updated"])
    for emp in report["employees"]:
        start_date = emp.get("start_date", "")
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date).strftime("%b %d, %Y")
            except:
                pass
        writer.writerow([
            emp["name"],
            emp["email"],
            emp["role"],
            start_date or "N/A",
            emp["w9_status"],
            emp["document_count"],
            emp.get("last_updated", "")[:10] if emp.get("last_updated") else "N/A"
        ])
    
    csv_content = output.getvalue()
    filename = f"w9_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content.encode('utf-8'),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/w9/pdf")
async def get_w9_report_pdf(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download W-9 status report as PDF"""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    report = await get_w9_report(employee_id, admin)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Thrifty Curator - W-9 Status Report", ln=True, align="C")
    pdf.ln(5)
    
    # Generated date
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", ln=True)
    pdf.ln(5)
    
    # Summary section
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    
    summary = report["summary"]
    pdf.cell(0, 6, f"Total Employees: {summary['total_employees']}", ln=True)
    pdf.set_text_color(0, 128, 0)
    pdf.cell(0, 6, f"Approved: {summary['approved']}", ln=True)
    pdf.set_text_color(255, 165, 0)
    pdf.cell(0, 6, f"Pending: {summary['pending']}", ln=True)
    pdf.set_text_color(255, 0, 0)
    pdf.cell(0, 6, f"Not Submitted: {summary['not_submitted']}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(10)
    
    # Employee table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Employee W-9 Status", ln=True)
    pdf.ln(3)
    
    # Table header
    pdf.set_fill_color(200, 200, 200)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(45, 7, "Name", border=1, fill=True)
    pdf.cell(30, 7, "Start Date", border=1, fill=True, align="C")
    pdf.cell(25, 7, "Role", border=1, fill=True, align="C")
    pdf.cell(30, 7, "Status", border=1, fill=True, align="C")
    pdf.cell(20, 7, "Docs", border=1, fill=True, align="C")
    pdf.cell(30, 7, "Last Updated", border=1, fill=True, align="C")
    pdf.ln()
    
    # Table rows
    pdf.set_font("Helvetica", "", 9)
    for emp in report["employees"]:
        # Status color
        status = emp["w9_status"]
        if status == "approved":
            pdf.set_fill_color(200, 255, 200)
        elif status in ["submitted", "pending", "pending_review"]:
            pdf.set_fill_color(255, 255, 200)
        else:
            pdf.set_fill_color(255, 200, 200)
        
        name = emp["name"][:22] if len(emp["name"]) > 22 else emp["name"]
        role = emp["role"]
        last_updated = emp.get("last_updated", "")[:10] if emp.get("last_updated") else "N/A"
        
        # Format start date
        start_date = emp.get("start_date", "")
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date).strftime("%b %d, %Y")
            except:
                start_date = "N/A"
        else:
            start_date = "N/A"
        
        # Format status for display
        display_status = "Pending" if status in ["submitted", "pending", "pending_review"] else status.replace("_", " ").title()
        
        pdf.cell(45, 6, name, border=1)
        pdf.cell(30, 6, start_date, border=1, align="C")
        pdf.cell(25, 6, role, border=1, align="C")
        pdf.cell(30, 6, display_status, border=1, fill=True, align="C")
        pdf.cell(20, 6, str(emp["document_count"]), border=1, align="C")
        pdf.cell(30, 6, last_updated, border=1, align="C")
        pdf.ln()
        pdf.set_fill_color(255, 255, 255)
    
    pdf_output = pdf.output()
    filename = f"w9_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
