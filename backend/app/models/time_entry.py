from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid


class TimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    clock_in: str
    clock_out: Optional[str] = None
    total_hours: Optional[float] = None
    shift_date: Optional[str] = None
    last_clock_in: Optional[str] = None
    accumulated_hours: Optional[float] = None
    admin_note: Optional[str] = None  # Note visible only to admins
    adjusted_by_admin: Optional[bool] = None  # Flag if hours were manually adjusted
    auto_clocked_out: Optional[bool] = None  # Flag if auto-clocked out (geofence or AnyDesk)
    anydesk_auto_clocked_out: Optional[bool] = None  # Flag if auto-clocked out by AnyDesk disconnect
    anydesk_auto_clock_out_note: Optional[str] = None  # Note for AnyDesk auto clock-out
    admin_clocked: Optional[bool] = None  # Flag if clocked in/out by admin


class ClockInOut(BaseModel):
    action: str  # "in" or "out"
    latitude: Optional[float] = None  # User's current latitude
    longitude: Optional[float] = None  # User's current longitude


class EditTimeEntryRequest(BaseModel):
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    total_hours: Optional[float] = None
    admin_note: Optional[str] = None  # Note for admin reference


class CreateTimeEntryRequest(BaseModel):
    employee_id: str
    clock_in: str
    clock_out: Optional[str] = None
