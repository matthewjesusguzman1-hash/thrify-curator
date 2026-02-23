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
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin["name"],
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
    """Get the currently active trip for the admin user"""
    trip = await db.active_trips.find_one({"user_id": admin["id"]}, {"_id": 0})
    if trip:
        return ActiveTripResponse(**trip)
    return None


@router.post("/start-trip", response_model=ActiveTripResponse)
async def start_trip(trip_data: StartTripRequest, admin: dict = Depends(get_admin_user)):
    """Start tracking a new trip"""
    # Check if there's already an active trip
    existing = await db.active_trips.find_one({"user_id": admin["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active trip. Please end it first.")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trip_doc = {
        "id": trip_id,
        "user_id": admin["id"],
        "start_location": trip_data.start_location.model_dump(),
        "start_address": trip_data.start_address,
        "start_time": now,
        "waypoints": []
    }
    
    await db.active_trips.insert_one(trip_doc)
    return ActiveTripResponse(**trip_doc)


@router.post("/update-location")
async def update_trip_location(location_data: UpdateTripLocationRequest, admin: dict = Depends(get_admin_user)):
    """Add a waypoint to the active trip"""
    trip = await db.active_trips.find_one({"user_id": admin["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="No active trip found")
    
    waypoint = location_data.location.model_dump()
    waypoint["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.active_trips.update_one(
        {"user_id": admin["id"]},
        {"$push": {"waypoints": waypoint}}
    )
    
    return {"message": "Location updated"}


@router.post("/end-trip", response_model=MileageEntryResponse)
async def end_trip(trip_data: EndTripRequest, admin: dict = Depends(get_admin_user)):
    """End the active trip and save it as a mileage entry"""
    import math
    
    trip = await db.active_trips.find_one({"user_id": admin["id"]}, {"_id": 0})
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
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entry_doc = {
        "id": entry_id,
        "user_id": admin["id"],
        "user_name": admin["name"],
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
    await db.active_trips.delete_one({"user_id": admin["id"]})
    
    return MileageEntryResponse(**entry_doc)


@router.post("/cancel-trip")
async def cancel_trip(admin: dict = Depends(get_admin_user)):
    """Cancel the active trip without saving"""
    result = await db.active_trips.delete_one({"user_id": admin["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No active trip found")
    return {"message": "Trip cancelled"}


@router.get("/active-trip/distance")
async def get_active_trip_distance(admin: dict = Depends(get_admin_user)):
    """Get the current cumulative distance of the active trip"""
    import math
    
    trip = await db.active_trips.find_one({"user_id": admin["id"]}, {"_id": 0})
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
    """Export mileage entries as PDF for tax filing"""
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
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        textColor=colors.gray,
        spaceAfter=30
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph("Business Mileage Log", title_style))
    elements.append(Paragraph(f"{period_label} - IRS Standard Mileage Rate: ${IRS_RATE}/mile", subtitle_style))
    
    # Prepare table data
    table_data = [["Date", "From", "To", "Miles", "Purpose", "Deduction"]]
    
    total_miles = 0
    total_deduction = 0
    
    for entry in entries:
        purpose = entry.get("purpose", "other")
        if purpose == "thrifting":
            purpose_display = "Thrifting"
        elif purpose == "post_office":
            purpose_display = "Post Office"
        elif purpose == "other":
            purpose_display = entry.get('purpose_other', 'Other')[:15]
        else:
            purpose_display = purpose[:15]
        
        miles = entry.get("total_miles", 0)
        deduction = round(miles * IRS_RATE, 2)
        total_miles += miles
        total_deduction += deduction
        
        # Truncate addresses for table
        start_addr = (entry.get("start_address", "") or "")[:20]
        end_addr = (entry.get("end_address", "") or "")[:20]
        
        table_data.append([
            entry.get("date", ""),
            start_addr,
            end_addr,
            f"{miles:.1f}",
            purpose_display,
            f"${deduction:.2f}"
        ])
    
    # Add totals row
    table_data.append(["", "", "TOTAL:", f"{total_miles:.1f}", "", f"${total_deduction:.2f}"])
    
    # Create table
    col_widths = [0.9*inch, 1.3*inch, 1.3*inch, 0.7*inch, 1.1*inch, 0.9*inch]
    table = Table(table_data, colWidths=col_widths)
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0, 0.5, 0.5)),  # Teal header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.9, 0.95, 0.95)),  # Light teal total row
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.gray),
        ('BOX', (0, -1), (-1, -1), 1, colors.Color(0, 0.5, 0.5)),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    # Summary section
    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.gray
    )
    elements.append(Paragraph(f"Total Business Miles: {total_miles:.1f}", styles['Normal']))
    elements.append(Paragraph(f"IRS Standard Mileage Rate (2026): ${IRS_RATE} per mile", styles['Normal']))
    elements.append(Paragraph(f"<b>Total Deduction: ${total_deduction:.2f}</b>", styles['Normal']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", summary_style))
    elements.append(Paragraph("Thrifty Curator - Business Mileage Tracking", summary_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=mileage_log_{year}.pdf"
        }
    )
