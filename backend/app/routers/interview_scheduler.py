"""
Interview Scheduler API

Provides endpoints for:
- Admin: Create/manage available time slots
- Admin: View scheduled interviews in calendar format
- Admin: Send direct emails to applicants
- Applicants: Book available slots via unique link
- Applicants: Cancel/reschedule with reason
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/interview-scheduler", tags=["Interview Scheduler"])


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
    frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
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
    import os
    frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
    manage_url = f"{frontend_url}/manage-interview/{cancel_token}"
    
    background_tasks.add_task(
        send_interview_confirmation_email,
        to_email=application["email"],
        applicant_name=application["full_name"],
        interview_date=slot["date"],
        interview_time=f"{slot['start_time']} - {slot['end_time']}",
        manage_url=manage_url,
        preferred_contact="email"
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
    
    # Notify admin
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
    import os
    frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
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
    
    return {
        "success": True, 
        "message": "Interview rescheduled successfully",
        "new_date": new_slot["date"],
        "new_time": f"{new_slot['start_time']} - {new_slot['end_time']}"
    }
