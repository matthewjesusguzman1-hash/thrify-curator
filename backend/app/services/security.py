import bcrypt
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

from app.database import db

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def check_lockout(identifier: str):
    """Raise 429 if this identifier is currently locked out."""
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return
    locked_until = doc.get("locked_until")
    if locked_until:
        lu = datetime.fromisoformat(locked_until)
        now = datetime.now(timezone.utc)
        if lu > now:
            mins = max(1, int((lu - now).total_seconds() // 60) + 1)
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Please try again in {mins} minute(s).")
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failed_attempt(identifier: str):
    """Record a failed attempt; lock out after MAX_ATTEMPTS within the window."""
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one({"identifier": identifier})
    window_start = doc.get("first_attempt_at") if doc else None
    if doc and window_start and datetime.fromisoformat(window_start) > now - timedelta(minutes=LOCKOUT_MINUTES):
        count = doc.get("count", 0) + 1
        update = {"count": count}
        if count >= MAX_ATTEMPTS:
            update["locked_until"] = (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update})
    else:
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"identifier": identifier, "count": 1, "first_attempt_at": now.isoformat(), "locked_until": None}},
            upsert=True
        )


async def clear_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


def hash_user_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_user_password(password: str, stored_hash: str):
    """Verify against bcrypt or legacy 'salt:sha256' hashes.
    Returns (ok, needs_rehash)."""
    if not stored_hash:
        return False, False
    if stored_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")), False
        except ValueError:
            return False, False
    if ":" in stored_hash:
        salt, hashed = stored_hash.split(":", 1)
        ok = hashlib.sha256((password + salt).encode()).hexdigest() == hashed
        return ok, ok
    return False, False
