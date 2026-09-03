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

### Video Calling (Daily.co)
- Admin-to-employee and employee-to-admin calls
- Shareable call links for external people
- Scheduled calls with date/time
- Call reminders before scheduled calls
- Direct iframe video call UI
- Role-based tabs: Admin (Active/Upcoming/History/Recordings), Employee (Active/History)
- Incoming call banner with accept/decline
- Optional recording (admin-only, off by default)
- Interview scheduler integration with Daily rooms

### Employee Notification Opt-In (Latest - Feb 2026)
- Persistent Notification Settings card on Employee Dashboard
- Shows current notification status (enabled/disabled/blocked/unsupported)
- Toggle switch to enable/disable Web Push notifications
- Full Web Push integration: VAPID key exchange → browser permission → push subscription → backend registration
- Unsubscribe flow: browser unsubscribe → backend cleanup
- Contextual help when notifications are blocked in browser settings
- Hidden in admin view of employee dashboard

### Remote Session Monitoring (AnyDesk)
- Watcher service for Mac log monitoring
- Session events/heartbeats
- Shutdown/restart commands
- Simplified model (no per-ID ACL enforcement)

### Financial Management
- CSV import (multiple formats including Vendoo)
- Financial summaries and reporting
- 1099 document management
- W-9 / W-8BEN upload and review

### Messaging
- Admin-employee chat
- Full-screen messaging modal
- Unread message badges

### Forms & Onboarding
- Job application forms
- Consignment agreements
- Contractor agreements with e-signature
- Payment info for remote workers (Remitly)

### PWA & Mobile
- Progressive Web App with install banner
- Capacitor native wrappers (iOS/Android)
- Pull-to-refresh
- Haptic feedback
- Service worker for push notifications

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, served on port 3000
- **Backend**: FastAPI on port 8001, prefixed with /api
- **Database**: MongoDB
- **Video**: Daily.co (direct iframe embed)
- **Push**: Web Push (VAPID) + APNs (native iOS)
- **Storage**: Emergent Object Storage for files/media

## Key Endpoints
- `/api/web-push/vapid-public-key` - Get VAPID public key (no auth)
- `/api/web-push/subscribe` - Register push subscription (POST, auth required)
- `/api/web-push/subscribe?endpoint=...` - Unsubscribe (DELETE, auth required)
- `/api/web-push/status` - Check subscription status (GET, auth required)
- `/api/video-calls/*` - Video call management
- `/api/time/*` - Time tracking
- `/api/auth/*` - Authentication

## Pending / Backlog
- P1: Verify Daily call workflows end-to-end in production
- P1: Recording availability depends on Daily.co account plan
- P2: Financial/Vendoo import production validation
- P2: Clean up React hook warnings in VideoCallsPage.jsx
- P2: Review call deletion authorization scoping
- P3: GPS route matching (Mapbox)
- P3: LLM vision for product image/spec workflows
- P3: eBay Browse API integration
