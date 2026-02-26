from fastapi import APIRouter, HTTPException, Depends

from app.database import db
from app.dependencies import get_admin_user
from app.models.forms import JobApplication, ConsignmentInquiry, ConsignmentAgreement, UpdateSubmissionStatus
from app.models.notifications import AdminNotification

router = APIRouter(tags=["Forms"])


# Public form submission routes
@router.post("/forms/job-application", response_model=JobApplication)
async def submit_job_application(application: JobApplication):
    doc = application.model_dump()
    await db.job_applications.insert_one(doc)
    
    # Create notification for admin
    notification = AdminNotification(
        type="job_application",
        employee_id=application.id,
        employee_name=application.full_name,
        message=f"New job application from {application.full_name}",
        details={"email": application.email, "phone": application.phone or ""}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return application


@router.post("/forms/consignment-inquiry", response_model=ConsignmentInquiry)
async def submit_consignment_inquiry(inquiry: ConsignmentInquiry):
    doc = inquiry.model_dump()
    await db.consignment_inquiries.insert_one(doc)
    
    # Create notification for admin
    notification = AdminNotification(
        type="consignment_inquiry",
        employee_id=inquiry.id,
        employee_name=inquiry.full_name,
        message=f"New consignment inquiry from {inquiry.full_name}",
        details={"email": inquiry.email}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return inquiry


@router.post("/forms/consignment-agreement", response_model=ConsignmentAgreement)
async def submit_consignment_agreement(agreement: ConsignmentAgreement):
    doc = agreement.model_dump()
    await db.consignment_agreements.insert_one(doc)
    
    # Create notification for admin
    notification = AdminNotification(
        type="consignment_agreement",
        employee_id=agreement.id,
        employee_name=agreement.consignor_name,
        message=f"New consignment agreement signed by {agreement.consignor_name}",
        details={"email": agreement.consignor_email}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return agreement


# Admin form management routes
@router.get("/admin/forms/job-applications")
async def get_job_applications(admin: dict = Depends(get_admin_user)):
    """Get all job application submissions"""
    submissions = await db.job_applications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return submissions


@router.get("/admin/forms/consignment-inquiries")
async def get_consignment_inquiries(admin: dict = Depends(get_admin_user)):
    """Get all consignment inquiry submissions"""
    submissions = await db.consignment_inquiries.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return submissions


@router.get("/admin/forms/consignment-agreements")
async def get_consignment_agreements(admin: dict = Depends(get_admin_user)):
    """Get all consignment agreement submissions"""
    submissions = await db.consignment_agreements.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return submissions


@router.put("/admin/forms/job-applications/{submission_id}/status")
async def update_job_application_status(submission_id: str, status_update: UpdateSubmissionStatus, admin: dict = Depends(get_admin_user)):
    """Update job application status"""
    result = await db.job_applications.update_one(
        {"id": submission_id},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Status updated", "status": status_update.status}


@router.put("/admin/forms/consignment-inquiries/{submission_id}/status")
async def update_consignment_inquiry_status(submission_id: str, status_update: UpdateSubmissionStatus, admin: dict = Depends(get_admin_user)):
    """Update consignment inquiry status"""
    result = await db.consignment_inquiries.update_one(
        {"id": submission_id},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Status updated", "status": status_update.status}


@router.put("/admin/forms/consignment-agreements/{submission_id}/status")
async def update_consignment_agreement_status(submission_id: str, status_update: UpdateSubmissionStatus, admin: dict = Depends(get_admin_user)):
    """Update consignment agreement status"""
    result = await db.consignment_agreements.update_one(
        {"id": submission_id},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Status updated", "status": status_update.status}


@router.delete("/admin/forms/job-applications/{submission_id}")
async def delete_job_application(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a job application submission"""
    result = await db.job_applications.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted"}


@router.delete("/admin/forms/consignment-inquiries/{submission_id}")
async def delete_consignment_inquiry(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a consignment inquiry submission"""
    result = await db.consignment_inquiries.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted"}


@router.delete("/admin/forms/consignment-agreements/{submission_id}")
async def delete_consignment_agreement(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a consignment agreement submission"""
    result = await db.consignment_agreements.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted"}


@router.get("/admin/forms/summary")
async def get_forms_summary(admin: dict = Depends(get_admin_user)):
    """Get summary counts for all form submissions"""
    job_apps = await db.job_applications.count_documents({})
    job_apps_new = await db.job_applications.count_documents({"$or": [{"status": "new"}, {"status": {"$exists": False}}]})
    
    inquiries = await db.consignment_inquiries.count_documents({})
    inquiries_new = await db.consignment_inquiries.count_documents({"$or": [{"status": "new"}, {"status": {"$exists": False}}]})
    
    agreements = await db.consignment_agreements.count_documents({})
    agreements_new = await db.consignment_agreements.count_documents({"$or": [{"status": "new"}, {"status": {"$exists": False}}]})
    
    return {
        "job_applications": {"total": job_apps, "new": job_apps_new},
        "consignment_inquiries": {"total": inquiries, "new": inquiries_new},
        "consignment_agreements": {"total": agreements, "new": agreements_new}
    }
