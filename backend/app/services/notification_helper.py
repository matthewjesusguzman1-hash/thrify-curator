"""
Notification helper module that creates both in-app notifications and sends push notifications
"""
from datetime import datetime, timezone
import uuid

from app.database import db
from app.services.push_notifications import push_service, NotificationTemplates


async def create_notification_with_push(
    notification_type: str,
    entity_id: str,
    entity_name: str,
    message: str,
    details: dict = None,
    push_title: str = None,
    push_body: str = None
):
    """
    Create an in-app notification and optionally send a push notification
    
    Args:
        notification_type: Type of notification (e.g., 'job_application', 'clock_in')
        entity_id: ID of the related entity (employee, submission, etc.)
        entity_name: Name to display in notification
        message: In-app notification message
        details: Additional details dict
        push_title: Push notification title (optional, will auto-generate if not provided)
        push_body: Push notification body (optional, will use message if not provided)
    """
    # Create in-app notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "employee_id": entity_id,
        "employee_name": entity_name,
        "message": message,
        "details": details or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admin_notifications.insert_one(notification_doc)
    
    # Send push notification if service is enabled
    if push_service.enabled:
        # Use provided title/body or generate from template
        title = push_title or get_push_title(notification_type, entity_name)
        body = push_body or message
        
        await push_service.send_to_admins(
            db=db,
            title=title,
            body=body,
            notification_type=notification_type,
            data={
                "entity_id": entity_id,
                "entity_name": entity_name
            }
        )
    
    return notification_doc


def get_push_title(notification_type: str, entity_name: str) -> str:
    """Get a push notification title based on type"""
    titles = {
        "clock_in": "Employee Clocked In",
        "clock_out": "Employee Clocked Out",
        "w9_submission": "W-9 Submitted",
        "w9_submitted": "W-9 Submitted",
        "job_application": "New Job Application",
        "consignment_inquiry": "Consignment Inquiry",
        "consignment_agreement": "New Consignment Agreement",
        "payment_method_change": "Payment Method Updated",
        "consignment_items_added": "Items Added",
        "new_message": "New Message"
    }
    return titles.get(notification_type, "Thrifty Curator Alert")


# Convenience functions for specific notification types
async def notify_clock_in(employee_id: str, employee_name: str):
    template = NotificationTemplates.clock_in(employee_name)
    await create_notification_with_push(
        notification_type="clock_in",
        entity_id=employee_id,
        entity_name=employee_name,
        message=f"{employee_name} clocked in",
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_clock_out(employee_id: str, employee_name: str, hours: float):
    template = NotificationTemplates.clock_out(employee_name, hours)
    await create_notification_with_push(
        notification_type="clock_out",
        entity_id=employee_id,
        entity_name=employee_name,
        message=f"{employee_name} clocked out after {hours:.1f} hours",
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_w9_submitted(employee_id: str, employee_name: str):
    template = NotificationTemplates.w9_submitted(employee_name)
    await create_notification_with_push(
        notification_type="w9_submitted",
        entity_id=employee_id,
        entity_name=employee_name,
        message=f"{employee_name} has submitted their W-9 form for review",
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_job_application(application_id: str, applicant_name: str, email: str, phone: str = ""):
    template = NotificationTemplates.job_application(applicant_name)
    await create_notification_with_push(
        notification_type="job_application",
        entity_id=application_id,
        entity_name=applicant_name,
        message=f"New job application from {applicant_name}",
        details={"email": email, "phone": phone},
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_consignment_inquiry(inquiry_id: str, client_name: str, email: str):
    template = NotificationTemplates.consignment_inquiry(client_name)
    await create_notification_with_push(
        notification_type="consignment_inquiry",
        entity_id=inquiry_id,
        entity_name=client_name,
        message=f"New consignment inquiry from {client_name}",
        details={"email": email},
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_consignment_agreement(agreement_id: str, client_name: str, email: str):
    template = NotificationTemplates.consignment_agreement(client_name)
    await create_notification_with_push(
        notification_type="consignment_agreement",
        entity_id=agreement_id,
        entity_name=client_name,
        message=f"New consignment agreement signed by {client_name}",
        details={"email": email},
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_payment_method_change(change_id: str, client_name: str, new_method: str):
    template = NotificationTemplates.payment_method_change(client_name)
    await create_notification_with_push(
        notification_type="payment_method_change",
        entity_id=change_id,
        entity_name=client_name,
        message=f"Payment method changed by {client_name} to {new_method}",
        details={"new_method": new_method},
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_items_added(addition_id: str, client_name: str, count: int):
    template = NotificationTemplates.items_added(client_name, count)
    await create_notification_with_push(
        notification_type="consignment_items_added",
        entity_id=addition_id,
        entity_name=client_name,
        message=f"{client_name} added {count} new items for consignment",
        details={"items_count": count},
        push_title=template["title"],
        push_body=template["body"]
    )


async def notify_new_message(message_id: str, sender_name: str, sender_email: str):
    template = NotificationTemplates.new_message(sender_name)
    await create_notification_with_push(
        notification_type="new_message",
        entity_id=message_id,
        entity_name=sender_name,
        message=f"New message from {sender_name}",
        details={"email": sender_email},
        push_title=template["title"],
        push_body=template["body"]
    )
