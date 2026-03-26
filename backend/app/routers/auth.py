from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import hashlib
import secrets

from app.database import db
from app.dependencies import create_token, get_current_user
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse, SetEmployeePassword, ChangeEmployeePassword
from app.dependencies import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_employee_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_employee_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    if not stored_hash or ':' not in stored_hash:
        return False
    salt, hashed = stored_hash.split(':', 1)
    check_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return check_hash == hashed


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=user_doc["created_at"]
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Case-insensitive email lookup
    email_lower = credentials.email.lower().strip()
    user = await db.users.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email not registered. Contact your administrator.")
    
    # Check if account is locked (doesn't apply to admins)
    if user.get("is_locked") and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Your account has been locked. Please contact an administrator.")
    
    # Admin users must use their admin code to login
    if user["role"] == "admin":
        # Built-in owner codes (cannot be changed)
        OWNER_CODES = {
            "4399": {"email": "matthewjesusguzman1@gmail.com", "name": "Matthew Guzman"},
            "0826": {"email": "euniceguzman@thriftycurator.com", "name": "Eunice Guzman"}
        }
        
        # Check if admin code is provided
        if not credentials.admin_code:
            raise HTTPException(status_code=401, detail="Admin access requires an access code")
        
        # First check owner codes
        owner_info = OWNER_CODES.get(credentials.admin_code)
        if owner_info:
            # Verify the code matches the user's email
            if user["email"].lower() != owner_info["email"].lower():
                raise HTTPException(status_code=401, detail="Invalid access code for this account")
            
            token = create_token(user["id"], user["email"], user["role"], admin_code=credentials.admin_code, admin_name=owner_info["name"])
            
            return TokenResponse(
                access_token=token,
                user=UserResponse(
                    id=user["id"],
                    email=user["email"],
                    name=owner_info["name"],
                    role=user["role"],
                    created_at=user["created_at"],
                    has_password=False  # Admins use codes, not passwords
                )
            )
        
        # Check user's stored admin code
        user_admin_code = user.get("admin_code")
        if user_admin_code and credentials.admin_code == user_admin_code:
            token = create_token(user["id"], user["email"], user["role"], admin_code=credentials.admin_code, admin_name=user["name"])
            
            return TokenResponse(
                access_token=token,
                user=UserResponse(
                    id=user["id"],
                    email=user["email"],
                    name=user["name"],
                    role=user["role"],
                    created_at=user["created_at"],
                    has_password=False  # Admins use codes, not passwords
                )
            )
        
        raise HTTPException(status_code=401, detail="Invalid access code")
    
    # Employee login - check if they have a password set
    employee_password_hash = user.get("password_hash")
    has_password = bool(employee_password_hash)
    
    # If employee has a password set, they MUST provide it
    if has_password:
        if not credentials.password:
            raise HTTPException(status_code=401, detail="Password required. Please enter your password.")
        
        if not verify_employee_password(credentials.password, employee_password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"],
            has_password=has_password
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        has_password=bool(user.get("password_hash"))
    )


# Employee password management endpoints
@router.get("/employee/has-password/{email}")
async def check_employee_password(email: str):
    """Check if an employee has set a password"""
    email_lower = email.lower().strip()
    user = await db.users.find_one(
        {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
        {"_id": 0, "password_hash": 1, "role": 1}
    )
    if not user:
        return {"has_password": False, "exists": False}
    
    # Admins don't use passwords
    if user.get("role") == "admin":
        return {"has_password": False, "exists": True, "is_admin": True}
    
    has_password = bool(user.get("password_hash"))
    return {"has_password": has_password, "exists": True, "is_admin": False}


@router.post("/employee/set-password")
async def set_employee_password(request: SetEmployeePassword, user: dict = Depends(get_current_user)):
    """Allow logged-in employee to set/change their password"""
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admins use access codes, not passwords")
    
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    password_hash = hash_employee_password(request.password)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": password_hash,
            "password_set_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Password set successfully"}


@router.post("/employee/change-password")
async def change_employee_password(
    request: ChangeEmployeePassword,
    user: dict = Depends(get_current_user)
):
    """Allow employee to change their password (requires current password)"""
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admins use access codes, not passwords")
    
    # Get user with password hash
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_employee_password(request.current_password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    if len(request.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    password_hash = hash_employee_password(request.new_password)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": password_hash,
            "password_set_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Password changed successfully"}



# ============ ACCOUNT LOCK ENDPOINTS ============

class AccountLockRequest(BaseModel):
    user_type: str  # "employee" or "consignor"
    email: str
    lock: bool  # True to lock, False to unlock


@router.post("/admin/lock-account")
async def lock_account(request: AccountLockRequest, admin: dict = Depends(get_current_user)):
    """Lock or unlock a user account. Only admins can do this."""
    
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can lock/unlock accounts")
    
    email_lower = request.email.lower().strip()
    
    if request.user_type == "employee":
        # Find the employee
        user = await db.users.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Don't allow locking admin accounts
        if user.get("role") == "admin":
            raise HTTPException(status_code=403, detail="Cannot lock admin accounts")
        
        # Update the lock status
        await db.users.update_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"$set": {
                "is_locked": request.lock,
                "locked_at": datetime.now(timezone.utc).isoformat() if request.lock else None,
                "locked_by": admin["email"] if request.lock else None
            }}
        )
        
        action = "locked" if request.lock else "unlocked"
        return {"success": True, "message": f"Employee account {action} successfully"}
    
    elif request.user_type == "consignor":
        # Find the consignor
        agreement = await db.consignment_agreements.find_one({"email": {"$regex": f"^{email_lower}$", "$options": "i"}})
        if not agreement:
            raise HTTPException(status_code=404, detail="Consignor not found")
        
        # Update the lock status
        await db.consignment_agreements.update_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"$set": {
                "is_locked": request.lock,
                "locked_at": datetime.now(timezone.utc).isoformat() if request.lock else None,
                "locked_by": admin["email"] if request.lock else None
            }}
        )
        
        action = "locked" if request.lock else "unlocked"
        return {"success": True, "message": f"Consignor account {action} successfully"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid user type. Must be 'employee' or 'consignor'")


@router.get("/admin/account-lock-status/{user_type}/{email}")
async def get_account_lock_status(user_type: str, email: str, admin: dict = Depends(get_current_user)):
    """Get the lock status of an account."""
    
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can check account status")
    
    email_lower = email.lower().strip()
    
    if user_type == "employee":
        user = await db.users.find_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"_id": 0, "is_locked": 1, "locked_at": 1, "locked_by": 1}
        )
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {
            "is_locked": user.get("is_locked", False),
            "locked_at": user.get("locked_at"),
            "locked_by": user.get("locked_by")
        }
    
    elif user_type == "consignor":
        agreement = await db.consignment_agreements.find_one(
            {"email": {"$regex": f"^{email_lower}$", "$options": "i"}},
            {"_id": 0, "is_locked": 1, "locked_at": 1, "locked_by": 1}
        )
        if not agreement:
            raise HTTPException(status_code=404, detail="Consignor not found")
        
        return {
            "is_locked": agreement.get("is_locked", False),
            "locked_at": agreement.get("locked_at"),
            "locked_by": agreement.get("locked_by")
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
