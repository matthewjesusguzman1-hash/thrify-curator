"""
Contractor Agreement Routes

Handles digital signing and management of contractor agreements for employees.
Includes admin approval workflow similar to W-9 forms.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_user, get_admin_user
from app.models.notifications import AdminNotification
from app.services.apns_service import send_admin_push_notification

router = APIRouter(prefix="/contractor-agreement", tags=["Contractor Agreement"])


class SignAgreementRequest(BaseModel):
    full_name: str
    signature_text: str  # Their typed signature
    agreed_to_terms: bool
    # Contractor fillable fields
    contact_email: Optional[str] = None
    # Payment info for Remitly transfers
    payment_first_name: Optional[str] = None
    payment_last_name: Optional[str] = None
    payment_email: Optional[str] = None
    payment_phone: Optional[str] = None
    payment_country: Optional[str] = None


class ReviewAgreementRequest(BaseModel):
    feedback: Optional[str] = None


# The contractor agreement text - pre-signed by company owners
CONTRACTOR_AGREEMENT_TEXT = """
THRIFTY CURATOR
RESALE MANAGEMENT & OPERATIONS
INDEPENDENT CONTRACTOR AGREEMENT

NOTICE TO CONTRACTOR: This Independent Contractor Agreement ("Agreement") governs the terms of your service engagement with Thrifty Curator ("Company"). By executing this document digitally or in writing, you agree to comply with all operational, security, payment, and performance standards outlined below.

═══════════════════════════════════════════════════════════════════════════════

1. ENGAGEMENT & SCOPE OF WORK

The Company hereby engages the Contractor, and the Contractor agrees to perform virtual assistance and remote operational support services. The primary scope of work includes:

• E-Commerce Data Entry & Cross-Listing: Preparing, editing, listing, and cross-posting inventory items across e-commerce marketplaces using the Vendoo platform.

• Remote System Access: Accessing company workspace systems remotely via AnyDesk remote desktop software.

• Training & SOP Compliance: Completing mandatory onboarding and daily training provided by company staff to ensure strict adherence to standardized listing workflows and image/data quality guidelines.

═══════════════════════════════════════════════════════════════════════════════

2. INDEPENDENT CONTRACTOR STATUS

The Contractor is an independent contractor and is not an employee, agent, partner, or joint venturer of the Company. The Contractor acknowledges and agrees that:

• The Contractor retains full autonomy to select their work environment, equipment, and operating location.

• The Contractor is solely responsible for all local, state, national, or international taxes, withholdings, social security contributions, or legal obligations arising from compensation received under this Agreement.

• The Contractor is not entitled to company employee benefits, including but not limited to health insurance, paid leave, retirement plans, or worker's compensation.

═══════════════════════════════════════════════════════════════════════════════

3. COMPENSATION, RATE SCHEDULE & PAYMENT LOGISTICS

Compensation Tier Structure:

1. Initial Trial Period (First 2 Weeks): Compensation shall be set at $3.00 USD per hour.

2. Standard Rate (Post-Review): Following the completion of the two-week trial period, contingent upon a satisfactory performance review and approval by the Business Owner, the rate shall increase to $5.00 USD per hour.

3. Maximum Compensation Cap: Hourly rates are strictly capped at the maximum rate established by the Business Owner ($5.00 USD/hour unless formally revised).

Payment Logistics & Remitly Designation: Compensation shall be calculated in United States Dollars ($ USD) and remitted on a bi-weekly schedule via the REMITLY payment platform.

Upon payment, the Contractor will receive a notification from Remitly to select their preferred disbursement method (bank deposit, mobile money, cash pickup, etc.).

The Contractor is responsible for any recipient-side conversion fees, cash-out fees, or local banking charges.

═══════════════════════════════════════════════════════════════════════════════

4. WORK HOURS, SCHEDULING & TIME TRACKING

Flexibility & Scheduling: The Contractor retains the freedom to set their own daily work schedule and choose their hours. However, total available billable hours and assigned task volumes are determined at the sole discretion of the Business Owner and may fluctuate based on operational demands.

Mandatory Time Tracking: The Contractor MUST log all billable hours accurately in real-time using the clock-in/clock-out functionality provided within the Thrifty Curator web application. Unlogged hours, manual overrides without prior authorization, or unverified time will not be eligible for compensation.

═══════════════════════════════════════════════════════════════════════════════

5. REMOTE SYSTEM ACCESS & SECURITY PROTOCOLS

Security & Access Requirements:

• Remote connections must be established exclusively through authorized AnyDesk access channels provided during onboarding.

• Contractor shall NOT share AnyDesk addresses, passwords, Vendoo login credentials, or Thrifty Curator account access with any third party under any circumstances.

• Contractor agrees not to extract, export, copy, or distribute company databases, item lists, customer records, or listing workflows.

═══════════════════════════════════════════════════════════════════════════════

6. CONFIDENTIALITY & INTELLECTUAL PROPERTY

All proprietary information, including inventory sourcing data, pricing rules, listing templates, custom web app tools, standard operating procedures, and business strategies disclosed during engagement remain the exclusive property of Thrifty Curator. The Contractor agrees to keep all such information strictly confidential during and after the term of this Agreement.

═══════════════════════════════════════════════════════════════════════════════

7. TERM, AT-WILL STATUS & TERMINATION

This Agreement is effective upon execution and shall continue until terminated by either party. Either party may terminate this Agreement at any time, with or without cause, by providing written notice (via email or messaging portal).

Upon notice of termination, the Contractor's right to access AnyDesk, Vendoo, and the Thrifty Curator web app shall be immediately revoked, and final payment for all verified, logged hours worked up to the timestamp of termination will be processed on the next standard payout date.

═══════════════════════════════════════════════════════════════════════════════

8. GOVERNING LAW & DIGITAL ACCEPTANCE

This Agreement shall be governed by and construed in accordance with the laws of the State of Nebraska, United States. Electronic signatures, digital acknowledgement buttons, or electronic check-boxes submitted through the Thrifty Curator onboarding workflow shall be considered legal, valid, and binding.

═══════════════════════════════════════════════════════════════════════════════

COMPANY: Thrifty Curator

Authorized Signatures / Business Owners:

Matthew Guzman                              Eunice Guzman
_____________________________              _____________________________
Date: Pre-signed                           Date: Pre-signed

═══════════════════════════════════════════════════════════════════════════════

CONTRACTOR ACKNOWLEDGEMENT

By signing below, I acknowledge that I have read, understood, and agree to all terms of this Independent Contractor Agreement.
"""


@router.get("/text")
async def get_agreement_text():
    """Get the contractor agreement text"""
    return {"agreement_text": CONTRACTOR_AGREEMENT_TEXT}


@router.get("/status")
async def get_agreement_status(current_user: dict = Depends(get_current_user), user_id: str = None):
    """Get contractor agreement status. Admins can pass user_id to view any employee's data."""
    # Allow admins to view another employee's data
    if user_id and current_user.get("role") == "admin":
        employee_id = user_id
    else:
        employee_id = current_user.get("id") or str(current_user.get("_id", ""))
    
    agreement = await db.contractor_agreements.find_one(
        {"employee_id": employee_id},
        {"_id": 0}
    )
    
    if not agreement:
        return {
            "status": "not_submitted",
            "signed_at": None,
            "signature_text": None,
            "signed_name": None,
            "agreement_text": CONTRACTOR_AGREEMENT_TEXT,
            "can_sign": True,
            "admin_feedback": None
        }
    
    # Determine if user can re-sign (only if rejected/needs_correction)
    can_sign = agreement.get("status") in ["not_submitted", "needs_correction"]
    
    return {
        "status": agreement.get("status", "not_submitted"),
        "signed_at": agreement.get("signed_at"),
        "signature_text": agreement.get("signature_text"),
        "signed_name": agreement.get("signed_name"),
        "agreement_text": CONTRACTOR_AGREEMENT_TEXT,
        "can_sign": can_sign,
        "admin_feedback": agreement.get("admin_feedback"),
        # Contractor details
        "contact_email": agreement.get("contact_email"),
        # Payment info for Remitly
        "payment_first_name": agreement.get("payment_first_name"),
        "payment_last_name": agreement.get("payment_last_name"),
        "payment_email": agreement.get("payment_email"),
        "payment_phone": agreement.get("payment_phone"),
        "payment_country": agreement.get("payment_country"),
        "reviewed_by": agreement.get("reviewed_by")
    }


@router.post("/sign")
async def sign_agreement(
    request: SignAgreementRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sign the contractor agreement - submits for admin review"""
    if not request.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the terms")
    
    if not request.full_name or not request.signature_text:
        raise HTTPException(status_code=400, detail="Full name and signature are required")
    
    employee_id = current_user.get("id") or str(current_user.get("_id", ""))
    employee_email = current_user.get("email", "")
    employee_name = current_user.get("name", request.full_name)
    
    # Check if already approved
    existing = await db.contractor_agreements.find_one({"employee_id": employee_id})
    if existing and existing.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Agreement already approved")
    
    # Check if pending review (don't allow re-submission while pending)
    if existing and existing.get("status") == "pending_review":
        raise HTTPException(status_code=400, detail="Agreement is pending admin review")
    
    agreement_data = {
        "employee_id": employee_id,
        "employee_email": employee_email,
        "employee_name": employee_name,
        "signed_name": request.full_name,
        "signature_text": request.signature_text,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_review",  # Pending admin approval
        "agreement_version": "2.0",  # Updated agreement version
        "admin_feedback": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Contractor fillable fields
        "contact_email": request.contact_email or employee_email,
        # Payment info for Remitly
        "payment_first_name": request.payment_first_name,
        "payment_last_name": request.payment_last_name,
        "payment_email": request.payment_email,
        "payment_phone": request.payment_phone,
        "payment_country": request.payment_country
    }
    
    if existing:
        # Re-submission after rejection
        agreement_data["resubmitted_at"] = datetime.now(timezone.utc).isoformat()
        await db.contractor_agreements.update_one(
            {"employee_id": employee_id},
            {"$set": agreement_data}
        )
    else:
        await db.contractor_agreements.insert_one(agreement_data)
    
    # Create contractor agreement submission notification for admin
    notification = AdminNotification(
        type="contractor_agreement_submission",
        employee_id=employee_id,
        employee_name=employee_name,
        message=f"{employee_name} signed the Contractor Agreement",
        details={"signed_at": agreement_data["signed_at"], "email": employee_email}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    # Send push notification
    try:
        await send_admin_push_notification(
            title="Contractor Agreement Signed",
            body=f"{employee_name} signed the Contractor Agreement - pending review",
            notification_type="contractor_agreement_submission"
        )
    except Exception as e:
        print(f"Failed to send contractor agreement push notification: {e}")
    
    return {
        "success": True,
        "message": "Contractor agreement submitted for review",
        "status": "pending_review",
        "signed_at": agreement_data["signed_at"]
    }


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/pending")
async def get_pending_agreements(admin_user: dict = Depends(get_admin_user)):
    """Get all contractor agreements pending review"""
    pending = await db.contractor_agreements.find(
        {"status": "pending_review"},
        {"_id": 0}
    ).to_list(100)
    
    # Add the agreement text to each pending agreement for review
    for agreement in pending:
        agreement["agreement_text"] = CONTRACTOR_AGREEMENT_TEXT
    
    return {"pending": pending, "count": len(pending)}


@router.get("/admin/all")
async def get_all_agreements(admin_user: dict = Depends(get_admin_user)):
    """Admin endpoint to get all contractor agreements"""
    agreements = await db.contractor_agreements.find(
        {},
        {"_id": 0}
    ).to_list(1000)
    
    return {"agreements": agreements}


@router.get("/admin/employee/{employee_id}")
async def get_employee_agreement(
    employee_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin endpoint to view an employee's contractor agreement"""
    agreement = await db.contractor_agreements.find_one(
        {"employee_id": employee_id},
        {"_id": 0}
    )
    
    if not agreement:
        # Get employee info for the response - use 'id' field, not _id
        employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {
            "status": "not_submitted",
            "employee_id": employee_id,
            "employee_name": employee.get("name", "Unknown"),
            "employee_email": employee.get("email", ""),
            "signed_at": None,
            "signature_text": None,
            "signed_name": None,
            "agreement_text": CONTRACTOR_AGREEMENT_TEXT
        }
    
    return {
        **agreement,
        "agreement_text": CONTRACTOR_AGREEMENT_TEXT
    }


@router.post("/admin/employee/{employee_id}/approve")
async def approve_agreement(
    employee_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin endpoint to approve a contractor agreement"""
    agreement = await db.contractor_agreements.find_one({"employee_id": employee_id})
    
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    if agreement.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Agreement already approved")
    
    admin_name = admin_user.get("name", "Admin")
    
    await db.contractor_agreements.update_one(
        {"employee_id": employee_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin_name,
            "admin_feedback": None
        }}
    )
    
    # Also update the user document
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"contractor_agreement_status": "approved"}}
    )
    
    return {"success": True, "message": "Contractor agreement approved"}


@router.post("/admin/employee/{employee_id}/reject")
async def reject_agreement(
    employee_id: str,
    request: ReviewAgreementRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin endpoint to reject a contractor agreement - requires re-signing"""
    agreement = await db.contractor_agreements.find_one({"employee_id": employee_id})
    
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    if agreement.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot reject an approved agreement")
    
    admin_name = admin_user.get("name", "Admin")
    
    await db.contractor_agreements.update_one(
        {"employee_id": employee_id},
        {"$set": {
            "status": "needs_correction",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin_name,
            "admin_feedback": request.feedback or "Please review and sign again"
        }}
    )
    
    # Also update the user document
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"contractor_agreement_status": "needs_correction"}}
    )
    
    return {"success": True, "message": "Contractor agreement rejected - employee must re-sign"}



@router.delete("/admin/employee/{employee_id}")
async def delete_contractor_agreement(
    employee_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin endpoint to delete an employee's contractor agreement"""
    result = await db.contractor_agreements.delete_one({"employee_id": employee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contractor agreement not found")
    
    # Also clear the status from user document
    await db.users.update_one(
        {"id": employee_id},
        {"$unset": {"contractor_agreement_status": ""}}
    )
    
    return {"success": True, "message": "Contractor agreement deleted"}
