from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from typing import List
from datetime import datetime, timezone
import uuid
import base64
import os

from app.database import db
from app.dependencies import get_admin_user
from app.models.user import UserResponse, CreateEmployee, UpdateEmployeeDetails, UpdateEmployeeRate
from app.models.time_entry import TimeEntry, EditTimeEntryRequest, CreateTimeEntryRequest
from app.models.payroll import ReportRequest

# W-9 upload directory
W9_UPLOAD_DIR = "/app/backend/uploads/w9"
os.makedirs(W9_UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/admin", tags=["Admin"])


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
    
    summary = await get_employee_hours_summary(employee_id)
    
    hourly_rate = employee.get("hourly_rate")
    if not hourly_rate:
        settings = await db.payroll_settings.find_one({}, {"_id": 0})
        hourly_rate = settings.get("default_hourly_rate", 15.0) if settings else 15.0
    
    summary["hourly_rate"] = hourly_rate
    summary["estimated_pay"] = summary.get("period_hours", 0) * hourly_rate
    
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
    
    if clock_in and clock_out:
        try:
            in_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
            out_time = datetime.fromisoformat(clock_out.replace('Z', '+00:00'))
            calculated_hours = round((out_time - in_time).total_seconds() / 3600, 2)
            update_fields["total_hours"] = calculated_hours
        except ValueError:
            pass
    elif update_data.total_hours is not None:
        update_fields["total_hours"] = update_data.total_hours
    
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
        
        # Check for existing entry today
        today_entry = await db.time_entries.find_one(
            {
                "user_id": employee_id,
                "shift_date": today_start.strftime("%Y-%m-%d")
            },
            {"_id": 0}
        )
        
        if today_entry:
            # Resume existing shift
            await db.time_entries.update_one(
                {"id": today_entry["id"]},
                {
                    "$set": {
                        "clock_out": None,
                        "last_clock_in": now_iso
                    }
                }
            )
            return {
                "message": f"Clocked in {employee['name']} (resumed shift)",
                "action": "in",
                "timestamp": now_iso,
                "employee_name": employee["name"]
            }
        else:
            # Create new entry
            entry_id = str(uuid.uuid4())
            entry = {
                "id": entry_id,
                "user_id": employee_id,
                "user_name": employee["name"],
                "clock_in": now_iso,
                "clock_out": None,
                "shift_date": today_start.strftime("%Y-%m-%d"),
                "last_clock_in": now_iso,
                "accumulated_hours": 0.0,
                "total_hours": None,
                "admin_clocked": True,
                "admin_id": admin["id"],
                "admin_name": admin["name"]
            }
            await db.time_entries.insert_one(entry)
            return {
                "message": f"Clocked in {employee['name']}",
                "action": "in",
                "timestamp": now_iso,
                "employee_name": employee["name"],
                "entry_id": entry_id
            }
    
    else:  # clock_action == "out"
        # Find active shift
        active = await db.time_entries.find_one(
            {"user_id": employee_id, "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Employee is not clocked in")
        
        # Calculate hours
        last_clock_in = active.get("last_clock_in") or active.get("clock_in")
        accumulated = active.get("accumulated_hours", 0.0)
        
        try:
            in_time = datetime.fromisoformat(last_clock_in.replace('Z', '+00:00'))
            session_hours = (now - in_time).total_seconds() / 3600
            total_hours = round(accumulated + session_hours, 2)
        except (ValueError, TypeError, AttributeError):
            total_hours = accumulated
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {
                "$set": {
                    "clock_out": now_iso,
                    "total_hours": total_hours,
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
            total_hours = round((clock_out_dt - clock_in_dt).total_seconds() / 3600, 2)
            
            if total_hours < 0:
                raise HTTPException(status_code=400, detail="Clock out must be after clock in")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
    entry = TimeEntry(
        user_id=entry_data.employee_id,
        user_name=employee["name"],
        clock_in=entry_data.clock_in,
        clock_out=clock_out_str,
        total_hours=total_hours
    )
    
    await db.time_entries.insert_one(entry.model_dump())
    
    return entry


# W-9 Document Management
@router.post("/employees/{employee_id}/w9")
async def upload_w9(employee_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    """Upload W-9 document for an employee"""
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
    
    # Store file info in database
    w9_doc = {
        "employee_id": employee_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin["id"]
    }
    
    # Update or insert W-9 document
    await db.w9_documents.update_one(
        {"employee_id": employee_id},
        {"$set": w9_doc},
        upsert=True
    )
    
    # Update employee record to indicate W-9 is on file
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"has_w9": True, "w9_uploaded_at": w9_doc["uploaded_at"]}}
    )
    
    return {
        "message": "W-9 uploaded successfully",
        "filename": file.filename,
        "uploaded_at": w9_doc["uploaded_at"]
    }


@router.get("/employees/{employee_id}/w9")
async def download_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Download W-9 document for an employee"""
    w9_doc = await db.w9_documents.find_one({"employee_id": employee_id}, {"_id": 0})
    if not w9_doc:
        raise HTTPException(status_code=404, detail="No W-9 document found for this employee")
    
    content = base64.b64decode(w9_doc["content"])
    
    return Response(
        content=content,
        media_type=w9_doc["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{w9_doc["filename"]}"'
        }
    )


@router.delete("/employees/{employee_id}/w9")
async def delete_w9(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Delete W-9 document for an employee"""
    result = await db.w9_documents.delete_one({"employee_id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No W-9 document found for this employee")
    
    # Update employee record
    await db.users.update_one(
        {"id": employee_id},
        {"$unset": {"has_w9": "", "w9_uploaded_at": ""}}
    )
    
    return {"message": "W-9 document deleted successfully"}


@router.get("/employees/{employee_id}/w9/status")
async def get_w9_status(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Check if an employee has a W-9 on file"""
    w9_doc = await db.w9_documents.find_one({"employee_id": employee_id}, {"_id": 0, "content": 0})
    if not w9_doc:
        return {"has_w9": False, "status": "not_submitted"}
    
    return {
        "has_w9": True,
        "status": w9_doc.get("status", "submitted"),
        "filename": w9_doc.get("filename"),
        "content_type": w9_doc.get("content_type"),
        "uploaded_at": w9_doc.get("uploaded_at"),
        "rejection_reason": w9_doc.get("rejection_reason"),
        "reviewed_at": w9_doc.get("reviewed_at")
    }


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
