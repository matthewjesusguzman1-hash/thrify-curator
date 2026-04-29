from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional, List
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
    """Get payroll summary:
    - This Period: wages owed for current period (hours × rate)
    - Outstanding: unpaid wages from previous periods
    - This Month/Year: actual payments from check_records (matching employee names exactly)
    """
    from app.services.helpers import get_biweekly_period
    
    # Owner emails to exclude from payroll calculations
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = settings.get("default_hourly_rate", 15.00) if settings else 15.00
    
    now = datetime.now(timezone.utc)
    period_start, period_end = get_biweekly_period(period_index=0)
    prev_period_start, prev_period_end = get_biweekly_period(period_index=-1)
    
    if period_start.tzinfo is None:
        period_start = period_start.replace(tzinfo=timezone.utc)
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)
    if prev_period_start.tzinfo is None:
        prev_period_start = prev_period_start.replace(tzinfo=timezone.utc)
    if prev_period_end.tzinfo is None:
        prev_period_end = prev_period_end.replace(tzinfo=timezone.utc)
    
    # Get all employees (excluding owners)
    employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0}
    ).to_list(100)
    
    # Build dict of valid employee names -> their exact name (for matching)
    valid_employee_names = {}
    for emp in employees:
        emp_name = emp.get("name", "")
        if emp_name:
            valid_employee_names[emp_name.strip().lower()] = emp_name.strip()
    
    # Calculate wages owed for current period
    current_period_amount = 0
    current_period_hours = 0
    
    # Calculate wages owed for previous period (to check for outstanding)
    prev_period_amount = 0
    
    for emp in employees:
        emp_id = emp.get("id")
        if not emp_id:
            continue
            
        hourly_rate = emp.get("hourly_rate") or default_rate
        
        # Get employee's time entries
        entries = await db.time_entries.find({"user_id": emp_id}, {"_id": 0}).to_list(1000)
        
        emp_period_hours = 0
        emp_prev_period_hours = 0
        
        for e in entries:
            hours = e.get("total_hours", 0) or 0
            clock_in_str = e.get("clock_in", "")
            if not clock_in_str:
                continue
            try:
                clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
                # Current period
                if period_start <= clock_in_dt <= period_end:
                    emp_period_hours += hours
                # Previous period
                elif prev_period_start <= clock_in_dt <= prev_period_end:
                    emp_prev_period_hours += hours
            except:
                continue
        
        # Calculate pay for current period
        if emp_period_hours > 0:
            total_minutes = round(emp_period_hours * 60)
            rounded_hours = total_minutes / 60
            emp_pay = rounded_hours * hourly_rate
            current_period_amount += emp_pay
            current_period_hours += emp_period_hours
        
        # Calculate pay for previous period
        if emp_prev_period_hours > 0:
            total_minutes = round(emp_prev_period_hours * 60)
            rounded_hours = total_minutes / 60
            emp_pay = rounded_hours * hourly_rate
            prev_period_amount += emp_pay
    
    # Get ACTUAL PAYMENTS from payroll_check_records
    # Match payments using EXACT employee names from db.users
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Fetch all check records (employee payments)
    check_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "amount": 1, "check_date": 1, "pay_periods": 1, "employee_name": 1}
    ).to_list(1000)
    
    month_total = 0
    year_total = 0
    prev_period_paid = 0
    
    for record in check_records:
        # Match payment record's employee_name against valid employees (case-insensitive)
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name not in valid_employee_names:
            continue
            
        amount = record.get("amount", 0) or 0
        check_date_str = record.get("check_date", "")
        pay_periods = record.get("pay_periods", [])
        
        if not check_date_str:
            continue
            
        try:
            # Parse date (format: YYYY-MM-DD)
            check_date = datetime.strptime(check_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            
            # This Year
            if check_date >= year_start:
                year_total += amount
                
            # This Month
            if check_date >= month_start:
                month_total += amount
            
            # Check if payment covers the previous period
            for pp in pay_periods:
                pp_start_str = pp.get("start", "")
                if pp_start_str:
                    pp_start = datetime.strptime(pp_start_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    if pp_start.date() == prev_period_start.date():
                        prev_period_paid += amount
                        break
        except:
            continue
    
    # Calculate outstanding (previous period owed minus what was paid for that period)
    outstanding_amount = max(0, prev_period_amount - prev_period_paid)
    
    # Debug log
    print(f"[PayrollSummary] Valid employees: {list(valid_employee_names.keys())}")
    print(f"[PayrollSummary] Month total: ${month_total}, Year total: ${year_total}")
    
    return {
        "current_period": {
            "amount": round(current_period_amount, 2),
            "hours": round(current_period_hours, 2),
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        },
        "outstanding_amount": round(outstanding_amount, 2),
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

class CheckRecordUpload(BaseModel):
    image_data: str  # base64 encoded
    filename: str
    content_type: str
    description: Optional[str] = None
    check_date: Optional[str] = None
    amount: Optional[float] = None
    employee_name: Optional[str] = None
    payment_type: Optional[str] = "employee"  # "employee" or "consignment"
    consignment_client_email: Optional[str] = None  # For linking to consignment agreement
    commission_split: Optional[str] = None  # e.g., "50/50", "60/40" - for consignment payments
    pay_periods: Optional[List[dict]] = None  # List of pay periods this payment covers: [{"start": "2026-04-27", "end": "2026-05-10", "label": "Apr 27 - May 10"}]

class CheckRecordUpdate(BaseModel):
    description: Optional[str] = None
    check_date: Optional[str] = None
    amount: Optional[float] = None
    employee_name: Optional[str] = None
    image_data: Optional[str] = None  # base64 encoded, optional for update
    filename: Optional[str] = None
    content_type: Optional[str] = None
    payment_type: Optional[str] = None
    consignment_client_email: Optional[str] = None
    commission_split: Optional[str] = None  # e.g., "50/50", "60/40" - for consignment payments
    pay_periods: Optional[List[dict]] = None  # List of pay periods this payment covers

@router.get("/check-records")
async def get_check_records(admin: dict = Depends(get_admin_user)):
    """Get all payroll check records"""
    records = await db.payroll_check_records.find({}, {"_id": 0, "image_data": 0}).sort("uploaded_at", -1).to_list(500)
    return records

@router.post("/check-records")
async def upload_check_record(data: CheckRecordUpload, admin: dict = Depends(get_admin_user)):
    """Upload a payroll check image"""
    from app.routers.conversations import send_user_push_notification
    
    record = {
        "id": str(uuid.uuid4()),
        "image_data": data.image_data,
        "filename": data.filename,
        "content_type": data.content_type,
        "description": data.description,
        "check_date": data.check_date,
        "amount": data.amount,
        "employee_name": data.employee_name,
        "payment_type": data.payment_type or "employee",
        "consignment_client_email": data.consignment_client_email,
        "commission_split": data.commission_split,
        "pay_periods": data.pay_periods or [],  # Store pay periods this payment covers
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": admin.get("name", "Admin")
    }
    
    await db.payroll_check_records.insert_one(record)
    
    # Send push notification to the recipient
    try:
        if data.payment_type == "consignment" and data.consignment_client_email:
            # Notify consignor
            await send_user_push_notification(
                user_type="consignor",
                user_id=data.consignment_client_email.lower(),
                title="Payment Recorded",
                body=f"A payment of ${data.amount:.2f} has been recorded for your account." if data.amount else "A new payment has been recorded for your account.",
                notification_type="payment_received"
            )
        elif data.payment_type == "employee" and data.employee_name:
            # Try to find the employee by name and notify them
            employee = await db.users.find_one({"name": data.employee_name})
            if employee:
                await send_user_push_notification(
                    user_type="employee",
                    user_id=employee.get("id") or employee.get("email"),
                    title="Payment Recorded",
                    body=f"A payment of ${data.amount:.2f} has been recorded for you." if data.amount else "A new payment has been recorded for you.",
                    notification_type="payment_received"
                )
    except Exception as e:
        print(f"Failed to send payment notification: {e}")
    
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
    if data.payment_type is not None:
        update_data["payment_type"] = data.payment_type
    if data.consignment_client_email is not None:
        update_data["consignment_client_email"] = data.consignment_client_email
    if data.commission_split is not None:
        update_data["commission_split"] = data.commission_split
    if data.pay_periods is not None:
        update_data["pay_periods"] = data.pay_periods
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
    
    image_data_b64 = record.get("image_data")
    if not image_data_b64:
        raise HTTPException(status_code=404, detail="No image data for this record")
    
    try:
        image_data = base64.b64decode(image_data_b64)
    except Exception as e:
        print(f"[PayrollImage] Failed to decode base64 for record {record_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to decode image data")
    
    return Response(
        content=image_data,
        media_type=record.get("content_type", "image/jpeg"),
        headers={"Content-Disposition": f"inline; filename={record.get('filename', 'check.jpg')}"}
    )


@router.get("/consignment-clients")
async def get_consignment_clients(admin: dict = Depends(get_admin_user)):
    """Get all consignment agreement submitters for payment selection."""
    # Get all consignment agreements (any status)
    clients = await db.consignment_agreements.find(
        {}, 
        {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "payment_method": 1, "payment_details": 1, "status": 1}
    ).sort("full_name", 1).to_list(500)
    return clients


@router.get("/orphaned-payment-records")
async def get_orphaned_payment_records(admin: dict = Depends(get_admin_user)):
    """Find payment records that don't match any current employee name."""
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    # Get all valid employee names
    employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0, "name": 1}
    ).to_list(100)
    valid_names = set(emp.get("name", "").strip().lower() for emp in employees if emp.get("name"))
    
    # Get all employee payment records
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "id": 1, "employee_name": 1, "amount": 1, "check_date": 1}
    ).to_list(1000)
    
    orphaned = []
    for record in payment_records:
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name not in valid_names:
            orphaned.append({
                "id": record.get("id"),
                "employee_name": record.get("employee_name"),
                "amount": record.get("amount"),
                "check_date": record.get("check_date")
            })
    
    return {
        "valid_employee_names": list(valid_names),
        "orphaned_records": orphaned,
        "orphaned_count": len(orphaned)
    }


@router.delete("/orphaned-payment-records")
async def delete_orphaned_payment_records(admin: dict = Depends(get_admin_user)):
    """Delete all payment records that don't match any current employee name."""
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    # Get all valid employee names
    employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0, "name": 1}
    ).to_list(100)
    valid_names = set(emp.get("name", "").strip().lower() for emp in employees if emp.get("name"))
    
    # Get all employee payment records
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "id": 1, "employee_name": 1}
    ).to_list(1000)
    
    deleted_count = 0
    for record in payment_records:
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name not in valid_names:
            await db.payroll_check_records.delete_one({"id": record.get("id")})
            deleted_count += 1
    
    return {"deleted_count": deleted_count, "message": f"Deleted {deleted_count} orphaned payment records"}


@router.post("/cleanup-payroll-data")
async def cleanup_payroll_data(admin: dict = Depends(get_admin_user)):
    """
    One-time cleanup: Keep only employees with actual hours worked and their payment records.
    Removes test employees and orphaned payment records.
    """
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    # Get all employees (excluding owners)
    all_employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0}
    ).to_list(100)
    
    # Find employees with actual hours worked
    employees_with_hours = []
    employees_to_delete = []
    
    for emp in all_employees:
        emp_id = emp.get("id")
        emp_name = emp.get("name", "")
        if not emp_id:
            continue
        
        # Check if employee has any time entries
        time_entries = await db.time_entries.find({"user_id": emp_id}).to_list(1)
        
        if time_entries:
            employees_with_hours.append(emp_name.strip().lower())
        else:
            employees_to_delete.append(emp)
    
    # Delete test employees (no hours)
    deleted_employees = 0
    for emp in employees_to_delete:
        emp_id = emp.get("id")
        if emp_id:
            await db.users.delete_one({"id": emp_id})
            # Also delete their time entries (should be none, but just in case)
            await db.time_entries.delete_many({"user_id": emp_id})
            deleted_employees += 1
    
    # Delete payment records that don't match employees with hours
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "id": 1, "employee_name": 1}
    ).to_list(1000)
    
    deleted_payments = 0
    for record in payment_records:
        record_name = (record.get("employee_name") or "").strip().lower()
        if record_name not in employees_with_hours:
            await db.payroll_check_records.delete_one({"id": record.get("id")})
            deleted_payments += 1
    
    return {
        "success": True,
        "employees_with_hours": employees_with_hours,
        "deleted_test_employees": deleted_employees,
        "deleted_orphaned_payments": deleted_payments,
        "message": f"Cleanup complete. Kept {len(employees_with_hours)} employee(s) with hours. Deleted {deleted_employees} test employee(s) and {deleted_payments} orphaned payment record(s)."
    }


@router.get("/debug-name-matching")
async def debug_name_matching(admin: dict = Depends(get_admin_user)):
    """Debug endpoint to show name matching between employees and payment records."""
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    # Get all employees (excluding owners)
    employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(100)
    
    employee_names = [{"name": e.get("name"), "name_lower": e.get("name", "").strip().lower(), "email": e.get("email")} for e in employees]
    
    # Get all payment records
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "id": 1, "employee_name": 1, "amount": 1, "check_date": 1}
    ).to_list(1000)
    
    payment_names = [{"name": p.get("employee_name"), "name_lower": (p.get("employee_name") or "").strip().lower(), "amount": p.get("amount"), "date": p.get("check_date")} for p in payment_records]
    
    # Find matches and mismatches
    employee_name_set = set(e["name_lower"] for e in employee_names)
    
    matched = []
    unmatched = []
    for p in payment_names:
        if p["name_lower"] in employee_name_set:
            matched.append(p)
        else:
            unmatched.append(p)
    
    return {
        "employees_in_db": employee_names,
        "payment_records": payment_names,
        "matched_payments": matched,
        "unmatched_payments": unmatched,
        "summary": {
            "total_employees": len(employee_names),
            "total_payments": len(payment_names),
            "matched": len(matched),
            "unmatched": len(unmatched)
        }
    }


@router.get("/employees-for-payment")
async def get_employees_for_payment(admin: dict = Depends(get_admin_user)):
    """Get all employees (non-admin users) for payment selection dropdown.
    Excludes business owners."""
    # Owner emails to exclude from the list
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    # Get all non-admin users, excluding owners
    employees = await db.users.find(
        {
            "role": {"$ne": "admin"},
            "email": {"$nin": [e.lower() for e in OWNER_EMAILS]}
        },
        {"_id": 0, "name": 1, "email": 1, "phone": 1, "hourly_rate": 1}
    ).sort("name", 1).to_list(500)
    return employees


@router.get("/all-employees-for-payment")
async def get_all_employees_for_payment(admin: dict = Depends(get_admin_user)):
    """Get employees for payroll history dropdown - excludes business owners."""
    # Owner emails to exclude - they don't need payroll tracking
    OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"]
    
    employees = await db.users.find(
        {"email": {"$nin": [e.lower() for e in OWNER_EMAILS]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "hourly_rate": 1, "role": 1}
    ).sort("name", 1).to_list(500)
    return employees


@router.get("/available-pay-periods")
async def get_available_pay_periods(admin: dict = Depends(get_admin_user)):
    """Get list of available pay periods for selection (current + last 12 periods)."""
    from app.services.helpers import get_biweekly_period
    
    periods = []
    for i in range(13):  # Current period + 12 previous periods
        period_start, period_end = get_biweekly_period(period_index=-i)
        
        # Format the label nicely
        start_str = period_start.strftime("%b %d")
        end_str = period_end.strftime("%b %d, %Y")
        label = f"{start_str} - {end_str}"
        
        # Determine if this is current, previous, or older
        if i == 0:
            period_type = "current"
        elif i == 1:
            period_type = "previous"
        else:
            period_type = "past"
        
        periods.append({
            "start": period_start.strftime("%Y-%m-%d"),
            "end": period_end.strftime("%Y-%m-%d"),
            "label": label,
            "type": period_type,
            "index": -i
        })
    
    return periods


@router.get("/client-payment-history/{email}")
async def get_client_payment_history(email: str):
    """Get payment history for a consignment client (public endpoint for clients to view their payments)"""
    # Find all payments made to this client
    payments = await db.payroll_check_records.find(
        {"consignment_client_email": email.lower(), "payment_type": "consignment"},
        {"_id": 0, "image_data": 0}  # Exclude image data for performance
    ).sort("check_date", -1).to_list(100)
    
    # Calculate total paid
    total_paid = sum(p.get("amount", 0) or 0 for p in payments)
    
    return {
        "payments": payments,
        "total_paid": round(total_paid, 2),
        "payment_count": len(payments)
    }



@router.get("/employee/{employee_id}/history")
async def get_employee_payroll_history(employee_id: str, admin: dict = Depends(get_admin_user)):
    """Get comprehensive payroll history for an employee.
    Returns all pay periods with hours worked, amount owed, amount paid, and balance.
    """
    from app.services.helpers import get_biweekly_period
    
    # Get employee
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_name = employee.get("name", "")
    
    # Get settings
    settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = settings.get("default_hourly_rate", 15.00) if settings else 15.00
    hourly_rate = employee.get("hourly_rate") or default_rate
    
    # Get all time entries for this employee
    entries = await db.time_entries.find({"user_id": employee_id}, {"_id": 0}).to_list(1000)
    
    # Debug: Log how many entries we found
    print(f"[PayrollHistory] Employee: {employee_name} (ID: {employee_id}), Found {len(entries)} time entries")
    
    # Get all payment records for this employee
    payment_records = await db.payroll_check_records.find(
        {"payment_type": {"$in": ["employee", None]}},
        {"_id": 0, "amount": 1, "check_date": 1, "employee_name": 1, "pay_periods": 1}
    ).to_list(1000)
    
    # Debug: Show all payment records
    print(f"[PayrollHistory] Total payment records: {len(payment_records)}")
    for p in payment_records[:10]:
        print(f"[PayrollHistory] Payment: name='{p.get('employee_name')}', amount={p.get('amount')}, pay_periods={p.get('pay_periods', [])}")
    
    # Filter payments for this employee by name (case-insensitive)
    employee_payments = [
        p for p in payment_records 
        if (p.get("employee_name") or "").strip().lower() == employee_name.strip().lower()
    ]
    
    print(f"[PayrollHistory] Employee '{employee_name}' matched {len(employee_payments)} payments")
    
    # Build pay period history (go back ~6 months / 13 periods)
    periods = []
    now = datetime.now(timezone.utc)
    
    for period_index in range(0, -13, -1):  # Current + 12 previous periods
        period_start, period_end = get_biweekly_period(period_index=period_index)
        
        if period_start.tzinfo is None:
            period_start = period_start.replace(tzinfo=timezone.utc)
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)
        
        # Calculate hours worked in this period
        period_hours = 0
        period_shifts = 0
        
        for e in entries:
            clock_in_str = e.get("clock_in", "")
            if not clock_in_str:
                continue
            try:
                clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
                # Make sure we're comparing timezone-aware datetimes
                if clock_in_dt.tzinfo is None:
                    clock_in_dt = clock_in_dt.replace(tzinfo=timezone.utc)
                
                if period_start <= clock_in_dt <= period_end:
                    entry_hours = e.get("total_hours", 0) or 0
                    period_hours += entry_hours
                    period_shifts += 1
                    if period_index == 0:  # Debug for current period
                        print(f"[PayrollHistory] Current period entry found: clock_in={clock_in_str}, hours={entry_hours}")
            except (ValueError, TypeError) as ex:
                print(f"[PayrollHistory] Error parsing clock_in: {clock_in_str}, error: {ex}")
                continue
        
        if period_index == 0:
            print(f"[PayrollHistory] Current period ({period_start} to {period_end}): {period_hours} hours, {period_shifts} shifts")
        
        # Calculate amount owed (round to minute first, like Employee Portal)
        rounded_hours = round_hours_to_minute(period_hours)
        amount_owed = round(rounded_hours * hourly_rate, 2)
        
        # Calculate amount paid FOR THIS PERIOD (using pay_periods field, NOT check_date)
        amount_paid = 0
        period_start_date = period_start.strftime("%Y-%m-%d")
        
        for p in employee_payments:
            pay_periods_list = p.get("pay_periods", [])
            
            # Debug log
            if pay_periods_list:
                print(f"[PayrollHistory] Payment {p.get('amount')} has pay_periods: {[pp.get('start') for pp in pay_periods_list]}, matching against period_start: {period_start_date}")
            
            # If payment has pay_periods specified, use those to match
            if pay_periods_list:
                for pp in pay_periods_list:
                    pp_start = pp.get("start", "")
                    if pp_start == period_start_date:
                        # This payment covers this period
                        print(f"[PayrollHistory] MATCH! Adding ${p.get('amount')} to period {period_start_date}")
                        amount_paid += p.get("amount", 0) or 0
                        break  # Don't double-count if somehow listed twice
            else:
                # Fallback: if no pay_periods specified, use check_date (legacy behavior)
                check_date_str = p.get("check_date", "")
                if not check_date_str:
                    continue
                try:
                    check_date = datetime.strptime(check_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    # Payment applies to the period it falls within
                    if period_start <= check_date <= period_end:
                        amount_paid += p.get("amount", 0) or 0
                except (ValueError, TypeError):
                    continue
        
        amount_paid = round(amount_paid, 2)
        balance = round(amount_owed - amount_paid, 2)
        
        # Only include periods where employee has worked hours OR has a balance
        if period_hours > 0 or amount_paid > 0:
            periods.append({
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "period_label": f"{period_start.strftime('%b %d')} - {period_end.strftime('%b %d, %Y')}",
                "is_current": period_index == 0,
                "hours": round(period_hours, 2),
                "hours_display": format_hours_hms(period_hours),
                "shifts": period_shifts,
                "hourly_rate": hourly_rate,
                "amount_owed": amount_owed,
                "amount_paid": amount_paid,
                "balance": balance
            })
        elif period_index == 0:
            # Always include current period even if no hours yet
            periods.append({
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "period_label": f"{period_start.strftime('%b %d')} - {period_end.strftime('%b %d, %Y')}",
                "is_current": True,
                "hours": 0,
                "hours_display": "0h 0m",
                "shifts": 0,
                "hourly_rate": hourly_rate,
                "amount_owed": 0,
                "amount_paid": 0,
                "balance": 0
            })
    
    # Calculate monthly totals (current month)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1) - timedelta(seconds=1)
    else:
        month_end = now.replace(month=now.month + 1, day=1) - timedelta(seconds=1)
    
    month_hours = 0
    month_shifts = 0
    for e in entries:
        clock_in_str = e.get("clock_in", "")
        if not clock_in_str:
            continue
        try:
            clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
            if month_start <= clock_in_dt <= month_end:
                month_hours += e.get("total_hours", 0) or 0
                month_shifts += 1
        except (ValueError, TypeError):
            continue
    
    month_owed = round(round_hours_to_minute(month_hours) * hourly_rate, 2)
    
    month_paid = 0
    for p in employee_payments:
        check_date_str = p.get("check_date", "")
        if not check_date_str:
            continue
        try:
            check_date = datetime.strptime(check_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if month_start <= check_date <= month_end:
                month_paid += p.get("amount", 0) or 0
        except (ValueError, TypeError):
            continue
    month_paid = round(month_paid, 2)
    
    # Calculate yearly totals
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_end = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    
    year_hours = 0
    year_shifts = 0
    for e in entries:
        clock_in_str = e.get("clock_in", "")
        if not clock_in_str:
            continue
        try:
            clock_in_dt = datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
            if year_start <= clock_in_dt <= year_end:
                year_hours += e.get("total_hours", 0) or 0
                year_shifts += 1
        except (ValueError, TypeError):
            continue
    
    year_owed = round(round_hours_to_minute(year_hours) * hourly_rate, 2)
    
    year_paid = 0
    for p in employee_payments:
        check_date_str = p.get("check_date", "")
        if not check_date_str:
            continue
        try:
            check_date = datetime.strptime(check_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if year_start <= check_date <= year_end:
                year_paid += p.get("amount", 0) or 0
        except (ValueError, TypeError):
            continue
    year_paid = round(year_paid, 2)
    
    return {
        "employee": {
            "id": employee_id,
            "name": employee_name,
            "email": employee.get("email", ""),
            "hourly_rate": hourly_rate
        },
        "current_period": periods[0] if periods else None,
        "periods": periods,
        "month_summary": {
            "label": now.strftime("%B %Y"),
            "hours": round(month_hours, 2),
            "hours_display": format_hours_hms(month_hours),
            "shifts": month_shifts,
            "amount_owed": month_owed,
            "amount_paid": month_paid,
            "balance": round(month_owed - month_paid, 2)
        },
        "year_summary": {
            "label": str(now.year),
            "hours": round(year_hours, 2),
            "hours_display": format_hours_hms(year_hours),
            "shifts": year_shifts,
            "amount_owed": year_owed,
            "amount_paid": year_paid,
            "balance": round(year_owed - year_paid, 2)
        }
    }
