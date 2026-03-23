"""
Apple Push Notification Service (APNs) for Live Activities
Sends push notifications to update Live Activities in real-time
"""
import os
import jwt
import time
import httpx
import json
from datetime import datetime, timezone

# APNs Configuration
APNS_KEY_ID = os.environ.get("APNS_KEY_ID")
APNS_TEAM_ID = os.environ.get("APNS_TEAM_ID")
APNS_BUNDLE_ID = os.environ.get("APNS_BUNDLE_ID", "com.thriftycurator.app")
APNS_PRIVATE_KEY = os.environ.get("APNS_PRIVATE_KEY", "").replace("\\n", "\n")

# APNs endpoints
APNS_PRODUCTION_URL = "https://api.push.apple.com"
APNS_SANDBOX_URL = "https://api.sandbox.push.apple.com"

# Use environment variable to switch between sandbox and production
# TestFlight and App Store builds use production APNs
APNS_USE_PRODUCTION = os.environ.get("APNS_USE_PRODUCTION", "true").lower() == "true"
APNS_URL = APNS_PRODUCTION_URL if APNS_USE_PRODUCTION else APNS_SANDBOX_URL

print(f"APNs configured for: {'PRODUCTION' if APNS_USE_PRODUCTION else 'SANDBOX'}")


def generate_apns_token():
    """Generate JWT token for APNs authentication"""
    if not APNS_KEY_ID or not APNS_TEAM_ID or not APNS_PRIVATE_KEY:
        raise ValueError("APNs credentials not configured")
    
    headers = {
        "alg": "ES256",
        "kid": APNS_KEY_ID
    }
    
    payload = {
        "iss": APNS_TEAM_ID,
        "iat": int(time.time())
    }
    
    token = jwt.encode(payload, APNS_PRIVATE_KEY, algorithm="ES256", headers=headers)
    return token


async def send_live_activity_update(push_token: str, content_state: dict, event: str = "update"):
    """
    Send a push notification to update a Live Activity
    
    Args:
        push_token: The push token from the Live Activity
        content_state: The new ContentState to display
        event: "update" or "end"
    """
    try:
        token = generate_apns_token()
        
        # APNs payload for Live Activity update
        # content-state must match Swift ContentState struct exactly
        # lastUpdated needs to be a Unix timestamp (Double) for Swift Date decoding
        timestamp_now = time.time()
        payload = {
            "aps": {
                "timestamp": int(timestamp_now),
                "event": event,  # "update" or "end"
                "content-state": {
                    "employeeCount": content_state.get("employeeCount", 0),
                    "employeeNames": content_state.get("employeeNames", []),
                    "lastUpdated": timestamp_now  # Unix timestamp as Double
                }
            }
        }
        
        headers = {
            "authorization": f"bearer {token}",
            "apns-topic": f"{APNS_BUNDLE_ID}.push-type.liveactivity",
            "apns-push-type": "liveactivity",
            "apns-priority": "10"
        }
        
        url = f"{APNS_URL}/3/device/{push_token}"
        
        async with httpx.AsyncClient(http2=True) as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                print("Live Activity update sent successfully")
                return True
            else:
                print(f"APNs error: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"Failed to send Live Activity update: {e}")
        return False


async def update_admin_live_activities(employee_count: int, employee_names: list):
    """
    Update all registered admin Live Activities with new employee data
    
    This function retrieves all stored admin push tokens and sends updates to each
    """
    from app.database import get_database
    
    db = get_database()
    
    # Get all active admin Live Activity tokens
    tokens_collection = db.live_activity_tokens
    admin_tokens = await tokens_collection.find({"type": "admin", "active": True}).to_list(100)
    
    if not admin_tokens:
        print("No active admin Live Activity tokens found")
        return
    
    content_state = {
        "employeeCount": employee_count,
        "employeeNames": employee_names,
        "lastUpdated": datetime.now(timezone.utc).isoformat()
    }
    
    for token_doc in admin_tokens:
        push_token = token_doc.get("push_token")
        if push_token:
            success = await send_live_activity_update(push_token, content_state)
            if not success:
                # Mark token as inactive if push fails
                await tokens_collection.update_one(
                    {"_id": token_doc["_id"]},
                    {"$set": {"active": False}}
                )


async def register_live_activity_token(user_id: str, push_token: str, activity_type: str):
    """
    Register a Live Activity push token for future updates
    
    Args:
        user_id: The user's ID
        push_token: The push token from the Live Activity
        activity_type: "admin" or "employee"
    """
    from app.database import get_database
    
    db = get_database()
    tokens_collection = db.live_activity_tokens
    
    # Upsert the token
    await tokens_collection.update_one(
        {"user_id": user_id, "type": activity_type},
        {
            "$set": {
                "push_token": push_token,
                "active": True,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    print(f"Registered {activity_type} Live Activity token for user {user_id}")


async def unregister_live_activity_token(user_id: str, activity_type: str):
    """Remove a Live Activity push token"""
    from app.database import get_database
    
    db = get_database()
    tokens_collection = db.live_activity_tokens
    
    await tokens_collection.update_one(
        {"user_id": user_id, "type": activity_type},
        {"$set": {"active": False}}
    )


async def send_clock_out_notification(employee_name: str, hours_worked: float):
    """
    Send a regular push notification to admins when an employee clocks out
    """
    # Format hours worked
    hours = int(hours_worked)
    minutes = int((hours_worked - hours) * 60)
    if hours > 0:
        time_str = f"{hours}h {minutes}m"
    else:
        time_str = f"{minutes}m"
    
    await send_admin_push_notification(
        title="Employee Clocked Out",
        body=f"{employee_name} clocked out after {time_str}",
        notification_type="clock_out"
    )


async def send_admin_push_notification(title: str, body: str, notification_type: str = "general", data: dict = None):
    """
    Send a push notification to all admin devices
    
    Args:
        title: Notification title
        body: Notification body text
        notification_type: Type for handling tap actions (clock_in, clock_out, form_submission, etc.)
        data: Additional data to include in the notification payload
    """
    from app.database import get_database
    
    db = get_database()
    
    # Get all admin DEVICE push tokens (not Live Activity tokens)
    tokens_collection = db.device_push_tokens
    admin_tokens = await tokens_collection.find({"active": True}).to_list(100)
    
    if not admin_tokens:
        print(f"No active device tokens for {notification_type} notification")
        return
    
    try:
        token = generate_apns_token()
        
        for token_doc in admin_tokens:
            device_token = token_doc.get("device_token")
            if not device_token:
                continue
                
            # Regular alert notification
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
            
            # Add any extra data
            if data:
                payload["data"] = data
            
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
                    print(f"Push notification sent: {title}")
                else:
                    print(f"Push notification failed: {response.status_code} - {response.text}")
                    # Mark token as inactive if it's invalid
                    if response.status_code in [400, 410]:
                        await tokens_collection.update_one(
                            {"_id": token_doc["_id"]},
                            {"$set": {"active": False}}
                        )
                    
    except Exception as e:
        print(f"Failed to send push notification: {e}")
