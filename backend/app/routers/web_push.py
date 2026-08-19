"""
Web Push API routes for Safari/PWA push notification subscriptions
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_current_user, get_admin_user
from app.services.web_push_service import get_web_push_service

router = APIRouter(prefix="/web-push", tags=["Web Push Notifications"])


class WebPushSubscription(BaseModel):
    """Browser PushSubscription object"""
    endpoint: str
    keys: dict  # Contains 'auth' and 'p256dh'
    expirationTime: Optional[int] = None


class TestNotificationRequest(BaseModel):
    title: str = "Test Notification"
    body: str = "This is a test push notification from Thrifty Curator"


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for browser push subscription"""
    service = get_web_push_service()
    return {"publicKey": service.get_public_key()}


@router.post("/subscribe", status_code=201)
async def subscribe_to_push(
    subscription: WebPushSubscription,
    user: dict = Depends(get_current_user)
):
    """
    Register a browser push subscription
    Called after user grants notification permission
    """
    user_id = user.get("user_id") or user.get("id")
    user_email = user.get("email", "")
    user_role = user.get("role", "employee")
    
    # Prepare subscription document
    sub_doc = {
        "id": str(uuid.uuid4()),
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "expiration_time": subscription.expirationTime,
        "user_id": user_id,
        "email": user_email,
        "role": user_role,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert by endpoint (same browser = same endpoint)
    await db.web_push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": sub_doc},
        upsert=True
    )
    
    return {"message": "Subscription registered", "id": sub_doc["id"]}


@router.delete("/subscribe")
async def unsubscribe_from_push(
    endpoint: str,
    user: dict = Depends(get_current_user)
):
    """Unsubscribe a browser from push notifications"""
    result = await db.web_push_subscriptions.delete_one({"endpoint": endpoint})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Subscription removed"}


@router.get("/status")
async def get_push_status(user: dict = Depends(get_current_user)):
    """Check if user has active web push subscriptions"""
    user_id = user.get("user_id") or user.get("id")
    
    subscriptions = await db.web_push_subscriptions.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "created_at": 1}
    ).to_list(10)
    
    return {
        "subscribed": len(subscriptions) > 0,
        "subscription_count": len(subscriptions)
    }


@router.post("/test")
async def send_test_notification(
    request: TestNotificationRequest,
    admin: dict = Depends(get_admin_user)
):
    """Send a test push notification to the requesting admin's devices"""
    service = get_web_push_service()
    admin_id = admin.get("user_id") or admin.get("id")
    
    # Get admin's subscriptions
    subscriptions = await db.web_push_subscriptions.find(
        {"user_id": admin_id},
        {"_id": 0}
    ).to_list(10)
    
    if not subscriptions:
        raise HTTPException(
            status_code=400,
            detail="No web push subscriptions found. Enable notifications first."
        )
    
    sent = 0
    errors = []
    
    for sub in subscriptions:
        result = await service.send_notification(
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            title=request.title,
            body=request.body,
            url="/admin",
            tag="test"
        )
        
        if result.get("success"):
            sent += 1
        else:
            errors.append(result.get("error", "Unknown error"))
    
    return {
        "sent": sent,
        "total_subscriptions": len(subscriptions),
        "errors": errors[:3] if errors else []
    }


@router.get("/admin/subscriptions")
async def get_all_subscriptions(admin: dict = Depends(get_admin_user)):
    """Get all web push subscriptions (admin only, for debugging)"""
    subscriptions = await db.web_push_subscriptions.find(
        {},
        {"_id": 0, "endpoint": 0, "keys": 0}  # Don't expose sensitive data
    ).to_list(100)
    
    return {
        "count": len(subscriptions),
        "subscriptions": subscriptions
    }
