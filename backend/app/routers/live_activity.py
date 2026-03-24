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
    """Register a device push token with explicit user type for targeted notifications.
    
    When a user logs in on a device, we:
    1. Deactivate ALL other registrations for this device token (different users)
    2. Register/update the token for the current user
    
    This ensures only the currently logged-in user receives notifications on that device.
    """
    try:
        db = get_database()
        
        # First, deactivate ALL other registrations for this same device token
        # This prevents other users who previously logged in on this device from getting notifications
        await db.device_push_tokens.update_many(
            {
                "device_token": request.device_token,
                "$or": [
                    {"user_id": {"$ne": request.user_id}},
                    {"user_type": {"$ne": request.user_type}}
                ]
            },
            {"$set": {"active": False}}
        )
        
        # Now register/update the token for the current user
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
        
        print(f"Device token registered for {request.user_type} {request.user_id}, deactivated other users on same device")
        return {"success": True, "message": f"Device token registered for {request.user_type}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DeactivateDeviceTokenRequest(BaseModel):
    user_id: str
    user_type: str


@router.post("/deactivate-device-token")
async def deactivate_device_token(request: DeactivateDeviceTokenRequest):
    """Deactivate a device push token when user logs out.
    This prevents receiving notifications after logout.
    """
    try:
        db = get_database()
        result = await db.device_push_tokens.update_one(
            {"user_id": request.user_id, "user_type": request.user_type},
            {"$set": {"active": False}}
        )
        print(f"Deactivated device token for {request.user_type} {request.user_id}")
        return {"success": True, "deactivated": result.modified_count > 0}
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



@router.get("/debug/tokens")
async def debug_tokens():
    """Debug endpoint to view all registered tokens"""
    db = get_database()
    
    device_tokens = await db.device_push_tokens.find({}, {"_id": 0}).to_list(100)
    live_activity_tokens = await db.live_activity_tokens.find({}, {"_id": 0}).to_list(100)
    
    return {
        "device_push_tokens": device_tokens,
        "live_activity_tokens": live_activity_tokens
    }


@router.delete("/debug/clear-all-tokens")
async def clear_all_tokens():
    """Debug endpoint to clear all tokens for fresh testing"""
    db = get_database()
    
    device_result = await db.device_push_tokens.delete_many({})
    live_activity_result = await db.live_activity_tokens.delete_many({})
    
    return {
        "device_tokens_deleted": device_result.deleted_count,
        "live_activity_tokens_deleted": live_activity_result.deleted_count
    }
