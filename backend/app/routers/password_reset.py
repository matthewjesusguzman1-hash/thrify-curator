"""
Password Reset Router

Handles email-based password reset for both employees and consignors.
Uses a secure token-based "magic link" system.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import secrets
import hashlib

from app.database import db
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/password-reset", tags=["Password Reset"])

# Token expiration time (1 hour)
TOKEN_EXPIRY_HOURS = 1


def generate_reset_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


class PasswordResetRequest(BaseModel):
    email: EmailStr
    user_type: str = "employee"  # "employee" or "consignor"


class PasswordResetValidate(BaseModel):
    token: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/request")
async def request_password_reset(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    """
    Request a password reset. Sends an email with a reset link.
    Works for both employees and consignors.
    """
    email_lower = request.email.lower().strip()
    user_type = request.user_type
    
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
