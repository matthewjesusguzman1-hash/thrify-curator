# Thrifty Curator - Product Requirements Document

## Overview
Operations dashboard for a resale/consignment business. React frontend + FastAPI backend + MongoDB.

## Core Modules

### 1. Employee Dashboard
- Tile-based layout with morph/minimize for Messages and Recent Shifts
- Dedicated pages for Forms, Training, AI Assistant, Remote Work, Orders
- Pay Period summary always visible
- Conditional tiles: Orders (when assigned), Remote Work (remote workers), Training (when assigned)

### 2. Admin Dashboard
- State-based navigation (`activePage`)
- Sections: Team, Payroll, Operations, Forms, Hiring, Messages, Training, AI Assistant, Business Files
- Operations sub-sections: Orders & Pull List, Mileage, Sales Data, Taxes

### 3. Training System
- Admin assigns Photography/Listing training by employee
- Editable training content stored in MongoDB
- AI cleanup for text (Gemini via emergentintegrations)
- Employee view loads saved DB content
- Reference-only, no videos, no completion tracking

### 4. Gmail Label Import (IN PROGRESS)
- Google OAuth connects admin's Gmail
- **Current scan strategy**: Find all PDFs in date range, detect platform from content
  - Query 1: `has:attachment filename:pdf` (most reliable)
  - Query 2: Depop-specific emails (download link style)
  - Query 3: Broad marketplace keywords (forwarded emails)
- Custom From/To date range picker
- Debug diagnostics panel in scan UI
- Platform detection from from-address, subject, and body content
- Depop: shipping-label download link + title-to-SKU matching via Vendoo CSV
- Duplicate prevention via gmail_message_id
- Status: OAuth works on production, scan logic rewritten, debug diagnostics added. Needs production validation.

### 5. Shipping Labels
- Drag & drop upload + Gmail import
- SKU overlay on labels (bottom-left)
- PDF-to-PNG conversion (no OCR/redaction/cropping)
- Print individual or all labels

### 6. Orders & Pull List
- CSV update for orders
- Order assignments to employees
- Pull list with date range filters

### 7. Other Features
- Consignment agreement portal (magic link auth)
- Mileage/trip tracking
- Sales data CSV import
- AnyDesk remote session watcher (v2 — crash-resilient with log rotation, observer recovery, error backoff)
- Video calls (Daily.co)
- Push notifications
- 3-hour session timeout

## Architecture
- Frontend: React + Tailwind + Shadcn UI (port 3000)
- Backend: FastAPI (port 8001, all routes /api prefixed)
- Database: MongoDB
- Storage: Emergent Object Storage
- AI: Gemini via emergentintegrations + Emergent LLM Key

## Key Constraints
- Production: https://reseller-dashboard-11.emergent.host (agent cannot access)
- Preview: https://curator-app-3.preview.emergentagent.com
- Admin login: email + 4-digit access code
- Header Messages = full-screen overlay; Body Messages = tile/morph
- Never expose credentials/tokens in responses
