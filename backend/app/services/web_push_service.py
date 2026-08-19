"""
Web Push Service for Safari/PWA notifications
Uses VAPID for authentication with Apple/browser push services
"""
import os
import json
import asyncio
from typing import Optional
from datetime import datetime, timezone
from functools import partial

from pywebpush import webpush, WebPushException

# VAPID configuration
VAPID_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgZwoVYkrBleO0HkS9
y9bRhvYj4wqPSfA/bRrte9t/hkahRANCAATyMOhRmYU30F7rWCUCJRlXoM0bh59F
P0P5i+NxAgeW7P/qgCRvJ98WPAoNRP0IRM+k5Nsav95H8oDfFK5whPxi
-----END PRIVATE KEY-----"""

VAPID_PUBLIC_KEY = "BPIw6FGZhTfQXutYJQIlGVegzRuHn0U_Q_mL43ECB5bs_-qAJG8n3xY8Cg1E_QhEz6Tk2xq_3kfygN8UrnCE_GI"

# VAPID claims - email for contact
VAPID_CLAIMS = {
    "sub": "mailto:" + os.environ.get("ADMIN_EMAIL", "admin@thrifty-curator.com")
}


class WebPushService:
    """Service for sending Web Push notifications (Safari PWA)"""
    
    def __init__(self):
        self.enabled = True
        self.private_key = VAPID_PRIVATE_KEY
        self.public_key = VAPID_PUBLIC_KEY
        print("Web Push service initialized")
    
    def get_public_key(self) -> str:
        """Get the VAPID public key for browser subscription"""
        return self.public_key
    
    async def send_notification(
        self,
        subscription_info: dict,
        title: str,
        body: str,
        url: str = "/admin",
        icon: str = "/icon-192.png",
        tag: str = "default"
    ) -> dict:
        """
        Send a web push notification to a single subscription
        
        Args:
            subscription_info: Browser PushSubscription (endpoint, keys.auth, keys.p256dh)
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            icon: Icon URL for the notification
            tag: Notification tag for grouping/replacing
        """
        if not self.enabled:
            return {"success": False, "error": "Web Push not configured"}
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
            "icon": icon,
            "tag": tag,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        try:
            # Run webpush in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            print(f"[WebPush] Sending notification to endpoint: {subscription_info.get('endpoint', 'unknown')[:50]}...")
            print(f"[WebPush] Payload: {payload}")
            await loop.run_in_executor(
                None,
                partial(
                    webpush,
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=self.private_key,
                    vapid_claims=VAPID_CLAIMS,
                    ttl=3600  # 1 hour TTL
                )
            )
            print(f"[WebPush] Successfully sent notification")
            return {"success": True}
            
        except WebPushException as e:
            error_msg = str(e)
            status = getattr(getattr(e, "response", None), "status_code", None)
            print(f"[WebPush] WebPushException: status={status}, error={error_msg}")
            
            # 404/410 means subscription is expired/invalid
            if status in (404, 410) or "404" in error_msg or "410" in error_msg:
                return {"success": False, "error": "subscription_expired", "should_remove": True}
            
            return {"success": False, "error": error_msg}
        except Exception as e:
            print(f"[WebPush] Exception: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_to_all_subscriptions(
        self,
        db,
        title: str,
        body: str,
        url: str = "/admin",
        notification_type: str = "default",
        user_filter: Optional[dict] = None
    ) -> dict:
        """
        Send web push notification to all stored subscriptions
        
        Args:
            db: Database instance
            title: Notification title
            body: Notification body
            url: URL to open on click
            notification_type: Type for tagging
            user_filter: Optional filter for specific users (e.g., {"role": "admin"})
        """
        query = user_filter or {}
        
        subscriptions = await db.web_push_subscriptions.find(
            query,
            {"_id": 0}
        ).to_list(500)
        
        if not subscriptions:
            return {"success": False, "error": "No web push subscriptions found", "sent": 0}
        
        sent = 0
        removed = 0
        errors = []
        
        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub["endpoint"],
                "keys": sub["keys"]
            }
            
            result = await self.send_notification(
                subscription_info=subscription_info,
                title=title,
                body=body,
                url=url,
                tag=notification_type
            )
            
            if result.get("success"):
                sent += 1
            elif result.get("should_remove"):
                # Remove expired subscription
                await db.web_push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
                removed += 1
            else:
                errors.append(result.get("error", "Unknown error"))
        
        return {
            "success": sent > 0,
            "sent": sent,
            "removed_expired": removed,
            "errors": errors[:5] if errors else []
        }
    
    async def send_to_admins(
        self,
        db,
        title: str,
        body: str,
        url: str = "/admin",
        notification_type: str = "default"
    ) -> dict:
        """Send web push to all admin/owner subscriptions"""
        return await self.send_to_all_subscriptions(
            db=db,
            title=title,
            body=body,
            url=url,
            notification_type=notification_type,
            user_filter={"role": {"$in": ["admin", "owner"]}}
        )


# Global instance
_web_push_service = None


def get_web_push_service() -> WebPushService:
    global _web_push_service
    if _web_push_service is None:
        _web_push_service = WebPushService()
    return _web_push_service
