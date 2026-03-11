from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/push", tags=["Push Notifications"])


class RegisterTokenRequest(BaseModel):
    token: str
    platform: str  # 'ios' or 'android'
    device_name: Optional[str] = None


class TestNotificationRequest(BaseModel):
    title: str
    body: str


@router.post("/register")
async def register_push_token(request: RegisterTokenRequest, user: dict = Depends(get_current_user)):
    """Register a device token for push notifications"""
    
    # Check if token already exists
    existing = await db.push_tokens.find_one({"token": request.token})
    
    if existing:
        # Update existing token
        await db.push_tokens.update_one(
            {"token": request.token},
            {"$set": {
                "user_id": user.get("user_id") or user.get("id"),
                "email": user.get("email"),
                "role": user.get("role", "employee"),
                "platform": request.platform,
                "device_name": request.device_name,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Token updated", "id": existing.get("id")}
    
    # Create new token registration
    token_doc = {
        "id": str(uuid.uuid4()),
        "token": request.token,
        "user_id": user.get("user_id") or user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "employee"),
        "platform": request.platform,
        "device_name": request.device_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.push_tokens.insert_one(token_doc)
    
    return {"message": "Token registered", "id": token_doc["id"]}


@router.delete("/unregister")
async def unregister_push_token(token: str, user: dict = Depends(get_current_user)):
    """Unregister a device token"""
    
    result = await db.push_tokens.delete_one({
        "token": token,
        "user_id": user.get("user_id") or user.get("id")
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Token not found")
    
    return {"message": "Token unregistered"}


@router.get("/status")
async def get_push_status(user: dict = Depends(get_current_user)):
    """Check if user has registered push tokens"""
    
    user_id = user.get("user_id") or user.get("id")
    tokens = await db.push_tokens.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "platform": 1, "device_name": 1, "created_at": 1}
    ).to_list(10)
    
    return {
        "registered": len(tokens) > 0,
        "devices": tokens
    }


@router.post("/test")
async def send_test_notification(request: TestNotificationRequest, admin: dict = Depends(get_admin_user)):
    """Send a test push notification to admin's devices"""
    from app.services.push_notifications import get_push_service
    
    push_service = get_push_service()
    
    admin_id = admin.get("user_id") or admin.get("id")
    tokens = await db.push_tokens.find(
        {"user_id": admin_id},
        {"_id": 0, "token": 1}
    ).to_list(10)
    
    if not tokens:
        raise HTTPException(status_code=400, detail="No devices registered for push notifications")
    
    token_list = [t["token"] for t in tokens]
    
    result = await push_service.send_notification(
        tokens=token_list,
        title=request.title,
        body=request.body,
        data={"type": "test"}
    )
    
    return result


@router.get("/admin/tokens")
async def get_all_tokens(admin: dict = Depends(get_admin_user)):
    """Get all registered push tokens (admin only)"""
    
    tokens = await db.push_tokens.find(
        {},
        {"_id": 0, "token": 0}  # Don't expose actual tokens
    ).to_list(100)
    
    return {
        "count": len(tokens),
        "tokens": tokens
    }
