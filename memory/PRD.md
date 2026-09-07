# Thrifty Curator — Product Requirements Document

## Original Problem Statement
Build a resale/consignment operations platform ("Thrifty Curator") with employee/admin dashboards, remote work monitoring, time tracking, messaging, push notifications, video calls, interviews, reports, and mobile wrappers.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB (via Motor)
- **AI**: Gemini 3.7 Flash via emergentintegrations (Emergent LLM Key)
- **Storage**: Emergent Object Storage for images
- **Routing**: OSRM (road distance), Nominatim (reverse geocoding)
- **Voice**: Browser Web Speech API (no external service needed)

## What's Been Implemented

### Core Platform
- Admin & Employee dashboards with role-based access
- Employee clock-in/out with time tracking
- Pay period management & financial tracking
- Messaging system (admin ↔ employee)
- Push notifications (web push, APNs)
- Video calls (Daily.co)
- Interview scheduling
- AnyDesk remote work monitoring (watcher-based)
- Mobile wrappers (Capacitor iOS/Android)
- Night shift / dark mode theme
- Employee walkthrough/onboarding

### AI Listing Assistant (Sep 2026)
- Gemini 3.7 Flash model (upgraded from 3-flash-preview)
- Multi-turn chat with image upload (Emergent Object Storage)
- Image memory across session restarts (fixed: await + user_id)
- Streaming responses via SSE
- Saved prompts (CRUD + one-tap use)
- Gemini-style left sidebar with recent conversations
- Full-page expanded panel (96vh)
- Image lightbox (click thumbnail → full size)
- Voice input via Web Speech API (mic button)
- Simplified system prompt (no over-restrictive rules)
- Light/dark theme sync
- Message-level copy

### GPS Mileage Tracker (Sep 2026)
- Start/End Trip with browser GPS
- OSRM road routing for accurate driving distance
- Nominatim reverse geocoding for street addresses
- Business/Personal trip classification toggle
- Customizable purpose categories (seeded defaults + CRUD)
- IRS-compliant CSV export (Date, Start Address, End Address, Miles, Purpose, Classification, Tax Deduction)
- Voice commands: "start trip" / "end trip"
- Manual trip entry (kept from original)
- Trip history with hierarchical views (today/month/year)
- Mileage adjustments and summaries

## Pending / Backlog

### P0 — User Validation Needed
- Auto-scroll while streaming / after panel reopen
- Theme contrast in real employee dashboard use
- Old chat image display in actual UI
- Mileage tracker GPS accuracy on real device

### P1
- Trip purpose edit after logging
- Category manager settings panel
- Response latency optimization
- AnyDesk production validation
- Daily.co cross-device calls/recordings

### P2
- Financial/Vendoo re-import/comparison
- Mapbox GPS matching (future)
- eBay Browse API (future)

### Known Issues
- Platform lint engine failure (persistent, not code-related)
- Bearer token in image URL query string (security consideration)
