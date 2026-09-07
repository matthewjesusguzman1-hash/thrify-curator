# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a React + FastAPI + MongoDB operational dashboard for a resale/consignment business. It includes employee/admin dashboards, AI listing help, time tracking, AnyDesk worker monitoring, messaging, notifications, Daily.co video calls, reports, mobile wrappers, and an admin GPS/mileage tracker.

## Architecture
- **Frontend**: React (CRA + Craco), TailwindCSS, Shadcn/UI, Framer Motion
- **Backend**: FastAPI, MongoDB (Motor), Python
- **Auth**: JWT-based with admin code login, employee email login
- **Integrations**: Gemini AI (Emergent LLM Key), OSRM routing, Nominatim geocoding, Daily.co, AnyDesk watcher, Resend email, Web Push/APNs

## Core Features (Implemented)

### Admin Dashboard
- Team management, payroll tracking, hiring/interviews
- Forms & communications, sales data, taxes
- Remote sessions (AnyDesk monitoring)
- Video calls (Daily.co)
- Messaging & notifications
- GPS Mileage Tracker (unified quick-trip system)
- AI Listing Assistant (Gemini-powered)

### Employee Dashboard  
- Clock in/out, hours tracking
- AI Listing Assistant
- Video calls, notifications, timezone settings
- Employee walkthrough

### GPS Mileage Tracker (Admin-only)
- **Unified quick-trip system** — single Start/End flow using OSRM road routing
- Green header "Start Trip" / "End Trip" button delegates to tracker component
- Trip result feedback (distance, addresses, deduction) shown after completion
- Siri API Key for Shortcuts integration (long-lived, trip-only scope)
- Manual trip entry for retroactive logging
- Summary tabs: Today / Month / Year with trips, miles, deductions
- Hierarchical trip history grouped by month/day
- Trip editing with classification (Business/Personal), purpose categories
- IRS-oriented CSV export ($0.725/mile rate for 2026)
- Voice commands via Web Speech API
- Mileage adjustments

### Siri API Key Feature
- Admin generates a long-lived API key (trip-only scope) 
- Key is SHA-256 hashed before storage; only prefix shown after generation
- log-drive endpoint accepts both JWT and Siri key via `get_admin_or_siri_user`
- In-app setup guide with step-by-step Shortcuts instructions
- Optional Bluetooth auto-trigger for car connect/disconnect
- Revoke and regenerate capability

### AI Listing Assistant
- Gemini-powered via Emergent integrations
- Multi-turn conversations with image uploads
- Saved prompts, chat history, message copying
- Light/dark theme integration
- Image memory replay for conversation continuity

## Recent Changes (Sep 7, 2026)

### GPS Tracker Unification
- **Removed**: Old continuous GPS tracking system (handleStartTrip, pause, resume, complete, live map, location watching, completion form)
- **Kept**: Unified quick-trip system (handleQuickStart/handleQuickEnd → /api/admin/gps-trips/log-drive)
- **Added**: Siri API Key endpoints (generate, status, revoke) with trip-only auth scope
- **Added**: Trip result feedback after ending a trip (auto-dismisses after 20s)
- **Simplified**: AdminDashboard removed ~300 lines of old GPS state/functions
- **Updated**: Header green button now delegates to tracker ref.startTrip()/endTrip()
- **Updated**: iOS Quick Actions route through tracker ref methods

### Files Changed
- `/app/backend/app/dependencies.py` — Added `get_admin_or_siri_user` auth function
- `/app/backend/app/routers/gps_trips.py` — Added Siri key CRUD, modified log-drive auth
- `/app/frontend/src/components/admin/sections/GPSMileageTracker.jsx` — Full rewrite removing old system
- `/app/frontend/src/pages/AdminDashboard.jsx` — Removed old GPS state/functions, simplified props

## Pending / Unconfirmed
- AI assistant auto-scroll (reported by user, claimed fixed, unconfirmed)
- AI assistant image memory accuracy vs Gemini web
- Employee walkthrough acceptance
- AnyDesk production validation
- Daily.co cross-device real testing

## Backlog
- Category manager settings panel (add/edit/delete purpose categories)
- Trip editing/classification UX polish
- Mapbox GPS matching integration
- eBay Browse API for listing enrichment
