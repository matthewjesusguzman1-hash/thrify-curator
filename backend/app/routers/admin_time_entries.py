"""Time entry management routes for admin dashboard."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.time_entry import TimeEntry, EditTimeEntryRequest, CreateTimeEntryRequest
from app.services.time_helpers import round_to_nearest_minute

router = APIRouter(prefix="/admin", tags=["Admin - Time Entries"])


@router.get("/time-entries", response_model=List[TimeEntry])
async def get_all_time_entries(admin: dict = Depends(get_admin_user)):
    """Get all time entries."""
    entries = await db.time_entries.find({}, {"_id": 0}).sort("clock_in", -1).to_list(500)
    return entries


@router.get("/clocked-in-employees")
async def get_clocked_in_employees(admin: dict = Depends(get_admin_user)):
    """Get all currently clocked-in employees with their clock-in times."""
    clocked_in = await db.time_entries.find(
        {"clock_out": None},
        {"user_id": 1, "user_name": 1, "clock_in": 1, "last_clock_in": 1, "_id": 0}
    ).to_list(100)
    
    employees = []
    for entry in clocked_in:
        clock_in_time = entry.get("last_clock_in") or entry.get("clock_in")
        employees.append({
            "user_id": entry.get("user_id"),
            "name": entry.get("user_name", "Unknown"),
            "clock_in_time": clock_in_time
        })
    
    return {"employees": employees, "count": len(employees)}


@router.get("/time-entries/{entry_id}")
async def get_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific time entry."""
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return entry


@router.put("/time-entries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: EditTimeEntryRequest, admin: dict = Depends(get_admin_user)):
    """Update a time entry."""
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
    
    if update_data.total_hours is not None:
        update_fields["total_hours"] = update_data.total_hours
        update_fields["adjusted_by_admin"] = True
    elif clock_in and clock_out and (update_data.clock_in or update_data.clock_out):
        try:
            in_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
            out_time = datetime.fromisoformat(clock_out.replace('Z', '+00:00'))
            total_seconds = (out_time - in_time).total_seconds()
            calculated_hours = round_to_nearest_minute(total_seconds)
            update_fields["total_hours"] = calculated_hours
            update_fields["adjusted_by_admin"] = False
        except ValueError:
            pass
    
    if update_data.admin_note is not None:
        update_fields["admin_note"] = update_data.admin_note if update_data.admin_note.strip() else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.time_entries.update_one({"id": entry_id}, {"$set": update_fields})
    
    updated_entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    return updated_entry


@router.delete("/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a time entry."""
    result = await db.time_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return {"message": "Time entry deleted"}


@router.post("/employee/{employee_id}/clock")
async def admin_clock_employee(employee_id: str, action: dict, admin: dict = Depends(get_admin_user)):
    """Admin endpoint to clock in/out an employee."""
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
        active = await db.time_entries.find_one(
            {"user_id": employee_id, "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Employee is already clocked in")
        
        employee_display_name = "Administrator" if employee.get("role") == "admin" else employee["name"]
        admin_display_name = "Administrator" if admin.get("role") == "admin" else admin["name"]
        
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
        active = await db.time_entries.find_one(
            {"user_id": employee_id, "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Employee is not clocked in")
        
        last_clock_in = active.get("last_clock_in") or active.get("clock_in")
        accumulated_hours = active.get("accumulated_hours", 0.0)
        
        try:
            in_time = datetime.fromisoformat(last_clock_in.replace('Z', '+00:00'))
            session_seconds = (now - in_time).total_seconds()
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
        
        # Create clock-out notification
        notification = {
            "id": str(uuid.uuid4()),
            "type": "clock_out",
            "user_id": employee_id,
            "user_name": employee["name"],
            "message": f"{employee['name']} clocked out by {admin.get('name', 'Admin')}",
            "details": {
                "total_hours": total_hours,
                "clocked_out_by_admin": True,
                "admin_name": admin.get("name", "Admin")
            },
            "created_at": now_iso,
            "read": False
        }
        await db.admin_notifications.insert_one(notification)
        
        # Send push notification to admin devices
        try:
            from app.services.apns_service import send_admin_push_notification
            await send_admin_push_notification(
                title=f"{employee['name']} Clocked Out",
                body=f"Clocked out by {admin.get('name', 'Admin')} - {total_hours:.2f} hours",
                notification_type="clock_out"
            )
        except Exception as e:
            print(f"Failed to send admin push: {e}")
        
        # End employee's Live Activity via push
        try:
            from app.services.apns_service import end_employee_live_activity
            await end_employee_live_activity(employee_id, total_hours)
        except Exception as e:
            print(f"Failed to end employee Live Activity: {e}")
        
        # Update admin Live Activities to remove this employee
        try:
            from app.services.apns_service import update_admin_live_activities
            await update_admin_live_activities()
        except Exception as e:
            print(f"Failed to update admin Live Activities: {e}")
        
        return {
            "message": f"Clocked out {employee['name']}",
            "action": "out",
            "timestamp": now_iso,
            "employee_name": employee["name"],
            "total_hours": total_hours
        }


@router.get("/employee/{employee_id}/clock-status")
async def get_employee_clock_status(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get current clock status for an employee."""
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
    """Create a new time entry manually."""
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
            total_seconds = (clock_out_dt - clock_in_dt).total_seconds()
            total_hours = round_to_nearest_minute(total_seconds)
            
            if total_hours < 0:
                raise HTTPException(status_code=400, detail="Clock out must be after clock in")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
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
