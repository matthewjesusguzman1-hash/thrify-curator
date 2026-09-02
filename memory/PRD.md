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

### AnyDesk Remote Session Tracking (2026-09-01) — UPDATED 2026-09-02
- **No AnyDesk API needed** (works on Solo tier): a Python watcher on the Mac host reads AnyDesk's local trace files (session starts/ends) and posts events to the backend.
- **Watcher** `/app/watcher/anydesk_session_watcher.py`: watchdog PollingObserver + 30s safety scan, macOS support (reads `/var/log/anydesk.trace`), fingerprint dedup, failed posts queued and retried. Config: `watcher_config.json` (backend_url, watcher_key, host_label). Setup: macOS Launch Agent.
- **Backend** `/app/backend/app/routers/remote_sessions.py`:
  - `POST /api/remote-sessions/log` — watcher auth via `X-Watcher-Key` header; batch events; dedup; end events matched to open sessions for duration. **Historical flood protection**: events >5min old are stored but skip notifications/auto-clock-out.
  - `GET /api/remote-sessions` — sessions with date/month/employee filtering, grouped by day, with clock-in/out time entry cross-reference for mapped employees.
  - `GET /api/remote-sessions/alerts` — historical cross-check flag notification history with date filtering.
  - `GET /api/remote-sessions/export` — CSV export of sessions with time entry data.
  - `GET /api/remote-sessions/cross-check` — live mismatch flags.
  - `POST /api/remote-sessions/map` — map AnyDesk ID to employee.
  - Collections: `anydesk_sessions`, `anydesk_session_events`, `anydesk_id_mappings`, `anydesk_flag_notifications`
- **Push Notifications**: Connect ("🖥️ Remote worker connected"), disconnect ("📴 Remote worker disconnected" with duration), rejected ("🚫 REJECTED"), auto clock-out ("⏹️ Auto clock-out"), cross-check flags. All skip for historical events.
- **Periodic cross-check**: Background task runs every 3 minutes (server.py) to catch "AnyDesk active ≥3min but not clocked in" and "clocked in but no session" flags. Deduped per hour per employee.
- **Auto Clock-Out**: When AnyDesk disconnects, mapped employee's open time entry is auto-closed with disconnect timestamp and badge.
- **Frontend** `/remote-sessions` page: Sessions + Alerts tabs, month/day navigation, sessions grouped by day with clock-in/out cross-reference, search, CSV export, worker assignment. Tested 21/21 backend + 100% frontend (iteration_56).

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

### AnyDesk Cross-Check + Session Alerts (2026-09-01) - UPDATED 2026-09-02
- **Session Alerts**: Connect + disconnect notifications for admins. Historical events (>5min old) skip notifications to prevent floods during log rescans.
- **Periodic background cross-check** (every 3 min via asyncio task in server.py): catches "AnyDesk active ≥3min but not clocked in" and "clocked in but no session" with 1-hour dedup.
- **Auto Clock-Out on AnyDesk Disconnect**: Open time entries auto-closed on disconnect (recent events only). Badge shown in Hours by Employee and Employee Dashboard.
- **Remote Sessions Reference Page (2026-09-02)**: Complete redesign with Sessions + Alerts tabs, month/day date navigation, sessions grouped by day with clock-in/out cross-reference, employee search, CSV export. Backend: date/month/employee filtering on all endpoints. Tested 21/21 backend + 100% frontend (iteration_56).
- **Block/Disconnect/Alerts (2026-09-02)**:
  - **Disconnect**: Red button on active sessions → queues command → watcher polls and kills AnyDesk via CLI (no auto-restart). Endpoints: POST /disconnect, GET/POST /watcher-commands, /watcher-commands/ack.
  - **Blocklist**: Block/unblock AnyDesk IDs. Blocked ID connecting → auto-disconnect command queued + critical alert in Alerts tab + urgent push. Reminder modal shows AnyDesk ACL instructions. Endpoints: POST /block, DELETE /block/{id}, GET /blocklist.
  - **Unmapped alerts**: Unknown AnyDesk IDs connecting stored as alert records in Alerts tab (1-hour dedup).
  - **Header badge**: Monitor icon shows red badge with 24h alert count or green badge with active session count.
  - Watcher updated: polls for commands every 10s, executes disconnect (pkill AnyDesk, no restart), checks blocked IDs on session detection.
  - Tested 13/13 backend + 100% frontend (iteration_57).
- **Alert Clearing + Mapping Management + ID Visibility (2026-09-02)**:
  - **Clear All Alerts**: Button on Alerts tab with confirmation, calls DELETE /api/remote-sessions/alerts with date/month params.
  - **Individual Alert Delete**: X button on each alert, calls DELETE /api/remote-sessions/alert/{dedup_key}.
  - **AnyDesk ID Always Visible**: Mono font badge shows AnyDesk ID on every session card, even when mapped to an employee name.
  - **Edit Mapping**: Clicking "edit" on a mapped session pre-fills the inline form with current worker name and employee.
  - **Remove Mapping**: Unlink icon + "Remove" button in form, calls DELETE /api/remote-sessions/map/{anydesk_id} to unassign employee.
  - **Watcher Command Ack**: Fixed empty endpoint body — now updates command status to completed/failed in DB.
  - Tested 16/16 backend + 100% frontend (iteration_58).
- **Silence Notifications Toggle (2026-09-02)**:
  - Bell icon in header toggles all AnyDesk push notifications on/off.
  - Stays silenced until manually resumed (no auto-expire).
  - Amber banner shown when silenced with quick "Resume" button.
  - Backend: `_is_silenced()` check in both `notify_admins_session_event` and `notify_admins_flag`.
  - Endpoints: GET /notification-status, POST /silence-notifications.
  - Stored in `anydesk_settings` collection.
  - Tested 7/7 backend + 100% frontend (iteration_59).
- **Disconnect + Auto-Block (2026-09-02)**:
  - **Disconnect** = emergency kick. Auto-blocks the user, kills AnyDesk (brief blip for all users), AnyDesk auto-restarts, blocked user can't reconnect. Confirmation warns: "ALL connections drop briefly."
  - **Block** = soft block. Adds to blocklist only. Current session stays active, no disruption to others. They can't reconnect once they disconnect. Confirmation warns: "Use Disconnect if you need them off immediately."
  - Both show AnyDesk ACL reminder modal after action.
  - Watcher simplified: just kills AnyDesk on disconnect, lets system service restart it; blocked IDs caught by `check_blocked_session` on reconnect.

### AnyDesk Phase 1 — Server Lockdown & UI (2026-09-02)
- **Server-side lockdown**: `_set_lockdown()`/`_is_lockdown()` stored in `anydesk_settings` collection. Survives watcher restarts.
- **Block** → renamed to "Shut Down & Block". Confirmation explicitly explains AnyDesk shuts down for ALL users until Restart. Issues `security_kill` command + sets server lockdown.
- **Unblock logic**: If blocklist becomes empty after unblock → auto-queues `restart_anydesk` + clears lockdown. If other IDs still blocked → lockdown stays, response lists remaining blocked IDs.
- **Manual Restart** → clears lockdown + queues `restart_anydesk` command.
- **Persistent lockdown banner**: Red banner shown when lockdown active, includes Restart AnyDesk button + blocked count.
- **Lockdown state in polling**: `GET /watcher-commands` returns `lockdown: true/false` for watcher.
- **Notification status**: `GET /notification-status` returns silenced + lockdown + blocked_count.
- **Allowlist wording fix**: Restart confirmation and block reminder modal updated to correctly describe AnyDesk ACL as an allowlist (listed IDs are ALLOWED; to block, remove from list).

### AnyDesk Phase 2 — Watcher Hardening & Config Report (2026-09-02)
- **Local LOCKDOWN_ACTIVE removed**: No global/module-level lockdown variable in watcher. Lockdown state sourced from server via `cfg["_server_lockdown"]` set during `poll_commands()`. Survives watcher restarts.
- **`enforce_lockdown(cfg)`**: Runs every 10s in main loop. Reads `cfg["_server_lockdown"]`; if true + AnyDesk running → kills it.
- **30-second cooldown**: `check_blocked_session()` uses 30s cooldown (was 5min). Still calls `execute_security_kill()` on first detection. During cooldown, returns True but `enforce_lockdown` keeps AnyDesk dead every 10s regardless.
- **Config metadata report**: `report_anydesk_config(cfg)` called once at watcher startup. Scans `~/.anydesk/user.conf`, `~/.anydesk/system.conf`, `/etc/anydesk/system.conf`, `/etc/anydesk/service.conf`. Reports file existence, writability, and setting key names only. Private key/hash/password names tagged `[REDACTED]`. NEVER sends values.
- **Backend config report**: `POST /watcher-config-report` (watcher-auth) receives and stores report. Server-side validation strips any `name=value` strings that leak through. `GET /config-report` (admin-auth) serves latest report.
- **Config tab in UI**: New third tab on Remote Sessions page. Shows per-file: existence, writability, setting names. ACL-related settings highlighted. Redacted settings shown in red. Safety note explaining no values transmitted.
- **Phase 3 deferred**: Config report provides data needed to decide if allowlist-based blocking is feasible. If ACL data is encoded or only in cached config, Phase 3 will not proceed.

#### Watcher changes requiring re-download (one bundled update):
1. `LOCKDOWN_ACTIVE` local variable removed → server-sourced lockdown
2. 5-minute cooldown → 30-second cooldown (still kills)
3. `report_anydesk_config(cfg)` added and called at startup

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
