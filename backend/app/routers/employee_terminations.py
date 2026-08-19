"""
Employee Termination Router
Handles the firing/termination process with proper documentation and history
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/api/employee-terminations", tags=["employee-terminations"])


class TerminationRequest(BaseModel):
    employee_id: str
    reason: str  # Resignation, Performance, Misconduct, Layoff, Other
    reason_details: Optional[str] = ""
    final_pay_date: Optional[str] = None
    notes: Optional[str] = ""


class TerminationResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    employee_email: str
    reason: str
    reason_details: Optional[str]
    final_pay_date: Optional[str]
    notes: Optional[str]
    terminated_at: str
    terminated_by: str


@router.post("/terminate", response_model=TerminationResponse)
async def terminate_employee(
    request: TerminationRequest,
    admin: dict = Depends(get_admin_user)
):
    """Terminate an employee with proper documentation"""
    
    # Find the employee
    employee = await db.users.find_one({"id": request.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Prevent terminating business owners
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    if employee.get("email", "").lower() in [e.lower() for e in OWNER_EMAILS]:
        raise HTTPException(status_code=403, detail="Cannot terminate business owner accounts")
    
    # Prevent terminating yourself
    if employee.get("id") == admin.get("id"):
        raise HTTPException(status_code=400, detail="Cannot terminate your own account")
    
    # Create termination record
    termination_id = str(uuid.uuid4())
    termination_doc = {
        "id": termination_id,
        "employee_id": request.employee_id,
        "employee_name": employee.get("name", "Unknown"),
        "employee_email": employee.get("email", ""),
        "employee_phone": employee.get("phone", ""),
        "employee_role": employee.get("role", "employee"),
        "employee_hourly_rate": employee.get("hourly_rate"),
        "reason": request.reason,
        "reason_details": request.reason_details,
        "final_pay_date": request.final_pay_date,
        "notes": request.notes,
        "terminated_at": datetime.now(timezone.utc).isoformat(),
        "terminated_by": admin.get("email", "admin"),
        "terminated_by_name": admin.get("name", "Admin")
    }
    
    # Store termination record
    await db.employee_terminations.insert_one(termination_doc)
    
    # Mark employee as terminated instead of deleting
    # This preserves their data for payroll/tax purposes
    await db.users.update_one(
        {"id": request.employee_id},
        {"$set": {
            "status": "terminated",
            "terminated_at": termination_doc["terminated_at"],
            "termination_id": termination_id
        }}
    )
    
    return TerminationResponse(
        id=termination_id,
        employee_id=request.employee_id,
        employee_name=employee.get("name", "Unknown"),
        employee_email=employee.get("email", ""),
        reason=request.reason,
        reason_details=request.reason_details,
        final_pay_date=request.final_pay_date,
        notes=request.notes,
        terminated_at=termination_doc["terminated_at"],
        terminated_by=admin.get("email", "admin")
    )


@router.get("/history", response_model=List[TerminationResponse])
async def get_termination_history(
    admin: dict = Depends(get_admin_user)
):
    """Get all terminated employees"""
    terminations = await db.employee_terminations.find(
        {},
        {"_id": 0}
    ).sort("terminated_at", -1).to_list(100)
    
    return [TerminationResponse(**t) for t in terminations]


@router.get("/{termination_id}")
async def get_termination_detail(
    termination_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get details of a specific termination"""
    termination = await db.employee_terminations.find_one(
        {"id": termination_id},
        {"_id": 0}
    )
    
    if not termination:
        raise HTTPException(status_code=404, detail="Termination record not found")
    
    # Get any related time entries for final pay calculation
    time_entries = await db.time_entries.find(
        {"user_id": termination["employee_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    return {
        "termination": termination,
        "recent_time_entries": time_entries[:10]
    }


@router.delete("/{termination_id}")
async def delete_termination_record(
    termination_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a termination record (rehire scenario)"""
    termination = await db.employee_terminations.find_one({"id": termination_id})
    
    if not termination:
        raise HTTPException(status_code=404, detail="Termination record not found")
    
    # Remove termination record
    await db.employee_terminations.delete_one({"id": termination_id})
    
    # Restore employee status if they still exist
    await db.users.update_one(
        {"id": termination["employee_id"]},
        {"$unset": {"status": "", "terminated_at": "", "termination_id": ""}}
    )
    
    return {"message": "Termination record deleted. Employee can be rehired."}


@router.patch("/{termination_id}/notes")
async def update_termination_notes(
    termination_id: str,
    notes: str,
    admin: dict = Depends(get_admin_user)
):
    """Update notes on a termination record"""
    result = await db.employee_terminations.update_one(
        {"id": termination_id},
        {"$set": {
            "notes": notes,
            "notes_updated_at": datetime.now(timezone.utc).isoformat(),
            "notes_updated_by": admin.get("email")
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Termination record not found")
    
    return {"message": "Notes updated"}
