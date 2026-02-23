from core.config import db, RESEND_API_KEY, SENDER_EMAIL, ADMIN_EMAIL
from models import AdminNotification
from datetime import datetime, timezone, timedelta
import resend
import asyncio

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 're_123_placeholder':
    resend.api_key = RESEND_API_KEY

async def get_employee_hours_summary(user_id: str) -> dict:
    """Get hours summary for an employee"""
    today = datetime.now(timezone.utc)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    
    entries = await db.time_entries.find(
        {"user_id": user_id, "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    today_hours = sum(
        e.get("total_hours", 0) for e in entries 
        if datetime.fromisoformat(e["clock_in"]) >= today_start
    )
    week_hours = sum(
        e.get("total_hours", 0) for e in entries
        if datetime.fromisoformat(e["clock_in"]) >= week_start
    )
    
    return {
        "today_hours": round(today_hours, 2),
        "week_hours": round(week_hours, 2)
    }

async def create_admin_notification(
    notification_type: str,
    employee_id: str,
    employee_name: str,
    message: str,
    details: dict = {}
):
    """Create a notification for all admins"""
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(100)
    
    for admin in admins:
        notification = AdminNotification(
            admin_id=admin["id"],
            notification_type=notification_type,
            employee_id=employee_id,
            employee_name=employee_name,
            message=message,
            details=details,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        await db.notifications.insert_one(notification.model_dump())

async def send_clock_notification_email(
    action: str,
    employee_name: str,
    timestamp: str,
    hours_summary: dict = None
):
    """Send email notification for clock in/out events"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_123_placeholder':
        return
    
    try:
        action_text = "clocked in" if action == "in" else "clocked out"
        
        # Format timestamp
        dt = datetime.fromisoformat(timestamp)
        formatted_time = dt.strftime("%I:%M %p on %B %d, %Y")
        
        if action == "out" and hours_summary:
            hours_info = f"""
            <p><strong>Hours Summary:</strong></p>
            <ul>
                <li>Today: {hours_summary.get('today_hours', 0)} hours</li>
                <li>This Week: {hours_summary.get('week_hours', 0)} hours</li>
            </ul>
            """
        else:
            hours_info = ""
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Thrifty Curator</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Employee Time Tracking</p>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #1A1A2E; margin-top: 0;">Employee {action_text.title()}</h2>
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p><strong>Employee:</strong> {employee_name}</p>
                    <p><strong>Action:</strong> {action_text.title()}</p>
                    <p><strong>Time:</strong> {formatted_time}</p>
                    {hours_info}
                </div>
            </div>
        </div>
        """
        
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": SENDER_EMAIL,
                "to": [ADMIN_EMAIL],
                "subject": f"🕐 {employee_name} has {action_text}",
                "html": html_content
            }
        )
    except Exception as e:
        print(f"Failed to send email notification: {e}")
