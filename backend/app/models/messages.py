from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class MessageCreate(BaseModel):
    sender_name: str
    sender_email: EmailStr
    message: str
    # Honeypot field - should always be empty (bots will fill it)
    website: Optional[str] = None
    # reCAPTCHA token - optional for mobile apps, required for web
    recaptcha_token: Optional[str] = None
    

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_name: str
    sender_email: str
    message: str
    submitted_at: str
    status: str = "unread"  # unread, read
    

class UpdateMessageStatus(BaseModel):
    status: str  # unread, read
