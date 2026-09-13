"""Training assignments — assign training modules to employees by name."""

from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import db
from app.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/training-assignments", tags=["training-assignments"])


@router.get("/")
async def list_assignments(admin: dict = Depends(get_admin_user)):
    """List all training assignments (admin view)."""
    docs = await db.training_assignments.find({}, {"_id": 0}).sort("assigned_at", -1).to_list(200)
    return {"assignments": docs}


@router.post("/")
async def assign_training(
    employee_id: str = Body(...),
    training_type: str = Body(...),  # "photography" or "listing"
    admin: dict = Depends(get_admin_user),
):
    """Assign a training module to an employee."""
    # Verify employee exists
    emp = await db.users.find_one({"id": employee_id}, {"_id": 0, "id": 1, "name": 1})
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Check if already assigned
    existing = await db.training_assignments.find_one({
        "employee_id": employee_id,
        "training_type": training_type,
    })
    if existing:
        raise HTTPException(400, f"{training_type.title()} training already assigned to this employee")

    doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "employee_name": emp["name"],
        "training_type": training_type,
        "assigned_by": admin.get("name", admin.get("email", "")),
        "assigned_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.training_assignments.insert_one(doc)
    return {"assignment": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/{assignment_id}")
async def remove_assignment(assignment_id: str, admin: dict = Depends(get_admin_user)):
    """Remove a training assignment."""
    result = await db.training_assignments.delete_one({"id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Assignment not found")
    return {"ok": True}


@router.get("/my")
async def my_assignments(user: dict = Depends(get_current_user)):
    """Get training assignments for the current user."""
    docs = await db.training_assignments.find(
        {"employee_id": user["id"]}, {"_id": 0}
    ).to_list(20)
    return {"assignments": docs}


@router.get("/employees")
async def list_employees_for_assignment(admin: dict = Depends(get_admin_user)):
    """List employees available for training assignment."""
    employees = await db.users.find(
        {"role": {"$in": ["employee", "admin"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "is_remote_worker": 1}
    ).to_list(100)
    return {"employees": employees}
