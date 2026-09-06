# Thrifty Curator - Product Requirements Document

## Overview
Resale/consignment operations platform with employee/admin management, time tracking, remote session monitoring, financial reporting, interview scheduling, video calling, and mobile/native support.

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
- **Invitee names stored and displayed** - calls show "Call with [name]" not just creator
- Room docs store invitee_names and full participant_names

### Remote Session Monitoring (AnyDesk)
- Watcher service for Mac log monitoring
- Session events/heartbeats, shutdown/restart commands
- Auto clock-out on AnyDesk disconnect
- Notification silencing toggle (remote session notifications only)

### Financial Management
- CSV import (multiple formats including Vendoo)
- Financial summaries and reporting
- 1099/W-9/W-8BEN document management

### Messaging
- Admin-employee and admin-consignor chat
- Full-screen messaging modal, unread message badges

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, served on port 3000
- **Backend**: FastAPI on port 8001, prefixed with /api
- **Database**: MongoDB
- **Video**: Daily.co (direct iframe embed)
- **Push**: Web Push (VAPID) + APNs (native iOS)
- **Storage**: Emergent Object Storage

## Recent Changes (Feb 2026)
- Added: Quick Connect deep link button on Remote Sessions page - one tap opens AnyDesk and connects to work computer
- Admin configures work computer's AnyDesk address once via Quick Connect Setup modal
- Fixed: Video call invites now store and display invitee names correctly
- Fixed: "Call with [name]" shown instead of just creator name in all call lists
- Fixed: Web Push added to ALL clock-in/out paths (was missing, only APNs sent before)
- Fixed: Remote session notification APNs/Web Push split into independent try/except blocks
- Fixed: Admin clock-in of employee now sends notifications (had none before)
- Added: Employee notification opt-in toggle on dashboard

## Pending / Backlog
- P1: Verify push notification fixes in production after redeploy
- P1: Verify Daily call workflows end-to-end in production
- P2: Financial/Vendoo import production validation
- P2: Clean up React hook warnings in VideoCallsPage.jsx
- P3: GPS route matching (Mapbox)
- P3: LLM vision for product image/spec workflows
- P3: eBay Browse API integration
