from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
import io
import resend

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER

from app.database import db
from app.dependencies import get_admin_user
from app.models.payroll import PayrollSettings, PayrollReportRequest, EmailPayrollRequest
from app.config import RESEND_API_KEY, SENDER_EMAIL
from app.services.helpers import get_biweekly_period, get_monthly_period, get_yearly_period

router = APIRouter(prefix="/admin/payroll", tags=["Payroll"])


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
    start_date_str = settings.get("pay_period_start_date", "2026-01-06") if settings else "2026-01-06"
    
    now = datetime.now(timezone.utc)
    period_start, period_end = get_biweekly_period(start_date_str, 0)
    
    employees = await db.users.find({"role": "employee"}, {"_id": 0, "id": 1, "hourly_rate": 1}).to_list(100)
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
            emp_rate = employee_rates.get(entry.get("employee_id"), default_rate)
            current_period_amount += hours * emp_rate
    
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
            emp_rate = employee_rates.get(entry.get("employee_id"), default_rate)
            month_total += hours * emp_rate
    
    # Filter entries for current year
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    year_total = 0
    for entry in all_entries:
        clock_in_dt = parse_clock_in(entry)
        if clock_in_dt and year_start <= clock_in_dt < year_end:
            hours = entry.get("total_hours") or 0
            emp_rate = employee_rates.get(entry.get("employee_id"), default_rate)
            year_total += hours * emp_rate
    
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
        settings = {"pay_period_start_date": "2026-01-06", "default_hourly_rate": 15.00}
    
    if request.period_type == "biweekly":
        period_start, period_end = get_biweekly_period(
            settings["pay_period_start_date"], 
            request.period_index or 0
        )
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
        data["gross_wages"] = round(data["total_hours"] * emp_rate, 2)
        data["daily_totals"] = dict(sorted(data["daily_totals"].items()))
        for date in data["daily_totals"]:
            data["daily_totals"][date] = round(data["daily_totals"][date], 2)
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_wages = sum(e["gross_wages"] for e in employee_data.values())
    total_shifts = sum(e["total_shifts"] for e in employee_data.values())
    
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
        settings = {"pay_period_start_date": "2026-01-06", "default_hourly_rate": 15.00}
    
    if request.period_type == "biweekly":
        period_start, period_end = get_biweekly_period(
            settings["pay_period_start_date"], 
            request.period_index or 0
        )
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
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
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
        spaceAfter=10
    )
    
    elements.append(Paragraph("Thrifty Curator - Payroll Report", title_style))
    
    period_text = f"Period: {period_start.strftime('%B %d, %Y')} - {period_end.strftime('%B %d, %Y')}"
    elements.append(Paragraph(period_text, subtitle_style))
    elements.append(Paragraph(f"Default Hourly Rate: ${default_rate:.2f} (individual rates may vary)", subtitle_style))
    elements.append(Spacer(1, 20))
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_wages = sum(e["total_hours"] * e["hourly_rate"] for e in employee_data.values())
    total_shifts = sum(e["total_shifts"] for e in employee_data.values())
    
    summary_data = [
        ["Summary", ""],
        ["Total Employees", str(len(employee_data))],
        ["Total Hours", f"{total_hours:.2f}"],
        ["Total Shifts", str(total_shifts)],
        ["Total Wages", f"${total_wages:.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.97, 0.78, 0.86)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.Color(0.36, 0.25, 0.22)),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('SPAN', (0, 0), (1, 0)),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    if employee_data:
        elements.append(Paragraph("Employee Breakdown", styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        emp_table_data = [["Employee", "Hours", "Shifts", "Rate", "Gross Wages"]]
        
        for uid, data in employee_data.items():
            hours = round(data["total_hours"], 2)
            emp_rate = data["hourly_rate"]
            wages = round(hours * emp_rate, 2)
            emp_table_data.append([
                data["name"],
                f"{hours:.2f}",
                str(data["total_shifts"]),
                f"${emp_rate:.2f}",
                f"${wages:.2f}"
            ])
        
        emp_table = Table(emp_table_data, colWidths=[2.5*inch, 1*inch, 0.8*inch, 1*inch, 1.2*inch])
        emp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.77, 0.63, 0.40)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.98, 0.96, 0.95)]),
        ]))
        elements.append(emp_table)
        elements.append(Spacer(1, 30))
        
        elements.append(Paragraph("Shift Details", styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        for uid, data in employee_data.items():
            elements.append(Paragraph(f"{data['name']} (${data['hourly_rate']:.2f}/hr)", styles['Heading3']))
            
            shift_data = [["Date", "Clock In", "Clock Out", "Hours"]]
            for shift in sorted(data["shifts"], key=lambda x: x["clock_in"]):
                clock_in_dt = datetime.fromisoformat(shift["clock_in"].replace('Z', '+00:00'))
                clock_out_dt = datetime.fromisoformat(shift["clock_out"].replace('Z', '+00:00')) if shift["clock_out"] else None
                
                shift_data.append([
                    clock_in_dt.strftime("%m/%d/%Y"),
                    clock_in_dt.strftime("%I:%M %p"),
                    clock_out_dt.strftime("%I:%M %p") if clock_out_dt else "-",
                    f"{shift['hours']:.2f}"
                ])
            
            shift_table = Table(shift_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1*inch])
            shift_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(shift_table)
            elements.append(Spacer(1, 15))
    
    elements.append(Spacer(1, 20))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.grey)
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"payroll_report_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/report/email")
async def email_payroll_report(email_req: EmailPayrollRequest, admin: dict = Depends(get_admin_user)):
    """Email payroll report to specified recipient"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_123_placeholder':
        raise HTTPException(status_code=400, detail="Email service not configured. Please add a Resend API key.")
    
    report = email_req.report_data
    period = report.get("period", {})
    summary = report.get("summary", {})
    employees = report.get("employees", [])
    settings = report.get("settings", {})
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; color: #333; }}
            .header {{ background: linear-gradient(135deg, #C5A065 0%, #F8C8DC 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; }}
            .header h1 {{ color: white; margin: 0; }}
            .period {{ background: #f9f6f7; padding: 15px; border-radius: 8px; margin-bottom: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #C5A065; color: white; font-weight: 600; }}
            .amount {{ text-align: right; }}
            .total-row {{ background: #f9f6f7; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Thrifty Curator - Payroll Report</h1>
        </div>
        <div class="period">
            <p><strong>Period:</strong> {period.get('start_formatted', 'N/A')} - {period.get('end_formatted', 'N/A')}</p>
            <p><strong>Default Hourly Rate:</strong> ${settings.get('default_hourly_rate', 15.00):.2f}/hr</p>
        </div>
        <h3>Employee Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Rate</th>
                    <th>Hours</th>
                    <th>Shifts</th>
                    <th class="amount">Wages</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for emp in employees:
        rate_display = f"${emp.get('hourly_rate', 15.00):.2f}/hr"
        if emp.get('uses_custom_rate'):
            rate_display += " ★"
        html_content += f"""
                <tr>
                    <td>{emp.get('name', 'Unknown')}</td>
                    <td>{rate_display}</td>
                    <td>{emp.get('total_hours', 0):.2f}</td>
                    <td>{emp.get('total_shifts', 0)}</td>
                    <td class="amount">${emp.get('wages', 0):.2f}</td>
                </tr>
        """
    
    html_content += f"""
                <tr class="total-row">
                    <td colspan="2"><strong>TOTAL</strong></td>
                    <td><strong>{summary.get('total_hours', 0):.2f}</strong></td>
                    <td><strong>{summary.get('total_shifts', 0)}</strong></td>
                    <td class="amount"><strong>${summary.get('total_wages', 0):.2f}</strong></td>
                </tr>
            </tbody>
        </table>
        <p style="margin-top: 20px; color: #888; font-size: 12px;">
            ★ indicates employee with custom hourly rate
        </p>
        <p style="margin-top: 30px; color: #888; font-size: 12px;">
            This report was generated by Thrifty Curator Admin Dashboard.
        </p>
    </body>
    </html>
    """
    
    try:
        resend.emails.send({
            "from": SENDER_EMAIL,
            "to": email_req.recipient_email,
            "subject": f"Payroll Report: {period.get('start_formatted', '')} - {period.get('end_formatted', '')}",
            "html": html_content
        })
        return {"success": True, "message": f"Payroll report sent to {email_req.recipient_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


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
