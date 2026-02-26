from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.mileage import (
    MileageEntryCreate, MileageEntryUpdate, MileageEntryResponse,
    StartTripRequest, EndTripRequest, UpdateTripLocationRequest,
    ActiveTripResponse, MileageSummary, LocationData
)

router = APIRouter(prefix="/admin/mileage", tags=["Mileage Tracking"])


@router.get("/entries", response_model=List[MileageEntryResponse])
async def get_mileage_entries(
    year: Optional[int] = None,
    month: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all mileage entries, optionally filtered by year/month"""
    query = {}
    
    if year:
        if month:
            # Filter by specific month
            start_date = f"{year}-{month:02d}-01"
            if month == 12:
                end_date = f"{year + 1}-01-01"
            else:
                end_date = f"{year}-{month + 1:02d}-01"
            query["date"] = {"$gte": start_date, "$lt": end_date}
        else:
            # Filter by year
            query["date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [MileageEntryResponse(**entry) for entry in entries]


@router.post("/entries", response_model=MileageEntryResponse)
async def create_mileage_entry(entry: MileageEntryCreate, admin: dict = Depends(get_admin_user)):
    """Create a manual mileage entry"""
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Use the admin's actual name from their login code
    admin_name = admin.get("admin_name", "Administrator")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin.get("admin_code"),
        "date": entry.date,
        "start_location": entry.start_location.model_dump() if entry.start_location else None,
        "end_location": entry.end_location.model_dump() if entry.end_location else None,
        "start_address": entry.start_address,
        "end_address": entry.end_address,
        "total_miles": entry.total_miles,
        "purpose": entry.purpose.value,
        "purpose_other": entry.purpose_other if entry.purpose == "other" else None,
        "notes": entry.notes,
        "is_tracking": False,
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    return MileageEntryResponse(**entry_doc)


@router.put("/entries/{entry_id}", response_model=MileageEntryResponse)
async def update_mileage_entry(
    entry_id: str,
    update_data: MileageEntryUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update an existing mileage entry"""
    entry = await db.mileage_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Mileage entry not found")
    
    update_fields = {}
    if update_data.date is not None:
        update_fields["date"] = update_data.date
    if update_data.start_address is not None:
        update_fields["start_address"] = update_data.start_address
    if update_data.end_address is not None:
        update_fields["end_address"] = update_data.end_address
    if update_data.total_miles is not None:
        update_fields["total_miles"] = update_data.total_miles
    if update_data.purpose is not None:
        update_fields["purpose"] = update_data.purpose.value
    if update_data.purpose_other is not None:
        update_fields["purpose_other"] = update_data.purpose_other
    if update_data.notes is not None:
        update_fields["notes"] = update_data.notes
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.mileage_entries.update_one({"id": entry_id}, {"$set": update_fields})
    
    updated_entry = await db.mileage_entries.find_one({"id": entry_id}, {"_id": 0})
    return MileageEntryResponse(**updated_entry)


@router.delete("/entries/{entry_id}")
async def delete_mileage_entry(entry_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a mileage entry"""
    result = await db.mileage_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mileage entry not found")
    return {"message": "Entry deleted successfully"}


@router.get("/active-trip", response_model=Optional[ActiveTripResponse])
async def get_active_trip(admin: dict = Depends(get_admin_user)):
    """Get the currently active trip for THIS specific admin (by admin_code)"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        return None
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if trip:
        return ActiveTripResponse(**trip)
    return None


@router.post("/start-trip", response_model=ActiveTripResponse)
async def start_trip(trip_data: StartTripRequest, admin: dict = Depends(get_admin_user)):
    """Start tracking a new trip - each admin has their own independent trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required for trip tracking")
    
    # Check if THIS admin already has an active trip (by admin_code, not user_id)
    existing = await db.active_trips.find_one({"admin_code": admin_code})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active trip. Please end it first.")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Use the admin's actual name from their login code
    admin_name = admin.get("admin_name", "Administrator")
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin_code,
        "start_location": trip_data.start_location.model_dump(),
        "start_address": trip_data.start_address,
        "start_time": now,
        "waypoints": [],
        "is_paused": False,
        "paused_at": None,
        "total_paused_duration": 0.0
    }
    
    await db.active_trips.insert_one(trip_doc)
    return ActiveTripResponse(**trip_doc)


@router.post("/pause-trip")
async def pause_trip(admin: dict = Depends(get_admin_user)):
    """Pause the active trip tracking - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    if trip.get("is_paused", False):
        raise HTTPException(status_code=400, detail="Trip is already paused")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$set": {"is_paused": True, "paused_at": now}}
    )
    
    return {"message": "Trip paused", "paused_at": now}


@router.post("/resume-trip")
async def resume_trip(admin: dict = Depends(get_admin_user)):
    """Resume a paused trip - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    if not trip.get("is_paused", False):
        raise HTTPException(status_code=400, detail="Trip is not paused")
    
    # Calculate paused duration and add to total
    paused_at = trip.get("paused_at")
    total_paused = trip.get("total_paused_duration", 0.0)
    
    if paused_at:
        paused_time = datetime.fromisoformat(paused_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        pause_duration = (now - paused_time).total_seconds()
        total_paused += pause_duration
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$set": {"is_paused": False, "paused_at": None, "total_paused_duration": total_paused}}
    )
    
    return {"message": "Trip resumed", "total_paused_duration": total_paused}


@router.post("/update-location")
async def update_trip_location(location_data: UpdateTripLocationRequest, admin: dict = Depends(get_admin_user)):
    """Add a waypoint to the active trip (only if not paused) - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    # Don't record waypoints if trip is paused
    if trip.get("is_paused", False):
        return {"message": "Trip is paused, location not recorded"}
    
    waypoint = location_data.location.model_dump()
    waypoint["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"admin_code": admin_code},
        {"$push": {"waypoints": waypoint}}
    )
    
    return {"message": "Location updated"}


@router.post("/end-trip", response_model=MileageEntryResponse)
async def end_trip(trip_data: EndTripRequest, admin: dict = Depends(get_admin_user)):
    """End the active trip and save it as a mileage entry - only affects this admin's trip"""
    import math
    
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    # Calculate cumulative distance from all waypoints
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance in miles between two GPS coordinates"""
        R = 3959  # Earth's radius in miles
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    # Build the complete path: start -> waypoints -> end
    waypoints = trip.get("waypoints", [])
    path_points = []
    
    # Add start location
    start_loc = trip.get("start_location", {})
    if start_loc:
        path_points.append((start_loc.get("latitude"), start_loc.get("longitude")))
    
    # Add all waypoints
    for wp in waypoints:
        if wp.get("latitude") and wp.get("longitude"):
            path_points.append((wp.get("latitude"), wp.get("longitude")))
    
    # Add end location
    end_loc = trip_data.end_location
    if end_loc:
        path_points.append((end_loc.latitude, end_loc.longitude))
    
    # Calculate cumulative distance along the route
    cumulative_miles = 0.0
    for i in range(1, len(path_points)):
        prev = path_points[i-1]
        curr = path_points[i]
        if prev[0] and prev[1] and curr[0] and curr[1]:
            cumulative_miles += haversine_distance(prev[0], prev[1], curr[0], curr[1])
    
    # Use the calculated cumulative distance (override client-side calculation)
    total_miles = round(cumulative_miles, 1) if cumulative_miles > 0 else trip_data.total_miles
    
    # Use the admin's actual name from their login code, or from the trip doc
    admin_name = admin.get("admin_name") or trip.get("user_name", "Administrator")
    admin_code = admin.get("admin_code") or trip.get("admin_code")
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin_name,
        "admin_code": admin_code,
        "date": today,
        "start_location": trip["start_location"],
        "end_location": trip_data.end_location.model_dump(),
        "start_address": trip.get("start_address"),
        "end_address": trip_data.end_address,
        "total_miles": total_miles,
        "purpose": trip_data.purpose.value,
        "purpose_other": trip_data.purpose_other if trip_data.purpose == "other" else None,
        "notes": trip_data.notes,
        "is_tracking": False,
        "waypoints": waypoints,
        "waypoint_count": len(waypoints),
        "created_at": now,
        "updated_at": None
    }
    
    await db.mileage_entries.insert_one(entry_doc)
    await db.active_trips.delete_one({"admin_code": admin_code})
    
    return MileageEntryResponse(**entry_doc)


@router.post("/cancel-trip")
async def cancel_trip(admin: dict = Depends(get_admin_user)):
    """Cancel the active trip without saving - only affects this admin's trip"""
    admin_code = admin.get("admin_code")
    if not admin_code:
        raise HTTPException(status_code=400, detail="Admin code required")
    
    result = await db.active_trips.delete_one({"admin_code": admin_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No active trip found")
    return {"message": "Trip cancelled"}


@router.get("/active-trip/distance")
async def get_active_trip_distance(admin: dict = Depends(get_admin_user)):
    """Get the current cumulative distance of the active trip - only this admin's trip"""
    import math
    
    admin_code = admin.get("admin_code")
    if not admin_code:
        return {"distance": 0, "waypoint_count": 0}
    
    trip = await db.active_trips.find_one({"admin_code": admin_code}, {"_id": 0})
    if not trip:
        return {"cumulative_miles": 0, "waypoint_count": 0}
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 3959
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    waypoints = trip.get("waypoints", [])
    path_points = []
    
    start_loc = trip.get("start_location", {})
    if start_loc:
        path_points.append((start_loc.get("latitude"), start_loc.get("longitude")))
    
    for wp in waypoints:
        if wp.get("latitude") and wp.get("longitude"):
            path_points.append((wp.get("latitude"), wp.get("longitude")))
    
    cumulative_miles = 0.0
    for i in range(1, len(path_points)):
        prev = path_points[i-1]
        curr = path_points[i]
        if prev[0] and prev[1] and curr[0] and curr[1]:
            cumulative_miles += haversine_distance(prev[0], prev[1], curr[0], curr[1])
    
    return {
        "cumulative_miles": round(cumulative_miles, 2),
        "waypoint_count": len(waypoints),
        "start_time": trip.get("start_time")
    }


@router.get("/summary", response_model=MileageSummary)
async def get_mileage_summary(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get mileage summary for tax purposes"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    entries = await db.mileage_entries.find(query, {"_id": 0}).to_list(10000)
    
    total_miles = sum(e.get("total_miles", 0) for e in entries)
    total_trips = len(entries)
    
    # Group by purpose
    by_purpose = {}
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose not in by_purpose:
            by_purpose[purpose] = {"miles": 0, "trips": 0}
        by_purpose[purpose]["miles"] += entry.get("total_miles", 0)
        by_purpose[purpose]["trips"] += 1
    
    # Group by month
    monthly_totals = {}
    for entry in entries:
        month = entry.get("date", "")[:7]  # YYYY-MM
        if month not in monthly_totals:
            monthly_totals[month] = {"miles": 0, "trips": 0}
        monthly_totals[month]["miles"] += entry.get("total_miles", 0)
        monthly_totals[month]["trips"] += 1
    
    return MileageSummary(
        total_miles=round(total_miles, 2),
        total_trips=total_trips,
        by_purpose=by_purpose,
        monthly_totals=monthly_totals
    )


@router.get("/export/csv")
async def export_mileage_csv(
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Export mileage entries as CSV for tax filing"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    # Build date query based on provided parameters
    if start_date and end_date:
        query = {"date": {"$gte": start_date, "$lte": end_date}}
    elif year:
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    else:
        year = datetime.now(timezone.utc).year
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    # IRS standard mileage rate for 2026
    IRS_RATE = 0.725
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Date", "Start Location", "End Location", "Miles", 
        "Business Purpose", "Notes", "Deduction Amount"
    ])
    
    total_miles = 0
    total_deduction = 0
    
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose == "thrifting":
            purpose_display = "Business - Thrifting/Sourcing"
        elif purpose == "post_office":
            purpose_display = "Business - Post Office/Shipping"
        elif purpose == "other":
            purpose_display = f"Business - {entry.get('purpose_other', 'Other')}"
        else:
            purpose_display = f"Business - {purpose}"
        
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        total_miles += miles
        total_deduction += deduction
        
        writer.writerow([
            entry.get("date", ""),
            entry.get("start_address", ""),
            entry.get("end_address", ""),
            f"{miles:.1f}",
            purpose_display,
            entry.get("notes", ""),
            f"${deduction:.2f}"
        ])
    
    # Summary rows
    writer.writerow([])
    writer.writerow(["SUMMARY", "", "", "", "", "", ""])
    writer.writerow(["Total Miles", "", "", f"{total_miles:.1f}", "", "", ""])
    writer.writerow(["IRS Rate (2026)", "", "", "", "", "", f"${IRS_RATE}/mile"])
    writer.writerow(["Total Deduction", "", "", "", "", "", f"${total_deduction:.2f}"])
    writer.writerow([])
    writer.writerow(["Generated for tax year:", year, "", "", "", "", ""])
    writer.writerow(["Generated on:", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "", "", "", "", ""])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=mileage_log_{year}.csv"
        }
    )


@router.get("/export/pdf")
async def export_mileage_pdf(
    year: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Export mileage entries as PDF for tax filing - styled like other forms"""
    from fastapi.responses import StreamingResponse
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    import io
    
    # Build date query based on provided parameters
    if start_date and end_date:
        query = {"date": {"$gte": start_date, "$lte": end_date}}
        period_label = f"{start_date} to {end_date}"
    elif year:
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
        period_label = f"Year {year}"
    else:
        year = datetime.now(timezone.utc).year
        query = {"date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}}
        period_label = f"Year {year}"
    
    entries = await db.mileage_entries.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    # IRS standard mileage rate for 2026
    IRS_RATE = 0.725
    
    # Brand colors - Orange/Amber theme for mileage
    HEADER_COLOR = colors.Color(245/255, 158/255, 11/255)  # Amber #F59E0B
    SECTION_COLOR = colors.Color(217/255, 119/255, 6/255)  # Darker amber
    GREEN = colors.Color(34/255, 139/255, 34/255)
    GRAY_LABEL = colors.Color(128/255, 128/255, 128/255)
    BLACK = colors.black
    LIGHT_GRAY = colors.Color(200/255, 200/255, 200/255)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.5*inch, leftMargin=0.5*inch, rightMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        alignment=0,
        spaceAfter=2,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=0,
        spaceAfter=0,
        textColor=colors.white
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=11,
        textColor=SECTION_COLOR,
        spaceBefore=15,
        spaceAfter=3,
        fontName='Helvetica-Bold'
    )
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=10,
        textColor=GRAY_LABEL,
        leftIndent=10
    )
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        textColor=BLACK
    )
    green_value_style = ParagraphStyle(
        'GreenValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=GREEN,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Header table with amber background
    header_data = [
        [Paragraph("THRIFTY CURATOR", title_style)],
        [Paragraph("Mileage Log", subtitle_style)]
    ]
    header_table = Table(header_data, colWidths=[7.5*inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HEADER_COLOR),
        ('TOPPADDING', (0, 0), (-1, 0), 15),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 15),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # REPORT PERIOD section
    elements.append(Paragraph("REPORT PERIOD", section_style))
    elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
    elements.append(Spacer(1, 5))
    
    period_data = [
        [Paragraph("Period:", label_style), Paragraph(period_label, value_style)],
        [Paragraph("IRS Rate (2026):", label_style), Paragraph(f"${IRS_RATE}/mile", value_style)],
    ]
    period_table = Table(period_data, colWidths=[1.5*inch, 5.5*inch])
    period_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(period_table)
    elements.append(Spacer(1, 10))
    
    # Calculate totals
    total_miles = 0
    total_deduction = 0
    for entry in entries:
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        total_miles += miles
        total_deduction += deduction
    
    # SUMMARY section
    elements.append(Paragraph("SUMMARY", section_style))
    elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
    elements.append(Spacer(1, 5))
    
    summary_data = [
        [Paragraph("Total Entries:", label_style), Paragraph(str(len(entries)), value_style)],
        [Paragraph("Total Miles:", label_style), Paragraph(f"{total_miles:.1f} miles", value_style)],
        [Paragraph("Total Deduction:", label_style), Paragraph(f"${total_deduction:.2f}", green_value_style)],
    ]
    summary_table = Table(summary_data, colWidths=[1.5*inch, 5.5*inch])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))
    
    # MILEAGE ENTRIES section
    elements.append(Paragraph("MILEAGE ENTRIES", section_style))
    elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
    elements.append(Spacer(1, 5))
    
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose == "thrifting":
            purpose_display = "Thrifting"
        elif purpose == "post_office":
            purpose_display = "Post Office"
        elif purpose == "other":
            purpose_display = entry.get('purpose_other', 'Other')
        else:
            purpose_display = purpose
        
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        
        start_addr = entry.get("start_address", "") or ""
        end_addr = entry.get("end_address", "") or ""
        
        # Entry date as header
        entry_date_style = ParagraphStyle('EntryDate', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=BLACK, leftIndent=10)
        elements.append(Paragraph(entry.get("date", ""), entry_date_style))
        
        entry_data = [
            [Paragraph("From:", label_style), Paragraph(start_addr[:40] if start_addr else "-", value_style),
             Paragraph("To:", label_style), Paragraph(end_addr[:40] if end_addr else "-", value_style)],
            [Paragraph("Purpose:", label_style), Paragraph(purpose_display, value_style),
             Paragraph("Miles:", label_style), Paragraph(f"{miles:.1f}", value_style)],
            [Paragraph("Deduction:", label_style), Paragraph(f"${deduction:.2f}", green_value_style),
             Paragraph("", label_style), Paragraph("", value_style)],
        ]
        entry_table = Table(entry_data, colWidths=[1*inch, 2.5*inch, 0.8*inch, 2.5*inch])
        entry_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (0, -1), 20),
        ]))
        elements.append(entry_table)
        elements.append(Spacer(1, 8))
    
    # Footer
    elements.append(Spacer(1, 20))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.Color(0.6, 0.6, 0.6))
    elements.append(Paragraph(f"Page 1 | Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=mileage_log_{year}.pdf"
        }
    )
