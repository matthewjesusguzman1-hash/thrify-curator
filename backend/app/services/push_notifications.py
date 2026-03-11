import os
import json
import httpx
from typing import List, Optional
from datetime import datetime, timezone

# Firebase Cloud Messaging endpoint
FCM_URL = "https://fcm.googleapis.com/fcm/send"

class PushNotificationService:
    """Service for sending push notifications via Firebase Cloud Messaging"""
    
    def __init__(self):
        self.server_key = os.environ.get("FIREBASE_SERVER_KEY")
        self.enabled = bool(self.server_key)
    
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
        
        results = []
        
        for token in tokens:
            payload = {
                "to": token,
                "notification": {
                    "title": title,
                    "body": body,
                    "sound": "default",
                },
                "data": data or {},
                "priority": "high"
            }
            
            if badge is not None:
                payload["notification"]["badge"] = badge
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        FCM_URL,
                        json=payload,
                        headers={
                            "Authorization": f"key={self.server_key}",
                            "Content-Type": "application/json"
                        },
                        timeout=10.0
                    )
                    
                    result = response.json()
                    results.append({
                        "token": token[:20] + "...",
                        "success": result.get("success", 0) > 0,
                        "response": result
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


# Global instance
push_service = PushNotificationService()
