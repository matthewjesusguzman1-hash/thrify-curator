# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Build a "Thrifty Curator" reselling application with:
- Landing page with logo, links to selling platforms (eBay, Poshmark, Mercari, Depop, Facebook Marketplace)
- Connect section (TikTok, Facebook Page, Message Me email)
- QR code (above share button) and Share button
- Two-column layout on landing page to reduce scrolling
- Three forms: Job Application, Consignment Inquiry, Consignment Agreement
- Passwordless JWT authentication (email only, 24-hour sessions)
- Admin dashboard (matthewjesusguzman1@gmail.com) - add/remove employees, run shift reports, edit employee hours
- Employee dashboard - clock in/out, view own hours
- In-app + email notifications when employees clock in/out
- Admin interface to view and manage form submissions

## User Personas
1. **Customers** - Browse platform links, submit consignment inquiries
2. **Job Seekers** - Submit job applications
3. **Employees** - Clock in/out, track work hours (passwordless email login)
4. **Admin** - Manage employees, view shift reports, edit hours, receive notifications, manage form submissions (matthewjesusguzman1@gmail.com)

## Core Requirements (Static)
- Landing page with logo, two-column grid layout
- Links to eBay, Poshmark, Mercari, Depop, Facebook Marketplace
- Connect section: TikTok, Facebook Page, Message Me (email)
- QR code displayed above share button
- Share app functionality
- Job Application form (address, skills checklist, background check, transportation)
- Consignment Inquiry form (brands, clothing types, environment, image upload)
- Consignment Agreement form (legal terms, signature, date)
- Passwordless JWT authentication (email only)
- 24-hour persistent login sessions
- Clock in/out functionality
- Hours tracking dashboard
- Admin dashboard with employee management and reports
- Admin ability to edit/delete employee time entries
- In-app notifications for admin (clock in/out)
- Email notifications via Resend (requires API key)
- Admin form submissions management (view, update status, delete)

## What's Been Implemented (Dec 2025 - Feb 2026)
- [x] Landing page with Thrifty Curator logo
- [x] Two-column grid layout (Shop/Connect on left, Forms/Employee on right)
- [x] All 5 platform links with actual store URLs
- [x] Custom platform logos (eBay, Mercari, Depop, Facebook)
- [x] Connect links: TikTok, Facebook Page, Message Me (email)
- [x] Custom social logos (TikTok, Facebook)
- [x] QR code above share button
- [x] Native share API integration
- [x] Job Application form with all required fields
- [x] Consignment Inquiry form with brand list, clothing types, image upload
- [x] Consignment Agreement form with e-signature
- [x] All forms styled with "Black Bold" theme
- [x] Passwordless JWT authentication (email only, no passwords)
- [x] 24-hour session persistence
- [x] Employee clock in/out with real-time timer
- [x] Multiple clock in/out sessions per day (consolidated into one shift)
- [x] Pay period summary with hours, shifts, and estimated pay
- [x] Hours summary (weekly, total, shifts)
- [x] Admin dashboard: add/remove employees, shift reports with date range filters
- [x] Pre-seeded admin account (matthewjesusguzman1@gmail.com)
- [x] In-app notifications for admin (clock in/out events)
- [x] Admin can edit employee time entries (clock in/out times)
- [x] Admin can delete employee time entries
- [x] Auto-calculation of total hours when editing
- [x] Admin can create manual time entries for employees (retroactive/off-site work)
- [x] Biweekly work period tracker with payroll reports
- [x] Payroll reports: biweekly, monthly, yearly, or custom date range
- [x] PDF export for payroll reports
- [x] Hourly rate configuration and wage calculations
- [x] Configurable pay period start date
- [x] Individual hourly rates per employee (inline editing in employees table)
- [x] Payroll reports use individual rates with fallback to default
- [x] Star indicator for employees with custom rates in reports
- [x] Remove Employee button at top for quick removal
- [x] Clickable employee names to view details modal
- [x] Employee Details modal with email, rate, join date, total hours, recent shifts
- [x] Quick actions in details: Edit Rate, Add Shift, Delete employee
- [x] Edit shifts directly from employee details modal
- [x] Edit Employee button in header (next to Remove Employee)
- [x] Edit Employee modal: name, email, role, and hourly rate editing
- [x] Role change support (Employee ↔ Admin)
- [x] "Black Bold" UI redesign with dark gradient background and vibrant accents
- [x] Email reports functionality (send shift/payroll reports via Resend)
- [x] PWA support with app manifest
- [x] Splash screen on mobile app launch
- [x] Home screen icon support (iOS/Android)
- [x] Reusable admin components (StatCard, EmployeeTable, Modals, NotificationBell)
- [x] **Form Submissions Management** (Feb 23, 2026):
  - Collapsible section in Admin Dashboard
  - Three tabs: Job Applications, Consignment Inquiries, Consignment Agreements
  - Table view with Name, Email, Phone/Item Types/Percentage, Submitted date, Status, Actions
  - View details modal with all submission fields
  - Status update (New, Reviewed, Contacted, Archived)
  - Delete submissions functionality
  - Refresh button to reload data
  - Summary showing total submissions and new count
- [x] **Backend Refactoring** (Feb 23, 2026):
  - Refactored monolithic server.py (1946 lines) into modular structure
  - Created `/app/backend/app/` with routers, models, services
  - All 18 API tests pass (100%)
- [x] **Frontend Components Refactoring** (Feb 23, 2026):
  - Created reusable components in `/app/frontend/src/components/admin/`
  - PayrollSummaryCard, EmployeePortalModal, EmployeeShiftsModal, SortableTableHeader
- [x] **Admin Dashboard Improvements** (Feb 23, 2026):
  - Reordered sections: All Employees → Payroll Summary → Recent Time Entries → Hours by Employee → Form Submissions
  - Form Submissions auto-refreshes on page load
  - W-9 document upload/download functionality for each employee
  - W-9 stored in MongoDB as base64-encoded content

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI, MongoDB
- Auth: Passwordless JWT (email only, 24-hour expiry)
- Email: Resend (configured, requires API key for production)

## Architecture (Updated Feb 23, 2026 - REFACTORED)
```
/app/
├── backend/
│   ├── server.py              # FastAPI entry point (minimal, ~50 lines)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Environment configuration
│   │   ├── database.py        # MongoDB connection
│   │   ├── dependencies.py    # Auth helpers (JWT, get_current_user)
│   │   ├── models/
│   │   │   ├── user.py        # User models
│   │   │   ├── time_entry.py  # Time entry models
│   │   │   ├── notifications.py
│   │   │   ├── forms.py       # Form submission models
│   │   │   └── payroll.py     # Payroll models
│   │   ├── routers/
│   │   │   ├── auth.py        # Auth routes (/api/auth/*)
│   │   │   ├── time_tracking.py # Time routes (/api/time/*)
│   │   │   ├── admin.py       # Admin routes (/api/admin/*)
│   │   │   ├── notifications.py # Notification routes
│   │   │   ├── payroll.py     # Payroll routes (/api/admin/payroll/*)
│   │   │   └── forms.py       # Form routes (/api/forms/*, /api/admin/forms/*)
│   │   └── services/
│   │       ├── email.py       # Email notification helpers
│   │       └── helpers.py     # Period calculation helpers
│   └── tests/                 # pytest tests for API
└── frontend/src/
    ├── components/
    │   ├── admin/             # Reusable admin components (NEW)
    │   │   ├── PayrollSummaryCard.jsx
    │   │   ├── EmployeePortalModal.jsx
    │   │   ├── EmployeeShiftsModal.jsx
    │   │   ├── SortableTableHeader.jsx
    │   │   └── index.js
    │   ├── ui/                # Shadcn UI components
    │   └── SplashScreen.jsx
    ├── pages/
    │   ├── LandingPage.jsx        # Two-column layout with Black Bold theme
    │   ├── AuthPage.jsx           # Passwordless login (with admin code 4399)
    │   ├── AdminDashboard.jsx     # Admin features + notifications + form submissions
    │   ├── EmployeeDashboard.jsx  # Employee clock in/out with pay period
    │   ├── JobApplicationForm.jsx
    │   ├── ConsignmentInquiryForm.jsx
    │   └── ConsignmentAgreementForm.jsx
    └── App.js                     # Router with splash screen
```

## Key API Endpoints
- `POST /api/auth/login` - Passwordless login
- `POST /api/time/clock` - Clock in/out (triggers notifications)
- `GET /api/admin/notifications` - Get admin notifications
- `POST /api/admin/notifications/mark-read` - Mark notifications as read
- `POST /api/admin/time-entries` - Create manual time entry
- `PUT /api/admin/time-entries/{id}` - Edit time entry
- `DELETE /api/admin/time-entries/{id}` - Delete time entry
- `POST /api/admin/reports` - Generate shift reports
- `GET /api/admin/payroll/settings` - Get payroll settings
- `PUT /api/admin/payroll/settings` - Update payroll settings
- `POST /api/admin/payroll/report` - Generate payroll report (JSON)
- `POST /api/admin/payroll/report/pdf` - Generate payroll report (PDF)
- `PUT /api/admin/employees/{id}/rate` - Update employee hourly rate
- `PUT /api/admin/employees/{id}` - Update employee details (name, email, role)
- `GET /api/admin/forms/summary` - Get form submissions summary (counts)
- `GET /api/admin/forms/job-applications` - Get all job applications
- `GET /api/admin/forms/consignment-inquiries` - Get all consignment inquiries
- `GET /api/admin/forms/consignment-agreements` - Get all consignment agreements
- `PUT /api/admin/forms/{type}/{id}/status` - Update submission status
- `DELETE /api/admin/forms/{type}/{id}` - Delete submission

## Key Credentials
- **Admin Email**: matthewjesusguzman1@gmail.com (no password needed)

## Prioritized Backlog
### P0 (Critical)
- [x] Form Submissions Management ✅ (Feb 23, 2026)
- [x] Notification Dropdown Readability Fix ✅ (Feb 23, 2026)
  - Fixed CSS inheritance issue causing white text on white background
  - Added targeted CSS selectors to override inherited dashboard-header styles
  - Notification messages, timestamps, and badges now clearly visible
- [x] Admin Dashboard UI Improvements ✅ (Feb 23, 2026)
  - Fixed header visibility (white-on-white contrast issue)
  - Added solid dark gradient background to header with cyan accent border
  - Made notification "Alerts" button more readable
  - Fixed "Run Report" button styling with darker gradient + cyan border
  - All sections now collapse by default when dashboard opens
  - Replaced "Overview Stats" with "Payroll Summary" showing:
    - Current Pay Period payroll amount + hours + date range
    - Month total payroll
    - Year total payroll
  - Added new backend endpoint: GET /api/admin/payroll/summary
- [x] Login Page Theme Update ✅ (Feb 23, 2026)
  - Updated Employee Portal login to match home screen dark gradient theme
  - Added glassmorphic card design with logo
  - Added admin code "4399" as alternative to admin email for login
- [ ] Refactoring backend/frontend (server.py 2000+ lines, AdminDashboard.jsx 2500+ lines)

### P1 (High Priority)
- Add Resend API key for email notifications to work in production
- Deploy the application
- Employee schedule/shift management

### P2 (Medium Priority)
- Export hours to CSV/PDF
- Multi-location support
- Inventory integration with platforms

## Next Tasks
1. **Refactor backend/server.py** - Break into modular structure (routers, models, services)
2. **Refactor AdminDashboard.jsx** - Decompose into smaller components
3. Deploy the application
4. Configure Resend API key for production email notifications

## Testing Status
- Backend: 100% pass (93 tests + 16 form submission tests)
- Frontend: 100% pass (12 form submission tests)
- Test reports: `/app/test_reports/`
- Test files: `/app/backend/tests/`

## Recent Updates (Feb 23, 2026)
- **Phone Number Support for Employees**: Added phone number field throughout the employee management system
  - New "Phone" column in All Employees table (sortable)
  - Phone field in "Add Employee" modal - can be imported from job applications
  - Phone field in "Edit Employee" modal - editable with placeholder formatting
  - Backend updated to store and retrieve phone numbers
  - Job application import now includes phone number

- **Collapsible Payroll Check Records**: Made check records collapsible for easier navigation
  - Each record shows as a collapsed row with thumbnail, name, date, and amount
  - Click to expand and see full image and details
  - "Expand All" / "Collapse All" button to toggle all records at once
  - Action buttons (view, edit, delete) visible in collapsed state

- **W-9 Corrections Handling Fix**: When employee resubmits corrected W-9, rejection reason is cleared
  - Previously the rejection_reason field persisted after resubmission
  - Now properly clears when status changes to pending_review

- **Employee Pay Period Sync Fix**: Fixed employee portal pay period calculation to match admin dashboard
  - Now uses the same `pay_period_start_date` from settings as admin
  - Uses the shared `get_biweekly_period` helper function for consistency
  - Fixed timezone comparison bug that was excluding entries on the last day of pay period
  - Employee estimated pay now correctly calculated based on all hours in the pay period

- **Search & Navigation Enhancements**:
  - **Payroll Check Records Search**: Added search bar to filter records by employee name, description, date, or amount
  - **Form Submissions Search & Filter**: Added search by name/email/phone and status filter dropdown (All, New, Reviewed, Contacted, Archived)
  - Both sections now show "Showing X of Y" count indicators
  - Clear button appears when filters are active

- **Payroll Check Records Submit & Edit Feature**: Enhanced the payroll check records workflow
  - Added two-step process: select image first, then fill details and click Submit
  - Image preview shows before submission with ability to remove/change
  - Added Edit functionality - click pencil icon on any record to modify its details
  - Backend PUT endpoint added for updating existing records
  - Records can be updated with or without changing the image

- **Payroll Check Records Auto-Refresh**: Added auto-refresh for Payroll Check Records section on page load
  - Records count now displays immediately when admin dashboard loads
  - No need to manually expand section to see count
  - Implemented via dedicated useEffect hook after fetchCheckRecords definition

- **Form Submissions UI**: Added admin interface to view and manage all form submissions
  - Collapsible section at bottom of Admin Dashboard
  - Three tabs for different form types
  - View details modal with status update buttons
  - Delete functionality with confirmation
  - 100% test coverage (backend and frontend)

## Recent Updates (Dec 2025)
- **Consignment Agreement 50/50 Clause**: Added default profit split clause to Terms & Conditions
  - Updated first bullet point to include: "Unless otherwise specified on this form, the profit split will be considered 50/50."
  - Provides legal clarity for consignment arrangements

## Notes
- **Email functionality REMOVED**: Reports now use downloadable PDFs instead of email delivery
- PDF generation uses fpdf2 library
- Individual employee rates shown with ★ indicator in payroll reports
- Minor React hydration warning in console (cosmetic, does not affect functionality)
- **REFACTORING IN PROGRESS**: AdminDashboard.jsx has been reduced from 6787 lines to ~5850 lines by extracting MileageTrackingSection. Further refactoring is planned.

## Recent Updates (Feb 23, 2026 - Session 4)

### Multi-Admin Code Support
- **Added Eunice Guzman as admin**: Email `euniceguzman@thriftycurator.com`, code `0826`
- **Updated AuthPage**: Now supports multiple admin codes via `ADMIN_CODES` object
- Both codes work: `4399` (Matthew) and `0826` (Eunice)

### UI/UX Fixes
- **Notification Dropdown**: Fixed off-screen issue in portrait/mobile mode
  - Uses fixed positioning on mobile, absolute on desktop
  - Dropdown now 100% visible on all screen sizes
- **Admin Dashboard Top Buttons**: Cleaned up layout
  - Single row with consistent button sizing: $, Add, Edit, Report, Remove
  - Icons show on all screens, labels hidden on mobile
- **Modal Close Buttons**: Added Close button at bottom of Report and Payroll modals
  - All modals have: X button (top right), Cancel/Close button (bottom), click-outside-to-close

### W-9 Viewing Bug Fixed
- **W-9 View Button**: Now opens W-9 Viewer Modal instead of forcing download
- Modal displays PDF in iframe with filename, upload date, and approval status
- Download button available in modal footer for users who want to save the file

### Report Download Functionality (Replaced Email)
- **Removed Email Report buttons** (was blocked on Resend API key)
- **Added Download PDF buttons** for both Shift Report and Payroll Report
- **New API endpoint**: `POST /api/admin/reports/pdf` generates shift report PDFs
- PDF includes period, summary stats, and employee breakdown table
- fpdf2 library installed for PDF generation

### Refactoring Progress
- AdminDashboard.jsx reduced from 6787 lines to ~5870 lines
- MileageTrackingSection component extracted and working
- Removed unused email-related state variables and imports

### Files Changed
- Modified: `/app/frontend/src/pages/AuthPage.jsx` - Multi-admin code support
- Modified: `/app/frontend/src/pages/AdminDashboard.jsx` - UI fixes, modal improvements
- Modified: `/app/backend/app/routers/admin.py` - Added /reports/pdf endpoint
- Updated: `/app/backend/requirements.txt` - Added fpdf2

## Recent Updates (Feb 23, 2026 - Session 3)

### Refactoring Completed
- **MileageTrackingSection Extraction**: Successfully extracted the entire mileage tracking feature (~900 lines) into a standalone component at `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx`
- AdminDashboard.jsx reduced from 6787 lines to 5880 lines
- All tests pass (17 backend API tests, full frontend verification)
- No regressions introduced
- Features preserved:
  - Section expand/collapse animation
  - GPS trip tracking with Start Trip button
  - Manual mileage entry form with all fields
  - Purpose dropdown (thrifting, post_office, other)
  - CSV and PDF export with IRS deduction calculations
  - Recent trips list with edit/delete actions
  - Summary cards (Total Miles, Total Trips, IRS Rate, Est. Deduction)

### Files Changed
- Modified: `/app/frontend/src/pages/AdminDashboard.jsx` - Removed mileage state/functions/JSX, added import
- Created: `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx` - Self-contained mileage component
- Modified: `/app/frontend/src/components/admin/index.js` - Added export for MileageTrackingSection

## Recent Updates (Feb 23, 2026 - Session 2)

### Bug Fixes Verified
- **View Employee Portal Modal**: Now correctly shows pay period dates and hour calculations matching admin dashboard
- **Pay Period Settings Pre-fill**: Start Date input now pre-fills with the active pay period start date

### New Features Implemented

- **Enhanced Payroll Summary Display (Task 1)**:
  - Current Pay Period prominently displayed with calendar icon
  - Shows date range: "Feb 18 - Mar 3, 2026" format
  - Hours tracked counter: "11.3 hrs tracked"
  - Pay Period Settings section with Start Date input below the display
  - More intuitive UI layout for payroll management

- **Mileage Tracking for Tax Purposes (Task 2)**:
  - New "Mileage Tracking" collapsible section in Admin Dashboard
  - **GPS Auto-Tracking**:
    - "Start Trip" button initiates browser geolocation tracking
    - Real-time location updates during trip
    - "End Trip" button to complete and save the trip
    - "Cancel" option to discard tracking
  - **Manual Entry**:
    - Form with Date, Start Location, End Location, Total Miles
    - Purpose dropdown: Thrifting, Post Office, Other (with custom input)
    - Optional notes field
  - **Summary Cards**:
    - Total Miles (This Year)
    - Total Trips count
    - IRS Rate ($0.67/mile for 2024)
    - Estimated Tax Deduction
  - **Recent Trips List**:
    - Purpose badges with color coding (purple for Thrifting, blue for Post Office)
    - From/To addresses
    - Miles count
    - Edit and Delete buttons for each entry
  - Backend API: `/api/admin/mileage/*` endpoints for full CRUD

### New Files Created
- `/app/backend/app/models/mileage.py` - Pydantic models for mileage tracking
- `/app/backend/app/routers/mileage.py` - All mileage API endpoints

### Testing Status
- All 14 backend API tests pass (100%)
- All frontend features verified working
- Test report: `/app/test_reports/iteration_11.json`

### Additional Updates (Feb 23, 2026 - Continued)

- **IRS Mileage Rate Updated**: Changed from $0.67 (2024) to $0.725 (2026) per mile
- **Mileage Export Feature**:
  - Export CSV button - generates IRS-ready CSV with all trip details
  - Export PDF button - generates professional PDF mileage log for tax filing
  - Both exports include: Date, Start/End locations, Miles, Purpose, Deduction amounts
  - Summary section with total miles, IRS rate, and total deduction
- **Pay Period Preview**: When selecting a pay period start date, a preview box now shows:
  - The biweekly date range that will result from that start date
  - Period number (e.g., "Period #3")
  - Updates dynamically as the date is changed

## Recent Updates (Feb 23, 2026 - Session 5)

### Bug Fixes

- **P0: Payroll Summary Section Error (FIXED)**:
  - **Root Cause**: Missing `Save` icon import from lucide-react
  - **Fix**: Added `Save` to the import statement in AdminDashboard.jsx (line 49)
  - **Verified**: Section now expands without JavaScript errors, showing Current Pay Period ($225.00, 11.3 hrs), Month Total ($225.00), and Year Total ($225.00)

- **P0: Mileage Report PDF Viewer Broken (FIXED)**:
  - **Issue**: Download button missing, X exit button not visible on mobile
  - **Fix**: Updated MileageTrackingSection.jsx (lines 1070-1260):
    - X close button now has gray background (`bg-gray-100`) making it clearly visible
    - Modal header is sticky on report preview view
    - Download button moved to sticky footer - always visible on all screen sizes
    - Responsive padding/sizing for mobile viewports
  - **Verified**: Tested on both desktop (1920x1080) and mobile (390x844) viewports

### Test Report
- `/app/test_reports/iteration_15.json` - All bug fixes verified
- Success rate: 100% frontend

### Files Changed
- Modified: `/app/frontend/src/pages/AdminDashboard.jsx` - Added `Save` to lucide-react imports
- Modified: `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx` - Improved report modal mobile UX

### Refactoring: PayrollCheckRecordsSection Extraction (COMPLETED)

- **Extracted**: PayrollCheckRecordsSection from AdminDashboard.jsx to standalone component
- **New Component**: `/app/frontend/src/components/admin/sections/PayrollCheckRecordsSection.jsx` (703 lines)
- **AdminDashboard.jsx reduced**: From 6030 lines to 5333 lines (~700 lines removed)
- **Features preserved**:
  - Upload check photos with preview
  - Employee name, check date, amount, description fields
  - View/Edit/Delete functionality for records
  - Search and filter records
  - Expand/Collapse individual records
  - Full image viewer modal
- **Test Report**: `/app/test_reports/iteration_17.json` - All features verified working

### W-9 Viewing Bug Investigation

- **Status**: NOT REPRODUCIBLE (Feb 23, 2026)
- **Testing Result**: W-9 Viewer Modal opens correctly without forcing download
- **Tested**: Lisa Martinez and James Wilson W-9s - both display in iframe correctly
- **Modal Features**: Close button, Download button, PDF preview all functional
- **Test Report**: `/app/test_reports/iteration_16.json`


## Recent Updates (Feb 23, 2026 - Session 6)

### UI/UX Improvements

- **Mobile Header Button Alignment (COMPLETED)**:
  - **Issue**: User requested header buttons (Payroll, Add, Edit, Remove, Shift Report, Start Trip) to be right-aligned on mobile view
  - **Fix**: Updated AdminDashboard.jsx header section:
    - Changed parent container from `items-start` to `items-end` for mobile
    - Added `text-left` and `w-full sm:w-auto` to title for proper alignment
    - Buttons container now uses `items-start` without flex-wrap for cleaner alignment
  - **Result**: On mobile, "Admin Dashboard" title stays left, all action buttons align to the right edge
  - **Desktop view**: Unchanged, buttons remain on the right side of the title row

### Mileage Trip Pause/Resume Feature (COMPLETED)

- **Backend API Endpoints**:
  - `POST /api/admin/mileage/pause-trip` - Pauses active trip, stops recording waypoints
  - `POST /api/admin/mileage/resume-trip` - Resumes paused trip, calculates total paused duration
  - `POST /api/admin/mileage/update-location` - Updated to ignore waypoints when trip is paused

- **Frontend UI Changes** (MileageTrackingSection.jsx):
  - Added `isPaused` state to track pause status
  - New **Pause** button (amber/orange) - appears when trip is actively tracking
  - New **Resume** button (green) - appears when trip is paused
  - Section header shows "Paused" badge (amber) instead of "Tracking" (green) when paused
  - Trip info panel background changes to amber when paused with appropriate message
  - GPS tracking stops on pause and resumes on resume

- **Data Model Updates** (mileage.py):
  - `ActiveTripResponse` now includes: `is_paused`, `paused_at`, `total_paused_duration`

- **Test Results**: 100% pass rate (8 backend tests, full frontend verification)
- **Test Report**: `/app/test_reports/iteration_22.json`

### Header Trip Button Split Feature (COMPLETED)

- **Feature**: When Start Trip is clicked in the header, the single button splits into two equal-sized buttons:
  1. **Pause/Resume Button** (amber when active, green when paused) - Pauses or resumes GPS tracking
  2. **End Trip Button** (red) - Scrolls to mileage section and shows guidance toast

- **UI Changes** (AdminDashboard.jsx):
  - Added `headerTripPaused` state to track pause status from header
  - Added `handleHeaderPauseTrip` and `handleHeaderResumeTrip` handlers
  - Split buttons use `flex-1` class for equal width
  - Updated `checkActiveTripStatus` to also check `is_paused` status

- **State Synchronization**:
  - `onTripStatusChange` callback now passes object with `{isActive, isPaused}` 
  - MileageTrackingSection receives and syncs `headerTripPaused` prop
  - Both header and section buttons stay in sync

- **Test Results**: 100% pass rate (10 frontend feature checks)
- **Test Report**: `/app/test_reports/iteration_23.json`
- **Data-testid attributes**: `header-start-trip-btn`, `header-pause-resume-btn`, `header-end-trip-btn`

### UI Improvements (COMPLETED)

- **Recent Trips Section Collapsible** (MileageTrackingSection.jsx):
  - Changed default state to collapsed (`showMileageEntries: false`)
  - Click header "Recent Trips (count)" to expand/collapse
  - Uses AnimatePresence for smooth animations

- **Back to Top Button** (AdminDashboard.jsx):
  - Fixed position button at bottom-right corner
  - Appears when scrollY > 400px
  - Cyan-purple gradient matching app theme
  - Smooth scroll animation to top
  - Fades in/out with framer-motion
  - Data-testid: `back-to-top-btn`

- **Test Results**: 100% pass rate (7/7 feature checks)
- **Test Report**: `/app/test_reports/iteration_24.json`

## Pre-Deployment Cleanup & Fixes (Feb 23, 2026)

### Test Data Removed
- Deleted 2 test employees (@test.com accounts)
- Deleted 14 test job applications
- Deleted 13 test consignment inquiries
- Deleted 13 test consignment agreements
- Deleted 20 read notifications
- Remaining: 6 real employees (2 admins, 4 employees)

### Security Fixes
- Added JWT_SECRET to .env (required, no fallback)
- Updated config.py to require JWT_SECRET

### Performance Fixes
- Reduced database query limits from 10000 to 1000 in payroll.py

### Deployment Status
- All tests passed (100% backend, 100% frontend)
- System ready for production deployment
- Note: Email notifications use placeholder Resend API key (MOCKED)

### Test Report
- `/app/test_reports/iteration_25.json` - Pre-deployment verification passed

## Refactoring & Final Deployment (Feb 23, 2026)

### Code Refactoring
- **Extracted FormSubmissionsSection** (~346 lines)
  - New file: `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx`
  - AdminDashboard.jsx reduced from 5789 to 5443 lines

### Performance Optimization
- **Fixed N+1 Query** in `/api/admin/employees` endpoint
  - Changed from individual W-9 lookups to batch query with `$in` operator
  - Single database query instead of N+1 queries

### Deployment Status
- All critical checks PASSED
- All lint checks PASSED
- API endpoints verified working
- Test data cleaned
- Ready for production deployment

## Email Functionality Removed (Feb 23, 2026)

### Removed Components
- `/api/admin/reports/email` endpoint (shift report emailing)
- `/api/admin/payroll/report/email` endpoint (payroll report emailing)
- `app/services/email.py` service file
- `resend` package from requirements.txt
- Email config from `.env` (RESEND_API_KEY, SENDER_EMAIL)
- Email models (EmailReportRequest, EmailPayrollRequest)

### Preserved Functionality
- All report generation (PDF downloads)
- All form submission viewing
- All data export capabilities
- Report downloading (Shift, Payroll, Mileage PDFs)

### Files Modified
- `/app/backend/app/routers/admin.py` - Removed email import and endpoint
- `/app/backend/app/routers/payroll.py` - Removed email import and endpoint  
- `/app/backend/app/routers/time_tracking.py` - Removed email notifications from clock in/out
- `/app/backend/app/models/payroll.py` - Removed email request models
- `/app/backend/app/models/__init__.py` - Removed email model exports
- `/app/backend/app/config.py` - Removed email configuration
- `/app/backend/.env` - Removed email environment variables

## In-App Messaging Center (Feb 24, 2026)

### Feature Overview
Replaced the "Message Me" mailto link on the landing page with a full in-app messaging center. Visitors can now submit messages directly through the website, and admins can view and respond to them via the dashboard.

### Landing Page Changes
- **"Message Us" Button**: Opens a styled modal instead of opening email client
- **Message Modal**: 
  - Name, Email (required), and Message fields
  - Info banner explaining that replies will be sent via email
  - Validation for all fields and email format
  - Success state showing confirmation message

### Admin Dashboard Changes  
- **New "Messages" Section**: Added collapsible section after "Hours by Employee"
- **Unread Count Badge**: Shows number of unread messages on the section icon
- **Message List**: Displays all messages with sender info, timestamp, and content
- **Actions per Message**:
  - "Reply via Email" - Opens default email client with prepopulated thank-you message
  - "Mark as Read" - Updates message status
  - "Delete" - Removes message from database
- **Auto-refresh**: Unread count polls every 30 seconds

### API Endpoints
- `POST /api/messages/` - Public endpoint for submitting messages
- `GET /api/messages/admin/all` - Admin: Get all messages
- `GET /api/messages/admin/unread-count` - Admin: Get unread count
- `PUT /api/messages/admin/{id}/status` - Admin: Update read/unread status
- `DELETE /api/messages/admin/{id}` - Admin: Delete message

### Database Schema
```json
{
  "id": "uuid",
  "sender_name": "string",
  "sender_email": "string",
  "message": "string",
  "submitted_at": "datetime ISO",
  "status": "unread | read"
}
```

### Files Created
- `/app/backend/app/models/messages.py` - Pydantic models
- `/app/backend/app/routers/messages.py` - API endpoints
- `/app/frontend/src/components/admin/sections/MessagesSection.jsx` - Admin dashboard component

### Files Modified  
- `/app/frontend/src/pages/LandingPage.jsx` - Added message modal
- `/app/frontend/src/pages/AdminDashboard.jsx` - Added MessagesSection import and usage
- `/app/backend/server.py` - Registered messages router

### Test Report
- `/app/test_reports/iteration_26.json` - 100% backend (13/13), 100% frontend
- All features verified working

## Messaging Enhancements & Admin Dashboard Improvements (Feb 24, 2026)

### Message Modal Dark Theme
- Updated messaging modal on landing page to match home screen dark theme
- Dark gradient background (from-[#1A1A2E] via-[#16213E] to-[#0F3460])
- Dark-styled inputs with bg-white/10, white text, cyan focus accents
- Info banner with cyan styling
- Gradient send button (cyan to purple)

### Collapsible Messages
- Messages now display in compact collapsible rows
- Collapsed view shows: avatar, name, email, "New" badge (if unread), timestamp
- Click to expand and view full message content
- Expanded view shows: full message text, Reply via Email button, Mark as Read button, Delete button

### Message Search
- Added search bar at top of Messages section
- Filters messages by sender name, email, or message content
- Shows "Showing X of Y messages" count when filtering

### Browser Push Notifications
- Added notification toggle button (bell icon) in Messages section header
- Click to enable/disable browser push notifications
- When enabled, shows desktop notification when new messages arrive (if page not visible)
- Uses Notification API with permission request

### Admin Dashboard Auto-Refresh
All collapsible sections now auto-refresh their data when expanded:
- Messages Section - fetchMessages()
- Form Submissions Section - fetchFormSubmissions()
- W-9 Review Section - fetchPendingW9s()
- All Employees Section - fetchEmployeeClockStatuses()
- Recent Time Entries Section - fetchData()
- Hours by Employee Section - fetchData()
- Payroll Check Records Section - fetchCheckRecords()
- Mileage Tracking Section - fetchMileageEntries()

### Files Modified
- `/app/frontend/src/pages/LandingPage.jsx` - Dark-themed message modal
- `/app/frontend/src/components/admin/sections/MessagesSection.jsx` - Collapsible messages, search, notifications
- `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx` - Auto-refresh on expand
- `/app/frontend/src/components/admin/sections/PayrollCheckRecordsSection.jsx` - Auto-refresh on expand
- `/app/frontend/src/pages/AdminDashboard.jsx` - Auto-refresh for Time Entries and Hours by Employee

### Test Report
- `/app/test_reports/iteration_27.json` - 100% frontend (15/15 features verified)
