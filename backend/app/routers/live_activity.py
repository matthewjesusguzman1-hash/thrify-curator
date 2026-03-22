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

router = APIRouter(prefix="/live-activity", tags=["Live Activity"])


class RegisterTokenRequest(BaseModel):
    user_id: str
    push_token: str
    activity_type: str  # "admin" or "employee"


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
