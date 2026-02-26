from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER

from app.database import db
from app.dependencies import get_admin_user
from app.models.payroll import PayrollSettings, PayrollReportRequest
from app.services.helpers import get_biweekly_period, get_monthly_period, get_yearly_period

router = APIRouter(prefix="/admin/payroll", tags=["Payroll"])


def round_hours_to_minute(decimal_hours: float) -> float:
    """Round decimal hours to nearest minute, return as decimal hours.
    Used for pay calculations to match displayed time."""
    if decimal_hours is None or decimal_hours < 0:
        return 0
    total_minutes = round(decimal_hours * 60)
    return total_minutes / 60


def format_hours_hms(decimal_hours: float) -> str:
    """Convert decimal hours to h:m format for display."""
    if decimal_hours is None or decimal_hours < 0:
        return "0h 0m"
    total_minutes = round(decimal_hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours}h {minutes}m"


@router.get("/settings")
async def get_payroll_settings(admin: dict = Depends(get_admin_user)):
    """Get payroll settings"""
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    if not settings:
        return {
            "id": "payroll_settings",
            "pay_period_start_date": "2026-01-06",
            "default_hourly_rate": 15.00
        }
    return settings


@router.get("/summary")
async def get_payroll_summary(admin: dict = Depends(get_admin_user)):
    """Get payroll summary for dashboard"""
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = settings.get("default_hourly_rate", 15.00) if settings else 15.00
    
    now = datetime.now(timezone.utc)
    # Use first Monday of year as anchor (no custom start date needed)
    period_start, period_end = get_biweekly_period(period_index=0)
    
    employees = await db.users.find({}, {"_id": 0, "id": 1, "hourly_rate": 1}).to_list(100)
    employee_rates = {emp["id"]: emp.get("hourly_rate") or default_rate for emp in employees}
    
    # Get time entries with date filter for better performance
    all_entries = await db.time_entries.find({}, {"_id": 0}).to_list(1000)
    
    # Helper function to parse clock_in to datetime
    def parse_clock_in(entry):
        clock_in = entry.get("clock_in")
        if isinstance(clock_in, str):
            try:
                # Handle ISO format string
                return datetime.fromisoformat(clock_in.replace('Z', '+00:00'))
            except:
                return None
        return clock_in
    
    # Filter entries for current period
    period_start_dt = datetime.combine(period_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    period_end_dt = datetime.combine(period_end + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
    
    current_period_hours = 0
    current_period_amount = 0
    for entry in all_entries:
        clock_in_dt = parse_clock_in(entry)
        if clock_in_dt and period_start_dt <= clock_in_dt < period_end_dt:
            hours = entry.get("total_hours") or 0
            current_period_hours += hours
            # Use user_id (not employee_id) to match time_entries schema
            emp_rate = employee_rates.get(entry.get("user_id"), default_rate)
            # Use rounded hours for pay calculation
            rounded_hours = round_hours_to_minute(hours)
            current_period_amount += rounded_hours * emp_rate
    
    # Filter entries for current month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    month_total = 0
    for entry in all_entries:
        clock_in_dt = parse_clock_in(entry)
        if clock_in_dt and month_start <= clock_in_dt < month_end:
            hours = entry.get("total_hours") or 0
            emp_rate = employee_rates.get(entry.get("user_id"), default_rate)
            rounded_hours = round_hours_to_minute(hours)
            month_total += rounded_hours * emp_rate
    
    # Filter entries for current year
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    year_total = 0
    for entry in all_entries:
        clock_in_dt = parse_clock_in(entry)
        if clock_in_dt and year_start <= clock_in_dt < year_end:
            hours = entry.get("total_hours") or 0
            # Use user_id (not employee_id) to match time_entries schema
            emp_rate = employee_rates.get(entry.get("user_id"), default_rate)
            # Use rounded hours for pay calculation
            rounded_hours = round_hours_to_minute(hours)
            year_total += rounded_hours * emp_rate
    
    return {
        "current_period": {
            "amount": round(current_period_amount, 2),
            "hours": round(current_period_hours, 2),
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        },
        "month_total": round(month_total, 2),
        "year_total": round(year_total, 2)
    }


@router.put("/settings")
async def update_payroll_settings(settings: PayrollSettings, admin: dict = Depends(get_admin_user)):
    """Update payroll settings"""
    await db.payroll_settings.update_one(
        {"id": "payroll_settings"},
        {"$set": settings.model_dump()},
        upsert=True
    )
    return settings


@router.post("/report")
async def generate_payroll_report(request: PayrollReportRequest, admin: dict = Depends(get_admin_user)):
    """Generate payroll report for specified period"""
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    if not settings:
        settings = {"default_hourly_rate": 15.00}
    
    if request.period_type == "biweekly":
        # Use first Monday of year as anchor
        period_start, period_end = get_biweekly_period(period_index=request.period_index or 0)
    elif request.period_type == "monthly":
        period_start, period_end = get_monthly_period(request.period_index or 0)
    elif request.period_type == "yearly":
        period_start, period_end = get_yearly_period(request.period_index or 0)
    elif request.period_type == "custom":
        if not request.start_date or not request.end_date:
            raise HTTPException(status_code=400, detail="Custom period requires start_date and end_date")
        try:
            period_start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
            period_end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        raise HTTPException(status_code=400, detail="Invalid period_type")
    
    query = {
        "clock_in": {"$gte": period_start.isoformat(), "$lte": period_end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if request.employee_id:
        query["user_id"] = request.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    all_employees = await db.users.find({}, {"_id": 0}).to_list(1000)
    employee_rates = {e["id"]: e.get("hourly_rate") for e in all_employees}
    
    default_rate = request.hourly_rate or settings.get("default_hourly_rate", 15.00)
    
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            emp_rate = employee_rates.get(uid)
            if emp_rate is None:
                emp_rate = default_rate
            
            employee_data[uid] = {
                "user_id": uid,
                "name": entry["user_name"],
                "total_hours": 0,
                "total_shifts": 0,
                "shifts": [],
                "daily_totals": {},
                "hourly_rate": emp_rate,
                "has_custom_rate": employee_rates.get(uid) is not None
            }
        
        hours = entry.get("total_hours", 0)
        employee_data[uid]["total_hours"] += hours
        employee_data[uid]["total_shifts"] += 1
        
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": hours
        })
        
        shift_date = entry["clock_in"][:10]
        if shift_date not in employee_data[uid]["daily_totals"]:
            employee_data[uid]["daily_totals"][shift_date] = 0
        employee_data[uid]["daily_totals"][shift_date] += hours
    
    for uid, data in employee_data.items():
        data["total_hours"] = round(data["total_hours"], 2)
        emp_rate = data["hourly_rate"]
        # Use rounded hours for pay calculation to match displayed time
        rounded_total = round_hours_to_minute(data["total_hours"])
        data["gross_wages"] = round(rounded_total * emp_rate, 2)
        # Also store the formatted time for display
        data["total_hours_formatted"] = format_hours_hms(data["total_hours"])
        data["daily_totals"] = dict(sorted(data["daily_totals"].items()))
        for date in data["daily_totals"]:
            data["daily_totals"][date] = round(data["daily_totals"][date], 2)
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    # Sum gross_wages which already uses rounded hours
    total_wages = sum(e["gross_wages"] for e in employee_data.values())
    total_shifts = sum(e["total_shifts"] for e in employee_data.values())
    total_hours_formatted = format_hours_hms(total_hours)
    
    return {
        "period": {
            "type": request.period_type,
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
            "start_formatted": period_start.strftime("%B %d, %Y"),
            "end_formatted": period_end.strftime("%B %d, %Y")
        },
        "settings": {
            "default_hourly_rate": default_rate,
            "uses_individual_rates": True
        },
        "summary": {
            "total_employees": len(employee_data),
            "total_hours": round(total_hours, 2),
            "total_shifts": total_shifts,
            "total_wages": round(total_wages, 2)
        },
        "employees": list(employee_data.values())
    }


@router.post("/report/pdf")
async def generate_payroll_pdf(request: PayrollReportRequest, admin: dict = Depends(get_admin_user)):
    """Generate PDF payroll report"""
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    if not settings:
        settings = {"default_hourly_rate": 15.00}
    
    if request.period_type == "biweekly":
        # Use first Monday of year as anchor
        period_start, period_end = get_biweekly_period(period_index=request.period_index or 0)
    elif request.period_type == "monthly":
        period_start, period_end = get_monthly_period(request.period_index or 0)
    elif request.period_type == "yearly":
        period_start, period_end = get_yearly_period(request.period_index or 0)
    elif request.period_type == "custom":
        if not request.start_date or not request.end_date:
            raise HTTPException(status_code=400, detail="Custom period requires start_date and end_date")
        period_start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
        period_end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
    else:
        raise HTTPException(status_code=400, detail="Invalid period_type")
    
    query = {
        "clock_in": {"$gte": period_start.isoformat(), "$lte": period_end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if request.employee_id:
        query["user_id"] = request.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    all_employees = await db.users.find({}, {"_id": 0}).to_list(1000)
    employee_rates = {e["id"]: e.get("hourly_rate") for e in all_employees}
    
    default_rate = request.hourly_rate or settings.get("default_hourly_rate", 15.00)
    
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            emp_rate = employee_rates.get(uid)
            if emp_rate is None:
                emp_rate = default_rate
                
            employee_data[uid] = {
                "name": entry["user_name"],
                "total_hours": 0,
                "total_shifts": 0,
                "shifts": [],
                "hourly_rate": emp_rate
            }
        
        hours = entry.get("total_hours", 0)
        employee_data[uid]["total_hours"] += hours
        employee_data[uid]["total_shifts"] += 1
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": hours
        })
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.5*inch, leftMargin=0.5*inch, rightMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Brand colors - Cyan theme for payroll (like Consignment Inquiry)
    HEADER_COLOR = colors.Color(0/255, 212/255, 255/255)  # Cyan #00D4FF
    SECTION_COLOR = colors.Color(0/255, 180/255, 216/255)  # Slightly darker cyan
    GREEN = colors.Color(34/255, 139/255, 34/255)  # Green for money
    GRAY_LABEL = colors.Color(128/255, 128/255, 128/255)
    BLACK = colors.black
    LIGHT_GRAY = colors.Color(200/255, 200/255, 200/255)
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        alignment=0,  # Left align
        spaceAfter=2,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        alignment=0,  # Left align
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
    
    # Header table with cyan background
    header_data = [
        [Paragraph("THRIFTY CURATOR", title_style)],
        [Paragraph("Payroll Report", subtitle_style)]
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
        [Paragraph("Date Range:", label_style), Paragraph(f"{period_start.strftime('%B %d, %Y')} - {period_end.strftime('%B %d, %Y')}", value_style)],
        [Paragraph("Default Rate:", label_style), Paragraph(f"${default_rate:.2f}/hr", value_style)],
    ]
    period_table = Table(period_data, colWidths=[1.5*inch, 5.5*inch])
    period_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(period_table)
    elements.append(Spacer(1, 10))
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    # Use rounded hours for pay calculation to match displayed time
    total_wages = sum(round_hours_to_minute(e["total_hours"]) * e["hourly_rate"] for e in employee_data.values())
    total_shifts = sum(e["total_shifts"] for e in employee_data.values())
    
    summary_data = [
        ["Summary", ""],
        ["Total Employees", str(len(employee_data))],
        ["Total Hours", format_hours_hms(total_hours)],
        ["Total Shifts", str(total_shifts)],
        ["Total Wages", f"${total_wages:.2f}"]
    ]
    
    # SUMMARY section
    elements.append(Paragraph("SUMMARY", section_style))
    elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
    elements.append(Spacer(1, 5))
    
    summary_data = [
        [Paragraph("Total Employees:", label_style), Paragraph(str(len(employee_data)), value_style)],
        [Paragraph("Total Hours:", label_style), Paragraph(format_hours_hms(total_hours), value_style)],
        [Paragraph("Total Shifts:", label_style), Paragraph(str(total_shifts), value_style)],
        [Paragraph("Total Wages:", label_style), Paragraph(f"${total_wages:.2f}", green_value_style)],
    ]
    summary_table = Table(summary_data, colWidths=[1.5*inch, 5.5*inch])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))
    
    if employee_data:
        # EMPLOYEE BREAKDOWN section
        elements.append(Paragraph("EMPLOYEE BREAKDOWN", section_style))
        elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
        elements.append(Spacer(1, 5))
        
        for uid, data in employee_data.items():
            hours = data["total_hours"]
            emp_rate = data["hourly_rate"]
            rounded_hours = round_hours_to_minute(hours)
            wages = round(rounded_hours * emp_rate, 2)
            
            # Employee name as sub-header
            emp_name_style = ParagraphStyle('EmpName', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=BLACK, leftIndent=10)
            elements.append(Paragraph(data["name"], emp_name_style))
            
            emp_data = [
                [Paragraph("Hours:", label_style), Paragraph(format_hours_hms(hours), value_style),
                 Paragraph("Shifts:", label_style), Paragraph(str(data["total_shifts"]), value_style)],
                [Paragraph("Rate:", label_style), Paragraph(f"${emp_rate:.2f}/hr", value_style),
                 Paragraph("Gross Wages:", label_style), Paragraph(f"${wages:.2f}", green_value_style)],
            ]
            emp_table = Table(emp_data, colWidths=[1*inch, 1.5*inch, 1.2*inch, 1.5*inch])
            emp_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ('LEFTPADDING', (0, 0), (0, -1), 20),
            ]))
            elements.append(emp_table)
            elements.append(Spacer(1, 8))
        
        elements.append(Spacer(1, 15))
        
        # SHIFT DETAILS section
        elements.append(Paragraph("SHIFT DETAILS", section_style))
        elements.append(Table([[""]], colWidths=[7.5*inch], rowHeights=[1], style=[('LINEBELOW', (0, 0), (-1, -1), 0.5, LIGHT_GRAY)]))
        elements.append(Spacer(1, 5))
        
        for uid, data in employee_data.items():
            emp_header_style = ParagraphStyle(
                'EmpHeader',
                parent=styles['Normal'],
                fontSize=10,
                textColor=BLACK,
                spaceBefore=8,
                spaceAfter=3,
                fontName='Helvetica-Bold',
                leftIndent=10
            )
            elements.append(Paragraph(f"{data['name']} (${data['hourly_rate']:.2f}/hr)", emp_header_style))
            
            for shift in sorted(data["shifts"], key=lambda x: x["clock_in"]):
                clock_in_dt = datetime.fromisoformat(shift["clock_in"].replace('Z', '+00:00'))
                clock_out_dt = datetime.fromisoformat(shift["clock_out"].replace('Z', '+00:00')) if shift["clock_out"] else None
                
                shift_data = [
                    [Paragraph("Date:", label_style), Paragraph(clock_in_dt.strftime("%m/%d/%Y"), value_style),
                     Paragraph("In:", label_style), Paragraph(clock_in_dt.strftime("%I:%M %p"), value_style),
                     Paragraph("Out:", label_style), Paragraph(clock_out_dt.strftime("%I:%M %p") if clock_out_dt else "-", value_style),
                     Paragraph("Hours:", label_style), Paragraph(format_hours_hms(shift['hours']), value_style)],
                ]
                shift_table = Table(shift_data, colWidths=[0.6*inch, 1*inch, 0.5*inch, 0.9*inch, 0.5*inch, 0.9*inch, 0.7*inch, 0.8*inch])
                shift_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('TOPPADDING', (0, 0), (-1, -1), 1),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    ('LEFTPADDING', (0, 0), (0, -1), 25),
                ]))
                elements.append(shift_table)
            
            elements.append(Spacer(1, 5))
    
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.Color(0.6, 0.6, 0.6))
    elements.append(Paragraph(f"Page 1 | Generated on {datetime.now().strftime('%B %d, %Y')}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"payroll_report_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Payroll Check Records endpoints
import base64
import uuid
from pydantic import BaseModel
from typing import Optional

class CheckRecordUpload(BaseModel):
    image_data: str  # base64 encoded
    filename: str
    content_type: str
    description: Optional[str] = None
    check_date: Optional[str] = None
    amount: Optional[float] = None
    employee_name: Optional[str] = None

class CheckRecordUpdate(BaseModel):
    description: Optional[str] = None
    check_date: Optional[str] = None
    amount: Optional[float] = None
    employee_name: Optional[str] = None
    image_data: Optional[str] = None  # base64 encoded, optional for update
    filename: Optional[str] = None
    content_type: Optional[str] = None

@router.get("/check-records")
async def get_check_records(admin: dict = Depends(get_admin_user)):
    """Get all payroll check records"""
    records = await db.payroll_check_records.find({}, {"_id": 0, "image_data": 0}).sort("uploaded_at", -1).to_list(500)
    return records

@router.post("/check-records")
async def upload_check_record(data: CheckRecordUpload, admin: dict = Depends(get_admin_user)):
    """Upload a payroll check image"""
    record = {
        "id": str(uuid.uuid4()),
        "image_data": data.image_data,
        "filename": data.filename,
        "content_type": data.content_type,
        "description": data.description,
        "check_date": data.check_date,
        "amount": data.amount,
        "employee_name": data.employee_name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin.get("name", "Admin")
    }
    
    await db.payroll_check_records.insert_one(record)
    
    # Return without image_data
    del record["image_data"]
    if "_id" in record:
        del record["_id"]
    
    return record

@router.delete("/check-records/{record_id}")
async def delete_check_record(record_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a payroll check record"""
    result = await db.payroll_check_records.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Check record deleted successfully"}

@router.put("/check-records/{record_id}")
async def update_check_record(record_id: str, data: CheckRecordUpdate, admin: dict = Depends(get_admin_user)):
    """Update a payroll check record"""
    # Find existing record
    existing = await db.payroll_check_records.find_one({"id": record_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Build update dict with only provided fields
    update_data = {}
    if data.description is not None:
        update_data["description"] = data.description
    if data.check_date is not None:
        update_data["check_date"] = data.check_date
    if data.amount is not None:
        update_data["amount"] = data.amount
    if data.employee_name is not None:
        update_data["employee_name"] = data.employee_name
    if data.image_data is not None:
        update_data["image_data"] = data.image_data
        update_data["filename"] = data.filename
        update_data["content_type"] = data.content_type
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payroll_check_records.update_one(
        {"id": record_id},
        {"$set": update_data}
    )
    
    # Return updated record without image_data
    updated = await db.payroll_check_records.find_one({"id": record_id}, {"_id": 0, "image_data": 0})
    return updated

@router.get("/check-records/{record_id}/image")
async def get_check_image(record_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific check record image"""
    from fastapi.responses import Response
    record = await db.payroll_check_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    image_data = base64.b64decode(record["image_data"])
    return Response(
        content=image_data,
        media_type=record.get("content_type", "image/jpeg"),
        headers={"Content-Disposition": f"inline; filename={record.get('filename', 'check.jpg')}"}
    )
