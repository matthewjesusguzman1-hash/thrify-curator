"""Email logging router for tracking all sent emails."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies import get_admin_user
from app.database import get_database

router = APIRouter(prefix="/admin/email-logs", tags=["Email Logs"])


class EmailLogResponse(BaseModel):
    id: str
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    email_type: str  # e.g., "welcome", "password_reset", "interview_invite", etc.
    status: str  # "sent", "failed"
    sent_at: str
    context: Optional[dict] = None  # Additional context like employee_id, form_id, etc.


class EmailLogListResponse(BaseModel):
    logs: List[EmailLogResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=EmailLogListResponse)
async def get_email_logs(
    page: int = 1,
    page_size: int = 50,
    email_type: Optional[str] = None,
    recipient: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """Get paginated email logs with optional filtering."""
    db = get_database()
    
    # Build query filter
    query = {}
    if email_type:
        query["email_type"] = email_type
    if recipient:
        query["recipient_email"] = {"$regex": recipient, "$options": "i"}
    
    # Get total count
    total = await db.email_logs.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * page_size
    cursor = db.email_logs.find(query, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(page_size)
    logs = await cursor.to_list(length=page_size)
    
    return EmailLogListResponse(
        logs=logs,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/types")
async def get_email_types(current_user: dict = Depends(get_admin_user)):
    """Get distinct email types for filtering."""
    db = get_database()
    types = await db.email_logs.distinct("email_type")
    return {"types": types}


@router.get("/stats")
async def get_email_stats(current_user: dict = Depends(get_admin_user)):
    """Get email sending statistics."""
    db = get_database()
    
    # Get counts by type
    pipeline = [
        {"$group": {"_id": "$email_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    type_stats = await db.email_logs.aggregate(pipeline).to_list(length=100)
    
    # Get total sent today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.email_logs.count_documents({"sent_at": {"$gte": today_start.isoformat()}})
    
    # Get total sent this week
    from datetime import timedelta
    week_start = today_start - timedelta(days=today_start.weekday())
    week_count = await db.email_logs.count_documents({"sent_at": {"$gte": week_start.isoformat()}})
    
    # Get total
    total_count = await db.email_logs.count_documents({})
    
    return {
        "by_type": {item["_id"]: item["count"] for item in type_stats},
        "today": today_count,
        "this_week": week_count,
        "total": total_count
    }
