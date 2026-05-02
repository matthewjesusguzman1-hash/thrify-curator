"""Employee management routes for admin dashboard."""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from datetime import datetime, timezone, timedelta
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.user import UserResponse, CreateEmployee, UpdateEmployeeDetails, UpdateEmployeeRate
from app.services.email_service import send_new_employee_welcome_email

router = APIRouter(prefix="/admin", tags=["Admin - Employees"])

# Business owner emails - only these users can assign admin roles
OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]


def is_owner(admin_email: str) -> bool:
    """Check if the admin is a business owner."""
    return admin_email.lower() in [e.lower() for e in OWNER_EMAILS]


@router.post("/create-employee", response_model=UserResponse)
async def create_employee(employee_data: CreateEmployee, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Create a new employee or admin."""
    email_normalized = employee_data.email.lower().strip()
    
    existing = await db.users.find_one({"email": {"$regex": f"^{email_normalized}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Determine role (default to employee)
    role = employee_data.role or "employee"
    if role not in ["employee", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'employee' or 'admin'")
    
    # Only business owners can create admins
    if role == "admin" and not is_owner(admin.get("email", "")):
        raise HTTPException(status_code=403, detail="Only business owners can create admin accounts")
    
    # If creating an admin, validate admin_code
    admin_code = None
    if role == "admin":
        if not employee_data.admin_code:
            raise HTTPException(status_code=400, detail="Admin code is required when creating an admin")
        if not employee_data.admin_code.isdigit() or len(employee_data.admin_code) != 4:
            raise HTTPException(status_code=400, detail="Admin code must be exactly 4 digits")
        # Check if code is already in use
        existing_code = await db.users.find_one({"admin_code": employee_data.admin_code})
        if existing_code:
            raise HTTPException(status_code=400, detail="This admin code is already in use")
        # Check reserved codes
        if employee_data.admin_code in ["4399", "0826"]:
            raise HTTPException(status_code=400, detail="This admin code is reserved")
        admin_code = employee_data.admin_code
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email_normalized,
        "name": employee_data.name,
        "role": role,
        "phone": employee_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if admin_code:
        user_doc["admin_code"] = admin_code
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email to new employee (in background so it doesn't slow down the response)
    if role == "employee":
        background_tasks.add_task(
            send_new_employee_welcome_email,
            to_email=email_normalized,
            employee_name=employee_data.name
        )
    
    return UserResponse(
        id=user_id,
        email=email_normalized,
        name=employee_data.name,
        role=role,
        phone=employee_data.phone,
        admin_code=admin_code,
        created_at=user_doc["created_at"]
    )


@router.get("/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(get_admin_user)):
    """Get all employees with W-9 status (excludes business owners)."""
    # Exclude business owners (Matthew and Eunice) but include other admins
    OWNER_EMAILS = [
        "matthewjesusguzman1@gmail.com",
        "euniceguzman@thriftycurator.com"
    ]
    
    users = await db.users.find(
        {"email": {"$nin": OWNER_EMAILS}}, 
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(500)
    
    user_ids = [u["id"] for u in users]
    w9_docs = await db.w9_documents.find(
        {"employee_id": {"$in": user_ids}}, 
        {"_id": 0, "employee_id": 1, "status": 1}
    ).to_list(500)
    w9_map = {doc["employee_id"]: doc.get("status", "submitted") for doc in w9_docs}
    
    for user in users:
        user["w9_status"] = w9_map.get(user["id"])
    
    return [UserResponse(**u) for u in users]


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Delete an employee and their time entries."""
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
    """Update employee details."""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if trying to edit a business owner
    if employee.get("email", "").lower() in [e.lower() for e in OWNER_EMAILS]:
        raise HTTPException(status_code=400, detail="Cannot edit business owner account")
    
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
        
        # Only business owners can change roles to admin
        if update_data.role == "admin" and not is_owner(admin.get("email", "")):
            raise HTTPException(status_code=403, detail="Only business owners can assign admin roles")
        
        update_fields["role"] = update_data.role
        
        # If changing to admin, admin_code is required
        if update_data.role == "admin":
            if not update_data.admin_code:
                raise HTTPException(status_code=400, detail="Admin code is required when setting role to admin")
            # Validate admin code format (4 digits)
            if not update_data.admin_code.isdigit() or len(update_data.admin_code) != 4:
                raise HTTPException(status_code=400, detail="Admin code must be exactly 4 digits")
            # Check if code is already in use by another user
            existing_code = await db.users.find_one({
                "admin_code": update_data.admin_code,
                "id": {"$ne": employee_id}
            })
            if existing_code:
                raise HTTPException(status_code=400, detail="This admin code is already in use")
            # Check if it's a reserved owner code
            if update_data.admin_code in ["4399", "0826"]:
                raise HTTPException(status_code=400, detail="This admin code is reserved")
            update_fields["admin_code"] = update_data.admin_code
        else:
            # If changing from admin to employee, remove admin code
            update_fields["admin_code"] = None
    
    # Allow updating admin_code separately (for existing admins)
    if update_data.admin_code is not None and update_data.role != "admin":
        current_role = update_data.role or employee.get("role")
        if current_role == "admin":
            if not update_data.admin_code.isdigit() or len(update_data.admin_code) != 4:
                raise HTTPException(status_code=400, detail="Admin code must be exactly 4 digits")
            existing_code = await db.users.find_one({
                "admin_code": update_data.admin_code,
                "id": {"$ne": employee_id}
            })
            if existing_code:
                raise HTTPException(status_code=400, detail="This admin code is already in use")
            if update_data.admin_code in ["4399", "0826"]:
                raise HTTPException(status_code=400, detail="This admin code is reserved")
            update_fields["admin_code"] = update_data.admin_code
    
    if update_data.phone is not None:
        update_fields["phone"] = update_data.phone
    
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
    """Update employee hourly rate."""
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
    """Get time entries for a specific employee."""
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
    """Get summary statistics for a specific employee."""
    from app.services.helpers import get_biweekly_period
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    settings = await db.payroll_settings.find_one({}, {"_id": 0})
    
    entries = await db.time_entries.find({
        "user_id": employee_id
    }, {"_id": 0}).to_list(500)
    
    total_hours = sum(entry.get("total_hours", 0) or 0 for entry in entries)
    total_shifts = len(entries)
    
    # Helper function to filter entries by period
    def get_entries_for_period(start, end):
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        
        period_hours = 0
        period_shifts = 0
        
        for entry in entries:
            clock_in = entry.get("clock_in", "")
            if clock_in:
                try:
                    entry_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
                    if entry_time.tzinfo is None:
                        entry_time = entry_time.replace(tzinfo=timezone.utc)
                    if start <= entry_time <= end:
                        period_hours += entry.get("total_hours", 0) or 0
                        period_shifts += 1
                except (ValueError, TypeError):
                    pass
        
        return period_hours, period_shifts, start, end
    
    # Get current period
    current_period_start, current_period_end = get_biweekly_period(period_index=0)
    current_hours, current_shifts, _, _ = get_entries_for_period(current_period_start, current_period_end)
    
    # If current period has no hours, use previous period instead
    if current_hours == 0 and current_shifts == 0:
        prev_period_start, prev_period_end = get_biweekly_period(period_index=-1)
        period_hours, period_shifts, period_start, period_end = get_entries_for_period(prev_period_start, prev_period_end)
        is_previous_period = True
    else:
        period_hours = current_hours
        period_shifts = current_shifts
        period_start = current_period_start
        period_end = current_period_end
        is_previous_period = False
    
    hourly_rate = employee.get("hourly_rate")
    if not hourly_rate:
        hourly_rate = settings.get("default_hourly_rate", 15.0) if settings else 15.0
    
    # Get YTD actual payments from payment records
    today = datetime.now(timezone.utc)
    year_start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    employee_name = employee.get("name", "")
    
    ytd_paid = 0.0
    ytd_payment_count = 0
    
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "amount": 1, "check_date": 1, "employee_name": 1}
    ).to_list(1000)
    
    for record in payment_records:
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name == employee_name.strip().lower():
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
        "period_hours": round(period_hours, 2),
        "period_shifts": period_shifts,
        "total_hours": round(total_hours, 2),
        "total_shifts": total_shifts,
        "hourly_rate": hourly_rate,
        "estimated_pay": round(period_hours * hourly_rate, 2),
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "is_previous_period": is_previous_period,
        "ytd_paid": round(ytd_paid, 2),
        "ytd_payment_count": ytd_payment_count
    }


@router.get("/summary")
async def get_admin_summary(admin: dict = Depends(get_admin_user)):
    """Get overall admin dashboard summary."""
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    entries = await db.time_entries.find({}, {"_id": 0}).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) or 0 for e in entries)
    
    user_hours = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in user_hours:
            user_hours[uid] = {"name": entry["user_name"], "hours": 0, "shifts": 0}
        user_hours[uid]["hours"] += entry.get("total_hours", 0) or 0
        user_hours[uid]["shifts"] += 1
    
    return {
        "total_employees": len(users),
        "total_hours": round(total_hours, 2),
        "total_shifts": len(entries),
        "by_employee": [{"user_id": k, **v} for k, v in user_hours.items()]
    }



# =====================================================
# EMPLOYEE PASSWORD MANAGEMENT (Admin Functions)
# =====================================================

import hashlib
import secrets

def hash_employee_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


@router.get("/employees/passwords")
async def get_all_employee_passwords(admin: dict = Depends(get_admin_user)):
    """Get all employees with their password status (for admin management)"""
    # Exclude business owners
    users = await db.users.find(
        {"email": {"$nin": OWNER_EMAILS}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1, "password_hash": 1, "password_set_at": 1, "is_locked": 1}
    ).to_list(500)
    
    result = []
    for u in users:
        # Admins use codes, not passwords
        if u.get("role") == "admin":
            result.append({
                "id": u.get("id"),
                "email": u.get("email"),
                "name": u.get("name"),
                "role": u.get("role"),
                "has_password": False,
                "uses_admin_code": True,
                "password_set_at": None,
                "is_locked": u.get("is_locked", False)
            })
        else:
            result.append({
                "id": u.get("id"),
                "email": u.get("email"),
                "name": u.get("name"),
                "role": u.get("role"),
                "has_password": bool(u.get("password_hash")),
                "uses_admin_code": False,
                "password_set_at": u.get("password_set_at"),
                "is_locked": u.get("is_locked", False)
            })
    
    return result


@router.post("/employees/{employee_id}/set-password")
async def admin_set_employee_password(employee_id: str, new_password: str, admin: dict = Depends(get_admin_user)):
    """Admin sets a password for an employee"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admins use access codes, not passwords")
    
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    password_hash = hash_employee_password(new_password)
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {
            "password_hash": password_hash,
            "password_set_at": datetime.now(timezone.utc).isoformat(),
            "password_set_by_admin": True
        }}
    )
    
    return {"success": True, "message": f"Password set for {employee.get('name', employee_id)}"}


@router.delete("/employees/{employee_id}/password")
async def admin_remove_employee_password(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Admin removes an employee's password (they'll need to set a new one)"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admins use access codes, not passwords")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$unset": {"password_hash": "", "password_set_at": "", "password_set_by_admin": ""}}
    )
    
    return {"success": True, "message": f"Password removed for {employee.get('name', employee_id)}"}
