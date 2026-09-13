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
    days: int = Query(14, ge=1, le=60),
    admin: dict = Depends(get_admin_user),
):
    """Scan Gmail for shipping label emails using broad search. Detects platform from content."""
    creds = await _get_gmail_creds(admin["id"])
    service = _get_service(creds)
    results = []
    seen_ids = set()

    queries = []
    if platform and platform in PLATFORM_FILTERS:
        queries.append(PLATFORM_FILTERS[platform]["query"])
    else:
        # Run platform-specific queries + the broad catch-all
        for filt in PLATFORM_FILTERS.values():
            queries.append(filt["query"])
        queries.append(BROAD_QUERY)

    for query_str in queries:
        query = f'{query_str} newer_than:{days}d'
        try:
            resp = service.users().messages().list(userId="me", q=query, maxResults=50).execute()
            msg_ids = [m["id"] for m in resp.get("messages", [])]
        except Exception as e:
            print(f"[Gmail] Error scanning: {e}")
            continue

        for mid in msg_ids:
            if mid in seen_ids:
                continue
            seen_ids.add(mid)
            try:
                msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
                headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
                from_addr = headers.get("from", "").lower()
                subject = headers.get("subject", "")
                body_html = _get_body_html(msg.get("payload", {}))

                # Detect platform from all available signals
                detected = _detect_platform(from_addr, subject, body_html)

                info = _parse_email(msg, detected)
                if info:
                    existing = await db.shipping_labels.find_one({"gmail_message_id": mid})
                    info["already_imported"] = existing is not None
                    info["message_id"] = mid
                    info["platform"] = detected
                    info["platform_name"] = PLATFORM_FILTERS.get(detected, {}).get("name", detected.title() if detected else "Unknown")
                    results.append(info)
            except Exception as e:
                print(f"[Gmail] Error reading message {mid}: {e}")

    return {"emails": results, "count": len(results)}


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
                sku = await _match_sku_from_inventory(item_title, platform)

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


async def _match_sku_from_inventory(title: str, platform: str) -> str:
    """Match item title against imported inventory to find SKU."""
    if not title or len(title) < 3:
        return ""

    title_lower = title.strip().lower()

    # Search inventory for items whose title starts with or contains the email title
    # The email title may be truncated, so we check if any inventory title starts with it
    cursor = db.inventory_items.find(
        {"title": {"$regex": f"^{re.escape(title_lower)}", "$options": "i"}},
        {"_id": 0, "sku": 1, "title": 1},
    ).limit(5)

    matches = await cursor.to_list(5)

    if len(matches) == 1:
        return matches[0].get("sku", "")

    # If multiple matches or no prefix match, try substring containment
    if not matches:
        cursor = db.inventory_items.find(
            {"title": {"$regex": re.escape(title_lower), "$options": "i"}},
            {"_id": 0, "sku": 1, "title": 1},
        ).limit(5)
        matches = await cursor.to_list(5)

    if len(matches) == 1:
        return matches[0].get("sku", "")

    # Multiple matches — return the best one (shortest title that contains the search)
    if matches:
        matches.sort(key=lambda m: len(m.get("title", "")))
        return matches[0].get("sku", "")

    return ""
