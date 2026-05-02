from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import csv
import io
import json

from app.database import db

router = APIRouter(prefix="/inventory", tags=["inventory"])

# ============== MODELS ==============

class InventoryItem(BaseModel):
    id: str
    raw_data: Dict[str, Any]  # Store all original CSV columns
    # Normalized fields for querying
    title: Optional[str] = None
    sku: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None  # listed, sold, unlisted, etc.
    sold_date: Optional[str] = None
    listed_date: Optional[str] = None
    created_date: Optional[str] = None
    price_listed: Optional[float] = None
    price_sold: Optional[float] = None
    cogs: Optional[float] = None
    fees: Optional[float] = None
    shipping_cost: Optional[float] = None
    profit: Optional[float] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    # Metadata
    import_batch_id: str
    imported_at: str
    source: str = "vendoo"

# ============== HELPER FUNCTIONS ==============

def parse_currency(value: str) -> Optional[float]:
    """Parse currency string to float"""
    if not value or str(value).strip() in ["", "None", "null", "N/A", "-"]:
        return None
    cleaned = str(value).replace("$", "").replace(",", "").replace(" ", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None

def parse_date(value: str) -> Optional[str]:
    """Parse various date formats to ISO format"""
    if not value or str(value).strip() in ["", "None", "null", "N/A", "-"]:
        return None
    
    value = str(value).strip()
    
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y", 
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%b %d, %Y",
        "%B %d, %Y",
        "%m-%d-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %I:%M %p",
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value  # Return original if can't parse

def normalize_column_name(name: str) -> str:
    """Normalize column name for matching"""
    return name.lower().strip().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "")

def find_column_value(row: dict, possible_names: List[str], header_map: dict) -> Optional[str]:
    """Find a value from multiple possible column names"""
    for name in possible_names:
        normalized = normalize_column_name(name)
        if normalized in header_map:
            original_name = header_map[normalized]
            value = row.get(original_name)
            if value and str(value).strip():
                return str(value).strip()
    return None

# Column mappings for Vendoo exports
VENDOO_COLUMN_MAPPINGS = {
    "title": ["title", "item_name", "name", "description", "item_title", "listing_title"],
    "sku": ["sku", "item_sku", "listing_sku", "id", "item_id"],
    "platform": ["platform", "sold_platform", "platform_sold", "marketplace", "sold_on", "listed_on"],
    "status": ["status", "listing_status", "item_status", "state"],
    "sold_date": ["sold_date", "date_sold", "sale_date", "sold_on_date", "sold"],
    "listed_date": ["listed_date", "date_listed", "list_date", "listed_on", "listing_date"],
    "created_date": ["created_date", "date_created", "created", "created_at", "date_added"],
    "price_listed": ["listed_price", "price_listed", "list_price", "asking_price", "price"],
    "price_sold": ["price_sold", "sold_price", "sale_price", "sold_for", "revenue", "total_sale"],
    "cogs": ["cogs", "cost_of_goods", "cog", "cost", "purchase_price", "cost_price", "item_cost"],
    "fees": ["fees", "marketplace_fees", "platform_fees", "selling_fees", "total_fees"],
    "shipping_cost": ["shipping_cost", "shipping_fees", "shipping", "ship_cost"],
    "profit": ["profit", "net_profit", "earnings", "net"],
    "category": ["category", "item_category", "type", "item_type"],
    "brand": ["brand", "item_brand", "designer", "manufacturer"],
    "size": ["size", "item_size"],
    "color": ["color", "item_color", "colour"],
    "notes": ["notes", "description", "item_notes", "comments"],
}

# ============== ENDPOINTS ==============

@router.post("/import")
async def import_inventory_csv(
    file: UploadFile = File(...),
    source: str = Form("vendoo")
):
    """
    Import inventory/sales data from CSV.
    Stores ALL data without filtering - every row is preserved.
    
    Handles large files (10,000+ rows) efficiently.
    """
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
        # Check file size (limit to 50MB for safety)
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
        
        # Try different encodings
        decoded = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                decoded = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if decoded is None:
            raise HTTPException(status_code=400, detail="Could not decode CSV file. Try saving it as UTF-8.")
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(decoded))
        
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV file has no headers")
        
        # Create header mapping
        header_map = {normalize_column_name(h): h for h in reader.fieldnames}
        
        # Generate batch ID for this import
        batch_id = str(uuid.uuid4())
        imported_at = datetime.now(timezone.utc).isoformat()
        
        # Process rows in batches for efficiency
        items_to_insert = []
        rows_processed = 0
        rows_skipped = 0
        
        for row in reader:
            # Skip completely empty rows
            if all(not v or str(v).strip() == "" for v in row.values()):
                rows_skipped += 1
                continue
            
            # Extract normalized fields
            title = find_column_value(row, VENDOO_COLUMN_MAPPINGS["title"], header_map)
            
            # Skip rows without a title/name (likely header duplicates or empty)
            if not title:
                rows_skipped += 1
                continue
            
            item = {
                "id": str(uuid.uuid4()),
                "raw_data": {k: v for k, v in row.items() if v},  # Store non-empty values
                "title": title,
                "sku": find_column_value(row, VENDOO_COLUMN_MAPPINGS["sku"], header_map),
                "platform": find_column_value(row, VENDOO_COLUMN_MAPPINGS["platform"], header_map),
                "status": find_column_value(row, VENDOO_COLUMN_MAPPINGS["status"], header_map),
                "sold_date": parse_date(find_column_value(row, VENDOO_COLUMN_MAPPINGS["sold_date"], header_map)),
                "listed_date": parse_date(find_column_value(row, VENDOO_COLUMN_MAPPINGS["listed_date"], header_map)),
                "created_date": parse_date(find_column_value(row, VENDOO_COLUMN_MAPPINGS["created_date"], header_map)),
                "price_listed": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["price_listed"], header_map)),
                "price_sold": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["price_sold"], header_map)),
                "cogs": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["cogs"], header_map)),
                "fees": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["fees"], header_map)),
                "shipping_cost": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["shipping_cost"], header_map)),
                "profit": parse_currency(find_column_value(row, VENDOO_COLUMN_MAPPINGS["profit"], header_map)),
                "category": find_column_value(row, VENDOO_COLUMN_MAPPINGS["category"], header_map),
                "brand": find_column_value(row, VENDOO_COLUMN_MAPPINGS["brand"], header_map),
                "size": find_column_value(row, VENDOO_COLUMN_MAPPINGS["size"], header_map),
                "color": find_column_value(row, VENDOO_COLUMN_MAPPINGS["color"], header_map),
                "notes": find_column_value(row, VENDOO_COLUMN_MAPPINGS["notes"], header_map),
                "import_batch_id": batch_id,
                "imported_at": imported_at,
                "source": source,
            }
            
            items_to_insert.append(item)
            rows_processed += 1
            
            # Insert in batches of 500 to avoid memory issues
            if len(items_to_insert) >= 500:
                await db.inventory_items.insert_many(items_to_insert)
                items_to_insert = []
        
        # Insert remaining items
        if items_to_insert:
            await db.inventory_items.insert_many(items_to_insert)
        
        # Get column summary for user reference
        detected_columns = {
            "total_columns": len(reader.fieldnames),
            "columns": reader.fieldnames,
            "mapped_fields": {
                field: find_column_value({"_test": "_"}, names, header_map) is not None or any(normalize_column_name(n) in header_map for n in names)
                for field, names in VENDOO_COLUMN_MAPPINGS.items()
            }
        }
        
        return {
            "success": True,
            "message": f"Successfully imported {rows_processed} items",
            "batch_id": batch_id,
            "details": {
                "rows_processed": rows_processed,
                "rows_skipped": rows_skipped,
                "total_rows": rows_processed + rows_skipped,
                "file_name": file.filename,
                "file_size_kb": round(len(content) / 1024, 1),
            },
            "columns_detected": detected_columns
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode CSV file. Ensure it's saved as UTF-8.")
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/items")
async def get_inventory_items(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    year: Optional[int] = None,
    sort_by: str = Query("imported_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="asc or desc")
):
    """Get inventory items with filtering and pagination"""
    
    # Build query
    query = {}
    
    if status:
        query["status"] = {"$regex": status, "$options": "i"}
    
    if platform:
        query["platform"] = {"$regex": platform, "$options": "i"}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
        ]
    
    if year:
        # Search in sold_date, listed_date, or created_date
        year_str = str(year)
        query["$or"] = query.get("$or", []) + [
            {"sold_date": {"$regex": f"^{year_str}"}},
            {"listed_date": {"$regex": f"^{year_str}"}},
            {"created_date": {"$regex": f"^{year_str}"}},
        ]
    
    # Count total
    total = await db.inventory_items.count_documents(query)
    
    # Sort direction
    sort_dir = -1 if sort_order == "desc" else 1
    
    # Fetch items
    skip = (page - 1) * limit
    items = await db.inventory_items.find(
        query,
        {"_id": 0}
    ).sort(sort_by, sort_dir).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.get("/summary")
async def get_inventory_summary():
    """Get summary statistics for all inventory"""
    
    # Total items
    total_items = await db.inventory_items.count_documents({})
    
    # Items by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    status_counts = await db.inventory_items.aggregate(status_pipeline).to_list(100)
    
    # Items by platform
    platform_pipeline = [
        {"$match": {"platform": {"$ne": None}}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    platform_counts = await db.inventory_items.aggregate(platform_pipeline).to_list(100)
    
    # Financial totals for sold items
    sold_pipeline = [
        {"$match": {"status": {"$regex": "sold", "$options": "i"}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": {"$ifNull": ["$price_sold", 0]}},
            "total_cogs": {"$sum": {"$ifNull": ["$cogs", 0]}},
            "total_fees": {"$sum": {"$ifNull": ["$fees", 0]}},
            "total_profit": {"$sum": {"$ifNull": ["$profit", 0]}},
            "count": {"$sum": 1}
        }}
    ]
    sold_stats = await db.inventory_items.aggregate(sold_pipeline).to_list(1)
    sold_summary = sold_stats[0] if sold_stats else {
        "total_revenue": 0, "total_cogs": 0, "total_fees": 0, "total_profit": 0, "count": 0
    }
    
    # Import batches
    batch_pipeline = [
        {"$group": {
            "_id": "$import_batch_id",
            "count": {"$sum": 1},
            "imported_at": {"$first": "$imported_at"},
            "source": {"$first": "$source"}
        }},
        {"$sort": {"imported_at": -1}},
        {"$limit": 10}
    ]
    recent_batches = await db.inventory_items.aggregate(batch_pipeline).to_list(10)
    
    return {
        "total_items": total_items,
        "by_status": {item["_id"] or "Unknown": item["count"] for item in status_counts},
        "by_platform": {item["_id"] or "Unknown": item["count"] for item in platform_counts},
        "sold_summary": {
            "count": sold_summary.get("count", 0),
            "total_revenue": round(sold_summary.get("total_revenue", 0), 2),
            "total_cogs": round(sold_summary.get("total_cogs", 0), 2),
            "total_fees": round(sold_summary.get("total_fees", 0), 2),
            "total_profit": round(sold_summary.get("total_profit", 0), 2),
        },
        "recent_imports": [
            {
                "batch_id": batch["_id"],
                "count": batch["count"],
                "imported_at": batch["imported_at"],
                "source": batch.get("source", "unknown")
            }
            for batch in recent_batches
        ]
    }


@router.get("/items/{item_id}")
async def get_inventory_item(item_id: str):
    """Get a single inventory item with all raw data"""
    item = await db.inventory_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item


@router.delete("/items/{item_id}")
async def delete_inventory_item(item_id: str):
    """Delete a single inventory item"""
    result = await db.inventory_items.delete_one({"id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}


@router.delete("/batch/{batch_id}")
async def delete_import_batch(batch_id: str):
    """Delete all items from a specific import batch"""
    result = await db.inventory_items.delete_many({"import_batch_id": batch_id})
    
    return {
        "message": f"Deleted {result.deleted_count} items from batch",
        "deleted_count": result.deleted_count
    }


@router.delete("/all")
async def delete_all_inventory():
    """Delete ALL inventory items - use with caution!"""
    result = await db.inventory_items.delete_many({})
    
    return {
        "message": f"Deleted all {result.deleted_count} inventory items",
        "deleted_count": result.deleted_count
    }


@router.get("/export")
async def export_inventory_csv(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    year: Optional[int] = None
):
    """Export inventory items back to CSV"""
    
    # Build query
    query = {}
    if status:
        query["status"] = {"$regex": status, "$options": "i"}
    if platform:
        query["platform"] = {"$regex": platform, "$options": "i"}
    if year:
        year_str = str(year)
        query["$or"] = [
            {"sold_date": {"$regex": f"^{year_str}"}},
            {"listed_date": {"$regex": f"^{year_str}"}},
        ]
    
    items = await db.inventory_items.find(query, {"_id": 0}).to_list(length=None)
    
    if not items:
        raise HTTPException(status_code=404, detail="No items found matching criteria")
    
    # Create CSV
    output = io.StringIO()
    
    # Use consistent field order
    fieldnames = [
        "title", "sku", "platform", "status", "sold_date", "listed_date",
        "price_listed", "price_sold", "cogs", "fees", "shipping_cost", "profit",
        "category", "brand", "size", "color", "notes"
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    
    for item in items:
        writer.writerow({k: item.get(k, "") for k in fieldnames})
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inventory_export.csv"}
    )


@router.get("/years")
async def get_inventory_years():
    """Get list of years with inventory data"""
    
    # Extract years from sold_date field
    pipeline = [
        {"$match": {"sold_date": {"$ne": None}}},
        {"$project": {"year": {"$substr": ["$sold_date", 0, 4]}}},
        {"$group": {"_id": "$year", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}}
    ]
    
    years = await db.inventory_items.aggregate(pipeline).to_list(20)
    
    return {
        "years": [{"year": int(y["_id"]), "count": y["count"]} for y in years if y["_id"] and y["_id"].isdigit()]
    }


# ============== ANALYTICS ENDPOINTS ==============

@router.get("/analytics")
async def get_inventory_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    year: Optional[int] = None,
    same_period_as_current: Optional[bool] = False
):
    """
    Get comprehensive analytics for inventory/sales data.
    Supports date range filtering.
    
    When filtering by year:
    - Sales metrics use items SOLD in that year
    - Avg days to sale uses items LISTED in that year (that have sold)
    
    If same_period_as_current=True and year is previous year:
    - Only returns data up to the current month (for fair YoY comparison)
    """
    
    # Determine date filter based on parameters
    current_date = datetime.now()
    current_month = current_date.month
    
    # Build date filter for SOLD items
    sold_date_filter = {}
    if start_date and end_date:
        sold_date_filter = {
            "sold_date": {"$gte": start_date, "$lte": end_date}
        }
    elif year:
        year_str = str(year)
        # If same_period_as_current, only include months before current month
        if same_period_as_current and year < current_date.year:
            # Build regex to match Jan through month before current
            month_patterns = [f"^{year_str}-{m:02d}" for m in range(1, current_month)]
            if month_patterns:
                sold_date_filter = {"$or": [{"sold_date": {"$regex": p}} for p in month_patterns]}
            else:
                sold_date_filter = {"sold_date": {"$regex": "^$"}}  # Match nothing
        else:
            sold_date_filter = {"sold_date": {"$regex": f"^{year_str}"}}
    
    # Get sold items (for revenue calculations)
    sold_query = {"status": {"$regex": "sold", "$options": "i"}}
    if sold_date_filter:
        sold_query.update(sold_date_filter)
    
    sold_items = await db.inventory_items.find(sold_query, {"_id": 0}).to_list(length=None)
    
    # Get unsold items (no date filter - we want all unsold)
    unsold_query = {
        "$or": [
            {"status": {"$regex": "listed|active|available", "$options": "i"}},
            {"status": {"$exists": False}},
            {"sold_date": None}
        ]
    }
    unsold_items = await db.inventory_items.find(unsold_query, {"_id": 0}).to_list(length=None)
    
    # Calculate metrics
    gross_sales = sum(item.get("price_sold", 0) or 0 for item in sold_items)
    total_cogs = sum(item.get("cogs", 0) or 0 for item in sold_items)
    total_fees = sum(item.get("fees", 0) or 0 for item in sold_items)
    total_shipping = sum(item.get("shipping_cost", 0) or 0 for item in sold_items)
    net_sales = gross_sales - total_fees - total_shipping
    profit = sum(item.get("profit", 0) or 0 for item in sold_items)
    
    # If profit not provided, calculate it
    if profit == 0 and gross_sales > 0:
        profit = net_sales - total_cogs
    
    # Calculate average days to sale for items LISTED in the selected year
    # This is separate from the sales metrics - we want items created/listed in year X
    days_to_sale = []
    avg_days_to_sale = None
    
    if year:
        # For year filter: get items LISTED in that year that have sold
        year_str = str(year)
        listed_in_year_query = {
            "status": {"$regex": "sold", "$options": "i"},
            "sold_date": {"$ne": None},
            "$or": [
                {"listed_date": {"$regex": f"^{year_str}"}},
                {"created_date": {"$regex": f"^{year_str}"}}
            ]
        }
        items_listed_in_year = await db.inventory_items.find(listed_in_year_query, {"_id": 0}).to_list(length=None)
        
        for item in items_listed_in_year:
            listed_date_str = item.get("listed_date") or item.get("created_date")
            sold_date_str = item.get("sold_date")
            if listed_date_str and sold_date_str:
                try:
                    sold = datetime.strptime(sold_date_str[:10], "%Y-%m-%d")
                    listed = datetime.strptime(listed_date_str[:10], "%Y-%m-%d")
                    days = (sold - listed).days
                    if days >= 0:
                        days_to_sale.append(days)
                except:
                    pass
    else:
        # No year filter - use all sold items
        for item in sold_items:
            listed_date_str = item.get("listed_date") or item.get("created_date")
            sold_date_str = item.get("sold_date")
            if listed_date_str and sold_date_str:
                try:
                    sold = datetime.strptime(sold_date_str[:10], "%Y-%m-%d")
                    listed = datetime.strptime(listed_date_str[:10], "%Y-%m-%d")
                    days = (sold - listed).days
                    if days >= 0:
                        days_to_sale.append(days)
                except:
                    pass
    
    avg_days_to_sale = round(sum(days_to_sale) / len(days_to_sale), 1) if days_to_sale else None
    
    # Top brands
    brand_sales = {}
    for item in sold_items:
        brand = item.get("brand") or "Unknown"
        if brand not in brand_sales:
            brand_sales[brand] = {"count": 0, "revenue": 0}
        brand_sales[brand]["count"] += 1
        brand_sales[brand]["revenue"] += item.get("price_sold", 0) or 0
    
    top_brands = sorted(
        [{"brand": k, **v} for k, v in brand_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:10]
    
    # Top platforms
    platform_sales = {}
    for item in sold_items:
        platform = item.get("platform") or "Unknown"
        if platform not in platform_sales:
            platform_sales[platform] = {"count": 0, "revenue": 0}
        platform_sales[platform]["count"] += 1
        platform_sales[platform]["revenue"] += item.get("price_sold", 0) or 0
    
    top_platforms = sorted(
        [{"platform": k, **v} for k, v in platform_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )
    
    # Monthly breakdown for charts
    monthly_sales = {}
    for item in sold_items:
        if item.get("sold_date"):
            month_key = item["sold_date"][:7]  # YYYY-MM
            if month_key not in monthly_sales:
                monthly_sales[month_key] = {"gross": 0, "net": 0, "count": 0, "cogs": 0}
            monthly_sales[month_key]["gross"] += item.get("price_sold", 0) or 0
            monthly_sales[month_key]["cogs"] += item.get("cogs", 0) or 0
            monthly_sales[month_key]["count"] += 1
            fees = (item.get("fees", 0) or 0) + (item.get("shipping_cost", 0) or 0)
            monthly_sales[month_key]["net"] += (item.get("price_sold", 0) or 0) - fees
    
    monthly_data = [
        {"month": k, **v, "profit": v["net"] - v["cogs"]}
        for k, v in sorted(monthly_sales.items())
    ]
    
    return {
        "summary": {
            "gross_sales": round(gross_sales, 2),
            "net_sales": round(net_sales, 2),
            "total_cogs": round(total_cogs, 2),
            "total_fees": round(total_fees, 2),
            "profit": round(profit, 2),
            "profit_margin": round((profit / gross_sales * 100), 1) if gross_sales > 0 else 0,
            "items_sold": len(sold_items),
            "items_unsold": len(unsold_items),
            "avg_days_to_sale": avg_days_to_sale,
            "avg_days_to_sale_count": len(days_to_sale),  # How many items this is based on
            "avg_sale_price": round(gross_sales / len(sold_items), 2) if sold_items else 0
        },
        "top_brands": top_brands,
        "top_platforms": top_platforms,
        "monthly_data": monthly_data,
        "date_range": {
            "start": start_date,
            "end": end_date,
            "year": year
        }
    }


@router.get("/analytics/yoy")
async def get_year_over_year_comparison(
    current_year: Optional[int] = None
):
    """Get year-over-year sales comparison data for charts"""
    
    if not current_year:
        current_year = datetime.now().year
    
    previous_year = current_year - 1
    
    # Get sales for both years
    result = {"current_year": current_year, "previous_year": previous_year, "months": []}
    
    current_date = datetime.now()
    current_month_num = current_date.month  # 1-indexed (May = 5)
    current_day = current_date.day
    is_current_year_view = current_year == current_date.year
    
    for month in range(1, 13):
        month_str = f"{month:02d}"
        month_name = datetime(2000, month, 1).strftime("%b")
        
        # Previous year - always include all 12 months
        prev_query = {
            "sold_date": {"$regex": f"^{previous_year}-{month_str}"},
            "status": {"$regex": "sold", "$options": "i"}
        }
        prev_items = await db.inventory_items.find(prev_query, {"price_sold": 1, "cogs": 1, "fees": 1, "shipping_cost": 1, "profit": 1}).to_list(length=None)
        prev_sales = sum(item.get("price_sold", 0) or 0 for item in prev_items)
        # Calculate profit for previous year
        prev_profit = sum(item.get("profit", 0) or 0 for item in prev_items)
        if prev_profit == 0:
            # Calculate if not stored
            prev_cogs = sum(item.get("cogs", 0) or 0 for item in prev_items)
            prev_fees = sum((item.get("fees", 0) or 0) + (item.get("shipping_cost", 0) or 0) for item in prev_items)
            prev_profit = prev_sales - prev_cogs - prev_fees
        
        # Current year - only include COMPLETE months (exclude current partial month)
        # If viewing current year, only show months BEFORE the current month
        current_sales = None  # Use None for months without data
        current_profit = None
        if not is_current_year_view or month < current_month_num:
            current_query = {
                "sold_date": {"$regex": f"^{current_year}-{month_str}"},
                "status": {"$regex": "sold", "$options": "i"}
            }
            current_items = await db.inventory_items.find(current_query, {"price_sold": 1, "cogs": 1, "fees": 1, "shipping_cost": 1, "profit": 1}).to_list(length=None)
            current_sales = round(sum(item.get("price_sold", 0) or 0 for item in current_items), 2)
            # Calculate profit for current year
            current_profit = sum(item.get("profit", 0) or 0 for item in current_items)
            if current_profit == 0:
                current_cogs = sum(item.get("cogs", 0) or 0 for item in current_items)
                current_fees = sum((item.get("fees", 0) or 0) + (item.get("shipping_cost", 0) or 0) for item in current_items)
                current_profit = current_sales - current_cogs - current_fees
            current_profit = round(current_profit, 2)
        
        month_data = {
            "month": month_name,
            "month_num": month,
            "previous": round(prev_sales, 2),
            "previous_profit": round(prev_profit, 2)
        }
        
        # Only add current if it's not None (i.e., a complete month)
        if current_sales is not None:
            month_data["current"] = current_sales
            month_data["current_profit"] = current_profit
            month_data["change"] = round(current_sales - prev_sales, 2)
            month_data["change_pct"] = round((current_sales - prev_sales) / prev_sales * 100, 1) if prev_sales > 0 else 0
        
        result["months"].append(month_data)
    
    # Calculate YTD totals (only from months that have current data)
    result["ytd"] = {
        "current": sum(m.get("current", 0) for m in result["months"] if "current" in m),
        "current_profit": sum(m.get("current_profit", 0) for m in result["months"] if "current_profit" in m),
        "previous": sum(m["previous"] for m in result["months"]),
        "previous_profit": sum(m["previous_profit"] for m in result["months"])
    }
    
    return result


@router.get("/stale")
async def get_stale_inventory(
    days_threshold: int = Query(365, description="Items listed more than X days ago"),
    limit: int = Query(100, le=500)
):
    """Get items that haven't sold and have been listed for longer than threshold"""
    
    cutoff_date = (datetime.now() - timedelta(days=days_threshold)).strftime("%Y-%m-%d")
    
    # Find unsold items listed before cutoff
    query = {
        "$and": [
            {"listed_date": {"$lte": cutoff_date, "$ne": None}},
            {"$or": [
                {"status": {"$regex": "listed|active|available", "$options": "i"}},
                {"sold_date": None}
            ]}
        ]
    }
    
    items = await db.inventory_items.find(query, {"_id": 0}).sort("listed_date", 1).limit(limit).to_list(length=limit)
    
    # Calculate days in inventory for each
    today = datetime.now()
    for item in items:
        if item.get("listed_date"):
            try:
                listed = datetime.strptime(item["listed_date"][:10], "%Y-%m-%d")
                item["days_in_inventory"] = (today - listed).days
            except:
                item["days_in_inventory"] = None
    
    # Get total count
    total_count = await db.inventory_items.count_documents(query)
    
    return {
        "threshold_days": days_threshold,
        "cutoff_date": cutoff_date,
        "total_stale_items": total_count,
        "items": items
    }


# ============== SAVED REPORTS ==============

class SavedReport(BaseModel):
    name: str
    report_type: str  # 'sales', 'stale_inventory', 'brands', 'platforms', 'custom'
    config: Dict[str, Any]  # date_range, filters, chart_types, etc.


@router.post("/reports/save")
async def save_report(report: SavedReport):
    """Save a report configuration for later use"""
    
    report_doc = {
        "id": str(uuid.uuid4()),
        "name": report.name,
        "report_type": report.report_type,
        "config": report.config,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.saved_reports.insert_one(report_doc)
    
    return {"message": "Report saved", "report_id": report_doc["id"]}


@router.get("/reports/saved")
async def get_saved_reports():
    """Get all saved reports"""
    
    reports = await db.saved_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=50)
    return {"reports": reports}


@router.delete("/reports/saved/{report_id}")
async def delete_saved_report(report_id: str):
    """Delete a saved report"""
    
    result = await db.saved_reports.delete_one({"id": report_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Report deleted"}


@router.delete("/clear-all")
async def clear_all_inventory_data():
    """Clear all inventory data for fresh import"""
    
    result = await db.inventory_items.delete_many({})
    
    return {
        "message": f"Cleared {result.deleted_count} inventory items",
        "deleted_count": result.deleted_count
    }


# Need to import timedelta at the top
from datetime import timedelta
