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

### Orders & Shipping Labels (Sep 11, 2026) — NEW
- **Backend**: `/api/orders/*` router with label upload, list, delete, SKU tag, preview; order assignment CRUD; employee endpoints
- **Admin Operations page**: Shipping Labels section (drag-and-drop + file picker, PDF/image support, Emergent Object Storage)
- **Inline Label Preview**: Click label row to expand/collapse full shipping label image (PDFs converted to PNG via PyMuPDF at 2x resolution)
- **SKU Tagging**: Each label has "Add SKU" button — type the SKU after previewing, exact match at 100% confidence
- **Admin Print Labels**: Individual print button per label + "Print All" button in section header
- **Auto-Name Labels (AI OCR)**: On upload, PDF text extracted (pdfplumber + PyMuPDF); if empty (image-based PDFs), Gemini Flash vision OCR reads the label image to find recipient name. Display name shown instead of filename.
- **Admin Operations page**: Order Assignments section (assign orders to specific employees with date range + labels)
- **Assignment History Log**: Active, Completed (green), and Incomplete (yellow) statuses shown; admin can remove any entry with confirmation
- **Employee Dashboard**: "Orders" button (only visible when admin has assigned active orders)
- **Employee Orders page**: Side-by-side view — matched labels shown directly under their pull list item with link icon, preview, and print buttons
- **Label Printing**: Print button on each label opens a clean print window (works for both PDF and image labels)
- **Auto-matching**: SKU tag exact match (priority) → PDF text extraction + platform/title/SKU heuristics (fallback)
- **Unmatched labels**: Shown separately with warning indicator, preview, and print buttons
- **Complete flow**: Employee taps "Complete Orders" → assignment marked done → logged in history; unreplaced/uncompleted assignments logged as incomplete
- **Access control**: Admin assigns, employee sees only when assigned
- **Bug fix**: Employee dropdown now re-fetches when assignment form opens (prevents stale empty list)

### Admin Dashboard Restructure (Sep 2026)
- Replaced overloaded one-page admin dashboard with tile-based home page + separate full-page sections
- Home page: All Employees + Hours visible, tile grid for Operations, Team, Hiring, Messages, Training, AI
- Operations page: Shipping Labels, Order Assignments, GPS Tracker, Pull List, Sales Data, Taxes
- Back button navigation, header icons preserved
- Testing: 100% pass (8/8 tiles, navigation, back button)

### Pull List Feature (Sep 2026)
- **Backend**: `/api/inventory/pull-list` GET, mark-pulled POST, reset POST, mark-all-pulled POST
- Defaults to "Today" — same-day sold items, max 1 week back
- Clean minimal design: SKU, title, platform only
- SKU grouping by row, natural sort (A6 < A10 < A25)
- Print-friendly PDF via isolated print window (large header, prominent SKU text)
- **Smart CSV Import**: Upserts by SKU — re-importing full Vendoo CSV preserves pulled status

### AI Assistant
- Gemini 3.7 Flash for listing assistance
- Improved hashtag prompt, streaming responses, image context, history

### Pay Rate Snapshots (Aug 2026)
- Hourly rate stored per shift at clock-in time
- Old shifts keep original rate when employee rate changes

### GPS Mileage Tracking
- Real-time trip tracking with OSRM road routing
- Header Start Trip, multi-leg pause/resume, Siri shortcut support

### Inventory & Sales (Vendoo)
- CSV import with smart SKU-based deduplication
- Analytics, stale inventory detection, tax reports

### Other Features
- Employee time tracking, payroll history, payment records
- Messaging, forms, consignment portal, job applications
- Remote session monitoring (AnyDesk watcher)
- Password management, W-9/W-8BEN, web push, APNs

## Prioritized Backlog

### P0 — Next Up
- **Gmail automation for labels**: Auto-retrieve shipping label PDFs from Gmail inbox (requires user credentials/OAuth setup)
- **Training video section**: Content types, upload flow, video playback (requirements TBD)

### P1 — Pending User Confirmation
- Pay rate snapshot: production validation after real rate change
- GPS header Start Trip & route replay: production device validation
- AI hashtag quality: real merchant feedback

### P2 — Known Issues
- AnyDesk watcher: autostart/remote restart reliability unresolved
- Platform lint engine error (ESLint works locally, platform check fails)
- AI composer/autoscroll: not user-confirmed

### P3 — Future / Backlog
- Payroll provider integration (Gusto discussed)
- Daily AI-generated activity summaries
- Message classification & draft replies
- Employee message cross-device notification
- Remote worker geolocation real-device validation
