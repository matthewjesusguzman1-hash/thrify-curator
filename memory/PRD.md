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
- Consignment agreement submissions
- Payment history with date filtering
- My Account overview
- Custom commission splits for item additions

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
- **Payroll rounding fix (2026-06-12)**: Updated payroll calculation to always round UP to the nearest minute (benefits employee). Fixed floating-point precision bug that caused 1-minute discrepancies. Admin payroll, Employee Dashboard, and Employee Portal View now all match.
- **GPS Mileage Tracking improvements (2026-06-12)**:
  - Added Kalman filter for GPS smoothing (reduces noise)
  - Dynamic accuracy thresholds based on movement speed and conditions
  - Better bounce-back detection (less aggressive, smarter)
  - Speed-based validation to catch GPS jumps
  - GPS quality indicator in UI (Excellent/Good/Fair/Poor)
  - Backend improvements with multi-pass filtering
- **Employee Training Section (2026-06-12)**:
  - 6-module training system based on resale photo instructions
  - AI video generation via Sora 2 (admin can generate videos)
  - Progress tracking per employee
  - Key points summary for each module
  - Videos auto-mark completion when watched
  - Available in Employee Dashboard
- **W-8BEN Tax Form Support**: Added W-8BEN form upload/management for foreign employees in both Employee Dashboard and Admin EditEmployeeModal
- **Collapsible Tax Forms (2026-08-18)**: W-9 and W-8BEN sections in Employee Dashboard now collapse/expand with chevron animation to save vertical space
- **Splash Screen Optimization (2026-08-18)**: Restored original animated blob design with GPU optimization hints (willChange, translateZ, backfaceVisibility) for smoother performance
- **Applicant Skills Tests Portrait Layout Fix (2026-08-18)**: Fixed responsive layout bug where View, Invite, and Delete buttons were cut off in portrait mode. TestCard component now stacks content vertically with action buttons in their own row below the card content. Header also made responsive with Create Test button going full-width on mobile.

### Recently Removed
- AI Reports Assistant (removed 2026-05-12 per user request)
- AI Training Video Generation (removed 2026-08 per user request - results were unsatisfactory)

## Technical Debt / Refactoring Needed
1. **CRITICAL**: `frontend/src/pages/ConsignmentAgreementForm.jsx` (~3850 lines) - Must be broken into smaller components
2. **CRITICAL**: `frontend/src/components/admin/sections/ApplicantTestsSection.jsx` (~2500 lines) - Needs decomposition into smaller components
3. **HIGH**: `frontend/src/components/admin/modals/FormSubmissionModal.jsx` (~1200 lines) - Needs refactoring

## Pending Verification
- GPS Tracking reliability on live devices
- Custom commission splits for item additions

## Upcoming Tasks (Priority Order)
1. Amazon Business Supplies quick links section
2. Android app submission guidance (`.aab` file)
3. Fast Shipping Labels with Pirate Ship integration
4. Auto-calculate 2026+ 1099s
5. Dynamic QR code update with `onelink.to`

## Known Issues
- Production vs Preview deployment confusion - user often tests live app without redeploying
- Modal CSS stacking context issues - use ReactDOM.createPortal for all new modals

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
- **Web Push (Safari PWA)** - NEW: VAPID-based push notifications for iOS home screen web apps (iOS 16.4+)

## Recent Updates (2026-08-19)

### Employee Terminations Section (NEW)
- Added dedicated "Employee Terminations" section in Team Management group of Admin Dashboard
- Features:
  - Active Employees list with "Terminate" buttons
  - Termination History with reason, date, and details
  - Termination reasons: Resignation, Performance, Misconduct, Layoff, Other
  - Confirmation flow requiring name entry to prevent accidents
  - Admin notes and final pay date tracking
  - Rehire capability (removes termination record, restores employee)
  - Terminated employees hidden from main employee list but preserved in database for payroll/tax purposes
- Backend: `/app/backend/app/routers/employee_terminations.py`
- Frontend: `/app/frontend/src/components/admin/sections/EmployeeTerminationsSection.jsx`

### Interview In-App Response Workflow (COMPLETED)
- Fixed API route ordering bug - `/interview-inbox` routes now before `/{test_id}` wildcard
- Applicants can submit availability via web form link instead of email reply
- Admin sees responses in "Interview Inbox" modal
- Admin can send meeting confirmation with Google Meet link and CT/PHT timezone
- Interview Response page: `/app/frontend/src/pages/InterviewResponsePage.jsx`

### Safari Web Push Notifications
- Implemented VAPID-based Web Push for Safari PWA (home screen bookmarked web app)
- Backend service: `/app/backend/app/services/web_push_service.py`
- Backend routes: `/app/backend/app/routers/web_push.py`
- Frontend component: `/app/frontend/src/components/WebPushSettings.jsx`
- Service worker updated with push event handlers: `/app/frontend/public/service-worker.js`
- Added `applicant_test_submission` notification type for when applicants complete skills tests
- WebPushSettings component appears in notification dropdown, shows instructions if not installed as PWA
- All in-app notification types now trigger both FCM (native) and Web Push (Safari PWA) notifications

### Preview Modal Safe Area Fix
- Fixed close button positioning in test preview modal to respect iOS safe area (status bar)
- Added `padding-top: max(env(safe-area-inset-top), 12px)` to modal header
