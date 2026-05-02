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
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded before reading environment variables
load_dotenv(Path(__file__).parent.parent.parent / '.env')

logger = logging.getLogger(__name__)

# Check if Resend is configured
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
BUSINESS_NAME = "Thrifty Curator"

# Debug: Print at startup what sender email is configured
print(f"🔧 EMAIL SERVICE STARTUP: SENDER_EMAIL = {SENDER_EMAIL}")

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


async def send_email(to_email: str, subject: str, html_content: str, attachments: list = None) -> dict:
    """
    Send an email using Resend API or log to console if not configured.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body content
        attachments: Optional list of attachments. Each attachment should be a dict with:
            - filename: Name of the file
            - content: Base64 encoded content or raw bytes
    
    Returns:
        dict with status and message
    """
    if EMAIL_ENABLED:
        try:
            # Debug: Log the sender email being used
            logger.info(f"📧 Attempting to send email FROM: {SENDER_EMAIL} TO: {to_email}")
            params = {
                "from": f"{BUSINESS_NAME} <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            
            # Add attachments if provided
            if attachments:
                params["attachments"] = attachments
                logger.info(f"📎 Email includes {len(attachments)} attachment(s)")
            
            # Run sync SDK in thread to keep FastAPI non-blocking
            email = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"✅ Email sent to {to_email}: {subject}")
            return {"status": "success", "message": f"Email sent to {to_email}", "email_id": email.get("id")}
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email} (FROM: {SENDER_EMAIL}): {str(e)}")
            return {"status": "error", "message": str(e)}
    else:
        # MOCK MODE - Log to console
        attachment_info = f" with {len(attachments)} attachment(s)" if attachments else ""
        logger.info(f"""
========== MOCKED EMAIL ==========
To: {to_email}
Subject: {subject}{attachment_info}
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
        <p style="margin: 0; color: #333; line-height: 1.6;">
            To see the details of your consignment agreement, go to the <strong>Consignment Portal</strong> 
            from the homepage, then select <strong>Manage My Account</strong>. Use the email address 
            you provided to log in and create a secure password.
        </p>
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        <strong>What happens next?</strong>
    </p>
    <ol style="color: #333; line-height: 1.8;">
        <li>Our team will review your submitted items and let you know what items are approved</li>
        <li>We'll photograph and list approved items in our store</li>
        <li>You'll receive updates when items sell</li>
        <li>Sold items will be entered in your account with proof of payment for you to access and review. You'll be paid according to your chosen preference.</li>
    </ol>
    
    <p style="color: #333; line-height: 1.6;">
        You can check your status, update account information (including payment method), 
        or add more items to consign by visiting the <strong>Consignment Portal</strong>.
    </p>
    
    <p style="color: #333; line-height: 1.6;">
        In addition, you can message us directly from the Consignment Portal after you log into your account 
        if there are any questions.
    </p>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        We look forward to working with you!<br>
        <strong>The Thrifty Curator Team</strong>
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
    items_submitted: int = 0,
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
    
    # Calculate items not accepted
    items_not_accepted = items_submitted - items_accepted if items_submitted > items_accepted else 0
    
    # Build rejected items message based on chosen action
    rejected_action_text = ""
    if is_approved and items_not_accepted > 0:
        if rejected_items_action == "donate":
            rejected_action_text = f"Items not accepted will be donated."
        else:
            rejected_action_text = f"Items not accepted will be returned."
    
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
        {f'<p style="margin: 5px 0; color: #666; font-size: 13px;">{rejected_action_text}</p>' if rejected_action_text else ''}
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
    
    content = """
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



async def send_password_reset_notification(
    to_email: str,
    full_name: str,
    temp_password: str,
    portal_type: str = "consignment"  # "consignment" or "employee"
) -> dict:
    """Send password reset notification with temporary password"""
    
    first_name = full_name.split()[0] if full_name else "there"
    
    portal_url = "https://thrifty-curator.com/consignment-agreement" if portal_type == "consignment" else "https://thrifty-curator.com/login"
    portal_name = "Consignment Portal" if portal_type == "consignment" else "Employee Portal"
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        Your password has been reset by a Thrifty Curator administrator.
    </p>
    
    <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
        <h3 style="color: #FF9800; margin: 0 0 10px 0; font-size: 14px;">🔐 YOUR NEW TEMPORARY PASSWORD</h3>
        <p style="margin: 5px 0; color: #333; font-family: monospace; font-size: 18px; background: #fff; padding: 10px; border-radius: 4px;">
            <strong>{temp_password}</strong>
        </p>
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        <strong>Important:</strong> For security, we recommend changing this password after logging in.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{portal_url}" 
           style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 12px 30px; 
                  border-radius: 8px; 
                  font-weight: bold;
                  display: inline-block;">
            Login to {portal_name}
        </a>
    </div>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        If you didn't request a password reset, please contact us immediately.
    </p>
    """
    
    html = build_email_template("Your Password Has Been Reset", content)
    return await send_email(to_email, f"Thrifty Curator - Password Reset for {portal_name}", html)



async def send_password_reset_email(
    to_email: str,
    full_name: str,
    reset_token: str,
    user_type: str = "employee"  # "employee" or "consignor"
) -> dict:
    """Send password reset email with a magic link"""
    
    first_name = full_name.split()[0] if full_name else "there"
    
    # Build the reset URL
    # Use the frontend URL from environment or default
    import os
    frontend_url = os.environ.get("FRONTEND_URL", "https://thrifty-curator.com")
    reset_url = f"{frontend_url}/reset-password/{reset_token}"
    
    portal_name = "Employee Portal" if user_type == "employee" else "Consignment Portal"
    
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi {first_name},
    </p>
    <p style="color: #333; line-height: 1.6;">
        We received a request to reset your password for your <strong>Thrifty Curator {portal_name}</strong> account.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" 
           style="background: linear-gradient(135deg, #00D4FF 0%, #00A8CC 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 14px 35px; 
                  border-radius: 8px; 
                  font-weight: bold;
                  display: inline-block;
                  font-size: 16px;">
            Reset Your Password
        </a>
    </div>
    
    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="color: #666; margin: 0; font-size: 13px;">
            <strong>Can't click the button?</strong> Copy and paste this link into your browser:
        </p>
        <p style="color: #00A8CC; margin: 10px 0 0 0; font-size: 12px; word-break: break-all;">
            {reset_url}
        </p>
    </div>
    
    <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
        <p style="color: #333; margin: 0; font-size: 13px;">
            <strong>⏰ This link expires in 1 hour</strong> for your security.
        </p>
    </div>
    
    <p style="color: #666; font-size: 13px; margin-top: 30px;">
        If you didn't request a password reset, you can safely ignore this email. 
        Your password will remain unchanged.
    </p>
    """
    
    html = build_email_template("Reset Your Password", content)
    return await send_email(to_email, "Thrifty Curator - Password Reset Request", html)


async def send_consignment_inquiry_confirmation(to_email: str, full_name: str) -> dict:
    """Send automated confirmation email when someone submits a consignment inquiry"""
    
    content = f"""
    <h2 style="color: #1a1a2e; font-size: 22px; margin-bottom: 20px;">Thank You for Your Inquiry!</h2>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Hi {full_name},
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Thank you for reaching out to Thrifty Curator! We've received your consignment inquiry 
        and are excited to learn more about what you'd like to consign with us.
    </p>
    
    <div style="background: #f8f4ff; border-left: 4px solid #8B5CF6; padding: 15px; margin: 25px 0;">
        <p style="color: #1a1a2e; margin: 0; font-weight: 600;">What happens next?</p>
        <p style="color: #555; margin: 10px 0 0 0; font-size: 14px;">
            Our team will review your submission and reach out soon to discuss the next steps 
            in the consignment process.
        </p>
    </div>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
        In the meantime, if you have any questions, feel free to send us a message through 
        the <strong>Message Us</strong> section on our homepage. We're happy to help!
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 25px;">
        We look forward to working with you!
    </p>
    
    <p style="color: #555; font-size: 14px; margin-top: 30px;">
        Warm regards,<br>
        <strong style="color: #1a1a2e;">The Thrifty Curator Team</strong>
    </p>
    """
    
    html = build_email_template("Thank You for Your Consignment Inquiry", content)
    return await send_email(to_email, "Thrifty Curator - We've Received Your Inquiry!", html)


def get_email_status() -> dict:
    """Get current email configuration status"""
    return {
        "enabled": EMAIL_ENABLED,
        "mode": "live" if EMAIL_ENABLED else "mocked",
        "sender_email": SENDER_EMAIL if EMAIL_ENABLED else None,
        "message": "Email sending is active" if EMAIL_ENABLED else "Emails are being logged to console (MOCKED). Add RESEND_API_KEY to enable real sending."
    }


async def send_new_employee_welcome_email(to_email: str, employee_name: str, portal_url: str = "https://thrifty-curator.com/login") -> dict:
    """
    Send a welcome email to a newly added employee with instructions for:
    - Accessing the employee portal
    - Submitting their W9 form
    
    Args:
        to_email: Employee's email address
        employee_name: Employee's name
        portal_url: URL to the employee portal login
    
    Returns:
        dict with status and message
    """
    content = f"""
    <p style="color: #333; line-height: 1.6;">
        Hi <strong>{employee_name}</strong>,
    </p>
    
    <p style="color: #333; line-height: 1.6;">
        Welcome to the <strong>Thrifty Curator</strong> team! We're excited to have you on board.
    </p>
    
    <p style="color: #333; line-height: 1.6;">
        This email contains important information about accessing your employee portal and completing your onboarding paperwork.
    </p>
    
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #00D4FF 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px;">📱 Accessing the Employee Portal</h3>
        <p style="color: #ffffff; line-height: 1.6; margin: 0 0 15px 0;">
            The employee portal is where you'll clock in/out, view your hours, and manage your account.
        </p>
        <ol style="color: #ffffff; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Go to <a href="{portal_url}" style="color: #ffffff; font-weight: bold;">{portal_url}</a></li>
            <li>Enter your email address: <strong>{to_email}</strong></li>
            <li>Click "Find My Account"</li>
            <li>You'll be prompted to set up a password on your first login</li>
        </ol>
    </div>
    
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #92400E; margin: 0 0 15px 0; font-size: 18px;">📋 W9 Form Submission (Required)</h3>
        <p style="color: #78350F; line-height: 1.6; margin: 0 0 15px 0;">
            Before you can receive payment, you must submit a completed W9 form. Here's how:
        </p>
        <ol style="color: #78350F; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Log into the Employee Portal using the steps above</li>
            <li>Look for the <strong>"W9 Form"</strong> or <strong>"Tax Documents"</strong> section</li>
            <li>Download the W9 form template (if provided) or use a standard IRS W9</li>
            <li>Fill out the form completely and sign it</li>
            <li>Upload a photo or scan of your completed W9</li>
        </ol>
        <p style="color: #78350F; line-height: 1.6; margin: 15px 0 0 0;">
            <strong>⚠️ Important:</strong> Your W9 must be submitted before your first payday.
        </p>
    </div>
    
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">✅ Quick Checklist</h3>
        <ul style="color: #166534; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Set up your employee portal login</li>
            <li>Submit your W9 form</li>
            <li>Review your hourly rate in the portal</li>
            <li>Clock in for your first shift!</li>
        </ul>
    </div>
    
    <p style="color: #333; line-height: 1.6;">
        If you have any questions or need help accessing the portal, please reply to this email or contact your manager.
    </p>
    
    <p style="color: #333; line-height: 1.6;">
        Welcome aboard! 🎉
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
        — The Thrifty Curator Team
    </p>
    """
    
    html = build_email_template("Welcome to Thrifty Curator! 🎉", content)
    return await send_email(to_email, "Welcome to Thrifty Curator - Employee Portal Access & W9 Instructions", html)

