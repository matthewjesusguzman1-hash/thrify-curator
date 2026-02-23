from fastapi import APIRouter
from datetime import datetime, timezone

from core.config import db
from models import JobApplication, ConsignmentInquiry, ConsignmentAgreement

router = APIRouter(prefix="/forms", tags=["Forms"])

@router.post("/job-application")
async def submit_job_application(application: JobApplication):
    application.submitted_at = datetime.now(timezone.utc).isoformat()
    await db.job_applications.insert_one(application.model_dump())
    return {"message": "Application submitted successfully", "id": application.id}

@router.post("/consignment-inquiry")
async def submit_consignment_inquiry(inquiry: ConsignmentInquiry):
    inquiry.submitted_at = datetime.now(timezone.utc).isoformat()
    await db.consignment_inquiries.insert_one(inquiry.model_dump())
    return {"message": "Inquiry submitted successfully", "id": inquiry.id}

@router.post("/consignment-agreement")
async def submit_consignment_agreement(agreement: ConsignmentAgreement):
    agreement.submitted_at = datetime.now(timezone.utc).isoformat()
    await db.consignment_agreements.insert_one(agreement.model_dump())
    return {"message": "Agreement submitted successfully", "id": agreement.id}
