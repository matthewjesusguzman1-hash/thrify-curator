from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
import os
import uuid as uuid_module

from app.database import db
from app.dependencies import get_admin_user
from app.models.forms import JobApplication, ConsignmentInquiry, ConsignmentAgreement, UpdateSubmissionStatus, PaymentMethodUpdate, ConsignmentItemAddition
from app.models.notifications import AdminNotification

router = APIRouter(tags=["Forms"])

# Ensure upload directory exists
UPLOAD_DIR = "/app/uploads/consignment_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/forms/upload-photos")
async def upload_consignment_photos(files: List[UploadFile] = File(...)):
    """Upload photos for consignment forms. Returns list of file paths."""
    uploaded_paths = []
    
    for file in files:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            continue
        
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid_module.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        try:
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            uploaded_paths.append(f"/uploads/consignment_photos/{unique_filename}")
        except Exception as e:
            print(f"Error saving file {file.filename}: {e}")
            continue
    
    return {"uploaded_paths": uploaded_paths}


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
        employee_name=agreement.full_name,
        message=f"New consignment agreement signed by {agreement.full_name}",
        details={"email": agreement.email}
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return agreement


@router.get("/forms/check-existing-agreement")
async def check_existing_agreement(email: str):
    """Check if user has an existing consignment agreement"""
    existing = await db.consignment_agreements.find_one(
        {"email": email.lower()}, 
        {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "address": 1, "payment_method": 1, "payment_details": 1, "items_description": 1, "submitted_at": 1, "agreed_percentage": 1}
    )
    if existing:
        return {"has_agreement": True, "agreement": existing}
    return {"has_agreement": False}


@router.post("/forms/update-payment-method")
async def update_payment_method(update: PaymentMethodUpdate):
    """Update payment method for existing consignment agreement"""
    # Find existing agreement by email
    existing = await db.consignment_agreements.find_one({"email": update.email.lower()})
    if not existing:
        raise HTTPException(status_code=404, detail="No existing agreement found for this email")
    
    old_payment_method = existing.get("payment_method", "Not set")
    old_payment_details = existing.get("payment_details", "")
    
    # Update payment method
    result = await db.consignment_agreements.update_one(
        {"email": update.email.lower()},
        {"$set": {
            "payment_method": update.payment_method,
            "payment_details": update.payment_details
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update payment method")
    
    # Create notification for admin
    from datetime import datetime, timezone
    import uuid
    notification = AdminNotification(
        type="payment_method_change",
        employee_id=existing.get("id", ""),
        employee_name=existing.get("full_name", "Unknown"),
        message=f"Payment method changed by {existing.get('full_name', 'Unknown')}",
        details={
            "email": update.email,
            "old_method": old_payment_method,
            "new_method": update.payment_method,
            "old_details": old_payment_details,
            "new_details": update.payment_details
        }
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    # Log the payment method change
    change_log = {
        "id": str(uuid.uuid4()),
        "agreement_id": existing.get("id", ""),
        "full_name": existing.get("full_name", "Unknown"),
        "email": update.email.lower(),
        "old_payment_method": old_payment_method,
        "old_payment_details": old_payment_details,
        "new_payment_method": update.payment_method,
        "new_payment_details": update.payment_details,
        "changed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_method_changes.insert_one(change_log)
    
    return {"success": True, "message": "Payment method updated successfully"}


@router.get("/admin/forms/payment-method-changes")
async def get_payment_method_changes(admin: dict = Depends(get_admin_user)):
    """Get all payment method change logs for admin review"""
    changes = await db.payment_method_changes.find({}, {"_id": 0}).sort("changed_at", -1).to_list(500)
    return changes


@router.post("/forms/add-consignment-items", response_model=ConsignmentItemAddition)
async def add_consignment_items(addition: ConsignmentItemAddition):
    """Add more items to an existing consignment agreement or update contact/payment info"""
    from datetime import datetime, timezone
    
    # Find existing agreement by email
    existing = await db.consignment_agreements.find_one({"email": addition.email.lower()})
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No existing agreement found for this email")
    
    # Set the agreement_id and full_name from existing agreement
    addition_dict = addition.model_dump()
    addition_dict["agreement_id"] = existing.get("id", "")
    addition_dict["full_name"] = existing.get("full_name", addition.full_name)
    addition_dict["email"] = addition.email.lower()
    
    # Save to database
    await db.consignment_item_additions.insert_one(addition_dict)
    
    # Build update fields for the agreement
    update_fields = {}
    
    # Update item count if items were added
    if addition.items_to_add > 0:
        current_items = int(existing.get("items_description", "0") or "0")
        new_total = current_items + addition.items_to_add
        update_fields["items_description"] = str(new_total)
    
    # Update contact info if provided
    if addition.update_email:
        update_fields["email"] = addition.update_email.lower()
    if addition.update_phone:
        update_fields["phone"] = addition.update_phone
    if addition.update_address:
        update_fields["address"] = addition.update_address
    
    # Update payment method if provided
    if addition.update_payment_method:
        update_fields["payment_method"] = addition.update_payment_method
        update_fields["payment_details"] = addition.update_payment_details or ""
    
    # Update profit split if provided
    if addition.update_profit_split:
        update_fields["agreed_percentage"] = addition.update_profit_split
    
    # Apply updates to agreement
    if update_fields:
        await db.consignment_agreements.update_one(
            {"email": addition.email.lower()},
            {"$set": update_fields}
        )
    
    # Create notification for admin
    notification_parts = []
    if addition.items_to_add > 0:
        notification_parts.append(f"added {addition.items_to_add} items")
    if addition.update_email or addition.update_phone or addition.update_address:
        notification_parts.append("updated contact info")
    if addition.update_payment_method:
        notification_parts.append("changed payment method")
    if addition.update_profit_split:
        notification_parts.append("updated profit split")
    
    notification = AdminNotification(
        type="consignment_items_added",
        employee_id=addition_dict["id"],
        employee_name=addition_dict["full_name"],
        message=f"{addition_dict['full_name']} {', '.join(notification_parts)}" if notification_parts else f"{addition_dict['full_name']} updated their agreement",
        details={
            "email": addition.email,
            "items_added": addition.items_to_add,
            "new_total": update_fields.get("items_description", existing.get("items_description", "0")),
            "description": addition.items_description,
            "email_updated": bool(addition.update_email),
            "phone_updated": bool(addition.update_phone),
            "address_updated": bool(addition.update_address),
            "payment_updated": bool(addition.update_payment_method),
            "new_payment_method": addition.update_payment_method,
            "profit_split_updated": bool(addition.update_profit_split),
            "new_profit_split": addition.update_profit_split,
            "additional_info": addition.additional_info,
            "photos_count": len(addition.photos) if addition.photos else 0,
            "signature": addition.signature
        }
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    return ConsignmentItemAddition(**addition_dict)


@router.get("/admin/forms/consignment-item-additions")
async def get_consignment_item_additions(admin: dict = Depends(get_admin_user)):
    """Get all consignment item addition logs for admin review"""
    additions = await db.consignment_item_additions.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return additions


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


# PDF Download endpoints
from fastapi.responses import Response
from fpdf import FPDF
from datetime import datetime


def format_date(iso_string):
    """Format ISO date string to readable format"""
    try:
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        return dt.strftime("%B %d, %Y at %I:%M %p")
    except:
        return iso_string or "N/A"


class FormPDF(FPDF):
    def __init__(self, title, accent_color):
        super().__init__()
        self.title_text = title
        self.accent_color = accent_color
        
    def header(self):
        # Header background
        self.set_fill_color(*self.accent_color)
        self.rect(0, 0, 210, 35, 'F')
        
        # Logo/Brand
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.set_xy(15, 10)
        self.cell(0, 10, 'THRIFTY CURATOR', 0, 1, 'L')
        
        # Title
        self.set_font('Helvetica', '', 12)
        self.set_xy(15, 22)
        self.cell(0, 6, self.title_text, 0, 1, 'L')
        
        self.ln(20)
        
    def footer(self):
        self.set_y(-20)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()} | Generated on {datetime.now().strftime("%B %d, %Y")}', 0, 0, 'C')
        
    def section_header(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*self.accent_color)
        self.cell(0, 8, title.upper(), 0, 1, 'L')
        self.set_draw_color(*self.accent_color)
        self.line(self.get_x(), self.get_y(), self.get_x() + 180, self.get_y())
        self.ln(3)
        
    def field(self, label, value, indent=False):
        x_start = 20 if indent else 15
        self.set_x(x_start)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(100, 100, 100)
        self.cell(45, 6, label + ":", 0, 0, 'L')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(30, 30, 30)
        # Handle long text
        if len(str(value)) > 70:
            self.ln(6)
            self.set_x(x_start)
            self.multi_cell(170, 5, str(value))
        else:
            self.cell(0, 6, str(value), 0, 1, 'L')
            
    def field_multiline(self, label, value):
        self.set_x(15)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, label + ":", 0, 1, 'L')
        self.set_x(15)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(30, 30, 30)
        # Light gray background for multiline content
        self.set_fill_color(248, 248, 248)
        y_start = self.get_y()
        self.multi_cell(180, 5, str(value), 0, 'L', True)
        self.ln(3)
        
    def yes_no_field(self, label, value):
        self.set_x(15)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(100, 100, 100)
        self.cell(80, 6, label + ":", 0, 0, 'L')
        self.set_font('Helvetica', 'B', 10)
        if value:
            self.set_text_color(34, 139, 34)  # Green
            self.cell(0, 6, "YES", 0, 1, 'L')
        else:
            self.set_text_color(220, 20, 60)  # Red
            self.cell(0, 6, "NO", 0, 1, 'L')
            
    def status_badge(self, status):
        status_colors = {
            'new': (59, 130, 246),      # Blue
            'reviewed': (234, 179, 8),   # Yellow
            'contacted': (34, 197, 94),  # Green
            'archived': (156, 163, 175)  # Gray
        }
        color = status_colors.get(status, (59, 130, 246))
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 9)
        self.cell(25, 7, (status or 'new').upper(), 0, 1, 'C', True)
        self.ln(2)


@router.get("/admin/forms/job-applications/{submission_id}/pdf")
async def download_job_application_pdf(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Download job application as PDF"""
    submission = await db.job_applications.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Create PDF
    pdf = FormPDF("Job Application", (255, 20, 147))  # Pink
    pdf.add_page()
    
    # Status
    pdf.section_header("Application Status")
    pdf.status_badge(submission.get('status'))
    pdf.ln(5)
    
    # Applicant Information
    pdf.section_header("Applicant Information")
    pdf.field("Full Name", submission.get('full_name', 'N/A'))
    pdf.field("Email", submission.get('email', 'N/A'))
    pdf.field("Phone", submission.get('phone', 'N/A'))
    pdf.field("Address", submission.get('address', 'N/A'))
    pdf.field("Submitted", format_date(submission.get('submitted_at')))
    pdf.ln(5)
    
    # Experience
    if submission.get('resume_text'):
        pdf.section_header("Resume / Experience")
        pdf.field_multiline("Details", submission.get('resume_text'))
    
    # Why Join
    if submission.get('why_join'):
        pdf.section_header("Why Join Us")
        pdf.field_multiline("Response", submission.get('why_join'))
    
    # Availability
    if submission.get('availability'):
        pdf.section_header("Availability")
        pdf.field("Schedule", submission.get('availability'))
        pdf.ln(3)
    
    # Tasks
    if submission.get('tasks_able_to_perform'):
        pdf.section_header("Tasks Able to Perform")
        tasks = ', '.join(submission.get('tasks_able_to_perform', []))
        pdf.field("Selected Tasks", tasks if tasks else 'None specified')
        pdf.ln(3)
    
    # Background & Transportation
    pdf.section_header("Additional Information")
    pdf.yes_no_field("Background Check Consent", submission.get('background_check_consent'))
    pdf.yes_no_field("Reliable Transportation", submission.get('has_reliable_transportation'))
    
    # Generate PDF bytes
    pdf_bytes = pdf.output()
    
    filename = f"{submission.get('full_name', 'applicant').replace(' ', '_')}_Job_Application.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/admin/forms/consignment-inquiries/{submission_id}/pdf")
async def download_consignment_inquiry_pdf(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Download consignment inquiry as PDF"""
    submission = await db.consignment_inquiries.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Create PDF
    pdf = FormPDF("Consignment Inquiry", (0, 212, 255))  # Cyan
    pdf.add_page()
    
    # Status
    pdf.section_header("Inquiry Status")
    pdf.status_badge(submission.get('status'))
    pdf.ln(5)
    
    # Contact Information
    pdf.section_header("Contact Information")
    pdf.field("Full Name", submission.get('full_name', 'N/A'))
    pdf.field("Email", submission.get('email', 'N/A'))
    pdf.field("Phone", submission.get('phone', 'N/A'))
    pdf.field("Submitted", format_date(submission.get('submitted_at')))
    pdf.ln(5)
    
    # Item Details
    pdf.section_header("Item Details")
    if submission.get('item_types'):
        pdf.field("Item Types", ', '.join(submission.get('item_types', [])))
    if submission.get('other_item_type'):
        pdf.field("Other Type", submission.get('other_item_type'))
    if submission.get('item_condition'):
        pdf.field("Condition", submission.get('item_condition'))
    pdf.ln(3)
    
    # Item Description
    if submission.get('item_description'):
        pdf.section_header("Item Description")
        pdf.field_multiline("Details", submission.get('item_description'))
    
    # Environment
    pdf.section_header("Environment Information")
    pdf.yes_no_field("Smoke-Free Environment", submission.get('smoke_free'))
    pdf.yes_no_field("Pet-Free Environment", submission.get('pet_free'))
    
    # Generate PDF bytes
    pdf_bytes = pdf.output()
    
    filename = f"{submission.get('full_name', 'inquiry').replace(' ', '_')}_Consignment_Inquiry.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/admin/forms/consignment-agreements/{submission_id}/pdf")
async def download_consignment_agreement_pdf(submission_id: str, admin: dict = Depends(get_admin_user)):
    """Download consignment agreement as PDF"""
    submission = await db.consignment_agreements.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Create PDF
    pdf = FormPDF("Consignment Agreement", (139, 92, 246))  # Purple
    pdf.add_page()
    
    # Status
    pdf.section_header("Agreement Status")
    pdf.status_badge(submission.get('status'))
    pdf.ln(5)
    
    # Consignor Information
    pdf.section_header("Consignor Information")
    pdf.field("Full Name", submission.get('full_name', 'N/A'))
    pdf.field("Email", submission.get('email', 'N/A'))
    pdf.field("Phone", submission.get('phone', 'N/A'))
    pdf.field("Address", submission.get('address', 'N/A'))
    pdf.ln(5)
    
    # Agreement Details
    pdf.section_header("Agreement Details")
    pdf.field("Agreed Percentage", submission.get('agreed_percentage', 'N/A'))
    pdf.field("Signature Date", submission.get('signature_date', 'N/A'))
    pdf.field("Submitted", format_date(submission.get('submitted_at')))
    pdf.ln(3)
    
    # Items Description
    if submission.get('items_description'):
        pdf.section_header("Items Description")
        pdf.field_multiline("Details", submission.get('items_description'))
    
    # Signature
    pdf.section_header("Signature")
    pdf.set_x(15)
    pdf.set_font('Helvetica', 'I', 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, submission.get('signature', 'N/A'), 0, 1, 'L')
    pdf.set_draw_color(100, 100, 100)
    pdf.line(15, pdf.get_y(), 100, pdf.get_y())
    pdf.ln(5)
    
    # Terms Agreement
    pdf.section_header("Terms")
    pdf.yes_no_field("Agreed to Terms & Conditions", submission.get('agreed_to_terms'))
    
    # Generate PDF bytes
    pdf_bytes = pdf.output()
    
    filename = f"{submission.get('full_name', 'agreement').replace(' ', '_')}_Consignment_Agreement.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
