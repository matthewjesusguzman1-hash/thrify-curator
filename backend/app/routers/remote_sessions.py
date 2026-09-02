from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import hashlib
import math
import secrets
import uuid
import os

from app.database import db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/remote-sessions", tags=["Remote Sessions"])

GRACE_MINUTES = 3  # How long an AnyDesk session can be active before flagging no clock-in
MERGE_GAP_MINUTES = 2  # Sessions from the same ID within this gap are merged into one


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


class BlockRequest(BaseModel):
    anydesk_id: str
    reason: Optional[str] = None


class DisconnectRequest(BaseModel):
    session_id: Optional[str] = None
    anydesk_id: Optional[str] = None


async def _is_silenced() -> bool:
    """Check if remote session notifications are currently silenced."""
    setting = await db.anydesk_settings.find_one({"key": "notifications_silenced"})
    return bool(setting and setting.get("value"))


async def notify_admins_session_event(event: SessionEvent, host: str, duration_seconds: int = None):
    """Push notify admins when a remote worker connects, disconnects, or is rejected"""
    if await _is_silenced():
        print(f"[RemoteSessions] Notifications silenced — skipping push for {event.event_type}")
        return
    try:
        mapping = await db.anydesk_id_mappings.find_one({"anydesk_id": event.anydesk_id}) if event.anydesk_id else None
        who = (mapping and mapping.get("worker_name")) or event.alias or f"AnyDesk {event.anydesk_id}"
        
        if event.auth_method == "REJECTED":
            title = "🚫 Remote connection REJECTED"
            body = f"{who} was rejected connecting to {host}"
        elif event.event_type == "session_end":
            title = "📴 Remote worker disconnected"
            if duration_seconds and duration_seconds > 0:
                mins = duration_seconds // 60
                body = f"{who} disconnected from {host} (session: {mins}min)"
            else:
                body = f"{who} disconnected from {host}"
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


async def notify_admins_flag(title: str, body: str):
    """Push notify admins when a cross-check mismatch flag is detected"""
    if await _is_silenced():
        print(f"[RemoteSessions] Notifications silenced — skipping flag push: {title}")
        return
    try:
        from app.services.apns_service import send_admin_push_notification
        from app.services.web_push_service import get_web_push_service

        await send_admin_push_notification(title=title, body=body, notification_type="remote_session_flag")
        await get_web_push_service().send_to_admins(
            db=db, title=title, body=body, url="/remote-sessions", notification_type="remote_session_flag"
        )
    except Exception as e:
        print(f"[RemoteSessions] Failed to send flag notification: {e}")


def _round_up_to_minute(seconds: float) -> float:
    """Matches payroll rounding: round UP to the next whole minute, return decimal hours."""
    if seconds <= 0:
        return 0
    minutes_raw = round(seconds / 60, 6)
    total_minutes = math.ceil(minutes_raw)
    return total_minutes / 60


async def auto_clock_out_for_disconnect(anydesk_id: str, disconnect_iso: str):
    """When AnyDesk session ends, auto clock-out the mapped employee if still clocked in.
    Sets clock_out = disconnect time and adds an 'anydesk_auto_clocked_out' note."""
    mapping = await db.anydesk_id_mappings.find_one({"anydesk_id": anydesk_id})
    if not mapping or not mapping.get("employee_id"):
        return None

    employee_id = mapping["employee_id"]
    worker_name = mapping.get("worker_name", "Unknown")

    active_entry = await db.time_entries.find_one(
        {"user_id": employee_id, "clock_out": None}, {"_id": 0}
    )
    if not active_entry:
        return None  # Not clocked in — nothing to do

    # Calculate hours using same logic as normal clock-out
    try:
        disconnect_time = datetime.fromisoformat(disconnect_iso)
        if disconnect_time.tzinfo is None:
            disconnect_time = disconnect_time.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        disconnect_time = datetime.now(timezone.utc)

    last_clock_in = active_entry.get("last_clock_in", active_entry["clock_in"])
    clock_in_time = datetime.fromisoformat(last_clock_in)
    if clock_in_time.tzinfo is None:
        clock_in_time = clock_in_time.replace(tzinfo=timezone.utc)

    session_seconds = max(0, (disconnect_time - clock_in_time).total_seconds())
    accumulated_seconds = active_entry.get("accumulated_hours", 0.0) * 3600
    total_seconds = accumulated_seconds + session_seconds
    total_hours = _round_up_to_minute(total_seconds)

    clock_out_iso = disconnect_time.isoformat()
    await db.time_entries.update_one(
        {"id": active_entry["id"]},
        {"$set": {
            "clock_out": clock_out_iso,
            "total_hours": total_hours,
            "accumulated_hours": total_hours,
            "auto_clocked_out": True,
            "anydesk_auto_clocked_out": True,
            "anydesk_auto_clock_out_note": f"Auto-closed by AnyDesk disconnect at {clock_out_iso}"
        }}
    )
    print(f"[RemoteSessions] Auto clocked-out {worker_name} (entry {active_entry['id']}) at {clock_out_iso}, hours={total_hours:.4f}")

    # Notify admins about auto clock-out
    await notify_admins_flag(
        title="⏹️ Auto clock-out",
        body=f"{worker_name} was auto-clocked out (AnyDesk disconnected). {total_hours:.2f}h logged."
    )
    return active_entry["id"]


async def run_cross_check_and_notify():
    """Run the cross-check logic and push-notify admins for any flags found.
    Uses a dedup key so the same flag isn't pushed more than once per hour."""
    now = datetime.now(timezone.utc)

    mappings = await db.anydesk_id_mappings.find({}, {"_id": 0}).to_list(200)
    mapping_by_anydesk = {m["anydesk_id"]: m for m in mappings}
    employee_anydesk_ids = {}
    for m in mappings:
        if m.get("employee_id"):
            employee_anydesk_ids.setdefault(m["employee_id"], []).append(m["anydesk_id"])

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

    flags = []

    # 1. Clocked in but no active AnyDesk session (skip admin-clocked)
    for entry in open_entries:
        if entry.get("admin_clocked"):
            continue
        emp_id = entry.get("user_id")
        anydesk_ids = employee_anydesk_ids.get(emp_id)
        if not anydesk_ids:
            continue
        if not any(aid in active_by_anydesk_id for aid in anydesk_ids):
            flags.append({
                "type": "clocked_in_no_session",
                "employee_id": emp_id,
                "worker_name": entry.get("user_name", "Unknown"),
                "title": "⚠️ Clocked in, no AnyDesk",
                "body": f"{entry.get('user_name', 'Unknown')} is clocked in but has no active AnyDesk session"
            })

    # 2. AnyDesk active > GRACE_MINUTES but not clocked in
    for s in active_sessions:
        mapping = mapping_by_anydesk.get(s.get("anydesk_id"))
        try:
            started = datetime.fromisoformat(s["started_at"])
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            minutes_active = (now - started).total_seconds() / 60
        except (ValueError, TypeError):
            minutes_active = 0
        if minutes_active < GRACE_MINUTES:
            continue
        if mapping and mapping.get("employee_id"):
            if mapping["employee_id"] not in open_by_employee:
                flags.append({
                    "type": "session_no_clock_in",
                    "employee_id": mapping["employee_id"],
                    "worker_name": mapping.get("worker_name") or s.get("alias") or s.get("anydesk_id"),
                    "title": "🚨 AnyDesk active, not clocked in",
                    "body": f"{mapping.get('worker_name')} has been on AnyDesk for {int(minutes_active)} min but is NOT clocked in"
                })

    # Dedup: only push a flag if we haven't sent the same type+employee within the last hour
    one_hour_ago = (now - timedelta(hours=1)).isoformat()
    for flag in flags:
        dedup_key = f"{flag['type']}:{flag.get('employee_id', 'unknown')}"
        already_sent = await db.anydesk_flag_notifications.find_one({
            "dedup_key": dedup_key, "sent_at": {"$gte": one_hour_ago}
        })
        if not already_sent:
            await notify_admins_flag(title=flag["title"], body=flag["body"])
            await db.anydesk_flag_notifications.insert_one({
                "dedup_key": dedup_key,
                "type": flag["type"],
                "sent_at": now.isoformat(),
                "detail": flag["body"]
            })
            print(f"[RemoteSessions] Flag notification sent: {flag['type']} for {flag.get('worker_name')}")
        else:
            print(f"[RemoteSessions] Flag deduped (already sent within 1h): {dedup_key}")


@router.post("/log")
async def log_sessions(batch: SessionLogBatch, _: bool = Depends(verify_watcher_key)):
    """Receive parsed AnyDesk session events from the Windows watcher script"""
    processed = 0
    duplicates = 0
    matched_ends = 0
    auto_clocked_out = []
    now = datetime.now(timezone.utc)
    
    for event in batch.events:
        fingerprint = hashlib.sha256(
            f"{batch.host}|{event.event_type}|{event.timestamp}|{event.anydesk_id}|{event.raw_line}".encode()
        ).hexdigest()
        
        if await db.anydesk_sessions.find_one({"fingerprint": fingerprint}) or \
           await db.anydesk_session_events.find_one({"fingerprint": fingerprint}):
            duplicates += 1
            continue
        
        if event.event_type == "session_start":
            # Check if we should merge with a recently-ended session from the same ID
            merged = False
            if event.anydesk_id:
                try:
                    start_time = datetime.fromisoformat(event.timestamp)
                    if start_time.tzinfo is None:
                        start_time = start_time.replace(tzinfo=timezone.utc)
                    merge_cutoff = (start_time - timedelta(minutes=MERGE_GAP_MINUTES)).isoformat()
                    recent_ended = await db.anydesk_sessions.find_one({
                        "host": batch.host,
                        "anydesk_id": event.anydesk_id,
                        "ended_at": {"$ne": None, "$gte": merge_cutoff}
                    }, sort=[("ended_at", -1)])
                    if recent_ended:
                        # Reopen the previous session — next session_end will close it with updated duration
                        await db.anydesk_sessions.update_one(
                            {"id": recent_ended["id"]},
                            {"$set": {"ended_at": None, "duration_seconds": None}}
                        )
                        await db.anydesk_session_events.insert_one({
                            "fingerprint": fingerprint,
                            "host": batch.host,
                            "event_type": "session_merge",
                            "timestamp": event.timestamp,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
                        merged = True
                        processed += 1
                        print(f"[RemoteSessions] Merged session start into existing session {recent_ended['id']} for {event.anydesk_id}")
                except (ValueError, TypeError):
                    pass

            if not merged:
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
            # Only send notifications/cross-checks for recent events (< 5 min old)
            # This prevents notification floods when the watcher rescans historical logs
            try:
                event_time = datetime.fromisoformat(event.timestamp)
                if event_time.tzinfo is None:
                    event_time = event_time.replace(tzinfo=timezone.utc)
                event_age_minutes = (now - event_time).total_seconds() / 60
            except (ValueError, TypeError):
                event_age_minutes = 0
            if event_age_minutes <= 5:
                await notify_admins_session_event(event, batch.host)
                # Check blocklist — if blocked, queue disconnect command + urgent alert
                if event.anydesk_id:
                    blocked = await db.anydesk_blocklist.find_one({"anydesk_id": event.anydesk_id})
                    if blocked:
                        # Queue disconnect with 5-min dedup to avoid rapid kill loops
                        dedup_key = f"blocked_connect:{event.anydesk_id}"
                        five_min_ago = (now - timedelta(minutes=5)).isoformat()
                        recent_disconnect = await db.anydesk_flag_notifications.find_one({
                            "dedup_key": dedup_key, "sent_at": {"$gte": five_min_ago}
                        })
                        if not recent_disconnect:
                            # Queue security kill (no restart)
                            await db.anydesk_commands.insert_one({
                                "id": str(uuid.uuid4()),
                                "command": "security_kill",
                                "anydesk_id": event.anydesk_id,
                                "reason": f"Blocked ID {event.anydesk_id} connected — security kill",
                                "status": "pending",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                            alert_detail = f"BLOCKED AnyDesk ID {event.anydesk_id} connected to {batch.host} — AnyDesk killed. Use 'Restart AnyDesk' button after adding ID to AnyDesk's ACL."
                            await db.anydesk_flag_notifications.insert_one({
                                "dedup_key": dedup_key,
                                "type": "blocked_connection",
                                "sent_at": datetime.now(timezone.utc).isoformat(),
                                "detail": alert_detail,
                                "severity": "critical"
                            })
                            await notify_admins_flag(
                                title="BLOCKED user connected — AnyDesk killed!",
                                body=alert_detail
                            )
                    # Check if unmapped — store alert
                    else:
                        mapping = await db.anydesk_id_mappings.find_one({"anydesk_id": event.anydesk_id})
                        if not mapping:
                            one_hour_ago = (now - timedelta(hours=1)).isoformat()
                            dedup_key = f"unmapped_connect:{event.anydesk_id}"
                            already = await db.anydesk_flag_notifications.find_one({
                                "dedup_key": dedup_key, "sent_at": {"$gte": one_hour_ago}
                            })
                            if not already:
                                await db.anydesk_flag_notifications.insert_one({
                                    "dedup_key": dedup_key,
                                    "type": "unmapped_connection",
                                    "sent_at": datetime.now(timezone.utc).isoformat(),
                                    "detail": f"Unmapped AnyDesk ID {event.anydesk_id} connected to {batch.host} — assign to enable cross-checks",
                                    "severity": "warning"
                                })
                try:
                    await run_cross_check_and_notify()
                except Exception as e:
                    print(f"[RemoteSessions] Cross-check after session_start failed: {e}")
            else:
                print(f"[RemoteSessions] Skipping notification for historical event ({int(event_age_minutes)}min old): {event.anydesk_id}")
        
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
            
            resolved_anydesk_id = None
            duration = None
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
                resolved_anydesk_id = open_session.get("anydesk_id")

            # Notify admins of disconnect (only for recent events)
            notify_anydesk_id = event.anydesk_id or resolved_anydesk_id
            try:
                end_time = datetime.fromisoformat(event.timestamp)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
                end_age_minutes = (now - end_time).total_seconds() / 60
            except (ValueError, TypeError):
                end_age_minutes = 0

            if end_age_minutes <= 5:
                if notify_anydesk_id:
                    disconnect_event = SessionEvent(
                        event_type="session_end",
                        anydesk_id=notify_anydesk_id,
                        timestamp=event.timestamp
                    )
                    await notify_admins_session_event(disconnect_event, batch.host, duration_seconds=duration)

            # Auto clock-out: reuse the already-computed end_age_minutes
            target_anydesk_id = event.anydesk_id or resolved_anydesk_id
            if target_anydesk_id:
                if end_age_minutes <= 5:
                    try:
                        entry_id = await auto_clock_out_for_disconnect(target_anydesk_id, event.timestamp)
                        if entry_id:
                            auto_clocked_out.append(entry_id)
                    except Exception as e:
                        print(f"[RemoteSessions] Auto clock-out failed for {target_anydesk_id}: {e}")
                else:
                    print(f"[RemoteSessions] Skipping auto-clock-out for historical disconnect ({int(end_age_minutes)}min old): {target_anydesk_id}")

            processed += 1
    
    return {
        "success": True,
        "processed": processed,
        "duplicates": duplicates,
        "matched_ends": matched_ends,
        "auto_clocked_out": auto_clocked_out
    }


@router.get("")
async def list_sessions(
    limit: int = 100,
    date: Optional[str] = None,
    month: Optional[str] = None,
    employee: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: list AnyDesk remote sessions with date/employee filtering and clock-in cross-reference.
    - date: YYYY-MM-DD — show sessions for a specific day
    - month: YYYY-MM — show sessions for a specific month
    - employee: employee_id or worker name substring
    """
    limit = min(limit, 1000)
    query: dict = {}

    # Date filtering
    if date:
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            query["started_at"] = {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        except ValueError:
            pass
    elif month:
        try:
            month_start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            query["started_at"] = {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        except ValueError:
            pass

    sessions = await db.anydesk_sessions.find(query, {"_id": 0, "fingerprint": 0}).sort("started_at", -1).to_list(limit)

    mappings = await db.anydesk_id_mappings.find({}, {"_id": 0}).to_list(200)
    mapping_by_id = {m["anydesk_id"]: m for m in mappings}

    # Employee filter
    if employee:
        emp_lower = employee.lower()
        matched_anydesk_ids = set()
        for m in mappings:
            if (m.get("employee_id") == employee or
                emp_lower in (m.get("worker_name") or "").lower()):
                matched_anydesk_ids.add(m["anydesk_id"])
        sessions = [s for s in sessions if s.get("anydesk_id") in matched_anydesk_ids]

    # Collect employee IDs for time entry cross-reference
    employee_ids = set()
    for s in sessions:
        m = mapping_by_id.get(s.get("anydesk_id"))
        s["worker_name"] = m["worker_name"] if m else None
        s["employee_email"] = m.get("employee_email") if m else None
        s["employee_id"] = m.get("employee_id") if m else None
        if m and m.get("employee_id"):
            employee_ids.add(m["employee_id"])

    # Fetch time entries for mapped employees in the same date range
    time_entries_by_employee = {}
    if employee_ids:
        te_query = {"user_id": {"$in": list(employee_ids)}}
        if "started_at" in query:
            te_query["clock_in"] = query["started_at"]
        time_entries = await db.time_entries.find(te_query, {"_id": 0}).to_list(500)
        for te in time_entries:
            uid = te.get("user_id")
            if uid:
                time_entries_by_employee.setdefault(uid, []).append(te)

    # Attach matching time entry to each session
    for s in sessions:
        s["time_entry"] = None
        emp_id = s.get("employee_id")
        if not emp_id or emp_id not in time_entries_by_employee:
            continue
        session_start = s.get("started_at", "")
        session_end = s.get("ended_at")
        for te in time_entries_by_employee[emp_id]:
            ci = te.get("clock_in", "")
            co = te.get("clock_out")
            # Match: time entry overlaps with session
            if co and session_start and co < session_start:
                continue
            if session_end and ci > session_end:
                continue
            s["time_entry"] = {
                "id": te.get("id"),
                "clock_in": ci,
                "clock_out": co,
                "total_hours": te.get("total_hours"),
                "admin_clocked": te.get("admin_clocked", False),
                "anydesk_auto_clocked_out": te.get("anydesk_auto_clocked_out", False),
            }
            break

    return {"sessions": sessions, "total": len(sessions)}


@router.get("/alerts")
async def list_alerts(
    limit: int = 100,
    date: Optional[str] = None,
    month: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: list historical cross-check alert notifications."""
    limit = min(limit, 500)
    query: dict = {}
    if date:
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            query["sent_at"] = {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        except ValueError:
            pass
    elif month:
        try:
            month_start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            query["sent_at"] = {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        except ValueError:
            pass
    alerts = await db.anydesk_flag_notifications.find(query, {"_id": 0}).sort("sent_at", -1).to_list(limit)
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/export")
async def export_sessions_csv(
    date: Optional[str] = None,
    month: Optional[str] = None,
    employee: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: export sessions as CSV."""
    from fastapi.responses import StreamingResponse
    import io, csv

    data = await list_sessions(limit=1000, date=date, month=month, employee=employee, admin=admin)
    sessions = data["sessions"]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Worker", "AnyDesk ID", "Host", "Start", "End", "Duration (min)", "Auth",
                      "Clock In", "Clock Out", "Hours Logged", "Auto Clock-Out"])
    for s in sessions:
        dur_min = round(s.get("duration_seconds", 0) / 60, 1) if s.get("duration_seconds") else ""
        te = s.get("time_entry") or {}
        writer.writerow([
            s.get("started_at", "")[:10],
            s.get("worker_name") or s.get("alias") or s.get("anydesk_id"),
            s.get("anydesk_id", ""),
            s.get("host", ""),
            s.get("started_at", ""),
            s.get("ended_at", ""),
            dur_min,
            s.get("auth_method", ""),
            te.get("clock_in", ""),
            te.get("clock_out", ""),
            round(te["total_hours"], 2) if te.get("total_hours") else "",
            "Yes" if te.get("anydesk_auto_clocked_out") else ""
        ])
    output.seek(0)
    filename = f"remote_sessions_{date or month or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/cross-check")
async def hours_cross_check(admin: dict = Depends(get_admin_user)):
    """Flag mismatches between clock-ins and active AnyDesk sessions.
    - Clocked in (not by admin) but no active AnyDesk session
    - AnyDesk session active > GRACE_MINUTES but worker not clocked in
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
    
    # 2. AnyDesk active > GRACE_MINUTES but not clocked in
    for s in active_sessions:
        mapping = mapping_by_anydesk.get(s.get("anydesk_id"))
        try:
            started = datetime.fromisoformat(s["started_at"])
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            minutes_active = (now - started).total_seconds() / 60
        except (ValueError, TypeError):
            minutes_active = 0
        if minutes_active < GRACE_MINUTES:
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


# ─── Blocklist ───────────────────────────────────────────────

@router.post("/block")
async def block_anydesk_id(req: BlockRequest, admin: dict = Depends(get_admin_user)):
    """Admin: block an AnyDesk ID. If they're currently connected, issues a security kill (AnyDesk dies, no restart).
    Admin must use 'Restart AnyDesk' button after adding ID to AnyDesk's ACL."""
    await db.anydesk_blocklist.update_one(
        {"anydesk_id": req.anydesk_id},
        {"$set": {
            "anydesk_id": req.anydesk_id,
            "reason": req.reason or "Blocked by admin",
            "blocked_by": admin.get("name", "Admin"),
            "blocked_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # If they have an active session, queue disconnect (security kill — no restart)
    active = await db.anydesk_sessions.find_one({
        "anydesk_id": req.anydesk_id, "ended_at": None
    })
    kicked = False
    if active:
        await db.anydesk_commands.insert_one({
            "id": str(uuid.uuid4()),
            "command": "security_kill",
            "anydesk_id": req.anydesk_id,
            "reason": f"Blocked & security-killed by {admin.get('name', 'Admin')}",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.anydesk_sessions.update_many(
            {"anydesk_id": req.anydesk_id, "ended_at": None},
            {"$set": {"ended_at": now_iso}}
        )
        kicked = True

    return {
        "success": True,
        "kicked": kicked,
        "message": f"AnyDesk ID {req.anydesk_id} blocked{' and AnyDesk killed' if kicked else ''}. Add this ID to AnyDesk > Settings > Security > Access Control List, then use Restart AnyDesk button."
    }


class UnblockRequest(BaseModel):
    admin_code: str


@router.post("/unblock/{anydesk_id}")
async def unblock_anydesk_id(anydesk_id: str, req: UnblockRequest, admin: dict = Depends(get_admin_user)):
    """Admin: remove an AnyDesk ID from the blocklist. Requires admin code for security."""
    # Validate admin code against ADMIN_OWNER_CODES
    codes_str = os.environ.get("ADMIN_OWNER_CODES", "")
    valid_codes = [entry.split(":")[0] for entry in codes_str.split("|") if entry.strip()]
    if req.admin_code not in valid_codes:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    result = await db.anydesk_blocklist.delete_one({"anydesk_id": anydesk_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="ID not in blocklist")
    return {"success": True}


@router.get("/blocklist")
async def get_blocklist(admin: dict = Depends(get_admin_user)):
    blocked = await db.anydesk_blocklist.find({}, {"_id": 0}).to_list(200)
    return {"blocked": blocked}


# ─── Disconnect / Watcher Commands ──────────────────────────

@router.post("/disconnect")
async def disconnect_session(req: DisconnectRequest, admin: dict = Depends(get_admin_user)):
    """Admin: issue a disconnect command for the watcher to execute AND close the session record."""
    anydesk_id = req.anydesk_id
    session_id = req.session_id
    if session_id and not anydesk_id:
        session = await db.anydesk_sessions.find_one({"id": session_id})
        if session:
            anydesk_id = session.get("anydesk_id")

    # Queue the kill command for the watcher
    cmd_id = str(uuid.uuid4())
    await db.anydesk_commands.insert_one({
        "id": cmd_id,
        "command": "disconnect",
        "anydesk_id": anydesk_id,
        "reason": f"Manual disconnect by {admin.get('name', 'Admin')}",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Auto-block the disconnected AnyDesk ID so they can't reconnect when AnyDesk restarts
    blocked = False
    if anydesk_id:
        await db.anydesk_blocklist.update_one(
            {"anydesk_id": anydesk_id},
            {"$set": {
                "anydesk_id": anydesk_id,
                "reason": f"Auto-blocked on disconnect by {admin.get('name', 'Admin')}",
                "blocked_by": admin.get("name", "Admin"),
                "blocked_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        blocked = True

    # Also close the session record in the DB so it stops showing as active
    closed = 0
    if session_id:
        result = await db.anydesk_sessions.update_one(
            {"id": session_id, "ended_at": None},
            {"$set": {"ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        closed = result.modified_count
    if anydesk_id:
        # Close ALL open sessions for this AnyDesk ID
        result = await db.anydesk_sessions.update_many(
            {"anydesk_id": anydesk_id, "ended_at": None},
            {"$set": {"ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        closed += result.modified_count

    # Recalculate durations for closed sessions
    if closed > 0:
        open_sessions = await db.anydesk_sessions.find({"duration_seconds": None, "ended_at": {"$ne": None}}).to_list(50)
        for s in open_sessions:
            try:
                start = datetime.fromisoformat(s["started_at"])
                end = datetime.fromisoformat(s["ended_at"])
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                if end.tzinfo is None:
                    end = end.replace(tzinfo=timezone.utc)
                dur = max(0, int((end - start).total_seconds()))
                await db.anydesk_sessions.update_one({"id": s["id"]}, {"$set": {"duration_seconds": dur}})
            except (ValueError, TypeError):
                pass

    return {"success": True, "command_id": cmd_id, "sessions_closed": closed, "blocked": blocked,
            "message": "Disconnect command queued, user blocked, and session(s) closed. AnyDesk will restart but the blocked user cannot reconnect."}


@router.post("/restart-anydesk")
async def restart_anydesk(admin: dict = Depends(get_admin_user)):
    """Admin: send command to watcher to restart AnyDesk. Use after security kill."""
    cmd_id = str(uuid.uuid4())
    await db.anydesk_commands.insert_one({
        "id": cmd_id,
        "command": "restart_anydesk",
        "anydesk_id": None,
        "reason": f"Manual restart by {admin.get('name', 'Admin')}",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "command_id": cmd_id, "message": "Restart command sent. AnyDesk should reopen within 10 seconds."}


@router.get("/watcher-commands")
async def get_watcher_commands(_: bool = Depends(verify_watcher_key)):
    """Watcher polls for pending commands."""
    commands = await db.anydesk_commands.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(20)
    # Also include blocked IDs for the watcher to auto-disconnect
    blocked = await db.anydesk_blocklist.find({}, {"_id": 0, "anydesk_id": 1}).to_list(200)
    blocked_ids = [b["anydesk_id"] for b in blocked]
    return {"commands": commands, "blocked_ids": blocked_ids}


@router.post("/heartbeat")
async def watcher_heartbeat(data: dict, _: bool = Depends(verify_watcher_key)):
    """Watcher reports its status. If AnyDesk is not running, auto-close all active sessions for this host."""
    host = data.get("host", "")
    anydesk_running = data.get("anydesk_running", True)

    # Store heartbeat timestamp
    await db.anydesk_watcher_status.update_one(
        {"host": host},
        {"$set": {
            "host": host,
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            "anydesk_running": anydesk_running
        }},
        upsert=True
    )

    closed = 0
    if not anydesk_running:
        # AnyDesk is dead — close all "active" sessions for this host
        staleness_cutoff = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
        result = await db.anydesk_sessions.update_many(
            {"host": host, "ended_at": None, "started_at": {"$gte": staleness_cutoff}},
            {"$set": {"ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        closed = result.modified_count
        if closed:
            # Recalculate durations
            updated = await db.anydesk_sessions.find(
                {"host": host, "duration_seconds": None, "ended_at": {"$ne": None}}
            ).to_list(50)
            for s in updated:
                try:
                    start = datetime.fromisoformat(s["started_at"])
                    end = datetime.fromisoformat(s["ended_at"])
                    if start.tzinfo is None:
                        start = start.replace(tzinfo=timezone.utc)
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                    dur = max(0, int((end - start).total_seconds()))
                    await db.anydesk_sessions.update_one({"id": s["id"]}, {"$set": {"duration_seconds": dur}})
                except (ValueError, TypeError):
                    pass
            print(f"[Heartbeat] AnyDesk not running on {host} — closed {closed} active session(s)")

    return {"success": True, "sessions_closed": closed}


@router.post("/watcher-commands/ack")
async def ack_watcher_command(
    command_id: str,
    success: bool = True,
    _: bool = Depends(verify_watcher_key)
):
    """Watcher acknowledges a command was executed."""
    status = "completed" if success else "failed"
    await db.anydesk_commands.update_one(
        {"id": command_id},
        {"$set": {"status": status, "acked_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@router.delete("/alert/{dedup_key:path}")
async def delete_single_alert(dedup_key: str, admin: dict = Depends(get_admin_user)):
    """Admin: delete a single alert by its dedup_key."""
    result = await db.anydesk_flag_notifications.delete_one({"dedup_key": dedup_key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.delete("/alerts")
async def clear_alerts(
    date: Optional[str] = None,
    month: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: clear alert history. If date/month provided, only clear that range."""
    query: dict = {}
    if date:
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            query["sent_at"] = {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        except ValueError:
            pass
    elif month:
        try:
            month_start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            query["sent_at"] = {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        except ValueError:
            pass
    result = await db.anydesk_flag_notifications.delete_many(query)
    return {"success": True, "deleted": result.deleted_count}


@router.delete("/map/{anydesk_id}")
async def delete_mapping(anydesk_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: remove a worker name mapping."""
    result = await db.anydesk_id_mappings.delete_one({"anydesk_id": anydesk_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"success": True}


# ─── Notification badge count ────────────────────────────────

@router.get("/unread-count")
async def unread_session_alerts(admin: dict = Depends(get_admin_user)):
    """Count of session alerts in the last 24h for the header badge."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    count = await db.anydesk_flag_notifications.count_documents({"sent_at": {"$gte": cutoff}})
    # Also count active sessions
    active_cutoff = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
    active = await db.anydesk_sessions.count_documents({
        "ended_at": None, "auth_method": {"$ne": "REJECTED"}, "started_at": {"$gte": active_cutoff}
    })
    return {"alert_count": count, "active_sessions": active}


# ─── Notification silence toggle ─────────────────────────────

@router.get("/notification-status")
async def get_notification_status(admin: dict = Depends(get_admin_user)):
    """Admin: check if remote session notifications are silenced."""
    silenced = await _is_silenced()
    return {"silenced": silenced}


@router.post("/silence-notifications")
async def toggle_silence_notifications(admin: dict = Depends(get_admin_user)):
    """Admin: toggle remote session notification silence on/off."""
    current = await _is_silenced()
    new_value = not current
    await db.anydesk_settings.update_one(
        {"key": "notifications_silenced"},
        {"$set": {
            "key": "notifications_silenced",
            "value": new_value,
            "toggled_by": admin.get("name", "Admin"),
            "toggled_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    status = "silenced" if new_value else "active"
    print(f"[RemoteSessions] Notifications {status} by {admin.get('name', 'Admin')}")
    return {"success": True, "silenced": new_value}


# ─── Watcher script download ────────────────────────────────

@router.get("/download-watcher")
async def download_watcher_script(admin: dict = Depends(get_admin_user)):
    """Admin: download the latest watcher Python script."""
    from fastapi.responses import FileResponse
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "watcher", "anydesk_session_watcher.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail="Watcher script not found")
    return FileResponse(script_path, filename="anydesk_session_watcher.py", media_type="text/x-python")

@router.post("/cleanup-stale")
async def cleanup_stale_sessions(admin: dict = Depends(get_admin_user)):
    """Admin: delete sessions with no end time older than 12 hours (stuck/orphaned records)
    and remove duplicate sessions from timezone-bug era."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
    # Close stale "active" sessions
    result = await db.anydesk_sessions.update_many(
        {"ended_at": None, "started_at": {"$lt": cutoff}},
        {"$set": {"ended_at": cutoff, "duration_seconds": 0}}
    )
    closed = result.modified_count
    # Delete very short sessions (< 5 sec) that are likely test/duplicate artifacts
    result2 = await db.anydesk_sessions.delete_many({
        "duration_seconds": {"$lte": 5}, "host": {"$in": ["test-host", "test-merge", "key-test", "key-test-2", "mac-test", "test-historical"]}
    })
    deleted = result2.deleted_count
    return {"success": True, "stale_closed": closed, "test_deleted": deleted}




# ─── Manual session management ───────────────────────────────

@router.post("/close-session/{session_id}")
async def close_session(session_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: manually close a stuck 'active' session."""
    session = await db.anydesk_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("ended_at"):
        return {"success": True, "message": "Session already ended"}
    # Use the start time + reasonable duration, or just now
    ended_at = datetime.now(timezone.utc).isoformat()
    duration = None
    try:
        start = datetime.fromisoformat(session["started_at"])
        end = datetime.now(timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        duration = max(0, int((end - start).total_seconds()))
    except (ValueError, TypeError):
        pass
    await db.anydesk_sessions.update_one(
        {"id": session_id},
        {"$set": {"ended_at": ended_at, "duration_seconds": duration}}
    )
    return {"success": True, "message": "Session closed"}


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: delete a session (for cleanup of bad data)."""
    result = await db.anydesk_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}



# ─── Historical session merge ───────────────────────────────

@router.post("/merge-historical")
async def merge_historical_sessions(admin: dict = Depends(get_admin_user)):
    """Admin: merge fragmented historical sessions (same AnyDesk ID, gaps ≤ 2 min) into single sessions."""
    # Get all unique anydesk_id + host combos
    pipeline = [
        {"$group": {"_id": {"anydesk_id": "$anydesk_id", "host": "$host"}}},
    ]
    combos = await db.anydesk_sessions.aggregate(pipeline).to_list(500)

    total_merged = 0
    total_deleted = 0

    for combo in combos:
        aid = combo["_id"]["anydesk_id"]
        host = combo["_id"]["host"]
        if not aid:
            continue

        sessions = await db.anydesk_sessions.find(
            {"anydesk_id": aid, "host": host},
            {"_id": 0}
        ).sort("started_at", 1).to_list(500)

        if len(sessions) < 2:
            continue

        # Walk through sorted sessions, merge when gap ≤ MERGE_GAP_MINUTES
        i = 0
        while i < len(sessions) - 1:
            current = sessions[i]
            if not current.get("ended_at"):
                i += 1
                continue

            next_sess = sessions[i + 1]
            try:
                cur_end = datetime.fromisoformat(current["ended_at"])
                nxt_start = datetime.fromisoformat(next_sess["started_at"])
                if cur_end.tzinfo is None:
                    cur_end = cur_end.replace(tzinfo=timezone.utc)
                if nxt_start.tzinfo is None:
                    nxt_start = nxt_start.replace(tzinfo=timezone.utc)
                gap_minutes = (nxt_start - cur_end).total_seconds() / 60
            except (ValueError, TypeError):
                i += 1
                continue

            if gap_minutes <= MERGE_GAP_MINUTES:
                # Merge: extend current session to cover next session, delete next
                new_ended = next_sess.get("ended_at")
                new_duration = None
                if new_ended:
                    try:
                        start_dt = datetime.fromisoformat(current["started_at"])
                        end_dt = datetime.fromisoformat(new_ended)
                        if start_dt.tzinfo is None:
                            start_dt = start_dt.replace(tzinfo=timezone.utc)
                        if end_dt.tzinfo is None:
                            end_dt = end_dt.replace(tzinfo=timezone.utc)
                        new_duration = max(0, int((end_dt - start_dt).total_seconds()))
                    except (ValueError, TypeError):
                        pass

                await db.anydesk_sessions.update_one(
                    {"id": current["id"]},
                    {"$set": {"ended_at": new_ended, "duration_seconds": new_duration}}
                )
                await db.anydesk_sessions.delete_one({"id": next_sess["id"]})

                # Update in-memory for continued chaining
                current["ended_at"] = new_ended
                current["duration_seconds"] = new_duration
                sessions.pop(i + 1)
                total_merged += 1
                total_deleted += 1
                # Don't increment i — check if next session also chains
            else:
                i += 1

    return {
        "success": True,
        "merged_count": total_merged,
        "sessions_removed": total_deleted,
        "message": f"Merged {total_merged} fragmented sessions into their parent sessions ({total_deleted} records removed)"
    }
