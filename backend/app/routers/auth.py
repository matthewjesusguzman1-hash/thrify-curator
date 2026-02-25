from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import create_token, get_current_user
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.dependencies import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email not registered. Contact your administrator.")
    
    # Admin users must use their admin code to login
    if user["role"] == "admin":
        # Each admin code maps to a specific admin
        ADMIN_CODES = {
            "4399": {"email": "matthewjesusguzman1@gmail.com", "name": "Matthew Guzman"},
            "0826": {"email": "euniceguzman@thriftycurator.com", "name": "Eunice Guzman"}
        }
        
        # Check if admin code is provided
        if not credentials.admin_code:
            raise HTTPException(status_code=401, detail="Admin access requires an access code")
        
        # Verify the code is valid
        admin_info = ADMIN_CODES.get(credentials.admin_code)
        if not admin_info:
            raise HTTPException(status_code=401, detail="Invalid access code")
        
        # Store which admin code was used in the token payload
        token = create_token(user["id"], user["email"], user["role"], admin_code=credentials.admin_code, admin_name=admin_info["name"])
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                name=admin_info["name"],  # Use the admin name from code
                role=user["role"],
                created_at=user["created_at"]
            )
        )
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )
