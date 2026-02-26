from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "employee"
    hourly_rate: Optional[float] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    admin_code: Optional[str] = None  # Required for admin login


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    hourly_rate: Optional[float] = None
    phone: Optional[str] = None
    created_at: str
    has_w9: Optional[bool] = None
    w9_uploaded_at: Optional[str] = None
    w9_status: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CreateEmployee(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None


class UpdateEmployeeRate(BaseModel):
    hourly_rate: float


class UpdateEmployeeDetails(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    hourly_rate: Optional[float] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    pay_period_start_date: Optional[str] = None  # Custom pay period start date
    sync_pay_period_with: Optional[str] = None  # Employee ID to sync pay period with


class W9RejectRequest(BaseModel):
    reason: str
