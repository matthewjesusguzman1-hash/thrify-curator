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
from app.services.web_push_service import get_web_push_service

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


async def send_other_admins_notification(sending_admin_id: str, sending_admin_name: str, title: str, body: str, notification_type: str, conversation_id: str = None):
    """Send push notification to all OTHER admins (excluding the one who sent the message)
    
    Uses the same approach as send_admin_push_notification but excludes the sending admin's device.
    """
    from app.services.apns_service import generate_apns_token, APNS_URL, APNS_BUNDLE_ID
    import httpx
    
    # Get ALL active admin device tokens
    admin_tokens = await db.device_push_tokens.find({
        "active": True,
        "user_type": "admin"
    }).to_list(100)
    
    if not admin_tokens:
        print(f"[PUSH] No active admin devices found")
        return
    
    # Filter out the sending admin's tokens
    other_admin_tokens = [t for t in admin_tokens if t.get("user_id") != sending_admin_id]
    
    print(f"[PUSH] Admin message notification: {len(admin_tokens)} total admin tokens, {len(other_admin_tokens)} after excluding sender ({sending_admin_id})")
    
    if not other_admin_tokens:
        print(f"[PUSH] No other admin devices to notify (sender: {sending_admin_name})")
        return
    
    print(f"[PUSH] Sending '{notification_type}' to {len(other_admin_tokens)} other admin device(s)")
    
    try:
        token = generate_apns_token()
        
        for token_doc in other_admin_tokens:
            device_token = token_doc.get("device_token")
            if not device_token:
                continue
            
            recipient_id = token_doc.get("user_id", "unknown")
            print(f"[PUSH] Sending admin message notification to {recipient_id}")
            
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
            
            # Add conversation_id for deep linking
            if conversation_id:
                payload["data"] = {"conversation_id": conversation_id}
            
            headers = {
                "authorization": f"bearer {token}",
                "apns-topic": APNS_BUNDLE_ID,
                "apns-push-type": "alert",
                "apns-priority": "10"
            }
            
            async with httpx.AsyncClient(http2=True) as client:
                response = await client.post(
                    f"{APNS_URL}/3/device/{device_token}",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    print(f"[PUSH] ✓ Sent to admin {recipient_id}")
                else:
                    print(f"[PUSH] ✗ Failed for admin {recipient_id}: {response.status_code}")
                    
    except Exception as e:
        print(f"[PUSH] Error sending to other admins: {e}")
    
    # Also send web push to other admins
    try:
        other_admin_subscriptions = await db.web_push_subscriptions.find({
            "user_type": "admin"
        }).to_list(100)
        
        # Filter out the sending admin
        other_admin_subscriptions = [s for s in other_admin_subscriptions if s.get("user_id") != sending_admin_id]
        
        if other_admin_subscriptions:
            web_push = get_web_push_service()
            for subscription in other_admin_subscriptions:
                try:
                    await web_push.send_notification(
                        subscription_info=subscription,
                        title=title,
                        body=body,
                        url=f"/admin?section=messages&conversation={conversation_id}" if conversation_id else "/admin?section=messages",
                        tag=notification_type
                    )
                except Exception as e:
                    print(f"[WebPush] Failed for admin subscription: {e}")
    except Exception as e:
        print(f"[WebPush] Error sending to other admins: {e}")


# ============ EMPLOYEE MESSAGING ============

@router.get("/employee/my-conversation")
async def get_employee_conversation(user: dict = Depends(get_current_user)):
    """Get or create the employee's conversation with admin"""
    user_id = user.get("id") or user.get("email")
    user_email = user.get("email")
    user_name = user.get("name") or user.get("email")
    
    # Check if admin has read receipts enabled
    read_receipts_setting = await db.admin_settings.find_one({"setting_key": "read_receipts_enabled"})
    show_read_receipts = read_receipts_setting.get("value", True) if read_receipts_setting else True
    
    # Find existing conversation (exclude soft-deleted)
    conversation = await db.conversations.find_one({
        "participant_type": "employee",
        "participant_id": user_id,
        "deleted_at": {"$exists": False}
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
    
    # Filter out deleted messages from the response
    if "messages" in conversation:
        conversation["messages"] = [
            msg for msg in conversation["messages"] 
            if not msg.get("deleted_at")
        ]
    
    # Mark admin messages as read with timestamp
    if conversation.get("messages"):
        now = datetime.now(timezone.utc).isoformat()
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {
                "messages.$[elem].read": True, 
                "messages.$[elem].read_at": now,
                "unread_count": 0
            }},
            array_filters=[{"elem.sender_type": "admin", "elem.read": False}]
        )
        
        # Fetch updated conversation to return with read_at timestamps
        updated_conv = await db.conversations.find_one({
            "id": conversation["id"]
        }, {"_id": 0})
        
        if updated_conv and "messages" in updated_conv:
            conversation["messages"] = [
                msg for msg in updated_conv["messages"] 
                if not msg.get("deleted_at")
            ]
    
    # If read receipts are disabled, hide read status from employee's messages
    if not show_read_receipts and "messages" in conversation:
        for msg in conversation["messages"]:
            if msg.get("sender_type") == "employee":
                msg["read"] = False
                msg.pop("read_at", None)
    
    return conversation


@router.post("/employee/send")
async def employee_send_message(message: ConversationCreate, user: dict = Depends(get_current_user)):
    """Employee sends a message to admin"""
    from app.services.apns_service import send_admin_push_notification
    
    user_id = user.get("id") or user.get("email")
    user_email = user.get("email")
    user_name = message.sender_name or user.get("name") or user.get("email")
    
    # Find or create conversation (exclude soft-deleted)
    conversation = await db.conversations.find_one({
        "participant_type": "employee",
        "participant_id": user_id,
        "deleted_at": {"$exists": False}
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
    
    # Send APNs push notification to all admin devices
    try:
        await send_admin_push_notification(
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            notification_type="employee_message"
        )
    except Exception as e:
        print(f"Failed to send employee message APNs push: {e}")
    
    # Send web push to all admins
    conv_id = conversation.get("id") or conversation["id"]
    try:
        web_push = get_web_push_service()
        await web_push.send_to_admins(
            db=db,
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            url=f"/admin?openMessages=true&conversationId={conv_id}",
            notification_type="employee_message"
        )
    except Exception as e:
        print(f"Failed to send employee message web push: {e}")
    
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
    
    # Check if admin has read receipts enabled
    read_receipts_setting = await db.admin_settings.find_one({"setting_key": "read_receipts_enabled"})
    show_read_receipts = read_receipts_setting.get("value", True) if read_receipts_setting else True
    
    user_name = agreement.get("full_name", email)
    
    # Find existing conversation (exclude soft-deleted)
    conversation = await db.conversations.find_one({
        "participant_type": "consignor",
        "participant_id": email,
        "deleted_at": {"$exists": False}
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
    
    # Filter out deleted messages from the response
    if "messages" in conversation:
        conversation["messages"] = [
            msg for msg in conversation["messages"] 
            if not msg.get("deleted_at")
        ]
    
    # Mark admin messages as read with timestamp
    if conversation.get("messages"):
        now = datetime.now(timezone.utc).isoformat()
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {
                "messages.$[elem].read": True, 
                "messages.$[elem].read_at": now,
                "unread_count": 0
            }},
            array_filters=[{"elem.sender_type": "admin", "elem.read": False}]
        )
        
        # Fetch updated conversation to return with read_at timestamps
        updated_conv = await db.conversations.find_one({
            "id": conversation["id"]
        }, {"_id": 0})
        
        if updated_conv and "messages" in updated_conv:
            conversation["messages"] = [
                msg for msg in updated_conv["messages"] 
                if not msg.get("deleted_at")
            ]
    
    # If read receipts are disabled, hide read status from consignor's messages
    if not show_read_receipts and "messages" in conversation:
        for msg in conversation["messages"]:
            if msg.get("sender_type") == "consignor":
                msg["read"] = False
                msg.pop("read_at", None)
    
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
    
    # Find or create conversation (exclude soft-deleted)
    conversation = await db.conversations.find_one({
        "participant_type": "consignor",
        "participant_id": email,
        "deleted_at": {"$exists": False}
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
    
    # Send APNs push notification to all admin devices
    try:
        await send_admin_push_notification(
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            notification_type="consignor_message"
        )
    except Exception as e:
        print(f"Failed to send consignor message APNs push: {e}")
    
    # Send web push to all admins
    conv_id = conversation.get("id") or conversation["id"]
    try:
        web_push = get_web_push_service()
        await web_push.send_to_admins(
            db=db,
            title=f"Message from {user_name}",
            body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
            url=f"/admin?openMessages=true&conversationId={conv_id}",
            notification_type="consignor_message"
        )
    except Exception as e:
        print(f"Failed to send consignor message web push: {e}")
    
    return {"success": True, "message_id": new_message["id"]}


# ============ ADMIN MESSAGING ============

@router.get("/admin/list", response_model=List[ConversationListItem])
async def get_all_conversations(admin: dict = Depends(get_admin_user)):
    """Admin: Get all active (non-deleted) conversations"""
    admin_id = admin.get("id") or admin.get("email")
    
    # Exclude soft-deleted conversations
    conversations = await db.conversations.find(
        {"deleted_at": {"$exists": False}}, 
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(500)
    
    result = []
    for conv in conversations:
        messages = conv.get("messages", [])
        # Filter out deleted messages
        active_messages = [m for m in messages if not m.get("deleted_at")]
        last_message = active_messages[-1] if active_messages else None
        
        # Count unread messages for THIS admin:
        # 1. Messages from employee/consignor that aren't read
        # 2. Messages from OTHER admins that THIS admin hasn't read
        unread = 0
        for m in active_messages:
            sender_type = m.get("sender_type")
            if sender_type != "admin":
                # Participant message - count if not read
                if not m.get("read", False):
                    unread += 1
            else:
                # Admin message - count if from a different admin AND this admin hasn't read it
                msg_sender_id = m.get("sender_id")
                if msg_sender_id and msg_sender_id != admin_id:
                    read_by_admins = m.get("read_by_admins", [])
                    if admin_id not in read_by_admins:
                        unread += 1
        
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
    """Admin: Get total unread message count across all active conversations
    
    Counts:
    - Messages from employees/consignors that haven't been read
    - Messages from OTHER admins that THIS admin hasn't read
    """
    admin_id = admin.get("id") or admin.get("email")
    
    # Exclude soft-deleted conversations
    conversations = await db.conversations.find(
        {"deleted_at": {"$exists": False}}, 
        {"messages": 1}
    ).to_list(1000)
    
    total_unread = 0
    for conv in conversations:
        for msg in conv.get("messages", []):
            # Skip deleted messages
            if msg.get("deleted_at"):
                continue
            
            sender_type = msg.get("sender_type")
            
            if sender_type != "admin":
                # Message from employee/consignor - count if not read by any admin
                if not msg.get("read", False):
                    total_unread += 1
            else:
                # Message from an admin - count as unread for OTHER admins
                # Check if this admin sent it (don't count your own messages)
                msg_sender_id = msg.get("sender_id")
                if msg_sender_id and msg_sender_id != admin_id:
                    # Check if this specific admin has read it
                    read_by_admins = msg.get("read_by_admins", [])
                    if admin_id not in read_by_admins:
                        total_unread += 1
    
    return {"unread_count": total_unread}


@router.get("/admin/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Get a specific conversation (excluding soft-deleted)"""
    admin_id = admin.get("id") or admin.get("email")
    
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "deleted_at": {"$exists": False}
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Filter out deleted messages from the response
    if "messages" in conversation:
        conversation["messages"] = [
            msg for msg in conversation["messages"] 
            if not msg.get("deleted_at")
        ]
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Mark participant messages (employee/consignor) as read with timestamp
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {
            "messages.$[elem].read": True,
            "messages.$[elem].read_at": now
        }},
        array_filters=[{"elem.sender_type": {"$ne": "admin"}, "elem.read": False}]
    )
    
    # Mark admin messages from OTHER admins as read by THIS admin
    # This adds the current admin's ID to the read_by_admins array for messages
    # they haven't read yet (where sender is a different admin)
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$addToSet": {
            "messages.$[adminMsg].read_by_admins": admin_id
        }},
        array_filters=[{
            "adminMsg.sender_type": "admin",
            "adminMsg.sender_id": {"$ne": admin_id}  # Not sent by this admin
        }]
    )
    
    # Fetch updated conversation to return with read_at timestamps
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "deleted_at": {"$exists": False}
    }, {"_id": 0})
    
    if "messages" in conversation:
        conversation["messages"] = [
            msg for msg in conversation["messages"] 
            if not msg.get("deleted_at")
        ]
    
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
        "sender_id": admin_id,  # Use actual admin ID so other admins can see it as unread
        "sender_name": admin_name,
        "content": reply.content,
        "sent_at": now,
        "read": False,
        "read_by_admins": [admin_id]  # The sender has "read" their own message
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
    
    # Determine the URL to open when notification is clicked
    # For employees, go to dashboard with messages section expanded
    # For consignors, go to their portal with messages section
    notification_url = "/employee?section=messages" if participant_type == "employee" else "/consignor?section=messages"
    
    try:
        await send_user_push_notification(
            user_type=participant_type,
            user_id=participant_id,
            title=f"New message from {admin_name}",
            body=reply.content[:100] + "..." if len(reply.content) > 100 else reply.content,
            notification_type="admin_message",
            exclude_device_token=admin_device_token
        )
    except Exception as e:
        print(f"Failed to send admin reply APNs push: {e}")
    
    # Also send web push notification for PWA users
    try:
        # Find user's web push subscription
        subscription = await db.web_push_subscriptions.find_one({
            "user_id": participant_id,
            "user_type": participant_type
        })
        
        if subscription:
            web_push = get_web_push_service()
            await web_push.send_notification(
                subscription_info=subscription,
                title=f"New message from {admin_name}",
                body=reply.content[:100] + "..." if len(reply.content) > 100 else reply.content,
                url=notification_url,
                tag="admin_message"
            )
    except Exception as e:
        print(f"Failed to send admin reply web push: {e}")
    
    # NEW: Notify OTHER admins about this message so they stay in the loop
    try:
        participant_name = conversation.get("participant_name", "Unknown")
        # Log for debugging
        print(f"[ADMIN MSG] Admin {admin_name} (id: {admin_id}) sent message to {participant_name}")
        print(f"[ADMIN MSG] Looking for other admin tokens excluding user_id: {admin_id}")
        
        await send_other_admins_notification(
            sending_admin_id=admin_id,
            sending_admin_name=admin_name,
            title=f"{admin_name} messaged {participant_name}",
            body=reply.content[:100] + "..." if len(reply.content) > 100 else reply.content,
            notification_type="admin_conversation_update",
            conversation_id=reply.conversation_id
        )
    except Exception as e:
        print(f"Failed to send other admins notification: {e}")
    
    return {"success": True, "message_id": new_message["id"]}



@router.delete("/admin/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Soft-delete a conversation thread. The conversation is hidden but recoverable."""
    
    # Find the conversation first to verify it exists and is not already deleted
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "deleted_at": {"$exists": False}
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Soft-delete the conversation by adding deleted_at and deleted_by fields
    admin_name = admin.get("name", "Admin")
    admin_id = admin.get("id") or admin.get("email")
    
    result = await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "deleted_by": admin_id,
                "deleted_by_name": admin_name
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete conversation")
    
    return {
        "success": True, 
        "message": "Conversation deleted successfully",
        "participant_name": conversation.get("participant_name"),
        "participant_type": conversation.get("participant_type")
    }


@router.delete("/admin/message/{conversation_id}/{message_id}")
async def delete_message(conversation_id: str, message_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Delete a specific message that was sent by this admin"""
    
    admin_id = admin.get("id") or admin.get("email")
    admin_name = admin.get("name", "Admin")
    
    # Find the conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "deleted_at": {"$exists": False}
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Find the message and verify it belongs to this admin (or any admin sender)
    messages = conversation.get("messages", [])
    message_found = False
    for msg in messages:
        if msg.get("id") == message_id:
            # Admin can only delete messages sent by admins (sender_type == "admin")
            if msg.get("sender_type") == "admin":
                message_found = True
            else:
                raise HTTPException(status_code=403, detail="You can only delete your own messages")
            break
    
    if not message_found:
        raise HTTPException(status_code=404, detail="Message not found or not deletable")
    
    # Soft-delete the message by adding deleted_at field
    await db.conversations.update_one(
        {"id": conversation_id, "messages.id": message_id},
        {
            "$set": {
                "messages.$.deleted_at": datetime.now(timezone.utc).isoformat(),
                "messages.$.deleted_by": admin_id
            }
        }
    )
    
    return {"success": True, "message": "Message deleted successfully"}


@router.delete("/employee/message/{message_id}")
async def employee_delete_message(message_id: str, user: dict = Depends(get_current_user)):
    """Employee: Delete a specific message that was sent by this employee"""
    
    user_id = user.get("id") or user.get("email")
    
    # Find the employee's conversation
    conversation = await db.conversations.find_one({
        "participant_type": "employee",
        "participant_id": user_id,
        "deleted_at": {"$exists": False}
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Find the message and verify it belongs to this employee
    messages = conversation.get("messages", [])
    message_found = False
    for msg in messages:
        if msg.get("id") == message_id:
            if msg.get("sender_type") == "employee" and msg.get("sender_id") == user_id:
                message_found = True
            else:
                raise HTTPException(status_code=403, detail="You can only delete your own messages")
            break
    
    if not message_found:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Soft-delete the message
    await db.conversations.update_one(
        {"id": conversation["id"], "messages.id": message_id},
        {
            "$set": {
                "messages.$.deleted_at": datetime.now(timezone.utc).isoformat(),
                "messages.$.deleted_by": user_id
            }
        }
    )
    
    return {"success": True, "message": "Message deleted successfully"}


@router.delete("/consignor/message/{message_id}")
async def consignor_delete_message(message_id: str, email: str):
    """Consignor: Delete a specific message that was sent by this consignor"""
    
    email = email.lower()
    
    # Find the consignor's conversation
    conversation = await db.conversations.find_one({
        "participant_type": "consignor",
        "participant_id": email,
        "deleted_at": {"$exists": False}
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Find the message and verify it belongs to this consignor
    messages = conversation.get("messages", [])
    message_found = False
    for msg in messages:
        if msg.get("id") == message_id:
            if msg.get("sender_type") == "consignor" and msg.get("sender_id") == email:
                message_found = True
            else:
                raise HTTPException(status_code=403, detail="You can only delete your own messages")
            break
    
    if not message_found:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Soft-delete the message
    await db.conversations.update_one(
        {"id": conversation["id"], "messages.id": message_id},
        {
            "$set": {
                "messages.$.deleted_at": datetime.now(timezone.utc).isoformat(),
                "messages.$.deleted_by": email
            }
        }
    )
    
    return {"success": True, "message": "Message deleted successfully"}



# ============ READ RECEIPTS SETTINGS ============

@router.post("/admin/read-receipts-setting")
async def set_read_receipts_setting(enabled: bool, admin: dict = Depends(get_admin_user)):
    """Admin: Set whether to show read receipts to message recipients"""
    await db.admin_settings.update_one(
        {"setting_key": "read_receipts_enabled"},
        {"$set": {"setting_key": "read_receipts_enabled", "value": enabled}},
        upsert=True
    )
    return {"success": True, "read_receipts_enabled": enabled}


@router.get("/admin/read-receipts-setting")
async def get_read_receipts_setting(admin: dict = Depends(get_admin_user)):
    """Admin: Get current read receipts setting"""
    setting = await db.admin_settings.find_one({"setting_key": "read_receipts_enabled"}, {"_id": 0})
    return {"read_receipts_enabled": setting.get("value", True) if setting else True}
