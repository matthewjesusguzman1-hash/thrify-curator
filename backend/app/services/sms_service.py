"""
SMS Service using Twilio

Provides SMS messaging capabilities for:
- Interview confirmations
- Interview reminders
- Interview cancellations/reschedules
- Direct messages from admin
"""

import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Initialize Twilio client
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

# Only initialize client if credentials are present
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print(f"Twilio SMS configured with number: {TWILIO_PHONE_NUMBER}")
    except Exception as e:
        print(f"Failed to initialize Twilio client: {e}")
else:
    print("Twilio credentials not found - SMS disabled")


def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 format (+1XXXXXXXXXX)
    Handles various input formats
    """
    if not phone:
        return None
    
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Handle US numbers
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    elif len(digits) > 10:
        # Assume it's already formatted with country code
        return f"+{digits}"
    
    return None


async def send_sms(to_phone: str, message: str) -> dict:
    """
    Send an SMS message
    
    Args:
        to_phone: Recipient phone number (any format)
        message: Message body (max 1600 chars for long SMS)
    
    Returns:
        dict with status and details
    """
    if not twilio_client:
        return {"status": "disabled", "message": "SMS service not configured"}
    
    formatted_phone = format_phone_number(to_phone)
    if not formatted_phone:
        return {"status": "error", "message": f"Invalid phone number: {to_phone}"}
    
    try:
        sms = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        
        return {
            "status": "success",
            "message_sid": sms.sid,
            "to": formatted_phone,
            "message": "SMS sent successfully"
        }
    except TwilioRestException as e:
        return {
            "status": "error",
            "error_code": e.code,
            "message": str(e.msg)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# ==================== INTERVIEW SMS TEMPLATES ====================

async def send_interview_confirmation_sms(
    to_phone: str,
    applicant_name: str,
    interview_date: str,
    interview_time: str,
    manage_url: str
) -> dict:
    """Send SMS confirmation when interview is booked"""
    
    first_name = applicant_name.split()[0] if applicant_name else "there"
    
    # Format date nicely
    try:
        from datetime import datetime
        dt = datetime.strptime(interview_date, "%Y-%m-%d")
        formatted_date = dt.strftime("%A, %B %d")
    except:
        formatted_date = interview_date
    
    # Format time to 12h
    def format_time(t):
        try:
            h, m = t.split(":")
            h = int(h)
            suffix = "AM" if h < 12 else "PM"
            if h == 0: h = 12
            elif h > 12: h -= 12
            return f"{h}:{m} {suffix}"
        except:
            return t
    
    # Parse time range
    time_parts = interview_time.split(" - ")
    if len(time_parts) == 2:
        formatted_time = f"{format_time(time_parts[0])}"
    else:
        formatted_time = interview_time
    
    message = f"""Hi {first_name}! Your interview at Thrifty Curator is confirmed.

{formatted_date} at {formatted_time}

Need to reschedule or cancel? Visit: {manage_url}

See you soon!
- Thrifty Curator"""
    
    return await send_sms(to_phone, message)


async def send_interview_cancelled_sms(
    to_phone: str,
    applicant_name: str,
    interview_date: str,
    cancelled_by: str = "applicant"
) -> dict:
    """Send SMS when interview is cancelled"""
    
    first_name = applicant_name.split()[0] if applicant_name else "there"
    
    # Format date
    try:
        from datetime import datetime
        dt = datetime.strptime(interview_date, "%Y-%m-%d")
        formatted_date = dt.strftime("%A, %B %d")
    except:
        formatted_date = interview_date
    
    if cancelled_by == "applicant":
        message = f"""Hi {first_name}, your interview on {formatted_date} has been cancelled as requested.

If you'd like to reschedule, just reply to this message or email us.

- Thrifty Curator"""
    else:
        message = f"""Hi {first_name}, we need to reschedule your interview that was planned for {formatted_date}.

We apologize for any inconvenience. We'll send you a new scheduling link shortly.

- Thrifty Curator"""
    
    return await send_sms(to_phone, message)


async def send_interview_rescheduled_sms(
    to_phone: str,
    applicant_name: str,
    new_date: str,
    new_time: str,
    manage_url: str
) -> dict:
    """Send SMS when interview is rescheduled"""
    
    first_name = applicant_name.split()[0] if applicant_name else "there"
    
    # Format date
    try:
        from datetime import datetime
        dt = datetime.strptime(new_date, "%Y-%m-%d")
        formatted_date = dt.strftime("%A, %B %d")
    except:
        formatted_date = new_date
    
    # Format time
    def format_time(t):
        try:
            h, m = t.split(":")
            h = int(h)
            suffix = "AM" if h < 12 else "PM"
            if h == 0: h = 12
            elif h > 12: h -= 12
            return f"{h}:{m} {suffix}"
        except:
            return t
    
    time_parts = new_time.split(" - ")
    formatted_time = format_time(time_parts[0]) if time_parts else new_time
    
    message = f"""Hi {first_name}! Your interview has been rescheduled.

NEW TIME: {formatted_date} at {formatted_time}

Manage appointment: {manage_url}

- Thrifty Curator"""
    
    return await send_sms(to_phone, message)


async def send_interview_reminder_sms(
    to_phone: str,
    applicant_name: str,
    interview_date: str,
    interview_time: str
) -> dict:
    """Send reminder SMS before interview"""
    
    first_name = applicant_name.split()[0] if applicant_name else "there"
    
    # Format time
    def format_time(t):
        try:
            h, m = t.split(":")
            h = int(h)
            suffix = "AM" if h < 12 else "PM"
            if h == 0: h = 12
            elif h > 12: h -= 12
            return f"{h}:{m} {suffix}"
        except:
            return t
    
    time_parts = interview_time.split(" - ")
    formatted_time = format_time(time_parts[0]) if time_parts else interview_time
    
    message = f"""Reminder: Hi {first_name}! Your interview is tomorrow at {formatted_time}.

We're looking forward to meeting you!

- Thrifty Curator"""
    
    return await send_sms(to_phone, message)


async def send_direct_sms(to_phone: str, message: str, from_name: str = "Thrifty Curator") -> dict:
    """
    Send a direct SMS from admin
    Appends signature automatically
    """
    full_message = f"{message}\n\n- {from_name}"
    return await send_sms(to_phone, full_message)


async def send_scheduler_invite_sms(
    to_phone: str,
    applicant_name: str,
    booking_url: str
) -> dict:
    """Send SMS with scheduling link"""
    
    first_name = applicant_name.split()[0] if applicant_name else "there"
    
    message = f"""Hi {first_name}! We'd like to invite you for an interview at Thrifty Curator.

Pick a time that works for you: {booking_url}

- Thrifty Curator"""
    
    return await send_sms(to_phone, message)
