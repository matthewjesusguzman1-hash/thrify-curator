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


class ClockInOut(BaseModel):
    action: str  # "in" or "out"


class EditTimeEntryRequest(BaseModel):
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    total_hours: Optional[float] = None


class CreateTimeEntryRequest(BaseModel):
    employee_id: str
    clock_in: str
    clock_out: Optional[str] = None
