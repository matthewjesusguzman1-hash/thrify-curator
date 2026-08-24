from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.database import db
from app.dependencies import get_admin_user
from app.models.notifications import MarkReadRequest

router = APIRouter(prefix="/admin/notifications", tags=["Admin Notifications"])


@router.get("")
async def get_admin_notifications(admin: dict = Depends(get_admin_user), limit: int = 50):
    """Get recent notifications for admin (excluding message notifications)
    
    Message notifications are handled separately by the Messages icon badge.
    The bell notification only shows non-message notifications like:
    - Clock in/out events
    - W-9 submissions
    - Job applications
    - Consignment inquiries/agreements
    - Payment method changes
    """
    # Exclude message-type notifications from bell - they show on Messages icon instead
    message_types = ["new_message", "employee_message", "consignor_message"]
    
    notifications = await db.admin_notifications.find(
        {"type": {"$nin": message_types}}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    unread_count = await db.admin_notifications.count_documents({
        "read": False,
        "type": {"$nin": message_types}
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.post("/mark-read")
async def mark_notifications_read(request: MarkReadRequest = None, admin: dict = Depends(get_admin_user)):
    """Mark notifications as read (excludes message notifications)"""
    message_types = ["new_message", "employee_message", "consignor_message"]
    notification_ids = request.notification_ids if request else None
    if notification_ids:
        await db.admin_notifications.update_many(
            {"id": {"$in": notification_ids}, "type": {"$nin": message_types}},
            {"$set": {"read": True}}
        )
    else:
        await db.admin_notifications.update_many(
            {"read": False, "type": {"$nin": message_types}},
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
    """Clear all notifications (excludes message notifications)"""
    message_types = ["new_message", "employee_message", "consignor_message"]
    await db.admin_notifications.delete_many({"type": {"$nin": message_types}})
    return {"message": "All notifications cleared"}
