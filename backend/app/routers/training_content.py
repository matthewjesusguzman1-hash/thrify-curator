"""Training content — editable training guides stored in MongoDB with AI cleanup."""

from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from typing import List, Optional
import os

from app.database import db
from app.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/training-content", tags=["training-content"])

# ── Default seed data ──────────────────────────────────────

DEFAULT_PHOTOGRAPHY = [
    {"title": "1. Prep the Item", "icon": "Package", "steps": [
        "Remove items from the storage rack",
        "Place items on the lay-flat station with hangar",
        "Inspect for stains, damage, or missing parts and if necessary notify supervisor",
        "Steam to remove wrinkles.",
        "Use a lint roller as needed."
    ]},
    {"title": "2. Set Up for Photos", "icon": "Camera", "steps": [
        "Use lighting equipment provided",
        "Ensure the item is framed inside the background of the lay flat station",
        "Avoid shadows, clutter, or uneven lighting"
    ]},
    {"title": "3. Take Required Photos", "icon": "FileText", "steps": [
        "Front view (full item, centered)",
        "Close-up (details/ flaws)",
        "Close-up of brand/ size tag",
        "Close-up of material tag",
        "Full view back",
        "Close-up back"
    ]},
    {"title": "4. Capture Measurements", "icon": "Tag", "steps": [
        "Open Vendoo",
        "Select + Item, then start with template and choose the correct category",
        "Use measuring tape or yard stick",
        "Common measurements: pit-to-pit (chest), length, sleeve length, waist, inseam, rise",
        "Record in inches"
    ]},
    {"title": "5. Add Photo/ Description", "icon": "FileText", "steps": [
        "Upload photos",
        "Add measurements",
        "List ALL flaws or anything noteworthy"
    ]},
    {"title": "6. SKU & Cost Tracking", "icon": "Tag", "steps": [
        "Assign SKU number",
        "Add Cost of Goods (Goodwill or Thrift World = Price Tag)",
        "No tag = $0"
    ]},
    {"title": "7. Bag & Store", "icon": "FolderOpen", "steps": [
        "Fold neatly",
        "Place clear poly mailer",
        "Place in box"
    ]}
]

DEFAULT_LISTING = [
    {"title": "1. Starting in Vendoo", "icon": "Package", "steps": [
        "Go to Vendoo and open the Drafts section",
        "Open one of the listings — if the listing has a price entered, it is ready to list",
        "Once you have opened the listing, start with the eBay tab"
    ]},
    {"title": "2. eBay", "icon": "Monitor", "steps": [
        "Scroll down and make sure the category is correct",
        "Complete any category/item specifics that eBay requires:",
        "Department: Select Women or Men depending on the item",
        "Exterior Color: Look at the item and select the closest matching color. If the exact color is not available, choose the option that matches best",
        "Material, Silhouette, Shape, etc.: If you do not know the answer, select Other when that option is available. Do not guess",
        "Style: Start typing the appropriate style and select the correct option when it populates. For example, if the purse is a crossbody, type Crossbody and select it",
        "Once everything required is completed, scroll down and click List on eBay"
    ]},
    {"title": "3. Poshmark", "icon": "ShoppingBag", "steps": [
        "Next, go to the Poshmark tab",
        "Everything should already be populated, so double-check that the information is correct",
        "If everything looks good, click List on Poshmark"
    ]},
    {"title": "4. Mercari", "icon": "ShoppingBag", "steps": [
        "Next, go to the Mercari tab",
        "Check the information and fix anything Mercari does not accept",
        "For example, Mercari may not accept Vintage as a brand — if this happens, select No Brand/Not Sure and continue",
        "Next, check the shipping",
        "Always choose the cheapest appropriate shipping option",
        "For most items, use USPS Ground Advantage — this will usually be one of the first/top shipping options",
        "If the item is heavy, UPS may be the better option. However, most items will ship using USPS Ground Advantage",
        "Once everything is correct, click List on Mercari"
    ]},
    {"title": "5. Depop", "icon": "ShoppingBag", "steps": [
        "Next, go to the Depop tab",
        "Most of the information should automatically populate",
        "Check for anything that did not populate correctly. For example, if the brand is Vintage and Depop does not recognize it, select Other for the brand",
        "Make sure the size is entered",
        "You will also need to select the correct package weight/shipping weight",
        "If you are unsure of the item's weight, go back to the main Vendoo form and scroll down — the package weight will be listed there",
        "Use that weight to select the appropriate shipping option on Depop. For example, if the package weighs one pound, select the appropriate up to/under one-pound option",
        "Once everything is correct, list the item on Depop"
    ]},
    {"title": "6. Finish", "icon": "FileText", "steps": [
        "After the listing has been posted to all of the platforms, go back to Inventory in Vendoo",
        "Then move on to the next item and repeat the process"
    ]}
]


async def _ensure_seeded():
    """Seed default training content if none exists."""
    count = await db.training_content.count_documents({})
    if count == 0:
        await db.training_content.insert_many([
            {
                "guide_type": "photography",
                "title": "Photography Training",
                "sections": DEFAULT_PHOTOGRAPHY,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "guide_type": "listing",
                "title": "Listing Training (Vendoo Cross-Listing)",
                "sections": DEFAULT_LISTING,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ])


@router.get("/")
async def get_training_content():
    """Get all training guides (public for any authenticated user)."""
    await _ensure_seeded()
    docs = await db.training_content.find({}, {"_id": 0}).to_list(10)
    return {"guides": docs}


@router.put("/{guide_type}")
async def update_training_content(
    guide_type: str,
    sections: list = Body(..., embed=True),
    admin: dict = Depends(get_admin_user),
):
    """Update a training guide's sections (admin only)."""
    if guide_type not in ("photography", "listing"):
        raise HTTPException(400, "Invalid guide type")

    await db.training_content.update_one(
        {"guide_type": guide_type},
        {"$set": {
            "sections": sections,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True}


@router.post("/ai-cleanup")
async def ai_cleanup_section(
    text: str = Body(..., embed=True),
    admin: dict = Depends(get_admin_user),
):
    """Use AI to clean up / professionalize training text."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "AI service not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid as _uuid

        chat = LlmChat(
            api_key=api_key,
            session_id=f"training-cleanup-{_uuid.uuid4()}",
            system_message=(
                "You are a professional training document editor for a resale/consignment business. "
                "Clean up and professionalize the following training instructions. "
                "Keep the same meaning and structure. Keep it concise and action-oriented. "
                "Use clear, direct language suitable for employee reference guides. "
                "Do NOT add numbering if not already present. "
                "Return ONLY the cleaned-up text, one instruction per line."
            ),
        ).with_model("gemini", "gemini-3-flash-preview")

        response = await chat.send_message(UserMessage(text=text))
        cleaned = response.strip() if isinstance(response, str) else response.content.strip()
        return {"cleaned_text": cleaned}

    except Exception as e:
        raise HTTPException(500, f"AI cleanup failed: {str(e)}")
