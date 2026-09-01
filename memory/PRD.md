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
- **Enhanced Timezone Display for Interview Scheduling (2026-08-22)**
- **Admin Time Range Filter for Interview Scheduling (2026-08-22)**
- **Next Interview Highlight in View Schedule (2026-08-22)**
- **In-Person Interview Onboarding Exclusion (2026-08-22)**
- **Onboarding Email Simplification (2026-08-23)**
- **Vendoo CSV Import Fix (2026-08-25)**

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

### Hours by Employee Modal Stacking Fixes (2026-09-01)
- **Bug 1**: Edit-shift modal opened BEHIND the View Shifts modal. Root cause: `TimeEntryModal` was not portaled and used `z-50`, while the shifts modal portals to `document.body` at `z-[9999]`. Fix: `TimeEntryModal` now portals to `document.body` at `z-[10050]` (its employee Select at `z-[10060]`), plus `max-h-[90vh] overflow-y-auto`.
- **Bug 2**: "Previous Pay Period" hard to select — the shadcn Select dropdown (default `z-50`) opened BEHIND the shifts modal. Fix: all `SelectContent` in `HoursByEmployeeSection` now use `z-[10000]`.
- Verified via Playwright: dropdown on top, previous period (Aug 17-30) displays shifts, edit modal on top.
- **Rule reminder**: any dropdown/modal opened from inside a `z-[9999]` portaled modal needs an explicit higher z-index.

### AnyDesk Remote Session Tracking (2026-09-01)
- **No AnyDesk API needed** (works on Solo tier): a Python watcher on the Windows host reads AnyDesk's local `connection_trace.txt` (session starts: timestamp, AnyDesk ID, alias, auth method) + best-effort session ENDs from `ad_svc.trace`/`ad.trace` for durations.
- **Watcher** `/app/watcher/anydesk_session_watcher.py`: watchdog PollingObserver + 30s safety scan, offset-based tail reading (no file locking), fingerprint dedup persisted in `watcher_state.json`, handles file truncation/recreation, failed posts queued in `failed_events.jsonl` and retried. First run starts at EOF (only new sessions). Config: `watcher_config.json` (backend_url, watcher_key, host_label). Setup guide: `/app/watcher/README_SETUP.md` (Task Scheduler + NSSM).
- **Backend** `/app/backend/app/routers/remote_sessions.py`:
  - `POST /api/remote-sessions/log` — auth via `X-Watcher-Key` header matching `ANYDESK_WATCHER_KEY` in backend .env; batch events; dedup by fingerprint; end events matched to latest open session (per host/ID) to compute duration_seconds
  - `GET /api/remote-sessions` (admin) — sessions newest-first with worker_name from `db.anydesk_id_mappings`
  - `POST /api/remote-sessions/map`, `GET /api/remote-sessions/mappings` (admin) — map AnyDesk ID → worker name
  - Collections: `anydesk_sessions`, `anydesk_session_events`, `anydesk_id_mappings`
- **Frontend (updated 2026-09-01 per user request)**: dedicated full page `/remote-sessions` (`RemoteSessionsPage.jsx`) — dark themed, search, All/Active filters, LIVE badge, assign-name inline, back to /admin. Opened from the admin header **Remote Sessions** button (Monitor icon) which REPLACED the "My Dashboard" person-icon link.

### Security Remediation (2026-09-01)
Full audit remediation, backend 28/28 tests passing (testing agent iteration_54):
1. **Brute-force lockout** (`app/services/security.py`): 5 failed attempts per identity per 15 min → 429 lockout.
2. **Admin codes moved to env** `ADMIN_OWNER_CODES` in backend .env (still 4 digits per user choice); constant-time comparison.
3. **Consignor magic-link auth**: 30-min single-use token, 7-day consignor JWT.
4. **Protected consignor endpoints** (previously public by email).
5. **Debug endpoints admin-only**.
6. **Regex injection fixed**.
7. **bcrypt migration**: employee passwords rehash transparently from legacy sha256.
8. **CORS restricted** to explicit origins.

### AnyDesk Cross-Check + Session Alerts (2026-09-01) - UPDATED
- **Session Alerts**: on every new session_start posted by the watcher, admins get APNs + web push ("🖥️ Remote worker connected" / "🚫 Remote connection REJECTED"), tap-through URL /remote-sessions. Implemented via `notify_admins_session_event()` in remote_sessions.py.
- **Hours Cross-Check** `GET /api/remote-sessions/cross-check` (admin):
  - `clocked_in_no_session` (warning): open time entry NOT `admin_clocked`, employee mapped to AnyDesk ID(s), no active session → flag. Admin-clocked entries never flag (rule per user).
  - `session_no_clock_in` (alert): active session ≥3 min (GRACE_MINUTES constant, reduced from 5) for a mapped employee with no open clock-in.
  - `unmapped_active_session` (info): active session from unmapped AnyDesk ID.
  - Active = ended_at null AND started within 12h (staleness guard) AND not REJECTED.
- **Auto Clock-Out on AnyDesk Disconnect (2026-09-01)**: When watcher posts a session_end event, the system looks up the mapped employee. If they have an open time entry, it's automatically closed with clock_out = disconnect timestamp, `anydesk_auto_clocked_out: true`, and note "Auto-closed by AnyDesk disconnect at {timestamp}". Hours are calculated using the same rounding logic as normal clock-outs. Admins are push-notified.
- **Flag Push Notifications (2026-09-01)**: Cross-check mismatches now trigger admin push notifications (both APNs + web push) for BOTH directions: "clocked in no session" and "session no clock-in". A 1-hour dedup prevents repeated alerts for the same flag type + employee. Dedup records stored in `anydesk_flag_notifications` collection. Notifications fire on every session_start event (checking for missed clock-ins) and auto clock-out fires on every session_end.
- Mapping now supports `employee_id` (+email) — required for cross-checks; page has employee dropdown in Assign name UI (`page-worker-employee-select`).
- **Watcher timestamps now converted to UTC** (`local_to_utc_iso`) since AnyDesk logs use PC-local time; critical for the 3-min comparisons.
- Frontend: flags banner (red/amber/blue) atop /remote-sessions page (`cross-check-flags`, `flag-{type}` testids), header shows "N active now". HoursByEmployeeSection and EmployeeDashboard show "AnyDesk Auto-Out" badge on auto-clocked entries.
- Tested: all scenarios pass (9/9 backend tests, frontend verified). See `/app/test_reports/iteration_55.json`.

## 3rd Party Integrations
- Capacitor v8
- Transistorsoft Background Geolocation
- Stripe (Payments) - requires user API key
- Resend (Emails) - configured
- Firebase (Push notifications for native apps) - configured
- **Web Push (Safari PWA)** - VAPID-based push notifications for iOS home screen web apps (iOS 16.4+)

## Recent Updates (2026-08-19)

### Employee Terminations Section
- Added dedicated "Employee Terminations" section in Team Management group of Admin Dashboard
- Backend: `/app/backend/app/routers/employee_terminations.py`
- Frontend: `/app/frontend/src/components/admin/sections/EmployeeTerminationsSection.jsx`

### Interview In-App Response Workflow (COMPLETED)
- Fixed API route ordering bug
- Applicants can submit availability via web form link
- Admin sees responses in "Interview Inbox" modal

### Interview Scheduling Preselect/Review Workflow (2026-08-20)
- Schedule (Review Later), Review Scheduled Summary, Individual Send, Bulk Send All

### Safari Web Push Notifications
- VAPID-based Web Push for Safari PWA (home screen bookmarked web app)

### In-Person Interview Scheduler Alignment with Video Call Flow (2026-08-21)
- Full Feature Parity with video call interview workflow

### Send Application Link Feature (2026-08-21)
- Send job application links directly from the app with customizable forms

### Contractor Agreement & W-8BEN Updates (2026-08-23)
- Simplified Payment Information, W-8BEN Viewing Fix

### Message Deletion Feature (2026-08-24)
- Thread Deletion (Admin Only), Individual Message Deletion

### Read Receipts Feature (2026-08-24)
- Read Status Tracking with checkmarks

### Messaging UX Improvements (2026-08-24)
- Explicit "Read" Labels, Notification Bell vs Messages Icon Separation

### AnyDesk Remote Worker Setup (2026-08-27)
- Quick-Connect Button, Password Security, Remote Work Setup Section

### Admin-to-Admin Message Notifications (2026-08-29) - UPDATED 2026-08-30
- Cross-Admin Notifications, Per-Admin Unread Count

### Payment Records Auto-fill (2026-08-31)
- Auto-fill amount field with owed amount when selecting employee

### Pay Period Date Fix & Remote Worker Timezone Toggle (2026-08-31)
- Fixed timezone conversion, Added CT/PHT toggle for remote workers

### Message Attachment Display Fix (2026-08-31)
- Fixed CSS rule hiding attachment URLs containing "emergent"

### Admin-to-Admin Push Notification Fix (2026-09-01)
- Fixed web-push query field (role vs user_type), removed early return

### Durable Object Storage Migration (2026-09-01)
- All file uploads migrated from pod-local disk to Emergent Object Storage
