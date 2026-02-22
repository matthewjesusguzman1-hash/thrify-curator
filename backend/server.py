from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'thrifty-curator-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

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
    password: str

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
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
    password: str

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
        "password_hash": hash_password(employee_data.password),
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
