"""
Applicant Skills Test Router
Handles creating tests, sending invites, and reviewing submissions
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import os
import json

router = APIRouter(prefix="/api/applicant-tests", tags=["applicant-tests"])

# Database and auth dependencies
from ..dependencies import get_db, get_admin_user, get_current_user

# Default listing fields that can be used in tests
# Based on Vendoo-style listing fields for clothing and shoes
DEFAULT_LISTING_FIELDS = [
    {"id": "title", "name": "Title", "type": "text", "required": True, "placeholder": "Enter item title"},
    {"id": "description", "name": "Description", "type": "textarea", "required": True, "placeholder": "Describe the item in detail"},
    {"id": "brand", "name": "Brand", "type": "text", "required": True, "placeholder": "Enter brand name"},
    {"id": "condition", "name": "Condition", "type": "select", "required": True, "options": ["New with Tags", "New without Tags", "Like New", "Good", "Fair", "Poor"]},
    {"id": "primary_color", "name": "Primary Color", "type": "text", "required": False, "placeholder": "e.g., Black, Navy Blue"},
    {"id": "secondary_color", "name": "Secondary Color", "type": "text", "required": False, "placeholder": "e.g., White, Gold"},
    {"id": "tags", "name": "Tags", "type": "text", "required": False, "placeholder": "Comma-separated tags for search"},
    {
        "id": "category", 
        "name": "Category", 
        "type": "select", 
        "required": False, 
        "options": [
            # Women's Activewear
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Activewear Tops",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Sports Bras",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Leggings",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Shorts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Jackets & Hoodies",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Sets & Outfits",
            # Women's Clothing
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Coats, Jackets & Vests > Coats",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Coats, Jackets & Vests > Jackets",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Coats, Jackets & Vests > Vests",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Dresses > Casual Dresses",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Dresses > Formal Dresses",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Dresses > Mini Dresses",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Dresses > Maxi Dresses",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Intimates & Sleepwear > Bras",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Intimates & Sleepwear > Pajamas",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Intimates & Sleepwear > Robes",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Jeans > Straight Leg",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Jeans > Skinny",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Jeans > Wide Leg",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Jeans > Bootcut",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Jumpsuits & Rompers",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Leggings",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Pants > Dress Pants",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Pants > Casual Pants",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Shorts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Skirts > Mini Skirts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Skirts > Midi Skirts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Skirts > Maxi Skirts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Suits & Blazers",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Sweaters > Cardigans",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Sweaters > Pullovers",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Swimwear > Bikinis",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Swimwear > One Pieces",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Swimwear > Cover Ups",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Tops > T-Shirts",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Tops > Blouses",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Tops > Tank Tops",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Tops > Crop Tops",
            "Clothing, Shoes & Accessories > Women > Women's Clothing > Tops > Long Sleeve",
            # Women's Shoes
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Athletic Shoes > Running",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Athletic Shoes > Training",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Athletic Shoes > Walking",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Boots > Ankle Boots",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Boots > Knee High",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Boots > Combat Boots",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Flats > Ballet Flats",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Flats > Loafers",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Heels > Pumps",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Heels > Wedges",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Heels > Block Heels",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Sandals > Flat Sandals",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Sandals > Heeled Sandals",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Sneakers",
            "Clothing, Shoes & Accessories > Women > Women's Shoes > Slippers",
            # Men's Activewear
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Activewear > Tops",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Activewear > Shorts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Activewear > Pants",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Activewear > Jackets",
            # Men's Clothing
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Coats & Jackets > Coats",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Coats & Jackets > Jackets",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Coats & Jackets > Vests",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Dress Shirts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Jeans > Straight",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Jeans > Slim",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Jeans > Relaxed",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Pants > Dress Pants",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Pants > Casual Pants",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Pants > Chinos",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Shirts > Casual Shirts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Shirts > Polo Shirts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Shorts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Suits & Blazers",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Sweaters > Pullovers",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Sweaters > Cardigans",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Swimwear",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > T-Shirts",
            "Clothing, Shoes & Accessories > Men > Men's Clothing > Underwear & Socks",
            # Men's Shoes
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Athletic Shoes > Running",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Athletic Shoes > Training",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Athletic Shoes > Basketball",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Boots > Work Boots",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Boots > Dress Boots",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Boots > Chelsea Boots",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Casual Shoes > Loafers",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Casual Shoes > Boat Shoes",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Dress Shoes > Oxfords",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Dress Shoes > Derbys",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Sandals & Flip Flops",
            "Clothing, Shoes & Accessories > Men > Men's Shoes > Sneakers",
            # Kids
            "Clothing, Shoes & Accessories > Kids > Boys > Clothing > Tops",
            "Clothing, Shoes & Accessories > Kids > Boys > Clothing > Bottoms",
            "Clothing, Shoes & Accessories > Kids > Boys > Clothing > Outerwear",
            "Clothing, Shoes & Accessories > Kids > Boys > Shoes",
            "Clothing, Shoes & Accessories > Kids > Girls > Clothing > Tops",
            "Clothing, Shoes & Accessories > Kids > Girls > Clothing > Bottoms",
            "Clothing, Shoes & Accessories > Kids > Girls > Clothing > Dresses",
            "Clothing, Shoes & Accessories > Kids > Girls > Clothing > Outerwear",
            "Clothing, Shoes & Accessories > Kids > Girls > Shoes",
            "Clothing, Shoes & Accessories > Kids > Baby > Clothing",
            "Clothing, Shoes & Accessories > Kids > Baby > Shoes",
            # Accessories
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Bags & Purses > Crossbody Bags",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Bags & Purses > Shoulder Bags",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Bags & Purses > Tote Bags",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Bags & Purses > Clutches",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Bags & Purses > Backpacks",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Belts",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Hats",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Jewelry > Necklaces",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Jewelry > Earrings",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Jewelry > Bracelets",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Jewelry > Rings",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Scarves & Wraps",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Sunglasses",
            "Clothing, Shoes & Accessories > Women > Women's Accessories > Watches",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Bags > Backpacks",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Bags > Messenger Bags",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Belts",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Hats",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Sunglasses",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Ties & Pocket Squares",
            "Clothing, Shoes & Accessories > Men > Men's Accessories > Watches"
        ]
    },
    {"id": "us_size", "name": "US Size", "type": "text", "required": False, "placeholder": "e.g., S, M, L, 8, 10, One Size"}
]


@router.get("/default-fields")
async def get_default_fields(admin: dict = Depends(get_admin_user)):
    """Get the default listing fields that can be used in tests"""
    return {"fields": DEFAULT_LISTING_FIELDS}


@router.post("/create")
async def create_test(
    name: str = Form(...),
    description: str = Form(None),
    fields: str = Form(...),  # JSON string of field configurations
    items_config: str = Form(...),  # JSON string with item definitions: [{photos: [indices]}]
    photos: List[UploadFile] = File(...),
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Create a new applicant skills test with multiple items, each having multiple photos"""
    
    # Parse fields JSON
    try:
        field_config = json.loads(fields)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid fields JSON")
    
    # Parse items config - maps which photos belong to which item
    try:
        items_data = json.loads(items_config)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid items config JSON")
    
    if not photos or len(photos) == 0:
        raise HTTPException(status_code=400, detail="At least one photo is required")
    
    if not items_data or len(items_data) == 0:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
    # Save photos as base64 in the database (more reliable than file storage)
    test_id = str(uuid.uuid4())
    all_photo_records = []
    
    for i, photo in enumerate(photos):
        try:
            # Read and encode photo as base64
            content = await photo.read()
            import base64
            base64_data = base64.b64encode(content).decode('utf-8')
            
            # Determine content type
            ext = os.path.splitext(photo.filename)[1].lower() if photo.filename else ".jpg"
            content_type = "image/jpeg"
            if ext in [".png"]:
                content_type = "image/png"
            elif ext in [".gif"]:
                content_type = "image/gif"
            elif ext in [".webp"]:
                content_type = "image/webp"
            
            all_photo_records.append({
                "id": str(uuid.uuid4()),
                "filename": f"{test_id}_{i}{ext}",
                "original_name": photo.filename,
                "index": i,
                "data": base64_data,
                "content_type": content_type
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process photo {i}: {str(e)}")
    
    # Build items with their associated photos
    items = []
    for item_idx, item_data in enumerate(items_data):
        photo_indices = item_data.get("photo_indices", [])
        item_photos = [all_photo_records[idx] for idx in photo_indices if idx < len(all_photo_records)]
        
        items.append({
            "id": str(uuid.uuid4()),
            "order": item_idx,
            "photos": item_photos
        })
    
    # Create test document with new items structure
    test_doc = {
        "id": test_id,
        "name": name,
        "description": description,
        "fields": field_config,
        "items": items,  # New: items array with photos grouped
        "photos": all_photo_records,  # Keep flat list for backward compatibility
        "created_by": admin["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "invites_sent": 0,
        "submissions_count": 0
    }
    
    await db.applicant_tests.insert_one(test_doc)
    
    return {
        "message": "Test created successfully", 
        "test_id": test_id, 
        "item_count": len(items),
        "photo_count": len(all_photo_records)
    }


@router.get("/list")
async def list_tests(
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """List all applicant tests"""
    tests = await db.applicant_tests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"tests": tests}


@router.get("/{test_id}")
async def get_test(
    test_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get a specific test details"""
    test = await db.applicant_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.delete("/{test_id}")
async def delete_test(
    test_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Delete a test and its photos"""
    test = await db.applicant_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Delete photo files from persistent storage
    upload_dir = "/app/uploads/applicant_tests"
    for photo in test.get("photos", []):
        filepath = os.path.join(upload_dir, photo["filename"])
        if os.path.exists(filepath):
            os.remove(filepath)
    
    # Delete test document
    await db.applicant_tests.delete_one({"id": test_id})
    
    # Delete related invites and submissions
    await db.applicant_test_invites.delete_many({"test_id": test_id})
    await db.applicant_test_submissions.delete_many({"test_id": test_id})
    
    return {"message": "Test deleted successfully"}


@router.put("/{test_id}")
async def update_test(
    test_id: str,
    name: str = Form(...),
    description: str = Form(None),
    fields: str = Form(...),  # JSON string of field configurations
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Update test name, description, and fields"""
    test = await db.applicant_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Parse fields JSON
    try:
        field_config = json.loads(fields)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid fields JSON")
    
    # Update test
    await db.applicant_tests.update_one(
        {"id": test_id},
        {"$set": {
            "name": name,
            "description": description,
            "fields": field_config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Test updated successfully"}




@router.post("/{test_id}/invite")
async def send_invite(
    test_id: str,
    applicant_name: str = Form(...),
    applicant_email: str = Form(...),
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Send an email invite to an applicant"""
    
    test = await db.applicant_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Generate unique token for this invite
    invite_token = str(uuid.uuid4())
    
    # Create invite record
    invite_doc = {
        "id": str(uuid.uuid4()),
        "test_id": test_id,
        "token": invite_token,
        "applicant_name": applicant_name,
        "applicant_email": applicant_email.lower(),
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": admin["email"],
        "status": "pending",  # pending, started, completed
        "started_at": None,
        "completed_at": None
    }
    
    await db.applicant_test_invites.insert_one(invite_doc)
    
    # Update test invite count
    await db.applicant_tests.update_one(
        {"id": test_id},
        {"$inc": {"invites_sent": 1}}
    )
    
    # Send email using Resend
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY")
        
        frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
        test_url = f"{frontend_url}/applicant-test/{invite_token}"
        
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00D4FF, #8B5CF6); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Thrifty Curator</h1>
                <p style="color: white; opacity: 0.9; margin-top: 10px;">Skills Assessment Invitation</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <p style="font-size: 16px; color: #333;">Hi {applicant_name},</p>
                <p style="font-size: 16px; color: #333;">
                    You've been invited to complete a skills assessment for a position at Thrifty Curator. 
                    This test will help us evaluate your ability to create product listings.
                </p>
                <p style="font-size: 16px; color: #333;">
                    <strong>Test:</strong> {test['name']}
                </p>
                {f"<p style='font-size: 14px; color: #666;'>{test.get('description', '')}</p>" if test.get('description') else ""}
                <p style="font-size: 16px; color: #333;">
                    <strong>What to expect:</strong><br>
                    You'll view {len(test['photos'])} product photo(s) and fill out listing information for each item, 
                    similar to how you would when listing items for sale online.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{test_url}" style="display: inline-block; background: linear-gradient(135deg, #00D4FF, #8B5CF6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Start Assessment
                    </a>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center;">
                    Or copy this link: <a href="{test_url}" style="color: #8B5CF6;">{test_url}</a>
                </p>
                <p style="font-size: 14px; color: #666;">
                    This link is unique to you. Please do not share it with anyone else.
                </p>
                <p style="font-size: 14px; color: #666;">
                    If you have any questions, please reply to this email.
                </p>
            </div>
            <div style="padding: 20px; text-align: center; background: #1A1A2E;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    © {datetime.now().year} Thrifty Curator. All rights reserved.
                </p>
            </div>
        </div>
        """
        
        # Use Resend v2 class-based API
        emails_client = resend.Emails()
        emails_client.send({
            "from": "Thrifty Curator <noreply@thrifty-curator.com>",
            "to": applicant_email,
            "subject": f"Skills Assessment Invitation - {test['name']}",
            "html": email_html
        })
        
        return {"message": "Invite sent successfully", "invite_token": invite_token}
        
    except Exception as e:
        # Still return success but note email failed
        return {
            "message": "Invite created but email failed to send",
            "invite_token": invite_token,
            "email_error": str(e),
            "test_url": f"{os.environ.get('FRONTEND_URL', '')}/applicant-test/{invite_token}"
        }


@router.get("/{test_id}/invites")
async def get_test_invites(
    test_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get all invites for a specific test"""
    invites = await db.applicant_test_invites.find(
        {"test_id": test_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(100)
    
    return {"invites": invites}


@router.delete("/{test_id}/invite/{invite_id}")
async def delete_invite(
    test_id: str,
    invite_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Delete an invite"""
    # Check if invite exists
    invite = await db.applicant_test_invites.find_one({"id": invite_id, "test_id": test_id})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    # Delete the invite
    await db.applicant_test_invites.delete_one({"id": invite_id})
    
    # Decrement invite count on the test
    await db.applicant_tests.update_one(
        {"id": test_id},
        {"$inc": {"invites_sent": -1}}
    )
    
    return {"message": "Invite deleted successfully"}


@router.get("/{test_id}/submissions")
async def get_test_submissions(
    test_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get all submissions for a specific test"""
    submissions = await db.applicant_test_submissions.find(
        {"test_id": test_id},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    return {"submissions": submissions}


@router.get("/submission/{submission_id}")
async def get_submission_detail(
    submission_id: str,
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get detailed submission with all responses"""
    submission = await db.applicant_test_submissions.find_one(
        {"id": submission_id},
        {"_id": 0}
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get the test details for context
    test = await db.applicant_tests.find_one(
        {"id": submission["test_id"]},
        {"_id": 0}
    )
    
    return {"submission": submission, "test": test}


@router.patch("/submission/{submission_id}/notes")
async def update_submission_notes(
    submission_id: str,
    notes: str = Form(...),
    admin: dict = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Update admin notes for a submission"""
    result = await db.applicant_test_submissions.update_one(
        {"id": submission_id},
        {
            "$set": {
                "admin_notes": notes,
                "notes_updated_at": datetime.now(timezone.utc).isoformat(),
                "notes_updated_by": admin["email"]
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Notes updated successfully"}


# ============ PUBLIC ENDPOINTS (No auth required) ============

# Create a separate router for public endpoints
public_router = APIRouter(prefix="/api/applicant-tests/public", tags=["applicant-tests-public"])


@public_router.get("/test/{token}")
async def get_test_by_token(
    token: str,
    db = Depends(get_db)
):
    """Get test details using invite token (public endpoint for applicants)"""
    
    # Find the invite
    invite = await db.applicant_test_invites.find_one({"token": token}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    
    # Check if already completed
    if invite["status"] == "completed":
        raise HTTPException(status_code=400, detail="This assessment has already been completed")
    
    # Get the test
    test = await db.applicant_tests.find_one({"id": invite["test_id"]}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Mark as started if not already
    if invite["status"] == "pending":
        await db.applicant_test_invites.update_one(
            {"token": token},
            {
                "$set": {
                    "status": "started",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    # Build items list - support both old and new structure
    items = test.get("items", [])
    if not items and test.get("photos"):
        # Legacy: convert flat photos to single-photo items for backward compatibility
        items = [
            {"id": photo["id"], "order": i, "photos": [photo]}
            for i, photo in enumerate(test["photos"])
        ]
    
    return {
        "test": {
            "id": test["id"],
            "name": test["name"],
            "description": test.get("description"),
            "fields": test["fields"],
            "items": items,  # New structure with items containing photos
            "photos": test.get("photos", [])  # Keep for backward compatibility
        },
        "applicant": {
            "name": invite["applicant_name"],
            "email": invite["applicant_email"]
        }
    }


@public_router.get("/photo/{test_id}/{filename}")
async def get_test_photo(
    test_id: str,
    filename: str,
    db = Depends(get_db)
):
    """Serve test photos from database"""
    from fastapi.responses import Response
    import base64
    
    # Find the test
    test = await db.applicant_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Find the photo in the test's photos array
    photo_data = None
    for photo in test.get("photos", []):
        if photo.get("filename") == filename:
            photo_data = photo
            break
    
    # Also check in items
    if not photo_data:
        for item in test.get("items", []):
            for photo in item.get("photos", []):
                if photo.get("filename") == filename:
                    photo_data = photo
                    break
            if photo_data:
                break
    
    if not photo_data or not photo_data.get("data"):
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Decode base64 and return as image
    image_bytes = base64.b64decode(photo_data["data"])
    content_type = photo_data.get("content_type", "image/jpeg")
    
    return Response(content=image_bytes, media_type=content_type)


@public_router.post("/submit/{token}")
async def submit_test(
    token: str,
    responses: str = Form(...),  # JSON string of responses
    db = Depends(get_db)
):
    """Submit completed test (public endpoint for applicants)"""
    
    # Find the invite
    invite = await db.applicant_test_invites.find_one({"token": token}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    
    if invite["status"] == "completed":
        raise HTTPException(status_code=400, detail="This assessment has already been submitted")
    
    # Parse responses
    try:
        response_data = json.loads(responses)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid response data")
    
    # Get the test for validation
    test = await db.applicant_tests.find_one({"id": invite["test_id"]}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Create submission record
    submission_doc = {
        "id": str(uuid.uuid4()),
        "test_id": invite["test_id"],
        "invite_id": invite["id"],
        "applicant_name": invite["applicant_name"],
        "applicant_email": invite["applicant_email"],
        "responses": response_data,  # Dict of photo_id -> {field_id: value}
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "started_at": invite.get("started_at"),
        "admin_notes": "",
        "reviewed": False
    }
    
    await db.applicant_test_submissions.insert_one(submission_doc)
    
    # Update invite status
    await db.applicant_test_invites.update_one(
        {"token": token},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update test submission count
    await db.applicant_tests.update_one(
        {"id": invite["test_id"]},
        {"$inc": {"submissions_count": 1}}
    )
    
    # Send notification email to admin
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY")
        
        frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
        
        notification_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00D4FF, #8B5CF6); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">New Test Submission!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <p style="font-size: 16px; color: #333;">
                    <strong>{invite['applicant_name']}</strong> has submitted their skills assessment.
                </p>
                <p style="font-size: 14px; color: #666;">
                    <strong>Test:</strong> {test['name']}<br>
                    <strong>Email:</strong> {invite['applicant_email']}<br>
                    <strong>Submitted:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/admin" style="display: inline-block; background: linear-gradient(135deg, #00D4FF, #8B5CF6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Review Submission
                    </a>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; background: #1A1A2E;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    © {datetime.now().year} Thrifty Curator
                </p>
            </div>
        </div>
        """
        
        # Send to test creator
        admin_email = test.get("created_by", "matthewjesusguzman1@gmail.com")
        
        emails_client = resend.Emails()
        emails_client.send({
            "from": "Thrifty Curator <noreply@thrifty-curator.com>",
            "to": admin_email,
            "subject": f"New Submission: {invite['applicant_name']} completed {test['name']}",
            "html": notification_html
        })
    except Exception as e:
        # Don't fail the submission if notification fails
        print(f"Failed to send notification email: {e}")
    
    return {"message": "Assessment submitted successfully", "submission_id": submission_doc["id"]}
