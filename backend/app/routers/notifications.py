from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.database import db
from app.dependencies import get_admin_user
from app.models.notifications import MarkReadRequest

router = APIRouter(prefix="/admin/notifications", tags=["Admin Notifications"])


@router.get("")
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


@router.post("/mark-read")
async def mark_notifications_read(request: MarkReadRequest = None, admin: dict = Depends(get_admin_user)):
    """Mark notifications as read"""
    notification_ids = request.notification_ids if request else None
    if notification_ids:
        await db.admin_notifications.update_many(
            {"id": {"$in": notification_ids}},
            {"$set": {"read": True}}
        )
    else:
        await db.admin_notifications.update_many(
            {"read": False},
            {"$set": {"read": True}}
        )
    return {"message": "Notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a specific notification"""
    result = await db.admin_notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}


@router.delete("")
async def clear_all_notifications(admin: dict = Depends(get_admin_user)):
    """Clear all notifications"""
    await db.admin_notifications.delete_many({})
    return {"message": "All notifications cleared"}
