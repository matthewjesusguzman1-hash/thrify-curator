"""
Interview Scheduler API

Provides endpoints for:
- Admin: Create/manage available time slots
- Admin: View scheduled interviews in calendar format
- Admin: Send direct emails to applicants
- Admin: Review applicant availability submissions and schedule interviews
- Applicants: Book available slots via unique link
- Applicants: Submit availability windows for admin review
- Applicants: Cancel/reschedule with reason
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets

from app.database import db
from app.dependencies import get_admin_user
from app.services.apns_service import send_admin_push_notification

router = APIRouter(prefix="/interview-scheduler", tags=["Interview Scheduler"])


# Helper to create admin notification
async def create_admin_notification(
    notification_type: str,
    applicant_name: str,
    message: str,
    details: dict = None
):
    """Create a notification for the admin dashboard"""
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "employee_id": details.get("applicant_id", "") if details else "",
        "employee_name": applicant_name,
        "message": message,
        "details": details or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(notification_doc)


# ==================== MODELS ====================

class TimeSlot(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM (24h)
    end_time: str  # HH:MM (24h)

class CreateSlotsRequest(BaseModel):
    slots: List[TimeSlot]

class BookSlotRequest(BaseModel):
    slot_id: str

class CancelBookingRequest(BaseModel):
    reason: str

class RescheduleRequest(BaseModel):
    new_slot_id: str
    reason: str

class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    message: str

class SendSMSRequest(BaseModel):
    to_phone: str
    message: str

class AvailabilityWindow(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM (24h)
    end_time: str  # HH:MM (24h)

class SubmitAvailabilityRequest(BaseModel):
    availability: List[AvailabilityWindow]

class ScheduleFromAvailabilityRequest(BaseModel):
    selected_datetime: str  # Full datetime in PHT format
    selected_datetime_ct: str  # Full datetime in CT format
    location: Optional[str] = "Thrifty Curator Store"


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/slots")
async def create_time_slots(request: CreateSlotsRequest, admin: dict = Depends(get_admin_user)):
    """Admin creates available interview time slots"""
    created_slots = []
    
    for slot in request.slots:
        slot_doc = {
            "id": str(uuid.uuid4()),
            "date": slot.date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "is_booked": False,
            "booked_by": None,
            "applicant_id": None,
            "booking_token": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("name", admin.get("email"))
        }
        await db.interview_slots.insert_one(slot_doc)
        slot_doc.pop("_id", None)
        created_slots.append(slot_doc)
    
    return {"success": True, "slots_created": len(created_slots), "slots": created_slots}


@router.get("/admin/slots")
async def get_all_slots(admin: dict = Depends(get_admin_user)):
    """Admin gets all time slots (available and booked)"""
    slots = await db.interview_slots.find({}, {"_id": 0}).sort([("date", 1), ("start_time", 1)]).to_list(500)
    return slots


@router.delete("/admin/slots/{slot_id}")
async def delete_slot(slot_id: str, admin: dict = Depends(get_admin_user)):
    """Admin deletes a time slot (only if not booked)"""
    slot = await db.interview_slots.find_one({"id": slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot.get("is_booked"):
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot. Cancel the booking first.")
    
    await db.interview_slots.delete_one({"id": slot_id})
    return {"success": True, "message": "Slot deleted"}


@router.get("/admin/bookings")
async def get_all_bookings(admin: dict = Depends(get_admin_user)):
    """Admin gets all booked interviews"""
    bookings = await db.interview_bookings.find({}, {"_id": 0}).sort("interview_date", 1).to_list(500)
    return bookings


@router.get("/admin/calendar")
async def get_calendar_view(admin: dict = Depends(get_admin_user)):
    """Admin gets calendar view of all slots and bookings"""
    slots = await db.interview_slots.find({}, {"_id": 0}).sort([("date", 1), ("start_time", 1)]).to_list(500)
    
    # Group by date for calendar view
    calendar = {}
    for slot in slots:
        date = slot["date"]
        if date not in calendar:
            calendar[date] = []
        calendar[date].append(slot)
    
    return {"calendar": calendar, "total_slots": len(slots)}


@router.post("/admin/send-invite/{application_id}")
async def send_scheduler_invite(application_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Admin sends scheduling link to an applicant"""
    from app.services.email_service import send_scheduler_invite_email
    
    # Get the application
    application = await db.job_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Generate unique booking token for this applicant
    booking_token = secrets.token_urlsafe(32)
    
    # Store the token with the application
    await db.job_applications.update_one(
        {"id": application_id},
        {"$set": {
            "scheduler_token": booking_token,
            "scheduler_invite_sent": True,
            "scheduler_invite_sent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send the email with booking link
    import os
    # Always use production URL for scheduling links
    frontend_url = "https://thrifty-curator.com"
    booking_url = f"{frontend_url}/schedule-interview/{booking_token}"
    
    background_tasks.add_task(
        send_scheduler_invite_email,
        to_email=application["email"],
        applicant_name=application["full_name"],
        booking_url=booking_url
    )
    
    return {
        "success": True, 
        "message": f"Scheduling invite sent to {application['email']}",
        "booking_url": booking_url
    }


@router.post("/admin/send-email")
async def admin_send_direct_email(request: SendEmailRequest, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Admin sends a direct email to anyone from the dashboard"""
    from app.services.email_service import send_direct_admin_email
    
    background_tasks.add_task(
        send_direct_admin_email,
        to_email=request.to_email,
        subject=request.subject,
        message=request.message,
        from_name=admin.get("name", "Thrifty Curator")
    )
    
    # Log the email
    email_log = {
        "id": str(uuid.uuid4()),
        "to_email": request.to_email,
        "subject": request.subject,
        "message": request.message,
        "sent_by": admin.get("name", admin.get("email")),
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_email_logs.insert_one(email_log)
    
    return {"success": True, "message": f"Email sent to {request.to_email}"}


@router.post("/admin/send-sms")
async def admin_send_direct_sms(request: SendSMSRequest, admin: dict = Depends(get_admin_user)):
    """Admin sends a direct SMS to anyone from the dashboard"""
    from app.services.sms_service import send_direct_sms
    
    result = await send_direct_sms(
        to_phone=request.to_phone,
        message=request.message,
        from_name=admin.get("name", "Thrifty Curator")
    )
    
    # Log the SMS
    sms_log = {
        "id": str(uuid.uuid4()),
        "to_phone": request.to_phone,
        "message": request.message,
        "sent_by": admin.get("name", admin.get("email")),
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": result.get("status"),
        "message_sid": result.get("message_sid")
    }
    await db.admin_sms_logs.insert_one(sms_log)
    
    if result["status"] == "success":
        return {"success": True, "message": f"SMS sent to {request.to_phone}"}
    else:
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to send SMS"))


@router.post("/admin/bookings/{booking_id}/cancel")
async def admin_cancel_booking(booking_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Admin cancels a booking"""
    from app.services.email_service import send_interview_cancelled_email
    
    booking = await db.interview_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Free up the slot
    await db.interview_slots.update_one(
        {"id": booking["slot_id"]},
        {"$set": {
            "is_booked": False,
            "booked_by": None,
            "applicant_id": None,
            "booking_token": None
        }}
    )
    
    # Update booking status
    await db.interview_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "cancelled_by_admin",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": admin.get("name", "Admin")
        }}
    )
    
    # Notify applicant
    background_tasks.add_task(
        send_interview_cancelled_email,
        to_email=booking["applicant_email"],
        applicant_name=booking["applicant_name"],
        interview_date=booking["interview_date"],
        interview_time=booking["interview_time"],
        cancelled_by="admin"
    )
    
    return {"success": True, "message": "Booking cancelled and applicant notified"}


# ==================== PUBLIC/APPLICANT ENDPOINTS ====================

@router.get("/available-slots/{token}")
async def get_available_slots_for_applicant(token: str):
    """Applicant gets available slots using their unique token"""
    # Verify token
    application = await db.job_applications.find_one({"scheduler_token": token}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Invalid or expired booking link")
    
    # Check if already booked
    existing_booking = await db.interview_bookings.find_one({
        "applicant_id": application["id"],
        "status": {"$in": ["confirmed", "pending"]}
    })
    
    if existing_booking:
        return {
            "already_booked": True,
            "booking": {
                "id": existing_booking["id"],
                "date": existing_booking["interview_date"],
                "time": existing_booking["interview_time"],
                "status": existing_booking["status"]
            },
            "applicant_name": application["full_name"]
        }
    
    # Get available (unbooked) slots
    slots = await db.interview_slots.find(
        {"is_booked": False, "date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
        {"_id": 0}
    ).sort([("date", 1), ("start_time", 1)]).to_list(100)
    
    return {
        "already_booked": False,
        "slots": slots,
        "applicant_name": application["full_name"],
        "applicant_email": application["email"]
    }


@router.post("/book/{token}")
async def book_slot(token: str, request: BookSlotRequest, background_tasks: BackgroundTasks):
    """Applicant books a time slot"""
    from app.services.email_service import send_interview_confirmation_email
    
    # Verify token
    application = await db.job_applications.find_one({"scheduler_token": token}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Invalid or expired booking link")
    
    # Check if already has a booking
    existing = await db.interview_bookings.find_one({
        "applicant_id": application["id"],
        "status": {"$in": ["confirmed", "pending"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an interview scheduled")
    
    # Get and verify slot is available
    slot = await db.interview_slots.find_one({"id": request.slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    if slot.get("is_booked"):
        raise HTTPException(status_code=400, detail="This time slot is no longer available")
    
    # Create booking
    booking_id = str(uuid.uuid4())
    cancel_token = secrets.token_urlsafe(16)
    
    booking = {
        "id": booking_id,
        "slot_id": slot["id"],
        "applicant_id": application["id"],
        "applicant_name": application["full_name"],
        "applicant_email": application["email"],
        "applicant_phone": application.get("phone"),
        "interview_date": slot["date"],
        "interview_time": f"{slot['start_time']} - {slot['end_time']}",
        "status": "confirmed",
        "cancel_token": cancel_token,
        "booked_at": datetime.now(timezone.utc).isoformat()
    }
    await db.interview_bookings.insert_one(booking)
    
    # Mark slot as booked
    await db.interview_slots.update_one(
        {"id": slot["id"]},
        {"$set": {
            "is_booked": True,
            "booked_by": application["full_name"],
            "applicant_id": application["id"],
            "booking_id": booking_id
        }}
    )
    
    # Update application
    await db.job_applications.update_one(
        {"id": application["id"]},
        {"$set": {
            "interview_scheduled": True,
            "interview_booking_id": booking_id,
            "interview_date": slot["date"],
            "interview_time": f"{slot['start_time']} - {slot['end_time']}"
        }}
    )
    
    # Send confirmation email
    # Always use production URL
    frontend_url = "https://thrifty-curator.com"
    manage_url = f"{frontend_url}/manage-interview/{cancel_token}"
    
    background_tasks.add_task(
        send_interview_confirmation_email,
        to_email=application["email"],
        applicant_name=application["full_name"],
        interview_date=slot["date"],
        interview_time=f"{slot['start_time']} - {slot['end_time']}",
        manage_url=manage_url
    )
    
    # Create admin notification for booked interview
    await create_admin_notification(
        notification_type="interview_booked",
        applicant_name=application["full_name"],
        message=f"{application['full_name']} booked an interview",
        details={
            "applicant_id": application["id"],
            "interview_date": slot["date"],
            "interview_time": f"{slot['start_time']} - {slot['end_time']}",
            "booking_id": booking_id
        }
    )
    
    # Send push notification
    background_tasks.add_task(
        send_admin_push_notification,
        title="Interview Booked",
        body=f"{application['full_name']} booked an interview for {slot['date']}",
        notification_type="interview_booked"
    )
    
    booking.pop("_id", None)
    return {"success": True, "booking": booking, "manage_url": manage_url}


@router.get("/manage/{cancel_token}")
async def get_booking_details(cancel_token: str):
    """Get booking details for manage/cancel page"""
    booking = await db.interview_bookings.find_one({"cancel_token": cancel_token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get available slots for rescheduling
    available_slots = []
    if booking["status"] == "confirmed":
        available_slots = await db.interview_slots.find(
            {"is_booked": False, "date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}},
            {"_id": 0}
        ).sort([("date", 1), ("start_time", 1)]).to_list(50)
    
    return {
        "booking": booking,
        "available_slots": available_slots
    }


@router.post("/cancel/{cancel_token}")
async def cancel_booking(cancel_token: str, request: CancelBookingRequest, background_tasks: BackgroundTasks):
    """Applicant cancels their booking"""
    from app.services.email_service import send_interview_cancelled_email, send_admin_interview_cancelled_notification
    
    booking = await db.interview_bookings.find_one({"cancel_token": cancel_token})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="This booking cannot be cancelled")
    
    # Free up the slot
    await db.interview_slots.update_one(
        {"id": booking["slot_id"]},
        {"$set": {
            "is_booked": False,
            "booked_by": None,
            "applicant_id": None,
            "booking_id": None
        }}
    )
    
    # Update booking
    await db.interview_bookings.update_one(
        {"id": booking["id"]},
        {"$set": {
            "status": "cancelled_by_applicant",
            "cancel_reason": request.reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update application
    await db.job_applications.update_one(
        {"id": booking["applicant_id"]},
        {"$set": {
            "interview_scheduled": False,
            "interview_cancelled": True,
            "interview_cancel_reason": request.reason
        }}
    )
    
    # Send confirmation to applicant (email)
    background_tasks.add_task(
        send_interview_cancelled_email,
        to_email=booking["applicant_email"],
        applicant_name=booking["applicant_name"],
        interview_date=booking["interview_date"],
        interview_time=booking["interview_time"],
        cancelled_by="applicant"
    )
    
    # Create admin notification for cancelled interview
    await create_admin_notification(
        notification_type="interview_cancelled",
        applicant_name=booking["applicant_name"],
        message=f"{booking['applicant_name']} cancelled their interview",
        details={
            "applicant_id": booking["applicant_id"],
            "interview_date": booking["interview_date"],
            "interview_time": booking["interview_time"],
            "cancel_reason": request.reason
        }
    )
    
    # Send push notification
    background_tasks.add_task(
        send_admin_push_notification,
        title="Interview Cancelled",
        body=f"{booking['applicant_name']} cancelled their interview",
        notification_type="interview_cancelled"
    )
    
    # Notify admin via email as well
    background_tasks.add_task(
        send_admin_interview_cancelled_notification,
        applicant_name=booking["applicant_name"],
        interview_date=booking["interview_date"],
        interview_time=booking["interview_time"],
        cancel_reason=request.reason
    )
    
    return {"success": True, "message": "Interview cancelled successfully"}


@router.post("/reschedule/{cancel_token}")
async def reschedule_booking(cancel_token: str, request: RescheduleRequest, background_tasks: BackgroundTasks):
    """Applicant reschedules their booking"""
    from app.services.email_service import send_interview_rescheduled_email
    
    booking = await db.interview_bookings.find_one({"cancel_token": cancel_token})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="This booking cannot be rescheduled")
    
    # Get new slot
    new_slot = await db.interview_slots.find_one({"id": request.new_slot_id})
    if not new_slot:
        raise HTTPException(status_code=404, detail="New time slot not found")
    if new_slot.get("is_booked"):
        raise HTTPException(status_code=400, detail="This time slot is no longer available")
    
    # Free up old slot
    await db.interview_slots.update_one(
        {"id": booking["slot_id"]},
        {"$set": {
            "is_booked": False,
            "booked_by": None,
            "applicant_id": None,
            "booking_id": None
        }}
    )
    
    # Book new slot
    await db.interview_slots.update_one(
        {"id": new_slot["id"]},
        {"$set": {
            "is_booked": True,
            "booked_by": booking["applicant_name"],
            "applicant_id": booking["applicant_id"],
            "booking_id": booking["id"]
        }}
    )
    
    old_date = booking["interview_date"]
    old_time = booking["interview_time"]
    
    # Update booking
    await db.interview_bookings.update_one(
        {"id": booking["id"]},
        {"$set": {
            "slot_id": new_slot["id"],
            "interview_date": new_slot["date"],
            "interview_time": f"{new_slot['start_time']} - {new_slot['end_time']}",
            "reschedule_reason": request.reason,
            "rescheduled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update application
    await db.job_applications.update_one(
        {"id": booking["applicant_id"]},
        {"$set": {
            "interview_date": new_slot["date"],
            "interview_time": f"{new_slot['start_time']} - {new_slot['end_time']}"
        }}
    )
    
    # Send confirmation
    # Always use production URL
    frontend_url = "https://thrifty-curator.com"
    manage_url = f"{frontend_url}/manage-interview/{cancel_token}"
    
    # Send email confirmation
    background_tasks.add_task(
        send_interview_rescheduled_email,
        to_email=booking["applicant_email"],
        applicant_name=booking["applicant_name"],
        old_date=old_date,
        old_time=old_time,
        new_date=new_slot["date"],
        new_time=f"{new_slot['start_time']} - {new_slot['end_time']}",
        manage_url=manage_url
    )
    
    # Create admin notification for rescheduled interview
    await create_admin_notification(
        notification_type="interview_rescheduled",
        applicant_name=booking["applicant_name"],
        message=f"{booking['applicant_name']} rescheduled their interview",
        details={
            "applicant_id": booking["applicant_id"],
            "old_date": old_date,
            "old_time": old_time,
            "new_date": new_slot["date"],
            "new_time": f"{new_slot['start_time']} - {new_slot['end_time']}",
            "reschedule_reason": request.reason
        }
    )
    
    # Send push notification
    background_tasks.add_task(
        send_admin_push_notification,
        title="Interview Rescheduled",
        body=f"{booking['applicant_name']} rescheduled to {new_slot['date']}",
        notification_type="interview_rescheduled"
    )
    
    return {
        "success": True, 
        "message": "Interview rescheduled successfully",
        "new_date": new_slot["date"],
        "new_time": f"{new_slot['start_time']} - {new_slot['end_time']}"
    }



# ==================== POST-INTERVIEW REJECTION ====================

@router.get("/admin/booking/{booking_id}/rejection-preview")
async def get_post_interview_rejection_preview(booking_id: str, admin: dict = Depends(get_admin_user)):
    """Get a preview of the post-interview rejection email"""
    from app.services.email_service import get_post_interview_rejection_preview
    
    booking = await db.interview_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    preview = get_post_interview_rejection_preview(booking["applicant_name"])
    return {
        "applicant_name": booking["applicant_name"],
        "applicant_email": booking["applicant_email"],
        "interview_date": booking.get("interview_date", ""),
        "interview_time": booking.get("interview_time", ""),
        **preview
    }


@router.post("/admin/booking/{booking_id}/send-rejection")
async def send_post_interview_rejection(booking_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Send a rejection email to an applicant after their interview"""
    from app.services.email_service import send_post_interview_rejection_email
    import os
    
    booking = await db.interview_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if already rejected
    if booking.get("rejection_sent"):
        raise HTTPException(status_code=400, detail="Rejection email already sent")
    
    # Generate a unique token for the keep-on-file response
    response_token = secrets.token_urlsafe(16)
    
    # Update the booking with rejection status
    await db.interview_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "rejection_sent": True,
            "rejection_sent_at": datetime.now(timezone.utc).isoformat(),
            "rejection_sent_by": admin.get("name", admin.get("email", "Admin")),
            "keep_on_file_token": response_token,
            "keep_on_file_response": None
        }}
    )
    
    # Also update the job application if it exists
    if booking.get("applicant_id"):
        await db.job_applications.update_one(
            {"id": booking["applicant_id"]},
            {"$set": {
                "status": "rejected_after_interview",
                "rejection_sent_at": datetime.now(timezone.utc).isoformat(),
                "keep_on_file_token": response_token,
                "keep_on_file_response": None
            }}
        )
    
    # Build the response URL - always use production URL
    frontend_url = "https://thrifty-curator.com"
    keep_on_file_url = f"{frontend_url}/application-response/{response_token}"
    
    # Send the email
    background_tasks.add_task(
        send_post_interview_rejection_email,
        to_email=booking["applicant_email"],
        applicant_name=booking["applicant_name"],
        keep_on_file_url=keep_on_file_url
    )
    
    return {"message": "Rejection email sent successfully", "applicant_name": booking["applicant_name"]}


# ==================== AVAILABILITY-BASED SCHEDULING (NEW FLOW) ====================

@router.post("/admin/send-availability-request/{application_id}")
async def send_availability_request(application_id: str, request: Request, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Admin sends a link for applicant to submit their availability (like video interview flow)"""
    from app.services.email_service import send_availability_request_email
    
    # Get request body
    body = await request.json()
    date_range_start = body.get("date_range_start", "")
    date_range_end = body.get("date_range_end", "")
    time_range_start = body.get("time_range_start", "")
    time_range_end = body.get("time_range_end", "")
    
    application = await db.job_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Generate unique token for availability submission
    availability_token = secrets.token_urlsafe(32)
    
    # Create or update availability request record
    existing = await db.inperson_availability_requests.find_one({"applicant_id": application_id})
    
    if existing:
        # Update existing request
        await db.inperson_availability_requests.update_one(
            {"applicant_id": application_id},
            {"$set": {
                "token": availability_token,
                "status": "pending",
                "date_range_start": date_range_start,
                "date_range_end": date_range_end,
                "time_range_start": time_range_start,
                "time_range_end": time_range_end,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "sent_by": admin.get("name", admin.get("email"))
            }}
        )
        request_id = existing["id"]
    else:
        # Create new request
        request_id = str(uuid.uuid4())
        request_doc = {
            "id": request_id,
            "applicant_id": application_id,
            "applicant_name": application["full_name"],
            "applicant_email": application["email"],
            "applicant_phone": application.get("phone"),
            "token": availability_token,
            "status": "pending",  # pending, responded, scheduled, confirmed
            "date_range_start": date_range_start,
            "date_range_end": date_range_end,
            "time_range_start": time_range_start,
            "time_range_end": time_range_end,
            "availability": [],
            "scheduled_datetime": None,
            "scheduled_datetime_ct": None,
            "scheduled_location": None,
            "confirmed_datetime": None,
            "confirmed_datetime_ct": None,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "sent_by": admin.get("name", admin.get("email")),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.inperson_availability_requests.insert_one(request_doc)
    
    # Update application
    await db.job_applications.update_one(
        {"id": application_id},
        {"$set": {
            "availability_request_sent": True,
            "availability_request_sent_at": datetime.now(timezone.utc).isoformat(),
            "availability_token": availability_token
        }}
    )
    
    # Send email with availability link
    frontend_url = "https://thrifty-curator.com"
    availability_url = f"{frontend_url}/submit-availability/{availability_token}"
    
    background_tasks.add_task(
        send_availability_request_email,
        to_email=application["email"],
        applicant_name=application["full_name"],
        availability_url=availability_url,
        date_range_start=date_range_start,
        date_range_end=date_range_end,
        time_range_start=time_range_start,
        time_range_end=time_range_end
    )
    
    return {
        "success": True,
        "message": f"Availability request sent to {application['email']}",
        "availability_url": availability_url
    }


@router.get("/availability/{token}")
async def get_availability_request_for_applicant(token: str):
    """Get availability request details for an applicant"""
    request = await db.inperson_availability_requests.find_one({"token": token}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    
    # Check if already responded
    if request["status"] == "confirmed":
        return {
            "already_confirmed": True,
            "applicant_name": request["applicant_name"],
            "confirmed_datetime": request.get("confirmed_datetime"),
            "confirmed_location": request.get("scheduled_location", "Thrifty Curator Store")
        }
    
    if request["status"] == "scheduled":
        return {
            "already_scheduled": True,
            "applicant_name": request["applicant_name"],
            "message": "Your interview is being scheduled. You'll receive a confirmation email soon."
        }
    
    return {
        "applicant_name": request["applicant_name"],
        "applicant_email": request["applicant_email"],
        "existing_availability": request.get("availability", []),
        "date_range_start": request.get("date_range_start", ""),
        "date_range_end": request.get("date_range_end", ""),
        "time_range_start": request.get("time_range_start", ""),
        "time_range_end": request.get("time_range_end", ""),
        "status": request["status"]
    }


@router.post("/availability/{token}")
async def submit_availability(token: str, request: SubmitAvailabilityRequest, background_tasks: BackgroundTasks):
    """Applicant submits their availability windows"""
    avail_request = await db.inperson_availability_requests.find_one({"token": token})
    if not avail_request:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    
    if avail_request["status"] == "confirmed":
        raise HTTPException(status_code=400, detail="Your interview is already confirmed")
    
    # Store availability
    availability_data = [
        {
            "date": a.date,
            "start_time": a.start_time,
            "end_time": a.end_time
        }
        for a in request.availability
    ]
    
    await db.inperson_availability_requests.update_one(
        {"token": token},
        {"$set": {
            "availability": availability_data,
            "status": "responded",
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create admin notification
    await create_admin_notification(
        notification_type="availability_submitted",
        applicant_name=avail_request["applicant_name"],
        message=f"{avail_request['applicant_name']} submitted interview availability",
        details={
            "applicant_id": avail_request["applicant_id"],
            "availability_count": len(availability_data)
        }
    )
    
    # Send push notification
    background_tasks.add_task(
        send_admin_push_notification,
        title="Interview Availability Submitted",
        body=f"{avail_request['applicant_name']} submitted {len(availability_data)} availability window(s)",
        notification_type="availability_submitted"
    )
    
    return {
        "success": True,
        "message": "Availability submitted! You'll receive a confirmation email once your interview is scheduled."
    }


@router.get("/admin/availability-inbox")
async def get_availability_inbox(admin: dict = Depends(get_admin_user)):
    """Get all in-person availability requests for admin review"""
    requests = await db.inperson_availability_requests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"requests": requests}


@router.get("/admin/availability-inbox/{request_id}")
async def get_availability_request_detail(request_id: str, admin: dict = Depends(get_admin_user)):
    """Get details of a specific availability request"""
    request = await db.inperson_availability_requests.find_one(
        {"id": request_id},
        {"_id": 0}
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.delete("/admin/availability-inbox/{request_id}")
async def delete_availability_request(request_id: str, admin: dict = Depends(get_admin_user)):
    """Delete an availability request"""
    result = await db.inperson_availability_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, "message": "Request deleted"}


@router.post("/admin/availability-inbox/{request_id}/schedule")
async def schedule_from_availability(request_id: str, req: ScheduleFromAvailabilityRequest, admin: dict = Depends(get_admin_user)):
    """Save a scheduled time as draft (like video interview flow)"""
    avail_request = await db.inperson_availability_requests.find_one({"id": request_id})
    if not avail_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.inperson_availability_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "scheduled",
            "scheduled_datetime": req.selected_datetime,
            "scheduled_datetime_ct": req.selected_datetime_ct,
            "scheduled_location": req.location or "Thrifty Curator Store",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "scheduled_by": admin.get("name", admin.get("email"))
        }}
    )
    
    return {"success": True, "message": "Interview time saved as draft"}


@router.post("/admin/availability-inbox/{request_id}/unschedule")
async def unschedule_from_availability(request_id: str, admin: dict = Depends(get_admin_user)):
    """Remove scheduled time and return to responded status"""
    avail_request = await db.inperson_availability_requests.find_one({"id": request_id})
    if not avail_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if avail_request.get("status") != "scheduled":
        raise HTTPException(status_code=400, detail="This request is not in scheduled status")
    
    await db.inperson_availability_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "responded",
            "scheduled_datetime": None,
            "scheduled_datetime_ct": None,
            "scheduled_location": None
        }}
    )
    
    return {"success": True, "message": "Scheduled time removed"}


@router.post("/admin/availability-inbox/{request_id}/send-confirmation")
async def send_availability_confirmation(request_id: str, request: Request, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Send confirmation email for scheduled in-person interview"""
    from app.services.email_service import send_inperson_interview_confirmation_email
    
    # Get location from request body
    body = await request.json()
    location = body.get("location", "Thrifty Curator Store")
    
    avail_request = await db.inperson_availability_requests.find_one({"id": request_id})
    if not avail_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if avail_request.get("status") != "scheduled":
        raise HTTPException(status_code=400, detail="Interview must be scheduled before sending confirmation")
    
    # Generate cancel/manage token
    manage_token = secrets.token_urlsafe(16)
    
    # Update to confirmed with location
    await db.inperson_availability_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "confirmed",
            "confirmed_datetime": avail_request.get("scheduled_datetime"),
            "confirmed_datetime_ct": avail_request.get("scheduled_datetime_ct"),
            "scheduled_location": location,
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_by": admin.get("name", admin.get("email")),
            "manage_token": manage_token
        }}
    )
    
    # Update job application
    await db.job_applications.update_one(
        {"id": avail_request["applicant_id"]},
        {"$set": {
            "interview_scheduled": True,
            "interview_type": "in-person",
            "interview_datetime": avail_request.get("scheduled_datetime"),
            "interview_datetime_ct": avail_request.get("scheduled_datetime_ct"),
            "interview_location": location
        }}
    )
    
    # Build manage URL
    frontend_url = "https://thrifty-curator.com"
    manage_url = f"{frontend_url}/manage-inperson-interview/{manage_token}"
    
    # Send confirmation email
    background_tasks.add_task(
        send_inperson_interview_confirmation_email,
        to_email=avail_request["applicant_email"],
        applicant_name=avail_request["applicant_name"],
        interview_datetime=avail_request.get("scheduled_datetime"),
        interview_datetime_ct=avail_request.get("scheduled_datetime_ct"),
        location=location,
        manage_url=manage_url
    )
    
    return {"success": True, "message": f"Confirmation sent to {avail_request['applicant_email']}"}


@router.post("/admin/availability-inbox/{request_id}/send-message")
async def send_availability_message(request_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Send a message to applicant requesting new availability times"""
    from app.services.email_service import send_availability_followup_email
    
    avail_request = await db.inperson_availability_requests.find_one({"id": request_id})
    if not avail_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Update status
    await db.inperson_availability_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "needs_reschedule",
            "message_sent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Build resubmit URL
    frontend_url = "https://thrifty-curator.com"
    resubmit_url = f"{frontend_url}/submit-availability/{avail_request['token']}"
    
    # Send email
    background_tasks.add_task(
        send_availability_followup_email,
        to_email=avail_request["applicant_email"],
        applicant_name=avail_request["applicant_name"],
        resubmit_url=resubmit_url
    )
    
    return {"success": True, "message": f"Follow-up message sent to {avail_request['applicant_email']}"}


@router.get("/admin/all-inperson-interviews")
async def get_all_inperson_interviews(admin: dict = Depends(get_admin_user)):
    """Get all scheduled and confirmed in-person interviews for the schedule view"""
    # Get from new availability-based system
    avail_interviews = await db.inperson_availability_requests.find(
        {"status": {"$in": ["scheduled", "confirmed"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Get from old slot-based system
    slot_bookings = await db.interview_bookings.find(
        {"status": "confirmed"},
        {"_id": 0}
    ).sort("interview_date", 1).to_list(500)
    
    return {
        "availability_based": avail_interviews,
        "slot_based": slot_bookings
    }


@router.get("/admin/check-conflicts")
async def check_interview_conflicts(datetime_ct: str, admin: dict = Depends(get_admin_user)):
    """Check if a proposed interview time conflicts with existing interviews"""
    # Get all confirmed/scheduled interviews from both systems
    avail_interviews = await db.inperson_availability_requests.find(
        {"status": {"$in": ["scheduled", "confirmed"]}},
        {"_id": 0, "scheduled_datetime_ct": 1, "confirmed_datetime_ct": 1, "applicant_name": 1}
    ).to_list(500)
    
    slot_bookings = await db.interview_bookings.find(
        {"status": "confirmed"},
        {"_id": 0, "interview_date": 1, "interview_time": 1, "applicant_name": 1}
    ).to_list(500)
    
    conflicts = []
    
    # Check availability-based interviews
    for interview in avail_interviews:
        ct = interview.get("confirmed_datetime_ct") or interview.get("scheduled_datetime_ct")
        if ct and datetime_ct in ct:
            conflicts.append({
                "applicant_name": interview["applicant_name"],
                "datetime_ct": ct,
                "type": "availability"
            })
    
    # Check slot-based interviews (convert to CT format for comparison)
    for booking in slot_bookings:
        # Simple date comparison for now
        if datetime_ct and booking.get("interview_date") in datetime_ct:
            conflicts.append({
                "applicant_name": booking["applicant_name"],
                "datetime": f"{booking['interview_date']} {booking.get('interview_time', '')}",
                "type": "slot"
            })
    
    return {"conflicts": conflicts}

