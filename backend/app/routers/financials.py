from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
import uuid
import base64
import csv
import io
import os
import json

load_dotenv()

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from app.database import db
from app.models.financials import (
    IncomeEntry, Income1099, COGSEntry, ExpenseEntry, MileageEntry,
    TaxDocument, TaxPrepProgress, FinancialSummary, ExpenseSummaryByCategory,
    CreateIncomeRequest, CreateCOGSRequest, CreateExpenseRequest, CreateMileageRequest,
    ExpenseCategory, Platform
)

router = APIRouter(prefix="/financials", tags=["financials"])

# IRS mileage rate for 2025
IRS_MILEAGE_RATE_2025 = 0.70  # $0.70 per mile for 2025

def get_irs_mileage_rate(year: int) -> float:
    rates = {
        2024: 0.67,
        2025: 0.70,
        2026: 0.70,  # Placeholder
    }
    return rates.get(year, 0.70)

# ============== INCOME ENDPOINTS ==============

@router.get("/income/{year}")
async def get_income(year: int):
    """Get all income entries for a year"""
    entries = await db.income_entries.find(
        {"year": year},
        {"_id": 0}
    ).to_list(length=None)
    
    total_1099 = sum(e["amount"] for e in entries if e.get("is_1099"))
    total_other = sum(e["amount"] for e in entries if not e.get("is_1099"))
    
    return {
        "entries": entries,
        "total_1099": total_1099,
        "total_other": total_other,
        "total": total_1099 + total_other
    }

@router.post("/income")
async def create_income(request: CreateIncomeRequest):
    """Create a new income entry"""
    entry = IncomeEntry(
        id=str(uuid.uuid4()),
        year=request.year,
        platform=request.platform,
        amount=request.amount,
        is_1099=request.is_1099,
        date_received=request.date_received,
        notes=request.notes,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.income_entries.insert_one(entry.model_dump())
    return {"message": "Income entry created", "entry": entry.model_dump()}

@router.put("/income/{entry_id}")
async def update_income(entry_id: str, request: CreateIncomeRequest):
    """Update an income entry"""
    update_data = request.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.income_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")
    
    return {"message": "Income entry updated"}

@router.delete("/income/{entry_id}")
async def delete_income(entry_id: str):
    """Delete an income entry"""
    result = await db.income_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")
    
    return {"message": "Income entry deleted"}

# ============== TAX PREP 1099 ENDPOINTS (Separate from Financials) ==============

@router.get("/tax-prep/1099/{year}")
async def get_tax_prep_1099s(year: int):
    """Get all 1099 entries for Tax Prep - stored separately from Financials income"""
    entries = await db.tax_prep_1099_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    total = sum(e["amount"] for e in entries)
    return {
        "entries": entries,
        "total": total,
        "year": year
    }

@router.post("/tax-prep/1099")
async def create_tax_prep_1099(request: CreateIncomeRequest):
    """Create a new 1099 entry for Tax Prep - stored separately from Financials"""
    entry = {
        "id": str(uuid.uuid4()),
        "year": request.year,
        "platform": request.platform,
        "amount": request.amount,
        "date_received": request.date_received,
        "notes": request.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_prep_1099_entries.insert_one(entry)
    entry_copy = {k: v for k, v in entry.items() if k != '_id'}
    return {"message": "1099 entry created", "entry": entry_copy}

@router.delete("/tax-prep/1099/{entry_id}")
async def delete_tax_prep_1099(entry_id: str):
    """Delete a 1099 entry from Tax Prep"""
    result = await db.tax_prep_1099_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    return {"message": "1099 entry deleted"}

# ============== TAX PREP OTHER INCOME ENDPOINTS (Separate from Financials) ==============

@router.get("/tax-prep/other-income/{year}")
async def get_tax_prep_other_income(year: int):
    """Get all other income entries for Tax Prep - stored separately from Financials"""
    entries = await db.tax_prep_other_income.find({"year": year}, {"_id": 0}).to_list(length=None)
    total = sum(e["amount"] for e in entries)
    return {
        "entries": entries,
        "total": total,
        "year": year
    }

@router.post("/tax-prep/other-income")
async def create_tax_prep_other_income(request: CreateIncomeRequest):
    """Create other income entry for Tax Prep - stored separately from Financials"""
    entry = {
        "id": str(uuid.uuid4()),
        "year": request.year,
        "platform": request.platform,
        "amount": request.amount,
        "notes": request.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_prep_other_income.insert_one(entry)
    entry_copy = {k: v for k, v in entry.items() if k != '_id'}
    return {"message": "Other income entry created", "entry": entry_copy}

@router.delete("/tax-prep/other-income/{entry_id}")
async def delete_tax_prep_other_income(entry_id: str):
    """Delete an other income entry from Tax Prep"""
    result = await db.tax_prep_other_income.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Other income entry not found")
    
    return {"message": "Other income entry deleted"}

@router.delete("/tax-prep/reset/{year}")
async def reset_tax_prep_year(year: int):
    """Reset all tax prep data for a specific year"""
    deleted_counts = {
        "1099s": 0,
        "other_income": 0
    }
    
    # Delete Tax Prep 1099 entries (separate collection)
    result = await db.tax_prep_1099_entries.delete_many({"year": year})
    deleted_counts["1099s"] = result.deleted_count
    
    # Delete Tax Prep other income entries (separate collection)
    result = await db.tax_prep_other_income.delete_many({"year": year})
    deleted_counts["other_income"] = result.deleted_count
    
    total_deleted = sum(deleted_counts.values())
    
    return {
        "message": f"Tax prep data for {year} has been reset",
        "year": year,
        "deleted_counts": deleted_counts,
        "total_deleted": total_deleted
    }

@router.get("/tax-prep/summary/{year}")
async def get_tax_prep_summary(year: int):
    """Get Tax Prep summary - combines 1099s/other income with COGS/expenses/mileage from Financials"""
    # Get Tax Prep income (from separate collections)
    income_1099 = await db.tax_prep_1099_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    income_other = await db.tax_prep_other_income.find({"year": year}, {"_id": 0}).to_list(length=None)
    
    total_1099 = sum(e["amount"] for e in income_1099)
    total_other = sum(e["amount"] for e in income_other)
    total_income = total_1099 + total_other
    
    # Get COGS, expenses, mileage from Financials (shared data)
    cogs_entries = await db.cogs_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    expense_entries = await db.expense_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    mileage_entries = await db.mileage_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    
    total_cogs = sum(e["amount"] for e in cogs_entries)
    total_expenses = sum(e["amount"] for e in expense_entries)
    total_miles = sum(e["miles"] for e in mileage_entries)
    mileage_rate = get_irs_mileage_rate(year)
    mileage_deduction = total_miles * mileage_rate
    
    total_deductions = total_cogs + total_expenses + mileage_deduction
    net_profit = total_income - total_deductions
    
    return {
        "year": year,
        "income": {
            "from_1099": round(total_1099, 2),
            "other": round(total_other, 2),
            "total": round(total_income, 2),
            "entries_1099": income_1099,
            "entries_other": income_other
        },
        "cogs": round(total_cogs, 2),
        "expenses": round(total_expenses, 2),
        "mileage": {
            "total_miles": round(total_miles, 2),
            "rate": mileage_rate,
            "deduction": round(mileage_deduction, 2)
        },
        "total_deductions": round(total_deductions, 2),
        "net_profit": round(net_profit, 2)
    }

# ============== COGS ENDPOINTS ==============

@router.get("/cogs/{year}")
async def get_cogs(year: int):
    """Get all COGS entries for a year"""
    entries = await db.cogs_entries.find(
        {"year": year},
        {"_id": 0}
    ).sort("date", -1).to_list(length=None)
    
    total = sum(e["amount"] for e in entries)
    
    return {
        "entries": entries,
        "total": total
    }

@router.post("/cogs")
async def create_cogs(request: CreateCOGSRequest):
    """Create a new COGS entry"""
    entry = COGSEntry(
        id=str(uuid.uuid4()),
        year=request.year,
        date=request.date,
        source=request.source,
        description=request.description,
        amount=request.amount,
        item_count=request.item_count,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.cogs_entries.insert_one(entry.model_dump())
    return {"message": "COGS entry created", "entry": entry.model_dump()}

@router.put("/cogs/{entry_id}")
async def update_cogs(entry_id: str, request: CreateCOGSRequest):
    """Update a COGS entry"""
    update_data = request.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cogs_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="COGS entry not found")
    
    return {"message": "COGS entry updated"}

@router.delete("/cogs/{entry_id}")
async def delete_cogs(entry_id: str):
    """Delete a COGS entry"""
    result = await db.cogs_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="COGS entry not found")
    
    return {"message": "COGS entry deleted"}

# ============== EXPENSE ENDPOINTS ==============

@router.get("/expenses/{year}")
async def get_expenses(year: int):
    """Get all expense entries for a year"""
    entries = await db.expense_entries.find(
        {"year": year},
        {"_id": 0}
    ).sort("date", -1).to_list(length=None)
    
    # Group by category
    by_category = {}
    for entry in entries:
        cat = entry["category"]
        if cat not in by_category:
            by_category[cat] = {"total": 0, "count": 0, "entries": []}
        by_category[cat]["total"] += entry["amount"]
        by_category[cat]["count"] += 1
        by_category[cat]["entries"].append(entry)
    
    total = sum(e["amount"] for e in entries)
    
    return {
        "entries": entries,
        "by_category": by_category,
        "total": total,
        "count": len(entries)
    }

@router.get("/expenses/{year}/summary")
async def get_expenses_summary(year: int):
    """Get expense summary by category"""
    entries = await db.expense_entries.find(
        {"year": year},
        {"_id": 0}
    ).to_list(length=None)
    
    by_category = {}
    for entry in entries:
        cat = entry["category"]
        if cat not in by_category:
            by_category[cat] = {"total": 0, "count": 0}
        by_category[cat]["total"] += entry["amount"]
        by_category[cat]["count"] += 1
    
    # Include all categories, even empty ones
    all_categories = [e.value for e in ExpenseCategory]
    summary = []
    for cat in all_categories:
        data = by_category.get(cat, {"total": 0, "count": 0})
        summary.append({
            "category": cat,
            "total": data["total"],
            "count": data["count"]
        })
    
    return {
        "summary": summary,
        "total": sum(e["amount"] for e in entries)
    }

@router.post("/expenses")
async def create_expense(request: CreateExpenseRequest):
    """Create a new expense entry"""
    entry = ExpenseEntry(
        id=str(uuid.uuid4()),
        year=request.year,
        category=request.category,
        amount=request.amount,
        date=request.date,
        description=request.description,
        receipt_url=request.receipt_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.expense_entries.insert_one(entry.model_dump())
    return {"message": "Expense entry created", "entry": entry.model_dump()}

@router.put("/expenses/{entry_id}")
async def update_expense(entry_id: str, request: CreateExpenseRequest):
    """Update an expense entry"""
    update_data = request.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.expense_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    return {"message": "Expense entry updated"}

@router.delete("/expenses/{entry_id}")
async def delete_expense(entry_id: str):
    """Delete an expense entry"""
    result = await db.expense_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    return {"message": "Expense entry deleted"}

# ============== MILEAGE ENDPOINTS ==============

@router.get("/mileage/{year}")
async def get_mileage(year: int):
    """Get all mileage entries for a year"""
    entries = await db.mileage_entries.find(
        {"year": year},
        {"_id": 0}
    ).sort("date", -1).to_list(length=None)
    
    total_miles = sum(e["miles"] for e in entries)
    irs_rate = get_irs_mileage_rate(year)
    deduction = total_miles * irs_rate
    
    return {
        "entries": entries,
        "total_miles": total_miles,
        "irs_rate": irs_rate,
        "deduction": round(deduction, 2)
    }

@router.post("/mileage")
async def create_mileage(request: CreateMileageRequest):
    """Create a new mileage entry"""
    entry = MileageEntry(
        id=str(uuid.uuid4()),
        year=request.year,
        date=request.date,
        miles=request.miles,
        purpose=request.purpose,
        start_location=request.start_location,
        end_location=request.end_location,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.mileage_entries.insert_one(entry.model_dump())
    return {"message": "Mileage entry created", "entry": entry.model_dump()}

@router.delete("/mileage/{entry_id}")
async def delete_mileage(entry_id: str):
    """Delete a mileage entry"""
    result = await db.mileage_entries.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mileage entry not found")
    
    return {"message": "Mileage entry deleted"}

# ============== TAX DOCUMENT ENDPOINTS ==============

@router.post("/documents/upload")
async def upload_tax_document(
    file: UploadFile = File(...),
    year: int = Form(...),
    document_type: str = Form(...),
    category: str = Form(None),
    notes: str = Form(None)
):
    """Upload a tax document (receipt, 1099, etc.)"""
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, PNG, and HEIC files are allowed")
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    doc = TaxDocument(
        id=str(uuid.uuid4()),
        year=year,
        document_type=document_type,
        filename=file.filename,
        content_type=file.content_type,
        content=base64.b64encode(content).decode('utf-8'),
        category=category,
        notes=notes,
        uploaded_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.tax_documents.insert_one(doc.model_dump())
    
    return {
        "message": "Document uploaded",
        "id": doc.id,
        "filename": doc.filename
    }

@router.get("/documents/{year}")
async def get_tax_documents(year: int, document_type: Optional[str] = None):
    """Get tax documents for a year"""
    query = {"year": year}
    if document_type:
        query["document_type"] = document_type
    
    # Don't return the actual content in list view
    docs = await db.tax_documents.find(
        query,
        {"_id": 0, "content": 0}
    ).to_list(length=None)
    
    return {"documents": docs}

@router.get("/documents/download/{doc_id}")
async def download_tax_document(doc_id: str):
    """Download a specific tax document"""
    doc = await db.tax_documents.find_one({"id": doc_id}, {"_id": 0})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return doc

@router.delete("/documents/{doc_id}")
async def delete_tax_document(doc_id: str):
    """Delete a tax document"""
    result = await db.tax_documents.delete_one({"id": doc_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted"}

# ============== TAX PREP PROGRESS ==============

@router.get("/tax-prep/progress/{year}")
async def get_tax_prep_progress(year: int):
    """Get tax prep progress for a year"""
    progress = await db.tax_prep_progress.find_one({"year": year}, {"_id": 0})
    
    if not progress:
        progress = TaxPrepProgress(year=year).model_dump()
    
    # Calculate completion percentage
    steps_complete = sum([
        progress.get("step1_complete", False),
        progress.get("step2_complete", False),
        progress.get("step3_complete", False),
        progress.get("step4_complete", False),
        progress.get("step5_complete", False)
    ])
    progress["completion_percentage"] = int((steps_complete / 5) * 100)
    
    return progress

@router.put("/tax-prep/progress/{year}")
async def update_tax_prep_progress(year: int, step: int, complete: bool):
    """Update tax prep progress for a specific step"""
    step_field = f"step{step}_complete"
    
    await db.tax_prep_progress.update_one(
        {"year": year},
        {
            "$set": {
                step_field: complete,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {"year": year}
        },
        upsert=True
    )
    
    return {"message": f"Step {step} updated"}

# ============== FINANCIAL SUMMARY ==============

@router.get("/summary/{year}")
async def get_financial_summary(year: int):
    """Get complete financial summary for a year"""
    # Get income - separate gross revenue from profit entries
    income_entries = await db.income_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    
    # Filter out profit entries for gross sales calculation
    # Also filter out 1099 entries (those are for Tax Prep only, not year-round financials)
    gross_revenue_entries = [e for e in income_entries if e.get("platform") != "profit"]
    profit_entries = [e for e in income_entries if e.get("platform") == "profit"]
    
    # For Financials section: only include scanned/imported data, not manual 1099s
    # Scanned entries have "Scanned" in notes
    scanned_revenue_entries = [e for e in gross_revenue_entries 
                               if e.get("notes") and "Scanned" in e.get("notes", "")]
    scanned_profit_entries = [e for e in profit_entries
                              if e.get("notes") and "Scanned" in e.get("notes", "")]
    
    gross_sales = sum(e["amount"] for e in scanned_revenue_entries)
    recorded_profit = sum(e["amount"] for e in scanned_profit_entries)
    
    # 1099 totals are for Tax Prep reference only
    income_1099 = sum(e["amount"] for e in gross_revenue_entries if e.get("is_1099"))
    income_other = sum(e["amount"] for e in gross_revenue_entries if not e.get("is_1099") and not (e.get("notes") and "Scanned" in e.get("notes", "")))
    
    # Get COGS
    cogs_entries = await db.cogs_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    total_cogs = sum(e["amount"] for e in cogs_entries)
    
    # Get expenses
    expense_entries = await db.expense_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    total_expenses = sum(e["amount"] for e in expense_entries)
    
    # Get mileage
    mileage_entries = await db.mileage_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    total_miles = sum(e["miles"] for e in mileage_entries)
    irs_rate = get_irs_mileage_rate(year)
    mileage_deduction = round(total_miles * irs_rate, 2)
    
    # Calculate totals
    gross_profit = gross_sales - total_cogs
    total_deductions = total_expenses + mileage_deduction
    
    # Use recorded profit if available, otherwise calculate
    if recorded_profit > 0:
        net_profit = recorded_profit
    else:
        net_profit = gross_profit - total_deductions
    
    return {
        "year": year,
        "income": {
            "total": gross_sales,
            "from_1099": income_1099,
            "other": income_other,
            "recorded_profit": recorded_profit
        },
        "cogs": total_cogs,
        "gross_profit": gross_profit,
        "deductions": {
            "expenses": total_expenses,
            "mileage": mileage_deduction,
            "mileage_miles": total_miles,
            "mileage_rate": irs_rate,
            "total": total_deductions
        },
        "net_profit": round(net_profit, 2)
    }

@router.get("/comparison/{year}")
async def get_year_comparison(year: int):
    """Get comparison data between current year and previous year, including YTD"""
    from datetime import datetime
    
    current_year = year
    previous_year = year - 1
    current_month = datetime.now().month
    # Use previous month for YTD comparison (compare completed months only)
    ytd_through_month = current_month - 1 if current_month > 1 else 12
    
    # Month names for display
    month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    ytd_label = f"Jan-{month_names[ytd_through_month]}"
    
    async def get_year_data(y, ytd_only=False, through_month=None):
        income = await db.income_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        cogs = await db.cogs_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        expenses = await db.expense_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        mileage = await db.mileage_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        
        # Filter for YTD if requested (through specified month)
        if ytd_only and through_month:
            def is_in_range(entry, date_field):
                date_str = entry.get(date_field)
                if date_str:
                    try:
                        entry_month = datetime.fromisoformat(date_str.replace('Z', '+00:00')).month
                        return entry_month <= through_month
                    except Exception:
                        return True
                return True
            
            income = [e for e in income if is_in_range(e, 'date_received')]
            cogs = [e for e in cogs if is_in_range(e, 'date')]
            expenses = [e for e in expenses if is_in_range(e, 'date')]
            mileage = [e for e in mileage if is_in_range(e, 'date')]
        
        # Separate gross revenue from profit entries
        # Only include scanned data (entries with "Scanned" in notes) - NOT manual 1099s from Tax Prep
        gross_revenue_entries = [e for e in income 
                                 if e.get("platform") != "profit" 
                                 and e.get("notes") and "Scanned" in e.get("notes", "")]
        profit_entries = [e for e in income 
                         if e.get("platform") == "profit"
                         and e.get("notes") and "Scanned" in e.get("notes", "")]
        
        gross_sales = sum(e["amount"] for e in gross_revenue_entries)
        recorded_profit = sum(e["amount"] for e in profit_entries)
        total_cogs = sum(e["amount"] for e in cogs)
        total_expenses = sum(e["amount"] for e in expenses)
        total_miles = sum(e["miles"] for e in mileage)
        mileage_deduction = total_miles * get_irs_mileage_rate(y)
        
        # Use recorded profit if available
        if recorded_profit > 0:
            profit = recorded_profit
        else:
            profit = gross_sales - total_cogs - total_expenses - mileage_deduction
        
        return {
            "gross_sales": round(gross_sales, 2),
            "profit": round(profit, 2),
            "recorded_profit": round(recorded_profit, 2)
        }
    
    # Get full year data
    current = await get_year_data(current_year)
    previous_full = await get_year_data(previous_year)
    
    # Get YTD data for same-period comparison (through last completed month)
    previous_ytd = await get_year_data(previous_year, ytd_only=True, through_month=ytd_through_month)
    
    return {
        "current_year": current_year,
        "previous_year": previous_year,
        "current_month": current_month,
        "ytd_through_month": ytd_through_month,
        "ytd_label": ytd_label,
        "current": current,
        "previous": previous_full,
        "previous_ytd": previous_ytd
    }

# ============== MONTHLY DATA FOR GRAPHS ==============

@router.get("/monthly/{year}")
async def get_monthly_data(year: int):
    """Get monthly breakdown for graphs - only includes scanned data, not Tax Prep 1099s"""
    income_entries = await db.income_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    cogs_entries = await db.cogs_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    expense_entries = await db.expense_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    
    # Filter income to only include scanned data (not manual 1099s from Tax Prep)
    scanned_income = [e for e in income_entries 
                      if e.get("notes") and "Scanned" in e.get("notes", "")]
    
    # Initialize monthly data
    months = {i: {"gross_sales": 0, "cogs": 0, "expenses": 0, "profit": 0} for i in range(1, 13)}
    
    # Process income by month (use date_received if available)
    for entry in scanned_income:
        if entry.get("platform") == "profit":
            continue  # Skip profit entries for gross sales
        if entry.get("date_received"):
            try:
                month = int(entry["date_received"].split("-")[1])
                months[month]["gross_sales"] += entry["amount"]
            except (ValueError, IndexError):
                pass
    
    # Process profit entries separately
    for entry in scanned_income:
        if entry.get("platform") == "profit" and entry.get("date_received"):
            try:
                month = int(entry["date_received"].split("-")[1])
                months[month]["profit"] = entry["amount"]  # Use recorded profit
            except (ValueError, IndexError):
                pass
    
    # Process COGS by month
    for entry in cogs_entries:
        try:
            month = int(entry["date"].split("-")[1])
            months[month]["cogs"] += entry["amount"]
        except (ValueError, IndexError):
            pass
    
    # Process expenses by month
    for entry in expense_entries:
        try:
            month = int(entry["date"].split("-")[1])
            months[month]["expenses"] += entry["amount"]
        except (ValueError, IndexError):
            pass
    
    # Calculate profit per month if not already set from scanned data
    for m in months:
        if months[m]["profit"] == 0 and months[m]["gross_sales"] > 0:
            months[m]["profit"] = months[m]["gross_sales"] - months[m]["cogs"] - months[m]["expenses"]
    
    # Convert to list format for charts
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_list = [
        {
            "month": month_names[i-1],
            "month_num": i,
            **months[i]
        }
        for i in range(1, 13)
    ]
    
    return {"monthly": monthly_list, "year": year}

# ============== VENDOO CSV IMPORT ==============

# Mapping of Vendoo platform names to our Platform enum
VENDOO_PLATFORM_MAP = {
    "ebay": "ebay",
    "poshmark": "poshmark",
    "mercari": "mercari",
    "depop": "depop",
    "etsy": "etsy",
    "facebook marketplace": "fb_marketplace",
    "fb marketplace": "fb_marketplace",
    "facebook": "fb_marketplace",
    "amazon": "amazon",
    "whatnot": "whatnot",
    "in-person": "in_person",
    "in person": "in_person",
    "local": "in_person",
    "offerup": "other",
    "tradesy": "other",
    "grailed": "other",
    "kidizen": "other",
    "curtsy": "other",
    "vestiaire": "other",
    "shopify": "other",
}

def parse_currency(value: str) -> float:
    """Parse currency string to float, handling various formats"""
    if not value or value.strip() == "":
        return 0.0
    # Remove currency symbols, commas, and spaces
    cleaned = value.replace("$", "").replace(",", "").replace(" ", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def parse_date(value: str) -> Optional[str]:
    """Parse date string to ISO format"""
    if not value or value.strip() == "":
        return None
    
    # Try common date formats
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%b %d, %Y",
        "%B %d, %Y",
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(value.strip(), fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def normalize_header(header: str) -> str:
    """Normalize column header for matching"""
    return header.lower().strip().replace(" ", "_").replace("-", "_")

@router.post("/vendoo/import")
async def import_vendoo_csv(
    file: UploadFile = File(...),
    year: int = Form(...),
    month: str = Form("all"),
    import_income: bool = Form(True),
    import_cogs: bool = Form(False),
    import_fees_as_expense: bool = Form(False)
):
    """
    Import sales data from Vendoo CSV export.
    
    Args:
        file: CSV file from Vendoo export
        year: Tax year to import data for
        month: Month to filter ('all' for entire year, or '01'-'12' for specific month)
    
    Vendoo CSV exports are customizable, but commonly include:
    - Title, SKU, Category
    - Platform Sold (marketplace name)
    - Sold Date
    - Price Sold / Sale Price / Revenue
    - Cost of Goods (COG) / COGS
    - Marketplace Fees
    - Shipping Fees
    - Profit
    
    This endpoint parses the CSV and creates:
    - Income entries (grouped by platform, monthly totals)
    - Optionally: COGS entries
    - Optionally: Fee expenses
    """
    
    # Build the date filter
    if month == "all":
        date_prefix = f"{year}-"
    else:
        date_prefix = f"{year}-{month}"
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Read file content
        content = await file.read()
        decoded = content.decode('utf-8-sig')  # Handle BOM if present
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(decoded))
        
        # Normalize headers
        if reader.fieldnames:
            header_map = {normalize_header(h): h for h in reader.fieldnames}
        else:
            raise HTTPException(status_code=400, detail="CSV file has no headers")
        
        # Find relevant columns
        def find_column(possible_names: List[str]) -> Optional[str]:
            for name in possible_names:
                normalized = normalize_header(name)
                if normalized in header_map:
                    return header_map[normalized]
            return None
        
        platform_col = find_column(["sold_platform", "platform_sold", "platform", "marketplace", "sold_on"])
        date_col = find_column(["sold_date", "date_sold", "sale_date", "date"])
        price_col = find_column(["price_sold", "sale_price", "revenue", "sold_price", "price"])
        cogs_col = find_column(["cost_of_goods", "cog", "cogs", "cost", "purchase_price"])
        fees_col = find_column(["marketplace_fees", "fees", "platform_fees", "selling_fees"])
        shipping_col = find_column(["shipping_fees", "shipping_cost", "shipping"])
        title_col = find_column(["title", "item_name", "name", "description"])
        
        if not price_col:
            raise HTTPException(
                status_code=400, 
                detail="CSV must have a price/revenue column (e.g., 'Price Sold', 'Revenue', 'Sale Price')"
            )
        
        # Process rows
        sales_by_platform_month = {}  # { "ebay_2025-01": { total: 0, count: 0 } }
        cogs_entries = []
        fee_total = 0.0
        
        rows_processed = 0
        rows_skipped = 0
        
        for row in reader:
            # Get sale price
            price = parse_currency(row.get(price_col, ""))
            if price <= 0:
                rows_skipped += 1
                continue
            
            # Get date and check if it matches our filter
            date_str = row.get(date_col, "") if date_col else None
            parsed_date = parse_date(date_str) if date_str else None
            
            if parsed_date:
                # Check if date matches our filter (year and optionally month)
                if not parsed_date.startswith(date_prefix):
                    rows_skipped += 1
                    continue
                sale_month = parsed_date[:7]  # YYYY-MM
            else:
                # If no date, skip (we need a date to filter properly)
                rows_skipped += 1
                continue
            
            # Get platform
            platform_name = row.get(platform_col, "other").lower().strip() if platform_col else "other"
            platform = VENDOO_PLATFORM_MAP.get(platform_name, "other")
            
            # Aggregate by platform and month
            key = f"{platform}_{sale_month}"
            if key not in sales_by_platform_month:
                sales_by_platform_month[key] = {"total": 0, "count": 0, "platform": platform, "month": sale_month}
            sales_by_platform_month[key]["total"] += price
            sales_by_platform_month[key]["count"] += 1
            
            # Track COGS if requested
            if import_cogs and cogs_col:
                cogs = parse_currency(row.get(cogs_col, ""))
                if cogs > 0:
                    cogs_entries.append({
                        "date": parsed_date or f"{year}-01-01",
                        "source": "Vendoo Import",
                        "description": row.get(title_col, "Imported item") if title_col else "Imported item",
                        "amount": cogs
                    })
            
            # Track fees if requested
            if import_fees_as_expense and fees_col:
                fee_total += parse_currency(row.get(fees_col, ""))
            if import_fees_as_expense and shipping_col:
                fee_total += parse_currency(row.get(shipping_col, ""))
            
            rows_processed += 1
        
        if rows_processed == 0:
            month_name = ""
            if month != "all":
                month_names = ["", "January", "February", "March", "April", "May", "June", 
                              "July", "August", "September", "October", "November", "December"]
                month_name = f" {month_names[int(month)]}"
            raise HTTPException(
                status_code=400, 
                detail=f"No valid sales found for{month_name} {year}. Check that your CSV has 'Sold Date' data for this period."
            )
        
        # Create income entries (one per platform per month)
        income_created = 0
        if import_income:
            for key, data in sales_by_platform_month.items():
                entry = IncomeEntry(
                    id=str(uuid.uuid4()),
                    year=year,
                    platform=data["platform"],
                    amount=round(data["total"], 2),
                    is_1099=False,  # Vendoo imports are raw sales, not 1099
                    date_received=f"{data['month']}-01",
                    notes=f"Vendoo import: {data['count']} sales",
                    created_at=datetime.now(timezone.utc).isoformat(),
                    updated_at=datetime.now(timezone.utc).isoformat()
                )
                await db.income_entries.insert_one(entry.model_dump())
                income_created += 1
        
        # Create COGS entries (batch them by source)
        cogs_created = 0
        if import_cogs and cogs_entries:
            # Group by month to avoid too many entries
            cogs_by_month = {}
            for entry in cogs_entries:
                month = entry["date"][:7]
                if month not in cogs_by_month:
                    cogs_by_month[month] = {"total": 0, "count": 0}
                cogs_by_month[month]["total"] += entry["amount"]
                cogs_by_month[month]["count"] += 1
            
            for month, data in cogs_by_month.items():
                cogs_entry = COGSEntry(
                    id=str(uuid.uuid4()),
                    year=year,
                    date=f"{month}-01",
                    source="Vendoo Import",
                    description=f"{data['count']} items",
                    amount=round(data["total"], 2),
                    item_count=data["count"],
                    created_at=datetime.now(timezone.utc).isoformat(),
                    updated_at=datetime.now(timezone.utc).isoformat()
                )
                await db.cogs_entries.insert_one(cogs_entry.model_dump())
                cogs_created += 1
        
        # Create fee expense if requested
        fees_created = 0
        if import_fees_as_expense and fee_total > 0:
            expense_entry = ExpenseEntry(
                id=str(uuid.uuid4()),
                year=year,
                category="bank_payment_fees",
                amount=round(fee_total, 2),
                date=f"{year}-12-31",
                description="Vendoo import - marketplace & shipping fees",
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat()
            )
            await db.expense_entries.insert_one(expense_entry.model_dump())
            fees_created = 1
        
        return {
            "success": True,
            "message": f"Successfully imported {rows_processed} sales",
            "details": {
                "rows_processed": rows_processed,
                "rows_skipped": rows_skipped,
                "income_entries_created": income_created,
                "cogs_entries_created": cogs_created,
                "fee_expenses_created": fees_created,
                "total_sales": round(sum(d["total"] for d in sales_by_platform_month.values()), 2)
            }
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode CSV file. Ensure it's UTF-8 encoded.")
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.get("/vendoo/template")
async def get_vendoo_template():
    """Return expected Vendoo CSV format information"""
    return {
        "description": "Vendoo CSV Export Format",
        "instructions": [
            "1. In Vendoo, go to Inventory and click the multi-action button",
            "2. Select 'Export to CSV'",
            "3. Choose your date range (filter by sold date)",
            "4. Select these columns: Platform Sold, Sold Date, Price Sold, Cost of Goods (optional)",
            "5. Download and upload the CSV here"
        ],
        "required_columns": ["Price Sold (or Revenue, Sale Price)"],
        "optional_columns": [
            "Platform Sold - to categorize by marketplace",
            "Sold Date - to filter by year",
            "Cost of Goods - to import COGS",
            "Marketplace Fees - to import as expenses",
            "Shipping Fees - to import as expenses"
        ],
        "supported_platforms": list(VENDOO_PLATFORM_MAP.keys())
    }


# ============== 1099-NEC GENERATION ==============

# Business info for 1099 forms - should be configurable in settings
PAYER_INFO = {
    "name": "Thrifty Curator LLC",
    "address": "123 Main Street",
    "city_state_zip": "Your City, ST 12345",
    "phone": "(555) 123-4567",
    "tin": "XX-XXXXXXX",  # Will need to be configured
    "tin_type": "EIN"  # EIN or SSN
}

@router.get("/1099/eligible/{year}")
async def get_1099_eligible_recipients(year: int):
    """
    Get list of consignors/contractors who received $600+ in payouts for the year.
    These are the recipients who need 1099-NEC forms.
    """
    # Get all consignment payments for the year
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    
    # Aggregate payments by recipient
    pipeline = [
        {
            "$match": {
                "payment_type": "consignment",
                "check_date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": "$consignment_client_email",
                "total_paid": {"$sum": "$amount"},
                "payment_count": {"$sum": 1},
                "payments": {"$push": {
                    "date": "$check_date",
                    "amount": "$amount",
                    "description": "$description"
                }}
            }
        },
        {
            "$match": {
                "total_paid": {"$gte": 600}  # Only those who received $600+
            }
        },
        {
            "$sort": {"total_paid": -1}
        }
    ]
    
    results = await db.payroll_check_records.aggregate(pipeline).to_list(1000)
    
    # Enrich with consignor details from consignment_agreements
    eligible = []
    for result in results:
        email = result["_id"]
        
        # Get consignor details
        consignor = await db.consignment_agreements.find_one(
            {"email": email.lower()},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "address": 1}
        )
        
        if consignor:
            eligible.append({
                "email": email,
                "name": consignor.get("full_name", "Unknown"),
                "address": consignor.get("address", ""),
                "phone": consignor.get("phone", ""),
                "total_paid": round(result["total_paid"], 2),
                "payment_count": result["payment_count"],
                "needs_tin": True,  # Will need to collect W-9 info
                "tin": None,  # To be filled from W-9
                "status": "pending"  # pending, tin_collected, form_generated
            })
    
    # Also calculate totals below threshold (for reference)
    below_threshold_pipeline = [
        {
            "$match": {
                "payment_type": "consignment",
                "check_date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": "$consignment_client_email",
                "total_paid": {"$sum": "$amount"}
            }
        },
        {
            "$match": {
                "total_paid": {"$lt": 600, "$gt": 0}
            }
        }
    ]
    
    below_results = await db.payroll_check_records.aggregate(below_threshold_pipeline).to_list(1000)
    
    return {
        "year": year,
        "threshold": 600,
        "eligible_count": len(eligible),
        "eligible_recipients": eligible,
        "below_threshold_count": len(below_results),
        "total_to_report": round(sum(r["total_paid"] for r in eligible), 2)
    }


@router.post("/1099/update-tin")
async def update_recipient_tin(
    email: str = Form(...),
    tin: str = Form(...),
    tin_type: str = Form("SSN")  # SSN or EIN
):
    """
    Store TIN (Tax ID Number) for a recipient.
    This would typically come from their W-9 form.
    """
    # Store in a separate collection for tax info
    await db.tax_recipient_info.update_one(
        {"email": email.lower()},
        {
            "$set": {
                "email": email.lower(),
                "tin": tin,  # Should be encrypted in production
                "tin_type": tin_type,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "TIN updated successfully", "email": email}


# ============== MANUAL 1099-NEC RECIPIENTS ==============

class Manual1099Recipient(BaseModel):
    year: int
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    tin: Optional[str] = None  # SSN or EIN
    tin_type: Optional[str] = "SSN"  # SSN or EIN
    amount_paid: float
    description: Optional[str] = None

@router.get("/1099/manual/{year}")
async def get_manual_1099_recipients(year: int):
    """Get all manually entered 1099-NEC recipients for a year"""
    recipients = await db.manual_1099_recipients.find(
        {"year": year},
        {"_id": 0}
    ).to_list(length=None)
    
    return {
        "year": year,
        "recipients": recipients,
        "count": len(recipients),
        "total_amount": round(sum(r.get("amount_paid", 0) for r in recipients), 2)
    }

@router.post("/1099/manual")
async def add_manual_1099_recipient(recipient: Manual1099Recipient):
    """Add a manual 1099-NEC recipient"""
    recipient_id = str(uuid.uuid4())
    
    doc = {
        "id": recipient_id,
        "year": recipient.year,
        "name": recipient.name,
        "address": recipient.address,
        "city": recipient.city,
        "state": recipient.state,
        "zip_code": recipient.zip_code,
        "tin": recipient.tin,
        "tin_type": recipient.tin_type,
        "amount_paid": recipient.amount_paid,
        "description": recipient.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.manual_1099_recipients.insert_one(doc)
    
    return {"message": "1099-NEC recipient added", "id": recipient_id, "recipient": {k: v for k, v in doc.items() if k != '_id'}}

@router.put("/1099/manual/{recipient_id}")
async def update_manual_1099_recipient(recipient_id: str, recipient: Manual1099Recipient):
    """Update a manual 1099-NEC recipient"""
    update_doc = {
        "name": recipient.name,
        "address": recipient.address,
        "city": recipient.city,
        "state": recipient.state,
        "zip_code": recipient.zip_code,
        "tin": recipient.tin,
        "tin_type": recipient.tin_type,
        "amount_paid": recipient.amount_paid,
        "description": recipient.description,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.manual_1099_recipients.update_one(
        {"id": recipient_id},
        {"$set": update_doc}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    return {"message": "1099-NEC recipient updated", "id": recipient_id}

@router.delete("/1099/manual/{recipient_id}")
async def delete_manual_1099_recipient(recipient_id: str):
    """Delete a manual 1099-NEC recipient"""
    result = await db.manual_1099_recipients.delete_one({"id": recipient_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    return {"message": "1099-NEC recipient deleted"}

@router.get("/1099/manual/{year}/{recipient_id}/download")
async def download_manual_1099_pdf(year: int, recipient_id: str):
    """Generate and download 1099-NEC PDF for a manually entered recipient"""
    recipient = await db.manual_1099_recipients.find_one(
        {"id": recipient_id, "year": year},
        {"_id": 0}
    )
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Payer info (your business)
    payer = {
        "name": "Thrifty Curator LLC",
        "address": "Your Business Address",
        "city_state_zip": "City, State ZIP",
        "tin": "XX-XXXXXXX"
    }
    
    # Generate PDF
    buffer = io.BytesIO()
    generate_1099_nec_pdf(
        buffer=buffer,
        year=year,
        payer=payer,
        recipient={
            "name": recipient.get("name", ""),
            "address": recipient.get("address", ""),
            "city_state_zip": f"{recipient.get('city', '')}, {recipient.get('state', '')} {recipient.get('zip_code', '')}",
            "tin": recipient.get("tin", "")
        },
        amount=recipient.get("amount_paid", 0)
    )
    
    buffer.seek(0)
    filename = f"1099-NEC_{year}_{recipient.get('name', 'recipient').replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== TAX RETURN DOCUMENTS ==============

@router.post("/tax-returns/{year}/upload")
async def upload_tax_return(year: int, file: UploadFile = File(...), description: str = Form(None)):
    """Upload a completed tax return document"""
    import os
    
    # Validate file type
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and image files are allowed")
    
    # Create uploads directory if it doesn't exist
    upload_dir = f"/app/uploads/tax-returns/{year}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    doc_id = str(uuid.uuid4())
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"{doc_id}.{file_ext}"
    filepath = f"{upload_dir}/{filename}"
    
    # Save file
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    # Store metadata in database
    doc = {
        "id": doc_id,
        "year": year,
        "original_filename": file.filename,
        "stored_filename": filename,
        "filepath": filepath,
        "content_type": file.content_type,
        "size": len(content),
        "description": description or f"Tax Return {year}",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_return_documents.insert_one(doc)
    
    return {
        "message": "Tax return uploaded successfully",
        "document": {k: v for k, v in doc.items() if k != '_id'}
    }

@router.get("/tax-returns/{year}")
async def get_tax_returns(year: int):
    """Get all uploaded tax return documents for a year"""
    documents = await db.tax_return_documents.find(
        {"year": year},
        {"_id": 0}
    ).to_list(length=None)
    
    return {
        "year": year,
        "documents": documents,
        "count": len(documents)
    }

@router.get("/tax-returns/{year}/{doc_id}/download")
async def download_tax_return(year: int, doc_id: str):
    """Download a tax return document"""
    doc = await db.tax_return_documents.find_one(
        {"id": doc_id, "year": year},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    import os
    if not os.path.exists(doc["filepath"]):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    def file_iterator():
        with open(doc["filepath"], 'rb') as f:
            yield from f
    
    return StreamingResponse(
        file_iterator(),
        media_type=doc.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"attachment; filename={doc['original_filename']}"}
    )

@router.delete("/tax-returns/{year}/{doc_id}")
async def delete_tax_return(year: int, doc_id: str):
    """Delete a tax return document"""
    import os
    
    doc = await db.tax_return_documents.find_one(
        {"id": doc_id, "year": year},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from filesystem
    if os.path.exists(doc["filepath"]):
        os.remove(doc["filepath"])
    
    # Delete from database
    await db.tax_return_documents.delete_one({"id": doc_id})
    
    return {"message": "Tax return document deleted"}


def generate_1099_nec_pdf(
    buffer: io.BytesIO,
    year: int,
    payer: dict,
    recipient: dict,
    amount: float
):
    """
    Generate a 1099-NEC form PDF.
    
    Note: This is a simplified representation for record-keeping purposes.
    Official IRS filing requires specific forms from IRS or approved software.
    """
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 0.75*inch, "1099-NEC Nonemployee Compensation")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height - 1*inch, f"Tax Year {year}")
    c.drawCentredString(width/2, height - 1.2*inch, "COPY B - For Recipient's Records")
    
    # Draw boxes
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    
    # Payer box (left side)
    payer_box_y = height - 3.5*inch
    c.rect(0.5*inch, payer_box_y, 3.5*inch, 2*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, payer_box_y + 1.8*inch, "PAYER'S name, street address, city or town, state or province,")
    c.drawString(0.6*inch, payer_box_y + 1.65*inch, "country, ZIP or foreign postal code, and telephone no.")
    c.setFont("Helvetica", 10)
    c.drawString(0.6*inch, payer_box_y + 1.4*inch, payer.get("name", ""))
    c.drawString(0.6*inch, payer_box_y + 1.2*inch, payer.get("address", ""))
    c.drawString(0.6*inch, payer_box_y + 1.0*inch, payer.get("city_state_zip", ""))
    c.drawString(0.6*inch, payer_box_y + 0.8*inch, payer.get("phone", ""))
    
    # Payer TIN box
    c.rect(0.5*inch, payer_box_y - 0.6*inch, 3.5*inch, 0.5*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, payer_box_y - 0.2*inch, "PAYER'S TIN")
    c.setFont("Helvetica", 10)
    c.drawString(0.6*inch, payer_box_y - 0.45*inch, payer.get("tin", "XX-XXXXXXX"))
    
    # Recipient TIN box (right side top)
    c.rect(4.25*inch, payer_box_y + 1.4*inch, 3.5*inch, 0.5*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 1.75*inch, "RECIPIENT'S TIN")
    c.setFont("Helvetica", 10)
    c.drawString(4.35*inch, payer_box_y + 1.55*inch, recipient.get("tin", "XXX-XX-XXXX"))
    
    # Recipient box
    c.rect(4.25*inch, payer_box_y - 0.6*inch, 3.5*inch, 1.9*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 1.1*inch, "RECIPIENT'S name")
    c.setFont("Helvetica", 10)
    c.drawString(4.35*inch, payer_box_y + 0.9*inch, recipient.get("name", ""))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 0.6*inch, "Street address (including apt. no.)")
    c.setFont("Helvetica", 10)
    address_lines = recipient.get("address", "").split("\n")
    y_offset = 0.4*inch
    for line in address_lines[:2]:
        c.drawString(4.35*inch, payer_box_y + y_offset, line)
        y_offset -= 0.2*inch
    
    # Amount box - Box 1 Nonemployee compensation
    amount_box_y = payer_box_y - 1.5*inch
    c.rect(0.5*inch, amount_box_y, 2.5*inch, 0.75*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, amount_box_y + 0.55*inch, "1  Nonemployee compensation")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(0.6*inch, amount_box_y + 0.2*inch, f"$ {amount:,.2f}")
    
    # Other boxes (2-7) - empty for this use case
    box_width = 1.25*inch
    for i, label in enumerate(["2 (Reserved)", "3 (Reserved)", "4 Federal income tax withheld"]):
        x = 3.25*inch + (i * box_width)
        c.rect(x, amount_box_y, box_width, 0.75*inch)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x + 0.05*inch, amount_box_y + 0.55*inch, label)
        c.setFont("Helvetica", 10)
        c.drawString(x + 0.1*inch, amount_box_y + 0.2*inch, "$ 0.00")
    
    # Footer notice
    c.setFont("Helvetica", 8)
    footer_y = 2*inch
    c.drawString(0.5*inch, footer_y + 0.4*inch, "This is important tax information and is being furnished to the IRS. If you are required to file a return,")
    c.drawString(0.5*inch, footer_y + 0.2*inch, "a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS")
    c.drawString(0.5*inch, footer_y, "determines that it has not been reported.")
    
    # Account number (optional)
    c.rect(0.5*inch, footer_y - 0.6*inch, 3*inch, 0.4*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, footer_y - 0.35*inch, "Account number (see instructions)")
    c.setFont("Helvetica", 9)
    c.drawString(0.6*inch, footer_y - 0.52*inch, recipient.get("email", ""))
    
    # Disclaimer
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(0.5*inch, 0.75*inch, "This document is for record-keeping purposes. Official IRS forms must be filed using approved software or IRS forms.")
    c.drawString(0.5*inch, 0.55*inch, f"Generated by Thrifty Curator on {datetime.now().strftime('%B %d, %Y')}")
    
    c.save()


@router.get("/1099/generate/{year}/{email}")
async def generate_1099_for_recipient(year: int, email: str):
    """
    Generate a 1099-NEC PDF for a specific recipient.
    """
    # Get recipient info
    consignor = await db.consignment_agreements.find_one(
        {"email": email.lower()},
        {"_id": 0, "full_name": 1, "email": 1, "address": 1}
    )
    
    if not consignor:
        raise HTTPException(status_code=404, detail="Consignor not found")
    
    # Get their total payments for the year
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    
    pipeline = [
        {
            "$match": {
                "payment_type": "consignment",
                "consignment_client_email": email.lower(),
                "check_date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_paid": {"$sum": "$amount"}
            }
        }
    ]
    
    result = await db.payroll_check_records.aggregate(pipeline).to_list(1)
    
    if not result or result[0]["total_paid"] < 600:
        raise HTTPException(
            status_code=400, 
            detail=f"Recipient has less than $600 in payments for {year}. 1099 not required."
        )
    
    total_amount = result[0]["total_paid"]
    
    # Get TIN if available
    tax_info = await db.tax_recipient_info.find_one(
        {"email": email.lower()},
        {"_id": 0, "tin": 1, "tin_type": 1}
    )
    
    recipient = {
        "name": consignor.get("full_name", ""),
        "address": consignor.get("address", ""),
        "email": email,
        "tin": tax_info.get("tin", "XXX-XX-XXXX") if tax_info else "XXX-XX-XXXX"
    }
    
    # Generate PDF
    buffer = io.BytesIO()
    generate_1099_nec_pdf(buffer, year, PAYER_INFO, recipient, total_amount)
    buffer.seek(0)
    
    # Log the generation
    await db.tax_1099_generated.insert_one({
        "year": year,
        "recipient_email": email.lower(),
        "recipient_name": consignor.get("full_name", ""),
        "amount": total_amount,
        "generated_at": datetime.now(timezone.utc).isoformat()
    })
    
    filename = f"1099-NEC_{year}_{consignor.get('full_name', 'recipient').replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/1099/batch/{year}")
async def generate_batch_1099s(year: int):
    """
    Generate a single PDF containing all 1099-NEC forms for the year.
    """
    # Get all eligible recipients
    eligible_data = await get_1099_eligible_recipients(year)
    
    if eligible_data["eligible_count"] == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"No recipients with $600+ payments found for {year}"
        )
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Cover page
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 2*inch, f"1099-NEC Forms - Tax Year {year}")
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height - 2.5*inch, PAYER_INFO["name"])
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, height - 3*inch, f"Total Recipients: {eligible_data['eligible_count']}")
    c.drawCentredString(width/2, height - 3.3*inch, f"Total Amount: ${eligible_data['total_to_report']:,.2f}")
    
    c.setFont("Helvetica", 10)
    y_pos = height - 4.5*inch
    c.drawString(1*inch, y_pos, "Recipients:")
    y_pos -= 0.3*inch
    
    for recipient in eligible_data["eligible_recipients"][:20]:  # Show first 20
        c.drawString(1.2*inch, y_pos, f"• {recipient['name']}: ${recipient['total_paid']:,.2f}")
        y_pos -= 0.25*inch
        if y_pos < 2*inch:
            break
    
    if eligible_data["eligible_count"] > 20:
        c.drawString(1.2*inch, y_pos, f"... and {eligible_data['eligible_count'] - 20} more")
    
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(width/2, 1*inch, f"Generated by Thrifty Curator on {datetime.now().strftime('%B %d, %Y')}")
    c.showPage()
    
    # Generate individual forms
    for recipient_data in eligible_data["eligible_recipients"]:
        email = recipient_data["email"]
        
        # Get TIN if available
        tax_info = await db.tax_recipient_info.find_one(
            {"email": email.lower()},
            {"_id": 0, "tin": 1}
        )
        
        recipient = {
            "name": recipient_data["name"],
            "address": recipient_data.get("address", ""),
            "email": email,
            "tin": tax_info.get("tin", "XXX-XX-XXXX") if tax_info else "XXX-XX-XXXX"
        }
        
        # Draw the form on current page
        generate_1099_page(c, year, PAYER_INFO, recipient, recipient_data["total_paid"])
        c.showPage()
    
    c.save()
    buffer.seek(0)
    
    filename = f"1099-NEC_Batch_{year}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def generate_1099_page(c: canvas.Canvas, year: int, payer: dict, recipient: dict, amount: float):
    """Generate a single 1099-NEC page on the canvas."""
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 0.75*inch, "1099-NEC Nonemployee Compensation")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height - 1*inch, f"Tax Year {year}")
    c.drawCentredString(width/2, height - 1.2*inch, "COPY B - For Recipient's Records")
    
    # Draw boxes
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    
    # Payer box
    payer_box_y = height - 3.5*inch
    c.rect(0.5*inch, payer_box_y, 3.5*inch, 2*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, payer_box_y + 1.8*inch, "PAYER'S name, street address, city, state, ZIP, phone")
    c.setFont("Helvetica", 10)
    c.drawString(0.6*inch, payer_box_y + 1.4*inch, payer.get("name", ""))
    c.drawString(0.6*inch, payer_box_y + 1.2*inch, payer.get("address", ""))
    c.drawString(0.6*inch, payer_box_y + 1.0*inch, payer.get("city_state_zip", ""))
    c.drawString(0.6*inch, payer_box_y + 0.8*inch, payer.get("phone", ""))
    
    # Payer TIN
    c.rect(0.5*inch, payer_box_y - 0.6*inch, 3.5*inch, 0.5*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, payer_box_y - 0.2*inch, "PAYER'S TIN")
    c.setFont("Helvetica", 10)
    c.drawString(0.6*inch, payer_box_y - 0.45*inch, payer.get("tin", "XX-XXXXXXX"))
    
    # Recipient TIN
    c.rect(4.25*inch, payer_box_y + 1.4*inch, 3.5*inch, 0.5*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 1.75*inch, "RECIPIENT'S TIN")
    c.setFont("Helvetica", 10)
    c.drawString(4.35*inch, payer_box_y + 1.55*inch, recipient.get("tin", "XXX-XX-XXXX"))
    
    # Recipient box
    c.rect(4.25*inch, payer_box_y - 0.6*inch, 3.5*inch, 1.9*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 1.1*inch, "RECIPIENT'S name")
    c.setFont("Helvetica", 10)
    c.drawString(4.35*inch, payer_box_y + 0.9*inch, recipient.get("name", ""))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(4.35*inch, payer_box_y + 0.6*inch, "Street address")
    c.setFont("Helvetica", 9)
    address = recipient.get("address", "")
    if len(address) > 40:
        c.drawString(4.35*inch, payer_box_y + 0.4*inch, address[:40])
        c.drawString(4.35*inch, payer_box_y + 0.2*inch, address[40:80])
    else:
        c.drawString(4.35*inch, payer_box_y + 0.4*inch, address)
    
    # Amount box
    amount_box_y = payer_box_y - 1.5*inch
    c.rect(0.5*inch, amount_box_y, 2.5*inch, 0.75*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, amount_box_y + 0.55*inch, "1  Nonemployee compensation")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(0.6*inch, amount_box_y + 0.2*inch, f"$ {amount:,.2f}")
    
    # Account number
    c.rect(0.5*inch, amount_box_y - 0.6*inch, 3*inch, 0.4*inch)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.6*inch, amount_box_y - 0.35*inch, "Account number")
    c.setFont("Helvetica", 9)
    c.drawString(0.6*inch, amount_box_y - 0.52*inch, recipient.get("email", ""))
    
    # Footer
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(0.5*inch, 0.75*inch, "This document is for record-keeping purposes. Official IRS forms must be filed using approved software.")
    c.drawString(0.5*inch, 0.55*inch, f"Generated by Thrifty Curator on {datetime.now().strftime('%B %d, %Y')}")


@router.get("/tax-summary/{year}/download")
async def download_tax_summary(year: int, format: str = "pdf"):
    """
    Download a complete tax summary for the year.
    Includes income, COGS, deductions, and net profit calculations.
    """
    # Get financial summary
    summary = await get_financial_summary(year)
    
    if format == "csv":
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([f"Thrifty Curator Tax Summary - {year}"])
        writer.writerow([])
        writer.writerow(["Category", "Amount"])
        writer.writerow(["Gross Income (Total Sales)", f"${summary['income']['total']:,.2f}"])
        writer.writerow(["  - From 1099s", f"${summary['income']['from_1099']:,.2f}"])
        writer.writerow(["  - Other Income", f"${summary['income']['other']:,.2f}"])
        writer.writerow([])
        writer.writerow(["Cost of Goods Sold (COGS)", f"${summary['cogs']:,.2f}"])
        writer.writerow([])
        writer.writerow(["GROSS PROFIT", f"${summary['gross_profit']:,.2f}"])
        writer.writerow([])
        writer.writerow(["Deductions:"])
        writer.writerow(["  - Business Expenses", f"${summary['deductions']['expenses']:,.2f}"])
        writer.writerow(["  - Mileage Deduction", f"${summary['deductions']['mileage']:,.2f}"])
        writer.writerow([f"    ({summary['deductions']['mileage_miles']:.1f} miles @ ${summary['deductions']['mileage_rate']}/mile)"])
        writer.writerow(["Total Deductions", f"${summary['deductions']['total']:,.2f}"])
        writer.writerow([])
        writer.writerow(["NET PROFIT (Schedule C)", f"${summary['net_profit']:,.2f}"])
        writer.writerow([])
        writer.writerow([f"Generated on {datetime.now().strftime('%B %d, %Y')}"])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=tax_summary_{year}.csv"}
        )
    
    else:  # PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(width/2, height - 1*inch, f"Tax Summary - {year}")
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 1.3*inch, PAYER_INFO["name"])
        
        # Summary table
        y_pos = height - 2*inch
        
        def draw_row(label, value, bold=False, indent=0):
            nonlocal y_pos
            if bold:
                c.setFont("Helvetica-Bold", 11)
            else:
                c.setFont("Helvetica", 11)
            c.drawString(1*inch + indent, y_pos, label)
            c.drawRightString(width - 1*inch, y_pos, value)
            y_pos -= 0.3*inch
        
        def draw_line():
            nonlocal y_pos
            c.setStrokeColor(colors.gray)
            c.line(1*inch, y_pos + 0.15*inch, width - 1*inch, y_pos + 0.15*inch)
            y_pos -= 0.1*inch
        
        # Income section
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, y_pos, "INCOME")
        y_pos -= 0.4*inch
        
        draw_row("Gross Sales", f"${summary['income']['total']:,.2f}", bold=True)
        draw_row("From 1099s", f"${summary['income']['from_1099']:,.2f}", indent=0.3*inch)
        draw_row("Other Income", f"${summary['income']['other']:,.2f}", indent=0.3*inch)
        
        y_pos -= 0.2*inch
        draw_line()
        
        # COGS
        draw_row("Cost of Goods Sold", f"(${summary['cogs']:,.2f})")
        
        draw_line()
        draw_row("GROSS PROFIT", f"${summary['gross_profit']:,.2f}", bold=True)
        
        y_pos -= 0.3*inch
        
        # Deductions
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, y_pos, "DEDUCTIONS")
        y_pos -= 0.4*inch
        
        draw_row("Business Expenses", f"${summary['deductions']['expenses']:,.2f}")
        draw_row("Mileage Deduction", f"${summary['deductions']['mileage']:,.2f}")
        c.setFont("Helvetica", 9)
        c.drawString(1.3*inch, y_pos + 0.15*inch, f"({summary['deductions']['mileage_miles']:.1f} miles @ ${summary['deductions']['mileage_rate']}/mile)")
        y_pos -= 0.15*inch
        
        draw_line()
        draw_row("Total Deductions", f"(${summary['deductions']['total']:,.2f})", bold=True)
        
        y_pos -= 0.3*inch
        draw_line()
        c.setLineWidth(2)
        draw_line()
        
        # Net profit
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(colors.darkgreen if summary['net_profit'] >= 0 else colors.red)
        c.drawString(1*inch, y_pos, "NET PROFIT (Schedule C)")
        c.drawRightString(width - 1*inch, y_pos, f"${summary['net_profit']:,.2f}")
        c.setFillColor(colors.black)
        
        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.drawCentredString(width/2, 1*inch, f"Generated by Thrifty Curator on {datetime.now().strftime('%B %d, %Y')}")
        c.drawCentredString(width/2, 0.75*inch, "This summary is for reference. Consult a tax professional for official filings.")
        
        c.save()
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=tax_summary_{year}.pdf"}
        )


# ============== SCREENSHOT IMPORT (AI-POWERED) ==============

@router.post("/screenshot/analyze")
async def analyze_screenshot(
    file: UploadFile = File(...)
):
    """
    Analyze a screenshot from Vendoo or other platform and extract financial data.
    Uses AI vision to read the numbers from the image.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    # Validate file type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file (PNG, JPG, etc.)")
    
    # Read and encode the image
    image_data = await file.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Get API key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"screenshot-{uuid.uuid4()}",
            system_message="""You are a financial data extraction assistant. 
            Extract sales and financial data from screenshots of selling platforms like Vendoo, eBay, Poshmark, etc.
            Return the data as valid JSON only, no other text.
            
            Extract these fields if visible (read the EXACT numbers shown):
            - gross_revenue: total sales/revenue amount - look for "Revenue", "Total Sales", "Gross" (number)
            - net_profit: profit amount - look for "Profit", "Net", "Earnings" (number) - this is DIFFERENT from revenue
            - items_sold: number of items SOLD (number)
            - items_listed: number of items LISTED or active listings if shown (number)
            - avg_sale_price: average sale price if shown (number)
            - platform: the platform name if identifiable (string)
            - date_range: the date range shown, e.g. "January 2026" or "Jan 1 - Jan 31, 2026" (string)
            - fees: any marketplace/platform fees shown (number)
            - shipping_cost: shipping costs if shown (number)
            
            IMPORTANT: 
            - gross_revenue and net_profit are DIFFERENT numbers - extract both separately
            - If you see "Revenue: $7,882" and "Profit: $5,795", those are TWO different values
            - If a field is not visible or unclear, omit it from the response
            
            Return ONLY valid JSON, no markdown, no explanation."""
        ).with_model("openai", "gpt-4o")
        
        # Create message with image
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text="Extract the financial data from this screenshot. Return only valid JSON.",
            file_contents=[image_content]
        )
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Clean up response - remove markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            
            data = json.loads(cleaned)
            
            return {
                "success": True,
                "extracted_data": data,
                "raw_response": response
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Could not parse AI response as JSON",
                "raw_response": response
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


# ============== 1099s ISSUED (TO CONTRACTORS) ==============

class Issued1099Entry(BaseModel):
    id: str
    year: int
    contractor_name: str
    contractor_tin: Optional[str] = None  # SSN or EIN
    contractor_address: Optional[str] = None
    amount_paid: float
    w9_document_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class CreateIssued1099Request(BaseModel):
    year: int
    contractor_name: str
    contractor_tin: Optional[str] = None
    contractor_address: Optional[str] = None
    amount_paid: float
    w9_document_id: Optional[str] = None
    notes: Optional[str] = None

@router.get("/issued-1099s/{year}")
async def get_issued_1099s(year: int):
    """Get all 1099s issued to contractors for a year"""
    entries = await db.issued_1099s.find(
        {"year": year},
        {"_id": 0}
    ).sort("contractor_name", 1).to_list(length=None)
    
    total_paid = sum(e["amount_paid"] for e in entries)
    
    return {
        "entries": entries,
        "total_paid": total_paid,
        "count": len(entries)
    }

@router.post("/issued-1099s")
async def create_issued_1099(request: CreateIssued1099Request):
    """Create a new 1099 issued entry"""
    entry = Issued1099Entry(
        id=str(uuid.uuid4()),
        year=request.year,
        contractor_name=request.contractor_name,
        contractor_tin=request.contractor_tin,
        contractor_address=request.contractor_address,
        amount_paid=request.amount_paid,
        w9_document_id=request.w9_document_id,
        notes=request.notes,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.issued_1099s.insert_one(entry.model_dump())
    return {"message": "1099 entry created", "entry": entry.model_dump()}

@router.put("/issued-1099s/{entry_id}")
async def update_issued_1099(entry_id: str, request: CreateIssued1099Request):
    """Update an issued 1099 entry"""
    update_data = request.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.issued_1099s.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    return {"message": "1099 entry updated"}

@router.delete("/issued-1099s/{entry_id}")
async def delete_issued_1099(entry_id: str):
    """Delete an issued 1099 entry"""
    result = await db.issued_1099s.delete_one({"id": entry_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    return {"message": "1099 entry deleted"}


@router.get("/issued-1099s/{entry_id}/generate-pdf")
async def generate_1099_nec_pdf(entry_id: str):
    """Generate a 1099-NEC PDF form for IRS filing"""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
    from io import BytesIO
    
    # Get the 1099 entry
    entry = await db.issued_1099s.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    # Get payer info (business owner)
    payer_info = {
        "name": "Thrifty Curator",
        "address": "",  # Would come from business settings
        "tin": ""  # Would come from business settings
    }
    
    # Create PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, height - 1*inch, "1099-NEC")
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 1.3*inch, f"Nonemployee Compensation - Tax Year {entry['year']}")
    
    # Payer Info (Left side)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1*inch, height - 2*inch, "PAYER'S Information")
    c.setFont("Helvetica", 9)
    c.drawString(1*inch, height - 2.3*inch, f"Name: {payer_info['name']}")
    
    # Recipient Info (Right side)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(4*inch, height - 2*inch, "RECIPIENT'S Information")
    c.setFont("Helvetica", 9)
    c.drawString(4*inch, height - 2.3*inch, f"Name: {entry.get('contractor_name', '')}")
    c.drawString(4*inch, height - 2.5*inch, f"TIN: {entry.get('contractor_tin', '')}")
    
    # Address
    address = entry.get('contractor_address', '')
    if address:
        lines = address.split('\n') if '\n' in address else [address]
        y_pos = height - 2.7*inch
        for line in lines[:3]:
            c.drawString(4*inch, y_pos, line.strip())
            y_pos -= 0.2*inch
    
    # Box 1 - Nonemployee Compensation
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, height - 4*inch, "Box 1 - Nonemployee Compensation")
    c.setFont("Helvetica", 14)
    amount = entry.get('amount_paid', 0)
    c.drawString(1*inch, height - 4.4*inch, f"${amount:,.2f}")
    
    # Notes
    if entry.get('notes'):
        c.setFont("Helvetica", 9)
        c.drawString(1*inch, height - 5*inch, f"Notes: {entry['notes']}")
    
    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(1*inch, 1*inch, "This is a draft 1099-NEC form. For official IRS filing, use IRS-approved forms.")
    c.drawString(1*inch, 0.8*inch, f"Generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    
    c.save()
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=1099_NEC_{entry['contractor_name'].replace(' ', '_')}_{entry['year']}.pdf"
        }
    )


class SaveToPortalRequest(BaseModel):
    user_id: Optional[str] = None
    form_type: Optional[str] = "draft"  # 'draft' or 'filed'

@router.post("/issued-1099s/{entry_id}/save-to-portal")
async def save_1099_to_employee_portal(entry_id: str, request: SaveToPortalRequest = None):
    """Save the 1099 to the employee/contractor's portal for them to view"""
    # Get the 1099 entry
    entry = await db.issued_1099s.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    contractor_name = entry.get('contractor_name', '')
    
    # If user_id provided, use that; otherwise try to find by name
    user = None
    if request and request.user_id:
        user = await db.users.find_one(
            {"id": request.user_id},
            {"_id": 0, "id": 1, "email": 1, "name": 1}
        )
    else:
        # Fallback: Look for a user with this name
        user = await db.users.find_one(
            {"name": {"$regex": f"^{contractor_name}$", "$options": "i"}},
            {"_id": 0, "id": 1, "email": 1, "name": 1}
        )
    
    # Create a tax document record
    doc_record = {
        "id": str(uuid.uuid4()),
        "type": "1099_nec",
        "year": entry["year"],
        "contractor_name": contractor_name,
        "contractor_tin": entry.get("contractor_tin"),
        "amount_paid": entry.get("amount_paid"),
        "issued_1099_id": entry_id,
        "user_id": user["id"] if user else None,
        "status": "issued",
        "filed_document_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_documents.insert_one(doc_record)
    
    # Update the 1099 entry to mark it as saved to portal
    await db.issued_1099s.update_one(
        {"id": entry_id},
        {"$set": {"saved_to_portal": True, "portal_doc_id": doc_record["id"]}}
    )
    
    return {
        "message": "1099 saved to employee portal",
        "user_found": user is not None,
        "user_name": user["name"] if user else contractor_name,
        "doc_id": doc_record["id"]
    }


class EmailRequest(BaseModel):
    email: str
    form_type: Optional[str] = "draft"  # 'draft' or 'filed'

@router.post("/issued-1099s/{entry_id}/email")
async def email_1099_to_contractor(entry_id: str, request: EmailRequest):
    """Email the 1099-NEC to the contractor"""
    from app.services.email_service import send_email
    
    # Get the 1099 entry
    entry = await db.issued_1099s.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    contractor_name = entry.get('contractor_name', '')
    email = request.email
    amount = entry.get("amount_paid", 0)
    year = entry.get("year")
    form_type = request.form_type
    
    # Send email
    form_label = "Official Filed" if form_type == "filed" else "Draft"
    subject = f"Your 1099-NEC for Tax Year {year}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>1099-NEC Tax Document</h2>
        <p>Dear {contractor_name},</p>
        <p>Your {form_label} 1099-NEC form for tax year {year} is now available.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nonemployee Compensation (Box 1):</strong> ${amount:,.2f}</p>
            <p><strong>Tax Year:</strong> {year}</p>
            <p><strong>Form Type:</strong> {form_label}</p>
        </div>
        <p>You can view and download your 1099-NEC form by logging into your employee portal.</p>
        <p>Please retain this document for your tax records.</p>
        <br>
        <p>Best regards,<br>Thrifty Curator</p>
    </div>
    """
    
    try:
        await send_email(
            to_email=email,
            subject=subject,
            html_content=html_content
        )
        
        # Update entry to mark as emailed
        await db.issued_1099s.update_one(
            {"id": entry_id},
            {"$set": {"emailed": True, "emailed_at": datetime.now(timezone.utc).isoformat(), "emailed_to": email}}
        )
        
        return {"message": f"1099-NEC emailed to {email}", "email": email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/issued-1099s/{entry_id}/upload-filed")
async def upload_filed_1099(entry_id: str, file: UploadFile = File(...)):
    """Upload the official filed 1099 document"""
    # Get the 1099 entry
    entry = await db.issued_1099s.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    doc_id = str(uuid.uuid4())
    
    # Store the filed document
    filed_doc = {
        "id": doc_id,
        "issued_1099_id": entry_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "content": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "type": "filed_1099_nec",
        "year": entry["year"],
        "contractor_name": entry.get("contractor_name")
    }
    
    await db.filed_tax_documents.insert_one(filed_doc)
    
    # Update the 1099 entry
    await db.issued_1099s.update_one(
        {"id": entry_id},
        {"$set": {
            "filed": True,
            "filed_at": datetime.now(timezone.utc).isoformat(),
            "filed_document_id": doc_id
        }}
    )
    
    # Also update the tax document record if it exists
    await db.tax_documents.update_one(
        {"issued_1099_id": entry_id},
        {"$set": {
            "status": "filed",
            "filed_document_id": doc_id,
            "filed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Filed 1099 uploaded successfully",
        "doc_id": doc_id,
        "filename": file.filename
    }


@router.get("/issued-1099s/{entry_id}/filed-document")
async def download_filed_1099(entry_id: str):
    """Download the filed 1099 document"""
    entry = await db.issued_1099s.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="1099 entry not found")
    
    filed_doc_id = entry.get("filed_document_id")
    if not filed_doc_id:
        raise HTTPException(status_code=404, detail="No filed document found for this 1099")
    
    doc = await db.filed_tax_documents.find_one({"id": filed_doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Filed document not found")
    
    content = base64.b64decode(doc["content"])
    
    return Response(
        content=content,
        media_type=doc.get("content_type", "application/pdf"),
        headers={
            "Content-Disposition": f"inline; filename={doc.get('filename', '1099_filed.pdf')}"
        }
    )

@router.post("/w9/extract")
async def extract_w9_data(file: UploadFile = File(...)):
    """Extract data from a W-9 or 1099-NEC document image using AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    # Check content type - be lenient for iOS uploads
    content_type = file.content_type or ''
    filename = file.filename or ''
    
    is_image = (
        content_type.startswith('image/') or 
        filename.lower().endswith(('.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp'))
    )
    
    if not is_image:
        raise HTTPException(status_code=400, detail=f"Please upload an image file. Received: {content_type}")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file received")
        
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # Get API key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"w9-extract-{uuid.uuid4()}",
            system_message="""You are a tax document data extraction assistant.
            Extract data from W-9 forms or 1099-NEC forms.
            Return the data as valid JSON only, no other text or markdown."""
        ).with_model("openai", "gpt-4o")
        
        prompt = """Analyze this tax document and extract the following information.
        
        If this is a W-9 form, extract:
        - name: Individual or business name
        - address: Full address
        - tin: SSN or EIN (show the FULL number, do NOT mask it)
        
        If this is a 1099-NEC form, extract:
        - name: Recipient name (who was paid)
        - address: Recipient address
        - tin: Recipient's TIN/SSN (show the FULL number, do NOT mask it)
        - amount_paid: The nonemployee compensation amount (Box 1) as a number
        - payer_name: Who issued the 1099 (the payer)
        - tax_year: The calendar year
        
        Return ONLY a valid JSON object with the extracted fields. Use null for any field not visible."""
        
        # Create message with image
        image_content = ImageContent(image_base64=base64_image)
        user_message = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Parse the response
        response_text = response.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        try:
            extracted_data = json.loads(response_text)
            return {
                "success": True,
                "data": extracted_data
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Could not parse document data",
                "raw_response": response_text
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document extraction failed: {str(e)}")

