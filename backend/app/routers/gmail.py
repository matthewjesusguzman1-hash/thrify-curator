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

router = APIRouter(prefix="/gmail", tags=["gmail"])

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

CLIENT_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

# Platform email senders and subject patterns
PLATFORM_FILTERS = {
    "poshmark": {
        "query": 'from:(shipment-noreply@poshmark.com) subject:("Ship Now")',
        "name": "Poshmark",
    },
    "mercari": {
        "query": 'from:(no-reply@mercari.com) subject:("shipping label")',
        "name": "Mercari",
    },
    "ebay": {
        "query": 'from:(ebay@ebay.com) subject:("shipping label")',
        "name": "eBay",
    },
    "depop": {
        "query": 'from:(no-reply@depop.com) subject:("sold" OR "shipping")',
        "name": "Depop",
    },
}


def _build_flow(state: str = None) -> Flow:
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    if state:
        flow.state = state
    return flow


# ── OAuth ────────────────────────────────────────────────────

@router.get("/auth")
async def gmail_auth(admin: dict = Depends(get_admin_user)):
    """Start Gmail OAuth flow."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Gmail integration not configured")
    flow = _build_flow()
    url, state = flow.authorization_url(access_type="offline", prompt="consent")
    await db.gmail_oauth_states.insert_one({
        "state": state,
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": url}


@router.get("/callback")
async def gmail_callback(code: str = Query(...), state: str = Query(...)):
    """Handle Google OAuth callback."""
    try:
        doc = await db.gmail_oauth_states.find_one({"state": state})
        if not doc:
            print(f"[Gmail] Callback: state not found in DB")
            return RedirectResponse(f"{FRONTEND_URL}/admin?gmail=error&reason=invalid_state")
        admin_id = doc["admin_id"]
        await db.gmail_oauth_states.delete_one({"state": state})

        print(f"[Gmail] Callback: exchanging code, redirect_uri={REDIRECT_URI}")
        flow = _build_flow(state=state)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)

        creds = flow.credentials
        await db.gmail_tokens.update_one(
            {"admin_id": admin_id},
            {"$set": {
                "admin_id": admin_id,
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "expires_at": creds.expiry.isoformat() if creds.expiry else None,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        return RedirectResponse(f"{FRONTEND_URL}/admin?gmail=connected")
    except Exception as e:
        import traceback
        err_msg = f"{type(e).__name__}: {e}"
        print(f"[Gmail] Callback error: {err_msg}")
        traceback.print_exc()
        # Pass error detail in URL so frontend can display it
        from urllib.parse import quote
        safe_msg = quote(str(e)[:200])
        return RedirectResponse(f"{FRONTEND_URL}/admin?gmail=error&reason={safe_msg}")


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
    days: int = Query(7, ge=1, le=30),
    admin: dict = Depends(get_admin_user),
):
    """Scan Gmail for shipping label emails. Returns list of found emails with metadata."""
    creds = await _get_gmail_creds(admin["id"])
    service = _get_service(creds)

    platforms = [platform] if platform else list(PLATFORM_FILTERS.keys())
    results = []

    for pf in platforms:
        filt = PLATFORM_FILTERS.get(pf)
        if not filt:
            continue
        query = f'{filt["query"]} newer_than:{days}d'
        try:
            resp = service.users().messages().list(userId="me", q=query, maxResults=50).execute()
            msg_ids = [m["id"] for m in resp.get("messages", [])]
        except Exception as e:
            print(f"[Gmail] Error scanning {pf}: {e}")
            continue

        for mid in msg_ids:
            try:
                msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
                info = _parse_email(msg, pf)
                if info:
                    # Check if already imported
                    existing = await db.shipping_labels.find_one({"gmail_message_id": mid})
                    info["already_imported"] = existing is not None
                    info["message_id"] = mid
                    info["platform"] = pf
                    info["platform_name"] = filt["name"]
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
    """Extract item title from email."""
    if not text:
        return subject
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean)

    # Platform-specific title patterns
    if platform == "poshmark":
        m = re.search(r"(?:item|listing)[:\s]+(.{5,80}?)(?:\s*-|\s*\(|\s*SKU|\s*$)", clean, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    elif platform == "depop":
        m = re.search(r"(?:sold|item)[:\s]+(.{5,80}?)(?:\s*-|\s*\(|\s*for\s*\$|\s*$)", clean, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    return subject


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

            # Determine platform
            from_addr = headers.get("from", "").lower()
            platform = _detect_platform_from_email(from_addr)

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


def _detect_platform_from_email(from_addr: str) -> str:
    if "poshmark" in from_addr:
        return "poshmark"
    if "mercari" in from_addr:
        return "mercari"
    if "ebay" in from_addr:
        return "ebay"
    if "depop" in from_addr:
        return "depop"
    return ""


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
