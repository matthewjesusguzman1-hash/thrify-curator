from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import calendar

from app.database import db
from app.dependencies import get_admin_user
from app.models.monthly_mileage import (
    MonthlyMileageCreate, MonthlyMileageUpdate, MonthlyMileageResponse,
    YearlySummary, ReminderStatus, DismissReminderRequest,
    IRS_MILEAGE_RATE_2026
)

router = APIRouter(prefix="/admin/mileage", tags=["Monthly Mileage"])

# IRS rates by year
IRS_RATES = {
    2024: 0.67,
    2025: 0.70,
    2026: 0.725,
}

def get_irs_rate(year: int) -> float:
    """Get the IRS mileage rate for a given year"""
    return IRS_RATES.get(year, IRS_MILEAGE_RATE_2026)

def get_month_name(month: int) -> str:
    """Get month name from month number"""
    return calendar.month_name[month]


@router.get("/monthly-entries", response_model=List[MonthlyMileageResponse])
async def get_monthly_entries(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all monthly mileage entries, optionally filtered by year"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    query = {"year": year}
    entries = await db.monthly_mileage.find(query, {"_id": 0}).sort("month", 1).to_list(100)
    
    irs_rate = get_irs_rate(year)
    
    result = []
    for entry in entries:
        result.append(MonthlyMileageResponse(
            id=entry["id"],
            user_id=entry["user_id"],
            user_name=entry.get("user_name", "Unknown"),
            year=entry["year"],
            month=entry["month"],
            month_name=get_month_name(entry["month"]),
            total_miles=entry["total_miles"],
            tax_deduction=round(entry["total_miles"] * irs_rate, 2),
            notes=entry.get("notes"),
            created_at=entry["created_at"],
            updated_at=entry.get("updated_at")
        ))
    
    return result


@router.post("/monthly-entry", response_model=MonthlyMileageResponse)
async def create_or_update_monthly_entry(
    entry_data: MonthlyMileageCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create or update a monthly mileage entry"""
    # Check if entry already exists for this month/year
    existing = await db.monthly_mileage.find_one(
        {"year": entry_data.year, "month": entry_data.month},
        {"_id": 0}
    )
    
    admin_code = admin.get("admin_code")
    admin_name = "Matthew Guzman" if admin_code == "4399" else "Eunice Guzman" if admin_code == "0826" else "Admin"
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing entry
        await db.monthly_mileage.update_one(
            {"id": existing["id"]},
            {"$set": {
                "total_miles": entry_data.total_miles,
                "notes": entry_data.notes,
                "updated_at": now
            }}
        )
        entry_id = existing["id"]
        created_at = existing["created_at"]
    else:
        # Create new entry
        entry_id = str(uuid.uuid4())
        created_at = now
        
        entry_doc = {
            "id": entry_id,
            "user_id": admin["id"],
            "user_name": admin_name,
            "year": entry_data.year,
            "month": entry_data.month,
            "total_miles": entry_data.total_miles,
            "notes": entry_data.notes,
            "created_at": created_at,
            "updated_at": None
        }
        await db.monthly_mileage.insert_one(entry_doc)
    
    # Also clear any dismissed reminder for this month
    await db.mileage_reminders.delete_one({
        "year": entry_data.year,
        "month": entry_data.month
    })
    
    irs_rate = get_irs_rate(entry_data.year)
    
    return MonthlyMileageResponse(
        id=entry_id,
        user_id=admin["id"],
        user_name=admin_name,
        year=entry_data.year,
        month=entry_data.month,
        month_name=get_month_name(entry_data.month),
        total_miles=entry_data.total_miles,
        tax_deduction=round(entry_data.total_miles * irs_rate, 2),
        notes=entry_data.notes,
        created_at=created_at,
        updated_at=now if existing else None
    )


@router.delete("/monthly-entry/{entry_id}")
async def delete_monthly_entry(
    entry_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a monthly mileage entry"""
    result = await db.monthly_mileage.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"message": "Entry deleted successfully"}


@router.get("/yearly-summary", response_model=YearlySummary)
async def get_yearly_summary(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get yearly mileage summary with tax deduction calculation"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    entries = await db.monthly_mileage.find(
        {"year": year},
        {"_id": 0}
    ).sort("month", 1).to_list(100)
    
    irs_rate = get_irs_rate(year)
    
    # Calculate totals
    total_miles = sum(e.get("total_miles", 0) for e in entries)
    months_entered = [e["month"] for e in entries]
    
    # Determine which months are missing
    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year
    
    # Only include months up to current month if it's the current year
    max_month = current_month if year == current_year else 12
    months_missing = [m for m in range(1, max_month + 1) if m not in months_entered]
    
    # Build response entries
    monthly_entries = []
    for entry in entries:
        monthly_entries.append(MonthlyMileageResponse(
            id=entry["id"],
            user_id=entry["user_id"],
            user_name=entry.get("user_name", "Unknown"),
            year=entry["year"],
            month=entry["month"],
            month_name=get_month_name(entry["month"]),
            total_miles=entry["total_miles"],
            tax_deduction=round(entry["total_miles"] * irs_rate, 2),
            notes=entry.get("notes"),
            created_at=entry["created_at"],
            updated_at=entry.get("updated_at")
        ))
    
    return YearlySummary(
        year=year,
        total_miles=round(total_miles, 2),
        total_tax_deduction=round(total_miles * irs_rate, 2),
        irs_rate=irs_rate,
        monthly_entries=monthly_entries,
        months_entered=len(months_entered),
        months_missing=months_missing
    )


@router.get("/reminder-status", response_model=ReminderStatus)
async def get_reminder_status(
    admin: dict = Depends(get_admin_user)
):
    """Check if there's a pending mileage entry reminder for the previous month"""
    now = datetime.now(timezone.utc)
    
    # Calculate previous month
    if now.month == 1:
        prev_month = 12
        prev_year = now.year - 1
    else:
        prev_month = now.month - 1
        prev_year = now.year
    
    # Check if entry exists for previous month
    entry = await db.monthly_mileage.find_one(
        {"year": prev_year, "month": prev_month},
        {"_id": 0}
    )
    
    # Check if reminder was dismissed
    dismissed = await db.mileage_reminders.find_one(
        {"year": prev_year, "month": prev_month, "dismissed": True},
        {"_id": 0}
    )
    
    # Calculate days overdue (days since 1st of current month)
    days_overdue = now.day - 1
    
    return ReminderStatus(
        year=prev_year,
        month=prev_month,
        month_name=get_month_name(prev_month),
        is_entered=entry is not None,
        is_dismissed=dismissed is not None,
        days_overdue=days_overdue
    )


@router.post("/dismiss-reminder")
async def dismiss_reminder(
    request: DismissReminderRequest,
    admin: dict = Depends(get_admin_user)
):
    """Dismiss the mileage reminder for a specific month"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already dismissed
    existing = await db.mileage_reminders.find_one(
        {"year": request.year, "month": request.month},
        {"_id": 0}
    )
    
    if existing:
        await db.mileage_reminders.update_one(
            {"year": request.year, "month": request.month},
            {"$set": {"dismissed": True, "dismissed_at": now}}
        )
    else:
        await db.mileage_reminders.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": admin["id"],
            "year": request.year,
            "month": request.month,
            "dismissed": True,
            "dismissed_at": now
        })
    
    return {
        "message": f"Reminder dismissed for {get_month_name(request.month)} {request.year}",
        "year": request.year,
        "month": request.month
    }


@router.get("/pending-months")
async def get_pending_months(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get list of months that haven't been entered yet for the year"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    now = datetime.now(timezone.utc)
    
    # Get all entered months
    entries = await db.monthly_mileage.find(
        {"year": year},
        {"_id": 0, "month": 1}
    ).to_list(100)
    
    entered_months = [e["month"] for e in entries]
    
    # Get dismissed reminders
    dismissed = await db.mileage_reminders.find(
        {"year": year, "dismissed": True},
        {"_id": 0, "month": 1}
    ).to_list(100)
    
    dismissed_months = [d["month"] for d in dismissed]
    
    # Calculate which months are pending
    max_month = now.month - 1 if year == now.year else 12  # Previous months only
    
    pending = []
    for month in range(1, max_month + 1):
        if month not in entered_months and month not in dismissed_months:
            pending.append({
                "year": year,
                "month": month,
                "month_name": get_month_name(month)
            })
    
    return {
        "year": year,
        "pending_months": pending,
        "count": len(pending)
    }
