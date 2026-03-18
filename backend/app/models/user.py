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
    password: Optional[str] = None  # Password for employee login


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    hourly_rate: Optional[float] = None
    phone: Optional[str] = None
    start_date: Optional[str] = None  # Employee's start/hire date
    created_at: str
    has_w9: Optional[bool] = None
    w9_uploaded_at: Optional[str] = None
    w9_status: Optional[str] = None
    admin_code: Optional[str] = None  # Admin access code (only for admin users)
    has_password: Optional[bool] = None  # Indicates if employee has set a password


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CreateEmployee(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = "employee"  # Default to employee
    admin_code: Optional[str] = None  # Required when role is admin


class UpdateEmployeeRate(BaseModel):
    hourly_rate: float


class UpdateEmployeeDetails(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    hourly_rate: Optional[float] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    start_date: Optional[str] = None  # Employee's start/hire date
    admin_code: Optional[str] = None  # Admin access code (required when role is admin)
    password: Optional[str] = None  # Update employee password


class SetEmployeePassword(BaseModel):
    password: str


class AdminResetEmployeePassword(BaseModel):
    employee_id: str
    new_password: str


class W9RejectRequest(BaseModel):
    reason: str
