from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
import logging
import base64
from datetime import datetime, timezone
import jwt

from app.config import CORS_ORIGINS, JWT_SECRET, JWT_ALGORITHM
from app.database import db, close_db_connection
from app.routers import (
    auth_router,
    time_router,
    admin_router,
    notifications_router,
    payroll_router,
    forms_router,
    mileage_router
)
from app.routers.messages import router as messages_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Thrifty Curator API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

async def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
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


# Employee W-9 upload endpoint
@app.post("/api/time/w9/upload")
async def employee_upload_w9(file: UploadFile = File(...), user: dict = Depends(get_current_user_from_token)):
    """Employee uploads their completed W-9 form"""
    # Check if W-9 already approved
    existing = await db.w9_documents.find_one({"employee_id": user["id"]}, {"_id": 0})
    if existing and existing.get("status") == "approved":
        raise HTTPException(status_code=400, detail="W-9 already approved, cannot modify")
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")
    
    content = await file.read()
    
    # Size limit: 10MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    w9_doc = {
        "employee_id": user["id"],
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": "employee",
        "status": "pending_review",
        "rejection_reason": None  # Clear any previous rejection reason when resubmitting
    }
    
    await db.w9_documents.update_one(
        {"employee_id": user["id"]},
        {"$set": w9_doc},
        upsert=True
    )
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"has_w9": True, "w9_uploaded_at": w9_doc["uploaded_at"], "w9_status": "pending_review"}}
    )
    
    # Create notification for admin
    from app.models.notifications import AdminNotification
    notification = AdminNotification(
        type="w9_submitted",
        employee_id=user["id"],
        employee_name=user["name"],
        message=f"{user['name']} has submitted their W-9 form for review",
        details={"filename": file.filename, "submitted_at": w9_doc["uploaded_at"]}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return {
        "message": "W-9 uploaded successfully and pending review",
        "filename": file.filename,
        "status": "pending_review"
    }


# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(time_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(payroll_router, prefix="/api")
app.include_router(forms_router, prefix="/api")
app.include_router(mileage_router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "Thrifty Curator API", "version": "2.0.0"}


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_db_connection()
