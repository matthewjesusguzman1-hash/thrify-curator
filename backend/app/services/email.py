import asyncio
import logging
from datetime import datetime, timedelta, timezone
import resend

from app.config import RESEND_API_KEY, SENDER_EMAIL, ADMIN_EMAIL
from app.database import db
from app.models.notifications import AdminNotification

logger = logging.getLogger(__name__)

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 're_123_placeholder':
    resend.api_key = RESEND_API_KEY


async def get_employee_hours_summary(user_id: str) -> dict:
    """Get today's and weekly hours for an employee"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    
    entries = await db.time_entries.find(
        {"user_id": user_id, "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    today_hours = sum(
        e.get("total_hours", 0) for e in entries 
        if datetime.fromisoformat(e["clock_in"]) >= today
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
    """Create an in-app notification for admin"""
    notification = AdminNotification(
        type=notification_type,
        employee_id=employee_id,
        employee_name=employee_name,
        message=message,
        details=details
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    return notification


async def send_clock_notification_email(
    action: str,
    employee_name: str,
    timestamp: str,
    hours_summary: dict = None
):
    """Send email notification to admin for clock in/out events"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_123_placeholder':
        logger.info("Email notification skipped - no valid Resend API key configured")
        return None
    
    dt = datetime.fromisoformat(timestamp)
    formatted_time = dt.strftime("%I:%M %p")
    formatted_date = dt.strftime("%B %d, %Y")
    
    action_text = "clocked in" if action == "in" else "clocked out"
    action_color = "#22c55e" if action == "in" else "#ef4444"
    
    hours_html = ""
    if hours_summary:
        hours_html = f"""
        <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 10px; text-align: center; border-right: 1px solid #dee2e6;">
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">{hours_summary['today_hours']}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Hours Today</p>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">{hours_summary['week_hours']}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Hours This Week</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" style="max-width: 500px; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <tr>
                            <td style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #eee;">
                                <h1 style="margin: 0; font-size: 24px; color: #333;">Thrifty Curator</h1>
                                <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">Employee Time Tracking</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <div style="text-align: center; margin-bottom: 25px;">
                                    <span style="display: inline-block; padding: 8px 16px; background-color: {action_color}15; color: {action_color}; border-radius: 20px; font-weight: 600; font-size: 14px;">
                                        {'Clock In' if action == 'in' else 'Clock Out'}
                                    </span>
                                </div>
                                <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; text-align: center;">
                                    <strong>{employee_name}</strong> has {action_text}
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                                    <tr>
                                        <td style="padding: 15px; background-color: #faf7f2; border-radius: 8px; text-align: center;">
                                            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #C5A065;">{formatted_time}</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">{formatted_date}</p>
                                        </td>
                                    </tr>
                                </table>
                                {hours_html}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; background-color: #faf7f2; border-radius: 0 0 12px 12px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #888;">
                                    This is an automated notification from Thrifty Curator
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"[Thrifty Curator] {employee_name} {action_text} at {formatted_time}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Clock notification email sent successfully: {email.get('id')}")
        return email
    except Exception as e:
        logger.error(f"Failed to send clock notification email: {str(e)}")
        return None
