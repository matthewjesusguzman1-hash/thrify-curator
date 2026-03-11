import os
from typing import List, Optional
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, messaging

# Initialize Firebase Admin SDK
_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "/app/backend/firebase-credentials.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            print(f"Firebase Admin SDK initialized successfully")
        else:
            print(f"Firebase credentials not found at {cred_path}")
    return _firebase_app


class PushNotificationService:
    """Service for sending push notifications via Firebase Cloud Messaging"""
    
    def __init__(self):
        self.app = get_firebase_app()
        self.enabled = self.app is not None
        if self.enabled:
            print("Push notification service enabled")
        else:
            print("Push notification service disabled (no Firebase credentials)")
    
    async def send_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
        badge: Optional[int] = None
    ) -> dict:
        """
        Send push notification to multiple device tokens
        
        Args:
            tokens: List of FCM device tokens
            title: Notification title
            body: Notification body text
            data: Optional data payload
            badge: Optional badge count for iOS
        """
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        if not tokens:
            return {"success": False, "error": "No device tokens provided"}
        
        # Convert data values to strings (FCM requirement)
        string_data = {}
        if data:
            for key, value in data.items():
                string_data[key] = str(value) if value is not None else ""
        
        results = []
        
        for token in tokens:
            try:
                # Build the message
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    data=string_data,
                    token=token,
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            sound="default",
                            click_action="FLUTTER_NOTIFICATION_CLICK"
                        )
                    ),
                    apns=messaging.APNSConfig(
                        payload=messaging.APNSPayload(
                            aps=messaging.Aps(
                                sound="default",
                                badge=badge
                            )
                        )
                    )
                )
                
                # Send the message
                response = messaging.send(message)
                results.append({
                    "token": token[:20] + "...",
                    "success": True,
                    "message_id": response
                })
                
            except messaging.UnregisteredError:
                results.append({
                    "token": token[:20] + "...",
                    "success": False,
                    "error": "Token unregistered"
                })
            except messaging.SenderIdMismatchError:
                results.append({
                    "token": token[:20] + "...",
                    "success": False,
                    "error": "Sender ID mismatch"
                })
            except Exception as e:
                results.append({
                    "token": token[:20] + "...",
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": any(r["success"] for r in results),
            "results": results
        }
    
    async def send_to_admins(
        self,
        db,
        title: str,
        body: str,
        notification_type: str,
        data: Optional[dict] = None
    ) -> dict:
        """Send push notification to all admin users"""
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        # Get all admin device tokens
        admin_tokens = await db.push_tokens.find(
            {"role": {"$in": ["admin", "owner"]}},
            {"_id": 0, "token": 1}
        ).to_list(100)
        
        tokens = [t["token"] for t in admin_tokens if t.get("token")]
        
        if not tokens:
            return {"success": False, "error": "No admin devices registered"}
        
        # Add notification type to data
        payload_data = data or {}
        payload_data["type"] = notification_type
        payload_data["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        return await self.send_notification(tokens, title, body, payload_data)
    
    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[dict] = None
    ) -> dict:
        """Send push notification to multiple tokens at once (more efficient)"""
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        if not tokens:
            return {"success": False, "error": "No device tokens provided"}
        
        # Convert data values to strings
        string_data = {}
        if data:
            for key, value in data.items():
                string_data[key] = str(value) if value is not None else ""
        
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=string_data,
                tokens=tokens,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default"
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default"
                        )
                    )
                )
            )
            
            response = messaging.send_each_for_multicast(message)
            
            return {
                "success": response.success_count > 0,
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Notification templates for different events
class NotificationTemplates:
    
    @staticmethod
    def clock_in(employee_name: str) -> dict:
        return {
            "title": "Employee Clocked In",
            "body": f"{employee_name} has started their shift",
            "type": "clock_in"
        }
    
    @staticmethod
    def clock_out(employee_name: str, hours: float) -> dict:
        return {
            "title": "Employee Clocked Out",
            "body": f"{employee_name} ended their shift ({hours:.1f} hours)",
            "type": "clock_out"
        }
    
    @staticmethod
    def w9_submitted(employee_name: str) -> dict:
        return {
            "title": "W-9 Submitted",
            "body": f"{employee_name} has submitted their W-9 for review",
            "type": "w9_submission"
        }
    
    @staticmethod
    def job_application(applicant_name: str) -> dict:
        return {
            "title": "New Job Application",
            "body": f"{applicant_name} has applied for a position",
            "type": "job_application"
        }
    
    @staticmethod
    def consignment_inquiry(client_name: str) -> dict:
        return {
            "title": "Consignment Inquiry",
            "body": f"New inquiry from {client_name}",
            "type": "consignment_inquiry"
        }
    
    @staticmethod
    def consignment_agreement(client_name: str) -> dict:
        return {
            "title": "New Consignment Agreement",
            "body": f"{client_name} has signed a consignment agreement",
            "type": "consignment_agreement"
        }
    
    @staticmethod
    def payment_method_change(client_name: str) -> dict:
        return {
            "title": "Payment Method Updated",
            "body": f"{client_name} has updated their payment method",
            "type": "payment_method_change"
        }
    
    @staticmethod
    def items_added(client_name: str, count: int) -> dict:
        return {
            "title": "Items Added",
            "body": f"{client_name} has added {count} new item(s) for consignment",
            "type": "consignment_items_added"
        }
    
    @staticmethod
    def new_message(sender_name: str) -> dict:
        return {
            "title": "New Message",
            "body": f"New message from {sender_name}",
            "type": "new_message"
        }


# Global instance - initialized lazily
_push_service = None

def get_push_service():
    global _push_service
    if _push_service is None:
        _push_service = PushNotificationService()
    return _push_service

# For backward compatibility
push_service = None

def init_push_service():
    global push_service
    push_service = get_push_service()
    return push_service
