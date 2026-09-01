from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import hashlib
import secrets
import uuid
import os

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/remote-sessions", tags=["Remote Sessions"])


def verify_watcher_key(x_watcher_key: Optional[str] = Header(None)):
    expected = os.environ.get("ANYDESK_WATCHER_KEY")
    if not expected or not x_watcher_key or not secrets.compare_digest(x_watcher_key, expected):
        raise HTTPException(status_code=401, detail="Invalid watcher key")
    return True


class SessionEvent(BaseModel):
    event_type: str  # "session_start" | "session_end"
    anydesk_id: Optional[str] = None
    alias: Optional[str] = None
    auth_method: Optional[str] = None
    direction: Optional[str] = "Incoming"
    timestamp: str  # ISO datetime
    raw_line: Optional[str] = None


class SessionLogBatch(BaseModel):
    host: str
    events: List[SessionEvent]


class AnydeskMapping(BaseModel):
    anydesk_id: str
    worker_name: str
    employee_email: Optional[str] = None


@router.post("/log")
async def log_sessions(batch: SessionLogBatch, _: bool = Depends(verify_watcher_key)):
    """Receive parsed AnyDesk session events from the Windows watcher script"""
    processed = 0
    duplicates = 0
    matched_ends = 0
    
    for event in batch.events:
        fingerprint = hashlib.sha256(
            f"{batch.host}|{event.event_type}|{event.timestamp}|{event.anydesk_id}|{event.raw_line}".encode()
        ).hexdigest()
        
        if await db.anydesk_sessions.find_one({"fingerprint": fingerprint}) or \
           await db.anydesk_session_events.find_one({"fingerprint": fingerprint}):
            duplicates += 1
            continue
        
        if event.event_type == "session_start":
            await db.anydesk_sessions.insert_one({
                "id": str(uuid.uuid4()),
                "host": batch.host,
                "anydesk_id": event.anydesk_id,
                "alias": event.alias,
                "auth_method": event.auth_method,
                "direction": event.direction or "Incoming",
                "started_at": event.timestamp,
                "ended_at": None,
                "duration_seconds": None,
                "fingerprint": fingerprint,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            processed += 1
        
        elif event.event_type == "session_end":
            # Match the most recent open session (by anydesk_id if known, else by host)
            query = {"host": batch.host, "ended_at": None, "started_at": {"$lte": event.timestamp}}
            if event.anydesk_id:
                query["anydesk_id"] = event.anydesk_id
            open_session = await db.anydesk_sessions.find_one(query, sort=[("started_at", -1)])
            
            # Record the end event fingerprint for dedup
            await db.anydesk_session_events.insert_one({
                "fingerprint": fingerprint,
                "host": batch.host,
                "event_type": "session_end",
                "timestamp": event.timestamp,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            if open_session:
                try:
                    start = datetime.fromisoformat(open_session["started_at"])
                    end = datetime.fromisoformat(event.timestamp)
                    duration = max(0, int((end - start).total_seconds()))
                except (ValueError, TypeError):
                    duration = None
                await db.anydesk_sessions.update_one(
                    {"id": open_session["id"]},
                    {"$set": {"ended_at": event.timestamp, "duration_seconds": duration}}
                )
                matched_ends += 1
            processed += 1
    
    return {"success": True, "processed": processed, "duplicates": duplicates, "matched_ends": matched_ends}


@router.get("")
async def list_sessions(limit: int = 100, admin: dict = Depends(get_admin_user)):
    """Admin: list AnyDesk remote sessions, newest first, with worker name mapping"""
    limit = min(limit, 500)
    sessions = await db.anydesk_sessions.find({}, {"_id": 0, "fingerprint": 0}).sort("started_at", -1).to_list(limit)
    
    mappings = await db.anydesk_id_mappings.find({}, {"_id": 0}).to_list(200)
    mapping_by_id = {m["anydesk_id"]: m for m in mappings}
    
    for s in sessions:
        m = mapping_by_id.get(s.get("anydesk_id"))
        s["worker_name"] = m["worker_name"] if m else None
        s["employee_email"] = m.get("employee_email") if m else None
    
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/mappings")
async def list_mappings(admin: dict = Depends(get_admin_user)):
    mappings = await db.anydesk_id_mappings.find({}, {"_id": 0}).to_list(200)
    return {"mappings": mappings}


@router.post("/map")
async def map_anydesk_id(mapping: AnydeskMapping, admin: dict = Depends(get_admin_user)):
    """Admin: assign a worker name to an AnyDesk ID"""
    await db.anydesk_id_mappings.update_one(
        {"anydesk_id": mapping.anydesk_id},
        {"$set": {
            "anydesk_id": mapping.anydesk_id,
            "worker_name": mapping.worker_name,
            "employee_email": mapping.employee_email,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}
