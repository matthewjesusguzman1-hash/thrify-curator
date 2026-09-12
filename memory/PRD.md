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

### Shipping Label PDF Crop (Sep 12, 2026) — LATEST
- Crop rendered PDF labels to 4×6 aspect ratio, removing marketplace order/buyer metadata below label
- Preserves all label content (barcode, tracking, addresses, 0001 identifier)
- SKU overlay applied after crop so it stays visible

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
- Label crop fix: awaiting user confirmation on real printer/device
- Gmail automation for labels (requires user OAuth setup)

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
