"""
Live Activity API endpoints
Handles registration and updates for iOS Live Activities
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from app.services.apns_service import (
    register_live_activity_token,
    unregister_live_activity_token,
    update_admin_live_activities
)
from app.database import get_database

router = APIRouter(prefix="/live-activity", tags=["Live Activity"])


class RegisterTokenRequest(BaseModel):
    user_id: str
    push_token: str
    activity_type: str  # "admin" or "employee"


class RegisterDeviceTokenRequest(BaseModel):
    user_id: str
    device_token: str


class UpdateAdminActivityRequest(BaseModel):
    employee_count: int
    employee_names: List[str]


@router.post("/register-token")
async def register_token(request: RegisterTokenRequest):
    """Register a Live Activity push token for future updates"""
    try:
        await register_live_activity_token(
            user_id=request.user_id,
            push_token=request.push_token,
            activity_type=request.activity_type
        )
        return {"success": True, "message": "Token registered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register-device-token")
async def register_device_token(request: RegisterDeviceTokenRequest):
    """Register a device push token for regular notifications (clock-out alerts, messages, payments)"""
    try:
        db = get_database()
        
        # Determine user type from user_id format or additional context
        # For now, we'll store it without type and let the query handle it
        # The user_type will be set separately when we know the context
        await db.device_push_tokens.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "device_token": request.device_token,
                    "active": True,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    "user_type": "admin"  # Default to admin, will be updated by specific registration
                }
            },
            upsert=True
        )
        return {"success": True, "message": "Device token registered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RegisterDeviceTokenWithTypeRequest(BaseModel):
    user_id: str
    device_token: str
    user_type: str  # "admin", "employee", "consignor"


@router.post("/register-device-token-typed")
async def register_device_token_typed(request: RegisterDeviceTokenWithTypeRequest):
    """Register a device push token with explicit user type for targeted notifications"""
    try:
        db = get_database()
        await db.device_push_tokens.update_one(
            {"user_id": request.user_id, "user_type": request.user_type},
            {
                "$set": {
                    "device_token": request.device_token,
                    "active": True,
                    "user_type": request.user_type,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        return {"success": True, "message": f"Device token registered for {request.user_type}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unregister-token")
async def unregister_token(user_id: str, activity_type: str):
    """Unregister a Live Activity push token"""
    try:
        await unregister_live_activity_token(user_id, activity_type)
        return {"success": True, "message": "Token unregistered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-admin")
async def update_admin_activity(request: UpdateAdminActivityRequest):
    """
    Trigger an update to all active admin Live Activities
    Call this when employees clock in/out
    """
    try:
        await update_admin_live_activities(
            employee_count=request.employee_count,
            employee_names=request.employee_names
        )
        return {"success": True, "message": "Admin activities updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
