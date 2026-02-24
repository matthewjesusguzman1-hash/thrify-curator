from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.messages import MessageCreate, MessageResponse, UpdateMessageStatus

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("", response_model=MessageResponse)
async def create_message(message_data: MessageCreate):
    """Public endpoint - anyone can send a message from the landing page"""
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    message_doc = {
        "id": message_id,
        "sender_name": message_data.sender_name.strip(),
        "sender_email": message_data.sender_email.strip().lower(),
        "message": message_data.message.strip(),
        "submitted_at": now,
        "status": "unread"
    }
    
    await db.messages.insert_one(message_doc)
    
    # Create admin notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": "new_message",
        "message": f"New message from {message_data.sender_name}",
        "details": {
            "message_id": message_id,
            "sender_name": message_data.sender_name,
            "sender_email": message_data.sender_email,
            "preview": message_data.message[:100] + "..." if len(message_data.message) > 100 else message_data.message
        },
        "created_at": now,
        "read": False
    }
    await db.admin_notifications.insert_one(notification_doc)
    
    return MessageResponse(**message_doc)


# Admin endpoints
@router.get("/admin/all", response_model=List[MessageResponse])
async def get_all_messages(admin: dict = Depends(get_admin_user)):
    """Admin: Get all messages"""
    messages = await db.messages.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return [MessageResponse(**m) for m in messages]


@router.get("/admin/unread-count")
async def get_unread_count(admin: dict = Depends(get_admin_user)):
    """Admin: Get count of unread messages"""
    count = await db.messages.count_documents({"status": "unread"})
    return {"unread_count": count}


@router.put("/admin/{message_id}/status")
async def update_message_status(message_id: str, status_update: UpdateMessageStatus, admin: dict = Depends(get_admin_user)):
    """Admin: Update message status (mark as read/unread)"""
    result = await db.messages.update_one(
        {"id": message_id},
        {"$set": {"status": status_update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Status updated"}


@router.delete("/admin/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Delete a message"""
    result = await db.messages.delete_one({"id": message_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted"}
