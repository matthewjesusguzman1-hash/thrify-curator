from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.mileage import (
    MileageEntryCreate, MileageEntryUpdate, MileageEntryResponse,
    StartTripRequest, EndTripRequest, UpdateTripLocationRequest,
    ActiveTripResponse, MileageSummary, LocationData
)

router = APIRouter(prefix="/admin/mileage", tags=["Mileage Tracking"])


@router.get("/entries", response_model=List[MileageEntryResponse])
async def get_mileage_entries(
    year: Optional[int] = None,
    month: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all mileage entries, optionally filtered by year/month"""
    query = {}
    
    if year:
        if month:
            # Filter by specific month
            start_date = f"{year}-{month:02d}-01"
            if month == 12:
                end_date = f"{year + 1}-01-01"
            else:
                end_date = f"{year}-{month + 1:02d}-01"
            query["date"] = {"$gte": start_date, "$lt": end_date}
        else:
            # Filter by year
            query["date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [MileageEntryResponse(**entry) for entry in entries]


@router.post("/entries", response_model=MileageEntryResponse)
async def create_mileage_entry(entry: MileageEntryCreate, admin: dict = Depends(get_admin_user)):
    """Create a manual mileage entry"""
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin["name"],
        "date": entry.date,
        "start_location": entry.start_location.model_dump() if entry.start_location else None,
        "end_location": entry.end_location.model_dump() if entry.end_location else None,
        "start_address": entry.start_address,
        "end_address": entry.end_address,
        "total_miles": entry.total_miles,
        "purpose": entry.purpose.value,
        "purpose_other": entry.purpose_other if entry.purpose == "other" else None,
        "notes": entry.notes,
        "is_tracking": False,
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    return MileageEntryResponse(**entry_doc)


@router.put("/entries/{entry_id}", response_model=MileageEntryResponse)
async def update_mileage_entry(
    entry_id: str,
    update_data: MileageEntryUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update an existing mileage entry"""
    entry = await db.mileage_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Mileage entry not found")
    
    update_fields = {}
    if update_data.date is not None:
        update_fields["date"] = update_data.date
    if update_data.start_address is not None:
        update_fields["start_address"] = update_data.start_address
    if update_data.end_address is not None:
        update_fields["end_address"] = update_data.end_address
    if update_data.total_miles is not None:
        update_fields["total_miles"] = update_data.total_miles
    if update_data.purpose is not None:
        update_fields["purpose"] = update_data.purpose.value
    if update_data.purpose_other is not None:
        update_fields["purpose_other"] = update_data.purpose_other
    if update_data.notes is not None:
        update_fields["notes"] = update_data.notes
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.mileage_entries.update_one({"id": entry_id}, {"$set": update_fields})
    
    updated_entry = await db.mileage_entries.find_one({"id": entry_id}, {"_id": 0})
    return MileageEntryResponse(**updated_entry)


@router.delete("/entries/{entry_id}")
async def delete_mileage_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a mileage entry"""
    result = await db.mileage_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mileage entry not found")
    return {"message": "Entry deleted successfully"}


@router.get("/active-trip", response_model=Optional[ActiveTripResponse])
async def get_active_trip(admin: dict = Depends(get_admin_user)):
    """Get the currently active trip for the admin user"""
    trip = await db.active_trips.find_one({"user_id": admin["id"]}, {"_id": 0})
    if trip:
        return ActiveTripResponse(**trip)
    return None


@router.post("/start-trip", response_model=ActiveTripResponse)
async def start_trip(trip_data: StartTripRequest, admin: dict = Depends(get_admin_user)):
    """Start tracking a new trip"""
    # Check if there's already an active trip
    existing = await db.active_trips.find_one({"user_id": admin["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active trip. Please end it first.")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["id"],
        "start_location": trip_data.start_location.model_dump(),
        "start_address": trip_data.start_address,
        "start_time": now,
        "waypoints": []
    }
    
    await db.active_trips.insert_one(trip_doc)
    return ActiveTripResponse(**trip_doc)


@router.post("/update-location")
async def update_trip_location(location_data: UpdateTripLocationRequest, admin: dict = Depends(get_admin_user)):
    """Add a waypoint to the active trip"""
    trip = await db.active_trips.find_one({"user_id": admin["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    waypoint = location_data.location.model_dump()
    waypoint["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"user_id": admin["id"]},
        {"$push": {"waypoints": waypoint}}
    )
    
    return {"message": "Location updated"}


@router.post("/end-trip", response_model=MileageEntryResponse)
async def end_trip(trip_data: EndTripRequest, admin: dict = Depends(get_admin_user)):
    """End the active trip and save it as a mileage entry"""
    trip = await db.active_trips.find_one({"user_id": admin["id"]}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin["name"],
        "date": today,
        "start_location": trip["start_location"],
        "end_location": trip_data.end_location.model_dump(),
        "start_address": trip.get("start_address"),
        "end_address": trip_data.end_address,
        "total_miles": trip_data.total_miles,
        "purpose": trip_data.purpose.value,
        "purpose_other": trip_data.purpose_other if trip_data.purpose == "other" else None,
        "notes": trip_data.notes,
        "is_tracking": False,
        "waypoints": trip.get("waypoints", []),
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    await db.active_trips.delete_one({"user_id": admin["id"]})
    
    return MileageEntryResponse(**entry_doc)


@router.post("/cancel-trip")
async def cancel_trip(admin: dict = Depends(get_admin_user)):
    """Cancel the active trip without saving"""
    result = await db.active_trips.delete_one({"user_id": admin["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No active trip found")
    return {"message": "Trip cancelled"}


@router.get("/summary", response_model=MileageSummary)
async def get_mileage_summary(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get mileage summary for tax purposes"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    entries = await db.mileage_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_miles = sum(e.get("total_miles", 0) for e in entries)
    total_trips = len(entries)
    
    # Group by purpose
    by_purpose = {}
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose not in by_purpose:
            by_purpose[purpose] = {"miles": 0, "trips": 0}
        by_purpose[purpose]["miles"] += entry.get("total_miles", 0)
        by_purpose[purpose]["trips"] += 1
    
    # Group by month
    monthly_totals = {}
    for entry in entries:
        month = entry.get("date", "")[:7]  # YYYY-MM
        if month not in monthly_totals:
            monthly_totals[month] = {"miles": 0, "trips": 0}
        monthly_totals[month]["miles"] += entry.get("total_miles", 0)
        monthly_totals[month]["trips"] += 1
    
    return MileageSummary(
        total_miles=round(total_miles, 2),
        total_trips=total_trips,
        by_purpose=by_purpose,
        monthly_totals=monthly_totals
    )
