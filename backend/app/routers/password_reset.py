"""
Password Reset Router

Handles email-based password reset for both employees and consignors.
Uses a secure token-based "magic link" system.
Includes rate limiting to prevent abuse.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import secrets
import hashlib

from app.database import db
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/password-reset", tags=["Password Reset"])

# Token expiration time (1 hour)
TOKEN_EXPIRY_HOURS = 1

# Rate limiting configuration
RATE_LIMIT_EMAIL_MAX = 3      # Max requests per email per hour
RATE_LIMIT_IP_MAX = 10        # Max requests per IP per hour
RATE_LIMIT_WINDOW_HOURS = 1   # Time window for rate limiting


def generate_reset_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


async def check_rate_limit(email: str, ip_address: str) -> dict:
    """
    Check if the request is within rate limits.
    Returns {"allowed": True/False, "reason": str, "retry_after": seconds}
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=RATE_LIMIT_WINDOW_HOURS)
    window_start_iso = window_start.isoformat()
    
    # Check email rate limit
    email_count = await db.password_reset_rate_limits.count_documents({
        "email": email.lower(),
        "created_at": {"$gte": window_start_iso}
    })
    
    if email_count >= RATE_LIMIT_EMAIL_MAX:
        # Find oldest request to calculate retry time
        oldest = await db.password_reset_rate_limits.find_one(
            {"email": email.lower(), "created_at": {"$gte": window_start_iso}},
            sort=[("created_at", 1)]
        )
        if oldest:
            oldest_time = datetime.fromisoformat(oldest["created_at"].replace('Z', '+00:00'))
            retry_after = int((oldest_time + timedelta(hours=RATE_LIMIT_WINDOW_HOURS) - now).total_seconds())
            return {
                "allowed": False,
                "reason": "Too many password reset requests for this email. Please try again later.",
                "retry_after": max(retry_after, 60)
            }
    
    # Check IP rate limit
    ip_count = await db.password_reset_rate_limits.count_documents({
        "ip_address": ip_address,
        "created_at": {"$gte": window_start_iso}
    })
    
    if ip_count >= RATE_LIMIT_IP_MAX:
        return {
            "allowed": False,
            "reason": "Too many password reset requests. Please try again later.",
            "retry_after": 3600
        }
    
    return {"allowed": True}


async def record_rate_limit(email: str, ip_address: str):
    """Record a password reset request for rate limiting"""
    await db.password_reset_rate_limits.insert_one({
        "email": email.lower(),
        "ip_address": ip_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Clean up old rate limit records (older than 2 hours)
    cleanup_threshold = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    await db.password_reset_rate_limits.delete_many({
        "created_at": {"$lt": cleanup_threshold}
    })


class PasswordResetRequest(BaseModel):
    email: EmailStr
    user_type: str = "employee"  # "employee" or "consignor"


class PasswordResetValidate(BaseModel):
    token: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/request")
async def request_password_reset(request: PasswordResetRequest, background_tasks: BackgroundTasks, req: Request):
    """
    Request a password reset. Sends an email with a reset link.
    Works for both employees and consignors.
    Rate limited to prevent abuse.
    """
    email_lower = request.email.lower().strip()
    user_type = request.user_type
    
    # Get client IP address
    ip_address = req.client.host if req.client else "unknown"
    # Check for forwarded IP (behind proxy)
    forwarded_for = req.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    
    # Check rate limits
    rate_limit_check = await check_rate_limit(email_lower, ip_address)
    if not rate_limit_check["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=rate_limit_check["reason"],
            headers={"Retry-After": str(rate_limit_check.get("retry_after", 3600))}
        )
    
    # Record this request for rate limiting (do this early to prevent timing attacks)
    await record_rate_limit(email_lower, ip_address)
    
    # Check if user exists based on type
    if user_type == "employee":
        user = await db.users.find_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
        )
        if not user:
            # Don't reveal if email exists or not for security
            return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}
        
        # Admins cannot reset password (they use access codes)
        if user.get("role") == "admin":
            return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}
        
        full_name = user.get("name", "User")
        
    elif user_type == "consignor":
        agreement = await db.consignment_agreements.find_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1}
        )
        if not agreement:
            return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}
        
        full_name = agreement.get("full_name", "Consignor")
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    # Generate token
    token = generate_reset_token()
    token_hash = hash_token(token)
    
    # Store token in database
    reset_doc = {
        "email": email_lower,
        "token_hash": token_hash,
        "user_type": user_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)).isoformat(),
        "used": False
    }
    
    # Remove any existing tokens for this email and type
    await db.password_reset_tokens.delete_many({"email": email_lower, "user_type": user_type})
    
    # Insert new token
    await db.password_reset_tokens.insert_one(reset_doc)
    
    # Send email with reset link (in background)
    background_tasks.add_task(
        send_password_reset_email,
        to_email=email_lower,
        full_name=full_name,
        reset_token=token,
        user_type=user_type
    )
    
    return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}


@router.get("/validate/{token}")
async def validate_reset_token(token: str):
    """
    Validate a password reset token.
    Returns user info if valid.
    """
    token_hash = hash_token(token)
    
    # Find the token
    reset_doc = await db.password_reset_tokens.find_one(
        {"token_hash": token_hash, "used": False},
        {"_id": 0}
    )
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_doc["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    
    return {
        "valid": True,
        "email": reset_doc["email"],
        "user_type": reset_doc["user_type"]
    }


@router.post("/reset")
async def reset_password(request: PasswordResetConfirm):
    """
    Reset the password using a valid token.
    """
    token_hash = hash_token(request.token)
    
    # Find and validate token
    reset_doc = await db.password_reset_tokens.find_one(
        {"token_hash": token_hash, "used": False},
        {"_id": 0}
    )
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_doc["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    
    # Validate password
    if len(request.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    email = reset_doc["email"]
    user_type = reset_doc["user_type"]
    
    # Hash the new password
    import secrets as sec
    salt = sec.token_hex(16)
    hashed = hashlib.sha256((request.new_password + salt).encode()).hexdigest()
    password_hash = f"{salt}:{hashed}"
    
    # Update password based on user type
    if user_type == "employee":
        result = await db.users.update_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}},
            {"$set": {
                "password_hash": password_hash,
                "password_set_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    elif user_type == "consignor":
        result = await db.consignment_agreements.update_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}},
            {"$set": {
                "password_hash": password_hash,
                "password_set_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Password has been reset successfully. You can now log in with your new password."}



@router.get("/rate-limit-status")
async def get_rate_limit_status(email: str, req: Request):
    """
    Check rate limit status for an email (for frontend to show remaining attempts).
    """
    email_lower = email.lower().strip()
    
    # Get client IP
    ip_address = req.client.host if req.client else "unknown"
    forwarded_for = req.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=RATE_LIMIT_WINDOW_HOURS)
    window_start_iso = window_start.isoformat()
    
    # Count requests for this email
    email_count = await db.password_reset_rate_limits.count_documents({
        "email": email_lower,
        "created_at": {"$gte": window_start_iso}
    })
    
    # Count requests for this IP
    ip_count = await db.password_reset_rate_limits.count_documents({
        "ip_address": ip_address,
        "created_at": {"$gte": window_start_iso}
    })
    
    email_remaining = max(0, RATE_LIMIT_EMAIL_MAX - email_count)
    ip_remaining = max(0, RATE_LIMIT_IP_MAX - ip_count)
    
    return {
        "email_requests_remaining": email_remaining,
        "ip_requests_remaining": ip_remaining,
        "rate_limit_window_hours": RATE_LIMIT_WINDOW_HOURS,
        "can_request": email_remaining > 0 and ip_remaining > 0
    }
