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
