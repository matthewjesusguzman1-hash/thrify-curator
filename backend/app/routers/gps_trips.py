"""
GPS Trip Tracking Router
Handles real-time GPS mileage tracking with trip management
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import math
import os

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/admin/gps-trips", tags=["GPS Trips"])

# IRS Standard Mileage Rates
IRS_RATES = {
    2024: 0.67,
    2025: 0.70,
    2026: 0.725,
}

def get_irs_rate(year: int = None) -> float:
    """Get the IRS mileage rate for a given year"""
    if year is None:
        year = datetime.now(timezone.utc).year
    return IRS_RATES.get(year, 0.725)


# Pydantic Models
class LocationPoint(BaseModel):
    latitude: float
    longitude: float
    timestamp: str
    accuracy: Optional[float] = None
    speed: Optional[float] = None


class TripStart(BaseModel):
    start_latitude: float
    start_longitude: float


class TripLocationUpdate(BaseModel):
    trip_id: str
    locations: List[LocationPoint]


class TripComplete(BaseModel):
    trip_id: str
    purpose: str  # "post_office", "sourcing", "other"
    notes: Optional[str] = None


class ManualTrip(BaseModel):
    date: str  # ISO date string (YYYY-MM-DD)
    total_miles: float
    purpose: str  # "post_office", "sourcing", "other"
    notes: Optional[str] = None


class TripUpdate(BaseModel):
    date: Optional[str] = None  # ISO date string (YYYY-MM-DD)
    total_miles: Optional[float] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None


class TripResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    status: str  # "active", "paused", "completed"
    purpose: Optional[str] = None
    notes: Optional[str] = None
    start_time: str
    end_time: Optional[str] = None
    total_miles: float
    tax_deduction: float
    location_count: int
    receipt_url: Optional[str] = None
    created_at: str


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance between two GPS coordinates using the Haversine formula.
    Returns distance in miles.
    """
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def calculate_trip_distance(locations: List[dict]) -> float:
    """Calculate total distance from a list of location points"""
    if len(locations) < 2:
        return 0.0
    
    total_distance = 0.0
    for i in range(1, len(locations)):
        prev = locations[i - 1]
        curr = locations[i]
        distance = haversine_distance(
            prev["latitude"], prev["longitude"],
            curr["latitude"], curr["longitude"]
        )
        # Filter out GPS jumps (unrealistic distances between consecutive points)
        # If distance is more than 0.5 miles in less than 30 seconds, likely a GPS error
        if distance < 0.5:  # Max reasonable distance between tracking points
            total_distance += distance
    
    return round(total_distance, 2)


@router.post("/start")
async def start_trip(
    trip_data: TripStart,
    admin: dict = Depends(get_admin_user)
):
    """Start a new GPS trip"""
    # Check if user already has an active trip
    active_trip = await db.gps_trips.find_one({
        "user_id": admin["email"],
        "status": {"$in": ["active", "paused"]}
    })
    
    if active_trip:
        raise HTTPException(
            status_code=400, 
            detail="You already have an active trip. Please complete it first."
        )
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["email"],
        "user_name": admin.get("name", admin["email"]),
        "status": "active",
        "purpose": None,
        "notes": None,
        "start_time": now.isoformat(),
        "end_time": None,
        "locations": [{
            "latitude": trip_data.start_latitude,
            "longitude": trip_data.start_longitude,
            "timestamp": now.isoformat(),
            "accuracy": None,
            "speed": None
        }],
        "total_miles": 0.0,
        "receipt_url": None,
        "created_at": now.isoformat()
    }
    
    await db.gps_trips.insert_one(trip_doc)
    
    return {
        "success": True,
        "trip_id": trip_id,
        "message": "Trip started",
        "start_time": now.isoformat()
    }


@router.post("/update-locations")
async def update_trip_locations(
    update_data: TripLocationUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Add new location points to an active trip"""
    trip = await db.gps_trips.find_one({
        "id": update_data.trip_id,
        "user_id": admin["email"],
        "status": {"$in": ["active", "paused"]}
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Active trip not found")
    
    # Add new locations
    new_locations = [loc.dict() for loc in update_data.locations]
    
    # Get all locations including new ones
    all_locations = trip.get("locations", []) + new_locations
    
    # Recalculate total distance
    total_miles = calculate_trip_distance(all_locations)
    
    await db.gps_trips.update_one(
        {"id": update_data.trip_id},
        {
            "$push": {"locations": {"$each": new_locations}},
            "$set": {"total_miles": total_miles}
        }
    )
    
    return {
        "success": True,
        "total_miles": total_miles,
        "location_count": len(all_locations)
    }


@router.post("/pause/{trip_id}")
async def pause_trip(
    trip_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Pause an active trip"""
    result = await db.gps_trips.update_one(
        {
            "id": trip_id,
            "user_id": admin["email"],
            "status": "active"
        },
        {"$set": {"status": "paused"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Active trip not found")
    
    return {"success": True, "message": "Trip paused"}


@router.post("/resume/{trip_id}")
async def resume_trip(
    trip_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Resume a paused trip"""
    result = await db.gps_trips.update_one(
        {
            "id": trip_id,
            "user_id": admin["email"],
            "status": "paused"
        },
        {"$set": {"status": "active"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Paused trip not found")
    
    return {"success": True, "message": "Trip resumed"}


@router.post("/complete")
async def complete_trip(
    trip_data: TripComplete,
    admin: dict = Depends(get_admin_user)
):
    """Complete a trip and save final details"""
    trip = await db.gps_trips.find_one({
        "id": trip_data.trip_id,
        "user_id": admin["email"],
        "status": {"$in": ["active", "paused"]}
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Active trip not found")
    
    now = datetime.now(timezone.utc)
    irs_rate = get_irs_rate()
    total_miles = trip.get("total_miles", 0)
    tax_deduction = round(total_miles * irs_rate, 2)
    
    await db.gps_trips.update_one(
        {"id": trip_data.trip_id},
        {
            "$set": {
                "status": "completed",
                "purpose": trip_data.purpose,
                "notes": trip_data.notes,
                "end_time": now.isoformat(),
                "tax_deduction": tax_deduction
            }
        }
    )
    
    return {
        "success": True,
        "message": "Trip completed",
        "total_miles": total_miles,
        "tax_deduction": tax_deduction
    }


@router.post("/upload-receipt/{trip_id}")
async def upload_receipt(
    trip_id: str,
    receipt: UploadFile = File(...),
    admin: dict = Depends(get_admin_user)
):
    """Upload a receipt image for a trip"""
    trip = await db.gps_trips.find_one({
        "id": trip_id,
        "user_id": admin["email"]
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/receipts"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save the file
    file_ext = os.path.splitext(receipt.filename)[1] or ".jpg"
    filename = f"{trip_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    content = await receipt.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update trip with receipt URL
    receipt_url = f"/api/admin/gps-trips/receipt/{filename}"
    await db.gps_trips.update_one(
        {"id": trip_id},
        {"$set": {"receipt_url": receipt_url}}
    )
    
    return {"success": True, "receipt_url": receipt_url}


@router.get("/receipt/{filename}")
async def get_receipt(filename: str):
    """Serve a receipt image"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/backend/uploads/receipts/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    return FileResponse(file_path)


@router.get("/trip/{trip_id}")
async def get_trip_details(
    trip_id: str,
    include_locations: bool = True,
    admin: dict = Depends(get_admin_user)
):
    """Get a single trip with optional location data for map display"""
    projection = {"_id": 0}
    if not include_locations:
        projection["locations"] = 0
    
    trip = await db.gps_trips.find_one(
        {
            "id": trip_id,
            "user_id": admin["email"]
        },
        projection
    )
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    irs_rate = get_irs_rate()
    
    return {
        "trip": {
            **trip,
            "location_count": len(trip.get("locations", [])),
            "tax_deduction": round(trip.get("total_miles", 0) * irs_rate, 2)
        }
    }


@router.get("/active")
async def get_active_trip(admin: dict = Depends(get_admin_user)):
    """Get the current active or paused trip"""
    trip = await db.gps_trips.find_one(
        {
            "user_id": admin["email"],
            "status": {"$in": ["active", "paused"]}
        },
        {"_id": 0, "locations": 0}  # Exclude locations for smaller response
    )
    
    if not trip:
        return {"active_trip": None}
    
    # Get location count separately
    full_trip = await db.gps_trips.find_one({"id": trip["id"]})
    location_count = len(full_trip.get("locations", []))
    
    return {
        "active_trip": {
            **trip,
            "location_count": location_count,
            "tax_deduction": round(trip.get("total_miles", 0) * get_irs_rate(), 2)
        }
    }


@router.get("/history")
async def get_trip_history(
    limit: int = 50,
    year: Optional[int] = None,
    month: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get completed trip history with optional date filtering"""
    query = {
        "user_id": admin["email"],
        "status": "completed"
    }
    
    # Add date filters if provided
    if year:
        start_date = datetime(year, month or 1, 1, tzinfo=timezone.utc)
        if month:
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        
        query["start_time"] = {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    
    trips = await db.gps_trips.find(
        query, 
        {"_id": 0, "locations": 0}
    ).sort("start_time", -1).to_list(limit)
    
    irs_rate = get_irs_rate(year or datetime.now(timezone.utc).year)
    
    result = []
    for trip in trips:
        full_trip = await db.gps_trips.find_one({"id": trip["id"]})
        result.append({
            **trip,
            "location_count": len(full_trip.get("locations", [])),
            "tax_deduction": round(trip.get("total_miles", 0) * irs_rate, 2)
        })
    
    return {"trips": result}


@router.get("/summary")
async def get_mileage_summary(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get mileage summary for IRS purposes"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    
    trips = await db.gps_trips.find({
        "user_id": admin["email"],
        "status": "completed",
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0, "locations": 0}).to_list(1000)
    
    irs_rate = get_irs_rate(year)
    
    # Calculate totals
    total_miles = sum(t.get("total_miles", 0) for t in trips)
    total_trips = len(trips)
    
    # Calculate by purpose
    by_purpose = {}
    for trip in trips:
        purpose = trip.get("purpose", "other")
        if purpose not in by_purpose:
            by_purpose[purpose] = {"trips": 0, "miles": 0}
        by_purpose[purpose]["trips"] += 1
        by_purpose[purpose]["miles"] += trip.get("total_miles", 0)
    
    # Calculate monthly breakdown
    monthly = {}
    for trip in trips:
        start_time = datetime.fromisoformat(trip["start_time"].replace("Z", "+00:00"))
        month_key = start_time.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = {"trips": 0, "miles": 0}
        monthly[month_key]["trips"] += 1
        monthly[month_key]["miles"] += trip.get("total_miles", 0)
    
    return {
        "year": year,
        "irs_rate": irs_rate,
        "total_miles": round(total_miles, 2),
        "total_trips": total_trips,
        "tax_deduction": round(total_miles * irs_rate, 2),
        "by_purpose": by_purpose,
        "monthly": monthly
    }


@router.put("/{trip_id}")
async def update_trip(
    trip_id: str,
    trip_data: TripUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a completed trip's details"""
    trip = await db.gps_trips.find_one({
        "id": trip_id,
        "user_id": admin["email"]
    })
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_fields = {}
    
    # Update date if provided
    if trip_data.date:
        try:
            trip_date = datetime.strptime(trip_data.date, "%Y-%m-%d")
            trip_date = trip_date.replace(tzinfo=timezone.utc)
            update_fields["start_time"] = trip_date.isoformat()
            # Also update end_time for manual trips
            if trip.get("is_manual"):
                update_fields["end_time"] = trip_date.isoformat()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Update miles if provided
    if trip_data.total_miles is not None:
        if trip_data.total_miles <= 0:
            raise HTTPException(status_code=400, detail="Miles must be greater than 0")
        if trip_data.total_miles > 1000:
            raise HTTPException(status_code=400, detail="Miles seems too high. Please verify.")
        
        update_fields["total_miles"] = round(trip_data.total_miles, 2)
        
        # Recalculate tax deduction
        irs_rate = get_irs_rate()
        update_fields["tax_deduction"] = round(trip_data.total_miles * irs_rate, 2)
    
    # Update purpose if provided
    if trip_data.purpose:
        update_fields["purpose"] = trip_data.purpose
    
    # Update notes
    if trip_data.notes is not None:
        update_fields["notes"] = trip_data.notes if trip_data.notes else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.gps_trips.update_one(
        {"id": trip_id},
        {"$set": update_fields}
    )
    
    return {
        "success": True,
        "message": "Trip updated successfully",
        "updated_fields": list(update_fields.keys())
    }


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a trip"""
    result = await db.gps_trips.delete_one({
        "id": trip_id,
        "user_id": admin["email"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {"success": True, "message": "Trip deleted"}


@router.post("/manual")
async def create_manual_trip(
    trip_data: ManualTrip,
    admin: dict = Depends(get_admin_user)
):
    """Create a manually entered trip (without GPS tracking)"""
    try:
        # Parse the date
        trip_date = datetime.strptime(trip_data.date, "%Y-%m-%d")
        trip_date = trip_date.replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if trip_data.total_miles <= 0:
        raise HTTPException(status_code=400, detail="Miles must be greater than 0")
    
    if trip_data.total_miles > 1000:
        raise HTTPException(status_code=400, detail="Miles seems too high. Please verify.")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    irs_rate = get_irs_rate(trip_date.year)
    tax_deduction = round(trip_data.total_miles * irs_rate, 2)
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["email"],
        "user_name": admin.get("name", admin["email"]),
        "status": "completed",
        "purpose": trip_data.purpose,
        "notes": trip_data.notes,
        "start_time": trip_date.isoformat(),
        "end_time": trip_date.isoformat(),
        "locations": [],  # No GPS locations for manual entry
        "total_miles": round(trip_data.total_miles, 2),
        "tax_deduction": tax_deduction,
        "receipt_url": None,
        "is_manual": True,  # Flag to identify manual entries
        "created_at": now.isoformat()
    }
    
    await db.gps_trips.insert_one(trip_doc)
    
    return {
        "success": True,
        "trip_id": trip_id,
        "total_miles": round(trip_data.total_miles, 2),
        "tax_deduction": tax_deduction,
        "message": "Manual trip logged successfully"
    }
