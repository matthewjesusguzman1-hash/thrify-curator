"""
Email Service for Consignment Notifications

SETUP: Add RESEND_API_KEY to /app/backend/.env to enable real email sending.
Until then, emails are logged to console (MOCKED).

To get your Resend API key:
1. Sign up at https://resend.com
2. Dashboard → API Keys → Create API Key
3. Add to .env: RESEND_API_KEY=re_your_key_here
"""

import os
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Check if Resend is configured
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
BUSINESS_NAME = "Thrifty Curator"

# Only import resend if API key is available
if RESEND_API_KEY:
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        EMAIL_ENABLED = True
        logger.info("✅ Resend email service configured")
    except ImportError:
        EMAIL_ENABLED = False
        logger.warning("⚠️ Resend package not installed. Emails will be mocked.")
else:
    EMAIL_ENABLED = False
    logger.info("📧 Email service running in MOCK mode (no RESEND_API_KEY). Emails logged to console.")


def get_email_header():
    """Common email header with branding"""
    return """
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; font-family: Georgia, serif; margin: 0; font-size: 28px;">Thrifty Curator</h1>
        <p style="color: #00d4ff; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">CURATED RESALE FINDS</p>
    </div>
    """


def get_email_footer():
    """Common email footer"""
    return """
    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; margin: 0;">
            Thank you for choosing Thrifty Curator!<br>
            <a href="https://thrifty-curator.com" style="color: #8B5CF6;">Visit our website</a>
        </p>
    </div>
    """


def build_email_template(title: str, content: str) -> str:
    """Build a complete email with header, content, and footer"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            <tr>
                <td>
                    {get_email_header()}
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">{title}</h2>
                    {content}
                </td>
            </tr>
            <tr>
                <td>
                    {get_email_footer()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send an email using Resend API or log to console if not configured.
    
    Returns:
        dict with status and message
    """
    if EMAIL_ENABLED:
        try:
            params = {
                "from": f"{BUSINESS_NAME} <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            # Run sync SDK in thread to keep FastAPI non-blocking
            email = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"✅ Email sent to {to_email}: {subject}")
            return {"status": "success", "message": f"Email sent to {to_email}", "email_id": email.get("id")}
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return {"status": "error", "message": str(e)}
    else:
        # MOCK MODE - Log to console
        logger.info(f"""
========== MOCKED EMAIL ==========
To: {to_email}
Subject: {subject}
----------------------------------
[HTML content logged - {len(html_content)} characters]
==================================
        """)
        return {"status": "mocked", "message": f"Email logged (MOCKED) to {to_email}"}


# =============================================================================
# CONSIGNMENT EMAIL TEMPLATES
# =============================================================================

async def send_consignment_agreement_confirmation(
    to_email: str,
    full_name: str,
    agreed_percentage: str,
    items_description: str = None
) -> dict:
    """Send confirmation email when user submits a new consignment agreement"""
    
    first_name = full_name.split()[0] if full_name else "there"
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        Thank you for signing a consignment agreement with <strong>Thrifty Curator</strong>! 
        We're excited to partner with you.
    </p>
    
    <div style="background: #f8f4ff; border-left: 4px solid #8B5CF6; padding: 15px; margin: 20px 0;">
        <h3 style="color: #8B5CF6; margin: 0 0 10px 0; font-size: 14px;">AGREEMENT DETAILS</h3>
        <p style="margin: 5px 0; color: #333;"><strong>Profit Split:</strong> {agreed_percentage}</p>
        {f'<p style="margin: 5px 0; color: #333;"><strong>Items:</strong> {items_description}</p>' if items_description else ''}
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        <strong>What happens next?</strong>
    </p>
    <ol style="color: #333; line-height: 1.8;">
        <li>Our team will review your submitted items</li>
        <li>We'll photograph and list approved items in our store</li>
        <li>You'll receive updates when items sell</li>
        <li>Payments will be processed according to your agreed schedule</li>
    </ol>
    
    <p style="color: #333; line-height: 1.6;">
        You can check your submission status anytime by visiting our 
        <a href="https://thrifty-curator.com/consignment-agreement" style="color: #8B5CF6;">Consignment Portal</a>.
    </p>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        If you have any questions, feel free to reply to this email or contact us directly.
    </p>
    """
    
    html = build_email_template("Your Consignment Agreement is Confirmed!", content)
    return await send_email(to_email, "Welcome to Thrifty Curator - Agreement Confirmed", html)


async def send_item_addition_confirmation(
    to_email: str,
    full_name: str,
    items_to_add: int,
    items_description: str = None
) -> dict:
    """Send confirmation email when user adds items for consignment"""
    
    first_name = full_name.split()[0] if full_name else "there"
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        We've received your request to add <strong>{items_to_add} new item{'s' if items_to_add > 1 else ''}</strong> 
        to your consignment account.
    </p>
    
    <div style="background: #e8f5e9; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
        <h3 style="color: #10B981; margin: 0 0 10px 0; font-size: 14px;">ITEMS SUBMITTED</h3>
        <p style="margin: 5px 0; color: #333;"><strong>Quantity:</strong> +{items_to_add} item{'s' if items_to_add > 1 else ''}</p>
        {f'<p style="margin: 5px 0; color: #333;"><strong>Description:</strong> {items_description}</p>' if items_description else ''}
        <p style="margin: 5px 0; color: #888; font-size: 13px;"><strong>Status:</strong> Pending Review</p>
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        Our team will review your items and update you once they've been processed. 
        You can track the status in your <a href="https://thrifty-curator.com/consignment-agreement" style="color: #8B5CF6;">Consignment Portal</a>.
    </p>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        Thank you for continuing to consign with Thrifty Curator!
    </p>
    """
    
    html = build_email_template("Items Added to Your Consignment", content)
    return await send_email(to_email, f"Thrifty Curator - {items_to_add} Item{'s' if items_to_add > 1 else ''} Added", html)


async def send_info_update_confirmation(
    to_email: str,
    full_name: str,
    updated_fields: list,
    new_email: str = None
) -> dict:
    """Send confirmation email when user updates their information"""
    
    first_name = full_name.split()[0] if full_name else "there"
    
    # Build list of what was updated
    updates_html = "".join([f"<li>{field}</li>" for field in updated_fields])
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        This email confirms that your account information has been updated at <strong>Thrifty Curator</strong>.
    </p>
    
    <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
        <h3 style="color: #2196F3; margin: 0 0 10px 0; font-size: 14px;">UPDATED INFORMATION</h3>
        <ul style="color: #333; margin: 10px 0; padding-left: 20px;">
            {updates_html}
        </ul>
    </div>
    
    {f'''
    <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
        <p style="color: #333; margin: 0;">
            <strong>Important:</strong> Your login email has changed to <strong>{new_email}</strong>. 
            Please use this email to access your account in the future.
        </p>
    </div>
    ''' if new_email else ''}
    
    <p style="color: #333; line-height: 1.6;">
        If you did not make these changes, please contact us immediately.
    </p>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        Thank you for keeping your information up to date!
    </p>
    """
    
    html = build_email_template("Your Information Has Been Updated", content)
    
    # If email was changed, send to both old and new email
    result = await send_email(to_email, "Thrifty Curator - Account Information Updated", html)
    
    # Also send to new email if it changed
    if new_email and new_email.lower() != to_email.lower():
        await send_email(new_email, "Thrifty Curator - Account Information Updated", html)
    
    return result


async def send_approval_notification(
    to_email: str,
    full_name: str,
    approval_status: str,
    items_accepted: int = 0,
    rejected_items_action: str = "return",
    admin_notes: str = None,
    submission_type: str = "agreement"
) -> dict:
    """Send notification when admin approves or rejects a submission"""
    
    first_name = full_name.split()[0] if full_name else "there"
    is_approved = approval_status == "approved"
    
    if is_approved:
        status_color = "#10B981"
        status_bg = "#e8f5e9"
        status_text = "Approved"
        emoji = "✅"
    else:
        status_color = "#EF4444"
        status_bg = "#fef2f2"
        status_text = "Not Approved"
        emoji = "❌"
    
    rejected_action_text = "donated to charity" if rejected_items_action == "donate" else "available for pickup"
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        We've reviewed your {'consignment agreement' if submission_type == 'agreement' else 'item addition request'} 
        and have an update for you.
    </p>
    
    <div style="background: {status_bg}; border-left: 4px solid {status_color}; padding: 15px; margin: 20px 0;">
        <h3 style="color: {status_color}; margin: 0 0 10px 0; font-size: 16px;">{emoji} {status_text}</h3>
        {f'<p style="margin: 5px 0; color: #333;"><strong>Items Accepted:</strong> {items_accepted}</p>' if is_approved and items_accepted > 0 else ''}
        {f'<p style="margin: 5px 0; color: #666; font-size: 13px;">Items not accepted will be {rejected_action_text}.</p>' if is_approved else ''}
    </div>
    
    {f'''
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p style="color: #666; margin: 0; font-size: 13px;"><strong>Note from our team:</strong></p>
        <p style="color: #333; margin: 10px 0 0 0;">{admin_notes}</p>
    </div>
    ''' if admin_notes else ''}
    
    <p style="color: #333; line-height: 1.6;">
        {'Your items will be photographed and listed soon. We will notify you when they sell!' if is_approved else 'If you have questions about this decision, please feel free to reach out to us.'}
    </p>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        View your account anytime at our <a href="https://thrifty-curator.com/consignment-agreement" style="color: #8B5CF6;">Consignment Portal</a>.
    </p>
    """
    
    subject = f"Thrifty Curator - Your Submission has been {status_text}"
    html = build_email_template(f"Submission {status_text}", content)
    return await send_email(to_email, subject, html)


async def send_test_email(to_email: str) -> dict:
    """Send a test email to verify email configuration"""
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        This is a test email from <strong>Thrifty Curator</strong>.
    </p>
    
    <div style="background: #e8f5e9; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
        <h3 style="color: #10B981; margin: 0 0 10px 0; font-size: 14px;">✅ EMAIL CONFIGURATION WORKING</h3>
        <p style="margin: 5px 0; color: #333;">
            If you're seeing this email, your Resend configuration is set up correctly!
        </p>
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        <strong>What this means:</strong>
    </p>
    <ul style="color: #333; line-height: 1.8;">
        <li>Your RESEND_API_KEY is valid</li>
        <li>Emails can be sent from your application</li>
        <li>Users will receive notifications for consignment submissions</li>
    </ul>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        This test was initiated from the Thrifty Curator Admin Dashboard.
    </p>
    """
    
    html = build_email_template("Test Email - Configuration Verified", content)
    return await send_email(to_email, "Thrifty Curator - Test Email", html)


def get_email_status() -> dict:
    """Get current email configuration status"""
    return {
        "enabled": EMAIL_ENABLED,
        "mode": "live" if EMAIL_ENABLED else "mocked",
        "sender_email": SENDER_EMAIL if EMAIL_ENABLED else None,
        "message": "Email sending is active" if EMAIL_ENABLED else "Emails are being logged to console (MOCKED). Add RESEND_API_KEY to enable real sending."
    }
