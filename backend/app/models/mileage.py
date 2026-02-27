from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TripPurpose(str, Enum):
    THRIFTING = "thrifting"
    POST_OFFICE = "post_office"
    OTHER = "other"


class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    timestamp: Optional[str] = None


class MileageEntryCreate(BaseModel):
    date: str
    start_location: Optional[LocationData] = None
    end_location: Optional[LocationData] = None
    start_address: Optional[str] = None
    end_address: Optional[str] = None
    total_miles: float = Field(..., ge=0)
    purpose: TripPurpose
    purpose_other: Optional[str] = None  # For custom purpose when "other" is selected
    notes: Optional[str] = None


class MileageEntryUpdate(BaseModel):
    date: Optional[str] = None
    start_address: Optional[str] = None
    end_address: Optional[str] = None
    total_miles: Optional[float] = Field(None, ge=0)
    purpose: Optional[TripPurpose] = None
    purpose_other: Optional[str] = None
    notes: Optional[str] = None


class MileageEntryResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = "Unknown"
    date: str
    start_location: Optional[LocationData] = None
    end_location: Optional[LocationData] = None
    start_address: Optional[str] = None
    end_address: Optional[str] = None
    total_miles: float
    purpose: str
    purpose_other: Optional[str] = None
    notes: Optional[str] = None
    is_tracking: bool = False
    waypoint_count: int = 0
    is_road_matched: bool = False
    match_confidence: float = 0
    gaps_detected: int = 0  # Number of GPS signal gaps found
    gaps_filled: int = 0  # Number of gaps filled with OSRM routing
    created_at: str
    updated_at: Optional[str] = None


class ActiveTripResponse(BaseModel):
    id: str
    user_id: str
    start_location: LocationData
    start_address: Optional[str] = None
    start_time: str
    waypoints: List[LocationData] = []
    is_paused: bool = False
    paused_at: Optional[str] = None
    total_paused_duration: float = 0.0  # Total paused time in seconds


class StartTripRequest(BaseModel):
    start_location: LocationData
    start_address: Optional[str] = None


class EndTripRequest(BaseModel):
    end_location: LocationData
    end_address: Optional[str] = None
    total_miles: float
    purpose: TripPurpose
    purpose_other: Optional[str] = None
    notes: Optional[str] = None


class UpdateTripLocationRequest(BaseModel):
    location: LocationData


class MileageSummary(BaseModel):
    total_miles: float
    total_trips: int
    by_purpose: dict
    monthly_totals: dict
