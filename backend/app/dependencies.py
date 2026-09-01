from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta

from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from app.database import db

security = HTTPBearer()


async def get_db():
    """Dependency to get database instance"""
    return db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str, admin_code: str = None, admin_name: str = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    if admin_code:
        payload["admin_code"] = admin_code
    if admin_name:
        payload["admin_name"] = admin_name
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_consignor_token(email: str, full_name: str = None) -> str:
    payload = {
        "sub": f"consignor:{email}",
        "email": email,
        "role": "consignor",
        "name": full_name or "",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_consignor_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Authenticate a consignor session token (magic link or password login)."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("role") != "consignor" or not payload.get("email"):
        raise HTTPException(status_code=403, detail="Consignor access required")
    return {"email": payload["email"].lower(), "name": payload.get("name", "")}


async def get_consignor_or_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Allow either a consignor session (returns their email) or an admin user."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("role") == "consignor" and payload.get("email"):
        return {"type": "consignor", "email": payload["email"].lower()}
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "role": 1, "email": 1})
    if user and user.get("role") == "admin":
        return {"type": "admin", "email": user.get("email")}
    raise HTTPException(status_code=403, detail="Not authorized")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Add admin_code and admin_name to user dict if present in token
        if payload.get("admin_code"):
            user["admin_code"] = payload["admin_code"]
        if payload.get("admin_name"):
            user["admin_name"] = payload["admin_name"]
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
