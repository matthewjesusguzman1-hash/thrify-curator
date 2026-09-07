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
- Unified quick-trip system with Start/Pause/Resume/End flow using OSRM road routing
- Multi-stop trip support, trip route replay, Siri API Key for Shortcuts
- Manual trip entry, summary tabs, hierarchical trip history
- Trip editing with classification, IRS-oriented CSV export, voice commands

### AI Listing Assistant
- Gemini-powered via Emergent integrations (gemini-3.7-flash)
- Multi-turn conversations with image uploads
- **Image context persistence** — all images stay in context for follow-up questions
- **Stop button** — cancel slow/stuck requests mid-stream with AbortController
- **Retry button** — regenerate the last AI response with same prompt
- **Delete button** — remove last user+assistant exchange
- Saved prompts, chat history, message copying
- Light/dark theme integration, expanded view with sidebar
- **Parallel image fetching** on session replay for faster context loading
- History replay capped to last 20 messages for speed

## Recent Changes

### Sep 7, 2026 — AI Chat Stop/Retry/Delete + Speed Optimization
- **Added**: Stop button (red, replaces Send during streaming) using AbortController to cancel fetch
- **Added**: Retry button after each AI response — re-sends same prompt for fresh answer
- **Added**: Delete button after each AI response — removes last user+assistant pair
- **Optimized**: Image fetching during history replay changed from sequential to parallel (asyncio.gather)
- **Optimized**: History replay capped to last 20 messages
- **Preserved**: ALL images always included in replay — no image context loss for follow-ups
- **Tested**: Context memory confirmed, Stop/Send toggle verified, Retry/Delete functional

### Sep 7, 2026 — AI Chat Input Disappearing Bug Fix
- **Fixed**: Input disappeared in expanded mode when history button was toggled
- **Fixed**: Closing/reopening panel kept stale state hiding input
- **Fixed**: Mobile viewport height changed from vh to dvh
- **Tested**: 100% pass rate on 10 test scenarios (desktop + mobile)

### Sep 7, 2026 — Trip Route Replay + Pause/Resume
- Added pause/resume, per-leg OSRM distance, TripReplayMap component
- Updated header buttons, voice commands support pause/resume

### Sep 7, 2026 — GPS Tracker Unification + Siri API Key
- Removed old continuous GPS tracking, added Siri API Key CRUD

## Pending / Unconfirmed
- AI assistant auto-scroll behavior
- AI assistant image memory accuracy vs Gemini web
- GPS features awaiting production redeploy confirmation
- Employee message desktop notifications (code shipped, unverified on real device)
- AnyDesk watcher offline (needs user's Mac logs)

## Backlog
- Category manager settings panel
- Trip editing/classification UX polish
- Mapbox GPS matching integration
- eBay Browse API for listing enrichment
- Bulk CSV trip import for historical trips
