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
- **Storage**: Emergent Object Storage for images
- **Maps**: OSRM (mileage), Nominatim (geocoding)
- **Mobile**: Capacitor (Android/iOS wrappers), PWA

## What's Been Implemented

### Pull List Feature (Sep 2026) — NEW
- **Backend**: `/api/inventory/pull-list` GET (sold items sorted by SKU), `/api/inventory/pull-list/mark-pulled` POST, `/api/inventory/pull-list/reset` POST, `/api/inventory/pull-list/mark-all-pulled` POST
- **Frontend**: `PullListSection.jsx` in Reports & Operations dashboard group
- Defaults to "Today" — user typically pulls same-day sold items, max 1 week back
- Filters: Today, 3 Days, Week (no "All Sold" — avoids data overload)
- Clean minimal design: SKU, title, platform only — no prices, dates, or meta clutter
- Items grouped by SKU row letter when multiple rows, flat list when single row
- Natural SKU sorting (A6 < A10 < A25)
- Tap checkbox to mark pulled, "Mark All Pulled" at bottom
- Show/hide pulled items toggle
- Print-friendly view
- **Smart CSV Import**: Upserts by SKU — re-importing full Vendoo CSV preserves pulled status
- Testing: 100% pass (17 backend, 7 frontend scenarios)

### AI Assistant
- Gemini 3.7 Flash for listing assistance
- Improved hashtag prompt (creative, buyer-oriented, not title repetition)
- Streaming responses, image context, history, retry/delete
- Composer viewport fixes, AbortController stop

### Pay Rate Snapshots (Aug 2026)
- Hourly rate stored per shift at clock-in time
- Old shifts keep original rate when employee rate changes
- Backfill logic for legacy shifts without rate

### GPS Mileage Tracking
- Real-time trip tracking with OSRM road routing
- Header Start Trip forces Operations group open
- On-demand route geometry for trips missing stored routes
- Multi-leg pause/resume, editable purpose categories
- Siri shortcut support (scoped keys)

### Admin Dashboard
- Dark-only theme (light mode removed per user request)
- Trademark ™ placement throughout branding
- Dashboard groups: Team, Payroll, Forms, Hiring, Reports & Operations

### Inventory & Sales (Vendoo)
- CSV import with smart SKU-based deduplication
- Analytics, stale inventory detection, tax reports
- Year-over-year comparison, export

### Other Features
- Employee time tracking, payroll history, payment records
- Messaging system, form submissions, consignment portal
- Job applications, skills tests, interview scheduling
- Remote session monitoring (AnyDesk watcher)
- Password management, W-9/W-8BEN document handling
- Web push notifications, APNs (sandbox)

## Prioritized Backlog

### P0 — User Requested / In Discussion
- Shipping label management (Gmail integration or upload approach — TBD)
- Training video section (content types, upload flow — TBD)

### P1 — Pending User Confirmation
- Pay rate snapshot: production validation after real $3→$5 rate change
- GPS header Start Trip & route replay: production device validation
- AI hashtag quality: real merchant feedback on Flash + improved prompt

### P2 — Known Issues
- AnyDesk watcher: autostart/remote restart reliability unresolved
- Platform lint engine error (ESLint works locally, platform check fails)
- AI composer/autoscroll: not user-confirmed in production

### P3 — Future / Backlog
- Payroll provider integration (Gusto discussed, not started)
- Daily AI-generated activity summaries
- Message classification & draft replies
- Employee message cross-device notification
- Remote worker geolocation real-device validation
