# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Build a "Thrifty Curator" reselling application wrapped for native iOS/Android using Capacitor. The app manages employee time tracking, consignment agreements, job applications, admin workflows, and business operations.

## Core Features

### Employee Portal
- Clock in/out with GPS tracking
- Time entry management
- W-9 document uploads
- Mileage tracking
- Password-based authentication

### Consignor Portal
- Direct consignment agreement submissions via "Sell With Us"
- Payment history with date filtering
- My Account overview
- Custom commission splits for item additions
- ~~Consignment Inquiry~~ (removed - streamlined flow)

### Admin Dashboard
- Team Management (employees)
- Payroll & Payments tracking
- Forms & Communications
- Reports & Operations
- Interview Scheduler (email-based)
- Soft Rejection workflow with "Keep on file" tracking
- Rejection History section
- Password Management for employees/consignors

### Mobile App (Capacitor)
- Native iOS and Android builds
- Push notifications via Firebase
- Biometric authentication
- Background GPS tracking

## User Personas
1. **Admin/Owner**: Matthew & Eunice Guzman - Full access to all features
2. **Employees**: Clock in/out, track time, submit W-9s
3. **Consignors**: Submit items, track payments, manage account

## Tech Stack
- Frontend: React with Tailwind CSS, Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- Mobile: Capacitor v8
- Email: Resend
- GPS: Transistorsoft Background Geolocation
- Payments: Stripe (requires user API key)
- Video Calls: Daily.co

## What's Been Implemented

### Completed Features
- Full employee time tracking with GPS
- Consignment agreement/inquiry forms
- Admin dashboard with all core sections
- Job application system with interview scheduling
- Email-based interview invitations and management
- Soft rejection workflow (pre & post-interview)
- Rejection history tracking
- Password reset via magic link emails
- First-time password setup prompts
- Payment history for consignors
- My Account section for consignors
- Admin password management
- Push notifications for admin alerts
- Payroll rounding fix (2026-06-12)
- GPS Mileage Tracking improvements (2026-06-12)
- Employee Training Section (2026-06-12)
- W-8BEN Tax Form Support
- Collapsible Tax Forms (2026-08-18)
- Splash Screen Optimization (2026-08-18)
- Enhanced Timezone Display for Interview Scheduling (2026-08-22)
- Admin Time Range Filter for Interview Scheduling (2026-08-22)
- Vendoo CSV Import Fix (2026-08-25)
- AnyDesk Remote Session Tracking (2026-09-01)
- Security Remediation (2026-09-01)
- AnyDesk Simplified to Shutdown/Restart (2026-09-02)
- Config Tab Removal (2026-09-02)
- Timekeeping Changes (2026-09-02)

### Daily.co Video Calls Integration (2026-09-03)
- **Backend**: Full video calls router at `/api/video-calls/` with:
  - Room creation (POST /rooms) with automatic Daily.co room provisioning
  - Room info lookup (GET /rooms/{room_name})
  - Meeting token generation for participant controls (POST /rooms/{room_name}/token)
  - Room ending with duration tracking (POST /rooms/{room_name}/end)
  - Worker-to-admin call request flow (POST /call-request)
  - Pending call request polling (GET /call-requests/pending)
  - Accept/decline call requests (POST /call-requests/{id}/accept|decline)
  - Call history (GET /history) and recordings (GET /recordings)
  - Interview booking auto-creates Daily room (POST /rooms/for-booking/{booking_id})
  - Graceful recording fallback when Daily.co plan doesn't support cloud recording
- **Frontend Video Call Room** (`/call/:roomName`):
  - Embedded Daily.co video with branded dark theme
  - Controls: mic, camera, screen share, optional recording toggle
  - Real-time participant count and call timer
  - Fullscreen toggle
  - Error handling and loading states
- **Frontend Video Calls Page** (`/video-calls`):
  - Active/History/Recordings tabs
  - Admin: "New Call" button for ad-hoc calls
  - Worker: "Request a Call" with admin selector and optional message
  - Active call cards with Join button
  - Call history with duration and participant info
- **Admin Header Integration**:
  - Video camera icon in admin dashboard header between Remote Sessions and Messages
  - Badge shows pending call request count with pulse animation
  - Polls every 30 seconds for new requests
- **Employee Dashboard Integration**:
  - "Calls" button in employee dashboard header navigation
- **Incoming Call Banner**:
  - Floating notification banner mounted globally in App.js
  - Shows caller name, message, and direct Accept/Decline/Dismiss buttons
  - Polls every 5 seconds for pending requests (admin only)
  - Animated entrance/exit with glass-morphism design
- **Interview Scheduler Integration**:
  - Auto-creates Daily.co room when interview is booked
  - Attaches video_call_url and video_call_daily_url to booking record
  - Manage Interview page shows "Join Video Interview" button
  - Google Meet remains as manual backup (admin can paste URL)
- **Collections**: `video_call_rooms`, `video_call_requests`
- **Testing**: 14/15 backend tests passed (93%), 100% frontend. Only failure: cloud recording API returns 400 (Daily.co account limitation, handled with graceful fallback)

### Recently Removed
- AI Reports Assistant (removed 2026-05-12 per user request)
- AI Training Video Generation (removed 2026-08 per user request)

## Technical Debt / Refactoring Needed
1. **CRITICAL**: `frontend/src/pages/ConsignmentAgreementForm.jsx` (~3850 lines)
2. **CRITICAL**: `frontend/src/components/admin/sections/ApplicantTestsSection.jsx` (~2500 lines)
3. **HIGH**: `frontend/src/components/admin/modals/FormSubmissionModal.jsx` (~1200 lines)

## Pending Verification
- GPS Tracking reliability on live devices
- Vendoo CSV import accuracy (requires production re-import)
- LIVE session status ending immediately on AnyDesk disconnect

## Upcoming Tasks (Priority Order)
1. Push notifications for incoming video call requests (FCM/APNs/Web Push)
2. Recording playback/download from Daily.co cloud (if account supports it)
3. Amazon Business Supplies quick links section
4. Android app submission guidance (`.aab` file)
5. Fast Shipping Labels with Pirate Ship integration
6. Auto-calculate 2026+ 1099s
7. Dynamic QR code update with `onelink.to`

## Known Issues
- Production vs Preview deployment confusion
- Modal CSS stacking context issues - use ReactDOM.createPortal for all new modals
- Daily.co cloud recording may not work depending on account plan

## Credentials
- Admin codes: `4399` (Matthew), `0826` (Eunice)
- Production URL: https://thrifty-curator.com
- Preview URL: https://curator-app-3.preview.emergentagent.com

## 3rd Party Integrations
- Capacitor v8
- Transistorsoft Background Geolocation
- Stripe (Payments) - requires user API key
- Resend (Emails) - configured
- Firebase (Push notifications for native apps) - configured
- Web Push (Safari PWA) - VAPID-based
- Daily.co (Video Calls) - configured with API key
