# Thrifty Curator™ — Product Requirements Document

## Original Problem Statement
Build a comprehensive operations dashboard for a resale/consignment business supporting:
- Admin/employee management, time tracking, payroll
- Remote worker (AnyDesk) monitoring
- GPS mileage tracking
- Reports, messages, training materials
- AI listing assistance (Gemini Flash)
- Vendoo CSV inventory import & analytics
- Native/mobile (Capacitor) features
- Consignment portal, job applications, forms

## Core Architecture
- **Frontend**: React (CRA + CRACO) + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor)
- **AI**: Gemini 3.7 Flash via Emergent integrations
- **Storage**: Emergent Object Storage for images and shipping labels
- **Maps**: OSRM (mileage), Nominatim (geocoding)
- **Mobile**: Capacitor (Android/iOS wrappers), PWA

## What's Been Implemented

### Training Overhaul + Employee Dashboard Tiles (Sep 13, 2026) — LATEST
- Removed all video generation from Training section
- Split training into Photography and Listing (Vendoo cross-listing) reference guides
- Admin can assign training to employees by name
- Employee dashboard restructured with tile navigation:
  - Always visible: Header, Clock In/Out, Pay Period, Recent Shifts, Timezone toggle
  - Tiles: Messages, Forms, Remote Work (remote only), Orders (if assigned), Training (if assigned)
- Header messages button unchanged (still opens full-screen page)
- Backend: new /api/training-assignments endpoints for assign/list/remove

### Gmail Label Import Integration (Sep 13, 2026)
- Gmail OAuth2 connection flow (connect/disconnect from admin dashboard)
- Scans inbox for shipping emails from Poshmark, Mercari, eBay, Depop
- Extracts PDF label attachments + follows Depop download links
- Parses email body for SKU; falls back to inventory title matching for Depop
- Auto-uploads labels with SKU tags attached (existing overlay continues working)
- Duplicate detection (won't re-import same email)
- Frontend: Gmail import panel in Shipping Labels section with scan/select/import flow

### Shipping Label PDF Redaction + Crop (Sep 12, 2026)
- Redacts marketplace metadata (Order #, Buyer @) from PDF labels before rendering
- Also crops to 4×6 aspect ratio if page extends beyond label area
- Preserves all real label content (barcode, tracking, addresses, service type)
- SKU overlay applied after redaction/crop

### Operations Page Tiles + GPS Improvements (Sep 12, 2026)
- Operations page restructured with 4 tiles: Orders & Pull List, Mileage, Sales Data, Taxes
- Each tile opens its own sub-page with back navigation
- Removed business/personal classification from GPS trips (all business)
- Post-trip edit modal auto-opens when trip finishes for immediate detail entry
- CSV import shared between Sales Data and Orders sections

### AnyDesk Watcher False Disconnect Fix (Sep 12, 2026)
- Network-based active session detection (lsof/netstat)
- Backend grace period 2min → 10min
- Removed aggressive ctrl_tcp disconnect pattern
- Note: Remote worker needs updated watcher script

### Per-Shift Pay Rate Editing (Sep 12, 2026)
- Edit rate per shift, rate column in shift tables
- Rate persistence, snapshotting at clock-in, backfill protection
- Rate breakdown in all payroll views (summary, report, PDF, employee history)
- Employee dashboard shows Current Rate + per-rate pay breakdown

### AI Assistant Full-Page Layout (Sep 12, 2026)
- Native dashboard page with sidebar + chat layout

### Orders, Labels, Business Files, Pull List, Training, GPS, Payroll, etc.
- See CHANGELOG.md for full history

## Prioritized Backlog

### P0 — Next Up
- Gmail integration: user needs to deploy and connect Gmail account (euni.deleon1@gmail.com)
- Test real email scanning + label import across platforms
- Fine-tune email parsing patterns per marketplace format

### P1 — Pending User Confirmation
- Label visibility fix: user device confirmation
- Print blank page fix: user confirmation
- Training video end-to-end validation (segment stitching)

### P2 — Known Issues
- Platform lint engine error (local ESLint works, platform check may fail)

### P3 — Future / Backlog
- Bulk rate fix (select multiple shifts, update rate at once)
- Rate change history log
- Watcher health dashboard
- Public homepage AI chat bubble (discussed, not approved)
- Training video style selector
- Payroll provider integration (Gusto discussed)
- Trip summary card (monthly mileage/deduction)
