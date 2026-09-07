# Thrifty Curator - Product Requirements Document

## Overview
Resale/consignment operations platform with employee/admin management, time tracking, remote session monitoring, financial reporting, interview scheduling, video calling, AI listing assistant, and mobile/native support.

## Core Features (Implemented)

### Authentication & User Management
- Employee login (email-based, optional password)
- Admin login (email + 4-digit code)
- Face ID / biometric auth (native)
- Password set/change for employees
- Consignor magic-link auth

### Time Tracking
- Clock in/out with GPS verification
- Auto clock-out when leaving work area
- Live Activity widget (iOS)
- Admin clock in/out for employees
- Pay period summaries, shift history
- Location verification every 30 seconds

### Push Notifications
- **APNs (iOS native)**: Clock in/out, messages, remote sessions, video calls
- **Web Push (browser/PWA)**: Clock in/out, messages, remote sessions, video calls
- Admin: WebPushSettings component in notification bell dropdown
- Employee: Notification Settings card on dashboard with toggle switch
- All notification paths now use separate try/except for APNs and Web Push

### Video Calling (Daily.co)
- Admin-to-employee and employee-to-admin calls
- Shareable call links for external people
- Scheduled calls with date/time, call reminders
- Direct iframe video call UI
- Role-based tabs: Admin (Active/Upcoming/History/Recordings), Employee (Active/History)
- Incoming call banner, optional recording (admin-only, off by default)
- Invitee names stored and displayed

### Remote Session Monitoring (AnyDesk)
- Watcher service for Mac log monitoring
- Session events/heartbeats, shutdown/restart commands
- Auto clock-out on AnyDesk disconnect
- Notification silencing toggle (remote session notifications only)
- Quick Connect deep link button (one tap opens AnyDesk to work computer)
- Auto-close stale LIVE sessions when heartbeat reports no active connections for 2+ minutes

### Financial Management
- CSV import (multiple formats including Vendoo)
- Financial summaries and reporting
- 1099/W-9/W-8BEN document management

### Messaging
- Admin-employee and admin-consignor chat
- Full-screen messaging modal, unread message badges

### AI Listing Assistant (Feb 2026)
- **Floating chat bubble** on Employee Dashboard (sparkles icon, bottom-right)
- **Popup overlay** — doesn't take over full screen, click outside (backdrop) to dismiss
- Conversational AI powered by **Gemini (gemini-3-flash-preview)** via emergentintegrations
- **Image upload support**: JPEG, PNG, WEBP up to 5MB — stored in Emergent Object Storage
- **Drag-and-drop** image upload + file picker
- **Multi-turn conversations** with session tracking in MongoDB
- **Vendoo-focused**: system prompt optimized for Vendoo cross-listing (not per-marketplace)
- **Saved Prompts**: users create/edit/delete custom prompts, use them at a click
- **Copy button** on every assistant response for easy clipboard copy to Vendoo
- Streaming responses via SSE (real-time token delivery)
- Conversation history: list, view, delete previous chats
- Backend: `/api/ai/conversations` CRUD + `/api/ai/upload-image` + `/api/ai/conversations/{id}/messages` (SSE) + `/api/ai/prompts` CRUD
- User-scoped: employees only see their own conversations and prompts
- **Tested**: 32/32 backend tests passed, all frontend flows verified

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, served on port 3000
- **Backend**: FastAPI on port 8001, prefixed with /api
- **Database**: MongoDB
- **Video**: Daily.co (direct iframe embed)
- **Push**: Web Push (VAPID) + APNs (native iOS)
- **Storage**: Emergent Object Storage
- **AI**: Gemini via emergentintegrations (gemini-3-flash-preview), Emergent LLM Key

## Recent Changes (Feb 2026)
- **NEW**: AI Listing Assistant — floating Gemini-powered chat popup on employee dashboard with image upload, drag-and-drop, saved custom prompts, copy-to-clipboard, and click-outside-to-close
- Updated: Assistant focused on Vendoo cross-listing (removed per-marketplace quick actions)
- Added: Saved Prompts CRUD (create/edit/delete reusable prompts)
- Added: Copy button on assistant responses for easy paste into Vendoo
- Added: Click-outside backdrop to dismiss assistant popup
- Added: Quick Connect deep link button on Remote Sessions page
- Added: Quick Connect deep link button on Remote Sessions page
- Added: Auto-close stuck LIVE sessions when heartbeat reports no active connections
- Fixed: Heartbeat logging visibility in watcher logs
- Fixed: Video call invitee names displayed correctly
- Fixed: Web Push added to ALL clock-in/out paths
- Fixed: Remote session notification APNs/Web Push split into independent try/except blocks
- Fixed: Admin clock-in of employee now sends notifications
- Added: Employee notification opt-in toggle on dashboard

## Pending / Backlog
- P1: Verify push notification fixes in production after redeploy
- P1: Verify Daily call workflows end-to-end in production
- P1: Verify Quick Connect deep link on real iPhone/Mac
- P1: Verify stale session auto-close in production
- P2: Financial/Vendoo import production validation
- P2: Clean up React hook warnings in VideoCallsPage.jsx
- P3: GPS route matching (Mapbox)
- P3: eBay Browse API integration
