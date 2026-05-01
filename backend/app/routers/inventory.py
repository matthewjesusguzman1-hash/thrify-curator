from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
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
