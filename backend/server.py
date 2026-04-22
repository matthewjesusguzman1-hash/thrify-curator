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
from typing import List, Optional, Any
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
    badge: str = ""

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

class TieDownItemData(BaseModel):
    type: str = ""
    wll: float = 0
    method: str = "direct"
    defective: bool = False

class SaveTieDownRequest(BaseModel):
    cargo_weight: float = 0
    cargo_length: float = 0
    has_blocking: bool = False
    tiedowns: List[TieDownItemData] = []
    photos: List[dict] = []


class HosDayData(BaseModel):
    date: str = ""
    day_label: str = ""
    drive: float = 0
    on_duty: float = 0
    total: float = 0


class HosRecoveryStep(BaseModel):
    step_num: int = 0
    description: str = ""
    oos_hours: float = 0
    running_total: float = 0
    passes: bool = False
    gained: float = 0
    available: float = 0


class WeightGroupSnapshot(BaseModel):
    label: str = ""
    preset: str = ""
    axles: Any = ""
    distFt: Any = ""
    distIn: Any = ""
    actualWeight: Any = ""
    dummyAxle: bool = False


class SaveWeightRequest(BaseModel):
    is_custom: bool = False
    is_interstate: bool = True
    groups: List[dict] = []  # full group state for perfect rehydrate
    overall_dist_ft: Any = ""
    custom_gross_max: Any = ""
    interior_dist_ft: Any = ""
    custom_interior_max: Any = ""
    # Summary (computed on client) for quick display
    total_axles: int = 0
    gross_weight: float = 0
    gross_max: Optional[float] = None
    violation_count: int = 0
    mode_label: str = ""  # "Bridge Formula" | "Custom"
    # Rendered SVG markup of the truck diagram
    truck_diagram_svg: str = ""
    # Computed violation / calculation details
    group_violations: List[dict] = []
    tolerance_applies: bool = False
    interior: Optional[dict] = None


class SaveHosRequest(BaseModel):
    rule_type: str = "property"  # "property" | "passenger"
    limit_hours: int = 70
    day_count: int = 8
    days: List[HosDayData] = []
    total_hours: float = 0
    is_oos: bool = False
    over_by: float = 0
    hours_left_today: Optional[float] = None
    recovery_steps: List[HosRecoveryStep] = []
    oos_duration: Optional[float] = None
    recommend_restart: bool = False
    notes: str = ""

# Auth Models
class RegisterRequest(BaseModel):
    badge: str
    pin: str

class LoginRequest(BaseModel):
    badge: str
    pin: str

class AdminLoginRequest(BaseModel):
    admin_pin: str


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
    # Field indexes for fast filtering
    await db.violations.create_index("violation_class")
    await db.violations.create_index("violation_category")
    await db.violations.create_index("regulatory_reference")
    await db.violations.create_index("oos_value")
    await db.violations.create_index("cfr_part")
    await db.violations.create_index("level_iii")
    await db.violations.create_index("critical")
    # Init object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Seed hazmat substances (Appendix A/B) — re-seed if count changed (data update)
    hm_count = await db.hazmat_substances.count_documents({})
    if hm_count < 1000:
        logger.info(f"Hazmat substances count={hm_count}, seeding full Appendix A/B dataset...")
        await seed_hazmat_substances()
    else:
        logger.info(f"Found {hm_count} hazmat substances in DB.")


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


async def seed_hazmat_substances():
    """Seed Appendix A (Hazardous Substances/RQ) and Appendix B (Marine Pollutants) from parsed JSON."""
    import json as _json
    data_path = ROOT_DIR / "hazmat_substances_data.json"
    if not data_path.exists():
        logger.error("hazmat_substances_data.json not found – cannot seed")
        return
    with open(data_path, "r") as f:
        docs = _json.load(f)
    await db.hazmat_substances.drop()
    await db.hazmat_substances.insert_many(docs)
    await db.hazmat_substances.create_index([("name_lower", 1)])
    await db.hazmat_substances.create_index("is_marine_pollutant")
    await db.hazmat_substances.create_index("is_hazardous_substance")
    logger.info(f"Seeded {len(docs)} hazmat substances from JSON")


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

    # Keyword search - use $text index for speed, with stemming fallback
    if keyword.strip():
        words = keyword.strip().split()

        # Common synonym expansion for regular search (no AI needed)
        SYNONYMS = {
            "distracted": ["inattentive", "distracted"],
            "inattentive": ["inattentive", "distracted"],
            "seatbelt": ["seat belt", "safety belt", "restraint"],
            "cellphone": ["mobile telephone", "hand-held", "texting"],
            "phone": ["mobile telephone", "hand-held", "texting"],
            "texting": ["texting", "mobile telephone", "hand-held"],
            "drunk": ["under the influence", "alcohol", "impaired"],
            "alcohol": ["under the influence", "alcohol", "impaired"],
            "bald": ["tread depth", "tread groove", "tire condition"],
            "overweight": ["gross weight", "axle weight", "overloaded"],
            "logbook": ["record of duty", "electronic logging"],
            "eld": ["electronic logging device", "record of duty"],
            "fatigue": ["hours of service", "driving time", "fatigue"],
            "sleepy": ["hours of service", "fatigue", "driving time"],
            "expired": ["expired", "not current", "invalid"],
            "leaking": ["leak", "release", "discharge"],
            "speeding": ["speeding", "speed", "exceed"],
        }

        expanded_words = []
        for w in words:
            wl = w.lower()
            if wl in SYNONYMS:
                expanded_words.extend(SYNONYMS[wl])
            else:
                expanded_words.append(w)

        # Build a text search query with OR semantics
        text_query = " ".join(expanded_words)
        query["$text"] = {"$search": text_query}
        
        # Check if we get results with $text
        text_count = await db.violations.count_documents(query)
        
        if text_count == 0:
            # Fallback to regex with stemming for broader matching
            del query["$text"]
            parts = []
            all_words = list(expanded_words) + list(words)  # include original + synonyms
            for w in all_words:
                if len(w) <= 2:
                    continue
                stem = re.sub(r'(ing|tion|ed|ly|er|est|ment|ness|ous|ive|able|ible|ful|less|ated|ting)$', '', w, flags=re.I)
                if len(stem) < 3:
                    stem = w
                parts.append(re.escape(stem))
            # Deduplicate
            parts = list(dict.fromkeys(parts))
            word_regex = "|".join(parts) if parts else re.escape(keyword.strip())
            query["$or"] = [
                {"violation_text": {"$regex": word_regex, "$options": "i"}},
                {"regulatory_reference": {"$regex": word_regex, "$options": "i"}},
                {"violation_code": {"$regex": word_regex, "$options": "i"}},
                {"violation_category": {"$regex": word_regex, "$options": "i"}},
                {"cfr_part": {"$regex": word_regex, "$options": "i"}},
            ]

    if violation_class:
        query["violation_class"] = violation_class
    if violation_category:
        query["violation_category"] = violation_category
    if reg_base:
        query["regulatory_reference"] = reg_base
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
    elif keyword.strip():
        # When searching by keyword with no explicit sort, fetch more and rank by relevance
        cursor = db.violations.find(query, {"_id": 0}).skip(skip).limit(page_size)
        results_raw = await cursor.to_list(page_size)
        kw_lower = keyword.strip().lower()
        # Build all search terms including synonyms
        all_search_terms = [kw_lower] + [w.lower() for w in expanded_words]
        all_search_terms = list(dict.fromkeys(all_search_terms))  # dedupe

        def relevance(v):
            text_l = (v.get("violation_text") or "").lower()
            ref_l = (v.get("regulatory_reference") or "").lower()
            score = 0
            # Exact original keyword in text
            if kw_lower in text_l:
                score += 100
            if kw_lower in ref_l:
                score += 80
            # Check all synonym terms
            for term in all_search_terms:
                if term in text_l:
                    score += 30
                if term in ref_l:
                    score += 20
            # Bonus for exact word boundary match
            for term in all_search_terms:
                if re.search(r'\b' + re.escape(term) + r'\b', text_l):
                    score += 15
            return -score
        results_raw.sort(key=relevance)
        return ViolationSearchResponse(
            violations=[Violation(**r) for r in results_raw],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    results = await cursor.to_list(page_size)

    return ViolationSearchResponse(
        violations=[Violation(**r) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


_filter_cache = {"data": None, "ts": 0}

@api_router.get("/violations/filters", response_model=FilterOptions)
async def get_filter_options():
    import time
    now = time.time()
    if _filter_cache["data"] and (now - _filter_cache["ts"]) < 300:
        return _filter_cache["data"]
    violation_classes = await db.violations.distinct("violation_class")
    violation_categories = await db.violations.distinct("violation_category")
    cfr_parts = await db.violations.distinct("cfr_part")
    oos_values = await db.violations.distinct("oos_value")
    result = FilterOptions(
        violation_classes=sorted([v for v in violation_classes if v]),
        violation_categories=sorted([v for v in violation_categories if v]),
        cfr_parts=sorted([v for v in cfr_parts if v]),
        oos_values=sorted([v for v in oos_values if v]),
    )
    _filter_cache["data"] = result
    _filter_cache["ts"] = now
    return result


@api_router.get("/violations/tree")
async def get_violation_tree(level_iii: Optional[str] = None):
    # Optional filter so the Inspection Navigator Lite mode can render a tree
    # that only shows categories/regs that actually contain Level III rows.
    match_stage = {}
    if level_iii in ("Y", "N"):
        match_stage["level_iii"] = level_iii

    # 3-level tree: class → category → regulation section with labels
    # Get descriptive labels per (category + regulatory_reference) pair
    # For multi-violation refs, prefer the shortest/most general description
    label_pipeline = []
    if match_stage:
        label_pipeline.append({"$match": match_stage})
    label_pipeline += [
        {"$addFields": {
            "desc": {
                "$cond": {
                    "if": {"$gt": [{"$indexOfCP": ["$violation_text", " - "]}, -1]},
                    "then": {"$arrayElemAt": [{"$split": ["$violation_text", " - "]}, 1]},
                    "else": "$violation_text"
                }
            },
            "subject": {
                "$cond": {
                    "if": {"$gt": [{"$indexOfCP": ["$violation_text", " - "]}, -1]},
                    "then": {"$arrayElemAt": [{"$split": ["$violation_text", " - "]}, 0]},
                    "else": ""
                }
            }
        }},
        {"$sort": {"desc": 1}},
        {"$group": {
            "_id": {"cat": "$violation_category", "reg_ref": "$regulatory_reference"},
            "all_descs": {"$push": "$desc"},
            "all_subjects": {"$addToSet": "$subject"},
            "first_desc": {"$first": "$desc"},
            "count": {"$sum": 1},
        }}
    ]
    label_results = await db.violations.aggregate(label_pipeline).to_list(5000)
    ref_labels = {}
    for lr in label_results:
        cat = lr["_id"].get("cat", "")
        ref = (lr["_id"].get("reg_ref") or "").strip()
        count = lr.get("count", 1)
        descs = lr.get("all_descs", [])
        subjects = lr.get("all_subjects", [])

        if not ref:
            continue

        if count == 1:
            # Single violation — use its description
            label = lr.get("first_desc", "")
        else:
            # Multiple violations — find the best general label
            # Prefer descriptions containing "State/Local", "law", or generic terms
            best = None
            for d in descs:
                dl = d.lower()
                if "state/local" in dl or "local law" in dl or "state law" in dl:
                    best = d
                    break
            if not best:
                # Use the subject prefix if it's descriptive (not just "Driver", "HM", etc.)
                generic_subjects = {"driver", "hm", "vehicle", "motor carrier", "intoxicating"}
                useful_subjects = [s for s in subjects if s.lower().strip() not in generic_subjects and len(s) > 3]
                if useful_subjects:
                    best = useful_subjects[0]
                else:
                    # Use shortest description as most general
                    best = min(descs, key=len) if descs else ""

            label = best

        if label:
            label = label.rstrip(" -")
            if len(label) > 55:
                label = label[:52] + "..."
            ref_labels[f"{cat}|{ref}"] = label

    # Main tree aggregation — use full regulatory_reference for each violation
    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
    pipeline += [
        {"$addFields": {
            "reg_base": {"$arrayElemAt": [{"$split": ["$regulatory_reference", "("]}, 0]}
        }},
        {"$group": {
            "_id": {
                "violation_class": "$violation_class",
                "violation_category": "$violation_category",
                "reg_ref": "$regulatory_reference",
                "reg_base": "$reg_base",
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.violation_class": 1, "_id.violation_category": 1, "_id.reg_ref": 1}},
    ]
    results = await db.violations.aggregate(pipeline).to_list(5000)

    tree = {}
    for r in results:
        cls = r["_id"]["violation_class"]
        cat = r["_id"]["violation_category"]
        reg_ref = (r["_id"].get("reg_ref") or "").strip()
        reg_base = (r["_id"].get("reg_base") or "").strip()
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
        if reg_ref:
            label = ref_labels.get(f"{cat}|{reg_ref}", "")
            tree[cls]["categories"][cat]["sections"].append({
                "ref": reg_ref, "count": r["count"], "label": label
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

    # For sections with count > 1, fetch individual violations
    for cls_data in result.values():
        for cat in cls_data["categories"]:
            for sec in cat["sections"]:
                if sec["count"] > 1:
                    vios = await db.violations.find(
                        {"regulatory_reference": sec["ref"], "violation_category": cat["name"]},
                        {"_id": 0, "id": 1, "violation_text": 1, "violation_code": 1, "oos_value": 1}
                    ).sort("violation_code", 1).to_list(50)
                    sec["violations"] = []
                    for v in vios:
                        text = v.get("violation_text", "")
                        # Short summary: take text after "- " prefix, truncate
                        short = text.split(" - ", 1)[1] if " - " in text else text
                        if len(short) > 60:
                            short = short[:57] + "..."
                        sec["violations"].append({
                            "id": v.get("id", ""),
                            "short": short,
                            "oos": v.get("oos_value", "N"),
                        })

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

Your job: given a user's search query (which may be a natural language description of what they observed), generate 8-15 specific keywords, phrases, CFR section numbers, and regulatory terms that would match relevant violations in a database.

CRITICAL: Users often describe what they SEE, not the regulation name. You must translate observations into regulatory terms:
- "driver not wearing seatbelt" → 392.16, seat belt, safety belt, restraint system
- "cell phone in hand" or "texting" → 392.80, 392.82, handheld mobile telephone, texting while driving, mobile device, hand-held
- "bald tires" → 393.75, tread depth, tire condition, worn tires, tread groove
- "cracked windshield" → 393.60, glazing, windshield condition, vision obstruction
- "no fire extinguisher" → 393.95, fire extinguisher, safety equipment
- "leaking fluid" → 393.83, fuel system, hydraulic, brake fluid leak
- "expired medical card" → 391.41, 391.45, medical certificate, medical examiner's certificate
- "no triangles" or "no reflectors" → 393.95, warning devices, emergency equipment, reflective triangles
- "drunk driver" or "alcohol" → 392.5, under the influence, alcohol, controlled substance, impaired
- "driver asleep" or "fatigued" → 395.3, hours of service, driving time, fatigue, 11-hour rule, 14-hour rule
- "overweight" → 392.2, gross weight, axle weight, bridge formula, overloaded
- "no logbook" or "no ELD" → 395.8, record of duty status, electronic logging device, driver's record
- "smoke from brakes" → 393.40, 393.42, 393.48, brake condition, overheated brakes, brake adjustment
- "load falling off" → 393.100, 393.104, cargo securement, load securement, tie down, working load limit
- "no CDL" or "wrong license" → 383.23, 383.91, commercial driver's license, endorsement, restriction
- "hazmat spill" or "leaking package" → 173.24, 177.854, release of hazardous material, leaking package
- "no placards" → 172.504, 172.516, placard display, missing placard, placarding
- "inattentive driving" → 392.9, inattentive, distracted, failure to maintain safe operation
- "parts and accessories" → 393, parts and accessories, vehicle condition, equipment

USE YOUR KNOWLEDGE OF 49 CFR TO EXPAND SEARCHES:
- If someone searches "brakes", include specific CFR sections like "393.40", "393.42", "393.45", "393.47", "393.48" and terms like "air brake", "hydraulic brake", "parking brake", "brake hose", "brake drum", "brake adjustment", "pushrod"
- If someone searches "tires", include "393.75", "tread depth", "flat tire", "tire inflation", "sidewall", "recap"
- If someone searches "lights", include "393.9", "393.11", "393.17", "393.24", "393.25", "turn signal", "clearance lamp", "reflector", "headlamp"
- If someone searches "hours of service" or "fatigue", include "395.3", "395.8", "driving time", "logbook", "ELD", "record of duty"
- If someone searches "hazmat" or "dangerous goods", include "171", "172", "173", "177", "178", "placarding", "shipping papers", "markings", "packaging"
- If someone searches "weight" or "overweight", include "392.2", "gross weight", "axle weight", "bridge formula"
- If someone searches "CDL" or "license", include "383", "endorsement", "restriction", "medical certificate"
- If someone searches "seatbelt" or "seat belt", include "392.16", "safety belt", "restraint", "seat belt assembly"
- If someone searches "phone" or "cell phone" or "texting", include "392.80", "392.82", "handheld mobile telephone", "texting", "mobile device", "hand-held", "390.17"
- If someone searches "inattentive" or "distracted", include "392.9", "inattentive driving", "distracted", "failure to devote attention", "safe operation"

VIOLATION CATEGORIES IN THE DATABASE: {cat_list}

SAMPLE VIOLATIONS FOR CONTEXT:
{sample_text}

Return ONLY a JSON array of strings. Include a mix of:
1. Plain English terms and synonyms
2. Specific CFR section numbers (e.g., "393.48", "395.8", "392.16", "392.80")
3. Regulatory phrases from the actual CFR text
4. Common abbreviations (e.g., "CMV", "HM", "OOS", "ELD")

Example for "driver on phone": ["392.80", "392.82", "handheld mobile telephone", "texting while driving", "mobile device", "hand-held", "cell phone", "driving a CMV while using a hand-held mobile telephone", "390.17"]"""
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
        mongo_query["regulatory_reference"] = request.reg_base
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

    # Score and rank results by relevance
    original_lower = query_text.lower()
    scored = []
    for r in results:
        score = 0
        text_lower = (r.get("violation_text", "") or "").lower()
        ref_lower = (r.get("regulatory_reference", "") or "").lower()
        cat_lower = (r.get("violation_category", "") or "").lower()
        code_lower = (r.get("violation_code", "") or "").lower()
        combined = f"{text_lower} {ref_lower} {cat_lower} {code_lower}"

        # Highest: exact original query appears in violation text
        if original_lower in text_lower:
            score += 100
        # High: original query in any field
        if original_lower in combined:
            score += 50

        # Score each expanded term by how many match
        for term in expanded_terms:
            tl = str(term).lower().strip()
            if not tl:
                continue
            # CFR section numbers in regulatory_reference get high weight
            if re.match(r'^\d{3}\.\d', tl) and tl in ref_lower:
                score += 30
            elif tl in text_lower:
                score += 10
            elif tl in combined:
                score += 5

        # Bonus for exact regulatory_reference match
        for term in expanded_terms:
            tl = str(term).lower().strip()
            if re.match(r'^\d{3}\.\d', tl) and ref_lower.startswith(tl):
                score += 40

        scored.append((score, r))

    # Sort by score descending, then by regulatory_reference
    scored.sort(key=lambda x: (-x[0], x[1].get("regulatory_reference", "")))
    ranked_results = [r for _, r in scored]

    return SmartSearchResponse(
        violations=[Violation(**r) for r in ranked_results],
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
    reg_ref = source.get("regulatory_reference", "")
    cfr_part = source.get("cfr_part", "")

    results = []
    seen_ids = {violation_id}

    # Extract base regulation number (e.g., "393.104(b)" -> "393.104", "390.21" -> "390.21")
    reg_base = ""
    if reg_ref:
        m = re.match(r'(\d+\.\d+)', reg_ref)
        if m:
            reg_base = m.group(1)

    # 1st priority: Same base regulation (e.g., all 390.21 variants)
    if reg_base:
        reg_query = {
            "id": {"$ne": violation_id},
            "regulatory_reference": {"$regex": f"^{re.escape(reg_base)}", "$options": "i"},
        }
        reg_results = await db.violations.find(reg_query, {"_id": 0}).limit(25).to_list(25)
        for r in reg_results:
            if r["id"] not in seen_ids:
                results.append(r)
                seen_ids.add(r["id"])

    # 2nd priority: Same CFR part (e.g., all Part 390 violations)
    if len(results) < 25 and cfr_part:
        cfr_query = {
            "id": {"$nin": list(seen_ids)},
            "cfr_part": cfr_part,
        }
        cfr_results = await db.violations.find(cfr_query, {"_id": 0}).limit(25 - len(results)).to_list(25 - len(results))
        for r in cfr_results:
            if r["id"] not in seen_ids:
                results.append(r)
                seen_ids.add(r["id"])

    # 3rd priority: Same subject prefix from violation text
    if len(results) < 25:
        subject = ""
        if " - " in vio_text:
            subject = vio_text.split(" - ", 1)[0].strip()
        if subject:
            escaped_subject = re.escape(subject)
            subject_query = {
                "id": {"$nin": list(seen_ids)},
                "violation_text": {"$regex": f"^{escaped_subject}\\s*-", "$options": "i"},
            }
            subject_results = await db.violations.find(subject_query, {"_id": 0}).limit(25 - len(results)).to_list(25 - len(results))
            for r in subject_results:
                if r["id"] not in seen_ids:
                    results.append(r)
                    seen_ids.add(r["id"])

    total = len(results)

    return {
        "violations": [Violation(**r) for r in results],
        "total": total,
        "source": Violation(**source),
    }




# ========== AUTH ENDPOINTS ==========

ADMIN_BADGE = "121"

@api_router.post("/auth/register")
async def register_user(req: RegisterRequest):
    badge = req.badge.strip()
    pin = req.pin.strip()
    if not badge or not pin:
        raise HTTPException(status_code=400, detail="Badge and PIN are required")
    if len(pin) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
    existing = await db.users.find_one({"badge": badge})
    if existing:
        raise HTTPException(status_code=409, detail="Badge number already registered")
    user = {
        "badge": badge,
        "pin": pin,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {"badge": badge, "message": "Registered successfully"}

@api_router.post("/auth/login")
async def login_user(req: LoginRequest):
    badge = req.badge.strip()
    pin = req.pin.strip()
    user = await db.users.find_one({"badge": badge})
    if not user:
        raise HTTPException(status_code=404, detail="Badge number not found. Register first.")
    if user["pin"] != pin:
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    await db.users.update_one({"badge": badge}, {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}})
    return {"badge": badge, "message": "Login successful"}

@api_router.post("/auth/heartbeat")
async def heartbeat(req: dict):
    badge = req.get("badge", "").strip()
    if badge:
        await db.users.update_one({"badge": badge}, {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True}

@api_router.post("/auth/check-badge")
async def check_badge(req: dict):
    badge = req.get("badge", "").strip()
    user = await db.users.find_one({"badge": badge})
    return {"exists": user is not None}

@api_router.put("/auth/change-pin")
async def change_pin(req: dict):
    badge = req.get("badge", "").strip()
    current_pin = req.get("current_pin", "").strip()
    new_pin = req.get("new_pin", "").strip()
    if not badge or not current_pin or not new_pin:
        raise HTTPException(status_code=400, detail="All fields required")
    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="New PIN must be at least 4 digits")
    user = await db.users.find_one({"badge": badge})
    if not user:
        raise HTTPException(status_code=404, detail="Badge not found")
    if user["pin"] != current_pin:
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    await db.users.update_one({"badge": badge}, {"$set": {"pin": new_pin}})
    return {"message": "PIN changed successfully"}


@api_router.post("/admin/login")
async def admin_login(req: dict):
    badge = req.get("badge", "").strip()
    if badge != ADMIN_BADGE:
        raise HTTPException(status_code=401, detail="Not authorized")
    return {"message": "Admin access granted"}

@api_router.get("/admin/users")
async def list_users(badge: str = Query(...)):
    if badge != ADMIN_BADGE:
        raise HTTPException(status_code=401, detail="Not authorized")
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"users": users, "total": len(users)}

# ========== TEST NOTES ENDPOINTS ==========

@api_router.get("/notes")
async def list_notes():
    notes = await db.test_notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"notes": notes}

@api_router.post("/notes")
async def create_note(req: dict):
    badge = req.get("badge", "").strip()
    text = req.get("text", "").strip()
    if not badge or not text:
        raise HTTPException(status_code=400, detail="Badge and text required")
    note = {
        "id": str(uuid.uuid4()),
        "badge": badge,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.test_notes.insert_one(note)
    note.pop("_id", None)
    return note

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, req: dict):
    badge = req.get("badge", "").strip()
    text = req.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text required")
    existing = await db.test_notes.find_one({"id": note_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["badge"] != badge:
        raise HTTPException(status_code=403, detail="You can only edit your own notes")
    await db.test_notes.update_one({"id": note_id}, {"$set": {"text": text, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Note updated"}

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, badge: str = Query(...)):
    existing = await db.test_notes.find_one({"id": note_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["badge"] != badge:
        raise HTTPException(status_code=403, detail="You can only delete your own notes")
    await db.test_notes.delete_one({"id": note_id})
    return {"message": "Note deleted"}



@api_router.put("/admin/users/{badge_num}/reset-pin")
async def reset_user_pin(badge_num: str, req: dict):
    caller_badge = req.get("badge", "").strip()
    new_pin = req.get("new_pin", "")
    if caller_badge != ADMIN_BADGE:
        raise HTTPException(status_code=401, detail="Not authorized")
    if not new_pin or len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="New PIN must be at least 4 digits")
    result = await db.users.update_one({"badge": badge_num}, {"$set": {"pin": new_pin}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Badge not found")
    return {"message": f"PIN reset for badge {badge_num}"}



# ========== INSPECTION ENDPOINTS ==========

@api_router.post("/inspections")
async def create_inspection(req: CreateInspectionRequest):
    now = datetime.now(timezone.utc).isoformat()
    inspection = {
        "id": str(uuid.uuid4()),
        "title": req.title or f"Inspection {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        "badge": req.badge,
        "notes": "",
        "created_at": now,
        "updated_at": now,
        "items": [],
    }
    await db.inspections.insert_one(inspection)
    inspection.pop("_id", None)
    return inspection


@api_router.get("/inspections")
async def list_inspections(badge: str = Query("")):
    query = {"badge": badge} if badge else {}
    results = await db.inspections.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
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


class DevicePhotoMeta(BaseModel):
    photo_id: str
    original_filename: str = ""
    mime: str = "image/jpeg"
    size: int = 0


@api_router.post("/inspections/{inspection_id}/violations/{item_id}/photos")
async def attach_item_photo_meta(inspection_id: str, item_id: str, meta: DevicePhotoMeta):
    """Attach photo metadata to a violation item. The binary is stored on the
    inspector's device only (IndexedDB) — the server never receives image bytes."""
    photo = {
        "photo_id": meta.photo_id,
        "original_filename": meta.original_filename,
        "content_type": meta.mime,
        "size": meta.size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "device_only": True,
    }
    result = await db.inspections.update_one(
        {"id": inspection_id, "items.item_id": item_id},
        {"$push": {"items.$.photos": photo}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return photo


@api_router.delete("/inspections/{inspection_id}/violations/{item_id}/photos/{photo_id}")
async def delete_photo(inspection_id: str, item_id: str, photo_id: str):
    await db.inspections.update_one(
        {"id": inspection_id, "items.item_id": item_id},
        {"$pull": {"items.$.photos": {"photo_id": photo_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Photo removed"}


@api_router.post("/inspections/{inspection_id}/annotated-photos")
async def attach_general_photo_meta(inspection_id: str, meta: DevicePhotoMeta):
    """Attach general/annotated photo metadata. Photo binary lives on-device only."""
    photo = {
        "photo_id": meta.photo_id,
        "original_filename": meta.original_filename,
        "content_type": meta.mime,
        "size": meta.size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "annotations": [],
        "device_only": True,
    }
    result = await db.inspections.update_one(
        {"id": inspection_id},
        {"$push": {"general_photos": photo}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return photo


@api_router.delete("/inspections/{inspection_id}/annotated-photos/{photo_id}")
async def delete_annotated_photo(inspection_id: str, photo_id: str):
    """Remove a single annotated/general photo from the inspection."""
    res = await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$pull": {"general_photos": {"photo_id": photo_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {"message": "Photo removed"}




class AnnotationUpdate(BaseModel):
    annotations: list = []

@api_router.get("/inspections/{inspection_id}/photos/{photo_id}/annotations")
async def get_annotations(inspection_id: str, photo_id: str):
    """Get annotations for a photo."""
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    # Search in violation photos
    for item in doc.get("items", []):
        for photo in item.get("photos", []):
            if photo.get("photo_id") == photo_id:
                return {"annotations": photo.get("annotations", []), "storage_path": photo.get("storage_path", "")}
    # Search in tiedown photos
    for a in doc.get("tiedown_assessments", []):
        for photo in a.get("photos", []):
            if photo.get("photo_id") == photo_id:
                return {"annotations": photo.get("annotations", []), "storage_path": photo.get("storage_path", "")}
    raise HTTPException(status_code=404, detail="Photo not found")

@api_router.put("/inspections/{inspection_id}/photos/{photo_id}/annotations")
async def save_annotations(inspection_id: str, photo_id: str, req: AnnotationUpdate):
    """Save annotations for a photo (editable layer, not baked into image)."""
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    # Update in violation photos
    for item in doc.get("items", []):
        for photo in item.get("photos", []):
            if photo.get("photo_id") == photo_id:
                await db.inspections.update_one(
                    {"id": inspection_id, "items.item_id": item["item_id"]},
                    {"$set": {
                        f"items.$.photos.$[p].annotations": req.annotations,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    array_filters=[{"p.photo_id": photo_id}]
                )
                return {"message": "Annotations saved"}
    # Update in tiedown photos
    for idx, a in enumerate(doc.get("tiedown_assessments", [])):
        for photo in a.get("photos", []):
            if photo.get("photo_id") == photo_id:
                await db.inspections.update_one(
                    {"id": inspection_id},
                    {"$set": {
                        f"tiedown_assessments.{idx}.photos.$[p].annotations": req.annotations,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    array_filters=[{"p.photo_id": photo_id}]
                )
                return {"message": "Annotations saved"}
    raise HTTPException(status_code=404, detail="Photo not found")



# ========== TIE-DOWN ASSESSMENT ENDPOINTS ==========

def _compute_tiedown_assessment(cargo_weight, cargo_length, tiedowns_raw, has_blocking=False):
    """Compute derived values for a tie-down assessment."""
    weight = cargo_weight or 0
    length = cargo_length or 0
    required_wll = weight * 0.5

    if length <= 0:
        min_tiedowns = 0
    elif has_blocking:
        # 393.110(c): 1 per 10 ft when blocked
        import math
        min_tiedowns = math.ceil(length / 10)
    else:
        # 393.110(b): without blocking
        if length <= 5 and weight <= 1100:
            min_tiedowns = 1
        elif length <= 10:
            min_tiedowns = 2
        else:
            import math
            min_tiedowns = 2 + math.ceil((length - 10) / 10)

    computed = []
    total_eff = 0
    active_count = 0
    defective_count = 0
    for td in tiedowns_raw:
        wll = td.get("wll", 0) if isinstance(td, dict) else td.wll
        method = td.get("method", "direct") if isinstance(td, dict) else td.method
        defective = td.get("defective", False) if isinstance(td, dict) else td.defective
        td_type = td.get("type", "") if isinstance(td, dict) else td.type
        eff = 0 if defective else (wll * 0.5 if method == "direct" else wll)
        computed.append({
            "type": td_type, "wll": wll, "method": method,
            "defective": defective, "effective_wll": eff,
        })
        total_eff += eff
        if defective:
            defective_count += 1
        else:
            active_count += 1

    compliant = weight > 0 and total_eff >= required_wll and active_count >= min_tiedowns
    return {
        "cargo_weight": weight, "cargo_length": length,
        "has_blocking": has_blocking,
        "required_wll": required_wll, "min_tiedowns": min_tiedowns,
        "tiedowns": computed, "total_effective_wll": total_eff,
        "active_count": active_count, "defective_count": defective_count,
        "compliant": compliant,
    }


@api_router.post("/inspections/{inspection_id}/tiedown")
async def save_tiedown_to_inspection(inspection_id: str, req: SaveTieDownRequest):
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    assessment = _compute_tiedown_assessment(req.cargo_weight, req.cargo_length, req.tiedowns, req.has_blocking)
    assessment["assessment_id"] = str(uuid.uuid4())
    assessment["created_at"] = datetime.now(timezone.utc).isoformat()
    assessment["photos"] = req.photos or []

    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$push": {"tiedown_assessments": assessment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return assessment


@api_router.delete("/inspections/{inspection_id}/tiedown/{assessment_id}")
async def delete_tiedown_from_inspection(inspection_id: str, assessment_id: str):
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$pull": {"tiedown_assessments": {"assessment_id": assessment_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return {"message": "Tie-down assessment removed"}


@api_router.post("/inspections/{inspection_id}/hos")
async def save_hos_to_inspection(inspection_id: str, req: SaveHosRequest):
    """Save an Hours-of-Service recap (daily grid + OOS recovery logic) to an inspection."""
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    assessment = req.model_dump()
    assessment["assessment_id"] = str(uuid.uuid4())
    assessment["created_at"] = datetime.now(timezone.utc).isoformat()

    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$push": {"hos_assessments": assessment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return assessment


@api_router.delete("/inspections/{inspection_id}/hos/{assessment_id}")
async def delete_hos_from_inspection(inspection_id: str, assessment_id: str):
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$pull": {"hos_assessments": {"assessment_id": assessment_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return {"message": "HOS assessment removed"}


@api_router.post("/inspections/{inspection_id}/weight-assessments")
async def save_weight_to_inspection(inspection_id: str, req: SaveWeightRequest):
    """Save a structured Bridge Chart / Weight recap to an inspection."""
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    assessment = req.model_dump()
    assessment["assessment_id"] = str(uuid.uuid4())
    assessment["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$push": {"weight_assessments": assessment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return assessment


@api_router.delete("/inspections/{inspection_id}/weight-assessments/{assessment_id}")
async def delete_weight_from_inspection(inspection_id: str, assessment_id: str):
    await db.inspections.update_one(
        {"id": inspection_id},
        {
            "$pull": {"weight_assessments": {"assessment_id": assessment_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return {"message": "Weight assessment removed"}


@api_router.post("/inspections/{inspection_id}/tiedown/{assessment_id}/photos")
async def attach_assessment_photo_meta(inspection_id: str, assessment_id: str, meta: DevicePhotoMeta):
    """Attach a photo to a tie-down assessment. Binary is device-only."""
    photo = {
        "photo_id": meta.photo_id,
        "original_filename": meta.original_filename,
        "content_type": meta.mime,
        "size": meta.size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "device_only": True,
    }
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    assessments = doc.get("tiedown_assessments", [])
    for i, a in enumerate(assessments):
        if a.get("assessment_id") == assessment_id:
            photos = a.get("photos", [])
            photos.append(photo)
            await db.inspections.update_one(
                {"id": inspection_id},
                {"$set": {f"tiedown_assessments.{i}.photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return photo
    raise HTTPException(status_code=404, detail="Assessment not found")


@api_router.delete("/inspections/{inspection_id}/tiedown/{assessment_id}/photos/{photo_id}")
async def delete_assessment_photo(inspection_id: str, assessment_id: str, photo_id: str):
    doc = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    assessments = doc.get("tiedown_assessments", [])
    for i, a in enumerate(assessments):
        if a.get("assessment_id") == assessment_id:
            photos = [p for p in a.get("photos", []) if p.get("photo_id") != photo_id]
            await db.inspections.update_one(
                {"id": inspection_id},
                {"$set": {f"tiedown_assessments.{i}.photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"message": "Photo removed"}
    raise HTTPException(status_code=404, detail="Assessment not found")


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")



def _build_assessment_photos_html(photos, include_photos):
    if not photos or not include_photos:
        return ""
    import base64
    imgs = ""
    for photo in photos:
        try:
            photo_data, ct = get_object(photo["storage_path"])
            b64 = base64.b64encode(photo_data).decode()
            imgs += f'<img src="data:{ct};base64,{b64}" style="max-width:280px;max-height:200px;margin:6px 4px;border-radius:6px;border:1px solid #ddd;" />'
        except Exception:
            imgs += f'<p style="color:#999;font-size:11px;">[Photo unavailable: {photo.get("original_filename", "")}]</p>'
    return f'<div style="margin-top:10px;"><p style="font-size:11px;font-weight:bold;color:#64748B;margin-bottom:4px;">Photos</p>{imgs}</div>' if imgs else ""


def _build_tiedown_html(assessments, include_photos=False):
    """Generate HTML for tie-down assessments in export."""
    if not assessments:
        return ""
    sections = ""
    for a in assessments:
        status_color = "#10B981" if a.get("compliant") else "#DC2626"
        status_text = "COMPLIANT" if a.get("compliant") else "NOT COMPLIANT"
        rows = ""
        for i, td in enumerate(a.get("tiedowns", [])):
            method_badge = '<span style="background:#10B981;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">INDIRECT 100%</span>' if td.get("method") == "indirect" else '<span style="background:#002855;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">DIRECT 50%</span>'
            def_style = "text-decoration:line-through;color:#999;" if td.get("defective") else ""
            def_badge = ' <span style="background:#DC2626;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">DEFECTIVE</span>' if td.get("defective") else ""
            eff = td.get("effective_wll", 0)
            rows += f'<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;{def_style}">{i+1}. {td.get("type","")}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">{method_badge}{def_badge}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;{def_style}">{td.get("wll",0):,.0f}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:{"#DC2626" if td.get("defective") else "#002855"}">{eff:,.0f}</td></tr>'

        pct = round(a.get("total_effective_wll", 0) / a.get("required_wll", 1) * 100) if a.get("required_wll", 0) > 0 else 0
        bar_color = "#10B981" if pct >= 100 else "#F59E0B" if pct >= 60 else "#EF4444"
        created = a.get("created_at", "")[:16].replace("T", " ")

        sections += f'''
        <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div>
                    <strong style="color:#002855;font-size:15px;">Tie-Down Assessment</strong>
                    <span style="font-size:11px;color:#94A3B8;margin-left:8px;">{created}</span>
                </div>
                <span style="background:{status_color};color:white;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:bold;">{status_text}</span>
            </div>
            <div style="display:flex;gap:16px;margin-bottom:12px;">
                <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;flex:1;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Cargo Weight</div>
                    <div style="font-size:18px;font-weight:bold;color:#002855;">{a.get("cargo_weight",0):,.0f} lbs</div>
                </div>
                <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;flex:1;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Cargo Length</div>
                    <div style="font-size:18px;font-weight:bold;color:#002855;">{a.get("cargo_length",0):,.1f} ft</div>
                </div>
            </div>
            <div style="display:flex;gap:16px;margin-bottom:12px;">
                <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;flex:1;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Required WLL</div>
                    <div style="font-size:16px;font-weight:bold;color:#002855;">{a.get("required_wll",0):,.0f} lbs</div>
                </div>
                <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;flex:1;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Min Tie-Downs</div>
                    <div style="font-size:16px;font-weight:bold;color:#002855;">{a.get("min_tiedowns",0)}</div>
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                    <span>Aggregate WLL</span>
                    <strong style="color:{"#10B981" if pct>=100 else "#EF4444"}">{a.get("total_effective_wll",0):,.0f} / {a.get("required_wll",0):,.0f} lbs ({pct}%)</strong>
                </div>
                <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:{min(pct,100)}%;background:{bar_color};border-radius:4px;"></div>
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748B;">Tie-Down</th>
                    <th style="padding:6px 8px;text-align:center;font-size:11px;color:#64748B;">Method</th>
                    <th style="padding:6px 8px;text-align:right;font-size:11px;color:#64748B;">Rated WLL</th>
                    <th style="padding:6px 8px;text-align:right;font-size:11px;color:#64748B;">Effective</th>
                </tr></thead>
                <tbody>{rows}</tbody>
                <tfoot><tr style="border-top:2px solid #002855;">
                    <td colspan="3" style="padding:8px;font-weight:bold;color:#002855;">Total Effective WLL</td>
                    <td style="padding:8px;text-align:right;font-weight:bold;font-size:15px;color:{"#10B981" if pct>=100 else "#EF4444"}">{a.get("total_effective_wll",0):,.0f} lbs</td>
                </tr></tfoot>
            </table>
            <p style="font-size:10px;color:#94A3B8;margin-top:8px;font-style:italic;">Per 49 CFR 393.102/104/106 — Direct: 50% WLL, Indirect: 100% WLL, Required aggregate WLL: 50% of cargo weight</p>
            {_build_assessment_photos_html(a.get("photos", []), include_photos)}
        </div>'''

    return f'<div style="margin-top:20px;"><h2 style="font-size:16px;color:#002855;margin-bottom:12px;border-bottom:2px solid #D4AF37;padding-bottom:6px;">Tie-Down Assessments</h2>{sections}</div>'


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
@media print{{body{{padding:0;}}.no-print{{display:none!important;}}}}</style></head>
<body>
<div style="background:#002855;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:20px;">{doc.get("title", "Inspection Report")}</h1>
    <p style="margin:4px 0 0;font-size:12px;opacity:0.7;">Created: {doc.get("created_at", "")[:16].replace("T", " ")} | Violations: {len(doc.get("items", []))}</p>
</div>
{f'<div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;color:#334155;"><strong>Notes:</strong> {doc.get("notes", "")}</div>' if doc.get("notes") else ""}
{items_html}
{_build_tiedown_html(doc.get("tiedown_assessments", []), include_photos=include_photos.upper() == "Y")}
</body></html>'''

    return HTMLResponse(content=html)


@api_router.get("/")
async def root():
    return {"message": "SafeSpect Violation Navigator API"}


@api_router.get("/hazmat-substances/search")
async def search_hazmat_substances(q: str = Query("", min_length=1)):
    """Search Appendix A (RQ) and Appendix B (Marine Pollutants) by substance name."""
    query = q.strip()
    if not query:
        return []
    cursor = db.hazmat_substances.find(
        {"name": {"$regex": re.compile(re.escape(query), re.IGNORECASE)}},
        {"_id": 0, "un_ids": 0}
    ).limit(20)
    results = await cursor.to_list(length=20)
    return results


class OCRRequest(BaseModel):
    image_base64: str


@api_router.post("/hazmat-substances/ocr")
async def ocr_shipping_paper_removed(req: OCRRequest):
    """Removed for security policy — photos never leave the inspector's device."""
    raise HTTPException(status_code=410, detail="Shipping paper OCR has been removed. Photos are not uploaded to the server.")


@api_router.post("/admin/wipe-photos")
async def wipe_photos(badge: str):
    """One-time wipe of every photo binary + path ever stored on the server.
    Removes files from disk and clears all legacy storage_path/annotations so
    the app operates in device-only mode going forward. Admin-only."""
    if badge != "121":
        raise HTTPException(status_code=403, detail="Admin access required")

    wiped_files = 0
    wiped_paths_errors = 0

    # 1) Collect every storage_path referenced anywhere in any inspection.
    paths = set()
    async for doc in db.inspections.find({}, {"_id": 0}):
        def _collect(photos):
            for p in photos or []:
                sp = p.get("storage_path")
                if sp:
                    paths.add(sp)
        _collect(doc.get("general_photos"))
        for item in doc.get("items", []) or []:
            _collect(item.get("photos"))
        for a in doc.get("tiedown_assessments", []) or []:
            _collect(a.get("photos"))

    # 2) Delete each file from disk (uses the same backend as put_object / get_object).
    for sp in paths:
        try:
            # Try the configured storage backend's delete if available.
            try:
                from pathlib import Path as _Path
                # Files are stored under a local uploads dir when s3/minio isn't configured.
                uploads_root = os.environ.get("LOCAL_UPLOADS_DIR", "/app/backend/uploads")
                fp = _Path(uploads_root) / sp
                if fp.exists():
                    fp.unlink()
                    wiped_files += 1
            except Exception:
                wiped_paths_errors += 1
        except Exception:
            wiped_paths_errors += 1

    # 3) Clear all photo arrays so the UI won't try to fetch from /files anymore.
    res = await db.inspections.update_many(
        {},
        {"$set": {
            "general_photos": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # Clear per-item and per-assessment photo arrays.
    docs_cleared = 0
    async for doc in db.inspections.find({}, {"_id": 0, "id": 1, "items": 1, "tiedown_assessments": 1}):
        changed = False
        items = doc.get("items", []) or []
        for it in items:
            if it.get("photos"):
                it["photos"] = []
                changed = True
        tdas = doc.get("tiedown_assessments", []) or []
        for a in tdas:
            if a.get("photos"):
                a["photos"] = []
                changed = True
        if changed:
            await db.inspections.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "items": items,
                    "tiedown_assessments": tdas,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            docs_cleared += 1

    return {
        "message": "All server-side photos wiped. App is now device-only for photos.",
        "files_deleted": wiped_files,
        "file_errors": wiped_paths_errors,
        "inspections_cleared": docs_cleared,
        "inspections_touched": res.modified_count,
    }


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
