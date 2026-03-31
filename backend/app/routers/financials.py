from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import base64
import csv
import io

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
    # Get income
    income_entries = await db.income_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    gross_sales = sum(e["amount"] for e in income_entries)
    income_1099 = sum(e["amount"] for e in income_entries if e.get("is_1099"))
    income_other = sum(e["amount"] for e in income_entries if not e.get("is_1099"))
    
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
    net_profit = gross_profit - total_deductions
    
    return {
        "year": year,
        "income": {
            "total": gross_sales,
            "from_1099": income_1099,
            "other": income_other
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
    """Get comparison data between current year and previous year"""
    current_year = year
    previous_year = year - 1
    
    async def get_year_data(y):
        income = await db.income_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        cogs = await db.cogs_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        expenses = await db.expense_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        mileage = await db.mileage_entries.find({"year": y}, {"_id": 0}).to_list(length=None)
        
        gross_sales = sum(e["amount"] for e in income)
        total_cogs = sum(e["amount"] for e in cogs)
        total_expenses = sum(e["amount"] for e in expenses)
        total_miles = sum(e["miles"] for e in mileage)
        mileage_deduction = total_miles * get_irs_mileage_rate(y)
        
        profit = gross_sales - total_cogs - total_expenses - mileage_deduction
        
        return {
            "gross_sales": gross_sales,
            "profit": round(profit, 2)
        }
    
    current = await get_year_data(current_year)
    previous = await get_year_data(previous_year)
    
    return {
        "current_year": current_year,
        "previous_year": previous_year,
        "current": current,
        "previous": previous
    }

# ============== MONTHLY DATA FOR GRAPHS ==============

@router.get("/monthly/{year}")
async def get_monthly_data(year: int):
    """Get monthly breakdown for graphs"""
    income_entries = await db.income_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    cogs_entries = await db.cogs_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    expense_entries = await db.expense_entries.find({"year": year}, {"_id": 0}).to_list(length=None)
    
    # Initialize monthly data
    months = {i: {"gross_sales": 0, "cogs": 0, "expenses": 0, "profit": 0} for i in range(1, 13)}
    
    # Process income by month (use date_received if available, otherwise distribute evenly)
    for entry in income_entries:
        if entry.get("date_received"):
            try:
                month = int(entry["date_received"].split("-")[1])
                months[month]["gross_sales"] += entry["amount"]
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
    
    # Calculate profit per month
    for m in months:
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
    "offerup": "other",
    "tradesy": "other",
    "grailed": "other",
    "kidizen": "other",
    "curtsy": "other",
    "vestiaire": "other",
    "whatnot": "other",
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
    import_income: bool = Form(True),
    import_cogs: bool = Form(False),
    import_fees_as_expense: bool = Form(False)
):
    """
    Import sales data from Vendoo CSV export.
    
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
        
        platform_col = find_column(["platform_sold", "platform", "marketplace", "sold_on"])
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
            
            # Get date and check if it's in the target year
            date_str = row.get(date_col, "") if date_col else None
            parsed_date = parse_date(date_str) if date_str else None
            
            if parsed_date:
                sale_year = int(parsed_date.split("-")[0])
                if sale_year != year:
                    rows_skipped += 1
                    continue
                month = parsed_date[:7]  # YYYY-MM
            else:
                # If no date, assume it's for the target year
                month = f"{year}-01"
            
            # Get platform
            platform_name = row.get(platform_col, "other").lower().strip() if platform_col else "other"
            platform = VENDOO_PLATFORM_MAP.get(platform_name, "other")
            
            # Aggregate by platform and month
            key = f"{platform}_{month}"
            if key not in sales_by_platform_month:
                sales_by_platform_month[key] = {"total": 0, "count": 0, "platform": platform, "month": month}
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
            raise HTTPException(
                status_code=400, 
                detail=f"No valid sales found for year {year}. Check that your CSV has data for this year."
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

