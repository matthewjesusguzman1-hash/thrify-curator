from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


class ConversationMessage(BaseModel):
    """A single message in a conversation"""
    id: str
    sender_type: Literal["admin", "employee", "consignor"]
    sender_id: str  # email for consignors, user_id for employees
    sender_name: str
    content: str
    sent_at: str
    read: bool = False


class ConversationCreate(BaseModel):
    """Create a new message in a conversation"""
    content: str
    sender_name: Optional[str] = None  # Optional, will use stored name if not provided


class ConversationResponse(BaseModel):
    """Full conversation response"""
    model_config = ConfigDict(extra="ignore")
    id: str
    participant_type: Literal["employee", "consignor"]
    participant_id: str  # email for consignors, user_id for employees
    participant_name: str
    participant_email: str
    messages: List[ConversationMessage]
    last_message_at: str
    unread_count: int = 0
    created_at: str


class ConversationListItem(BaseModel):
    """Summary for conversation list"""
    model_config = ConfigDict(extra="ignore")
    id: str
    participant_type: Literal["employee", "consignor"]
    participant_id: str
    participant_name: str
    participant_email: str
    last_message: str
    last_message_at: str
    last_sender_type: str
    unread_count: int = 0


class AdminReplyCreate(BaseModel):
    """Admin reply to a conversation"""
    conversation_id: str
    content: str
