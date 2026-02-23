from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class AdminNotification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "clock_in" or "clock_out"
    employee_id: str
    employee_name: str
    message: str
    details: dict = {}
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None
