from fastapi import FastAPI, APIRouter, UploadFile, File, Query, HTTPException
from fastapi.responses import Response, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import requests as http_requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Models
class Violation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    master_key: str = ""
    violation_class: str = ""
    violation_category: str = ""
    cfr_part: str = ""
    regulatory_reference: str = ""
    violation_code: str = ""
    violation_text: str = ""
    sub_vio_of: Optional[str] = None
    oos_value: str = "N"
    critical: str = "N"
    level_iii: str = "N"
    level_vi: str = "N"
    intermodal: str = "N"
    pretrip: str = "N"
    shipper: str = "N"


class ViolationSearchResponse(BaseModel):
    violations: List[Violation]
    total: int
    page: int
    page_size: int
    total_pages: int


class FilterOptions(BaseModel):
    violation_classes: List[str]
    violation_categories: List[str]
    cfr_parts: List[str]
    oos_values: List[str]


class SmartSearchRequest(BaseModel):
    query: str
    hazmat: str = ""
    oos: str = ""
    level_iii: str = ""
    critical: str = ""
    violation_class: str = ""
    violation_category: str = ""
    reg_base: str = ""


class SmartSearchResponse(BaseModel):
    violations: List[Violation]
    total: int
    expanded_terms: List[str]
    original_query: str


# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "violation-navigator"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    key = os.environ.get("EMERGENT_LLM_KEY", "")
    resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path, data, content_type):
    key = init_storage()
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path):
    key = init_storage()
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# Inspection Models
class InspectionPhoto(BaseModel):
    photo_id: str = ""
    storage_path: str = ""
    original_filename: str = ""
    content_type: str = ""
    uploaded_at: str = ""

class InspectionItem(BaseModel):
    item_id: str = ""
    violation_id: str = ""
    regulatory_reference: str = ""
    violation_text: str = ""
    violation_class: str = ""
    violation_code: str = ""
    cfr_part: str = ""
    oos_value: str = "N"
    notes: str = ""
    photos: List[InspectionPhoto] = []

class InspectionModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    title: str = ""
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""
    items: List[InspectionItem] = []

class CreateInspectionRequest(BaseModel):
    title: str = ""

class AddViolationRequest(BaseModel):
    violation_id: str = ""
    regulatory_reference: str = ""
    violation_text: str = ""
    violation_class: str = ""
    violation_code: str = ""
    cfr_part: str = ""
    oos_value: str = "N"

class UpdateInspectionRequest(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None

class UpdateItemNotesRequest(BaseModel):
    notes: str = ""


# Seed data on startup
@app.on_event("startup")
async def startup_event():
    count = await db.violations.count_documents({})
    if count == 0:
        logger.info("No violations found. Seeding from Current Violations sheet...")
        await seed_data_from_url()
    else:
        logger.info(f"Found {count} current violations in DB.")
    # Create text index for search
    await db.violations.create_index([
        ("violation_text", "text"),
        ("regulatory_reference", "text"),
        ("violation_code", "text"),
        ("violation_category", "text"),
    ])
    # Init object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


async def seed_data_from_url():
    import requests
    import io
    import pandas as pd

    excel_url = os.environ.get('EXCEL_URL')
    if not excel_url:
        logger.error("EXCEL_URL not set")
        return

    try:
        r = requests.get(excel_url, timeout=30)
        r.raise_for_status()
        df = pd.read_excel(io.BytesIO(r.content), sheet_name='Current Violations', header=4)
        await _load_dataframe(df)
    except Exception as e:
        logger.error(f"Failed to seed data: {e}")


async def _load_dataframe(df):
    import pandas as pd

    col_map = {
        'Master Key': 'master_key',
        'Violaton Class': 'violation_class',
        'Violation Category': 'violation_category',
        'CFR Part': 'cfr_part',
        'Regulatory Reference': 'regulatory_reference',
        'Violation Code': 'violation_code',
        'Violation Text': 'violation_text',
        'SubVio of': 'sub_vio_of',
        'OOS Value': 'oos_value',
        'Critical': 'critical',
        'Level III': 'level_iii',
        'Level VI': 'level_vi',
        'Intermodal': 'intermodal',
        'Pretrip': 'pretrip',
        'Shipper': 'shipper',
    }

    df = df.rename(columns=col_map)
    # Keep only mapped columns
    valid_cols = [c for c in col_map.values() if c in df.columns]
    df = df[valid_cols]

    # Drop rows where violation_text is empty
    df = df.dropna(subset=['violation_text'])
    df = df[df['violation_text'].str.strip() != '']

    # Fill NaN and convert all to string
    df = df.fillna('')
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip()

    # Add unique id
    records = df.to_dict('records')
    for rec in records:
        rec['id'] = str(uuid.uuid4())
        # Normalize Y/N fields
        for field in ['oos_value', 'critical', 'level_iii', 'level_vi', 'intermodal', 'pretrip', 'shipper']:
            val = rec.get(field, '').upper()
            if val not in ('Y', 'N', 'X'):
                rec[field] = 'N'

    if records:
        await db.violations.drop()
        await db.violations.insert_many(records)
        logger.info(f"Loaded {len(records)} violations into DB")
        # Recreate text index
        await db.violations.create_index([
            ("violation_text", "text"),
            ("regulatory_reference", "text"),
            ("violation_code", "text"),
            ("violation_category", "text"),
        ])


# API Routes

@api_router.get("/violations", response_model=ViolationSearchResponse)
async def search_violations(
    keyword: str = Query("", description="Keyword search in violation text, regulatory reference, violation code"),
    violation_class: str = Query("", description="Filter by violation class"),
    violation_category: str = Query("", description="Filter by violation category"),
    reg_base: str = Query("", description="Filter by regulation base section"),
    oos: str = Query("", description="Filter by OOS value (Y/N)"),
    hazmat: str = Query("", description="Filter hazmat only (Y=only hazmat, N=exclude hazmat)"),
    level_iii: str = Query("", description="Filter by Level III (Y/N)"),
    critical: str = Query("", description="Filter by Critical (Y/N)"),
    sort_by: str = Query("", description="Sort by field name"),
    sort_dir: str = Query("asc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    query = {}

    # Keyword search - use regex for partial matching
    if keyword.strip():
        escaped = re.escape(keyword.strip())
        query["$or"] = [
            {"violation_text": {"$regex": escaped, "$options": "i"}},
            {"regulatory_reference": {"$regex": escaped, "$options": "i"}},
            {"violation_code": {"$regex": escaped, "$options": "i"}},
            {"violation_category": {"$regex": escaped, "$options": "i"}},
            {"cfr_part": {"$regex": escaped, "$options": "i"}},
        ]

    if violation_class:
        query["violation_class"] = violation_class
    if violation_category:
        query["violation_category"] = violation_category
    if reg_base:
        escaped_base = re.escape(reg_base)
        query["regulatory_reference"] = {"$regex": f"^{escaped_base}", "$options": "i"}
    if oos:
        query["oos_value"] = oos.upper()
    if hazmat == "Y":
        query["violation_class"] = "Hazardous Materials"
    elif hazmat == "N":
        query["violation_class"] = {"$ne": "Hazardous Materials"}
    if level_iii:
        query["level_iii"] = level_iii.upper()
    if critical:
        query["critical"] = critical.upper()

    total = await db.violations.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Sorting
    sort_field_map = {
        "regulatory_reference": "regulatory_reference",
        "violation_text": "violation_text",
        "violation_class": "violation_class",
        "oos": "oos_value",
        "level_iii": "level_iii",
        "critical": "critical",
        "violation_code": "violation_code",
        "cfr_part": "cfr_part",
    }
    sort_options = []
    if sort_by and sort_by in sort_field_map:
        direction = -1 if sort_dir == "desc" else 1
        sort_options.append((sort_field_map[sort_by], direction))

    cursor = db.violations.find(query, {"_id": 0}).skip(skip).limit(page_size)
    if sort_options:
        cursor = cursor.sort(sort_options)
    results = await cursor.to_list(page_size)

    return ViolationSearchResponse(
        violations=[Violation(**r) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@api_router.get("/violations/filters", response_model=FilterOptions)
async def get_filter_options():
    violation_classes = await db.violations.distinct("violation_class")
    violation_categories = await db.violations.distinct("violation_category")
    cfr_parts = await db.violations.distinct("cfr_part")
    oos_values = await db.violations.distinct("oos_value")

    return FilterOptions(
        violation_classes=sorted([v for v in violation_classes if v]),
        violation_categories=sorted([v for v in violation_categories if v]),
        cfr_parts=sorted([v for v in cfr_parts if v]),
        oos_values=sorted([v for v in oos_values if v]),
    )


@api_router.get("/violations/tree")
async def get_violation_tree():
    # 3-level tree: class → category → regulation section with labels
    # First get section labels from violation text subject prefixes
    label_pipeline = [
        {"$addFields": {
            "reg_base": {"$arrayElemAt": [{"$split": ["$regulatory_reference", "("]}, 0]},
            "subject": {"$arrayElemAt": [{"$split": ["$violation_text", " - "]}, 0]}
        }},
        {"$group": {
            "_id": {"reg_base": "$reg_base"},
            "label": {"$first": "$subject"},
        }}
    ]
    label_results = await db.violations.aggregate(label_pipeline).to_list(2000)
    reg_labels = {}
    for lr in label_results:
        base = (lr["_id"].get("reg_base") or "").strip()
        label = (lr.get("label") or "").strip()
        if base and label:
            # Truncate long labels
            if len(label) > 35:
                label = label[:32] + "..."
            reg_labels[base] = label

    # Main tree aggregation
    pipeline = [
        {"$addFields": {
            "reg_base": {"$arrayElemAt": [{"$split": ["$regulatory_reference", "("]}, 0]}
        }},
        {"$group": {
            "_id": {
                "violation_class": "$violation_class",
                "violation_category": "$violation_category",
                "reg_base": "$reg_base",
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.violation_class": 1, "_id.violation_category": 1, "_id.reg_base": 1}}
    ]
    results = await db.violations.aggregate(pipeline).to_list(2000)

    tree = {}
    for r in results:
        cls = r["_id"]["violation_class"]
        cat = r["_id"]["violation_category"]
        reg = (r["_id"].get("reg_base") or "").strip()
        if not cls:
            continue

        # Merge Motor Carrier HOS into Driver
        if cls == "Motor Carrier" and "hours" in cat.lower():
            cls = "Driver"

        if cls not in tree:
            tree[cls] = {"count": 0, "categories": {}}
        tree[cls]["count"] += r["count"]
        if cat not in tree[cls]["categories"]:
            tree[cls]["categories"][cat] = {"count": 0, "sections": []}
        tree[cls]["categories"][cat]["count"] += r["count"]
        if reg:
            label = reg_labels.get(reg, "")
            tree[cls]["categories"][cat]["sections"].append({
                "ref": reg, "count": r["count"], "label": label
            })

    # Merge duplicate sections within a category (from class merging)
    for cls in tree:
        for cat_name in tree[cls]["categories"]:
            sections = tree[cls]["categories"][cat_name]["sections"]
            merged = {}
            for s in sections:
                if s["ref"] in merged:
                    merged[s["ref"]]["count"] += s["count"]
                else:
                    merged[s["ref"]] = dict(s)
            tree[cls]["categories"][cat_name]["sections"] = list(merged.values())

    # Convert to sorted result
    result = {}
    for cls in tree:
        cats = []
        for cat_name in sorted(tree[cls]["categories"].keys()):
            cat_data = tree[cls]["categories"][cat_name]
            cat_data["sections"].sort(key=lambda x: x["ref"])
            cats.append({"name": cat_name, "count": cat_data["count"], "sections": cat_data["sections"]})
        result[cls] = {"count": tree[cls]["count"], "categories": cats}

    return {"tree": result}



@api_router.post("/violations/smart-search", response_model=SmartSearchResponse)
async def smart_search(request: SmartSearchRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    query_text = request.query.strip()
    if not query_text:
        return SmartSearchResponse(violations=[], total=0, expanded_terms=[], original_query=query_text)

    api_key = os.environ.get('EMERGENT_LLM_KEY', '')

    # Gather context: unique violation categories and sample violation texts
    categories = await db.violations.distinct("violation_category")
    cat_list = ", ".join(sorted([c for c in categories if c])[:30])

    # Get a sample of violation texts for context
    sample_pipeline = [{"$sample": {"size": 30}}, {"$project": {"_id": 0, "regulatory_reference": 1, "violation_text": 1, "cfr_part": 1}}]
    samples = await db.violations.aggregate(sample_pipeline).to_list(30)
    sample_text = "\n".join([f"- {s.get('regulatory_reference','')} (CFR {s.get('cfr_part','')}): {s.get('violation_text','')[:120]}" for s in samples])

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"smart-search-{uuid.uuid4()}",
            system_message=f"""You are an expert search assistant for FMCSA roadside inspection violations under 49 CFR (Code of Federal Regulations, Title 49 - Transportation).

Your job: given a user's search query, generate 8-15 specific keywords, phrases, CFR section numbers, and regulatory terms that would match relevant violations in a database.

USE YOUR KNOWLEDGE OF 49 CFR TO EXPAND SEARCHES:
- If someone searches "brakes", include specific CFR sections like "393.40", "393.42", "393.45", "393.47", "393.48" and terms like "air brake", "hydraulic brake", "parking brake", "brake hose", "brake drum", "brake adjustment", "pushrod"
- If someone searches "tires", include "393.75", "tread depth", "flat tire", "tire inflation", "sidewall", "recap"
- If someone searches "lights", include "393.9", "393.11", "393.17", "393.24", "393.25", "turn signal", "clearance lamp", "reflector", "headlamp"
- If someone searches "hours of service" or "fatigue", include "395.3", "395.8", "driving time", "logbook", "ELD", "record of duty"
- If someone searches "hazmat" or "dangerous goods", include "171", "172", "173", "177", "178", "placarding", "shipping papers", "markings", "packaging"
- If someone searches "weight" or "overweight", include "392.2", "gross weight", "axle weight", "bridge formula"
- If someone searches "CDL" or "license", include "383", "endorsement", "restriction", "medical certificate"

VIOLATION CATEGORIES IN THE DATABASE: {cat_list}

SAMPLE VIOLATIONS FOR CONTEXT:
{sample_text}

Return ONLY a JSON array of strings. Include a mix of:
1. Plain English terms and synonyms
2. Specific CFR section numbers (e.g., "393.48", "395.8")  
3. Regulatory phrases from the actual CFR text
4. Common abbreviations (e.g., "CMV", "HM", "OOS", "ELD")

Example output: ["brake", "air brake system", "393.40", "393.48", "pushrod", "brake adjustment", "stopping distance", "hydraulic"]"""
        ).with_model("openai", "gpt-4.1-mini")

        user_msg = UserMessage(text=f"Search query: {query_text}")
        response = await chat.send_message(user_msg)

        # Parse the response
        import json
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        expanded_terms = json.loads(clean)

        if not isinstance(expanded_terms, list):
            expanded_terms = [query_text]

    except Exception as e:
        logger.error(f"Smart search LLM error: {e}")
        expanded_terms = [query_text]

    # Build regex OR query from expanded terms
    regex_parts = []
    for term in expanded_terms:
        escaped = re.escape(str(term).strip())
        if escaped:
            regex_parts.append(escaped)

    if not regex_parts:
        regex_parts = [re.escape(query_text)]

    combined_regex = "|".join(regex_parts)

    mongo_query = {
        "$or": [
            {"violation_text": {"$regex": combined_regex, "$options": "i"}},
            {"regulatory_reference": {"$regex": combined_regex, "$options": "i"}},
            {"violation_code": {"$regex": combined_regex, "$options": "i"}},
            {"violation_category": {"$regex": combined_regex, "$options": "i"}},
            {"cfr_part": {"$regex": combined_regex, "$options": "i"}},
        ]
    }

    # Apply filters on top of AI search
    if request.violation_class:
        mongo_query["violation_class"] = request.violation_class
    if request.violation_category:
        mongo_query["violation_category"] = request.violation_category
    if request.reg_base:
        escaped_base = re.escape(request.reg_base)
        mongo_query["regulatory_reference"] = {"$regex": f"^{escaped_base}", "$options": "i"}
    if request.hazmat == "Y":
        mongo_query["violation_class"] = "Hazardous Materials"
    elif request.hazmat == "N":
        mongo_query["violation_class"] = {"$ne": "Hazardous Materials"}
    if request.oos:
        mongo_query["oos_value"] = request.oos.upper()
    if request.level_iii:
        mongo_query["level_iii"] = request.level_iii.upper()
    if request.critical:
        mongo_query["critical"] = request.critical.upper()

    total = await db.violations.count_documents(mongo_query)
    cursor = db.violations.find(mongo_query, {"_id": 0}).limit(100)
    results = await cursor.to_list(100)

    return SmartSearchResponse(
        violations=[Violation(**r) for r in results],
        total=total,
        expanded_terms=expanded_terms,
        original_query=query_text,
    )


@api_router.post("/violations/upload")
async def upload_violations(file: UploadFile = File(...)):
    import io
    import pandas as pd

    if not file.filename.endswith(('.xlsx', '.xls')):
        return {"error": "Please upload an Excel file (.xlsx or .xls)"}

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), sheet_name='Current Violations', header=4)
        await _load_dataframe(df)
        count = await db.violations.count_documents({})
        return {"message": f"Successfully loaded {count} violations", "count": count}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return {"error": str(e)}


@api_router.get("/violations/stats")
async def get_stats():
    total = await db.violations.count_documents({})
    oos_count = await db.violations.count_documents({"oos_value": "Y"})
    hazmat_count = await db.violations.count_documents({"violation_class": "Hazardous Materials"})
    level_iii_count = await db.violations.count_documents({"level_iii": "Y"})

    pipeline = [
        {"$group": {"_id": "$violation_class", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    class_counts = await db.violations.aggregate(pipeline).to_list(10)

    return {
        "total": total,
        "oos_count": oos_count,
        "hazmat_count": hazmat_count,
        "level_iii_count": level_iii_count,
        "by_class": {item["_id"]: item["count"] for item in class_counts if item["_id"]},
    }


@api_router.get("/violations/{violation_id}/similar")
async def get_similar_violations(violation_id: str):
    source = await db.violations.find_one({"id": violation_id}, {"_id": 0})
    if not source:
        return {"violations": [], "total": 0}

    vio_text = source.get("violation_text", "")

    # Extract the subject/topic from the violation text
    # Patterns: "Tires - ...", "Brake - ...", "Coupling - ...", "HM (General Packaging) - ..."
    subject = ""
    if " - " in vio_text:
        subject = vio_text.split(" - ", 1)[0].strip()

    results = []
    seen_ids = {violation_id}

    # 1st pass: same subject prefix (e.g., all "Tires" or all "Brake" violations)
    if subject:
        escaped_subject = re.escape(subject)
        subject_query = {
            "id": {"$ne": violation_id},
            "violation_text": {"$regex": f"^{escaped_subject}\\s*-", "$options": "i"},
        }
        subject_results = await db.violations.find(subject_query, {"_id": 0}).limit(20).to_list(20)
        for r in subject_results:
            if r["id"] not in seen_ids:
                results.append(r)
                seen_ids.add(r["id"])

    # 2nd pass: keyword match from violation text across all violations
    if len(results) < 20:
        stop_words = {'the', 'and', 'for', 'not', 'with', 'that', 'this', 'from', 'are', 'was',
                      'has', 'have', 'been', 'being', 'any', 'all', 'each', 'every', 'other',
                      'than', 'more', 'which', 'when', 'where', 'who', 'failing', 'failure',
                      'operating', 'required', 'vehicle', 'driver', 'motor', 'carrier'}
        words = re.findall(r'[a-zA-Z]{4,}', vio_text.lower())
        keywords = list(dict.fromkeys(w for w in words if w not in stop_words))[:6]
        if keywords:
            keyword_regex = "|".join(re.escape(k) for k in keywords)
            keyword_query = {
                "id": {"$nin": list(seen_ids)},
                "violation_text": {"$regex": keyword_regex, "$options": "i"},
            }
            keyword_results = await db.violations.find(keyword_query, {"_id": 0}).limit(20 - len(results)).to_list(20 - len(results))
            for r in keyword_results:
                if r["id"] not in seen_ids:
                    results.append(r)
                    seen_ids.add(r["id"])

    total = len(results)

    return {
        "violations": [Violation(**r) for r in results],
        "total": total,
        "source": Violation(**source),
    }



# ========== INSPECTION ENDPOINTS ==========

@api_router.post("/inspections")
async def create_inspection(req: CreateInspectionRequest):
    now = datetime.now(timezone.utc).isoformat()
    inspection = {
        "id": str(uuid.uuid4()),
        "title": req.title or f"Inspection {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        "notes": "",
        "created_at": now,
        "updated_at": now,
        "items": [],
    }
    await db.inspections.insert_one(inspection)
    inspection.pop("_id", None)
    return inspection


@api_router.get("/inspections")
async def list_inspections():
    results = await db.inspections.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"inspections": results}


@api_router.get("/inspections/{inspection_id}")
async def get_inspection(inspection_id: str):
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return doc


@api_router.put("/inspections/{inspection_id}")
async def update_inspection(inspection_id: str, req: UpdateInspectionRequest):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if req.title is not None:
        updates["title"] = req.title
    if req.notes is not None:
        updates["notes"] = req.notes
    result = await db.inspections.update_one({"id": inspection_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    return doc


@api_router.delete("/inspections/{inspection_id}")
async def delete_inspection(inspection_id: str):
    result = await db.inspections.delete_one({"id": inspection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {"message": "Inspection deleted"}


@api_router.post("/inspections/{inspection_id}/violations")
async def add_violation_to_inspection(inspection_id: str, req: AddViolationRequest):
    item = {
        "item_id": str(uuid.uuid4()),
        "violation_id": req.violation_id,
        "regulatory_reference": req.regulatory_reference,
        "violation_text": req.violation_text,
        "violation_class": req.violation_class,
        "violation_code": req.violation_code,
        "cfr_part": req.cfr_part,
        "oos_value": req.oos_value,
        "notes": "",
        "photos": [],
    }
    result = await db.inspections.update_one(
        {"id": inspection_id},
        {"$push": {"items": item}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return item


@api_router.delete("/inspections/{inspection_id}/violations/{item_id}")
async def remove_violation_from_inspection(inspection_id: str, item_id: str):
    result = await db.inspections.update_one(
        {"id": inspection_id},
        {"$pull": {"items": {"item_id": item_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {"message": "Violation removed"}


@api_router.put("/inspections/{inspection_id}/violations/{item_id}/notes")
async def update_item_notes(inspection_id: str, item_id: str, req: UpdateItemNotesRequest):
    result = await db.inspections.update_one(
        {"id": inspection_id, "items.item_id": item_id},
        {"$set": {"items.$.notes": req.notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Notes updated"}


@api_router.post("/inspections/{inspection_id}/violations/{item_id}/photos")
async def upload_photo(inspection_id: str, item_id: str, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    storage_path = f"{APP_NAME}/inspections/{inspection_id}/{item_id}/{uuid.uuid4()}.{ext}"

    try:
        result = put_object(storage_path, data, file.content_type)
    except Exception as e:
        logger.error(f"Photo upload failed: {e}")
        raise HTTPException(status_code=500, detail="Photo upload failed")

    photo = {
        "photo_id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.inspections.update_one(
        {"id": inspection_id, "items.item_id": item_id},
        {"$push": {"items.$.photos": photo}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return photo


@api_router.delete("/inspections/{inspection_id}/violations/{item_id}/photos/{photo_id}")
async def delete_photo(inspection_id: str, item_id: str, photo_id: str):
    await db.inspections.update_one(
        {"id": inspection_id, "items.item_id": item_id},
        {"$pull": {"items.$.photos": {"photo_id": photo_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Photo removed"}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


@api_router.get("/inspections/{inspection_id}/export", response_class=HTMLResponse)
async def export_inspection(inspection_id: str, include_photos: str = Query("N")):
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    items_html = ""
    for item in doc.get("items", []):
        oos_badge = '<span style="background:#DC2626;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">OOS</span>' if item.get("oos_value") == "Y" else ""
        photos_html = ""
        if include_photos.upper() == "Y":
            for photo in item.get("photos", []):
                try:
                    photo_data, ct = get_object(photo["storage_path"])
                    import base64
                    b64 = base64.b64encode(photo_data).decode()
                    photos_html += f'<img src="data:{ct};base64,{b64}" style="max-width:300px;max-height:200px;margin:8px 4px;border-radius:4px;border:1px solid #ddd;" />'
                except Exception:
                    photos_html += f'<p style="color:#999;font-size:12px;">[Photo unavailable: {photo.get("original_filename", "")}]</p>'

        notes_html = f'<p style="color:#64748B;font-size:13px;margin-top:6px;"><strong>Notes:</strong> {item.get("notes", "")}</p>' if item.get("notes") else ""

        items_html += f'''
        <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
            <div style="margin-bottom:8px;">
                <strong style="color:#002855;font-size:15px;">{item.get("regulatory_reference", "")}</strong>
                {oos_badge}
                <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:4px;">{item.get("violation_class", "")}</span>
            </div>
            <p style="font-size:14px;color:#334155;margin:4px 0;">{item.get("violation_text", "")}</p>
            <p style="font-size:12px;color:#94A3B8;margin:2px 0;">Code: {item.get("violation_code", "")} | CFR: {item.get("cfr_part", "")}</p>
            {notes_html}
            {f'<div style="margin-top:8px;">{photos_html}</div>' if photos_html else ""}
        </div>'''

    html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{doc.get("title", "Inspection Report")}</title>
<style>body{{font-family:'IBM Plex Sans',Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#0F172A;}}
@media print{{body{{padding:0;}}button{{display:none!important;}}}}</style></head>
<body>
<div style="background:#002855;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:20px;">{doc.get("title", "Inspection Report")}</h1>
    <p style="margin:4px 0 0;font-size:12px;opacity:0.7;">Created: {doc.get("created_at", "")[:16].replace("T", " ")} | Violations: {len(doc.get("items", []))}</p>
</div>
{f'<div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;color:#334155;"><strong>Notes:</strong> {doc.get("notes", "")}</div>' if doc.get("notes") else ""}
{items_html}
<div style="text-align:center;margin-top:24px;padding:16px;">
    <button onclick="window.print()" style="background:#002855;color:white;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
</div>
</body></html>'''

    return HTMLResponse(content=html)


@api_router.get("/")
async def root():
    return {"message": "SafeSpect Violation Navigator API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
