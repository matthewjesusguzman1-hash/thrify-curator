from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timedelta
import asyncio

from app.database import db
from app.dependencies import get_current_user
from app.models.time_entry import TimeEntry, ClockInOut
from app.services.email import get_employee_hours_summary, create_admin_notification, send_clock_notification_email

router = APIRouter(prefix="/time", tags=["Time Tracking"])


@router.post("/clock", response_model=TimeEntry)
async def clock_in_out(action: ClockInOut, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if action.action == "in":
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if active:
            raise HTTPException(status_code=400, detail="Already clocked in")
        
        today_entry = await db.time_entries.find_one(
            {
                "user_id": user["id"],
                "shift_date": today_start.strftime("%Y-%m-%d")
            },
            {"_id": 0}
        )
        
        if today_entry:
            await db.time_entries.update_one(
                {"id": today_entry["id"]},
                {
                    "$set": {
                        "clock_out": None,
                        "last_clock_in": now_iso
                    }
                }
            )
            today_entry["clock_out"] = None
            today_entry["last_clock_in"] = now_iso
            
            await create_admin_notification(
                notification_type="clock_in",
                employee_id=user["id"],
                employee_name=user["name"],
                message=f"{user['name']} has clocked in (resuming shift)",
                details={"clock_in": now_iso, "shift_date": today_start.strftime("%Y-%m-%d")}
            )
            
            asyncio.create_task(send_clock_notification_email(
                action="in",
                employee_name=user["name"],
                timestamp=now_iso
            ))
            
            return TimeEntry(**today_entry)
        else:
            entry = TimeEntry(
                user_id=user["id"],
                user_name=user["name"],
                clock_in=now_iso,
                shift_date=today_start.strftime("%Y-%m-%d")
            )
            entry_dict = entry.model_dump()
            entry_dict["last_clock_in"] = now_iso
            entry_dict["accumulated_hours"] = 0.0
            await db.time_entries.insert_one(entry_dict)
            
            await create_admin_notification(
                notification_type="clock_in",
                employee_id=user["id"],
                employee_name=user["name"],
                message=f"{user['name']} has clocked in",
                details={"clock_in": now_iso}
            )
            
            asyncio.create_task(send_clock_notification_email(
                action="in",
                employee_name=user["name"],
                timestamp=now_iso
            ))
            
            return entry
    
    elif action.action == "out":
        active = await db.time_entries.find_one(
            {"user_id": user["id"], "clock_out": None}, {"_id": 0}
        )
        if not active:
            raise HTTPException(status_code=400, detail="Not clocked in")
        
        last_clock_in = active.get("last_clock_in", active["clock_in"])
        clock_in_time = datetime.fromisoformat(last_clock_in)
        clock_out_time = now
        session_hours = round((clock_out_time - clock_in_time).total_seconds() / 3600, 2)
        
        accumulated_hours = active.get("accumulated_hours", 0.0) + session_hours
        total_hours = round(accumulated_hours, 2)
        
        await db.time_entries.update_one(
            {"id": active["id"]},
            {
                "$set": {
                    "clock_out": now_iso,
                    "total_hours": total_hours,
                    "accumulated_hours": accumulated_hours
                }
            }
        )
        
        hours_summary = await get_employee_hours_summary(user["id"])
        hours_summary["today_hours"] = round(hours_summary["today_hours"] + session_hours, 2)
        hours_summary["week_hours"] = round(hours_summary["week_hours"] + session_hours, 2)
        
        await create_admin_notification(
            notification_type="clock_out",
            employee_id=user["id"],
            employee_name=user["name"],
            message=f"{user['name']} has clocked out ({session_hours} hrs this session, {total_hours} hrs total today)",
            details={
                "clock_in": active["clock_in"],
                "clock_out": now_iso,
                "session_hours": session_hours,
                "total_hours": total_hours,
                "today_hours": hours_summary["today_hours"],
                "week_hours": hours_summary["week_hours"]
            }
        )
        
        asyncio.create_task(send_clock_notification_email(
            action="out",
            employee_name=user["name"],
            timestamp=now_iso,
            hours_summary=hours_summary
        ))
        
        active["clock_out"] = now_iso
        active["total_hours"] = total_hours
        return TimeEntry(**active)
    
    raise HTTPException(status_code=400, detail="Invalid action")


@router.get("/status")
async def get_clock_status(user: dict = Depends(get_current_user)):
    active = await db.time_entries.find_one(
        {"user_id": user["id"], "clock_out": None}, {"_id": 0}
    )
    return {"clocked_in": active is not None, "entry": active}


@router.get("/entries", response_model=List[TimeEntry])
async def get_my_entries(user: dict = Depends(get_current_user)):
    entries = await db.time_entries.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("clock_in", -1).to_list(100)
    return entries


@router.get("/summary")
async def get_time_summary(user: dict = Depends(get_current_user)):
    entries = await db.time_entries.find(
        {"user_id": user["id"], "total_hours": {"$ne": None}}, {"_id": 0}
    ).to_list(1000)
    
    total_hours = sum(e.get("total_hours", 0) for e in entries)
    
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_entries = [e for e in entries if datetime.fromisoformat(e["clock_in"]) >= week_start]
    week_hours = sum(e.get("total_hours", 0) for e in week_entries)
    
    payroll_settings = await db.payroll_settings.find_one({}, {"_id": 0})
    default_rate = 15.00
    period_length = 14
    
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 15.00)
        period_length = payroll_settings.get("period_length", 14)
        start_date_str = payroll_settings.get("start_date")
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str).replace(tzinfo=timezone.utc)
        else:
            start_date = today - timedelta(days=period_length)
    else:
        start_date = today - timedelta(days=period_length)
    
    days_since_start = (today - start_date).days
    periods_elapsed = days_since_start // period_length
    current_period_start = start_date + timedelta(days=periods_elapsed * period_length)
    current_period_end = current_period_start + timedelta(days=period_length)
    
    period_entries = [e for e in entries if datetime.fromisoformat(e["clock_in"]).replace(tzinfo=timezone.utc) >= current_period_start]
    period_hours = sum(e.get("total_hours", 0) for e in period_entries)
    period_shifts = len(period_entries)
    
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    hourly_rate = user_doc.get("hourly_rate") if user_doc else None
    if hourly_rate is None:
        hourly_rate = default_rate
    
    estimated_pay = round(period_hours * hourly_rate, 2)
    
    return {
        "total_hours": round(total_hours, 2),
        "week_hours": round(week_hours, 2),
        "total_shifts": len(entries),
        "period_hours": round(period_hours, 2),
        "period_shifts": period_shifts,
        "hourly_rate": hourly_rate,
        "estimated_pay": estimated_pay,
        "period_start": current_period_start.isoformat(),
        "period_end": current_period_end.isoformat()
    }
