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

### AI Assistant Full-Page Layout (Sep 12, 2026) — LATEST
- **Fixed critical bugs**: fullPage branch was calling undefined render functions (renderHistoryList, renderPromptsManager, renderMessages, renderInput) and undefined `loadConversation()` 
- **Rewrote fullPage mode**: Native dashboard page layout with sidebar + chat, no floating window chrome
- **Desktop**: Sidebar shows recent conversations on left, main chat area fills remaining space, input at bottom
- **Mobile**: Sidebar hidden, history toggle button in header for mobile access
- **Prop fix**: AdminDashboard now passes `token` and `isDark` props correctly (was passing `getAuthHeader`)
- **No FAB/close/expand**: Full-page mode has no floating widget controls
- **Testing**: 100% pass (10/10 frontend tests) — iteration_84

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

### iOS Date Picker Fix & Preview Count (Sep 11, 2026)
- **Root cause**: iOS date picker onChange was not reliably capturing date changes
- **Fix**: Added `onInput` and `onBlur` handlers alongside `onChange` for date inputs on the assignment form
- **Preview count**: Live preview shows order count AND label match count before assigning
- **Employee chips**: Employee selection uses tappable chips instead of native `<select>`
- **Employee filter**: "With Labels" filter on Orders page lets employee show only items with matching labels
- **Testing**: 100% pass — iteration_79 (preview/assign), iteration_80 (filter)

### Business Files Document Vault (Sep 11, 2026)
- Admin-only document storage for important business paperwork
- Own tile on admin home page → dedicated page with full document management
- Folders: Bank Account, LLC Formation, Tax, Other (with counts + custom folder creation)
- Custom tags, AI OCR search, upload with metadata
- Multi-page preview with swipe/arrow navigation
- Blob-based download, print, edit, delete

### Admin Dashboard Restructure (Sep 2026)
- Replaced overloaded one-page admin dashboard with tile-based home page + separate full-page sections
- Home page: All Employees + Hours visible, tile grid for Operations, Team, Hiring, Messages, Training, AI
- Operations page: Shipping Labels, Order Assignments, GPS Tracker, Pull List, Sales Data, Taxes
- Back button navigation, header icons preserved

### Pull List Feature (Sep 2026)
- Backend: `/api/inventory/pull-list` GET, mark-pulled POST, reset POST, mark-all-pulled POST
- Defaults to "Today" — same-day sold items, max 1 week back
- Clean minimal design: SKU, title, platform only
- SKU grouping by row, natural sort
- Print-friendly PDF via isolated print window

### AI Assistant
- Gemini 3.7 Flash for listing assistance
- Improved hashtag prompt, streaming responses, image context, history
- Conversation management with sidebar
- Saved prompts CRUD
- Voice input support
- Image upload with drag-and-drop

### Training Section
- Video generation via Sora 2 (12-second segments, ffmpeg stitching)
- Segment-based long video generation with retries
- Admin management, employee completion tracking

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

### P1 — Pending User Confirmation
- Pay rate snapshot: production validation after real rate change
- GPS header Start Trip & route replay: production device validation
- AI hashtag quality: real merchant feedback
- iOS date picker fix: user confirmation from their actual device
- Label visibility fix: user device confirmation
- Print blank page fix: user confirmation
- Training video end-to-end validation (segment stitching)

### P2 — Known Issues
- AnyDesk watcher: autostart/remote restart reliability unresolved
- Platform lint engine error (ESLint works locally, platform check fails)

### P3 — Future / Backlog
- Public homepage AI chat bubble (discussed, not approved)
- Training video style selector
- Payroll provider integration (Gusto discussed)
- Daily AI-generated activity summaries
- Message classification & draft replies
- Employee message cross-device notification
- Remote worker geolocation real-device validation
