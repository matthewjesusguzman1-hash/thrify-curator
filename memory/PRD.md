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

### Orders & Shipping Labels (Sep 11, 2026)
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

### iOS Date Picker Fix & Preview Count (Sep 11, 2026) — LATEST
- **Root cause**: iOS date picker onChange was not reliably capturing date changes. User selected Sept 1–11 but stored dates were Sept 11–11 (0 orders)
- **Fix**: Added `onInput` and `onBlur` handlers alongside `onChange` for date inputs on the assignment form
- **Preview count**: Live preview shows order count AND label match count before assigning (e.g., "83 orders found · 5 label matches")
- **Backend**: Enhanced `/api/orders/preview-count` to accept `label_ids` param and return `{count, match_count}`
- **Assign button**: Shows count text (e.g., "Assign 83 Orders") and is disabled when count is 0
- **Zero orders warning**: Red banner "0 orders found for this date range — check your dates"
- **Employee chips**: Employee selection uses tappable chips instead of native `<select>` (iOS showed "No Options" with dropdown)
- **Testing**: 100% pass (11/11 backend, all frontend verified) — iteration_79

### Business Files Document Vault (Sep 11, 2026)
- **Admin-only** document storage for important business paperwork
- **Own tile** on admin home page → dedicated page with full document management
- **Folders**: Bank Account, LLC Formation, Tax, Other (with counts + custom folder creation)
- **Custom tags**: Comma-separated, filterable tag pills
- **AI OCR Search**: Gemini Flash vision reads scanned documents; search finds text inside files, display name, tags, folder
- **Upload**: Drag & drop or tap to select, with folder/name/tags form (supports phone camera scans)
- **Document rows**: Display name, folder badge, tags, file size, date, expandable preview
- **Actions**: Print, download, edit (name/folder/tags), delete with confirmation
- **Multi-page Preview**: Tap a document to expand — swipe left/right or tap arrows to navigate all pages; page dots + "Page X of Y" indicator
- **Download**: Blob-based download works on any device (phone, desktop) with Content-Disposition: attachment header
- **Backend**: `/api/documents/*` — upload, list, search, folders, tags, update, delete, file/preview serve (with `?page=N` for multi-page)

### Admin Dashboard Restructure (Sep 2026)
- Replaced overloaded one-page admin dashboard with tile-based home page + separate full-page sections
- Home page: All Employees + Hours visible, tile grid for Operations, Team, Hiring, Messages, Training, AI
- Operations page: Shipping Labels, Order Assignments, GPS Tracker, Pull List, Sales Data, Taxes
- Back button navigation, header icons preserved

### Pull List Feature (Sep 2026)
- **Backend**: `/api/inventory/pull-list` GET, mark-pulled POST, reset POST, mark-all-pulled POST
- Defaults to "Today" — same-day sold items, max 1 week back
- Clean minimal design: SKU, title, platform only
- SKU grouping by row, natural sort (A6 < A10 < A25)
- Print-friendly PDF via isolated print window

### AI Assistant
- Gemini 3.7 Flash for listing assistance
- Improved hashtag prompt, streaming responses, image context, history

### Other Features
- Employee time tracking, payroll history, payment records, pay rate snapshots
- GPS mileage tracking with OSRM road routing, header Start Trip, multi-leg pause/resume
- Messaging, forms, consignment portal, job applications
- Remote session monitoring (AnyDesk watcher)
- Inventory & Sales (Vendoo CSV import, analytics, tax reports)
- Password management, W-9/W-8BEN, web push, APNs

## Prioritized Backlog

### P0 — Next Up
- **Gmail automation for labels**: Auto-retrieve shipping label PDFs from Gmail inbox (requires user credentials/OAuth setup)
- **Training video section**: Content types, upload flow, video playback (requirements TBD)

### P1 — Pending User Confirmation
- Pay rate snapshot: production validation after real rate change
- GPS header Start Trip & route replay: production device validation
- AI hashtag quality: real merchant feedback
- iOS date picker fix: user confirmation from their actual device

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
