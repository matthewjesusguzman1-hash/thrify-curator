from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import resend
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'thrifty-curator-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24  # 24 hours

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'matthewjesusguzman1@gmail.com')

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 're_123_placeholder':
    resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== Models ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "employee"  # employee or admin

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
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    clock_in: str
    clock_out: Optional[str] = None
    total_hours: Optional[float] = None

class ClockInOut(BaseModel):
    action: str  # "in" or "out"

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

# ==================== Auth Helpers ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== Notification & Email Helpers ====================

async def get_employee_hours_summary(user_id: str) -> dict:
    """Get today's and weekly hours for an employee"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    
    entries = await db.time_entries.find(
        {"user_id": user_id, "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    today_hours = sum(
        e.get("total_hours", 0) for e in entries 
        if datetime.fromisoformat(e["clock_in"]) >= today
    )
    week_hours = sum(
        e.get("total_hours", 0) for e in entries 
        if datetime.fromisoformat(e["clock_in"]) >= week_start
    )
    
    return {
        "today_hours": round(today_hours, 2),
        "week_hours": round(week_hours, 2)
    }

async def create_admin_notification(
    notification_type: str, 
    employee_id: str, 
    employee_name: str, 
    message: str,
    details: dict = {}
):
    """Create an in-app notification for admin"""
    notification = AdminNotification(
        type=notification_type,
        employee_id=employee_id,
        employee_name=employee_name,
        message=message,
        details=details
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    return notification

async def send_clock_notification_email(
    action: str,  # "in" or "out"
    employee_name: str,
    timestamp: str,
    hours_summary: dict = None
):
    """Send email notification to admin for clock in/out events"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_123_placeholder':
        logger.info("Email notification skipped - no valid Resend API key configured")
        return None
    
    # Format timestamp
    dt = datetime.fromisoformat(timestamp)
    formatted_time = dt.strftime("%I:%M %p")
    formatted_date = dt.strftime("%B %d, %Y")
    
    action_text = "clocked in" if action == "in" else "clocked out"
    action_color = "#22c55e" if action == "in" else "#ef4444"
    
    # Build hours info HTML if available
    hours_html = ""
    if hours_summary:
        hours_html = f"""
        <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 10px; text-align: center; border-right: 1px solid #dee2e6;">
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">{hours_summary['today_hours']}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Hours Today</p>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">{hours_summary['week_hours']}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Hours This Week</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" style="max-width: 500px; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #eee;">
                                <h1 style="margin: 0; font-size: 24px; color: #333;">Thrifty Curator</h1>
                                <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">Employee Time Tracking</p>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <div style="text-align: center; margin-bottom: 25px;">
                                    <span style="display: inline-block; padding: 8px 16px; background-color: {action_color}15; color: {action_color}; border-radius: 20px; font-weight: 600; font-size: 14px;">
                                        {'Clock In' if action == 'in' else 'Clock Out'}
                                    </span>
                                </div>
                                
                                <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; text-align: center;">
                                    <strong>{employee_name}</strong> has {action_text}
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                                    <tr>
                                        <td style="padding: 15px; background-color: #faf7f2; border-radius: 8px; text-align: center;">
                                            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #C5A065;">{formatted_time}</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">{formatted_date}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                {hours_html}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: #faf7f2; border-radius: 0 0 12px 12px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #888;">
                                    This is an automated notification from Thrifty Curator
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"[Thrifty Curator] {employee_name} {action_text} at {formatted_time}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Clock notification email sent successfully: {email.get('id')}")
        return email
    except Exception as e:
        logger.error(f"Failed to send clock notification email: {str(e)}")
        return None

# ==================== Auth Routes ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email not registered. Contact your administrator.")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

# ==================== Time Tracking Routes ====================

@api_router.post("/time/clock", response_model=TimeEntry)
async def clock_in_out(action: ClockInOut, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    if action.action == "in":
        # Check if already clocked in
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        entry = TimeEntry(
            user_id=user["id"],
            user_name=user["name"],
            clock_in=now
        )
        await db.time_entries.insert_one(entry.model_dump())
        
        # Create in-app notification
        await create_admin_notification(
            notification_type="clock_in",
            employee_id=user["id"],
            employee_name=user["name"],
            message=f"{user['name']} has clocked in",
            details={"clock_in": now}
        )
        
        # Send email notification (non-blocking)
        asyncio.create_task(send_clock_notification_email(
            action="in",
            employee_name=user["name"],
            timestamp=now
        ))
        
        return entry
    
    elif action.action == "out":
        # Find active entry
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Not clocked in")
        
        # Calculate hours
        clock_in_time = datetime.fromisoformat(active["clock_in"])
        clock_out_time = datetime.fromisoformat(now)
        total_hours = round((clock_out_time - clock_in_time).total_seconds() / 3600, 2)
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {"$set": {"clock_out": now, "total_hours": total_hours}}
        )
        
        # Get hours summary for notification
        hours_summary = await get_employee_hours_summary(user["id"])
        # Add this shift's hours to today (since it was just completed)
        hours_summary["today_hours"] = round(hours_summary["today_hours"] + total_hours, 2)
        hours_summary["week_hours"] = round(hours_summary["week_hours"] + total_hours, 2)
        
        # Create in-app notification
        await create_admin_notification(
            notification_type="clock_out",
            employee_id=user["id"],
            employee_name=user["name"],
            message=f"{user['name']} has clocked out ({total_hours} hours)",
            details={
                "clock_in": active["clock_in"],
                "clock_out": now,
                "total_hours": total_hours,
                "today_hours": hours_summary["today_hours"],
                "week_hours": hours_summary["week_hours"]
            }
        )
        
        # Send email notification (non-blocking)
        asyncio.create_task(send_clock_notification_email(
            action="out",
            employee_name=user["name"],
            timestamp=now,
            hours_summary=hours_summary
        ))
        
        active["clock_out"] = now
        active["total_hours"] = total_hours
        return TimeEntry(**active)
    
    raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/time/status")
async def get_clock_status(user: dict = Depends(get_current_user)):
    active = await db.time_entries.find_one(
        {"user_id": user["id"], "clock_out": None}, {"_id": 0}
    )
    return {"clocked_in": active is not None, "entry": active}

@api_router.get("/time/entries", response_model=List[TimeEntry])
async def get_my_entries(user: dict = Depends(get_current_user)):
    entries = await db.time_entries.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("clock_in", -1).to_list(100)
    return entries

@api_router.get("/time/summary")
async def get_time_summary(user: dict = Depends(get_current_user)):
    entries = await db.time_entries.find(
        {"user_id": user["id"], "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) for e in entries)
    
    # This week
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_entries = [e for e in entries if datetime.fromisoformat(e["clock_in"]) >= week_start]
    week_hours = sum(e.get("total_hours", 0) for e in week_entries)
    
    return {
        "total_hours": round(total_hours, 2),
        "week_hours": round(week_hours, 2),
        "total_shifts": len(entries)
    }

# ==================== Admin Routes ====================

class CreateEmployee(BaseModel):
    name: str
    email: EmailStr

@api_router.post("/admin/create-employee", response_model=UserResponse)
async def create_employee(employee_data: CreateEmployee, admin: dict = Depends(get_admin_user)):
    # Check if user exists
    existing = await db.users.find_one({"email": employee_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": employee_data.email,
        "name": employee_data.name,
        "role": "employee",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=employee_data.email,
        name=employee_data.name,
        role="employee",
        created_at=user_doc["created_at"]
    )

@api_router.get("/admin/employees", response_model=List[UserResponse])
async def get_all_employees(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@api_router.delete("/admin/employees/{employee_id}")
async def delete_employee(employee_id: str, admin: dict = Depends(get_admin_user)):
    # Don't allow deleting yourself
    if employee_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if employee exists
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Delete employee
    await db.users.delete_one({"id": employee_id})
    
    # Also delete their time entries
    await db.time_entries.delete_many({"user_id": employee_id})
    
    return {"message": "Employee deleted successfully"}

class ReportRequest(BaseModel):
    start_date: str
    end_date: str
    employee_id: Optional[str] = None

@api_router.post("/admin/reports")
async def generate_report(report_req: ReportRequest, admin: dict = Depends(get_admin_user)):
    # Parse dates
    try:
        start = datetime.fromisoformat(report_req.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(report_req.end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Build query
    query = {
        "clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if report_req.employee_id:
        query["user_id"] = report_req.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    # Group by employee
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            employee_data[uid] = {
                "user_id": uid,
                "name": entry["user_name"],
                "total_hours": 0,
                "shifts": [],
                "shift_count": 0
            }
        employee_data[uid]["total_hours"] += entry.get("total_hours", 0)
        employee_data[uid]["shift_count"] += 1
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": entry.get("total_hours", 0)
        })
    
    # Calculate totals
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_shifts = sum(e["shift_count"] for e in employee_data.values())
    
    return {
        "period": {
            "start": report_req.start_date,
            "end": report_req.end_date
        },
        "summary": {
            "total_hours": round(total_hours, 2),
            "total_shifts": total_shifts,
            "employee_count": len(employee_data)
        },
        "by_employee": list(employee_data.values())
    }

@api_router.get("/admin/time-entries", response_model=List[TimeEntry])
async def get_all_time_entries(admin: dict = Depends(get_admin_user)):
    entries = await db.time_entries.find({}, {"_id": 0}).sort("clock_in", -1).to_list(500)
    return entries

@api_router.get("/admin/summary")
async def get_admin_summary(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    entries = await db.time_entries.find({"total_hours": {"$ne": None}}, {"_id": 0}).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) for e in entries)
    
    # Hours by user
    user_hours = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in user_hours:
            user_hours[uid] = {"name": entry["user_name"], "hours": 0, "shifts": 0}
        user_hours[uid]["hours"] += entry.get("total_hours", 0)
        user_hours[uid]["shifts"] += 1
    
    return {
        "total_employees": len(users),
        "total_hours": round(total_hours, 2),
        "total_shifts": len(entries),
        "by_employee": [{"user_id": k, **v} for k, v in user_hours.items()]
    }

# ==================== Admin Notifications Routes ====================

class MarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None

@api_router.get("/admin/notifications")
async def get_admin_notifications(admin: dict = Depends(get_admin_user), limit: int = 50):
    """Get recent notifications for admin"""
    notifications = await db.admin_notifications.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    unread_count = await db.admin_notifications.count_documents({"read": False})
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.post("/admin/notifications/mark-read")
async def mark_notifications_read(request: MarkReadRequest = None, admin: dict = Depends(get_admin_user)):
    """Mark notifications as read"""
    notification_ids = request.notification_ids if request else None
    if notification_ids:
        await db.admin_notifications.update_many(
            {"id": {"$in": notification_ids}},
            {"$set": {"read": True}}
        )
    else:
        # Mark all as read
        await db.admin_notifications.update_many(
            {"read": False},
            {"$set": {"read": True}}
        )
    return {"message": "Notifications marked as read"}

@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(notification_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a specific notification"""
    result = await db.admin_notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@api_router.delete("/admin/notifications")
async def clear_all_notifications(admin: dict = Depends(get_admin_user)):
    """Clear all notifications"""
    await db.admin_notifications.delete_many({})
    return {"message": "All notifications cleared"}

# ==================== Admin Time Entry Management ====================

class EditTimeEntryRequest(BaseModel):
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    total_hours: Optional[float] = None

@api_router.get("/admin/time-entries/{entry_id}")
async def get_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific time entry"""
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return entry

@api_router.put("/admin/time-entries/{entry_id}")
async def update_time_entry(entry_id: str, update_data: EditTimeEntryRequest, admin: dict = Depends(get_admin_user)):
    """Update a time entry (edit employee hours)"""
    # Check if entry exists
    entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    update_fields = {}
    
    if update_data.clock_in:
        try:
            datetime.fromisoformat(update_data.clock_in.replace('Z', '+00:00'))
            update_fields["clock_in"] = update_data.clock_in
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_in format")
    
    if update_data.clock_out:
        try:
            datetime.fromisoformat(update_data.clock_out.replace('Z', '+00:00'))
            update_fields["clock_out"] = update_data.clock_out
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
    # Calculate total hours if both times are set
    clock_in = update_data.clock_in or entry.get("clock_in")
    clock_out = update_data.clock_out or entry.get("clock_out")
    
    if clock_in and clock_out:
        try:
            in_time = datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
            out_time = datetime.fromisoformat(clock_out.replace('Z', '+00:00'))
            calculated_hours = round((out_time - in_time).total_seconds() / 3600, 2)
            update_fields["total_hours"] = calculated_hours
        except ValueError:
            pass
    elif update_data.total_hours is not None:
        update_fields["total_hours"] = update_data.total_hours
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.time_entries.update_one(
        {"id": entry_id},
        {"$set": update_fields}
    )
    
    # Return updated entry
    updated_entry = await db.time_entries.find_one({"id": entry_id}, {"_id": 0})
    return updated_entry

@api_router.delete("/admin/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a time entry"""
    result = await db.time_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return {"message": "Time entry deleted"}

class CreateTimeEntryRequest(BaseModel):
    employee_id: str
    clock_in: str
    clock_out: Optional[str] = None

@api_router.post("/admin/time-entries")
async def create_time_entry(entry_data: CreateTimeEntryRequest, admin: dict = Depends(get_admin_user)):
    """Create a manual time entry for an employee"""
    # Verify employee exists
    employee = await db.users.find_one({"id": entry_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Validate and parse clock_in
    try:
        clock_in_dt = datetime.fromisoformat(entry_data.clock_in.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid clock_in format")
    
    # Parse clock_out and calculate hours if provided
    clock_out_str = None
    total_hours = None
    
    if entry_data.clock_out:
        try:
            clock_out_dt = datetime.fromisoformat(entry_data.clock_out.replace('Z', '+00:00'))
            clock_out_str = entry_data.clock_out
            total_hours = round((clock_out_dt - clock_in_dt).total_seconds() / 3600, 2)
            
            if total_hours < 0:
                raise HTTPException(status_code=400, detail="Clock out must be after clock in")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid clock_out format")
    
    # Create the time entry
    entry = TimeEntry(
        user_id=entry_data.employee_id,
        user_name=employee["name"],
        clock_in=entry_data.clock_in,
        clock_out=clock_out_str,
        total_hours=total_hours
    )
    
    await db.time_entries.insert_one(entry.model_dump())
    
    return entry

# ==================== Form Submission Routes ====================

@api_router.post("/forms/job-application", response_model=JobApplication)
async def submit_job_application(application: JobApplication):
    doc = application.model_dump()
    await db.job_applications.insert_one(doc)
    return application

@api_router.post("/forms/consignment-inquiry", response_model=ConsignmentInquiry)
async def submit_consignment_inquiry(inquiry: ConsignmentInquiry):
    doc = inquiry.model_dump()
    await db.consignment_inquiries.insert_one(doc)
    return inquiry

@api_router.post("/forms/consignment-agreement", response_model=ConsignmentAgreement)
async def submit_consignment_agreement(agreement: ConsignmentAgreement):
    doc = agreement.model_dump()
    await db.consignment_agreements.insert_one(doc)
    return agreement

# ==================== Base Routes ====================

@api_router.get("/")
async def root():
    return {"message": "Thrifty Curator API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
