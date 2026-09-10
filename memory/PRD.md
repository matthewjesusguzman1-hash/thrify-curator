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
- Remote sessions (AnyDesk monitoring), video calls (Daily.co)
- Messaging & notifications
- GPS Mileage Tracker (unified quick-trip system)
- AI Listing Assistant (Gemini-powered)

### Employee Dashboard  
- Clock in/out, hours tracking, AI Listing Assistant
- Video calls, notifications, timezone settings, employee walkthrough

### GPS Mileage Tracker (Admin-only)
- Unified quick-trip system with Start/Pause/Resume/End flow using OSRM road routing
- Multi-stop trip support, trip route replay, Siri API Key for Shortcuts
- Manual trip entry, summary tabs, hierarchical trip history
- Trip editing with classification, IRS-oriented CSV export, voice commands

### AI Listing Assistant
- Gemini-powered via Emergent integrations (gemini-3.7-flash)
- Multi-turn conversations with image uploads
- **Image compression**: uploads resized to 1024px and JPEG 80% for Gemini context (~90% smaller), original full-res kept for display
- **Image context persistence**: all images stay in context for follow-up questions
- **Stop button**: cancel slow requests mid-stream with AbortController
- **Retry button**: regenerate the last AI response with same prompt
- **Delete button**: remove last user+assistant exchange
- Saved prompts, chat history, message copying
- Light/dark theme integration, expanded view with sidebar
- Parallel image fetching on session replay, capped to last 20 messages

## Recent Changes

### Sep 9, 2026 — Pay Rate Snapshot + GPS Trip Fixes
- **Fixed**: Pay rate changes no longer retroactively inflate old shifts — each shift stores the rate at clock-in
- **Fixed**: Header "Start Trip" button now works even when Operations section is collapsed (forces it open first)
- **Fixed**: Trip replay map recovers route geometry from OSRM on-demand if not stored
- **Added**: Rate change audit trail in `rate_changes` collection
- **Added**: Admin backfill endpoint for historical shift rates
- **Added**: `/gps-trips/{trip_id}/route-geometry` endpoint for on-demand geometry recovery
- **Files**: `time_entry.py`, `time_tracking.py`, `admin_employees.py`, `admin_time_entries.py`, `admin_reports.py`, `gps_trips.py`, `GPSMileageTracker.jsx`, `AdminDashboard.jsx`

### Sep 9, 2026 — Watcher System-Wide + Worker Profile
- **Changed**: Watcher moved to `/opt/thriftycurator` for system-wide access
- **Changed**: Worker profile LaunchAgent + Login Item for reliable auto-start
- **Changed**: Command polling reduced to 2 seconds for near-instant response
- **Changed**: Restart command now kills first, uses full `/Applications/AnyDesk.app` path, logs subprocess output
- **Files**: `anydesk_session_watcher.py`, `install_autostart.sh`
- **Removed**: Light/dark mode toggle from admin dashboard — admin is always dark mode
- **Kept**: Employee dashboard still has light/dark toggle (light blue palette)
- **Kept**: Messages panel theme toggle (separate from dashboard theme)
- **Files**: `AdminDashboard.jsx` — removed `data-theme` attr, removed toggle from More dropdown

### Sep 7, 2026 — AI Image Compression for Speed
- **Added**: Image compression via Pillow — resize to max 1024px, JPEG quality 80%
- **Result**: Gemini gets ~90KB instead of ~2-5MB per image; display still uses original full-res
- **Logged**: Compression ratio logged per upload (e.g. "467KB -> 90KB for Gemini")

### Sep 7, 2026 — AI Chat Stop/Retry/Delete + Speed Optimization
- **Added**: Stop button, Retry button, Delete button
- **Optimized**: Parallel image fetching, history replay capped to 20 messages
- **Preserved**: All images always included in replay

### Sep 7, 2026 — AI Chat Input Disappearing Bug Fix
- **Fixed**: Input disappeared in expanded mode when history toggled
- **Fixed**: Stale state on panel reopen, mobile viewport height (dvh)
- **Tested**: 100% pass on 10 scenarios (desktop + mobile)

### Sep 7, 2026 — Trip Route Replay + Pause/Resume + GPS Unification + Siri API Key
- Pause/resume, per-leg OSRM distance, TripReplayMap, Siri API Key CRUD

## Pending / Unconfirmed
- AI assistant auto-scroll behavior
- GPS features awaiting production redeploy confirmation
- Employee message desktop notifications (unverified on real device)
- AnyDesk watcher offline (needs user's Mac logs)

## Backlog
- Category manager settings panel
- Trip editing/classification UX polish
- Mapbox GPS matching integration
- eBay Browse API for listing enrichment
- Bulk CSV trip import for historical trips
