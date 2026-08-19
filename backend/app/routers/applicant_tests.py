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
# Based on Vendoo-style listing fields
DEFAULT_LISTING_FIELDS = [
    {"id": "title", "name": "Title", "type": "text", "required": True, "placeholder": "Enter item title"},
    {"id": "description", "name": "Description", "type": "textarea", "required": True, "placeholder": "Describe the item in detail"},
    {"id": "brand", "name": "Brand", "type": "text", "required": True, "placeholder": "Enter brand name"},
    {"id": "condition", "name": "Condition", "type": "select", "required": True, "options": ["New with Tags", "New without Tags", "Like New", "Good", "Fair", "Poor"]},
    {"id": "primary_color", "name": "Primary Color", "type": "text", "required": False, "placeholder": "e.g., Black, Navy Blue"},
    {"id": "secondary_color", "name": "Secondary Color", "type": "text", "required": False, "placeholder": "e.g., White, Gold"},
    {"id": "tags", "name": "Tags", "type": "text", "required": False, "placeholder": "Comma-separated tags for search"},
    {"id": "category", "name": "Category", "type": "select", "required": False, "options": ["Women's Clothing", "Men's Clothing", "Kids & Baby", "Shoes", "Bags & Purses", "Jewelry & Watches", "Accessories", "Home & Living", "Electronics", "Sports & Outdoors", "Beauty", "Other"]},
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
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/applicant_tests"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save all photos first
    test_id = str(uuid.uuid4())
    all_photo_records = []
    
    for i, photo in enumerate(photos):
        # Generate unique filename
        ext = os.path.splitext(photo.filename)[1] if photo.filename else ".jpg"
        filename = f"{test_id}_{i}{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save file
        content = await photo.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        all_photo_records.append({
            "id": str(uuid.uuid4()),
            "filename": filename,
            "original_name": photo.filename,
            "index": i
        })
    
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
    
    # Delete photo files
    upload_dir = "/app/backend/uploads/applicant_tests"
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
    filename: str
):
    """Serve test photos (public endpoint)"""
    from fastapi.responses import FileResponse
    
    filepath = f"/app/backend/uploads/applicant_tests/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return FileResponse(filepath)


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
    
    return {"message": "Assessment submitted successfully", "submission_id": submission_doc["id"]}
