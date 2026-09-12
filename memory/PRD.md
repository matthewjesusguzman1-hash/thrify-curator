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

### AnyDesk Watcher False Disconnect Fix (Sep 12, 2026) — LATEST
- Root cause: trace file mtime check (2-min window) failed during normal idle sessions
- Fix 1: Network-based detection via lsof/netstat for actual TCP connections
- Fix 2: Backend grace period increased 2min → 10min
- Fix 3: Removed aggressive ctrl_tcp disconnect pattern from session-end regex
- Note: Remote worker needs updated watcher script after deploy

### Per-Shift Pay Rate Editing (Sep 12, 2026)
- Edit rate per shift via TimeEntryModal, rate column in shift tables
- Rate persistence: explicit rates survive global rate changes
- Rate snapshotting at clock-in (employee and admin-initiated)
- Rate breakdown in payroll (summary, report, PDF, employee history)
- Employee dashboard: shows "Current Rate" + per-rate pay breakdown
- Per-shift rate shown on all shifts in employee Recent Shifts list

### AI Assistant Full-Page Layout (Sep 12, 2026)
- Fixed critical bugs in fullPage mode (undefined render functions)
- Native dashboard page with sidebar + chat layout

### Orders & Shipping Labels, Business Files, Pull List, Training, GPS, etc.
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
- Platform lint engine error (local ESLint works, platform check may fail)

### P3 — Future / Backlog
- Bulk rate fix (select multiple shifts, update rate at once)
- Rate change history log
- Watcher health dashboard (live heartbeat indicator)
- Public homepage AI chat bubble (discussed, not approved)
- Training video style selector
- Payroll provider integration (Gusto discussed)
- Daily AI-generated activity summaries
- Employee message cross-device notification
- Remote worker geolocation validation
