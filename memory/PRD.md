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
- Green header button: Start (idle) -> Pause + End (driving) -> Resume + End (paused)
- Trip result feedback (distance, addresses, deduction, leg count) shown after completion
- **Trip Route Replay** — animated car marker traveling along OSRM route geometry
- **Siri API Key** for Shortcuts integration (long-lived, trip-only scope)
- Manual trip entry for retroactive logging
- Summary tabs: Today / Month / Year with trips, miles, deductions
- Hierarchical trip history grouped by month/day
- Trip editing with classification (Business/Personal), purpose categories
- IRS-oriented CSV export ($0.725/mile rate for 2026)
- Voice commands via Web Speech API

### AI Listing Assistant
- Gemini-powered via Emergent integrations
- Multi-turn conversations with image uploads
- Saved prompts, chat history, message copying
- Light/dark theme integration
- Image memory replay for conversation continuity
- Expanded view with sidebar conversation list

## Recent Changes

### Sep 7, 2026 — AI Chat Input Disappearing Bug Fix
- **Fixed**: Input disappeared in expanded mode when history button was toggled (history shows in sidebar, not main area, but isActiveChat condition incorrectly hid input)
- **Fixed**: Closing and reopening panel kept stale showHistory/showPrompts state, hiding the input on reopen
- **Fixed**: Mobile viewport height constraint changed from `vh` to `dvh` for better virtual keyboard handling
- **Fixed**: Added `min-h-0` to flex body container to prevent overflow-related input displacement
- **Change**: `isActiveChat` condition updated to: `!showPrompts && (!showHistory || isExpanded)`
- **Change**: useEffect on `isOpen` now resets `showHistory` and `showPrompts` to false
- **Tested**: 100% pass rate on 10 test scenarios (desktop + mobile), iteration_70

### Sep 7, 2026 — Trip Route Replay + Pause/Resume
- Added: Pause/resume events, per-leg OSRM distance calculation and geometry storage
- Added: TripReplayMap component with animated car, progress bar, speed controls
- Updated: Header buttons, voice commands support pause/resume

### Sep 7, 2026 — GPS Tracker Unification + Siri API Key
- Removed: Old continuous GPS tracking system
- Added: Siri API Key CRUD endpoints with trip-only auth scope
- Simplified: AdminDashboard removed old GPS state/functions

## Pending / Unconfirmed
- AI assistant auto-scroll (reported by user, claimed fixed, unconfirmed)
- AI assistant image memory accuracy vs Gemini web
- Employee walkthrough acceptance
- AnyDesk production validation
- Daily.co cross-device real testing
- GPS features awaiting production redeploy confirmation
- Employee message desktop notifications (code shipped, unverified on real device)

## Backlog
- Category manager settings panel (add/edit/delete purpose categories)
- Trip editing/classification UX polish
- Mapbox GPS matching integration
- eBay Browse API for listing enrichment
- Bulk CSV trip import for historical trips
