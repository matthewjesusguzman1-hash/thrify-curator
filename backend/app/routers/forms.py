from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from typing import List
from datetime import datetime, timezone
import os
import uuid as uuid_module

from app.database import db
from app.dependencies import get_admin_user
from app.models.forms import JobApplication, ConsignmentInquiry, ConsignmentAgreement, UpdateSubmissionStatus, PaymentMethodUpdate, ConsignmentItemAddition, ConsignmentApproval
from app.models.notifications import AdminNotification
from app.services.email_service import (
    send_consignment_agreement_confirmation,
    send_item_addition_confirmation,
    send_info_update_confirmation,
    send_approval_notification,
    send_test_email,
    get_email_status
)

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


@router.get("/forms/payment-history/{email}")
async def get_consignment_payment_history(email: str):
    """Get payment history for a consignment client (public endpoint for clients to view their payments)"""
    # Find all payments made to this client
    payments = await db.payroll_check_records.find(
        {"consignment_client_email": email.lower(), "payment_type": "consignment"},
        {"_id": 0, "image_data": 0}  # Exclude image data for performance
    ).sort("check_date", -1).to_list(100)
    
    # Calculate total paid
    total_paid = sum(p.get("amount", 0) or 0 for p in payments)
    
    return {
        "payments": payments,
        "total_paid": round(total_paid, 2),
        "payment_count": len(payments)
    }


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
async def submit_consignment_agreement(agreement: ConsignmentAgreement, background_tasks: BackgroundTasks):
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
    
    # Send confirmation email to user (in background to not block response)
    background_tasks.add_task(
        send_consignment_agreement_confirmation,
        to_email=agreement.email,
        full_name=agreement.full_name,
        agreed_percentage=agreement.agreed_percentage,
        items_description=agreement.items_description
    )
    
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


@router.get("/forms/my-submissions/{email}")
async def get_user_submissions(email: str):
    """Get all submissions for a user by email - allows users to view their submission history and status"""
    email_lower = email.lower()
    
    # First check if the user has an agreement
    agreement = await db.consignment_agreements.find_one(
        {"email": email_lower},
        {"_id": 0}
    )
    
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found for this email")
    
    # Get the current email from the agreement (in case it was updated)
    current_email = agreement.get("email", email_lower)
    
    # Also check for any agreements where email was updated to this email
    # or item additions that reference this user
    
    # Get the original agreement submission
    submissions = []
    
    # Add the original agreement as a submission
    submissions.append({
        "id": agreement.get("id"),
        "type": "consignment_agreement",
        "type_label": "Consignment Agreement",
        "full_name": agreement.get("full_name"),
        "email": agreement.get("email"),
        "submitted_at": agreement.get("submitted_at"),
        "items_description": agreement.get("items_description"),
        "agreed_percentage": agreement.get("agreed_percentage"),
        "approval_status": agreement.get("approval_status", "pending"),
        "items_accepted": agreement.get("items_accepted"),
        "rejected_items_action": agreement.get("rejected_items_action"),
        "admin_notes": agreement.get("admin_notes"),
        "reviewed_at": agreement.get("reviewed_at"),
        "reviewed_by": agreement.get("reviewed_by")
    })
    
    # Get all item additions for this user (by agreement_id or email)
    agreement_id = agreement.get("id")
    item_additions = await db.consignment_item_additions.find(
        {"$or": [
            {"agreement_id": agreement_id},
            {"email": current_email}
        ]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    for addition in item_additions:
        submissions.append({
            "id": addition.get("id"),
            "type": "item_addition",
            "type_label": "Item Addition" if addition.get("items_to_add", 0) > 0 else "Info Update",
            "full_name": addition.get("full_name"),
            "email": addition.get("email"),
            "submitted_at": addition.get("submitted_at"),
            "items_to_add": addition.get("items_to_add", 0),
            "items_description": addition.get("items_description"),
            "approval_status": addition.get("approval_status", "pending"),
            "items_accepted": addition.get("items_accepted"),
            "rejected_items_action": addition.get("rejected_items_action"),
            "admin_notes": addition.get("admin_notes"),
            "reviewed_at": addition.get("reviewed_at"),
            "reviewed_by": addition.get("reviewed_by"),
            "update_email": addition.get("update_email"),
            "update_phone": addition.get("update_phone"),
            "update_address": addition.get("update_address"),
            "update_payment_method": addition.get("update_payment_method")
        })
    
    # Sort all submissions by date (newest first)
    submissions.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)
    
    return {
        "user": {
            "full_name": agreement.get("full_name"),
            "email": current_email,
            "phone": agreement.get("phone"),
            "agreed_percentage": agreement.get("agreed_percentage"),
            "payment_method": agreement.get("payment_method")
        },
        "submissions": submissions
    }


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
async def add_consignment_items(addition: ConsignmentItemAddition, background_tasks: BackgroundTasks):
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
    
    # Set approval status based on whether items are being added
    # Info-only updates don't need approval - they're applied immediately
    if addition.items_to_add > 0:
        addition_dict["approval_status"] = "pending"  # Items need admin approval
    else:
        addition_dict["approval_status"] = "info_update"  # No approval needed, just a record
    
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
    
    # Send confirmation email to user (in background)
    full_name = addition_dict["full_name"]
    
    if addition.items_to_add > 0:
        # Items added - send item addition confirmation
        background_tasks.add_task(
            send_item_addition_confirmation,
            to_email=addition.update_email or addition.email,
            full_name=full_name,
            items_to_add=addition.items_to_add,
            items_description=addition.items_description
        )
    else:
        # Info update only - send info update confirmation
        updated_fields = []
        if addition.update_email:
            updated_fields.append("Email address")
        if addition.update_phone:
            updated_fields.append("Phone number")
        if addition.update_address:
            updated_fields.append("Mailing address")
        if addition.update_payment_method:
            updated_fields.append("Payment method")
        if addition.update_profit_split:
            updated_fields.append("Profit split percentage")
        
        if updated_fields:
            # Send to original email
            background_tasks.add_task(
                send_info_update_confirmation,
                to_email=addition.email,
                full_name=full_name,
                updated_fields=updated_fields,
                new_email=addition.update_email if addition.update_email else None
            )
    
    return ConsignmentItemAddition(**addition_dict)


@router.get("/admin/forms/consignment-item-additions")
async def get_consignment_item_additions(admin: dict = Depends(get_admin_user)):
    """Get all consignment item addition logs for admin review"""
    additions = await db.consignment_item_additions.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    
    # Enrich each addition with the most recent email from the master agreement
    for addition in additions:
        agreement_id = addition.get("agreement_id")
        if agreement_id:
            agreement = await db.consignment_agreements.find_one(
                {"id": agreement_id},
                {"_id": 0, "email": 1, "phone": 1, "full_name": 1}
            )
            if agreement:
                # Add current contact info from the master agreement
                addition["current_email"] = agreement.get("email", addition.get("email"))
                addition["current_phone"] = agreement.get("phone", addition.get("phone"))
                addition["current_full_name"] = agreement.get("full_name", addition.get("full_name"))
            else:
                # Fallback to stored values if agreement not found
                addition["current_email"] = addition.get("email")
                addition["current_phone"] = addition.get("phone")
                addition["current_full_name"] = addition.get("full_name")
        else:
            # Fallback if no agreement_id
            addition["current_email"] = addition.get("email")
            addition["current_phone"] = addition.get("phone")
            addition["current_full_name"] = addition.get("full_name")
    
    return additions


@router.delete("/admin/forms/item-additions/{update_id}")
async def delete_item_addition(update_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a consignment item addition/update record"""
    result = await db.consignment_item_additions.delete_one({"id": update_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Update record not found")
    return {"message": "Update deleted successfully"}


@router.get("/admin/forms/item-additions/{update_id}/pdf")
async def download_item_addition_pdf(update_id: str, admin: dict = Depends(get_admin_user)):
    """Download a consignment item addition/update as PDF"""
    update = await db.consignment_item_additions.find_one({"id": update_id}, {"_id": 0})
    if not update:
        raise HTTPException(status_code=404, detail="Update record not found")
    
    # Create PDF
    pdf = FormPDF("Consignment Client Update", (16, 185, 129))  # Emerald green
    pdf.add_page()
    
    # Client Information
    pdf.section_header("Client Information")
    pdf.field("Full Name", update.get('full_name', 'N/A'))
    pdf.field("Email", update.get('email', 'N/A'))
    pdf.field("Submitted", format_date(update.get('submitted_at')))
    pdf.ln(5)
    
    # Update Summary
    pdf.section_header("Update Summary")
    
    # Items Added
    items_to_add = update.get('items_to_add', 0)
    if items_to_add > 0:
        pdf.field("Items Added", f"+{items_to_add}")
        if update.get('items_description'):
            pdf.field("Item Description", update.get('items_description'))
    
    # Contact Info Updates
    if update.get('update_email') or update.get('update_phone') or update.get('update_address'):
        pdf.ln(3)
        pdf.section_header("Contact Information Updates")
        if update.get('update_email'):
            pdf.field("New Email", update.get('update_email'))
        if update.get('update_phone'):
            pdf.field("New Phone", update.get('update_phone'))
        if update.get('update_address'):
            pdf.field("New Address", update.get('update_address'))
    
    # Payment Updates
    if update.get('update_payment_method'):
        pdf.ln(3)
        pdf.section_header("Payment Method Update")
        pdf.field("New Method", update.get('update_payment_method'))
        if update.get('update_payment_details'):
            pdf.field("Details", update.get('update_payment_details'))
    
    # Profit Split Update
    if update.get('update_profit_split'):
        pdf.ln(3)
        pdf.section_header("Profit Split Update")
        pdf.field("New Split", update.get('update_profit_split'))
    
    # Additional Information
    if update.get('additional_info'):
        pdf.ln(3)
        pdf.section_header("Additional Information")
        pdf.field_multiline("Notes", update.get('additional_info'))
    
    # Photos
    if update.get('photos') and len(update.get('photos', [])) > 0:
        pdf.ln(3)
        pdf.section_header("Uploaded Photos")
        pdf.field("Number of Photos", str(len(update.get('photos', []))))
    
    # Signature
    if update.get('signature'):
        pdf.ln(3)
        pdf.section_header("Signature")
        pdf.set_x(15)
        pdf.set_font('Helvetica', 'I', 14)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 10, update.get('signature', 'N/A'), 0, 1, 'L')
        pdf.set_draw_color(100, 100, 100)
        pdf.line(15, pdf.get_y(), 100, pdf.get_y())
        if update.get('signature_date'):
            pdf.ln(3)
            pdf.field("Date Signed", update.get('signature_date'))
    
    # Generate PDF bytes
    pdf_bytes = pdf.output()
    
    filename = f"{update.get('full_name', 'client').replace(' ', '_')}_Update_{update.get('submitted_at', '')[:10]}.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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


@router.put("/admin/forms/consignment-agreements/{submission_id}/approve")
async def approve_consignment_agreement(submission_id: str, approval: ConsignmentApproval, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Approve or reject a consignment agreement with item acceptance details"""
    update_data = {
        "approval_status": approval.approval_status,
        "items_accepted": approval.items_accepted,
        "rejected_items_action": approval.rejected_items_action,
        "admin_notes": approval.admin_notes,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": admin.get("name", admin.get("email", "Admin"))
    }
    
    result = await db.consignment_agreements.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Get agreement details for notification
    agreement = await db.consignment_agreements.find_one({"id": submission_id}, {"_id": 0})
    
    # Create notification
    status_text = "approved" if approval.approval_status == "approved" else "rejected"
    notification = AdminNotification(
        type="consignment_approval",
        employee_id=submission_id,
        employee_name=agreement.get("full_name", "Unknown") if agreement else "Unknown",
        message=f"Consignment agreement {status_text} - {approval.items_accepted} items accepted",
        details={
            "approval_status": approval.approval_status,
            "items_accepted": approval.items_accepted,
            "rejected_items_action": approval.rejected_items_action,
            "admin_notes": approval.admin_notes
        }
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    # Send approval/rejection email to user
    if agreement:
        background_tasks.add_task(
            send_approval_notification,
            to_email=agreement.get("email"),
            full_name=agreement.get("full_name", "Valued Customer"),
            approval_status=approval.approval_status,
            items_accepted=approval.items_accepted,
            rejected_items_action=approval.rejected_items_action,
            admin_notes=approval.admin_notes,
            submission_type="agreement"
        )
    
    return {"message": f"Agreement {status_text}", "approval_status": approval.approval_status}


@router.put("/admin/forms/item-additions/{submission_id}/approve")
async def approve_item_addition(submission_id: str, approval: ConsignmentApproval, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Approve or reject an item addition with item acceptance details"""
    update_data = {
        "approval_status": approval.approval_status,
        "items_accepted": approval.items_accepted,
        "rejected_items_action": approval.rejected_items_action,
        "admin_notes": approval.admin_notes,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": admin.get("name", admin.get("email", "Admin"))
    }
    
    result = await db.consignment_item_additions.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item addition not found")
    
    # Get addition details for notification and email
    addition = await db.consignment_item_additions.find_one({"id": submission_id}, {"_id": 0})
    
    # Get the current email from the master agreement (in case it was updated)
    current_email = addition.get("email") if addition else None
    if addition and addition.get("agreement_id"):
        agreement = await db.consignment_agreements.find_one(
            {"id": addition.get("agreement_id")},
            {"_id": 0, "email": 1}
        )
        if agreement:
            current_email = agreement.get("email", current_email)
    
    # Create notification
    status_text = "approved" if approval.approval_status == "approved" else "rejected"
    notification = AdminNotification(
        type="item_addition_approval",
        employee_id=submission_id,
        employee_name=addition.get("full_name", "Unknown") if addition else "Unknown",
        message=f"Item addition {status_text} - {approval.items_accepted} items accepted",
        details={
            "approval_status": approval.approval_status,
            "items_accepted": approval.items_accepted,
            "rejected_items_action": approval.rejected_items_action,
            "admin_notes": approval.admin_notes
        }
    )
    await db.admin_notifications.insert_one(notification.model_dump())
    
    # Send approval/rejection email to user
    if addition and current_email:
        background_tasks.add_task(
            send_approval_notification,
            to_email=current_email,
            full_name=addition.get("full_name", "Valued Customer"),
            approval_status=approval.approval_status,
            items_accepted=approval.items_accepted,
            rejected_items_action=approval.rejected_items_action,
            admin_notes=approval.admin_notes,
            submission_type="item_addition"
        )
    
    return {"message": f"Item addition {status_text}", "approval_status": approval.approval_status}


@router.get("/admin/forms/pending-approvals")
async def get_pending_approvals(admin: dict = Depends(get_admin_user)):
    """Get count of pending consignment approvals"""
    pending_agreements = await db.consignment_agreements.count_documents({"approval_status": "pending"})
    pending_additions = await db.consignment_item_additions.count_documents({"approval_status": "pending"})
    
    return {
        "pending_agreements": pending_agreements,
        "pending_additions": pending_additions,
        "total_pending": pending_agreements + pending_additions
    }


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


# Email Configuration Endpoints
from pydantic import BaseModel, EmailStr

class TestEmailRequest(BaseModel):
    email: EmailStr

@router.get("/admin/email/status")
async def get_admin_email_status(admin: dict = Depends(get_admin_user)):
    """Get current email configuration status"""
    return get_email_status()


@router.post("/admin/email/test")
async def send_admin_test_email(request: TestEmailRequest, admin: dict = Depends(get_admin_user)):
    """Send a test email to verify email configuration"""
    result = await send_test_email(request.email)
    return result


# =====================================================
# CONSIGNMENT CLIENT PASSWORD MANAGEMENT
# =====================================================

import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    if not stored_hash or ':' not in stored_hash:
        return False
    salt, hashed = stored_hash.split(':', 1)
    check_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return check_hash == hashed

class SetPasswordRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AdminResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str

@router.post("/forms/consignment/set-password")
async def set_consignment_password(request: SetPasswordRequest):
    """Allow consignment client to set a password for their account"""
    email = request.email.lower()
    
    # Check if agreement exists
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found with this email")
    
    # Hash and store password
    password_hash = hash_password(request.password)
    await db.consignment_agreements.update_one(
        {"email": email},
        {"$set": {"password_hash": password_hash, "password_set_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Password set successfully"}

@router.post("/forms/consignment/login")
async def consignment_password_login(request: PasswordLoginRequest):
    """Login with email and password for consignment clients"""
    email = request.email.lower()
    
    # Find agreement
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found with this email")
    
    # Check if password is set
    stored_hash = agreement.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=400, detail="No password set for this account. Please set a password first.")
    
    # Verify password
    if not verify_password(request.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Return user info (without password hash)
    return {
        "success": True,
        "user": {
            "email": agreement.get("email"),
            "full_name": agreement.get("full_name"),
            "has_password": True
        }
    }

@router.get("/forms/consignment/has-password/{email}")
async def check_consignment_password(email: str):
    """Check if a consignment client has set a password"""
    email = email.lower()
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        return {"has_password": False, "exists": False}
    
    has_password = bool(agreement.get("password_hash"))
    return {"has_password": has_password, "exists": True}

# Admin password management
@router.get("/forms/admin/consignment-passwords")
async def get_consignment_passwords(admin: dict = Depends(get_admin_user)):
    """Get all consignment clients with their password status"""
    agreements = await db.consignment_agreements.find(
        {},
        {"_id": 0, "email": 1, "full_name": 1, "password_hash": 1, "password_set_at": 1}
    ).to_list(1000)
    
    result = []
    for a in agreements:
        result.append({
            "email": a.get("email"),
            "full_name": a.get("full_name"),
            "has_password": bool(a.get("password_hash")),
            "password_set_at": a.get("password_set_at"),
            # For admin viewing - show if password exists (not the actual password)
            "password_status": "Set" if a.get("password_hash") else "Not set"
        })
    
    return result

@router.post("/forms/admin/consignment-password/reset")
async def admin_reset_consignment_password(request: AdminResetPasswordRequest, admin: dict = Depends(get_admin_user)):
    """Admin can reset a consignment client's password"""
    email = request.email.lower()
    
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found with this email")
    
    # Hash and store new password
    password_hash = hash_password(request.new_password)
    await db.consignment_agreements.update_one(
        {"email": email},
        {"$set": {
            "password_hash": password_hash, 
            "password_set_at": datetime.now(timezone.utc).isoformat(),
            "password_reset_by_admin": True,
            "password_reset_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": f"Password reset for {email}"}

@router.delete("/forms/admin/consignment-password/{email}")
async def admin_remove_consignment_password(email: str, admin: dict = Depends(get_admin_user)):
    """Admin can remove a consignment client's password"""
    email = email.lower()
    
    agreement = await db.consignment_agreements.find_one({"email": email})
    if not agreement:
        raise HTTPException(status_code=404, detail="No consignment agreement found with this email")
    
    await db.consignment_agreements.update_one(
        {"email": email},
        {"$unset": {"password_hash": "", "password_set_at": ""}}
    )
    
    return {"success": True, "message": f"Password removed for {email}"}




# PDF Download endpoints
from fastapi.responses import Response
from fpdf import FPDF


def format_date(iso_string):
    """Format ISO date string to readable format"""
    try:
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        return dt.strftime("%B %d, %Y at %I:%M %p")
    except (ValueError, AttributeError):
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



# ============== CONSIGNOR PAYMENTS ==============

from pydantic import BaseModel
from typing import Optional

class ConsignorPaymentCreate(BaseModel):
    consignor_email: str
    amount: float
    payment_date: str
    payment_method: str  # venmo, cashapp, check, etc.
    notes: Optional[str] = None

class ConsignorPaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


@router.post("/forms/admin/consignor-payments")
async def create_consignor_payment(
    payment: ConsignorPaymentCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin creates a payment record for a consignor"""
    # Verify consignor exists
    consignor = await db.consignment_agreements.find_one(
        {"email": {"$regex": f"^{payment.consignor_email}$", "$options": "i"}}
    )
    if not consignor:
        raise HTTPException(status_code=404, detail="Consignor not found")
    
    payment_doc = {
        "id": str(uuid_module.uuid4()),
        "consignor_email": payment.consignor_email.lower(),
        "consignor_name": consignor.get("full_name", "Unknown"),
        "amount": payment.amount,
        "payment_date": payment.payment_date,
        "payment_method": payment.payment_method,
        "notes": payment.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin_user.get("name", admin_user.get("email")),
        "updated_at": None
    }
    
    await db.consignor_payments.insert_one(payment_doc)
    payment_doc.pop("_id", None)
    
    return {"success": True, "payment": payment_doc}


@router.get("/forms/admin/consignor-payments")
async def get_all_consignor_payments(
    admin_user: dict = Depends(get_admin_user)
):
    """Admin gets all payment records"""
    payments = await db.consignor_payments.find(
        {}, {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    return payments


@router.get("/forms/admin/consignor-payments/{email}")
async def get_consignor_payments_by_email(
    email: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin gets payment records for a specific consignor"""
    payments = await db.consignor_payments.find(
        {"consignor_email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    return payments


@router.put("/forms/admin/consignor-payments/{payment_id}")
async def update_consignor_payment(
    payment_id: str,
    update: ConsignorPaymentUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin updates a payment record"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.consignor_payments.update_one(
        {"id": payment_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"success": True}


@router.delete("/forms/admin/consignor-payments/{payment_id}")
async def delete_consignor_payment(
    payment_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin deletes a payment record"""
    result = await db.consignor_payments.delete_one({"id": payment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"success": True}


@router.get("/forms/consignor/my-payments")
async def get_my_payments(
    email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Consignor gets their own payment history with optional date filtering"""
    query = {"consignor_email": {"$regex": f"^{email}$", "$options": "i"}}
    
    # Add date filtering if provided
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        if date_filter:
            query["payment_date"] = date_filter
    
    payments = await db.consignor_payments.find(
        query, {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    
    # Calculate total
    total = sum(p.get("amount", 0) for p in payments)
    
    return {
        "payments": payments,
        "total": total,
        "count": len(payments)
    }
