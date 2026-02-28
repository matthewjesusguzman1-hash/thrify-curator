"""Reports generation routes for admin dashboard."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response, StreamingResponse
from typing import Optional
from datetime import datetime, timezone
import csv
import io
import calendar

from app.database import db
from app.dependencies import get_admin_user
from app.services.time_helpers import format_hours_hms, round_hours_to_minute

# Try to import fpdf2
try:
    from fpdf import FPDF
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False

router = APIRouter(prefix="/admin", tags=["Admin - Reports"])


# ==================== SHIFT REPORTS ====================

@router.get("/reports/shifts")
async def get_shift_report(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get shift report data for the given date range."""
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        end = end.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    payroll_settings = await db.payroll_settings.find_one({"id": "payroll_settings"}, {"_id": 0})
    default_rate = 15.00
    if payroll_settings:
        default_rate = payroll_settings.get("default_hourly_rate", 15.00)
    
    query = {"clock_in": {"$gte": start.isoformat(), "$lte": end.isoformat()}}
    if employee_id:
        query["user_id"] = employee_id
    
    entries = await db.time_entries.find(query, {"_id": 0}).sort("clock_in", 1).to_list(1000)
    
    employee_map = {}
    for entry in entries:
        if entry["user_id"] not in employee_map:
            emp = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0, "name": 1, "email": 1, "hourly_rate": 1})
            if emp:
                employee_map[entry["user_id"]] = emp
    
    report_data = []
    for entry in entries:
        emp = employee_map.get(entry["user_id"], {})
        emp_rate = emp.get("hourly_rate") if emp.get("hourly_rate") is not None else default_rate
        report_data.append({
            "employee_id": entry["user_id"],
            "employee_name": entry.get("user_name") or emp.get("name", "Unknown"),
            "clock_in": entry["clock_in"],
            "clock_out": entry.get("clock_out"),
            "total_hours": entry.get("total_hours", 0),
            "admin_note": entry.get("admin_note"),
            "adjusted_by_admin": entry.get("adjusted_by_admin", False),
            "hourly_rate": emp_rate
        })
    
    summary = {}
    for item in report_data:
        emp_id = item["employee_id"]
        if emp_id not in summary:
            summary[emp_id] = {
                "employee_name": item["employee_name"],
                "total_hours": 0,
                "rounded_hours": 0,
                "total_shifts": 0,
                "hourly_rate": item["hourly_rate"],
                "estimated_pay": 0
            }
        raw_hours = item["total_hours"] or 0
        summary[emp_id]["total_hours"] += raw_hours
        rounded_shift = round_hours_to_minute(raw_hours)
        summary[emp_id]["rounded_hours"] += rounded_shift
        summary[emp_id]["total_shifts"] += 1
        summary[emp_id]["estimated_pay"] += rounded_shift * item["hourly_rate"]
    
    for emp_id in summary:
        summary[emp_id]["estimated_pay"] = round(summary[emp_id]["estimated_pay"], 2)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "entries": report_data,
        "summary": list(summary.values()),
        "total_entries": len(report_data)
    }


@router.get("/reports/shifts/csv")
async def download_shift_report_csv(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download shift report as CSV."""
    report = await get_shift_report(start_date, end_date, employee_id, admin)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Employee Name", "Clock In", "Clock Out", "Hours", "Rate", "Est. Pay", "Admin Note", "Adjusted"
    ])
    
    for entry in report["entries"]:
        clock_in = entry["clock_in"][:16].replace("T", " ") if entry["clock_in"] else ""
        clock_out = entry["clock_out"][:16].replace("T", " ") if entry["clock_out"] else "Active"
        hours = entry["total_hours"] or 0
        hourly_rate = entry.get("hourly_rate", 15.00)
        rounded_hours = round_hours_to_minute(hours)
        est_pay = rounded_hours * hourly_rate
        writer.writerow([
            entry["employee_name"],
            clock_in,
            clock_out,
            format_hours_hms(hours),
            f"${hourly_rate:.2f}/hr",
            f"${est_pay:.2f}",
            entry["admin_note"] or "",
            "Yes" if entry["adjusted_by_admin"] else "No"
        ])
    
    writer.writerow([])
    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Employee", "Total Hours", "Total Shifts", "Rate", "Estimated Pay"])
    for s in report["summary"]:
        rounded_hours = round_hours_to_minute(s["total_hours"])
        pay = rounded_hours * s["hourly_rate"]
        writer.writerow([
            s["employee_name"],
            format_hours_hms(s['total_hours']),
            s["total_shifts"],
            f"${s['hourly_rate']:.2f}/hr",
            f"${pay:.2f}"
        ])
    
    output.seek(0)
    filename = f"shift_report_{start_date[:10]}_to_{end_date[:10]}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/shifts/pdf")
async def get_shift_report_pdf(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download shift report as PDF with branded styling."""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    report = await get_shift_report(start_date, end_date, employee_id, admin)
    
    HEADER_COLOR = (139, 92, 246)
    SECTION_COLOR = (139, 92, 246)
    GREEN = (34, 139, 34)
    GRAY_LABEL = (128, 128, 128)
    BLACK = (0, 0, 0)
    LIGHT_GRAY = (200, 200, 200)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.set_fill_color(*HEADER_COLOR)
    pdf.rect(0, 0, 210, 30, 'F')
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_y(8)
    pdf.cell(0, 8, "THRIFTY CURATOR", ln=True, align="L")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "Shift Report", ln=True, align="L")
    
    pdf.set_y(40)
    pdf.set_x(10)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "REPORT PERIOD", ln=True)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Date Range:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, f"{start_date[:10]} to {end_date[:10]}", ln=True)
    pdf.ln(8)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "SUMMARY", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    total_hours = 0
    total_pay = 0
    for s in report["summary"]:
        rounded_hours = round_hours_to_minute(s["total_hours"])
        pay = rounded_hours * s["hourly_rate"]
        total_hours += s["total_hours"]
        total_pay += pay
    
    pdf.set_font("Helvetica", "", 10)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Employees:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, str(len(report["summary"])), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Shifts:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, str(len(report["entries"])), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Hours:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, format_hours_hms(total_hours), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Estimated Pay:")
    pdf.set_text_color(*GREEN)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"${total_pay:.2f}", ln=True)
    pdf.ln(8)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "EMPLOYEE BREAKDOWN", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    for s in report["summary"]:
        rounded_hours = round_hours_to_minute(s["total_hours"])
        pay = rounded_hours * s["hourly_rate"]
        
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 6, s["employee_name"], ln=True)
        
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(40, 5, "    Hours:")
        pdf.set_text_color(*BLACK)
        pdf.cell(30, 5, format_hours_hms(s['total_hours']))
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(20, 5, "Shifts:")
        pdf.set_text_color(*BLACK)
        pdf.cell(20, 5, str(s["total_shifts"]))
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(20, 5, "Rate:")
        pdf.set_text_color(*BLACK)
        pdf.cell(25, 5, f"${s['hourly_rate']:.2f}/hr")
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(15, 5, "Pay:")
        pdf.set_text_color(*GREEN)
        pdf.cell(0, 5, f"${pay:.2f}", ln=True)
        pdf.ln(2)
    
    pdf.ln(5)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "SHIFT DETAILS", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    for entry in report["entries"]:
        clock_in = entry["clock_in"][5:16].replace("T", " ") if entry["clock_in"] else ""
        clock_out = entry["clock_out"][5:16].replace("T", " ") if entry["clock_out"] else "Active"
        admin_note = entry.get("admin_note") or ""
        hours = entry["total_hours"] or 0
        hourly_rate = entry.get("hourly_rate", 15.00)
        rounded_hours = round_hours_to_minute(hours)
        est_pay = rounded_hours * hourly_rate
        
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 5, entry["employee_name"], ln=True)
        
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(25, 4, "    In:")
        pdf.set_text_color(*BLACK)
        pdf.cell(35, 4, clock_in)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(15, 4, "Out:")
        pdf.set_text_color(*BLACK)
        pdf.cell(35, 4, clock_out)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(18, 4, "Hours:")
        pdf.set_text_color(*BLACK)
        pdf.cell(20, 4, format_hours_hms(hours))
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(12, 4, "Pay:")
        pdf.set_text_color(*GREEN)
        pdf.cell(0, 4, f"${est_pay:.2f}", ln=True)
        
        if admin_note:
            pdf.set_text_color(*GRAY_LABEL)
            pdf.set_font("Helvetica", "I", 8)
            pdf.cell(25, 4, "    Note:")
            pdf.set_text_color(*BLACK)
            pdf.multi_cell(0, 4, admin_note)
        
        pdf.ln(2)
    
    pdf.set_y(-20)
    pdf.set_text_color(150, 150, 150)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 10, f"Page 1 | Generated on {datetime.now().strftime('%B %d, %Y')}", align="C")
    
    pdf_output = pdf.output()
    filename = f"shift_report_{start_date[:10]}_to_{end_date[:10]}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== MILEAGE REPORTS ====================

IRS_RATES = {2024: 0.67, 2025: 0.70, 2026: 0.725}


@router.get("/mileage/report")
async def get_mileage_report(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get mileage report data for the given date range (monthly entries)."""
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    start_year, start_month = start.year, start.month
    end_year, end_month = end.year, end.month
    
    query = {"year": {"$gte": start_year, "$lte": end_year}}
    entries = await db.monthly_mileage.find(query, {"_id": 0}).sort([("year", 1), ("month", 1)]).to_list(100)
    
    filtered_entries = []
    for entry in entries:
        entry_year = entry.get("year")
        entry_month = entry.get("month")
        
        if entry_year == start_year and entry_year == end_year:
            if start_month <= entry_month <= end_month:
                filtered_entries.append(entry)
        elif entry_year == start_year:
            if entry_month >= start_month:
                filtered_entries.append(entry)
        elif entry_year == end_year:
            if entry_month <= end_month:
                filtered_entries.append(entry)
        elif start_year < entry_year < end_year:
            filtered_entries.append(entry)
    
    entries = filtered_entries
    
    total_miles = 0
    total_deduction = 0
    
    formatted_entries = []
    for entry in entries:
        year = entry.get("year", 2026)
        month = entry.get("month", 1)
        miles = entry.get("total_miles", 0)
        rate = IRS_RATES.get(year, 0.725)
        deduction = miles * rate
        
        total_miles += miles
        total_deduction += deduction
        
        formatted_entries.append({
            "user_id": entry.get("user_id"),
            "user_name": entry.get("user_name", "Admin"),
            "date": f"{year}-{month:02d}-01",
            "month_name": calendar.month_name[month],
            "year": year,
            "month": month,
            "total_miles": miles,
            "deduction": deduction,
            "notes": entry.get("notes"),
            "start_address": calendar.month_name[month],
            "end_address": str(year),
            "purpose": "Monthly Log"
        })
    
    employee_summary = {}
    for entry in formatted_entries:
        uid = entry.get("user_id", "admin")
        if uid not in employee_summary:
            employee_summary[uid] = {
                "user_id": uid,
                "user_name": entry.get("user_name", "Admin"),
                "total_miles": 0,
                "total_deduction": 0,
                "trip_count": 0
            }
        employee_summary[uid]["total_miles"] += entry.get("total_miles", 0)
        employee_summary[uid]["total_deduction"] += entry.get("deduction", 0)
        employee_summary[uid]["trip_count"] += 1
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "entries": formatted_entries,
        "employees": list(employee_summary.values()),
        "total_trips": len(formatted_entries),
        "total_miles": total_miles,
        "total_deduction": total_deduction
    }


@router.get("/mileage/report/csv")
async def download_mileage_report_csv(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download mileage report as CSV (monthly entries)."""
    report = await get_mileage_report(start_date, end_date, employee_id, admin)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Month", "Year", "Total Miles", "Tax Deduction", "Notes"])
    
    for entry in report["entries"]:
        writer.writerow([
            entry.get("month_name", ""),
            entry.get("year", ""),
            f"{entry.get('total_miles', 0):.1f}",
            f"${entry.get('deduction', 0):.2f}",
            entry.get("notes", "") or ""
        ])
    
    writer.writerow([])
    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Months Logged", "Total Miles", "Total Tax Deduction"])
    writer.writerow([
        report["total_trips"],
        f"{report['total_miles']:.1f}",
        f"${report['total_deduction']:.2f}"
    ])
    
    writer.writerow([])
    writer.writerow(["Note: Tax deductions calculated using IRS standard mileage rates"])
    writer.writerow(["2024: $0.67/mile, 2025: $0.70/mile, 2026: $0.725/mile"])
    
    output.seek(0)
    filename = f"mileage_log_{start_date[:10]}_to_{end_date[:10]}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/mileage/report/pdf")
async def download_mileage_report_pdf(
    start_date: str,
    end_date: str,
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download mileage report as PDF."""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    report = await get_mileage_report(start_date, end_date, employee_id, admin)
    
    HEADER_COLOR = (20, 184, 166)
    SECTION_COLOR = (13, 148, 136)
    GREEN = (34, 139, 34)
    GRAY_LABEL = (128, 128, 128)
    BLACK = (0, 0, 0)
    LIGHT_GRAY = (200, 200, 200)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.set_fill_color(*HEADER_COLOR)
    pdf.rect(0, 0, 210, 30, 'F')
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_y(8)
    pdf.cell(0, 8, "THRIFTY CURATOR", ln=True, align="L")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "Mileage Log Report", ln=True, align="L")
    
    pdf.set_y(40)
    pdf.set_x(10)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "REPORT PERIOD", ln=True)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Date Range:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, f"{start_date[:10]} to {end_date[:10]}", ln=True)
    pdf.ln(8)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "SUMMARY", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Months Logged:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, str(report['total_trips']), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Miles:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, f"{report['total_miles']:.1f} miles", ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Deduction:")
    pdf.set_text_color(*GREEN)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"${report['total_deduction']:.2f}", ln=True)
    pdf.ln(8)
    
    if report["employees"]:
        pdf.set_text_color(*SECTION_COLOR)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "BY EMPLOYEE", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)
        
        for emp in report["employees"]:
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 6, emp["user_name"], ln=True)
            
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*GRAY_LABEL)
            pdf.cell(25, 5, "    Miles:")
            pdf.set_text_color(*BLACK)
            pdf.cell(30, 5, f"{emp['total_miles']:.1f}")
            pdf.set_text_color(*GRAY_LABEL)
            pdf.cell(25, 5, "Trips:")
            pdf.set_text_color(*BLACK)
            pdf.cell(20, 5, str(emp["trip_count"]))
            pdf.set_text_color(*GRAY_LABEL)
            pdf.cell(30, 5, "Deduction:")
            pdf.set_text_color(*GREEN)
            pdf.cell(0, 5, f"${emp['total_deduction']:.2f}", ln=True)
            pdf.ln(2)
        
        pdf.ln(5)
    
    if report["entries"]:
        pdf.set_text_color(*SECTION_COLOR)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "MONTHLY ENTRIES", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)
        
        for entry in report["entries"]:
            month_name = entry.get("month_name", "")
            year = entry.get("year", "")
            miles = entry.get("total_miles", 0)
            deduction = entry.get("deduction", 0)
            notes = entry.get("notes", "") or ""
            
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, f"{month_name} {year}", ln=True)
            
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*GRAY_LABEL)
            pdf.cell(18, 4, "    Miles:")
            pdf.set_text_color(*BLACK)
            pdf.cell(25, 4, f"{miles:.1f}")
            pdf.set_text_color(*GRAY_LABEL)
            pdf.cell(25, 4, "Deduction:")
            pdf.set_text_color(*GREEN)
            pdf.cell(25, 4, f"${deduction:.2f}")
            if notes:
                pdf.set_text_color(*GRAY_LABEL)
                pdf.cell(15, 4, "Notes:")
                pdf.set_text_color(*BLACK)
                pdf.cell(0, 4, notes[:40], ln=True)
            else:
                pdf.ln()
            pdf.ln(2)
    
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 4, "Tax deductions calculated using IRS standard mileage rates:", ln=True)
    pdf.cell(0, 4, "2024: $0.67/mile | 2025: $0.70/mile | 2026: $0.725/mile", ln=True)
    
    pdf.set_y(-20)
    pdf.set_text_color(150, 150, 150)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 10, f"Page 1 | Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')}", align="C")
    
    pdf_output = pdf.output()
    filename = f"mileage_report_{start_date[:10]}_to_{end_date[:10]}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== W-9 REPORTS ====================

@router.get("/reports/w9")
async def get_w9_report(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get W-9 status report for all employees (including admins)."""
    query = {}
    if employee_id:
        query["id"] = employee_id
    
    users = await db.users.find(query, {"_id": 0}).to_list(500)
    w9_docs = await db.w9_documents.find({}, {"_id": 0, "content": 0}).to_list(1000)
    
    w9_by_employee = {}
    for doc in w9_docs:
        emp_id = doc.get("employee_id")
        if emp_id not in w9_by_employee:
            w9_by_employee[emp_id] = []
        w9_by_employee[emp_id].append(doc)
    
    employees = []
    summary = {"total_employees": 0, "approved": 0, "pending": 0, "not_submitted": 0}
    
    for user in users:
        user_id = user.get("id")
        user_w9s = w9_by_employee.get(user_id, [])
        
        if user_w9s:
            sorted_docs = sorted(user_w9s, key=lambda x: x.get("uploaded_at", ""), reverse=True)
            latest_status = sorted_docs[0].get("status", "submitted")
            last_updated = sorted_docs[0].get("uploaded_at")
        else:
            latest_status = "not_submitted"
            last_updated = None
        
        if latest_status == "approved":
            summary["approved"] += 1
        elif latest_status in ["submitted", "pending", "pending_review"]:
            summary["pending"] += 1
        else:
            summary["not_submitted"] += 1
        
        summary["total_employees"] += 1
        
        display_name = "Administrator" if user.get("role") == "admin" else user.get("name", "Unknown")
        
        employees.append({
            "id": user_id,
            "name": display_name,
            "email": user.get("email", ""),
            "role": user.get("role", "employee"),
            "start_date": user.get("start_date"),
            "w9_status": latest_status,
            "document_count": len(user_w9s),
            "last_updated": last_updated
        })
    
    employees.sort(key=lambda x: x.get("name", "").lower())
    
    return {
        "summary": summary,
        "employees": employees,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/reports/w9/csv")
async def get_w9_report_csv(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download W-9 status report as CSV."""
    report = await get_w9_report(employee_id, admin)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["W-9 Status Report", f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"])
    writer.writerow([])
    
    writer.writerow(["Summary"])
    writer.writerow(["Total Employees", report["summary"]["total_employees"]])
    writer.writerow(["Approved", report["summary"]["approved"]])
    writer.writerow(["Pending", report["summary"]["pending"]])
    writer.writerow(["Not Submitted", report["summary"]["not_submitted"]])
    writer.writerow([])
    
    writer.writerow(["Employee Name", "Email", "Role", "Start Date", "W-9 Status", "Document Count", "Last Updated"])
    for emp in report["employees"]:
        start_date = emp.get("start_date", "")
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date).strftime("%b %d, %Y")
            except (ValueError, TypeError):
                pass
        writer.writerow([
            emp["name"],
            emp["email"],
            emp["role"],
            start_date or "N/A",
            emp["w9_status"],
            emp["document_count"],
            emp.get("last_updated", "")[:10] if emp.get("last_updated") else "N/A"
        ])
    
    csv_content = output.getvalue()
    filename = f"w9_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content.encode('utf-8'),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/w9/pdf")
async def get_w9_report_pdf(
    employee_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Download W-9 status report as PDF."""
    if not HAS_FPDF:
        raise HTTPException(status_code=500, detail="PDF generation not available")
    
    report = await get_w9_report(employee_id, admin)
    
    HEADER_COLOR = (236, 72, 153)
    SECTION_COLOR = (219, 39, 119)
    GREEN = (34, 139, 34)
    ORANGE = (245, 158, 11)
    RED = (220, 38, 38)
    GRAY_LABEL = (128, 128, 128)
    BLACK = (0, 0, 0)
    LIGHT_GRAY = (200, 200, 200)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.set_fill_color(*HEADER_COLOR)
    pdf.rect(0, 0, 210, 30, 'F')
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_y(8)
    pdf.cell(0, 8, "THRIFTY CURATOR", ln=True, align="L")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, "W-9 Status Report", ln=True, align="L")
    
    pdf.set_y(40)
    pdf.set_x(10)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "REPORT DATE", ln=True)
    pdf.set_draw_color(*LIGHT_GRAY)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Generated:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p'), ln=True)
    pdf.ln(8)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "SUMMARY", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    summary = report["summary"]
    pdf.set_font("Helvetica", "", 10)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Total Employees:")
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 6, str(summary['total_employees']), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Approved:")
    pdf.set_text_color(*GREEN)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, str(summary['approved']), ln=True)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Pending:")
    pdf.set_text_color(*ORANGE)
    pdf.cell(0, 6, str(summary['pending']), ln=True)
    
    pdf.set_text_color(*GRAY_LABEL)
    pdf.cell(50, 6, "Not Submitted:")
    pdf.set_text_color(*RED)
    pdf.cell(0, 6, str(summary['not_submitted']), ln=True)
    pdf.ln(8)
    
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "EMPLOYEE STATUS", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    
    for emp in report["employees"]:
        status = emp["w9_status"]
        if status == "approved":
            status_color = GREEN
            display_status = "Approved"
        elif status in ["submitted", "pending", "pending_review"]:
            status_color = ORANGE
            display_status = "Pending"
        else:
            status_color = RED
            display_status = "Not Submitted"
        
        start_date = emp.get("start_date", "")
        if start_date:
            try:
                start_date = datetime.fromisoformat(start_date).strftime("%b %d, %Y")
            except (ValueError, TypeError):
                start_date = "N/A"
        else:
            start_date = "N/A"
        
        last_updated = emp.get("last_updated", "")[:10] if emp.get("last_updated") else "N/A"
        
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 6, emp["name"], ln=True)
        
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(30, 5, "    Role:")
        pdf.set_text_color(*BLACK)
        pdf.cell(40, 5, emp["role"])
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(30, 5, "Start Date:")
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 5, start_date, ln=True)
        
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(30, 5, "    Status:")
        pdf.set_text_color(*status_color)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(40, 5, display_status)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(30, 5, "Documents:")
        pdf.set_text_color(*BLACK)
        pdf.cell(20, 5, str(emp["document_count"]))
        pdf.set_text_color(*GRAY_LABEL)
        pdf.cell(25, 5, "Updated:")
        pdf.set_text_color(*BLACK)
        pdf.cell(0, 5, last_updated, ln=True)
        pdf.ln(4)
    
    pdf.set_y(-20)
    pdf.set_text_color(150, 150, 150)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 10, f"Page 1 | Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')}", align="C")
    
    pdf_output = pdf.output()
    filename = f"w9_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
