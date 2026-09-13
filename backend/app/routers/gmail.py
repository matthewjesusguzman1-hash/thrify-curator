"""Gmail integration — pull shipping labels + SKUs from email."""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from typing import Optional
import os, uuid, base64, re, warnings

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

from app.database import db
from app.dependencies import get_admin_user
from app.services.object_storage import put_object, APP_NAME
from dotenv import load_dotenv
from pathlib import Path

_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(_env_path, override=True)

router = APIRouter(prefix="/gmail", tags=["gmail"])


def _get_google_creds():
    """Read Google OAuth creds fresh from env (handles late .env loading)."""
    load_dotenv(_env_path, override=True)
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    frontend_url = os.environ.get("FRONTEND_URL", "")
    redirect_uri = f"{frontend_url}/api/gmail/callback"
    return client_id, client_secret, frontend_url, redirect_uri


GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
REDIRECT_URI = f"{FRONTEND_URL}/api/gmail/callback"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

CLIENT_CONFIG = None  # Built dynamically via _get_client_config()

def _get_client_config():
    cid, csecret, _, _ = _get_google_creds()
    return {
        "web": {
            "client_id": cid,
            "client_secret": csecret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

# Platform email senders and subject patterns
PLATFORM_FILTERS = {
    "poshmark": {
        "query": '(from:poshmark.com OR subject:("on Poshmark" OR "sold to @")) subject:("just sold" OR "shipping label" OR "ship now")',
        "name": "Poshmark",
    },
    "mercari": {
        "query": '(from:mercari.com OR subject:("on Mercari")) subject:(ship OR sold OR label OR order)',
        "name": "Mercari",
    },
    "ebay": {
        "query": '(from:ebay.com OR subject:("on eBay")) subject:("made the sale" OR "shipping label" OR "sold")',
        "name": "eBay",
    },
    "depop": {
        "query": '(from:depop.com OR subject:("on Depop" OR "sale confirmation")) subject:(ship OR sold OR label OR "sale confirmation")',
        "name": "Depop",
    },
}

# Broad catch-all query for scan — picks up forwarded emails too
BROAD_QUERY = (
    'subject:("just sold" OR "shipping label" OR "ship now" OR '
    '"sale confirmation" OR "made the sale" OR '
    '"on Poshmark" OR "on Mercari" OR "on eBay" OR "on Depop" OR '
    '"sold to @" OR "Download Shipping Label")'
)


def _build_flow(state: str = None) -> Flow:
    _, _, _, redirect_uri = _get_google_creds()
    flow = Flow.from_client_config(_get_client_config(), scopes=SCOPES, redirect_uri=redirect_uri)
    if state:
        flow.state = state
    return flow


# ── OAuth ────────────────────────────────────────────────────

@router.get("/auth")
async def gmail_auth(admin: dict = Depends(get_admin_user)):
    """Start Gmail OAuth flow."""
    cid, _, _, _ = _get_google_creds()
    if not cid:
        raise HTTPException(400, "Gmail integration not configured")
    flow = _build_flow()
    url, state = flow.authorization_url(access_type="offline", prompt="consent")
    # Save state + PKCE code_verifier for the callback
    await db.gmail_oauth_states.insert_one({
        "state": state,
        "admin_id": admin["id"],
        "code_verifier": flow.code_verifier,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": url}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
):
    """Handle Google OAuth callback."""
    from urllib.parse import quote
    import httpx

    _, _, cred_frontend, _ = _get_google_creds()

    # Google may redirect with an error instead of a code
    if error:
        print(f"[Gmail] Google returned error: {error}")
        return RedirectResponse(f"{cred_frontend}/admin?gmail=error&reason={quote(error)}")

    if not code or not state:
        return RedirectResponse(f"{cred_frontend}/admin?gmail=error&reason=missing_code_or_state")

    try:
        doc = await db.gmail_oauth_states.find_one({"state": state})
        if not doc:
            print(f"[Gmail] Callback: state not found in DB")
            return RedirectResponse(f"{cred_frontend}/admin?gmail=error&reason=invalid_state")
        admin_id = doc["admin_id"]
        code_verifier = doc.get("code_verifier")
        await db.gmail_oauth_states.delete_one({"state": state})

        # Read credentials fresh at request time
        cred_id, cred_secret, _, cred_redirect = _get_google_creds()
        print(f"[Gmail] Token exchange: secret_len={len(cred_secret)}, secret_end=...{cred_secret[-4:] if cred_secret else 'EMPTY'}, redirect={cred_redirect}, has_verifier={bool(code_verifier)}")

        # Exchange code for tokens via direct HTTP
        token_payload = {
            "code": code,
            "client_id": cred_id,
            "client_secret": cred_secret,
            "redirect_uri": cred_redirect,
            "grant_type": "authorization_code",
        }
        if code_verifier:
            token_payload["code_verifier"] = code_verifier

        async with httpx.AsyncClient() as client:
            resp = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
            token_data = resp.json()

        if "error" in token_data:
            err = token_data.get("error_description", token_data["error"])
            print(f"[Gmail] Token exchange failed: {err}")
            return RedirectResponse(f"{cred_frontend}/admin?gmail=error&reason={quote(err)}")

        await db.gmail_tokens.update_one(
            {"admin_id": admin_id},
            {"$set": {
                "admin_id": admin_id,
                "access_token": token_data.get("access_token"),
                "refresh_token": token_data.get("refresh_token"),
                "token_uri": "https://oauth2.googleapis.com/token",
                "client_id": cred_id,
                "client_secret": cred_secret,
                "expires_in": token_data.get("expires_in"),
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        return RedirectResponse(f"{cred_frontend}/admin?gmail=connected")
    except Exception as e:
        import traceback
        print(f"[Gmail] Callback error: {type(e).__name__}: {e}")
        traceback.print_exc()
        safe_msg = quote(str(e)[:200])
        return RedirectResponse(f"{cred_frontend}/admin?gmail=error&reason={safe_msg}")


@router.get("/status")
async def gmail_status(admin: dict = Depends(get_admin_user)):
    """Check if Gmail is connected."""
    token = await db.gmail_tokens.find_one({"admin_id": admin["id"]}, {"_id": 0})
    if not token or not token.get("refresh_token"):
        return {"connected": False}
    return {"connected": True, "connected_at": token.get("connected_at")}


@router.delete("/disconnect")
async def gmail_disconnect(admin: dict = Depends(get_admin_user)):
    """Disconnect Gmail."""
    await db.gmail_tokens.delete_one({"admin_id": admin["id"]})
    return {"ok": True}


@router.get("/debug-scan")
async def debug_scan(
    days: int = Query(14, ge=1, le=60),
    admin: dict = Depends(get_admin_user),
):
    """Debug: show raw Gmail search results per platform + broad catch-all."""
    creds = await _get_gmail_creds(admin["id"])
    service = _get_service(creds)
    debug_results = {}

    # Platform-specific queries
    for pf, filt in PLATFORM_FILTERS.items():
        query = f'{filt["query"]} newer_than:{days}d'
        try:
            resp = service.users().messages().list(userId="me", q=query, maxResults=10).execute()
            msgs = resp.get("messages", [])
            samples = []
            for m in msgs[:5]:
                msg = service.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["Subject", "From"]).execute()
                headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
                samples.append({"from": headers.get("from", ""), "subject": headers.get("subject", "")})
            debug_results[pf] = {"query": query, "total_found": len(msgs), "samples": samples}
        except Exception as e:
            debug_results[pf] = {"query": query, "error": str(e)}

    # Broad catch-all
    query = f'{BROAD_QUERY} newer_than:{days}d'
    try:
        resp = service.users().messages().list(userId="me", q=query, maxResults=10).execute()
        msgs = resp.get("messages", [])
        samples = []
        for m in msgs[:5]:
            msg = service.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["Subject", "From"]).execute()
            headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
            samples.append({"from": headers.get("from", ""), "subject": headers.get("subject", "")})
        debug_results["_broad_catchall"] = {"query": query, "total_found": len(msgs), "samples": samples}
    except Exception as e:
        debug_results["_broad_catchall"] = {"query": query, "error": str(e)}

    return debug_results



# ── Credentials helper ───────────────────────────────────────

async def _get_gmail_creds(admin_id: str) -> Credentials:
    token = await db.gmail_tokens.find_one({"admin_id": admin_id})
    if not token or not token.get("refresh_token"):
        raise HTTPException(401, "Gmail not connected. Please connect your Gmail first.")
    creds = Credentials(
        token=token.get("access_token"),
        refresh_token=token["refresh_token"],
        token_uri=token.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token.get("client_id", GOOGLE_CLIENT_ID),
        client_secret=token.get("client_secret", GOOGLE_CLIENT_SECRET),
    )
    if not creds.valid:
        creds.refresh(GoogleRequest())
        await db.gmail_tokens.update_one(
            {"admin_id": admin_id},
            {"$set": {"access_token": creds.token,
                      "expires_at": creds.expiry.isoformat() if creds.expiry else None}},
        )
    return creds


def _get_service(creds: Credentials):
    return build("gmail", "v1", credentials=creds)


# ── Email scanning ───────────────────────────────────────────

@router.get("/scan")
async def scan_emails(
    platform: Optional[str] = Query(None),
    days: int = Query(None, ge=1, le=60),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    admin: dict = Depends(get_admin_user),
):
    """Scan Gmail for shipping label emails.

    Strategy: find all emails with PDF attachments in the date range,
    then detect marketplace platform from content.  The only PDFs in a
    resale inbox are shipping labels, so this is the most reliable filter.
    A secondary query catches Depop-style emails that use a download link
    instead of an attachment.
    """
    creds = await _get_gmail_creds(admin["id"])
    service = _get_service(creds)
    results = []
    seen_ids = set()

    # ── Date filter ──────────────────────────────────────────
    date_filter = ""
    if after and before:
        date_filter = f" after:{after} before:{before}"
    elif after:
        date_filter = f" after:{after}"
    elif days:
        date_filter = f" newer_than:{days}d"
    else:
        date_filter = " newer_than:30d"

    debug_log = []

    # ── Query 1: every email with a PDF attachment ───────────
    queries = [
        ("pdf_attachments", f"has:attachment filename:pdf{date_filter}"),
    ]
    # ── Query 2: Depop download-link emails (no attachment) ──
    queries.append(
        ("depop_links", f'(from:depop.com OR subject:depop OR subject:"sale confirmation"){date_filter}')
    )
    # ── Query 3: broad marketplace keywords (catches forwarded) ─
    queries.append(
        ("broad_keywords", f'{BROAD_QUERY}{date_filter}')
    )

    for label, query in queries:
        try:
            all_msg_ids = []
            page_token = None
            # Paginate to get all results
            while True:
                kw = {"userId": "me", "q": query, "maxResults": 100}
                if page_token:
                    kw["pageToken"] = page_token
                resp = service.users().messages().list(**kw).execute()
                all_msg_ids.extend(m["id"] for m in resp.get("messages", []))
                page_token = resp.get("nextPageToken")
                if not page_token:
                    break

            new_ids = [mid for mid in all_msg_ids if mid not in seen_ids]
            debug_log.append({
                "label": label,
                "query": query[:150],
                "total_found": len(all_msg_ids),
                "new_unique": len(new_ids),
            })
        except Exception as e:
            print(f"[Gmail] Error scanning ({label}): {e}")
            debug_log.append({"label": label, "query": query[:150], "error": str(e)})
            continue

        for mid in new_ids:
            seen_ids.add(mid)
            try:
                msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
                headers = {h["name"].lower(): h["value"]
                           for h in msg.get("payload", {}).get("headers", [])}
                from_addr = headers.get("from", "").lower()
                subject = headers.get("subject", "")
                body_html = _get_body_html(msg.get("payload", {}))

                # Detect marketplace platform
                detected = _detect_platform(from_addr, subject, body_html)

                # If platform filter was requested, skip non-matching
                if platform and detected != platform:
                    continue

                info = _parse_email(msg, detected)
                if info:
                    # Auto-fill SKU from inventory when email doesn't contain one
                    if not info.get("sku") and info.get("item_title"):
                        matched_sku, match_source = await _match_sku_from_inventory(
                            info["item_title"], detected
                        )
                        if matched_sku:
                            info["sku"] = matched_sku
                            info["sku_source"] = match_source

                    existing = await db.shipping_labels.find_one({"gmail_message_id": mid})
                    info["already_imported"] = existing is not None
                    info["message_id"] = mid
                    info["platform"] = detected
                    info["platform_name"] = PLATFORM_FILTERS.get(
                        detected, {}
                    ).get("name", detected.title() if detected else "Unknown")
                    results.append(info)
            except Exception as e:
                print(f"[Gmail] Error reading message {mid}: {e}")

    return {
        "emails": results,
        "count": len(results),
        "debug": {
            "queries": debug_log,
            "total_candidates": len(seen_ids),
            "parsed_results": len(results),
            "date_filter": date_filter.strip(),
            "platform_filter": platform or "all",
        },
    }


def _parse_email(msg: dict, platform: str) -> Optional[dict]:
    """Extract label + SKU info from an email message."""
    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
    subject = headers.get("subject", "")
    date = headers.get("date", "")
    snippet = msg.get("snippet", "")

    # Find attachments (PDF labels)
    attachments = []
    _find_attachments(msg.get("payload", {}), attachments)

    # Find download links (for Depop)
    body_html = _get_body_html(msg.get("payload", {}))
    download_link = None
    if platform == "depop" and body_html:
        download_link = _find_depop_download_link(body_html)

    # Extract SKU from email body
    sku = _extract_sku(body_html or snippet, platform, subject)

    # Extract item title
    item_title = _extract_item_title(body_html or snippet, platform, subject)

    has_label = len(attachments) > 0 or download_link is not None

    return {
        "subject": subject,
        "date": date,
        "snippet": snippet[:200],
        "has_label": has_label,
        "attachment_count": len(attachments),
        "has_download_link": download_link is not None,
        "sku": sku,
        "item_title": item_title,
    }


def _find_attachments(part: dict, result: list):
    """Recursively find PDF/image attachments."""
    if part.get("filename") and part.get("body", {}).get("attachmentId"):
        mime = part.get("mimeType", "")
        if "pdf" in mime or "image" in mime:
            result.append({
                "filename": part["filename"],
                "mime_type": mime,
                "attachment_id": part["body"]["attachmentId"],
                "size": part["body"].get("size", 0),
            })
    for sub in part.get("parts", []):
        _find_attachments(sub, result)


def _get_body_html(part: dict) -> str:
    """Get HTML body from email."""
    if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
    for sub in part.get("parts", []):
        html = _get_body_html(sub)
        if html:
            return html
    return ""


def _find_depop_download_link(html: str) -> Optional[str]:
    """Find the shipping label download link in Depop emails."""
    # Look for links containing 'shipping' or 'label' or 'download'
    patterns = [
        r'href=["\']([^"\']*(?:shipping|label|download)[^"\']*)["\']',
        r'href=["\']([^"\']*depop[^"\']*label[^"\']*)["\']',
        r'href=["\']([^"\']*depop[^"\']*download[^"\']*)["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_sku(text: str, platform: str, subject: str) -> str:
    """Extract SKU from email body text."""
    if not text:
        return ""
    # Strip HTML tags for text parsing
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean)

    # Common SKU patterns across platforms
    patterns = [
        r"(?:SKU|sku|Sku)[:\s#]*([A-Za-z0-9\-_]+)",
        r"(?:Item|item)\s*#?\s*:?\s*([A-Za-z0-9\-_]{3,})",
    ]
    for p in patterns:
        m = re.search(p, clean)
        if m:
            return m.group(1).strip()
    return ""


def _extract_item_title(text: str, platform: str, subject: str) -> str:
    """Extract item title from email subject/body."""
    # Poshmark: "Item Title Here" just sold to @buyer on Poshmark!
    m = re.search(r'"([^"]{5,}?)"\s*just\s+sold', subject)
    if m:
        return m.group(1).strip()

    # eBay: You made the sale for Item Title Here - Get a shipping label
    m = re.search(r'made the sale for\s+(.+?)(?:\s*-\s*Get|\s*$)', subject, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Depop: title is usually in the email body, not subject
    # Subject is like: "Your USPS shipping label and sale confirmation for @buyer"
    # Need to look in body for the item title
    if text and platform == "depop":
        clean = re.sub(r"<[^>]+>", " ", text)
        clean = re.sub(r"\s+", " ", clean)
        # Look for item/listing title patterns in body
        for pattern in [
            r'(?:item|listing|product)[:\s]+["\']?(.{5,80}?)["\']?\s*(?:for\s*\$|was\s*sold|has\s*been)',
            r'(?:sold|purchased)[:\s]+["\']?(.{5,80}?)["\']?\s*(?:for\s*\$|\s*-\s*)',
        ]:
            m = re.search(pattern, clean, re.IGNORECASE)
            if m:
                return m.group(1).strip()

    # Mercari: check subject for title patterns
    m = re.search(r'(?:sold|order)[:\s]+(.{5,80}?)(?:\s*-|\s*on\s+Mercari|\s*$)', subject, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Fallback: use subject but strip common prefixes/suffixes
    cleaned_subject = re.sub(r'^(?:Fwd?:\s*|Re:\s*)', '', subject, flags=re.IGNORECASE).strip()
    return cleaned_subject


# ── Import labels ────────────────────────────────────────────

@router.post("/import")
async def import_labels(
    admin: dict = Depends(get_admin_user),
    message_ids: list[str] = [],
):
    """Import shipping labels from selected Gmail messages."""
    creds = await _get_gmail_creds(admin["id"])
    service = _get_service(creds)
    imported = []
    errors = []

    for mid in message_ids:
        try:
            # Skip already imported
            existing = await db.shipping_labels.find_one({"gmail_message_id": mid})
            if existing:
                imported.append({"message_id": mid, "label_id": existing["id"], "status": "already_exists"})
                continue

            msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
            headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
            subject = headers.get("subject", "")
            body_html = _get_body_html(msg.get("payload", {}))
            snippet = msg.get("snippet", "")

            # Determine platform from all signals
            from_addr = headers.get("from", "").lower()
            platform = _detect_platform(from_addr, subject, body_html)

            # Extract SKU from email
            sku = _extract_sku(body_html or snippet, platform, subject)

            # Extract item title (for Depop CSV matching)
            item_title = _extract_item_title(body_html or snippet, platform, subject)

            # If no SKU and we have a title, try matching from CSV/inventory
            if not sku and item_title:
                matched_sku, _ = await _match_sku_from_inventory(item_title, platform)
                sku = matched_sku

            # Get the label PDF
            label_bytes, filename, content_type = await _get_label_from_email(
                service, mid, msg, platform, body_html
            )

            if not label_bytes:
                errors.append({"message_id": mid, "error": "No label found in email"})
                continue

            # Store the label
            label_id = str(uuid.uuid4())
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
            storage_path = f"{APP_NAME}/labels/{label_id}.{ext}"
            put_object(storage_path, label_bytes, content_type)

            # Try OCR for display name
            display_name = ""
            try:
                from app.routers.orders import _pdf_to_image, _ocr_recipient_name, _extract_pdf_text, _extract_recipient_name
                if ext == "pdf":
                    extracted_text = _extract_pdf_text(label_bytes)
                    display_name = _extract_recipient_name(extracted_text) if extracted_text else ""
                    if not display_name:
                        img_bytes = _pdf_to_image(label_bytes)
                        ocr_name = await _ocr_recipient_name(img_bytes)
                        if ocr_name:
                            display_name = ocr_name
                else:
                    ocr_name = await _ocr_recipient_name(label_bytes)
                    if ocr_name:
                        display_name = ocr_name
            except Exception as e:
                print(f"[Gmail] OCR failed for {mid}: {e}")

            doc = {
                "id": label_id,
                "filename": filename,
                "display_name": display_name,
                "storage_path": storage_path,
                "content_type": content_type,
                "file_size": len(label_bytes),
                "extension": ext,
                "extracted_text": "",
                "platform_guess": platform,
                "sku_tag": sku,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "uploaded_by": f"gmail:{admin.get('email', '')}",
                "gmail_message_id": mid,
                "gmail_subject": subject,
                "gmail_item_title": item_title,
            }
            await db.shipping_labels.insert_one(doc)
            imported.append({
                "message_id": mid,
                "label_id": label_id,
                "display_name": display_name,
                "sku": sku,
                "platform": platform,
                "status": "imported",
            })

        except Exception as e:
            print(f"[Gmail] Import error for {mid}: {e}")
            errors.append({"message_id": mid, "error": str(e)})

    return {"imported": imported, "errors": errors}


def _detect_platform(from_addr: str, subject: str = "", body_html: str = "") -> str:
    """Detect platform from email from-address, subject, and body content."""
    text = f"{from_addr} {subject} {body_html}".lower()

    # Check from address first (most reliable for direct emails)
    if "poshmark" in from_addr:
        return "poshmark"
    if "mercari" in from_addr:
        return "mercari"
    if "ebay" in from_addr:
        return "ebay"
    if "depop" in from_addr:
        return "depop"

    # For forwarded emails: check subject and body
    sub_lower = subject.lower()
    if "poshmark" in sub_lower or "on poshmark" in text:
        return "poshmark"
    if "mercari" in sub_lower or "on mercari" in text:
        return "mercari"
    if "ebay" in sub_lower or "on ebay" in text:
        return "ebay"
    if "depop" in sub_lower or "on depop" in text or "sale confirmation for @" in sub_lower:
        return "depop"

    return ""


def _detect_platform_from_email(from_addr: str) -> str:
    """Legacy wrapper."""
    return _detect_platform(from_addr)


async def _get_label_from_email(
    service, message_id: str, msg: dict, platform: str, body_html: str
) -> tuple:
    """Get label PDF bytes from email (attachment or download link)."""
    # First try attachments
    attachments = []
    _find_attachments(msg.get("payload", {}), attachments)

    if attachments:
        att = attachments[0]
        att_data = service.users().messages().attachments().get(
            userId="me", messageId=message_id, id=att["attachment_id"]
        ).execute()
        raw = base64.urlsafe_b64decode(att_data["data"])
        return raw, att["filename"], att["mime_type"]

    # For Depop: try download link
    if platform == "depop" and body_html:
        link = _find_depop_download_link(body_html)
        if link:
            try:
                import httpx
                async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                    resp = await client.get(link)
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "application/pdf")
                        fname = "depop_label.pdf"
                        return resp.content, fname, ct
            except Exception as e:
                print(f"[Gmail] Depop download failed: {e}")

    return None, "", ""


async def _match_sku_from_inventory(title: str, platform: str) -> tuple[str, str]:
    """Match item title against imported inventory (Vendoo CSV) to find SKU.

    Returns (sku, match_source) where match_source describes how the match was
    made: "exact", "prefix", "substring", or "fuzzy".
    """
    if not title or len(title) < 3:
        return "", ""

    title_lower = title.strip().lower()

    # 1. Exact match (case-insensitive)
    exact = await db.inventory_items.find_one(
        {"title": {"$regex": f"^{re.escape(title_lower)}$", "$options": "i"}},
        {"_id": 0, "sku": 1},
    )
    if exact and exact.get("sku"):
        return exact["sku"], "exact"

    # 2. Prefix match — email title starts inventory title or vice versa
    cursor = db.inventory_items.find(
        {"title": {"$regex": f"^{re.escape(title_lower)}", "$options": "i"}},
        {"_id": 0, "sku": 1, "title": 1},
    ).limit(5)
    matches = await cursor.to_list(5)
    if len(matches) == 1 and matches[0].get("sku"):
        return matches[0]["sku"], "prefix"

    # Also check: inventory title is a prefix of email title
    if not matches:
        # Can't do this purely in Mongo — grab candidates with shared first word
        first_word = title_lower.split()[0] if title_lower.split() else ""
        if first_word and len(first_word) >= 3:
            cursor = db.inventory_items.find(
                {"title": {"$regex": f"^{re.escape(first_word)}", "$options": "i"}},
                {"_id": 0, "sku": 1, "title": 1},
            ).limit(20)
            matches = await cursor.to_list(20)
            # Filter to cases where inventory title is a prefix of email title
            prefix_matches = [
                m for m in matches
                if title_lower.startswith(m.get("title", "").lower())
            ]
            if len(prefix_matches) == 1 and prefix_matches[0].get("sku"):
                return prefix_matches[0]["sku"], "prefix"

    # 3. Substring containment
    cursor = db.inventory_items.find(
        {"title": {"$regex": re.escape(title_lower), "$options": "i"}},
        {"_id": 0, "sku": 1, "title": 1},
    ).limit(5)
    matches = await cursor.to_list(5)
    if len(matches) == 1 and matches[0].get("sku"):
        return matches[0]["sku"], "substring"

    # 4. Fuzzy word-overlap matching
    # Tokenize the email title into significant words (skip short/common ones)
    stop_words = {"the", "a", "an", "in", "on", "at", "for", "and", "or", "of", "to", "with", "by", "new", "nwt", "size"}
    title_words = {w for w in re.findall(r'[a-z0-9]+', title_lower) if len(w) >= 2 and w not in stop_words}
    if not title_words:
        return "", ""

    # Pull a broader set of candidates sharing at least one significant word
    word_patterns = [{"title": {"$regex": re.escape(w), "$options": "i"}} for w in list(title_words)[:5]]
    cursor = db.inventory_items.find(
        {"$or": word_patterns},
        {"_id": 0, "sku": 1, "title": 1},
    ).limit(50)
    candidates = await cursor.to_list(50)

    best_sku = ""
    best_score = 0.0
    for c in candidates:
        inv_title = (c.get("title") or "").lower()
        inv_words = {w for w in re.findall(r'[a-z0-9]+', inv_title) if len(w) >= 2 and w not in stop_words}
        if not inv_words:
            continue
        overlap = title_words & inv_words
        # Jaccard-like score: overlap / union
        union = title_words | inv_words
        score = len(overlap) / len(union) if union else 0
        if score > best_score and score >= 0.4 and c.get("sku"):
            best_score = score
            best_sku = c["sku"]

    if best_sku:
        return best_sku, "fuzzy"

    return "", ""
