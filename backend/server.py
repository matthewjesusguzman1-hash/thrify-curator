from fastapi import FastAPI, APIRouter, UploadFile, File, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
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


class SmartSearchResponse(BaseModel):
    violations: List[Violation]
    total: int
    expanded_terms: List[str]
    original_query: str


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


@api_router.post("/violations/smart-search", response_model=SmartSearchResponse)
async def smart_search(request: SmartSearchRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    query_text = request.query.strip()
    if not query_text:
        return SmartSearchResponse(violations=[], total=0, expanded_terms=[], original_query=query_text)

    api_key = os.environ.get('EMERGENT_LLM_KEY', '')

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"smart-search-{uuid.uuid4()}",
            system_message="""You are a search query expansion assistant for FMCSA commercial vehicle violations.
Given a user's search query, generate a list of 5-10 specific keywords and phrases that would help find relevant violations in a database.
Include regulatory terms, synonyms, related concepts, and common abbreviations used in DOT/FMCSA regulations.
Return ONLY a JSON array of strings, nothing else. Example: ["brake", "air brake", "stopping distance", "393.48"]"""
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
    # Find the source violation
    source = await db.violations.find_one({"id": violation_id}, {"_id": 0})
    if not source:
        return {"violations": [], "total": 0}

    # Find similar by same violation_category, cfr_part, or violation_class, excluding self
    similar_query = {
        "id": {"$ne": violation_id},
        "$or": [
            {"violation_category": source.get("violation_category", "")},
            {"cfr_part": source.get("cfr_part", "")},
        ]
    }

    cursor = db.violations.find(similar_query, {"_id": 0}).limit(20)
    results = await cursor.to_list(20)
    total = await db.violations.count_documents(similar_query)

    return {
        "violations": [Violation(**r) for r in results],
        "total": total,
        "source": Violation(**source),
    }


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
