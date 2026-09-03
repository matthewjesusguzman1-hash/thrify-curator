"""Video Calls router — Daily.co integration for interviews, worker-admin calls, and ad-hoc meetings."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx

from app.database import db
from app.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/video-calls", tags=["Video Calls"])

DAILY_API_KEY = os.environ.get("DAILY_API_KEY", "")
DAILY_API_URL = "https://api.daily.co/v1"


def daily_headers():
    return {"Authorization": f"Bearer {DAILY_API_KEY}", "Content-Type": "application/json"}


@router.get("/admins")
async def get_admin_list(user: dict = Depends(get_current_user)):
    """Return admin users for worker call-request dropdown."""
    admins = await db.users.find(
        {"role": "admin"},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(20)
    return {"admins": admins}


# ─── Models ───────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: Optional[str] = None
    purpose: str = "ad-hoc"  # "interview", "worker-admin", "ad-hoc"
    expires_minutes: int = 120
    enable_recording: bool = False
    booking_id: Optional[str] = None
    participant_names: Optional[list] = None
    scheduled_at: Optional[str] = None  # ISO datetime for scheduled calls

class CallRequestModel(BaseModel):
    admin_id: str
    message: Optional[str] = ""


# ─── Room Management ──────────────────────────────────────

@router.post("/rooms")
async def create_room(req: CreateRoomRequest, user: dict = Depends(get_current_user)):
    """Create a Daily.co room and store metadata."""
    room_name = req.name or f"tc-{req.purpose[:3]}-{uuid.uuid4().hex[:8]}"
    room_name = room_name.lower().replace(" ", "-")[:40]

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=req.expires_minutes)

    # Create room via Daily.co API
    room_props = {
        "exp": int(expires_at.timestamp()),
        "max_participants": 10,
        "enable_chat": True,
        "enable_screenshare": True,
        "start_audio_off": False,
        "start_video_off": False,
    }
    if req.enable_recording:
        room_props["enable_recording"] = "cloud"

    daily_payload = {
        "name": room_name,
        "privacy": "public",
        "properties": room_props,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DAILY_API_URL}/rooms",
            json=daily_payload,
            headers=daily_headers(),
            timeout=15
        )
        # If recording fails (account limitation), retry without recording
        if resp.status_code not in (200, 201) and req.enable_recording:
            daily_payload["properties"].pop("enable_recording", None)
            req.enable_recording = False
            resp = await client.post(
                f"{DAILY_API_URL}/rooms",
                json=daily_payload,
                headers=daily_headers(),
                timeout=15
            )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")
        daily_room = resp.json()

    # Store room metadata
    status = "scheduled" if req.scheduled_at else "active"
    room_doc = {
        "id": str(uuid.uuid4()),
        "room_name": room_name,
        "daily_url": daily_room.get("url"),
        "purpose": req.purpose,
        "booking_id": req.booking_id,
        "created_by": user.get("name", user.get("email", "")),
        "created_by_id": str(user.get("_id", user.get("id", ""))),
        "participant_names": req.participant_names or [],
        "enable_recording": req.enable_recording,
        "status": status,
        "scheduled_at": req.scheduled_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "ended_at": None,
        "duration_seconds": None,
        "recording_urls": []
    }
    await db.video_call_rooms.insert_one(room_doc)

    return {
        "room_name": room_name,
        "url": daily_room.get("url"),
        "app_url": f"/call/{room_name}",
        "expires_at": expires_at.isoformat(),
        "id": room_doc["id"]
    }


@router.get("/rooms/{room_name}")
async def get_room(room_name: str):
    """Get room info — public endpoint for joining."""
    room = await db.video_call_rooms.find_one(
        {"room_name": room_name, "status": {"$ne": "deleted"}},
        {"_id": 0}
    )
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/rooms/{room_name}/token")
async def get_join_token(room_name: str, data: dict):
    """Get a meeting token for a participant (enables recording controls for owners)."""
    participant_name = data.get("name", "Guest")
    is_owner = data.get("is_owner", False)

    token_payload = {
        "properties": {
            "room_name": room_name,
            "user_name": participant_name,
            "is_owner": is_owner,
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DAILY_API_URL}/meeting-tokens",
            json=token_payload,
            headers=daily_headers(),
            timeout=15
        )
        if resp.status_code not in (200, 201):
            error_text = resp.text
            if "payment" in error_text.lower() or "billing" in error_text.lower():
                raise HTTPException(status_code=402, detail="Daily.co account requires a payment method. Add one at dashboard.daily.co/billing")
            raise HTTPException(status_code=502, detail=f"Token error: {error_text}")
        return resp.json()


@router.post("/rooms/{room_name}/end")
async def end_room(room_name: str, user: dict = Depends(get_current_user)):
    """End a call and update the record."""
    room = await db.video_call_rooms.find_one({"room_name": room_name})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    ended_at = datetime.now(timezone.utc)
    created_at = datetime.fromisoformat(room["created_at"])
    duration = int((ended_at - created_at).total_seconds())

    await db.video_call_rooms.update_one(
        {"room_name": room_name},
        {"$set": {
            "status": "ended",
            "ended_at": ended_at.isoformat(),
            "duration_seconds": duration
        }}
    )

    # Delete room from Daily.co
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{DAILY_API_URL}/rooms/{room_name}",
            headers=daily_headers(),
            timeout=10
        )

    return {"success": True, "duration_seconds": duration}


# ─── Call Requests (Worker → Admin) ──────────────────────

@router.post("/call-request")
async def create_call_request(req: CallRequestModel, user: dict = Depends(get_current_user)):
    """Worker requests a video call with a specific admin."""
    # Create a room immediately
    room_name = f"tc-call-{uuid.uuid4().hex[:8]}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DAILY_API_URL}/rooms",
            json={
                "name": room_name,
                "privacy": "public",
                "properties": {
                    "exp": int(expires_at.timestamp()),
                    "max_participants": 4,
                    "enable_chat": True,
                    "enable_screenshare": True,
                }
            },
            headers=daily_headers(),
            timeout=15
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")
        daily_room = resp.json()

    caller_name = user.get("name", user.get("email", "Worker"))

    request_doc = {
        "id": str(uuid.uuid4()),
        "room_name": room_name,
        "daily_url": daily_room.get("url"),
        "caller_id": str(user.get("_id", user.get("id", ""))),
        "caller_name": caller_name,
        "admin_id": req.admin_id,
        "message": req.message,
        "status": "pending",  # pending → accepted → ended / expired / declined
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.video_call_requests.insert_one(request_doc)

    # Also store as a room for history
    await db.video_call_rooms.insert_one({
        "id": request_doc["id"],
        "room_name": room_name,
        "daily_url": daily_room.get("url"),
        "purpose": "worker-admin",
        "created_by": caller_name,
        "created_by_id": request_doc["caller_id"],
        "participant_names": [caller_name],
        "enable_recording": False,
        "status": "pending",
        "created_at": request_doc["created_at"],
        "expires_at": request_doc["expires_at"],
        "ended_at": None,
        "duration_seconds": None,
        "recording_urls": []
    })

    # TODO: Send push notification to the target admin

    # Send push notifications to the target admin
    try:
        from app.services.apns_service import send_admin_push_notification
        from app.services.web_push_service import get_web_push_service

        title = "📹 Incoming Video Call"
        body = f"{caller_name} is requesting a video call"
        if req.message:
            body += f": {req.message}"

        await send_admin_push_notification(
            title=title,
            body=body,
            notification_type="video_call_request",
            data={"room_name": room_name, "request_id": request_doc["id"], "url": f"/video-calls"}
        )
        await get_web_push_service().send_to_admins(
            db=db,
            title=title,
            body=body,
            url="/video-calls",
            notification_type="video_call_request"
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to send call request push: {e}")

    return {
        "id": request_doc["id"],
        "room_name": room_name,
        "app_url": f"/call/{room_name}",
        "status": "pending"
    }


@router.post("/invite-to-call")
async def invite_to_call(data: dict, user: dict = Depends(get_current_user)):
    """Invite one or more users to an existing or new call room."""
    room_name = data.get("room_name")
    invitee_ids = data.get("invitee_ids", [])
    message = data.get("message", "")
    enable_recording = data.get("enable_recording", False)
    scheduled_at = data.get("scheduled_at")

    if not invitee_ids:
        raise HTTPException(status_code=400, detail="No invitees specified")

    caller_name = user.get("name", user.get("email", "User"))
    caller_id = str(user.get("_id", user.get("id", "")))

    # Look up invitee names for display
    invitee_names = []
    for inv_id in invitee_ids:
        inv_user = await db.users.find_one(
            {"$or": [{"id": inv_id}, {"_id": inv_id}]},
            {"name": 1, "email": 1}
        )
        if inv_user:
            invitee_names.append(inv_user.get("name", inv_user.get("email", "Unknown")))
        else:
            invitee_names.append("Unknown")

    # Create a new room if none provided
    if not room_name:
        room_name = f"tc-call-{uuid.uuid4().hex[:8]}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=120)

        room_props = {
            "exp": int(expires_at.timestamp()),
            "max_participants": 10,
            "enable_chat": True,
            "enable_screenshare": True,
        }
        if enable_recording:
            room_props["enable_recording"] = "cloud"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{DAILY_API_URL}/rooms",
                json={"name": room_name, "privacy": "public", "properties": room_props},
                headers=daily_headers(),
                timeout=15
            )
            # If recording fails, retry without
            if resp.status_code not in (200, 201) and enable_recording:
                room_props.pop("enable_recording", None)
                enable_recording = False
                resp = await client.post(
                    f"{DAILY_API_URL}/rooms",
                    json={"name": room_name, "privacy": "public", "properties": room_props},
                    headers=daily_headers(),
                    timeout=15
                )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")
            daily_room = resp.json()

        all_participants = [caller_name] + invitee_names
        status = "scheduled" if scheduled_at else "active"
        await db.video_call_rooms.insert_one({
            "id": str(uuid.uuid4()),
            "room_name": room_name,
            "daily_url": daily_room.get("url"),
            "purpose": "ad-hoc",
            "created_by": caller_name,
            "created_by_id": caller_id,
            "invitee_names": invitee_names,
            "participant_names": all_participants,
            "enable_recording": enable_recording,
            "status": status,
            "scheduled_at": scheduled_at,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "ended_at": None, "duration_seconds": None, "recording_urls": []
        })
    else:
        room_doc = await db.video_call_rooms.find_one({"room_name": room_name})
        if not room_doc:
            raise HTTPException(status_code=404, detail="Room not found")
        # Update existing room with invitee names
        existing_names = room_doc.get("participant_names", [])
        for name in invitee_names:
            if name not in existing_names:
                existing_names.append(name)
        await db.video_call_rooms.update_one(
            {"room_name": room_name},
            {"$set": {"participant_names": existing_names, "invitee_names": invitee_names}}
        )

    # Create a call request for each invitee
    created = []
    for i, inv_id in enumerate(invitee_ids):
        inv_name = invitee_names[i] if i < len(invitee_names) else "Unknown"
        request_doc = {
            "id": str(uuid.uuid4()),
            "room_name": room_name,
            "caller_id": caller_id,
            "caller_name": caller_name,
            "target_id": inv_id,
            "target_name": inv_name,
            "admin_id": inv_id,  # backwards compat with pending query
            "message": message,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }
        await db.video_call_requests.insert_one(request_doc)
        created.append(request_doc["id"])

    # Push notifications (separate try blocks so one failure doesn't block the other)
    invitee_display = ", ".join(invitee_names) if invitee_names else "a video call"
    try:
        from app.services.apns_service import send_admin_push_notification
        title = "Incoming Video Call"
        body = f"{caller_name} is inviting you to a video call"
        if message:
            body += f": {message}"
        await send_admin_push_notification(
            title=title, body=body,
            notification_type="video_call_invite",
            data={"room_name": room_name, "url": "/video-calls"}
        )
    except Exception as e:
        print(f"[VideoCall] APNs invite notification failed: {e}")
    
    try:
        from app.services.web_push_service import get_web_push_service
        title = "Incoming Video Call"
        body = f"{caller_name} is inviting you to a video call"
        if message:
            body += f": {message}"
        await get_web_push_service().send_to_admins(
            db=db, title=title, body=body,
            url="/video-calls", notification_type="video_call_invite"
        )
    except Exception as e:
        print(f"[VideoCall] Web Push invite notification failed: {e}")

    return {"room_name": room_name, "app_url": f"/call/{room_name}", "daily_url": f"https://thrifty-curator.daily.co/{room_name}", "invited": len(created), "invitee_names": invitee_names}


@router.get("/call-requests/pending")
async def get_pending_requests(user: dict = Depends(get_current_user)):
    """Get pending call requests/invitations for the current user."""
    user_id = str(user.get("_id", user.get("id", "")))
    five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()

    # Find requests where user is the target (admin_id or target_id)
    requests = await db.video_call_requests.find(
        {
            "$or": [
                {"admin_id": user_id},
                {"target_id": user_id}
            ],
            "status": "pending",
            "created_at": {"$gte": five_min_ago}
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    return {"requests": requests}


@router.post("/call-requests/{request_id}/accept")
async def accept_call_request(request_id: str, user: dict = Depends(get_current_user)):
    """Admin accepts a call request."""
    req = await db.video_call_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.video_call_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "accepted"}}
    )
    await db.video_call_rooms.update_one(
        {"room_name": req["room_name"]},
        {"$set": {"status": "active"}}
    )

    return {
        "room_name": req["room_name"],
        "app_url": f"/call/{req['room_name']}",
        "caller_name": req["caller_name"]
    }


@router.post("/call-requests/{request_id}/decline")
async def decline_call_request(request_id: str, user: dict = Depends(get_current_user)):
    """Admin declines a call request."""
    await db.video_call_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "declined"}}
    )
    return {"success": True}


# ─── History & Recordings ────────────────────────────────

@router.get("/history")
async def get_call_history(user: dict = Depends(get_current_user), limit: int = 50):
    """Get call history. Auto-marks expired rooms as ended."""
    now = datetime.now(timezone.utc).isoformat()
    # Auto-close expired active rooms
    await db.video_call_rooms.update_many(
        {"status": {"$in": ["active", "pending"]}, "expires_at": {"$lt": now}},
        {"$set": {"status": "ended", "ended_at": now}}
    )
    rooms = await db.video_call_rooms.find(
        {"status": {"$in": ["ended", "active", "pending", "scheduled"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"calls": rooms}


@router.delete("/calls/{room_name}")
async def delete_call(room_name: str, user: dict = Depends(get_current_user)):
    """Delete a single call from history."""
    result = await db.video_call_rooms.delete_one({"room_name": room_name})
    await db.video_call_requests.delete_many({"room_name": room_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"success": True, "deleted": room_name}


@router.delete("/calls")
async def delete_all_calls(user: dict = Depends(get_current_user)):
    """Delete all ended calls from history. Active/pending calls are preserved."""
    result = await db.video_call_rooms.delete_many({"status": "ended"})
    await db.video_call_requests.delete_many({"status": {"$in": ["declined", "accepted"]}})
    return {"success": True, "deleted_count": result.deleted_count}


@router.get("/recordings")
async def get_recordings(user: dict = Depends(get_admin_user)):
    """Get rooms that have recordings."""
    rooms = await db.video_call_rooms.find(
        {"recording_urls": {"$ne": []}, "status": {"$in": ["ended", "active"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"recordings": rooms}


@router.post("/recordings/sync")
async def sync_recordings(user: dict = Depends(get_admin_user)):
    """Fetch recordings from Daily.co API and update local room records."""
    if not DAILY_API_KEY:
        raise HTTPException(status_code=400, detail="Daily.co not configured")

    synced = 0
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{DAILY_API_URL}/recordings",
            headers=daily_headers(),
            timeout=20
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")

        daily_recordings = resp.json().get("data", [])

        for rec in daily_recordings:
            room_name = rec.get("room_name", "")
            recording_id = rec.get("id", "")
            download_link = rec.get("download_link")
            duration = rec.get("duration")

            if not room_name or not recording_id:
                continue

            # Update the room with recording info
            result = await db.video_call_rooms.update_one(
                {"room_name": room_name},
                {"$addToSet": {"recording_urls": {
                    "recording_id": recording_id,
                    "download_link": download_link,
                    "duration": duration,
                    "started_at": rec.get("started_at"),
                    "status": rec.get("status", "unknown"),
                }}}
            )
            if result.modified_count > 0:
                synced += 1

    return {"synced": synced, "total_daily_recordings": len(daily_recordings)}


@router.get("/recordings/{recording_id}/access-link")
async def get_recording_access_link(recording_id: str, user: dict = Depends(get_admin_user)):
    """Get a temporary access link for a Daily.co recording."""
    if not DAILY_API_KEY:
        raise HTTPException(status_code=400, detail="Daily.co not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{DAILY_API_URL}/recordings/{recording_id}/access-link",
            headers=daily_headers(),
            timeout=15
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")
        return resp.json()


# ─── Interview Integration ───────────────────────────────

@router.post("/rooms/for-booking/{booking_id}")
async def create_room_for_booking(booking_id: str, user: dict = Depends(get_admin_user)):
    """Auto-create a Daily.co room for a scheduled interview booking."""
    booking = await db.interview_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check if room already exists for this booking
    existing = await db.video_call_rooms.find_one({"booking_id": booking_id, "status": {"$ne": "deleted"}})
    if existing:
        return {
            "room_name": existing["room_name"],
            "url": existing["daily_url"],
            "app_url": f"/call/{existing['room_name']}",
            "already_exists": True
        }

    room_name = f"tc-int-{uuid.uuid4().hex[:8]}"
    # Interview rooms last 4 hours
    expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DAILY_API_URL}/rooms",
            json={
                "name": room_name,
                "privacy": "public",
                "properties": {
                    "exp": int(expires_at.timestamp()),
                    "max_participants": 4,
                    "enable_chat": True,
                    "enable_screenshare": True,
                    "enable_recording": "cloud",
                }
            },
            headers=daily_headers(),
            timeout=15
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Daily.co error: {resp.text}")
        daily_room = resp.json()

    applicant_name = booking.get("applicant_name", "Applicant")

    room_doc = {
        "id": str(uuid.uuid4()),
        "room_name": room_name,
        "daily_url": daily_room.get("url"),
        "purpose": "interview",
        "booking_id": booking_id,
        "created_by": user.get("name", "Admin"),
        "created_by_id": str(user.get("_id", user.get("id", ""))),
        "participant_names": [user.get("name", "Admin"), applicant_name],
        "enable_recording": True,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "ended_at": None,
        "duration_seconds": None,
        "recording_urls": []
    }
    await db.video_call_rooms.insert_one(room_doc)

    # Update booking with call link
    await db.interview_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "video_call_room": room_name,
            "video_call_url": f"/call/{room_name}"
        }}
    )

    return {
        "room_name": room_name,
        "url": daily_room.get("url"),
        "app_url": f"/call/{room_name}",
        "id": room_doc["id"]
    }
