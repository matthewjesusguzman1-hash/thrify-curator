from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional


class PayrollSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "payroll_settings"
    pay_period_start_date: str
    default_hourly_rate: float = 15.00


class PayrollReportRequest(BaseModel):
    period_type: str  # "biweekly", "monthly", "yearly", "custom"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period_index: Optional[int] = 0
    hourly_rate: Optional[float] = None
    employee_id: Optional[str] = None


class ReportRequest(BaseModel):
    start_date: str
    end_date: str
    employee_id: Optional[str] = None


class EmailReportRequest(BaseModel):
    recipient_email: EmailStr
    report_data: dict


class EmailPayrollRequest(BaseModel):
    recipient_email: EmailStr
    report_data: dict
