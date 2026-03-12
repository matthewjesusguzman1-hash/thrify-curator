from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timezone
import uuid
from collections import defaultdict
import time

from app.database import db
from app.dependencies import get_admin_user
from app.models.messages import MessageCreate, MessageResponse, UpdateMessageStatus
from app.services.recaptcha import verify_recaptcha_token

router = APIRouter(prefix="/messages", tags=["Messages"])

# Rate limiting storage - tracks submissions per IP
rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 300  # 5 minutes
RATE_LIMIT_MAX_REQUESTS = 3  # Max 3 messages per 5 minutes per IP


def check_rate_limit(ip: str) -> bool:
    """Check if IP has exceeded rate limit. Returns True if allowed, False if blocked."""
    current_time = time.time()
    # Clean old entries
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if current_time - t < RATE_LIMIT_WINDOW]
    # Check limit
    if len(rate_limit_store[ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    # Record this request
    rate_limit_store[ip].append(current_time)
    return True


@router.post("", response_model=MessageResponse)
async def create_message(message_data: MessageCreate, request: Request):
    """Public endpoint - anyone can send a message from the landing page"""
    
    # Honeypot check - if the hidden field is filled, it's likely a bot
    if message_data.website:
        # Silently reject but return success to fool bots
        return MessageResponse(
            id=str(uuid.uuid4()),
            sender_name=message_data.sender_name,
            sender_email=message_data.sender_email,
            message=message_data.message,
            submitted_at=datetime.now(timezone.utc).isoformat(),
            status="unread"
        )
    
    # Get client IP for rate limiting and reCAPTCHA
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # reCAPTCHA verification (if token provided - web only)
    if message_data.recaptcha_token:
        try:
            recaptcha_result = await verify_recaptcha_token(
                token=message_data.recaptcha_token,
                expected_action='contact_form_submit',
                remote_ip=client_ip
            )
            print(f"reCAPTCHA verification successful: score={recaptcha_result.get('score', 'N/A')}")
        except ValueError as e:
            print(f"reCAPTCHA verification failed: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Security verification failed. Please try again."
            )
    
    # Rate limiting check
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429, 
            detail="Too many messages. Please wait a few minutes before trying again."
        )
    
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
