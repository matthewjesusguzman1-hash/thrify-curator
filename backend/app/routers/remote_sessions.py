from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
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
    employee_id: Optional[str] = None


async def notify_admins_session_event(event: SessionEvent, host: str):
    """Push notify admins when a remote worker connects or is rejected"""
    try:
        mapping = await db.anydesk_id_mappings.find_one({"anydesk_id": event.anydesk_id}) if event.anydesk_id else None
        who = (mapping and mapping.get("worker_name")) or event.alias or f"AnyDesk {event.anydesk_id}"
        
        if event.auth_method == "REJECTED":
            title = "🚫 Remote connection REJECTED"
            body = f"{who} was rejected connecting to {host}"
        else:
            title = "🖥️ Remote worker connected"
            body = f"{who} connected to {host} via AnyDesk"
        
        from app.services.apns_service import send_admin_push_notification
        from app.services.web_push_service import get_web_push_service
        
        await send_admin_push_notification(title=title, body=body, notification_type="remote_session")
        await get_web_push_service().send_to_admins(
            db=db, title=title, body=body, url="/remote-sessions", notification_type="remote_session"
        )
    except Exception as e:
        print(f"[RemoteSessions] Failed to notify admins: {e}")


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
            await notify_admins_session_event(event, batch.host)
        
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


@router.get("/cross-check")
async def hours_cross_check(admin: dict = Depends(get_admin_user)):
    """Flag mismatches between clock-ins and active AnyDesk sessions.
    - Clocked in (not by admin) but no active AnyDesk session
    - AnyDesk session active >5 min but worker not clocked in
    """
    now = datetime.now(timezone.utc)
    flags = []
    
    mappings = await db.anydesk_id_mappings.find({}, {"_id": 0}).to_list(200)
    mapping_by_anydesk = {m["anydesk_id"]: m for m in mappings}
    employee_anydesk_ids = {}
    for m in mappings:
        if m.get("employee_id"):
            employee_anydesk_ids.setdefault(m["employee_id"], []).append(m["anydesk_id"])
    
    # Active sessions = no end recorded, started within last 12h (staleness guard)
    cutoff = (now - timedelta(hours=12)).isoformat()
    active_sessions = await db.anydesk_sessions.find(
        {"ended_at": None, "auth_method": {"$ne": "REJECTED"}, "started_at": {"$gte": cutoff}},
        {"_id": 0, "fingerprint": 0}
    ).to_list(100)
    active_by_anydesk_id = {}
    for s in active_sessions:
        if s.get("anydesk_id"):
            active_by_anydesk_id.setdefault(s["anydesk_id"], []).append(s)
    
    open_entries = await db.time_entries.find({"clock_out": None}, {"_id": 0}).to_list(100)
    open_by_employee = {e["user_id"]: e for e in open_entries if e.get("user_id")}
    
    # 1. Clocked in but no active AnyDesk session (skip admin-clocked entries)
    for entry in open_entries:
        if entry.get("admin_clocked"):
            continue
        emp_id = entry.get("user_id")
        anydesk_ids = employee_anydesk_ids.get(emp_id)
        if not anydesk_ids:
            continue  # not a mapped remote worker
        if not any(aid in active_by_anydesk_id for aid in anydesk_ids):
            flags.append({
                "type": "clocked_in_no_session",
                "severity": "warning",
                "employee_id": emp_id,
                "worker_name": entry.get("user_name", "Unknown"),
                "detail": f"{entry.get('user_name', 'Unknown')} is clocked in (since {entry.get('last_clock_in') or entry.get('clock_in')}) but has no active AnyDesk session"
            })
    
    # 2. AnyDesk active >5 min but not clocked in
    for s in active_sessions:
        mapping = mapping_by_anydesk.get(s.get("anydesk_id"))
        try:
            started = datetime.fromisoformat(s["started_at"])
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            minutes_active = (now - started).total_seconds() / 60
        except (ValueError, TypeError):
            minutes_active = 0
        if minutes_active < 5:
            continue
        if mapping and mapping.get("employee_id"):
            if mapping["employee_id"] not in open_by_employee:
                flags.append({
                    "type": "session_no_clock_in",
                    "severity": "alert",
                    "employee_id": mapping["employee_id"],
                    "worker_name": mapping.get("worker_name") or s.get("alias") or s.get("anydesk_id"),
                    "detail": f"{mapping.get('worker_name')} has an active AnyDesk session on {s.get('host')} for {int(minutes_active)} min but is NOT clocked in"
                })
        elif not mapping:
            flags.append({
                "type": "unmapped_active_session",
                "severity": "info",
                "worker_name": s.get("alias") or f"AnyDesk {s.get('anydesk_id')}",
                "detail": f"Active session from unmapped AnyDesk ID {s.get('anydesk_id')} on {s.get('host')} - assign it to a worker to enable cross-checks"
            })
    
    return {"flags": flags, "active_sessions": len(active_sessions), "open_clock_ins": len(open_entries)}


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
            "employee_id": mapping.employee_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}
