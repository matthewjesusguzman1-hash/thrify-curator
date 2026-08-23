"""
Contractor Agreement Routes

Handles digital signing and management of contractor agreements for employees.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/contractor-agreement", tags=["Contractor Agreement"])


class SignAgreementRequest(BaseModel):
    full_name: str
    signature_text: str  # Their typed signature
    agreed_to_terms: bool


class AgreementResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    employee_email: str
    signed_at: Optional[str] = None
    signature_text: Optional[str] = None
    signed_name: Optional[str] = None
    status: str  # "pending", "signed"
    agreement_text: str


# The contractor agreement text
CONTRACTOR_AGREEMENT_TEXT = """
INDEPENDENT CONTRACTOR AGREEMENT

This Independent Contractor Agreement ("Agreement") is entered into between Thrifty Curator ("Company") and the undersigned contractor ("Contractor").

1. INDEPENDENT CONTRACTOR STATUS
The Contractor acknowledges and agrees that they are an independent contractor and not an employee of the Company. The Contractor is responsible for their own taxes, insurance, and benefits.

2. SERVICES
The Contractor agrees to provide services as assigned by the Company, which may include but are not limited to:
- Inventory photography
- Listing creation and write-up
- Shipping and packing
- Item cleaning and preparation
- Administrative tasks

3. COMPENSATION
The Contractor will be compensated according to the agreed-upon rates for services rendered. Payment will be made through the Contractor's preferred payment method as specified in their profile.

4. CONFIDENTIALITY
The Contractor agrees to maintain the confidentiality of all Company information, including but not limited to client lists, pricing, business strategies, and proprietary methods.

5. NON-COMPETE
During the term of this Agreement and for a period of six (6) months following termination, the Contractor agrees not to engage in any business that directly competes with the Company's resale operations.

6. EQUIPMENT AND MATERIALS
The Contractor may be provided access to Company equipment and materials. The Contractor agrees to use such resources solely for Company business and to return all materials upon termination.

7. TERMINATION
Either party may terminate this Agreement at any time with or without cause. Upon termination, the Contractor will be paid for all services rendered up to the termination date.

8. LIABILITY
The Contractor agrees to indemnify and hold harmless the Company from any claims, damages, or expenses arising from the Contractor's services.

9. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Texas.

By signing below, the Contractor acknowledges that they have read, understood, and agree to all terms of this Agreement.
"""


@router.get("/text")
async def get_agreement_text():
    """Get the contractor agreement text"""
    return {"agreement_text": CONTRACTOR_AGREEMENT_TEXT}


@router.get("/status")
async def get_agreement_status(current_user: dict = Depends(get_current_user)):
    """Get the current user's contractor agreement status"""
    employee_id = current_user.get("id") or str(current_user.get("_id", ""))
    
    agreement = await db.contractor_agreements.find_one(
        {"employee_id": employee_id},
        {"_id": 0}
    )
    
    if not agreement:
        return {
            "status": "pending",
            "signed_at": None,
            "signature_text": None,
            "signed_name": None,
            "agreement_text": CONTRACTOR_AGREEMENT_TEXT
        }
    
    return {
        "status": agreement.get("status", "pending"),
        "signed_at": agreement.get("signed_at"),
        "signature_text": agreement.get("signature_text"),
        "signed_name": agreement.get("signed_name"),
        "agreement_text": CONTRACTOR_AGREEMENT_TEXT
    }


@router.post("/sign")
async def sign_agreement(
    request: SignAgreementRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sign the contractor agreement"""
    if not request.agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the terms")
    
    if not request.full_name or not request.signature_text:
        raise HTTPException(status_code=400, detail="Full name and signature are required")
    
    employee_id = current_user.get("id") or str(current_user.get("_id", ""))
    employee_email = current_user.get("email", "")
    employee_name = current_user.get("name", request.full_name)
    
    # Check if already signed
    existing = await db.contractor_agreements.find_one({"employee_id": employee_id})
    if existing and existing.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Agreement already signed")
    
    agreement_data = {
        "employee_id": employee_id,
        "employee_email": employee_email,
        "employee_name": employee_name,
        "signed_name": request.full_name,
        "signature_text": request.signature_text,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "status": "signed",
        "agreement_version": "1.0",
        "ip_address": None,  # Could capture this from request if needed
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.contractor_agreements.update_one(
            {"employee_id": employee_id},
            {"$set": agreement_data}
        )
    else:
        await db.contractor_agreements.insert_one(agreement_data)
    
    return {
        "success": True,
        "message": "Contractor agreement signed successfully",
        "signed_at": agreement_data["signed_at"]
    }


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
        # Get employee info for the response
        employee = await db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {
            "status": "pending",
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


@router.get("/admin/all")
async def get_all_agreements(admin_user: dict = Depends(get_admin_user)):
    """Admin endpoint to get all contractor agreements"""
    agreements = await db.contractor_agreements.find(
        {},
        {"_id": 0}
    ).to_list(1000)
    
    return {"agreements": agreements}
