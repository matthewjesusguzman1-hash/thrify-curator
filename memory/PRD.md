# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a React + FastAPI + MongoDB operational dashboard for a resale/consignment business. It includes employee/admin dashboards, AI listing help, time tracking, AnyDesk worker monitoring, messaging, notifications, Daily.co video calls, reports, mobile wrappers, and an admin GPS/mileage tracker.

## Architecture
- **Frontend**: React (CRA + Craco), TailwindCSS, Shadcn/UI, Framer Motion, Leaflet maps
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
- **Unified quick-trip system** — single Start/Pause/Resume/End flow using OSRM road routing
- **Multi-stop trip support** — pause at stops, resume when driving; total = sum of driving legs only
- Green header button: Start (idle) → Pause + End (driving) → Resume + End (paused)
- Trip result feedback (distance, addresses, deduction, leg count) shown after completion
- **Trip Route Replay** — animated car marker traveling along OSRM route geometry with:
  - Play/pause/reset controls
  - Speed control (1x/2x/4x)
  - Progressive route reveal (ghost path + solid traced path)
  - Scrubbing via progress bar click
  - Follow mode (auto-pan to car)
  - Start/end markers with address popups
  - Miles progress counter
- **Siri API Key** for Shortcuts integration (long-lived, trip-only scope)
- Manual trip entry for retroactive logging
- Summary tabs: Today / Month / Year with trips, miles, deductions
- Hierarchical trip history grouped by month/day
- Trip editing with classification (Business/Personal), purpose categories
- IRS-oriented CSV export ($0.725/mile rate for 2026)
- Voice commands via Web Speech API (start/pause/resume/end trip)
- Mileage adjustments

### Trip Route Replay Technical Details
- Backend: OSRM `overview=full&geometries=geojson` returns full route coordinates
- Per-leg geometry stored; combined on trip completion
- Old trips without geometry: auto-fetched from OSRM on first detail view
- Frontend: Leaflet map with requestAnimationFrame animation
- Cumulative distance interpolation for even-speed playback
- Multi-leg geometry concatenation (deduplicated join points)

### Siri API Key Feature
- Admin generates a long-lived API key (trip-only scope) 
- Key is SHA-256 hashed before storage; only prefix shown after generation
- log-drive endpoint accepts both JWT and Siri key via `get_admin_or_siri_user`
- Siri key works for all events: start, pause, resume, end
- In-app setup guide with step-by-step Shortcuts instructions
- Optional Bluetooth auto-trigger for car connect/disconnect
- Revoke and regenerate capability

### AI Listing Assistant
- Gemini-powered via Emergent integrations
- Multi-turn conversations with image uploads
- Saved prompts, chat history, message copying
- Light/dark theme integration
- Image memory replay for conversation continuity

## Recent Changes

### Sep 7, 2026 — Trip Route Replay + Pause/Resume
- **Added**: Pause/resume events in log-drive endpoint for multi-stop trips
- **Added**: Per-leg OSRM distance calculation and geometry storage
- **Added**: Combined route_geometry on trip completion (all legs joined)
- **Added**: TripReplayMap component with animated car, progress bar, speed controls
- **Added**: Auto-fetch route geometry from OSRM for old trips on first view
- **Updated**: Header buttons: Start (green), Pause (amber) + End (red), Resume (green) + End (red)
- **Updated**: Quick Trip section shows Pause/Resume + End when trip active
- **Updated**: Voice commands support "pause trip" and "resume trip"

### Sep 7, 2026 — GPS Tracker Unification + Siri API Key
- **Removed**: Old continuous GPS tracking system (~500 lines)
- **Added**: Siri API Key CRUD endpoints with trip-only auth scope
- **Added**: Trip result feedback after ending a trip
- **Simplified**: AdminDashboard removed old GPS state/functions

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
- Bulk CSV trip import for historical trips
