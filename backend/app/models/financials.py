from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ExpenseCategory(str, Enum):
    SHIPPING_SUPPLIES = "shipping_supplies"
    SOFTWARE_SUBSCRIPTIONS = "software_subscriptions"
    EQUIPMENT = "equipment"
    HOME_OFFICE = "home_office"
    PHONE_INTERNET = "phone_internet"
    BUSINESS_LICENSES = "business_licenses"
    EDUCATION_TRAINING = "education_training"
    BANK_PAYMENT_FEES = "bank_payment_fees"
    VEHICLE_NON_MILEAGE = "vehicle_non_mileage"
    OFFICE_SUPPLIES = "office_supplies"
    PACKAGING_MATERIALS = "packaging_materials"
    ADVERTISING_MARKETING = "advertising_marketing"
    REPAIRS_MAINTENANCE = "repairs_maintenance"
    PROFESSIONAL_SERVICES = "professional_services"
    INSURANCE = "insurance"
    TRAVEL = "travel"
    MEALS = "meals"
    STORAGE_WAREHOUSE = "storage_warehouse"
    OTHER = "other"

class Platform(str, Enum):
    EBAY = "ebay"
    POSHMARK = "poshmark"
    MERCARI = "mercari"
    DEPOP = "depop"
    ETSY = "etsy"
    FB_MARKETPLACE = "fb_marketplace"
    AMAZON = "amazon"
    WHATNOT = "whatnot"
    IN_PERSON = "in_person"
    OTHER = "other"
    PROFIT = "profit"  # For tracking net profit separately

# Income/Sales Models
class IncomeEntry(BaseModel):
    id: Optional[str] = None
    year: int
    platform: Platform
    amount: float
    is_1099: bool = False
    date_received: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class Income1099(BaseModel):
    id: Optional[str] = None
    year: int
    platform: Platform
    amount: float
    date_received: str
    document_url: Optional[str] = None
    created_at: Optional[str] = None

# COGS Models
class COGSEntry(BaseModel):
    id: Optional[str] = None
    year: int
    date: str
    source: str
    description: Optional[str] = None
    amount: float
    item_count: Optional[int] = None
    receipt_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Expense/Deduction Models
class ExpenseEntry(BaseModel):
    id: Optional[str] = None
    year: int
    category: ExpenseCategory
    amount: float
    date: str
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# Mileage Models (manual entry for now)
class MileageEntry(BaseModel):
    id: Optional[str] = None
    year: int
    date: str
    miles: float
    purpose: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    created_at: Optional[str] = None

# Tax Document Models
class TaxDocument(BaseModel):
    id: Optional[str] = None
    year: int
    document_type: str  # "1099", "receipt", "license", "other"
    filename: str
    content_type: str
    content: str  # base64 encoded
    category: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: Optional[str] = None

# Tax Prep Progress Models
class TaxPrepProgress(BaseModel):
    year: int
    step1_complete: bool = False
    step2_complete: bool = False
    step3_complete: bool = False
    step4_complete: bool = False
    step5_complete: bool = False
    last_updated: Optional[str] = None

# Summary Models
class FinancialSummary(BaseModel):
    year: int
    gross_sales: float = 0
    cogs: float = 0
    gross_profit: float = 0
    total_expenses: float = 0
    mileage_deduction: float = 0
    total_deductions: float = 0
    net_profit: float = 0

class ExpenseSummaryByCategory(BaseModel):
    category: ExpenseCategory
    total: float
    count: int

# Request/Response Models
class CreateIncomeRequest(BaseModel):
    year: int
    platform: Platform
    amount: float
    is_1099: bool = False
    date_received: Optional[str] = None
    notes: Optional[str] = None

class CreateCOGSRequest(BaseModel):
    year: int
    date: str
    source: str
    description: Optional[str] = None
    amount: float
    item_count: Optional[int] = None

class CreateExpenseRequest(BaseModel):
    year: int
    category: ExpenseCategory
    amount: float
    date: str
    description: Optional[str] = None

class CreateMileageRequest(BaseModel):
    year: int
    date: str
    miles: float
    purpose: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
