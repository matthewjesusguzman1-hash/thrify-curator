from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List
from datetime import datetime, timezone
import uuid


class JobApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    address: str
    resume_text: str
    why_join: str
    availability: str
    tasks_able_to_perform: List[str] = []
    background_check_consent: bool = False
    has_reliable_transportation: bool = False
    additional_info: str = ""
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConsignmentInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    item_types: List[str] = []
    other_item_type: str = ""
    item_description: str
    item_condition: str
    smoke_free: bool = True
    pet_free: bool = True
    image_urls: List[str] = []
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConsignmentAgreement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    address: str
    items_description: str
    agreed_percentage: str
    signature: str
    signature_date: str = ""
    agreed_to_terms: bool
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UpdateSubmissionStatus(BaseModel):
    status: str  # "new", "reviewed", "contacted", "archived"
