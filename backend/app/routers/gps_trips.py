"""
GPS Trip Tracking & Mileage Router
Handles Bluetooth-triggered mileage tracking, road routing, reverse geocoding,
manual trips, IRS summaries, and CSV export.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import math
import os
import io
import csv
import httpx
import logging

from app.database import db
from app.dependencies import get_admin_user

logger = logging.getLogger(__name__)

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


# ========== OSRM & Nominatim Helpers ==========

OSRM_BASE = "https://router.project-osrm.org"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
HTTP_HEADERS = {"User-Agent": "ThriftyCurator/1.0"}


async def get_road_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
    """Get driving distance in miles between two points using OSRM."""
    url = f"{OSRM_BASE}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=HTTP_HEADERS)
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                meters = data["routes"][0]["distance"]
                return round(meters / 1609.344, 2)
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}")
    return None


async def reverse_geocode(lat: float, lon: float) -> str:
    """Convert coordinates to a street address using Nominatim."""
    url = f"{NOMINATIM_BASE}/reverse?format=json&lat={lat}&lon={lon}&addressdetails=1"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=HTTP_HEADERS)
            data = resp.json()
            addr = data.get("address", {})
            # Build a concise address
            parts = []
            house = addr.get("house_number", "")
            road = addr.get("road", "")
            if house and road:
                parts.append(f"{house} {road}")
            elif road:
                parts.append(road)
            city = addr.get("city") or addr.get("town") or addr.get("village") or ""
            state = addr.get("state", "")
            if city:
                parts.append(city)
            if state:
                parts.append(state)
            if parts:
                return ", ".join(parts)
            return data.get("display_name", f"{lat}, {lon}")
    except Exception as e:
        logger.warning(f"Nominatim reverse geocode failed: {e}")
    return f"{lat:.5f}, {lon:.5f}"


# ========== New Pydantic Models ==========

class LogDrivePayload(BaseModel):
    latitude: float
    longitude: float
    timestamp: Optional[str] = None
    event: str = "ping"  # "start", "end", or "ping" (auto-detect)


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


# ========== Bluetooth Log-Drive Endpoint ==========

@router.post("/log-drive")
async def log_drive(
    payload: LogDrivePayload,
    admin: dict = Depends(get_admin_user),
):
    """
    Accept a GPS ping from a phone automation (e.g. iPhone Shortcuts on Bluetooth connect/disconnect).
    - event='start' or first ping: saves start location as pending trip
    - event='end' or second ping: completes the trip with OSRM road distance + reverse geocoding
    """
    now = datetime.now(timezone.utc)
    ts = payload.timestamp or now.isoformat()
    user_id = admin["email"]
    event = payload.event.lower()

    # Check for a pending (active) trip
    pending = await db.gps_trips.find_one({
        "user_id": user_id,
        "status": "active",
        "is_bluetooth": True,
    })

    if event == "start" or (event == "ping" and not pending):
        # Start a new trip
        if pending:
            # Auto-complete stale pending trip (older than 12 hours)
            start_time = datetime.fromisoformat(pending["start_time"].replace("Z", "+00:00"))
            if (now - start_time) > timedelta(hours=12):
                await db.gps_trips.update_one({"id": pending["id"]}, {"$set": {"status": "cancelled"}})
            else:
                return {
                    "success": False,
                    "message": "Trip already in progress. Send event='end' to complete it.",
                    "pending_trip_id": pending["id"],
                }

        trip_id = str(uuid.uuid4())
        start_address = await reverse_geocode(payload.latitude, payload.longitude)

        trip_doc = {
            "id": trip_id,
            "user_id": user_id,
            "user_name": admin.get("name", user_id),
            "status": "active",
            "purpose": "sourcing",  # Default, can be changed later
            "classification": "business",
            "notes": None,
            "start_time": ts,
            "end_time": None,
            "start_lat": payload.latitude,
            "start_lng": payload.longitude,
            "start_address": start_address,
            "end_lat": None,
            "end_lng": None,
            "end_address": None,
            "locations": [],
            "total_miles": 0.0,
            "routing_miles": None,
            "tax_deduction": 0.0,
            "receipt_url": None,
            "is_bluetooth": True,
            "created_at": now.isoformat(),
        }
        await db.gps_trips.insert_one(trip_doc)

        return {
            "success": True,
            "event": "trip_started",
            "trip_id": trip_id,
            "start_address": start_address,
            "message": f"Trip started at {start_address}",
        }

    elif event == "end" or (event == "ping" and pending):
        if not pending:
            return {"success": False, "message": "No active trip to end. Send event='start' first."}

        # Reverse-geocode end location
        end_address = await reverse_geocode(payload.latitude, payload.longitude)

        # Get road distance via OSRM
        road_miles = await get_road_distance_miles(
            pending["start_lat"], pending["start_lng"],
            payload.latitude, payload.longitude,
        )

        # Fallback to haversine if OSRM fails
        if road_miles is None:
            road_miles = haversine_distance(
                pending["start_lat"], pending["start_lng"],
                payload.latitude, payload.longitude,
            )

        irs_rate = get_irs_rate()
        tax_deduction = round(road_miles * irs_rate, 2)

        await db.gps_trips.update_one(
            {"id": pending["id"]},
            {"$set": {
                "status": "completed",
                "end_time": ts,
                "end_lat": payload.latitude,
                "end_lng": payload.longitude,
                "end_address": end_address,
                "total_miles": road_miles,
                "routing_miles": road_miles,
                "tax_deduction": tax_deduction,
            }},
        )

        return {
            "success": True,
            "event": "trip_completed",
            "trip_id": pending["id"],
            "start_address": pending.get("start_address", ""),
            "end_address": end_address,
            "total_miles": road_miles,
            "tax_deduction": tax_deduction,
            "message": f"Trip completed: {road_miles} miles — ${tax_deduction} deduction",
        }

    return {"success": False, "message": f"Unknown event: {event}"}


# ========== Trip Classification ==========

@router.put("/{trip_id}/classify")
async def classify_trip(
    trip_id: str,
    classification: str = Query(..., regex="^(business|personal)$"),
    admin: dict = Depends(get_admin_user),
):
    """Toggle a trip between business and personal."""
    result = await db.gps_trips.update_one(
        {"id": trip_id, "user_id": admin["email"]},
        {"$set": {"classification": classification}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Recalculate deduction
    irs_rate = get_irs_rate()
    deduction = 0.0 if classification == "personal" else None
    if classification == "business":
        trip = await db.gps_trips.find_one({"id": trip_id}, {"total_miles": 1})
        deduction = round((trip or {}).get("total_miles", 0) * irs_rate, 2)
    await db.gps_trips.update_one({"id": trip_id}, {"$set": {"tax_deduction": deduction}})
    return {"success": True, "classification": classification, "tax_deduction": deduction}


# ========== Purpose Categories CRUD ==========

DEFAULT_CATEGORIES = [
    "Resale Sourcing",
    "Shipping / Post Office",
    "Pickup / Delivery",
    "Client Meeting",
]


@router.get("/categories")
async def get_categories(admin: dict = Depends(get_admin_user)):
    """Get purpose categories. Seeds defaults on first call."""
    cats = await db.mileage_categories.find(
        {"user_id": admin["email"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    if not cats:
        # Seed defaults
        now = datetime.now(timezone.utc).isoformat()
        for name in DEFAULT_CATEGORIES:
            doc = {"id": str(uuid.uuid4()), "user_id": admin["email"], "name": name, "is_default": True, "created_at": now}
            await db.mileage_categories.insert_one(doc)
        cats = await db.mileage_categories.find({"user_id": admin["email"]}, {"_id": 0}).sort("created_at", 1).to_list(50)
    return {"categories": cats}


@router.post("/categories")
async def create_category(body: CategoryCreate, admin: dict = Depends(get_admin_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": admin["email"],
        "name": body.name.strip(),
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mileage_categories.insert_one(doc)
    return {"success": True, "category": {k: v for k, v in doc.items() if k != "_id"}}


@router.put("/categories/{cat_id}")
async def update_category(cat_id: str, body: CategoryUpdate, admin: dict = Depends(get_admin_user)):
    result = await db.mileage_categories.update_one(
        {"id": cat_id, "user_id": admin["email"]},
        {"$set": {"name": body.name.strip()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.mileage_categories.delete_one({"id": cat_id, "user_id": admin["email"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


# ========== IRS CSV Export ==========

@router.get("/export-csv")
async def export_csv(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user),
):
    """Export trips as IRS-compliant CSV."""
    if not year:
        year = datetime.now(timezone.utc).year
    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    trips = await db.gps_trips.find(
        {
            "user_id": admin["email"],
            "status": "completed",
            "is_hidden": {"$ne": True},
            "start_time": {"$gte": start_date.isoformat(), "$lt": end_date.isoformat()},
        },
        {"_id": 0, "locations": 0},
    ).sort("start_time", 1).to_list(5000)

    irs_rate = get_irs_rate(year)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Start Address", "End Address", "Miles", "Purpose", "Classification", "Tax Deduction", "Notes"])

    for t in trips:
        dt = datetime.fromisoformat(t["start_time"].replace("Z", "+00:00"))
        classification = t.get("classification", "business")
        deduction = round(t.get("total_miles", 0) * irs_rate, 2) if classification == "business" else 0
        writer.writerow([
            dt.strftime("%m/%d/%Y"),
            t.get("start_address", ""),
            t.get("end_address", ""),
            round(t.get("total_miles", 0), 2),
            t.get("purpose", ""),
            classification.title(),
            f"${deduction:.2f}",
            t.get("notes", "") or "",
        ])

    buf.seek(0)
    filename = f"mileage_log_{year}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# Pydantic Models (original)
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


class MileageAdjustment(BaseModel):
    period: str  # "day", "month", "year"
    date: str  # ISO date string (YYYY-MM-DD) - the day, first of month, or first of year
    adjustment_miles: float  # Can be positive or negative
    reason: Optional[str] = None


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
    """
    Calculate total distance from a list of location points.
    Uses multiple filtering strategies to eliminate GPS errors:
    1. Accuracy-based filtering (skip low accuracy points)
    2. Speed-based filtering (skip unrealistic movements)
    3. Noise filtering (skip tiny jitter)
    4. Smoothing via moving average for edge cases
    """
    if len(locations) < 2:
        return 0.0
    
    total_distance = 0.0
    MAX_REALISTIC_SPEED_MPH = 90  # Max realistic driving speed (slightly higher for highway)
    MIN_DISTANCE_MILES = 0.0005   # ~2.6 feet - filter GPS jitter
    MAX_ACCURACY_METERS = 50      # Skip points with accuracy worse than this
    
    valid_points = []
    
    # First pass: filter out obviously bad points
    for loc in locations:
        accuracy = loc.get("accuracy")
        # Skip points with poor accuracy (if accuracy is reported)
        if accuracy and accuracy > MAX_ACCURACY_METERS:
            print(f"Skipping low accuracy point: {accuracy}m")
            continue
        valid_points.append(loc)
    
    if len(valid_points) < 2:
        return 0.0
    
    # Second pass: calculate distance with speed validation
    last_valid_speed = 0
    
    for i in range(1, len(valid_points)):
        prev = valid_points[i - 1]
        curr = valid_points[i]
        
        distance = haversine_distance(
            prev["latitude"], prev["longitude"],
            curr["latitude"], curr["longitude"]
        )
        
        # Filter out tiny noise
        if distance < MIN_DISTANCE_MILES:
            continue
        
        # Calculate time difference to determine if speed is realistic
        try:
            prev_time = datetime.fromisoformat(prev["timestamp"].replace("Z", "+00:00"))
            curr_time = datetime.fromisoformat(curr["timestamp"].replace("Z", "+00:00"))
            time_diff_seconds = (curr_time - prev_time).total_seconds()
            time_diff_hours = time_diff_seconds / 3600
            
            if time_diff_hours > 0:
                implied_speed = distance / time_diff_hours
                
                # If implied speed is unrealistic, it's a GPS error - skip it
                if implied_speed > MAX_REALISTIC_SPEED_MPH:
                    print(f"Skipping unrealistic speed: {implied_speed:.1f}mph ({distance:.4f}mi in {time_diff_seconds:.1f}s)")
                    continue
                
                # Check for sudden speed jumps (likely GPS bounce)
                # If we go from slow to very fast instantly, probably an error
                if last_valid_speed > 0 and last_valid_speed < 30:
                    speed_jump_ratio = implied_speed / last_valid_speed
                    if speed_jump_ratio > 4 and implied_speed > 60:
                        print(f"Skipping speed jump: {last_valid_speed:.1f}mph -> {implied_speed:.1f}mph")
                        continue
                
                # Update last valid speed
                if implied_speed < MAX_REALISTIC_SPEED_MPH:
                    last_valid_speed = implied_speed
            
            total_distance += distance
            
        except (ValueError, KeyError) as e:
            # If we can't parse timestamps, use distance-only filter (fallback)
            if distance < 0.3:  # Allow up to 0.3 miles without time check
                total_distance += distance
            else:
                print(f"Skipping large jump (no timestamp): {distance:.4f} miles")
    
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
    
    from app.services.object_storage import put_object, APP_NAME
    
    # Save to durable object storage
    file_ext = os.path.splitext(receipt.filename)[1] or ".jpg"
    filename = f"{trip_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    
    content = await receipt.read()
    storage_path = f"{APP_NAME}/receipts/{filename}"
    result = put_object(storage_path, content, receipt.content_type or "image/jpeg")
    
    await db.receipt_files.insert_one({
        "filename": filename,
        "storage_path": result["path"],
        "original_filename": receipt.filename,
        "mime_type": receipt.content_type,
        "size": len(content),
        "trip_id": trip_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update trip with receipt URL
    receipt_url = f"/api/admin/gps-trips/receipt/{filename}"
    await db.gps_trips.update_one(
        {"id": trip_id},
        {"$set": {"receipt_url": receipt_url}}
    )
    
    return {"success": True, "receipt_url": receipt_url}


@router.get("/receipt/{filename}")
async def get_receipt(filename: str):
    """Serve a receipt image from object storage (legacy local fallback)"""
    from fastapi.responses import FileResponse, Response
    from app.services.object_storage import get_object
    
    record = await db.receipt_files.find_one({"filename": filename}, {"_id": 0})
    if record:
        try:
            data, content_type = get_object(record["storage_path"])
            return Response(content=data, media_type=record.get("mime_type") or content_type)
        except Exception as e:
            print(f"[Receipt] Object storage fetch failed for {filename}: {e}")
    
    # Legacy fallback
    file_path = f"/app/backend/uploads/receipts/{filename}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    
    raise HTTPException(status_code=404, detail="Receipt not found")


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
    
    # Get location count separately (with null check)
    full_trip = await db.gps_trips.find_one({"id": trip["id"]})
    location_count = len(full_trip.get("locations", [])) if full_trip else 0
    
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
    """Get completed trip history for ALL users (admin view)"""
    query = {
        "status": "completed",
        "is_hidden": {"$ne": True}  # Exclude hidden adjustments from trip history
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
            "tax_deduction": round(trip.get("total_miles", 0) * irs_rate, 2),
            "logged_by": trip.get("user_name", trip.get("user_id", "Unknown"))
        })
    
    return {"trips": result}


@router.get("/summary")
async def get_mileage_summary(
    year: Optional[int] = None,
    tz_offset: Optional[int] = None,  # Client timezone offset in minutes (e.g., -300 for US Central)
    admin: dict = Depends(get_admin_user)
):
    """Get mileage summary for ALL users (admin view)"""
    # Use client's local time if timezone offset provided, otherwise UTC
    if tz_offset is not None:
        # Convert offset minutes to timedelta (offset is minutes behind UTC, so negate)
        client_tz = timezone(timedelta(minutes=-tz_offset))
        now = datetime.now(client_tz)
    else:
        now = datetime.now(timezone.utc)
    
    if not year:
        year = now.year
    
    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    
    # Get ALL completed trips, excluding hidden adjustments
    trips = await db.gps_trips.find({
        "status": "completed",
        "is_hidden": {"$ne": True},  # Exclude hidden adjustment entries from trip counts
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0, "locations": 0}).to_list(1000)
    
    # Get hidden adjustments separately to add to mileage totals (but not trip counts)
    hidden_adjustments = await db.gps_trips.find({
        "status": "completed",
        "is_hidden": True,
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0, "total_miles": 1, "start_time": 1}).to_list(1000)
    
    irs_rate = get_irs_rate(year)
    
    # Calculate totals - trips don't include hidden, but miles do
    total_miles = sum(t.get("total_miles", 0) for t in trips)
    total_miles += sum(t.get("total_miles", 0) for t in hidden_adjustments)  # Add hidden adjustment miles
    total_trips = len(trips)  # Hidden entries are NOT counted as trips
    
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
            monthly[month_key] = {"trips": 0, "miles": 0, "deduction": 0}
        monthly[month_key]["trips"] += 1
        monthly[month_key]["miles"] += trip.get("total_miles", 0)
        monthly[month_key]["deduction"] = round(monthly[month_key]["miles"] * irs_rate, 2)
    
    # Add hidden adjustment miles to monthly totals (but not trip counts)
    for adj in hidden_adjustments:
        start_time = datetime.fromisoformat(adj["start_time"].replace("Z", "+00:00"))
        month_key = start_time.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = {"trips": 0, "miles": 0, "deduction": 0}
        monthly[month_key]["miles"] += adj.get("total_miles", 0)
        monthly[month_key]["deduction"] = round(monthly[month_key]["miles"] * irs_rate, 2)
    
    # Calculate daily breakdown (current month)
    # Use client timezone for date comparison if provided
    client_tz = timezone(timedelta(minutes=-tz_offset)) if tz_offset is not None else timezone.utc
    current_month_start = datetime(now.year, now.month, 1, tzinfo=client_tz)
    daily = {}
    today_key = now.strftime("%Y-%m-%d")
    today_miles = 0
    today_trips = 0
    
    for trip in trips:
        start_time = datetime.fromisoformat(trip["start_time"].replace("Z", "+00:00"))
        # Convert to client timezone for proper day grouping
        start_time_local = start_time.astimezone(client_tz)
        day_key = start_time_local.strftime("%Y-%m-%d")
        
        if start_time_local >= current_month_start:
            if day_key not in daily:
                daily[day_key] = {"trips": 0, "miles": 0, "deduction": 0}
            daily[day_key]["trips"] += 1
            daily[day_key]["miles"] += trip.get("total_miles", 0)
            daily[day_key]["deduction"] = round(daily[day_key]["miles"] * irs_rate, 2)
            
            # Track today's totals
            if day_key == today_key:
                today_miles += trip.get("total_miles", 0)
                today_trips += 1
    
    # Add hidden adjustment miles to daily totals (but not trip counts)
    for adj in hidden_adjustments:
        start_time = datetime.fromisoformat(adj["start_time"].replace("Z", "+00:00"))
        start_time_local = start_time.astimezone(client_tz)
        day_key = start_time_local.strftime("%Y-%m-%d")
        
        if start_time_local >= current_month_start:
            if day_key not in daily:
                daily[day_key] = {"trips": 0, "miles": 0, "deduction": 0}
            daily[day_key]["miles"] += adj.get("total_miles", 0)
            daily[day_key]["deduction"] = round(daily[day_key]["miles"] * irs_rate, 2)
            
            if day_key == today_key:
                today_miles += adj.get("total_miles", 0)
    
    # Current month totals
    current_month_key = now.strftime("%Y-%m")
    current_month_data = monthly.get(current_month_key, {"trips": 0, "miles": 0})
    
    # Calculate breakdown by user
    by_user = {}
    for trip in trips:
        user_name = trip.get("user_name", trip.get("user_id", "Unknown"))
        if user_name not in by_user:
            by_user[user_name] = {"trips": 0, "miles": 0, "deduction": 0}
        by_user[user_name]["trips"] += 1
        by_user[user_name]["miles"] += trip.get("total_miles", 0)
        by_user[user_name]["deduction"] = round(by_user[user_name]["miles"] * irs_rate, 2)
    
    return {
        "year": year,
        "irs_rate": irs_rate,
        "total_miles": round(total_miles, 2),
        "total_trips": total_trips,
        "total_deduction": round(total_miles * irs_rate, 2),
        "by_purpose": by_purpose,
        "by_user": by_user,
        "monthly": monthly,
        "daily": daily,
        # Quick access summaries
        "today": {
            "trips": today_trips,
            "miles": round(today_miles, 2),
            "deduction": round(today_miles * irs_rate, 2)
        },
        "this_month": {
            "trips": current_month_data["trips"],
            "miles": round(current_month_data["miles"], 2),
            "deduction": round(current_month_data["miles"] * irs_rate, 2),
            "name": now.strftime("%B")
        }
    }


@router.post("/adjust")
async def adjust_mileage(
    adjustment: MileageAdjustment,
    admin: dict = Depends(get_admin_user)
):
    """
    Adjust mileage totals without creating a visible trip entry.
    This creates a special 'adjustment' entry that is hidden from trip history
    but included in totals. Useful for corrections without appearing suspicious.
    """
    try:
        adjust_date = datetime.strptime(adjustment.date, "%Y-%m-%d")
        adjust_date = adjust_date.replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if abs(adjustment.adjustment_miles) > 100:
        raise HTTPException(status_code=400, detail="Adjustment too large. Max 100 miles per adjustment.")
    
    irs_rate = get_irs_rate(adjust_date.year)
    adjustment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Create a hidden adjustment entry
    adjustment_doc = {
        "id": adjustment_id,
        "user_id": admin["email"],
        "user_name": admin.get("name", admin["email"]),
        "status": "completed",
        "purpose": "adjustment",
        "notes": adjustment.reason or f"Mileage adjustment for {adjustment.period}",
        "start_time": adjust_date.isoformat(),
        "end_time": adjust_date.isoformat(),
        "locations": [],
        "total_miles": round(adjustment.adjustment_miles, 2),
        "tax_deduction": round(adjustment.adjustment_miles * irs_rate, 2),
        "receipt_url": None,
        "is_adjustment": True,  # Flag to identify adjustments
        "is_hidden": True,  # Hide from trip history list
        "adjustment_period": adjustment.period,
        "created_at": now.isoformat()
    }
    
    await db.gps_trips.insert_one(adjustment_doc)
    
    return {
        "success": True,
        "adjustment_id": adjustment_id,
        "adjustment_miles": round(adjustment.adjustment_miles, 2),
        "tax_impact": round(adjustment.adjustment_miles * irs_rate, 2),
        "message": f"Mileage adjusted by {adjustment.adjustment_miles:+.2f} miles"
    }


@router.get("/adjustments")
async def get_adjustments(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get list of mileage adjustments for audit purposes"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    
    adjustments = await db.gps_trips.find({
        "user_id": admin["email"],
        "is_adjustment": True,
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0, "locations": 0}).sort("start_time", -1).to_list(100)
    
    return {
        "year": year,
        "adjustments": adjustments,
        "total_adjustment": sum(a.get("total_miles", 0) for a in adjustments)
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
