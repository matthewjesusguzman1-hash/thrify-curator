"""
OSRM (Open Source Routing Machine) Map Matching Service
Snaps GPS waypoints to actual roads and calculates accurate road distance
"""

import httpx
import asyncio
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org"

async def match_waypoints_to_roads(waypoints: List[Dict]) -> Dict:
    """
    Match GPS waypoints to actual road network using OSRM.
    
    Args:
        waypoints: List of waypoints with 'latitude' and 'longitude' keys
        
    Returns:
        Dict with:
        - matched_coordinates: List of road-snapped coordinates
        - road_distance_meters: Actual road distance in meters
        - road_distance_miles: Actual road distance in miles
        - confidence: Match confidence (0-1)
        - geometry: Encoded polyline for map display
    """
    if not waypoints or len(waypoints) < 2:
        return {
            "matched_coordinates": waypoints,
            "road_distance_meters": 0,
            "road_distance_miles": 0,
            "confidence": 0,
            "geometry": None,
            "error": "Need at least 2 waypoints"
        }
    
    try:
        # OSRM expects coordinates as lon,lat (not lat,lon)
        # Limit to 100 waypoints per request (OSRM limit)
        sampled_waypoints = sample_waypoints(waypoints, max_points=100)
        
        coordinates = ";".join([
            f"{wp['longitude']},{wp['latitude']}" 
            for wp in sampled_waypoints
        ])
        
        # Build OSRM Match API URL
        # Parameters:
        # - geometries=geojson: Return geometry as GeoJSON for easy display
        # - overview=full: Return full route geometry
        # - annotations=distance: Include distance annotations
        # - radiuses: Search radius for each point (in meters)
        radiuses = ";".join(["50"] * len(sampled_waypoints))  # 50m search radius
        
        url = f"{OSRM_BASE_URL}/match/v1/driving/{coordinates}"
        params = {
            "geometries": "geojson",
            "overview": "full",
            "annotations": "true",
            "radiuses": radiuses
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                logger.error(f"OSRM API error: {response.status_code} - {response.text}")
                return create_fallback_result(waypoints)
            
            data = response.json()
            
            if data.get("code") != "Ok":
                logger.warning(f"OSRM match failed: {data.get('code')} - {data.get('message')}")
                return create_fallback_result(waypoints)
            
            # Extract matched route data
            matchings = data.get("matchings", [])
            if not matchings:
                return create_fallback_result(waypoints)
            
            # Combine all matchings (there may be multiple if route was split)
            total_distance = 0
            all_coordinates = []
            confidences = []
            
            for matching in matchings:
                total_distance += matching.get("distance", 0)
                confidences.append(matching.get("confidence", 0))
                
                # Extract coordinates from geometry
                geometry = matching.get("geometry", {})
                if geometry and geometry.get("coordinates"):
                    # GeoJSON coordinates are [lon, lat], convert to {lat, lon}
                    for coord in geometry["coordinates"]:
                        all_coordinates.append({
                            "longitude": coord[0],
                            "latitude": coord[1]
                        })
            
            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Convert meters to miles
            road_distance_miles = total_distance / 1609.344
            
            return {
                "matched_coordinates": all_coordinates,
                "road_distance_meters": total_distance,
                "road_distance_miles": round(road_distance_miles, 2),
                "confidence": round(avg_confidence, 2),
                "geometry": data.get("matchings", [{}])[0].get("geometry"),
                "original_waypoint_count": len(waypoints),
                "matched_waypoint_count": len(all_coordinates),
                "error": None
            }
            
    except httpx.TimeoutException:
        logger.error("OSRM API timeout")
        return create_fallback_result(waypoints, error="Map matching service timeout")
    except Exception as e:
        logger.error(f"OSRM map matching error: {str(e)}")
        return create_fallback_result(waypoints, error=str(e))


async def get_route_between_points(start: Dict, end: Dict) -> Dict:
    """
    Get driving route between two points using OSRM routing.
    Useful for filling in gaps when there are missing waypoints.
    """
    try:
        coordinates = f"{start['longitude']},{start['latitude']};{end['longitude']},{end['latitude']}"
        url = f"{OSRM_BASE_URL}/route/v1/driving/{coordinates}"
        params = {
            "geometries": "geojson",
            "overview": "full"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            if data.get("code") != "Ok":
                return None
            
            routes = data.get("routes", [])
            if not routes:
                return None
            
            route = routes[0]
            return {
                "distance_meters": route.get("distance", 0),
                "distance_miles": round(route.get("distance", 0) / 1609.344, 2),
                "duration_seconds": route.get("duration", 0),
                "geometry": route.get("geometry")
            }
            
    except Exception as e:
        logger.error(f"OSRM routing error: {str(e)}")
        return None


def sample_waypoints(waypoints: List[Dict], max_points: int = 100) -> List[Dict]:
    """
    Sample waypoints to reduce to max_points while preserving start, end, and key points.
    OSRM has a limit of ~100 coordinates per request.
    """
    if len(waypoints) <= max_points:
        return waypoints
    
    # Always keep first and last
    result = [waypoints[0]]
    
    # Calculate step size to get approximately max_points
    step = len(waypoints) / (max_points - 2)
    
    # Sample intermediate points
    for i in range(1, max_points - 1):
        idx = int(i * step)
        if idx < len(waypoints) - 1:
            result.append(waypoints[idx])
    
    # Add last point
    result.append(waypoints[-1])
    
    return result


def create_fallback_result(waypoints: List[Dict], error: str = None) -> Dict:
    """
    Create a fallback result using straight-line distance calculation
    when OSRM map matching fails.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000  # Earth's radius in meters
        phi1, phi2 = radians(lat1), radians(lat2)
        dphi = radians(lat2 - lat1)
        dlambda = radians(lon2 - lon1)
        a = sin(dphi/2)**2 + cos(phi1) * cos(phi2) * sin(dlambda/2)**2
        return 2 * R * atan2(sqrt(a), sqrt(1-a))
    
    total_distance = 0
    for i in range(len(waypoints) - 1):
        wp1, wp2 = waypoints[i], waypoints[i+1]
        total_distance += haversine(
            wp1['latitude'], wp1['longitude'],
            wp2['latitude'], wp2['longitude']
        )
    
    return {
        "matched_coordinates": waypoints,
        "road_distance_meters": total_distance,
        "road_distance_miles": round(total_distance / 1609.344, 2),
        "confidence": 0,
        "geometry": None,
        "original_waypoint_count": len(waypoints),
        "matched_waypoint_count": len(waypoints),
        "error": error or "Using straight-line distance (map matching unavailable)",
        "is_fallback": True
    }


async def snap_single_point_to_road(latitude: float, longitude: float) -> Optional[Dict]:
    """
    Snap a single GPS point to the nearest road.
    """
    try:
        url = f"{OSRM_BASE_URL}/nearest/v1/driving/{longitude},{latitude}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            if data.get("code") != "Ok":
                return None
            
            waypoints = data.get("waypoints", [])
            if not waypoints:
                return None
            
            wp = waypoints[0]
            location = wp.get("location", [])
            
            return {
                "latitude": location[1],
                "longitude": location[0],
                "road_name": wp.get("name"),
                "distance_from_original": wp.get("distance", 0)
            }
            
    except Exception as e:
        logger.error(f"OSRM nearest error: {str(e)}")
        return None


def detect_gps_gaps(waypoints: List[Dict], time_gap_threshold: int = 60, distance_gap_threshold: float = 500) -> List[Dict]:
    """
    Detect gaps in GPS data where signal was lost.
    
    Args:
        waypoints: List of waypoints with 'latitude', 'longitude', and optionally 'timestamp'
        time_gap_threshold: Time gap in seconds that indicates lost signal (default: 60s)
        distance_gap_threshold: Distance gap in meters that indicates lost signal (default: 500m)
        
    Returns:
        List of gap objects with start_idx, end_idx, gap_type, and estimated_distance
    """
    from math import radians, sin, cos, sqrt, atan2
    from datetime import datetime
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000  # Earth's radius in meters
        phi1, phi2 = radians(lat1), radians(lat2)
        dphi = radians(lat2 - lat1)
        dlambda = radians(lon2 - lon1)
        a = sin(dphi/2)**2 + cos(phi1) * cos(phi2) * sin(dlambda/2)**2
        return 2 * R * atan2(sqrt(a), sqrt(1-a))
    
    def parse_timestamp(ts):
        if not ts:
            return None
        if isinstance(ts, datetime):
            return ts
        try:
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None
    
    gaps = []
    
    for i in range(len(waypoints) - 1):
        wp1, wp2 = waypoints[i], waypoints[i + 1]
        
        # Calculate distance between consecutive points
        distance = haversine(
            wp1['latitude'], wp1['longitude'],
            wp2['latitude'], wp2['longitude']
        )
        
        # Check for time gap
        time_gap = None
        ts1, ts2 = parse_timestamp(wp1.get('timestamp')), parse_timestamp(wp2.get('timestamp'))
        if ts1 and ts2:
            time_gap = (ts2 - ts1).total_seconds()
        
        # Identify if this is a gap
        is_gap = False
        gap_type = None
        
        if time_gap and time_gap > time_gap_threshold:
            is_gap = True
            gap_type = "time_gap"
        elif distance > distance_gap_threshold:
            is_gap = True
            gap_type = "distance_gap"
        
        if is_gap:
            gaps.append({
                "start_idx": i,
                "end_idx": i + 1,
                "start_point": wp1,
                "end_point": wp2,
                "gap_type": gap_type,
                "time_gap_seconds": time_gap,
                "straight_line_distance": distance
            })
    
    return gaps


async def fill_gaps_with_routing(waypoints: List[Dict], gaps: List[Dict]) -> Dict:
    """
    Fill detected GPS gaps using OSRM routing to get accurate road distance.
    
    Args:
        waypoints: Original waypoints
        gaps: Detected gaps from detect_gps_gaps()
        
    Returns:
        Dict with filled_waypoints, total_distance, and gap_fill_details
    """
    if not gaps:
        return {
            "filled_waypoints": waypoints,
            "total_gap_distance_meters": 0,
            "total_gap_distance_miles": 0,
            "gaps_filled": 0,
            "gap_details": []
        }
    
    filled_waypoints = []
    gap_details = []
    total_gap_distance = 0
    gap_indices = {g["start_idx"] for g in gaps}
    
    for i, wp in enumerate(waypoints):
        filled_waypoints.append(wp)
        
        # Check if there's a gap after this waypoint
        if i in gap_indices:
            gap = next(g for g in gaps if g["start_idx"] == i)
            
            # Get route between gap points
            route = await get_route_between_points(gap["start_point"], gap["end_point"])
            
            if route:
                gap_distance = route["distance_meters"]
                total_gap_distance += gap_distance
                
                # Extract intermediate coordinates from route geometry
                geometry = route.get("geometry")
                if geometry and geometry.get("coordinates"):
                    # Add intermediate points from the route (skip first and last as they're the gap boundaries)
                    coords = geometry["coordinates"]
                    if len(coords) > 2:
                        # Sample down to max 10 intermediate points per gap to avoid OSRM limits
                        intermediate_coords = coords[1:-1]
                        max_intermediate = 10
                        if len(intermediate_coords) > max_intermediate:
                            step = len(intermediate_coords) / max_intermediate
                            intermediate_coords = [intermediate_coords[int(i * step)] for i in range(max_intermediate)]
                        
                        for coord in intermediate_coords:
                            filled_waypoints.append({
                                "longitude": coord[0],
                                "latitude": coord[1],
                                "is_interpolated": True  # Mark as filled-in point
                            })
                
                gap_details.append({
                    "gap_index": i,
                    "gap_type": gap["gap_type"],
                    "time_gap_seconds": gap.get("time_gap_seconds"),
                    "straight_line_distance_m": gap["straight_line_distance"],
                    "road_distance_m": gap_distance,
                    "points_added": len(intermediate_coords) if geometry and geometry.get("coordinates") else 0,
                    "filled": True
                })
            else:
                # Could not get route, record the gap
                gap_details.append({
                    "gap_index": i,
                    "gap_type": gap["gap_type"],
                    "time_gap_seconds": gap.get("time_gap_seconds"),
                    "straight_line_distance_m": gap["straight_line_distance"],
                    "road_distance_m": None,
                    "filled": False
                })
    
    return {
        "filled_waypoints": filled_waypoints,
        "total_gap_distance_meters": total_gap_distance,
        "total_gap_distance_miles": round(total_gap_distance / 1609.344, 2),
        "gaps_filled": sum(1 for g in gap_details if g["filled"]),
        "gaps_detected": len(gaps),
        "gap_details": gap_details
    }


async def process_trip_with_gap_filling(waypoints: List[Dict]) -> Dict:
    """
    Full pipeline: detect gaps, fill them with routing, then road-match the complete route.
    
    This provides the most accurate mileage calculation by:
    1. Detecting where GPS signal was lost (time or distance gaps)
    2. Using OSRM routing to fill in the missing route segments
    3. Road-matching the complete route for final accuracy
    
    Args:
        waypoints: Original GPS waypoints from trip
        
    Returns:
        Complete result with filled waypoints, road-matched route, and accurate distance
    """
    if not waypoints or len(waypoints) < 2:
        return {
            "matched_coordinates": waypoints,
            "road_distance_miles": 0,
            "confidence": 0,
            "gaps_detected": 0,
            "gaps_filled": 0,
            "error": "Need at least 2 waypoints"
        }
    
    # Step 1: Detect GPS gaps
    gaps = detect_gps_gaps(waypoints)
    
    logger.info(f"Detected {len(gaps)} gaps in {len(waypoints)} waypoints")
    
    # Step 2: Fill gaps with routing
    fill_result = None
    if gaps:
        fill_result = await fill_gaps_with_routing(waypoints, gaps)
        filled_waypoints = fill_result["filled_waypoints"]
        logger.info(f"Filled {fill_result['gaps_filled']} gaps, added interpolated points")
    else:
        filled_waypoints = waypoints
    
    # Step 3: Road-match the complete route
    match_result = await match_waypoints_to_roads(filled_waypoints)
    
    # Combine results
    result = {
        **match_result,
        "gaps_detected": len(gaps),
        "gaps_filled": fill_result["gaps_filled"] if fill_result else 0,
        "gap_distance_miles": fill_result["total_gap_distance_miles"] if fill_result else 0,
        "gap_details": fill_result["gap_details"] if fill_result else [],
        "processing_method": "gap_filling_with_road_matching"
    }
    
    return result
