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

### Per-Shift Pay Rate Editing (Sep 12, 2026) — LATEST
- **Edit rate per shift**: Admin can change hourly rate on any individual time entry via the Edit Time Entry modal
- **Rate column**: Admin shift table shows per-shift rate for each entry
- **Rate persistence**: Once a rate is set on a shift, changing the employee's global rate does NOT overwrite it
- **Rate snapshotting**: Clock-in (both employee and admin-initiated) snapshots the current rate onto the entry
- **Backfill protection**: Global rate changes only backfill entries with `hourly_rate=None`, preserving explicitly set rates
- **Payroll integration**: All payroll calculations (summary, report, PDF, employee history, employee dashboard) use per-shift stored rates with fallback to employee global rate
- **Backend**: `EditTimeEntryRequest` includes `hourly_rate`, PUT endpoint accepts it, payroll endpoints refactored
- **Testing**: 100% backend (7/7), frontend verified — iteration_85

### AI Assistant Full-Page Layout (Sep 12, 2026)
- Fixed critical bugs: fullPage branch called undefined render functions
- Rewrote fullPage mode as native dashboard page with sidebar + chat layout
- Testing: 100% pass (10/10 frontend) — iteration_84

### Orders & Shipping Labels (Sep 11, 2026)
- Full label upload/preview/SKU tagging/auto-name via AI OCR
- Order assignment to employees with date range + labels
- Employee Orders page with matched labels and print
- Assignment history (active/completed/incomplete)

### Business Files Document Vault (Sep 11, 2026)
- Admin-only document storage with folders, tags, OCR search
- Multi-page preview with navigation, blob-based download

### Admin Dashboard Restructure (Sep 2026)
- Tile-based home page + separate full-page sections
- Operations, Team, Hiring, Messages, Training, AI tiles

### Pull List, AI Assistant, Training Videos, GPS, Payroll, etc.
- See CHANGELOG.md for full history

## Prioritized Backlog

### P0 — Next Up
- Gmail automation for labels (requires user OAuth setup)

### P1 — Pending User Confirmation
- Label visibility fix: user device confirmation
- Print blank page fix: user confirmation
- iOS date picker fix: user device confirmation
- Training video end-to-end validation (segment stitching)

### P2 — Known Issues
- AnyDesk watcher autostart reliability
- Platform lint engine error (local ESLint works, platform check may fail)

### P3 — Future / Backlog
- Public homepage AI chat bubble (discussed, not approved)
- Training video style selector
- Payroll provider integration (Gusto discussed)
- Daily AI-generated activity summaries
- Employee message cross-device notification
- Remote worker geolocation validation
