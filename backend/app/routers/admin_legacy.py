"""
Admin router - imports and combines all admin-related sub-routers.

This file has been refactored from a monolithic router into smaller, focused modules:
- admin_employees.py: Employee CRUD operations
- admin_time_entries.py: Time entry management
- admin_w9.py: W-9 document management
- admin_reports.py: Report generation (shifts, mileage, W-9)
- monthly_mileage.py: Monthly mileage logging

The legacy endpoint for PDF generation with ReportRequest is retained here for backward compatibility.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import db
from app.dependencies import get_admin_user
from app.models.payroll import ReportRequest

# Import time helpers
from app.services.time_helpers import format_hours_hms, round_hours_to_minute, round_to_nearest_minute

# Try to import fpdf2
try:
    from fpdf import FPDF
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False

router = APIRouter(prefix="/admin", tags=["Admin"])


# Legacy PDF endpoint that uses POST with ReportRequest body
@router.post("/reports/pdf")
async def download_shift_report_pdf(report_req: ReportRequest, admin: dict = Depends(get_admin_user)):
    """Download shift report as PDF (legacy endpoint using POST body)"""
    try:
        start = datetime.fromisoformat(report_req.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(report_req.end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    query = {
        "clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "total_hours": {"$ne": None}
    }
    
    if report_req.employee_id:
        query["user_id"] = report_req.employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(1000)
    
    employee_data = {}
    for entry in entries:
        uid = entry["user_id"]
        if uid not in employee_data:
            employee_data[uid] = {
                "user_id": uid,
                "name": entry["user_name"],
                "total_hours": 0,
                "shifts": [],
                "shift_count": 0
            }
        employee_data[uid]["total_hours"] += entry.get("total_hours", 0)
        employee_data[uid]["shift_count"] += 1
        employee_data[uid]["shifts"].append({
            "clock_in": entry["clock_in"],
            "clock_out": entry["clock_out"],
            "hours": entry.get("total_hours", 0)
        })
    
    total_hours = sum(e["total_hours"] for e in employee_data.values())
    total_shifts = sum(e["shift_count"] for e in employee_data.values())
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Thrifty Curator - Shift Report", ln=True, align="C")
    pdf.ln(5)
    
    # Period
    pdf.set_font("Helvetica", "", 12)
    start_str = start.strftime("%b %d, %Y")
    end_str = end.strftime("%b %d, %Y")
    pdf.cell(0, 10, f"Period: {start_str} - {end_str}", ln=True)
    pdf.ln(5)
    
    # Summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Total Hours: {total_hours:.2f}", ln=True)
    pdf.cell(0, 6, f"Total Shifts: {total_shifts}", ln=True)
    pdf.cell(0, 6, f"Employees: {len(employee_data)}", ln=True)
    pdf.ln(8)
    
    # Employee breakdown table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Employee Breakdown", ln=True)
    pdf.ln(3)
    
    # Table header
    pdf.set_fill_color(200, 200, 200)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Employee", border=1, fill=True)
    pdf.cell(40, 8, "Hours", border=1, fill=True, align="C")
    pdf.cell(40, 8, "Shifts", border=1, fill=True, align="C")
    pdf.ln()
    
    # Table rows
    pdf.set_font("Helvetica", "", 10)
    for emp in employee_data.values():
        pdf.cell(80, 8, emp["name"][:30], border=1)
        pdf.cell(40, 8, f"{emp['total_hours']:.2f} hrs", border=1, align="C")
        pdf.cell(40, 8, str(emp["shift_count"]), border=1, align="C")
        pdf.ln()
    
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, f"Generated on {datetime.now().strftime('%b %d, %Y at %I:%M %p')}", ln=True)
    
    # Return PDF
    pdf_bytes = pdf.output()
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=shift_report_{start.strftime('%Y%m%d')}_{end.strftime('%Y%m%d')}.pdf"}
    )
