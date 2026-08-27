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
- **Enhanced Timezone Display for Interview Scheduling (2026-08-22)**:
  - Video interview applicants now see full CT date context including weekday (e.g., "Sun, Aug 24, 7:00 AM - 7:30 AM")
  - When PHT time crosses midnight in CT (e.g., Monday PHT morning = Sunday CT evening), a warning note appears
  - Both InterviewResponsePage.jsx (video) and SubmitAvailabilityPage.jsx (in-person) updated
  - New helper functions: formatCTRange(), sameCtDate(), convertPHTtoCTTimeOnly()
- **Admin Time Range Filter for Interview Scheduling (2026-08-22)**:
  - Added optional time range filter when inviting applicants for video interviews
  - Admin can enable/disable time range filter with checkbox
  - When enabled, admin specifies preferred CT time window (e.g., 6:00 AM - 10:00 PM)
  - Settings persist to localStorage for convenience
  - Time range info sent with interview invitation email data
- **Next Interview Highlight in View Schedule (2026-08-22)**:
  - The "View Schedule" modal in Interview Inbox now highlights the next upcoming interview
  - First future interview (by date/time) gets green styling with animated "NEXT" badge
  - Visual distinction: green background, ring border, shadow, and pulsing clock icon
  - Past interviews display normally without highlight
- **In-Person Interview Onboarding Exclusion (2026-08-22)**:
  - In-Person Interviews section now filters out onboarding applications
  - Only generic job applications appear in "Review Applications" tab
  - Onboarding applications (for adding someone to the system) remain separate
  - Full application details available via popup modal when clicking an application
- **Onboarding Email Simplification (2026-08-23)**:
  - Onboarding application "received" emails now use simplified content
  - Removed "what happens next" content as applicants already know the process
  - Email now shows simple "Application Received" confirmation with note about next email coming for login setup
- **Vendoo CSV Import Fix (2026-08-25)**:
  - Fixed critical bug where sold items were not being detected in analytics/summary
  - Issue: MongoDB regex queries `{"$regex": pattern, "$options": "i"}` weren't working with Motor 3.3.1/PyMongo 4.5.0
  - Solution: Created `iregex()` helper function using Python's `re.compile(pattern, re.IGNORECASE)`
  - Updated all 14 regex queries in `/app/backend/app/routers/inventory.py`
  - Now correctly shows 11,328 sold items with $359,772.88 gross revenue
  - Vendoo CSV headers with spaces (Cost of Goods, Marketplace Fees, etc.) parse correctly

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

### Interview Scheduling Preselect/Review Workflow (2026-08-20) - NEW
- **Bug Fixed**: CT (Central Time) conversion now displays correctly when admin selects specific 30-minute meeting time
- **Schedule (Review Later)**: Admin can save interview times as drafts without immediately sending confirmation email
- **Review Scheduled Summary**: Dedicated view showing all scheduled (draft) interviews with both PHT and CT times
- **Individual Send**: Admin can send confirmation email to one applicant at a time
- **Bulk Send All**: Admin can send all scheduled confirmations at once with one click
- **Backend Endpoints Added**:
  - `POST /api/applicant-tests/interview-inbox/{request_id}/schedule` - Save draft with PHT + CT times
  - `POST /api/applicant-tests/interview-inbox/{request_id}/send-scheduled` - Send confirmation for previously scheduled interview
- **Workflow**: Admin picks times → Schedule (saves draft) → Review all on one screen → Send individually or bulk

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

### In-Person Interview Scheduler Alignment with Video Call Flow (2026-08-21) - NEW
- **Full Feature Parity**: The in-person interview scheduler now matches the video call interview workflow
- **New Availability-Based Flow**:
  1. Admin sends availability request to applicant (instead of slot-based invite)
  2. Applicant receives email with link to submit their preferred availability windows
  3. Applicant submits availability via new `/submit-availability/:token` page
  4. Admin reviews responses in "Availability Inbox" tab
  5. Admin selects a 30-minute slot from applicant's availability
  6. Admin schedules as draft (Review Later) or sends confirmation immediately
- **New UI Components**:
  - "Availability Inbox" tab - shows pending, responded, scheduled, and confirmed interviews
  - "Send Invites" tab - "Request Availability" button instead of direct slot invites
  - Schedule modal with 30-minute slot selection grid showing both PHT and CT times
- **Backend Endpoints Added**:
  - `POST /api/interview-scheduler/admin/send-availability-request/{application_id}` - Send availability request email
  - `GET/POST /api/interview-scheduler/availability/{token}` - Applicant views/submits availability
  - `GET /api/interview-scheduler/admin/availability-inbox` - Get all availability requests
  - `POST /api/interview-scheduler/admin/availability-inbox/{request_id}/schedule` - Save draft schedule
  - `POST /api/interview-scheduler/admin/availability-inbox/{request_id}/unschedule` - Remove draft
  - `POST /api/interview-scheduler/admin/availability-inbox/{request_id}/send-confirmation` - Send confirmation email
  - `POST /api/interview-scheduler/admin/availability-inbox/{request_id}/send-message` - Request new times
  - `GET /api/interview-scheduler/admin/check-conflicts` - Check for time conflicts
- **MongoDB Collection**: `inperson_availability_requests` for storing availability submissions
- **Existing Production Data**: Not affected - old slot-based bookings preserved

### Send Application Link Feature (2026-08-21) - NEW
- **Purpose**: Send job application links directly from the app with customizable forms
- **Location**: Hiring section > "Send Application Link"
- **Email Templates**:
  - "Please Apply" - Generic invitation for new potential hires
  - "Onboarding" - Follow-up for candidates already in the hiring process
- **Customizable Required Fields**: Admin can toggle which fields applicants must fill out
- **Optional Phone with Alternative Contact**:
  - Phone number is now optional
  - Applicants can provide: Alternative Contact Name, Phone, and Reason
  - Useful for applicants without personal phones
- **Tracking**: Shows sent invites with status (Sent/Opened/Completed)
- **Application Review**: "Invited" badge shown on applications submitted via invite link
- **Backend Endpoints**:
  - `POST /api/admin/application-invites/send` - Send invite
  - `GET /api/admin/application-invites` - List sent invites
  - `GET /api/admin/email-pool` - Get email suggestions from existing contacts
  - `GET/POST /api/forms/application-invite/{token}` - Applicant views/submits application
- **MongoDB Collection**: `application_invites` for tracking sent invites
- **New Page**: `/apply/:token` - Invited application form with conditional fields

### Contractor Agreement & W-8BEN Updates (2026-08-23) - NEW
- **Simplified Payment Information**: Replaced Wise/E-Wallet toggle with unified payment fields
  - All fields are shown: Account Holder Name/Email, Wallet Provider, Wallet Number, Address, Country, Wise Tag
  - User fills in whichever fields apply to them (more flexible)
  - No required fields for payment - user chooses what to provide
- **W-8BEN Viewing Fix**: 
  - Fixed employee W-8BEN "View Document" - was using wrong API path (`/api/api/...` instead of `/api/...`)
  - Fixed admin W-8BEN viewing - now uses authenticated blob fetch instead of direct window.open
  - Both employee and admin can now properly view W-8BEN documents in new tab
- **Admin Agreement Review**: 
  - Updated payment info display to show all available fields
  - Print/PDF template updated with new payment field format
  - Agreement text is now properly returned from pending list endpoint

### Message Deletion Feature (2026-08-24) - NEW
- **Thread Deletion (Admin Only)**:
  - Soft-delete: Threads are hidden but recoverable (deleted_at, deleted_by fields)
  - Swipe-to-delete gesture on conversation list items (swipe right to reveal delete button)
  - Confirmation dialog required before thread deletion
  - Deleted conversations filtered from both admin list and employee/consignor views
- **Individual Message Deletion**:
  - Senders can only delete their own messages
  - Admin messages: Delete button appears on hover (left side of message)
  - Employee/consignor messages: Delete button on their own messages
  - Soft-delete with deleted_at field, messages filtered from responses
- **Backend Endpoints**:
  - `DELETE /api/conversations/admin/conversation/{id}` - Admin soft-deletes thread
  - `DELETE /api/conversations/admin/message/{conversation_id}/{message_id}` - Admin deletes own message
  - `DELETE /api/conversations/employee/message/{message_id}` - Employee deletes own message
  - `DELETE /api/conversations/consignor/message/{message_id}?email={email}` - Consignor deletes own message
- **UI Components**:
  - SwipeableConversationItem component with framer-motion drag gestures
  - Delete confirmation dialog with AlertTriangle icon and cancel/confirm buttons
  - "← Swipe right to delete a thread" hint text in conversation list

### Read Receipts Feature (2026-08-24) - NEW
- **Read Status Tracking**:
  - Backend sets `read_at` timestamp when messages are marked as read
  - Single checkmark (✓) = Message delivered
  - Double checkmark (✓✓) = Message read by recipient
- **Admin Toggle**:
  - Eye/eye-off icon in conversation header to enable/disable read receipts
  - Toggle state persists in localStorage (`admin_read_receipts_enabled`)
  - When disabled, checkmarks are hidden from admin's sent messages
- **Visual Indicators**:
  - Admin messages show read status with timestamp on hover ("Seen 5m ago")
  - Employee/consignor messages also show when admin has read them
  - Blue double checkmarks indicate read, gray single checkmark indicates delivered

### Messaging UX Improvements (2026-08-24) - NEW
- **Explicit "Read" Labels**:
  - Added visible "Read" and "Sent" text labels next to checkmark icons
  - Increased icon size from w-3.5 to w-4 for better visibility
  - Applied to ConversationsSection, AdminFullScreenMessaging, and MessagingSection
- **Notification Bell vs Messages Icon Separation**:
  - Bell (Alerts) now only shows non-message notifications (clock in/out, job apps, etc.)
  - Message-type notifications (employee_message, consignor_message, new_message) excluded from bell
  - Messages icon in header shows unread message count badge separately
  - This prevents duplicate message alerts and gives Messages its own dedicated indicator
- **Backend Changes**:
  - `/api/admin/notifications` now filters out message types from count and list
  - Mark-read and clear-all also exclude message types
  - Message unread counts handled separately by `/api/conversations/admin/unread-count`

### AnyDesk Remote Worker Setup (2026-08-27) - NEW
- **Remote Access Reversal**: Switched all RustDesk references back to AnyDesk per user request
- **Quick-Connect Button**: Added "Connect to Work Computer" button that opens AnyDesk app directly using `anydesk:` URI scheme
- **Password Security**: AnyDesk password is NOT displayed in the app - users enter the password provided during onboarding
- **Remote Work Setup Section** (visible only to `is_remote_worker: true` employees):
  - Step 1: Download AnyDesk button linking to anydesk.com/en/downloads
  - Step 2: Share Your AnyDesk Address (optional) - employee can share their ID with admin
  - Step 3: Quick-connect button + collapsible Manual Connection Details showing company AnyDesk ID with copy button
  - Important Tips section with connection guidelines
- **Files Updated**:
  - `frontend/src/pages/EmployeeDashboard.jsx` - AnyDesk section with quick-connect
  - `frontend/src/components/admin/sections/AllEmployeesSection.jsx` - Shows anydesk_address badge
  - `frontend/src/components/admin/sections/SendApplicationLinkSection.jsx` - "Include AnyDesk Instructions" option
  - `backend/app/routers/contractor_agreement.py` - Updated all agreement text from RustDesk to AnyDesk
- **Backend Endpoint**: `POST /api/time/employees/me/anydesk` - Employee shares their AnyDesk address
