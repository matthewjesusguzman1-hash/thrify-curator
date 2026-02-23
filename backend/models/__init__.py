from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
import uuid

# ==================== User Models ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "employee"
    hourly_rate: Optional[float] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    hourly_rate: Optional[float] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CreateEmployee(BaseModel):
    name: str
    email: EmailStr

class UpdateEmployeeRate(BaseModel):
    hourly_rate: Optional[float] = None

class UpdateEmployeeDetails(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    hourly_rate: Optional[float] = None

# ==================== Time Entry Models ====================

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

# ==================== Form Models ====================

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
    tasks_able_to_perform: list = []
    background_check_consent: bool = False
    has_reliable_transportation: bool = False
    additional_info: str = ""
    submitted_at: str = ""

class ConsignmentInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    item_types: list = []
    other_item_type: str = ""
    item_description: str
    item_condition: str
    smoke_free: bool = True
    pet_free: bool = True
    image_urls: list = []
    submitted_at: str = ""

class ConsignmentAgreement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    address: str
    items_description: str
    agreed_percentage: str = "50-50"
    signature: str
    signature_date: str
    agreed_to_terms: bool = False
    submitted_at: str = ""

# ==================== Admin Models ====================

class AdminNotification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    notification_type: str
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    message: str
    details: dict = {}
    read: bool = False
    created_at: str = ""

class MarkReadRequest(BaseModel):
    notification_ids: list = []

class ReportRequest(BaseModel):
    start_date: str
    end_date: str
    employee_id: Optional[str] = None

class EmailReportRequest(BaseModel):
    start_date: str
    end_date: str
    employee_id: Optional[str] = None

class PayrollSettings(BaseModel):
    start_date: str
    period_length: int = 14
    default_hourly_rate: float = 15.00

class PayrollReportRequest(BaseModel):
    period_type: str = "biweekly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    custom_start: Optional[str] = None
    custom_end: Optional[str] = None

class PayrollEmailRequest(BaseModel):
    period_type: str = "biweekly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
