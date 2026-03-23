from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user, get_current_user
from app.models.conversations import (
    ConversationMessage,
    ConversationCreate,
    ConversationResponse,
    ConversationListItem,
    AdminReplyCreate
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


async def send_user_push_notification(user_type: str, user_id: str, title: str, body: str, notification_type: str, exclude_device_token: str = None):
    """Send push notification to a specific user (employee or consignor)
    
    Args:
        exclude_device_token: If provided, won't send to this token (used to prevent 
                             sender from receiving their own notification on same device)
    """
    from app.services.apns_service import generate_apns_token, APNS_URL, APNS_BUNDLE_ID
    import httpx
    
    # Find the user's device token
    token_doc = await db.device_push_tokens.find_one({
        "user_id": user_id,
        "user_type": user_type,
        "active": True
    })
    
    if not token_doc:
        print(f"No active device token for {user_type} {user_id}")
        return
    
    device_token = token_doc.get("device_token")
    if not device_token:
        return
    
    # Don't send notification to the same device that sent the message
    if exclude_device_token and device_token == exclude_device_token:
        print(f"Skipping notification - recipient is on same device as sender")
        return
    
    try:
        token = generate_apns_token()
        
        payload = {
            "aps": {
                "alert": {
                    "title": title,
                    "body": body
                },
                "sound": "default",
                "badge": 1
            },
            "type": notification_type
        }
        
        headers = {
            "authorization": f"bearer {token}",
            "apns-topic": APNS_BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10"
        }
        
        url = f"{APNS_URL}/3/device/{device_token}"
        
        async with httpx.AsyncClient(http2=True) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                print(f"Push notification sent to {user_type} {user_id}: {title}")
            else:
                print(f"Push notification failed for {user_type} {user_id}: {response.status_code}")
                if response.status_code in [400, 410]:
                    await db.device_push_tokens.update_one(
                        {"_id": token_doc["_id"]},
                        {"$set": {"active": False}}
                    )
    except Exception as e:
        print(f"Failed to send push notification: {e}")


# ============ EMPLOYEE MESSAGING ============

@router.get("/employee/my-conversation")
async def get_employee_conversation(user: dict = Depends(get_current_user)):
    """Get or create the employee's conversation with admin"""
    user_id = user.get("id") or user.get("email")
    user_email = user.get("email")
    user_name = user.get("name") or user.get("email")
    
    # Find existing conversation
    conversation = await db.conversations.find_one({
        "participant_type": "employee",
        "participant_id": user_id
    }, {"_id": 0})
    
    if not conversation:
        # Create new conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "participant_type": "employee",
            "participant_id": user_id,
            "participant_name": user_name,
            "participant_email": user_email,
            "messages": [],
            "last_message_at": datetime.now(timezone.utc).isoformat(),
            "unread_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation)
        del conversation["_id"]
    
    # Mark admin messages as read
    if conversation.get("messages"):
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {"messages.$[elem].read": True, "unread_count": 0}},
            array_filters=[{"elem.sender_type": "admin", "elem.read": False}]
        )
    
    return conversation


@router.post("/employee/send")
async def employee_send_message(message: ConversationCreate, user: dict = Depends(get_current_user)):
    """Employee sends a message to admin"""
    from app.services.apns_service import send_admin_push_notification
    
    user_id = user.get("id") or user.get("email")
    user_email = user.get("email")
    user_name = message.sender_name or user.get("name") or user.get("email")
    
    # Find or create conversation
    conversation = await db.conversations.find_one({
        "participant_type": "employee",
        "participant_id": user_id
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_type": "employee",
        "sender_id": user_id,
        "sender_name": user_name,
        "content": message.content,
        "sent_at": now,
        "read": False
    }
    
    if not conversation:
        # Create new conversation with the message
        conversation = {
            "id": str(uuid.uuid4()),
            "participant_type": "employee",
            "participant_id": user_id,
            "participant_name": user_name,
            "participant_email": user_email,
            "messages": [new_message],
            "last_message_at": now,
            "unread_count": 1,
            "created_at": now
        }
        await db.conversations.insert_one(conversation)
    else:
        # Add message to existing conversation
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {
                "$push": {"messages": new_message},
                "$set": {"last_message_at": now},
                "$inc": {"unread_count": 1}
            }
        )
    
    # Create admin notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": "employee_message",
        "message": f"New message from {user_name}",
        "details": {
            "conversation_id": conversation.get("id") or conversation["id"],
            "sender_name": user_name,
            "sender_email": user_email,
            "preview": message.content[:100] + "..." if len(message.content) > 100 else message.content
        },
        "created_at": now,
        "read": False
    }
    await db.admin_notifications.insert_one(notification_doc)
    
    # Send push notification to admin
    try:
        await send_admin_push_notification(
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            notification_type="employee_message"
        )
    except Exception as e:
        print(f"Failed to send employee message push: {e}")
    
    return {"success": True, "message_id": new_message["id"]}


# ============ CONSIGNOR MESSAGING ============

@router.get("/consignor/my-conversation")
async def get_consignor_conversation(email: str):
    """Get or create the consignor's conversation with admin"""
    email = email.lower()
    
    # Verify consignor exists
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found")
    
    user_name = agreement.get("full_name", email)
    
    # Find existing conversation
    conversation = await db.conversations.find_one({
        "participant_type": "consignor",
        "participant_id": email
    }, {"_id": 0})
    
    if not conversation:
        # Create new conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "participant_type": "consignor",
            "participant_id": email,
            "participant_name": user_name,
            "participant_email": email,
            "messages": [],
            "last_message_at": datetime.now(timezone.utc).isoformat(),
            "unread_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation)
        del conversation["_id"]
    
    # Mark admin messages as read
    if conversation.get("messages"):
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {"messages.$[elem].read": True, "unread_count": 0}},
            array_filters=[{"elem.sender_type": "admin", "elem.read": False}]
        )
    
    return conversation


@router.post("/consignor/send")
async def consignor_send_message(email: str, message: ConversationCreate):
    """Consignor sends a message to admin"""
    from app.services.apns_service import send_admin_push_notification
    
    email = email.lower()
    
    # Verify consignor exists
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found")
    
    user_name = message.sender_name or agreement.get("full_name", email)
    
    # Find or create conversation
    conversation = await db.conversations.find_one({
        "participant_type": "consignor",
        "participant_id": email
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_type": "consignor",
        "sender_id": email,
        "sender_name": user_name,
        "content": message.content,
        "sent_at": now,
        "read": False
    }
    
    if not conversation:
        # Create new conversation with the message
        conversation = {
            "id": str(uuid.uuid4()),
            "participant_type": "consignor",
            "participant_id": email,
            "participant_name": user_name,
            "participant_email": email,
            "messages": [new_message],
            "last_message_at": now,
            "unread_count": 1,
            "created_at": now
        }
        await db.conversations.insert_one(conversation)
    else:
        # Add message to existing conversation
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {
                "$push": {"messages": new_message},
                "$set": {"last_message_at": now},
                "$inc": {"unread_count": 1}
            }
        )
    
    # Create admin notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": "consignor_message",
        "message": f"New message from {user_name}",
        "details": {
            "conversation_id": conversation.get("id") or conversation["id"],
            "sender_name": user_name,
            "sender_email": email,
            "preview": message.content[:100] + "..." if len(message.content) > 100 else message.content
        },
        "created_at": now,
        "read": False
    }
    await db.admin_notifications.insert_one(notification_doc)
    
    # Send push notification to admin
    try:
        await send_admin_push_notification(
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            notification_type="consignor_message"
        )
    except Exception as e:
        print(f"Failed to send consignor message push: {e}")
    
    return {"success": True, "message_id": new_message["id"]}


# ============ ADMIN MESSAGING ============

@router.get("/admin/list", response_model=List[ConversationListItem])
async def get_all_conversations(admin: dict = Depends(get_admin_user)):
    """Admin: Get all conversations"""
    conversations = await db.conversations.find({}, {"_id": 0}).sort("last_message_at", -1).to_list(500)
    
    result = []
    for conv in conversations:
        messages = conv.get("messages", [])
        last_message = messages[-1] if messages else None
        
        # Count unread messages FROM the participant (not from admin)
        unread = sum(1 for m in messages if m.get("sender_type") != "admin" and not m.get("read", False))
        
        result.append(ConversationListItem(
            id=conv["id"],
            participant_type=conv["participant_type"],
            participant_id=conv["participant_id"],
            participant_name=conv["participant_name"],
            participant_email=conv.get("participant_email", conv["participant_id"]),
            last_message=last_message["content"][:100] if last_message else "",
            last_message_at=conv["last_message_at"],
            last_sender_type=last_message["sender_type"] if last_message else "",
            unread_count=unread
        ))
    
    return result


@router.get("/admin/unread-count")
async def get_admin_unread_count(admin: dict = Depends(get_admin_user)):
    """Admin: Get total unread message count across all conversations"""
    conversations = await db.conversations.find({}, {"messages": 1}).to_list(1000)
    
    total_unread = 0
    for conv in conversations:
        for msg in conv.get("messages", []):
            if msg.get("sender_type") != "admin" and not msg.get("read", False):
                total_unread += 1
    
    return {"unread_count": total_unread}


@router.get("/admin/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Get a specific conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark participant messages as read
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"messages.$[elem].read": True}},
        array_filters=[{"elem.sender_type": {"$ne": "admin"}, "elem.read": False}]
    )
    
    return conversation


@router.post("/admin/reply")
async def admin_reply(reply: AdminReplyCreate, admin: dict = Depends(get_admin_user)):
    """Admin: Reply to a conversation"""
    conversation = await db.conversations.find_one({"id": reply.conversation_id})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    now = datetime.now(timezone.utc).isoformat()
    admin_name = admin.get("name", "Admin")
    admin_id = admin.get("id") or admin.get("email")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_type": "admin",
        "sender_id": "admin",
        "sender_name": admin_name,
        "content": reply.content,
        "sent_at": now,
        "read": False
    }
    
    # Add message to conversation
    await db.conversations.update_one(
        {"id": reply.conversation_id},
        {
            "$push": {"messages": new_message},
            "$set": {"last_message_at": now}
        }
    )
    
    # Get admin's device token to exclude from notification
    admin_token_doc = await db.device_push_tokens.find_one({
        "user_id": admin_id,
        "active": True
    })
    admin_device_token = admin_token_doc.get("device_token") if admin_token_doc else None
    
    # Send push notification to the participant (excluding admin's device)
    participant_type = conversation["participant_type"]
    participant_id = conversation["participant_id"]
    
    try:
        await send_user_push_notification(
            user_type=participant_type,
            user_id=participant_id,
            title="New message from Thrifty Curator",
            body=reply.content[:100] + "..." if len(reply.content) > 100 else reply.content,
            notification_type="admin_message",
            exclude_device_token=admin_device_token
        )
    except Exception as e:
        print(f"Failed to send admin reply push: {e}")
    
    return {"success": True, "message_id": new_message["id"]}
