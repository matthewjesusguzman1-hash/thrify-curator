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
from app.services.osrm_service import match_waypoints_to_roads

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
    
    # Add waypoint_count to each entry
    result = []
    for entry in entries:
        entry['waypoint_count'] = len(entry.get('waypoints', []))
        result.append(MileageEntryResponse(**entry))
    
    return result


@router.post("/entries", response_model=MileageEntryResponse)
async def create_mileage_entry(entry: MileageEntryCreate, admin: dict = Depends(get_admin_user)):
    """Create a manual mileage entry"""
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Use the admin's actual name from their login code
    admin_name = admin.get("admin_name", "Administrator")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin.get("admin_code"),
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
    """Get the currently active trip for THIS specific admin (by admin_code)"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        return None
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if trip:
        return ActiveTripResponse(**trip)
    return None


@router.post("/start-trip", response_model=ActiveTripResponse)
async def start_trip(trip_data: StartTripRequest, admin: dict = Depends(get_admin_user)):
    """Start tracking a new trip - each admin has their own independent trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required for trip tracking")
    
    # Check if THIS admin already has an active trip (by admin_code, not user_id)
    existing = await db.active_trips.find_one({"admin_code": admin_code})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active trip. Please end it first.")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Use the admin's actual name from their login code
    admin_name = admin.get("admin_name", "Administrator")
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin_code,
        "start_location": trip_data.start_location.model_dump(),
        "start_address": trip_data.start_address,
        "start_time": now,
        "waypoints": [],
        "is_paused": False,
        "paused_at": None,
        "total_paused_duration": 0.0
    }
    
    await db.active_trips.insert_one(trip_doc)
    return ActiveTripResponse(**trip_doc)


@router.post("/pause-trip")
async def pause_trip(admin: dict = Depends(get_admin_user)):
    """Pause the active trip tracking - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    if trip.get("is_paused", False):
        raise HTTPException(status_code=400, detail="Trip is already paused")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$set": {"is_paused": True, "paused_at": now}}
    )
    
    return {"message": "Trip paused", "paused_at": now}


@router.post("/resume-trip")
async def resume_trip(admin: dict = Depends(get_admin_user)):
    """Resume a paused trip - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    if not trip.get("is_paused", False):
        raise HTTPException(status_code=400, detail="Trip is not paused")
    
    # Calculate paused duration and add to total
    paused_at = trip.get("paused_at")
    total_paused = trip.get("total_paused_duration", 0.0)
    
    if paused_at:
        paused_time = datetime.fromisoformat(paused_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        pause_duration = (now - paused_time).total_seconds()
        total_paused += pause_duration
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$set": {"is_paused": False, "paused_at": None, "total_paused_duration": total_paused}}
    )
    
    return {"message": "Trip resumed", "total_paused_duration": total_paused}


@router.post("/update-location")
async def update_trip_location(location_data: UpdateTripLocationRequest, admin: dict = Depends(get_admin_user)):
    """Add a waypoint to the active trip (only if not paused) - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    # Don't record waypoints if trip is paused
    if trip.get("is_paused", False):
        return {"message": "Trip is paused, location not recorded"}
    
    waypoint = location_data.location.model_dump()
    waypoint["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$push": {"waypoints": waypoint}}
    )
    
    return {"message": "Location updated"}


@router.post("/end-trip", response_model=MileageEntryResponse)
async def end_trip(trip_data: EndTripRequest, admin: dict = Depends(get_admin_user)):
    """End the active trip and save it as a mileage entry - only affects this admin's trip"""
    import math
    
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    # Build the complete path: start -> waypoints -> end
    waypoints = trip.get("waypoints", [])
    all_waypoints = []
    
    # Add start location
    start_loc = trip.get("start_location", {})
    if start_loc and start_loc.get("latitude") and start_loc.get("longitude"):
        all_waypoints.append({
            "latitude": start_loc.get("latitude"),
            "longitude": start_loc.get("longitude"),
            "timestamp": trip.get("start_time"),
            "accuracy": start_loc.get("accuracy")
        })
    
    # Add all waypoints
    for wp in waypoints:
        if wp.get("latitude") and wp.get("longitude"):
            all_waypoints.append({
                "latitude": wp.get("latitude"),
                "longitude": wp.get("longitude"),
                "timestamp": wp.get("timestamp"),
                "accuracy": wp.get("accuracy")
            })
    
    # Add end location
    end_loc = trip_data.end_location
    if end_loc and end_loc.latitude and end_loc.longitude:
        all_waypoints.append({
            "latitude": end_loc.latitude,
            "longitude": end_loc.longitude,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "accuracy": end_loc.accuracy
        })
    
    # Use OSRM map matching with gap filling for accurate distance
    map_match_result = None
    road_distance_miles = 0
    matched_coordinates = []
    match_confidence = 0
    matched_geometry = None
    gaps_detected = 0
    gaps_filled = 0
    
    if len(all_waypoints) >= 2:
        try:
            # Use enhanced processing with gap detection and filling
            from app.services.osrm_service import process_trip_with_gap_filling
            map_match_result = await process_trip_with_gap_filling(all_waypoints)
            road_distance_miles = map_match_result.get("road_distance_miles", 0)
            matched_coordinates = map_match_result.get("matched_coordinates", [])
            match_confidence = map_match_result.get("confidence", 0)
            matched_geometry = map_match_result.get("geometry")
            gaps_detected = map_match_result.get("gaps_detected", 0)
            gaps_filled = map_match_result.get("gaps_filled", 0)
            
            if gaps_detected > 0:
                print(f"Trip processing: Detected {gaps_detected} GPS gaps, filled {gaps_filled} with routing")
        except Exception as e:
            print(f"Enhanced map matching error: {e}, falling back to basic matching")
            try:
                map_match_result = await match_waypoints_to_roads(all_waypoints)
                road_distance_miles = map_match_result.get("road_distance_miles", 0)
                matched_coordinates = map_match_result.get("matched_coordinates", [])
                match_confidence = map_match_result.get("confidence", 0)
                matched_geometry = map_match_result.get("geometry")
            except Exception as e2:
                print(f"Basic map matching also failed: {e2}")
    
    # Fallback to straight-line calculation if map matching failed
    if road_distance_miles <= 0:
        def haversine_distance(lat1, lon1, lat2, lon2):
            R = 3959  # Earth's radius in miles
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        
        cumulative_miles = 0.0
        for i in range(1, len(all_waypoints)):
            prev = all_waypoints[i-1]
            curr = all_waypoints[i]
            cumulative_miles += haversine_distance(
                prev["latitude"], prev["longitude"],
                curr["latitude"], curr["longitude"]
            )
        road_distance_miles = round(cumulative_miles, 2)
    
    # Use the admin's actual name from their login code, or from the trip doc
    admin_name = admin.get("admin_name") or trip.get("user_name", "Administrator")
    admin_code = admin.get("admin_code") or trip.get("admin_code")
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin_code,
        "date": today,
        "start_location": trip["start_location"],
        "end_location": trip_data.end_location.model_dump(),
        "start_address": trip.get("start_address"),
        "end_address": trip_data.end_address,
        "total_miles": round(road_distance_miles, 2),
        "purpose": trip_data.purpose.value,
        "purpose_other": trip_data.purpose_other if trip_data.purpose == "other" else None,
        "notes": trip_data.notes,
        "is_tracking": False,
        "waypoints": waypoints,  # Original GPS waypoints
        "waypoint_count": len(waypoints),
        "matched_coordinates": matched_coordinates,  # Road-snapped coordinates
        "matched_geometry": matched_geometry,  # GeoJSON for map display
        "match_confidence": match_confidence,
        "is_road_matched": match_confidence > 0,
        "gaps_detected": gaps_detected,  # Number of GPS signal gaps found
        "gaps_filled": gaps_filled,  # Number of gaps filled with routing
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    await db.active_trips.delete_one({"admin_code": admin_code})
    
    return MileageEntryResponse(**entry_doc)


@router.post("/cancel-trip")
async def cancel_trip(admin: dict = Depends(get_admin_user)):
    """Cancel the active trip without saving - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    result = await db.active_trips.delete_one({"admin_code": admin_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No active trip found")
    return {"message": "Trip cancelled"}


@router.get("/active-trip/distance")
async def get_active_trip_distance(admin: dict = Depends(get_admin_user)):
    """Get the current cumulative distance of the active trip - only this admin's trip"""
    import math
    
    admin_code = admin.get("admin_code")
    if not admin_code:
        return {"distance": 0, "waypoint_count": 0}
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if not trip:
        return {"cumulative_miles": 0, "waypoint_count": 0}
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 3959
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    waypoints = trip.get("waypoints", [])
    path_points = []
    
    start_loc = trip.get("start_location", {})
    if start_loc:
        path_points.append((start_loc.get("latitude"), start_loc.get("longitude")))
    
    for wp in waypoints:
        if wp.get("latitude") and wp.get("longitude"):
            path_points.append((wp.get("latitude"), wp.get("longitude")))
    
    cumulative_miles = 0.0
    for i in range(1, len(path_points)):
        prev = path_points[i-1]
        curr = path_points[i]
        if prev[0] and prev[1] and curr[0] and curr[1]:
            cumulative_miles += haversine_distance(prev[0], prev[1], curr[0], curr[1])
    
    return {
        "cumulative_miles": round(cumulative_miles, 2),
        "waypoint_count": len(waypoints),
        "start_time": trip.get("start_time")
    }


@router.get("/active-trip/waypoints")
async def get_active_trip_waypoints(admin: dict = Depends(get_admin_user)):
    """Get all waypoints for the current active trip (for live map display)"""
    trip = await db.mileage_entries.find_one(
        {"user_id": admin["id"], "status": {"$in": ["active", "paused"]}},
        {"_id": 0}
    )
    
    if not trip:
        return {"waypoints": []}
    
    waypoints = trip.get("waypoints", [])
    start_location = trip.get("start_location")
    
    # Include start location as first waypoint
    all_waypoints = []
    if start_location:
        all_waypoints.append({
            "latitude": start_location.get("latitude"),
            "longitude": start_location.get("longitude"),
            "timestamp": trip.get("start_time"),
            "accuracy": start_location.get("accuracy")
        })
    
    # Add all recorded waypoints
    for wp in waypoints:
        all_waypoints.append({
            "latitude": wp.get("latitude"),
            "longitude": wp.get("longitude"),
            "timestamp": wp.get("timestamp"),
            "accuracy": wp.get("accuracy")
        })
    
    return {"waypoints": all_waypoints}


@router.get("/{trip_id}/waypoints")
async def get_trip_waypoints(trip_id: str, admin: dict = Depends(get_admin_user)):
    """Get all waypoints for a completed trip (for map display)"""
    trip = await db.mileage_entries.find_one(
        {"id": trip_id},
        {"_id": 0}
    )
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    waypoints = trip.get("waypoints", [])
    start_location = trip.get("start_location")
    end_location = trip.get("end_location")
    
    # Check for road-matched coordinates (preferred for display)
    matched_coordinates = trip.get("matched_coordinates", [])
    is_road_matched = trip.get("is_road_matched", False)
    match_confidence = trip.get("match_confidence", 0)
    
    # Build complete raw route: start -> waypoints -> end
    all_waypoints = []
    
    if start_location:
        all_waypoints.append({
            "latitude": start_location.get("latitude"),
            "longitude": start_location.get("longitude"),
            "timestamp": trip.get("start_time"),
            "accuracy": start_location.get("accuracy")
        })
    
    for wp in waypoints:
        all_waypoints.append({
            "latitude": wp.get("latitude"),
            "longitude": wp.get("longitude"),
            "timestamp": wp.get("timestamp"),
            "accuracy": wp.get("accuracy")
        })
    
    if end_location:
        all_waypoints.append({
            "latitude": end_location.get("latitude"),
            "longitude": end_location.get("longitude"),
            "timestamp": trip.get("end_time"),
            "accuracy": end_location.get("accuracy")
        })
    
    return {
        "waypoints": all_waypoints,
        "matched_coordinates": matched_coordinates,
        "is_road_matched": is_road_matched,
        "match_confidence": match_confidence,
        "total_miles": trip.get("total_miles", 0),
        "start_address": trip.get("start_address"),
        "end_address": trip.get("end_address")
    }


@router.post("/{trip_id}/reprocess-route")
async def reprocess_trip_route(trip_id: str, admin: dict = Depends(get_admin_user)):
    """
    Re-process a completed trip with OSRM map matching.
    This will snap GPS waypoints to roads and recalculate the distance.
    """
    trip = await db.mileage_entries.find_one({"id": trip_id}, {"_id": 0})
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Build complete route: start -> waypoints -> end
    waypoints = trip.get("waypoints", [])
    start_location = trip.get("start_location")
    end_location = trip.get("end_location")
    
    all_waypoints = []
    
    if start_location and start_location.get("latitude") and start_location.get("longitude"):
        all_waypoints.append({
            "latitude": start_location.get("latitude"),
            "longitude": start_location.get("longitude"),
            "timestamp": trip.get("start_time"),
            "accuracy": start_location.get("accuracy")
        })
    
    for wp in waypoints:
        if wp.get("latitude") and wp.get("longitude"):
            all_waypoints.append({
                "latitude": wp.get("latitude"),
                "longitude": wp.get("longitude"),
                "timestamp": wp.get("timestamp"),
                "accuracy": wp.get("accuracy")
            })
    
    if end_location and end_location.get("latitude") and end_location.get("longitude"):
        all_waypoints.append({
            "latitude": end_location.get("latitude"),
            "longitude": end_location.get("longitude"),
            "timestamp": trip.get("end_time"),
            "accuracy": end_location.get("accuracy")
        })
    
    if len(all_waypoints) < 2:
        raise HTTPException(status_code=400, detail="Not enough waypoints to process route")
    
    # Perform map matching with gap filling
    from app.services.osrm_service import process_trip_with_gap_filling
    map_match_result = await process_trip_with_gap_filling(all_waypoints)
    
    road_distance_miles = map_match_result.get("road_distance_miles", 0)
    matched_coordinates = map_match_result.get("matched_coordinates", [])
    match_confidence = map_match_result.get("confidence", 0)
    matched_geometry = map_match_result.get("geometry")
    gaps_detected = map_match_result.get("gaps_detected", 0)
    gaps_filled = map_match_result.get("gaps_filled", 0)
    
    # Update the trip with matched data
    update_data = {
        "matched_coordinates": matched_coordinates,
        "matched_geometry": matched_geometry,
        "match_confidence": match_confidence,
        "is_road_matched": match_confidence > 0,
        "gaps_detected": gaps_detected,
        "gaps_filled": gaps_filled,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Only update total_miles if we got a confident match
    if match_confidence > 0.5 and road_distance_miles > 0:
        update_data["total_miles"] = road_distance_miles
    
    await db.mileage_entries.update_one(
        {"id": trip_id},
        {"$set": update_data}
    )
    
    # Return the result
    return {
        "trip_id": trip_id,
        "original_miles": trip.get("total_miles", 0),
        "road_matched_miles": road_distance_miles,
        "confidence": match_confidence,
        "matched_waypoint_count": len(matched_coordinates),
        "original_waypoint_count": len(all_waypoints),
        "is_road_matched": match_confidence > 0,
        "gaps_detected": gaps_detected,
        "gaps_filled": gaps_filled,
        "error": map_match_result.get("error")
    }


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


# ============================================
# "Forgot to Track" Feature Endpoints
# ============================================

@router.post("/calculate-route")
async def calculate_route_distance(
    start_address: str,
    end_address: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Calculate route distance between two addresses using geocoding + OSRM routing.
    Used for "Forgot to Track" feature.
    """
    import httpx
    
    async def geocode_address(address: str):
        """Convert address to coordinates using Nominatim (OpenStreetMap)"""
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": address,
                "format": "json",
                "limit": 1,
                "addressdetails": 1
            }
            headers = {"User-Agent": "ThriftyCurator/1.0"}
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params, headers=headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data:
                    return None
                
                result = data[0]
                return {
                    "latitude": float(result["lat"]),
                    "longitude": float(result["lon"]),
                    "display_name": result.get("display_name", address),
                    "type": result.get("type", "unknown")
                }
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
    
    # Geocode both addresses
    start_geo = await geocode_address(start_address)
    end_geo = await geocode_address(end_address)
    
    if not start_geo:
        raise HTTPException(status_code=400, detail=f"Could not find location: {start_address}")
    if not end_geo:
        raise HTTPException(status_code=400, detail=f"Could not find location: {end_address}")
    
    # Get route from OSRM
    from app.services.osrm_service import get_route_between_points
    
    start_point = {"latitude": start_geo["latitude"], "longitude": start_geo["longitude"]}
    end_point = {"latitude": end_geo["latitude"], "longitude": end_geo["longitude"]}
    
    route = await get_route_between_points(start_point, end_point)
    
    if not route:
        raise HTTPException(status_code=400, detail="Could not calculate route between locations")
    
    return {
        "start": {
            "address": start_address,
            "resolved_address": start_geo["display_name"],
            "latitude": start_geo["latitude"],
            "longitude": start_geo["longitude"]
        },
        "end": {
            "address": end_address,
            "resolved_address": end_geo["display_name"],
            "latitude": end_geo["latitude"],
            "longitude": end_geo["longitude"]
        },
        "distance_miles": route["distance_miles"],
        "distance_meters": route["distance_meters"],
        "duration_minutes": round(route.get("duration_seconds", 0) / 60, 1),
        "geometry": route.get("geometry")
    }


@router.post("/forgot-to-track")
async def create_forgot_trip(
    start_address: str,
    end_address: str,
    date: str,
    purpose: str,
    purpose_other: Optional[str] = None,
    notes: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Create a mileage entry for a trip that wasn't tracked live.
    Uses geocoding and routing to calculate accurate distance.
    """
    import httpx
    
    async def geocode_address(address: str):
        """Convert address to coordinates using Nominatim (OpenStreetMap)"""
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": address,
                "format": "json",
                "limit": 1
            }
            headers = {"User-Agent": "ThriftyCurator/1.0"}
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params, headers=headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data:
                    return None
                
                result = data[0]
                return {
                    "latitude": float(result["lat"]),
                    "longitude": float(result["lon"]),
                    "display_name": result.get("display_name", address)
                }
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
    
    # Geocode both addresses
    start_geo = await geocode_address(start_address)
    end_geo = await geocode_address(end_address)
    
    if not start_geo:
        raise HTTPException(status_code=400, detail=f"Could not find location: {start_address}")
    if not end_geo:
        raise HTTPException(status_code=400, detail=f"Could not find location: {end_address}")
    
    # Get route from OSRM
    from app.services.osrm_service import get_route_between_points
    
    start_point = {"latitude": start_geo["latitude"], "longitude": start_geo["longitude"]}
    end_point = {"latitude": end_geo["latitude"], "longitude": end_geo["longitude"]}
    
    route = await get_route_between_points(start_point, end_point)
    
    if not route:
        raise HTTPException(status_code=400, detail="Could not calculate route between locations")
    
    # Get admin info
    admin_code = admin.get("admin_code")
    admin_name = "Matthew Guzman" if admin_code == "4399" else "Eunice Guzman" if admin_code == "0826" else "Admin"
    
    # Create the entry
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin_code,
        "date": date,
        "start_location": {
            "latitude": start_geo["latitude"],
            "longitude": start_geo["longitude"]
        },
        "end_location": {
            "latitude": end_geo["latitude"],
            "longitude": end_geo["longitude"]
        },
        "start_address": start_address,
        "end_address": end_address,
        "total_miles": round(route["distance_miles"], 2),
        "purpose": purpose,
        "purpose_other": purpose_other if purpose == "other" else None,
        "notes": notes,
        "is_tracking": False,
        "waypoints": [],
        "waypoint_count": 0,
        "matched_coordinates": route.get("geometry", {}).get("coordinates", []),
        "is_road_matched": True,
        "match_confidence": 0.9,  # High confidence for direct routing
        "entry_type": "forgot_to_track",  # Mark as retroactive entry
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    
    return {
        "id": entry_id,
        "start_address": start_address,
        "end_address": end_address,
        "total_miles": round(route["distance_miles"], 2),
        "date": date,
        "purpose": purpose,
        "message": "Trip added successfully"
    }


@router.get("/geocode")
async def geocode_address_search(
    query: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Search for addresses using Nominatim geocoding.
    Returns up to 5 matching addresses for autocomplete.
    """
    import httpx
    
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "format": "json",
            "limit": 5,
            "addressdetails": 1
        }
        headers = {"User-Agent": "ThriftyCurator/1.0"}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            results = []
            for item in data:
                results.append({
                    "display_name": item.get("display_name", ""),
                    "latitude": float(item["lat"]),
                    "longitude": float(item["lon"]),
                    "type": item.get("type", "unknown"),
                    "importance": item.get("importance", 0)
                })
            
            return results
            
    except Exception as e:
        print(f"Geocoding search error: {e}")
        return []


@router.get("/export/csv")
async def export_mileage_csv(
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Export mileage entries as CSV for tax filing"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    # Build date query based on provided parameters
    if start_date and end_date:
        query = {"date": {"$gte": start_date, "$lte": end_date}}
    elif year:
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    else:
        year = datetime.now(timezone.utc).year
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    # IRS standard mileage rate for 2026
    IRS_RATE = 0.725
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Date", "Start Location", "End Location", "Miles", 
        "Business Purpose", "Notes", "Deduction Amount"
    ])
    
    total_miles = 0
    total_deduction = 0
    
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose == "thrifting":
            purpose_display = "Business - Thrifting/Sourcing"
        elif purpose == "post_office":
            purpose_display = "Business - Post Office/Shipping"
        elif purpose == "other":
            purpose_display = f"Business - {entry.get('purpose_other', 'Other')}"
        else:
            purpose_display = f"Business - {purpose}"
        
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        total_miles += miles
        total_deduction += deduction
        
        writer.writerow([
            entry.get("date", ""),
            entry.get("start_address", ""),
            entry.get("end_address", ""),
            f"{miles:.1f}",
            purpose_display,
            entry.get("notes", ""),
            f"${deduction:.2f}"
        ])
    
    # Summary rows
    writer.writerow([])
    writer.writerow(["SUMMARY", "", "", "", "", "", ""])
    writer.writerow(["Total Miles", "", "", f"{total_miles:.1f}", "", "", ""])
    writer.writerow(["IRS Rate (2026)", "", "", "", "", "", f"${IRS_RATE}/mile"])
    writer.writerow(["Total Deduction", "", "", "", "", "", f"${total_deduction:.2f}"])
    writer.writerow([])
    writer.writerow(["Generated for tax year:", year, "", "", "", "", ""])
    writer.writerow(["Generated on:", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "", "", "", "", ""])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=mileage_log_{year}.csv"
        }
    )


@router.get("/export/pdf")
async def export_mileage_pdf(
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Export mileage entries as PDF for tax filing - styled like other forms"""
    from fastapi.responses import StreamingResponse
    from fpdf import FPDF
    import io
    
    # Build date query based on provided parameters
    if start_date and end_date:
        query = {"date": {"$gte": start_date, "$lte": end_date}}
        period_label = f"{start_date} to {end_date}"
    elif year:
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
        period_label = f"Year {year}"
    else:
        year = datetime.now(timezone.utc).year
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
        period_label = f"Year {year}"
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    # IRS standard mileage rate for 2026
    IRS_RATE = 0.725
    
    # Brand colors - Teal theme for mileage
    HEADER_COLOR = (20, 184, 166)  # Teal #14B8A6
    SECTION_COLOR = (13, 148, 136)  # Darker teal
    GREEN = (34, 139, 34)
    GRAY_LABEL = (128, 128, 128)
    BLACK = (0, 0, 0)
    LIGHT_GRAY = (200, 200, 200)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Header banner
    pdf.set_fill_color(*HEADER_COLOR)
    pdf.rect(0, 0, 210, 30, 'F')
    
    # Title in header
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_y(8)
    pdf.cell(0, 8, "THRIFTY CURATOR", ln=True, align="L")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "Mileage Log", ln=True, align="L")
    
    pdf.set_y(40)
    pdf.set_x(10)
    
    # REPORT PERIOD section
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "REPORT PERIOD", ln=True)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Period:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, period_label, ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "IRS Rate (2026):")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, f"${IRS_RATE}/mile", ln=True)
    pdf.ln(8)
    
    # Calculate totals
    total_miles = 0
    total_deduction = 0
    for entry in entries:
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        total_miles += miles
        total_deduction += deduction
    
    # SUMMARY section
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "SUMMARY", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Entries:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, str(len(entries)), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Miles:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, f"{total_miles:.1f} miles", ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Deduction:")
    pdf.set_text_color(*GREEN)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"${total_deduction:.2f}", ln=True)
    pdf.ln(8)
    
    # MILEAGE ENTRIES section
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "MILEAGE ENTRIES", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose == "thrifting":
            purpose_display = "Thrifting"
        elif purpose == "post_office":
            purpose_display = "Post Office"
        elif purpose == "other":
            purpose_display = entry.get('purpose_other', 'Other')
        else:
            purpose_display = purpose
        
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        
        start_addr = entry.get("start_address", "") or "-"
        end_addr = entry.get("end_address", "") or "-"
        
        # Entry date as header
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 6, entry.get("date", ""), ln=True)
        
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(20, 5, "    From:")
        pdf.set_text_color(*BLACK)
        pdf.cell(70, 5, start_addr[:35] if start_addr else "-")
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(15, 5, "To:")
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 5, end_addr[:35] if end_addr else "-", ln=True)
        
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(20, 5, "    Purpose:")
        pdf.set_text_color(*BLACK)
        pdf.cell(40, 5, purpose_display[:20])
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(20, 5, "Miles:")
        pdf.set_text_color(*BLACK)
        pdf.cell(25, 5, f"{miles:.1f}")
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(25, 5, "Deduction:")
        pdf.set_text_color(*GREEN)
        pdf.cell(0, 5, f"${deduction:.2f}", ln=True)
        pdf.ln(4)
    
    # Footer
    pdf.set_y(-20)
    pdf.set_text_color(150, 150, 150)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 10, f"Page 1 | Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')}", align="C")
    
    pdf_output = pdf.output()
    
    buffer = io.BytesIO(bytes(pdf_output))
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=mileage_log_{year}.pdf"
        }
    )
