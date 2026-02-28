from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# IRS Standard Mileage Rate for 2026
IRS_MILEAGE_RATE_2026 = 0.725  # $0.725 per mile


class MonthlyMileageEntry(BaseModel):
    """A single month's mileage entry"""
    id: str
    user_id: str
    user_name: str
    year: int
    month: int  # 1-12
    total_miles: float
    notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class MonthlyMileageCreate(BaseModel):
    """Request to create/update a monthly mileage entry"""
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    total_miles: float = Field(..., ge=0)
    notes: Optional[str] = None


class MonthlyMileageUpdate(BaseModel):
    """Request to update a monthly mileage entry"""
    total_miles: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class MonthlyMileageResponse(BaseModel):
    """Response for a monthly mileage entry with calculated values"""
    id: str
    user_id: str
    user_name: str
    year: int
    month: int
    month_name: str
    total_miles: float
    tax_deduction: float  # Calculated: total_miles * IRS_RATE
    notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class YearlySummary(BaseModel):
    """Summary of mileage for a full year"""
    year: int
    total_miles: float
    total_tax_deduction: float
    irs_rate: float
    monthly_entries: List[MonthlyMileageResponse]
    months_entered: int
    months_missing: List[int]  # List of month numbers not yet entered


class ReminderStatus(BaseModel):
    """Status of monthly reminder for a user"""
    year: int
    month: int
    month_name: str
    is_entered: bool
    is_dismissed: bool
    days_overdue: int


class DismissReminderRequest(BaseModel):
    """Request to dismiss a reminder for a specific month"""
    year: int
    month: int
