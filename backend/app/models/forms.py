from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
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
    payment_method: str = ""  # Check, Venmo, PayPal, Zelle, CashApp, Apple Pay
    payment_details: str = ""  # Username/handle for the selected payment method
    additional_info: str = ""  # Additional information about items
    photos: List[str] = []  # List of uploaded photo URLs/paths
    signature: str
    signature_date: str = ""
    agreed_to_terms: bool
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PaymentMethodUpdate(BaseModel):
    email: str
    payment_method: str
    payment_details: str = ""


class ConsignmentItemAddition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agreement_id: str = ""  # Reference to original agreement
    full_name: str
    email: EmailStr
    items_to_add: int = 0
    items_description: str = ""  # Optional description of new items
    acknowledged_terms: bool = False
    update_email: Optional[str] = None  # New email if updating
    update_phone: Optional[str] = None  # New phone number if updating
    update_address: Optional[str] = None  # New address if updating
    update_payment_method: Optional[str] = None  # New payment method if updating
    update_payment_details: Optional[str] = None  # New payment details if updating
    update_profit_split: Optional[str] = None  # Custom profit split if updating
    additional_info: Optional[str] = None  # Additional information about items
    photos: List[str] = []  # List of uploaded photo URLs/paths
    signature: Optional[str] = None  # Electronic signature for the update
    signature_date: Optional[str] = None  # Date of signature
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UpdateSubmissionStatus(BaseModel):
    status: str  # "new", "reviewed", "contacted", "archived"
