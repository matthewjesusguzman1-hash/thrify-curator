from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class MessageCreate(BaseModel):
    sender_name: str
    message: str
    

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_name: str
    message: str
    submitted_at: str
    status: str = "unread"  # unread, read, replied
    admin_reply: Optional[str] = None
    replied_at: Optional[str] = None


class MessageReply(BaseModel):
    reply: str


class UpdateMessageStatus(BaseModel):
    status: str  # unread, read, replied
