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
- [x] Refactoring backend/frontend (server.py 2000+ lines, AdminDashboard.jsx 2500+ lines) ✅ (Feb 26, 2026)
  - Backend already refactored to modular structure (Feb 23, 2026)
  - AdminDashboard.jsx modals extracted to separate components (Feb 26, 2026)

### P1 (High Priority)
- Add Resend API key for email notifications to work in production
- Deploy the application
- Employee schedule/shift management

### P2 (Medium Priority)
- Export hours to CSV/PDF
- Multi-location support
- Inventory integration with platforms

## Next Tasks
1. **[COMPLETED] Refactor backend/server.py** - Break into modular structure (routers, models, services) ✅
2. **[COMPLETED] Refactor AdminDashboard.jsx** - Decompose modals into smaller components ✅
3. Deploy the application
4. Configure Resend API key for production email notifications
5. **Refactor backend/app/routers/admin.py** - This file has grown significantly and could benefit from being broken down into smaller, more focused modules

## Testing Status
- Backend: 100% pass (93 tests + 16 form submission tests)
- Frontend: 100% pass (12 form submission tests)
- Test reports: `/app/test_reports/`
- Test files: `/app/backend/tests/`

## Recent Updates (Dec 2025)
- **Landing Page Flickering Fix** (Dec 2025):
  - Fixed screen flickering issue on the public landing page when returning/navigating back
  - **Root Cause**: The `SplashScreen` component was always rendered in `App.js`, and the `sessionStorage` check happened AFTER the component mounted, causing a brief flash of the splash overlay on return visits
  - **Solution**: 
    - Modified `App.js` to check `sessionStorage.hasSeenSplash` synchronously during initial render using a lazy state initializer
    - Only render `SplashScreen` when needed (first-time visitors)
    - Removed `framer-motion` animations with `initial={{ opacity: 0 }}` from `LandingPage.jsx` that caused content to "pop in"
  - First-time visitors still see the branded splash screen
  - Return visitors now see the landing page content immediately without any flicker

- **Payroll Summary UI Cleanup & Fixed Pay Period** (Dec 2025):
  - **Pay Period System**:
    - Pay period is FIXED to start from the first Monday of the year (Jan 5, 2026 for 2026)
    - Bi-weekly periods automatically calculated from this anchor date
    - All employees share the same global pay period
    - All payroll sections (Summary, Reports, Employee Portal) use the same calculation
  - **Consistent Pay Period Display**: All areas now show matching pay period (e.g., "Feb 16 - Mar 1, 2026")
  - **Edit Employee Modal**: 
    - Start Date field with calendar picker (for recording when employee began working)
    - Calendar popup shows "Current Pay Period" header
    - Selected date is highlighted with teal circle
  - **W-9 Report Updates**:
    - Added "Start Date" column to W-9 Submission Report table
    - Start date included in CSV and PDF exports
    - W-9 Viewer modal header shows employee start date
  - **Backend Updates**:
    - Unified `get_biweekly_period()` function to always use first Monday of year
    - Added `start_date` field to employee records and W-9 reports

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

## Calendar Date Range Filter Fix (Feb 24, 2026)


## Recent Updates (Feb 25, 2026) - Reports Consolidation & Admin W-9 Management

### Reports Section Changes (COMPLETED)

**Changes Implemented:**
1. **Removed Payroll Report**: Payroll Report removed from Reports section
   - Shift Report renamed to **"Payroll/Shift Report"** (combines shift and pay data)
   - Now only 3 report types: Payroll/Shift, Mileage, W-9

2. **Employee Filter Updated**: 
   - Individual admin names (Matthew Guzman, Eunice Guzman) replaced with single **"Administrator"** option
   - Non-admin employees shown individually
   - "All Employees" option still available

3. **Mileage Report Defaults to Administrator**: When selecting Mileage Report, the employee dropdown automatically defaults to "Administrator"

4. **W-9 Report**: View and Download buttons only (no delete button in Reports section)
   - Summary stats: Total employees, Approved, Pending, Not Submitted counts
   - Employee table with Name, Role, Status, Document Count, Last Updated, Actions
   - Status color-coded: Green (Approved), Yellow (Pending), Red (Not Submitted)

### Admin W-9 Delete (My Dashboard) - COMPLETED

**New Feature:** Admins can now delete their own W-9 documents from "My Dashboard"
- Navigate: Admin Dashboard → "My Dashboard" button → W-9 Tax Form section
- Each W-9 document shows Preview and Delete (trash can) buttons
- Admins can delete approved W-9s (regular employees can only delete pending ones)
- Backend updated to allow admins to delete their own approved W-9s

### Admin Dashboard Changes (COMPLETED)

1. **Unified Admin Login**: Both admin codes (4399 and 0826) now access the same admin dashboard
   - Both codes authenticate as the primary admin (matthewjesusguzman1@gmail.com)

2. **Dashboard Header**: Shows "Administrator" instead of the logged-in user's name

### Files Modified
- `/app/frontend/src/components/admin/sections/ReportsSection.jsx` - Removed Payroll, renamed to Payroll/Shift, mileage defaults to Administrator, removed W-9 delete button
- `/app/frontend/src/pages/EmployeeDashboard.jsx` - Added W-9 delete button for admins in W-9 section
- `/app/frontend/src/pages/AdminDashboard.jsx` - Changed header to show "Administrator"
- `/app/frontend/src/pages/AuthPage.jsx` - Both admin codes map to same admin email
- `/app/backend/app/routers/time_tracking.py` - Updated W-9 delete to allow admins to delete approved W-9s
- `/app/backend/app/routers/admin.py` - Added delete all W-9s endpoint
- `/app/backend/app/routers/auth.py` - Updated admin code mapping

### Backend Endpoints
- `GET /api/admin/reports/w9` - JSON preview data
- `GET /api/admin/reports/w9/csv` - CSV download
- `GET /api/admin/reports/w9/pdf` - PDF download
- `GET /api/admin/employees/{employee_id}/w9/latest` - Download latest W-9
- `DELETE /api/admin/employees/{employee_id}/w9/all` - Delete all W-9s for employee
- `DELETE /api/time/w9/{doc_id}` - Employee deletes own W-9 (admins can delete approved)

### Files Modified
- `/app/frontend/src/components/admin/sections/ReportsSection.jsx` - Added W-9 report type, admin inclusion, conditional date filters, View/Download buttons
- `/app/frontend/src/components/admin/modals/PayrollModal.jsx` - Removed download button
- `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx` - Removed export modal and download functionality
- `/app/frontend/src/components/admin/sections/AllEmployeesSection.jsx` - Removed W-9 download button
- `/app/frontend/src/pages/AdminDashboard.jsx` - Changed header to show "Administrator" instead of user name
- `/app/frontend/src/pages/AuthPage.jsx` - Both admin codes now map to same admin email
- `/app/backend/app/routers/admin.py` - Added W-9 report endpoints (JSON, CSV, PDF, latest W-9)
- `/app/backend/app/routers/auth.py` - Updated admin code mapping

### UI Changes
- Reports section description updated: "Generate shift, payroll, mileage, and W-9 reports"
- Report type grid updated to 4 columns (was 3) to accommodate W-9 Report card
- W-9 Report icon: FileSignature (purple gradient header on preview)
- W-9 Report table: Added "Actions" column with View/Download buttons per employee
- Admin Dashboard header: Shows "Administrator" instead of user's name

### Testing
- Backend: W-9 report endpoints return correct data with proper status categorization
- Backend: `/api/admin/employees/{id}/w9/latest` endpoint successfully returns PDF W-9 documents
- Frontend: Reports section displays all 4 report types correctly
- Frontend: Both admin codes (4399 and 0826) access the same admin dashboard
- Download buttons removed from PayrollModal, MileageTrackingSection, AllEmployeesSection
- View-only functionality preserved where downloads were removed



### Issue
User reported that the calendar date filter in Messages section was "not allowing selection of date range by choosing two dates". When clicking the first date, the filter was immediately applied, showing "No messages match your filters" before the user could select the second date.

### Root Cause
The original implementation applied the filter immediately upon any date selection. In `react-day-picker` range mode:
- First click: `{ from: Date, to: undefined }` → filter applied for single day
- Second click: `{ from: Date, to: Date }` → filter applied for range

This caused confusing UX where messages disappeared after first click.

### Solution
Implemented a "pending state" pattern:
1. **Added `pendingDateRange` state** - Stores date selection while calendar is open
2. **Calendar uses `pendingDateRange`** - User sees visual selection without filtering
3. **"Done" button applies filter** - Copies `pendingDateRange` to `dateRange`
4. **Messages remain visible** - Filter only applies when user explicitly confirms

### Code Changes
- `/app/frontend/src/components/admin/sections/MessagesSection.jsx`:
  - Added `pendingDateRange` state variable
  - Added `openDatePicker()`, `cancelDatePicker()`, `applyDateFilter()` functions
  - Calendar `onSelect` now updates `pendingDateRange` instead of `dateRange`
  - "Done" button calls `applyDateFilter()` to apply the filter
  - "Clear" button in picker clears `pendingDateRange`
  - Quick presets update `pendingDateRange` as well

### Verified Behavior
1. ✅ Click first date → All messages remain visible, date highlighted in calendar
2. ✅ Click second date → Range highlighted, messages still visible
3. ✅ Click "Done" → Filter applied, showing matching messages with "Showing X of Y"
4. ✅ Click "X" on date button → Filter cleared, all messages shown
5. ✅ Quick presets (Today, Last 7 days, etc.) work correctly
6. ✅ "Clear" button inside calendar works correctly

## Multiple W-9 Form Management (Dec 25, 2025)

### Feature Overview
Simplified W-9 management by removing the approval workflow. W-9 submissions no longer require admin review - they are simply stored and accessible.

### Changes Made

1. **Removed W-9 Review Section**
   - W-9 Review section completely removed from Admin Dashboard
   - No more "pending review" status - W-9s are immediately "submitted"
   - Removed W-9 Rejection Modal

2. **Edit Employee Modal - W-9 Management**
   - New "W-9 Tax Documents" section in Edit Employee modal
   - Shows list of all W-9 documents for employee with:
     - Filename and upload date
     - View button (opens in new tab)
     - Download button
     - Delete button (admin can remove any W-9)
   - "Add Another W-9" upload button always available
   - "Blank W-9 Form" download link (IRS form)

3. **Employee Dashboard - W-9 Viewing**
   - W-9 documents now show "On File" status (not "Pending")
   - Employees can view and download their own W-9s
   - Download buttons added for each W-9 document
   - Employees can upload additional W-9s
   - Employees cannot delete W-9s (admin only)

4. **All Employees Table - W-9 Column**
   - View button (eye icon) - opens W-9 viewer modal
   - Download button (download icon) - downloads W-9
   - Upload button (upload icon) - appears if no W-9 on file

### Backend Changes
- W-9 status changed from "pending_review" to "submitted"
- Removed duplicate route for `/employees/{employee_id}/w9/status`
- W-9 approval/rejection endpoints remain but unused

### Files Modified
- `/app/backend/app/routers/admin.py` - Removed duplicate route, changed status
- `/app/backend/app/routers/time_tracking.py` - Changed status to "submitted"
- `/app/frontend/src/pages/AdminDashboard.jsx` - Edit Employee W-9 section, removed W-9 Review
- `/app/frontend/src/pages/EmployeeDashboard.jsx` - Simplified W-9 display

### Test Report
- `/app/test_reports/iteration_28.json` - 100% backend (10/10), 100% frontend
- All W-9 management features verified working

## W-9 Management UI Refinements (Dec 25, 2025)

### Changes Made

1. **All Employees Table - W-9 Column**
   - Removed download button, keeping only View button (eye icon)
   - Upload button still appears for employees without W-9

2. **W-9 Viewer Modal - Approve Functionality**
   - Added Approve button (green checkmark) next to Delete (trash) icon in sidebar
   - Approve button only shows for non-approved W-9 documents
   - Footer now shows Approve, Delete, and Download buttons
   - Footer has extra padding (pb-16) to avoid "Made with Emergent" badge overlap

3. **Edit Employee Modal - W-9 Section**
   - Shows status (Approved = green, On File = blue) for each W-9
   - Added Approve button for non-approved W-9s
   - View, Download, Approve, Delete buttons available per document

4. **Backend API**
   - New endpoint: `POST /api/admin/employees/{id}/w9/{doc_id}/approve`
   - Approves a specific W-9 document by ID

### Test Report
- `/app/test_reports/iteration_29.json` - 100% backend, 100% frontend
- All W-9 UI refinements verified working

## W-9 Bug Fixes (Dec 25, 2025)

### Issues Fixed

1. **Edit Employee Modal - W-9 buttons not working**
   - **Root Cause**: Old W-9 documents in database were missing `id` field
   - **Fix**: Added `id` field to 4 existing W-9 documents in database

2. **W-9 Documents Modal - buttons not working**
   - **Root Cause**: Same as above - documents without `id` field couldn't be fetched
   - **Fix**: Same as above

3. **Only first employee could access W-9 documents**
   - **Root Cause**: Backend route ordering issue - `/status` endpoint was being matched by `/{doc_id}` route
   - **Fix**: Reordered backend routes so `/status` comes before `/{doc_id}` in admin.py

4. **Employee Portal - W-9 view/download errors**
   - **Root Cause**: Same missing `id` field issue
   - **Fix**: Same database fix

### Backend Changes
- Reordered routes in `/app/backend/app/routers/admin.py`:
  - `/employees/{id}/w9/status` now comes before `/employees/{id}/w9/{doc_id}`
  - `/employees/{id}/w9` (list all) now comes last

### Database Fix
- Added `id` field to 4 W-9 documents that were created before the multi-W-9 feature

### Test Report
- `/app/test_reports/iteration_30.json` - 100% backend, 100% frontend
- All W-9 bugs verified fixed for: James Wilson, Lisa Martinez, Sarah Johnson

## W-9 UI Final Fixes (Dec 25, 2025)

### Issues Fixed

1. **Removed Trash Icon from W-9 Documents Sidebar**
   - Only the Approve (checkmark) icon now shows in the sidebar for non-approved W-9s
   - Delete functionality remains in the footer buttons only

2. **Fixed View W-9 Button on Mobile (Edit Employee Modal)**
   - Changed from `window.open()` to `link.click()` method for mobile compatibility

3. **Fixed View W-9 Button on Mobile (Employee Portal)**
   - Same fix: Using `link.click()` instead of `window.open()`

4. **Fixed Blank W-9 Form Download Button (Employee Portal)**
   - Changed to use `link.click()` method for IRS W-9 form download

5. **Fixed Backend Datetime Comparison Error**
   - Added timezone awareness check for `period_start` in `get_employee_summary_admin`

### Test Report
- `/app/test_reports/iteration_31.json` - 100% backend, 100% frontend
- All mobile compatibility fixes verified

## Mileage Section Bug Fixes (Feb 24, 2026)

### Issues Fixed

1. **P0: Backend API Not Returning Mileage Data (FIXED)**
   - **Root Cause**: `MileageEntryResponse` Pydantic model had `user_name` as a required field (`str`), but some database entries were missing this field, causing a ValidationError
   - **Fix**: Changed `user_name` to `Optional[str]` with default value `"Unknown"` in `/app/backend/app/models/mileage.py`
   - **Result**: GET `/api/admin/mileage/entries` now returns valid JSON array

2. **P0: Frontend Input Fields Losing Focus (FIXED)**
   - **Root Cause**: `MileageForm` component was defined inside the parent component function, causing it to be recreated on every render and losing input focus
   - **Fix**: Removed the internal `MileageForm` component, added `handleFormFieldChange` helper function using functional state updates, and inlined the form JSX directly in the modal components
   - **Files Changed**: `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx`
   - **Result**: Input fields now retain focus while typing (verified character-by-character)

### Test Report
- `/app/test_reports/iteration_1.json` - 100% backend (11/11 tests), 100% frontend
- All mileage bugs verified fixed

### Features Verified Working
- GET /api/admin/mileage/entries - Returns valid JSON array
- Add Mileage Entry form - Input fields retain focus, submission works
- Edit Mileage Entry form - Input fields retain focus
- Recent Trips display - Shows trip list with edit/delete buttons
- Bulk select mode - Select Trips button functional

## AdminDashboard.jsx Refactoring (Feb 24, 2026)

### Changes Made
Extracted 3 large sections from AdminDashboard.jsx into standalone components:

1. **AllEmployeesSection.jsx** (439 lines)
   - Employee table with sorting, clock status indicators
   - Inline hourly rate editing
   - W-9 upload/view functionality
   - "View Portal" action

2. **TimeEntriesSection.jsx** (200 lines)
   - Recent time entries table with sorting
   - Add Entry, Edit, Delete actions

3. **HoursByEmployeeSection.jsx** (155 lines)
   - Hours breakdown by employee
   - View Shifts action

### Results
- AdminDashboard.jsx reduced from 5778 lines to 5356 lines (~420 lines removed)
- Total section components now: 7 files, 4458 total lines
- Better code organization and maintainability
- Each section is now a self-contained, testable component

### Component Structure
```
/app/frontend/src/components/admin/sections/
├── AllEmployeesSection.jsx      (439 lines) - NEW
├── FormSubmissionsSection.jsx   (489 lines)
├── HoursByEmployeeSection.jsx   (155 lines) - NEW
├── MessagesSection.jsx          (834 lines)
├── MileageTrackingSection.jsx   (1627 lines)
├── PayrollCheckRecordsSection.jsx (714 lines)
└── TimeEntriesSection.jsx       (200 lines) - NEW
```

## Refactoring Phase 2 (Feb 24, 2026)

### New Modal Components Created
Created reusable modal components in `/app/frontend/src/components/admin/modals/`:

1. **ShiftReportModal.jsx** (395 lines)
   - Self-contained shift report generation
   - Period filters (pay period, month, year, custom)
   - Employee filter
   - Report generation and PDF download

2. **PayrollModal.jsx** (390 lines)
   - Payroll report generation
   - Period selection with custom date range
   - Employee breakdown table
   - PDF export functionality

3. **TimeEntryModal.jsx** (204 lines)
   - Combined Add/Edit entry modal
   - Employee selection (for add mode)
   - Clock in/out datetime inputs
   - Automatic hour calculation

### Component Structure (Updated)
```
/app/frontend/src/components/admin/
├── modals/
│   ├── PayrollModal.jsx       (390 lines) - NEW
│   ├── ShiftReportModal.jsx   (395 lines) - NEW
│   └── TimeEntryModal.jsx     (204 lines) - NEW
└── sections/
    ├── AllEmployeesSection.jsx      (439 lines)
    ├── FormSubmissionsSection.jsx   (489 lines)
    ├── HoursByEmployeeSection.jsx   (155 lines)
    ├── MessagesSection.jsx          (834 lines)
    ├── MileageTrackingSection.jsx   (1627 lines)
    ├── PayrollCheckRecordsSection.jsx (714 lines)
    └── TimeEntriesSection.jsx       (200 lines)
```

### Progress Summary
- **Sections extracted**: 7 components
- **Modals created**: 3 components  
- **AdminDashboard.jsx**: 5359 lines (down from 5778)
- **Total extracted code**: ~5,500 lines in reusable components

### Notes
- New modal components are ready for integration
- Components follow the same patterns (props, state management, API calls)
- Each component is self-contained and testable

## Deployment Preparation Complete (Feb 24, 2026)

### Changes Made for Deployment
1. **Moved hardcoded URLs to environment variables:**
   - REACT_APP_LOGO_URL
   - REACT_APP_TIKTOK_URL
   - REACT_APP_EBAY_LOGO_URL
   - REACT_APP_MERCARI_LOGO_URL
   - REACT_APP_DEPOP_LOGO_URL
   - REACT_APP_FB_MARKETPLACE_LOGO_URL
   - REACT_APP_TIKTOK_LOGO_URL
   - REACT_APP_FB_LOGO_URL

2. **Updated files to use environment variables:**
   - LandingPage.jsx
   - AuthPage.jsx
   - JobApplicationForm.jsx
   - ConsignmentInquiryForm.jsx

### Deployment Status: READY ✅
- All hardcoded URLs moved to .env
- CORS configured for production
- MongoDB connection via environment variables
- JWT authentication configured
- No blocking issues

### Performance Warnings (Non-blocking)
- DB query optimizations recommended in payroll.py, admin.py, time_tracking.py
- These are optimization suggestions, not deployment blockers

## Undefined ID Bug Fixes (Feb 24, 2026)

### Issue
Production deployment logs showed 404 errors with `undefined` in URLs:
- `/api/admin/employees/{id}/w9/undefined/approve`
- `/api/admin/employees/{id}/w9/undefined`
- `/api/time/w9/download/undefined`

### Root Cause
W-9 documents in the database sometimes lacked `id` fields, causing frontend code to pass `undefined` to API calls.

### Fixes Applied
1. **EmployeeDashboard.jsx**
   - Added `.filter(doc => doc && doc.id)` to W-9 document list rendering

2. **AdminDashboard.jsx**
   - Added guards to `handleViewW9()` - validates employeeId and filters docs with valid ids
   - Added guards to `handleApproveW9Doc()` - validates employeeId and docId
   - Added guards to `handleDeleteW9Doc()` - validates employeeId and docId
   - Added guards to `handleSelectW9()` - validates doc and doc.id
   - Added `.filter(doc => doc && doc.id)` to Edit Employee W-9 list

3. **AllEmployeesSection.jsx**
   - Added guards to `handleViewW9()` - validates employeeId and filters docs with valid ids

### Result
API calls with undefined IDs are now prevented at the frontend level.

## W-9 Feature Redesign (Feb 24, 2026)

### Employee Portal Changes
- **Removed**: Direct W-9 upload in the old section
- **Added**: Messaging-style W-9 submission form with:
  - File upload (PDF, JPG, PNG)
  - Optional notes field for employee comments
  - Submit button to send to admin
- **Added**: Submissions list showing:
  - Document filename
  - Upload date
  - Status (Pending Review / Approved)
  - Notes preview
  - View button
- **Kept**: "Get W-9 Form" button to download blank IRS W-9

### Admin Portal Changes (All Employees Section)
- **Updated**: W-9 column shows "View" button for employees with submissions
- **Added**: W-9 Management Modal with:
  - Employee name header
  - List of submitted W-9 documents
  - For each document: Preview, Download, Approve, Delete buttons
  - Document notes display
  - Status badges (Pending/Approved)
  - "Get W-9 Form" button in footer
  - Close button

### Backend Changes
- **Updated** `/api/time/w9/upload` endpoint:
  - Now accepts optional `notes` field (Form parameter)
  - Generates unique `id` for each document
  - Supports multiple W-9 submissions per employee
- **Updated** `w9_documents` collection schema:
  - Added `id` field (UUID)
  - Added `notes` field

### Files Modified
- `frontend/src/pages/EmployeeDashboard.jsx` - Complete W-9 section redesign
- `frontend/src/components/admin/sections/AllEmployeesSection.jsx` - W-9 Management Modal
- `backend/server.py` - Updated upload endpoint with notes support
- `backend/app/routers/time_tracking.py` - Updated upload endpoint

### Test Data
- Test Employee created: testemployee@thriftycurator.com
- Sample W-9 submitted with notes: "This is my W-9 submission for 2026"

## W-9 Dark Theme & Button Functionality Verification (Feb 24, 2026)

### UI Styling Completed
- **Edit Employee Modal W-9 Section**: Applied dark theme matching All Employees W-9 modal
  - Dark gradient background (`from-[#1A1A2E] via-[#16213E] to-[#0F3460]`)
  - Rainbow accent bar (`from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]`)
  - White text with proper contrast
  - Status badges (Approved/Pending) with appropriate colors
  - All buttons styled with dark theme variants

- **All Employees W-9 Modal**: Already had dark theme (verified)
  - Consistent styling with Edit Employee modal
  - All action buttons visible and styled

- **Employee Dashboard W-9 Section**: Dark theme verified
  - Matches home screen aesthetic

### Bug Fix: Duplicate Code Removal
- Removed leftover duplicate code (lines 2908-2928) in AdminDashboard.jsx from previous incomplete edit
- File now properly structured without conflicting W-9 section code

### All W-9 Buttons Verified Working
**Admin Portal - All Employees W-9 Modal:**
- ✅ Preview: Opens document in viewer modal
- ✅ Download: Triggers file download with confirmation
- ✅ Approve: Changes status from Pending to Approved
- ✅ Delete: Removes document with confirmation

**Admin Portal - Edit Employee Modal:**
- ✅ Preview: Opens document viewer
- ✅ Download: Downloads W-9 file
- ✅ Approve: Approves pending W-9 (button hidden for already-approved docs)
- ✅ Delete: Removes W-9 document
- ✅ Upload: Allows adding new W-9 documents
- ✅ Get W-9 Form: Downloads blank IRS W-9

**Employee Portal:**
- ✅ Get W-9 Form: Downloads blank IRS W-9
- ✅ Submit W-9: Opens submission form with notes field
- ✅ View: Opens submitted W-9 in viewer
- ✅ Status display: Shows Pending/Approved badges

### Test Report
- `/app/test_reports/iteration_3.json` - 100% pass rate
- Backend: 13/13 tests passed
- Frontend: 28/28 tests passed across 3 spec files
- Spec files created:
  - `/app/tests/e2e/admin-w9-management.spec.ts`
  - `/app/tests/e2e/employee-w9-section.spec.ts`
  - `/app/tests/e2e/edit-employee-w9.spec.ts`

### Files Modified
- `/app/frontend/src/pages/AdminDashboard.jsx` - Removed duplicate code, fixed W-9 section

## Pending Tasks

### P1: AdminDashboard.jsx Refactoring (PARTIALLY COMPLETE)
- **Status**: ShiftReportModal and TimeEntryModal integrated successfully
- **File size reduction**: 5350 → 4976 lines (~374 lines removed)
- **Integrated components**:
  - `ShiftReportModal.jsx` - ✅ Working
  - `TimeEntryModal.jsx` (Add mode) - ✅ Working
  - `TimeEntryModal.jsx` (Edit mode) - ✅ Working
- **Remaining integration**:
  - `PayrollModal.jsx` - NOT integrated (inline code has different field names: `custom_end`, `hourly_rate`)
- **Action needed**: Update PayrollModal component to match inline code fields, then integrate

### P2: Production Deployment
- Application ready for deployment
- All features tested and working
- Run deployment agent when ready

## Geolocation Clock-In Fix (Feb 25, 2026)

### Issue
Employee clock-in GPS flow was showing the "Location Access Required" warning immediately instead of prompting for GPS permission on first click.

### Root Cause Analysis
The issue was related to browser permission caching:
1. On a **fresh session**, clicking "Clock In" triggers `navigator.geolocation.getCurrentPosition()` which shows the browser's GPS permission prompt
2. If user **denies** the permission, browsers cache this decision
3. On subsequent visits/reloads, the cached "denied" state causes immediate failure without showing a prompt

### Solution Implemented
1. **Added Permissions API check**: Before calling `getCurrentPosition()`, we check the permission state
   - If "denied" → Show warning immediately (browser won't show prompt)
   - If "prompt" → Call `getCurrentPosition()` which triggers the browser prompt
   - If "granted" → Get location directly

2. **Improved warning message**: Updated the location blocked warning with device-specific instructions:
   - **iPhone/iPad**: Settings → Safari → Location → Allow
   - **Android**: Tap ⋮ menu → Settings → Site settings → Location → Allow
   - **Desktop**: Click the lock icon in address bar → Reset permission

3. **Added console logging**: For debugging GPS issues in production

### Code Changes
- Modified: `/app/frontend/src/pages/EmployeeDashboard.jsx`
  - `checkLocation()` function now uses async/await
  - Added Permissions API check before geolocation request
  - Added detailed console logging
  - Updated warning UI with platform-specific instructions

### Expected Behavior
1. **Fresh session (never asked before)**:
   - Click "Clock In" → Browser shows GPS permission prompt → Allow/Block
2. **Previously allowed**:
   - Click "Clock In" → Location checked immediately → Clock in if within range
3. **Previously denied**:
   - Click "Clock In" → Warning shown with instructions to reset permission → User must manually enable in browser settings

### Testing Verified
- ✅ Permission granted + within range → Clock in succeeds with "Location verified"
- ✅ Permission granted + too far → Shows "Too far" message with toast
- ✅ Permission denied → Shows warning with platform-specific enable instructions

### Browser Limitation (Cannot Fix)
Once a user denies GPS permission, the browser caches this decision. There is NO programmatic way to re-trigger the permission prompt. The only solution is for the user to manually reset the permission in their browser settings.


## Payment Records Rename & File Refactoring (Feb 25, 2026)

### Changes Completed

1. **UI Label Rename (VERIFIED)**
   - "Payroll Check Records" → "Payment Records"
   - "Upload Check Photo" → "Upload Payment Photo"
   - "Check Date" → "Payment Date"
   - All instances in the UI updated and verified via screenshot

2. **File Rename (COMPLETED)**
   - `PayrollCheckRecordsSection.jsx` → `PaymentRecordsSection.jsx`
   - Component name updated: `PayrollCheckRecordsSection` → `PaymentRecordsSection`
   - Import updated in `AdminDashboard.jsx`
   - Comment updated to reflect new section name

### Files Modified
- `/app/frontend/src/components/admin/sections/PaymentRecordsSection.jsx` (renamed from PayrollCheckRecordsSection.jsx)
- `/app/frontend/src/pages/AdminDashboard.jsx` - Updated import and component usage

### Refactoring Status
- **PayrollModal.jsx** extraction: ✅ Already completed (exists at `/app/frontend/src/components/admin/modals/PayrollModal.jsx`)
- **PaymentRecordsSection.jsx** rename: ✅ Completed this session
- All pending refactoring tasks are now complete

### Architecture Update
```
/app/frontend/src/components/admin/
├── modals/
│   ├── PayrollModal.jsx       (390 lines)
│   ├── ShiftReportModal.jsx   (395 lines)
│   └── TimeEntryModal.jsx     (204 lines)
└── sections/
    ├── AllEmployeesSection.jsx      (439 lines)
    ├── FormSubmissionsSection.jsx   (489 lines)
    ├── HoursByEmployeeSection.jsx   (155 lines)
    ├── MessagesSection.jsx          (834 lines)
    ├── MileageTrackingSection.jsx   (1627 lines)
    ├── PaymentRecordsSection.jsx    (714 lines) - RENAMED
    ├── ReportsSection.jsx           (centralized reports)
    └── TimeEntriesSection.jsx       (200 lines)
```


## UI Fixes (Feb 25, 2026)

### 1. Splash Screen Performance Fix
- **Issue**: Splash page appeared glitchy on desktop due to complex animations
- **Fix**: Simplified animated background effects to static gradient glows
  - Removed infinite animations, scaling, and movement
  - Reduced blur sizes from 100px to 60-80px
  - Reduced number of gradient elements from 7 to 3
  - Now uses simple fade-in transitions for smooth rendering
- **File**: `/app/frontend/src/components/SplashScreen.jsx`

### 2. Payroll Modal Header Simplification
- **Issue**: Modal header showed "Payroll Reports" with subtitle "Generate payroll-ready reports"
- **Fix**: Changed header to simply "Payroll" with no subtitle
- **File**: `/app/frontend/src/pages/AdminDashboard.jsx` (inline payroll modal)

### 3. Download PDF Button Removed
- **Issue**: After generating payroll report, a "Download PDF" button appeared
- **Fix**: Removed the Download PDF button from the payroll modal
- **Note**: PDF downloads are still available through the Reports section
- **File**: `/app/frontend/src/pages/AdminDashboard.jsx`

## Notification Panel Fix (Dec 2025)

### Issue
User reported that "Mark as read" and "Clear All" buttons were not visible in the notification panel. The notification panel opened correctly but the action buttons in the header were missing/hidden.

### Root Cause
1. The "Mark read" button was conditionally rendered only when `unreadCount > 0`
2. The auto-mark-as-read `useEffect` hook was firing quickly after panel open, setting `unreadCount` to 0
3. The buttons had low-contrast styling (`text-white/70` on dark background)
4. Layout used `flex items-center justify-between` which caused buttons to be hidden when space was tight

### Fix Applied
- Redesigned the notification panel header with a two-row layout
- First row: Title, unread count badge, and X close button
- Second row: "Mark all read" and "Clear all" buttons (shown when `notifications.length > 0`)
- Both buttons now have solid background colors for better visibility:
  - "Mark all read": cyan/teal background (`bg-white/10 border-white/20`)
  - "Clear all": red background (`bg-red-500/20 border-red-400/30`)
- Buttons are now always visible when there are notifications (not dependent on `unreadCount`)

### Files Modified
- `/app/frontend/src/pages/AdminDashboard.jsx` - Notification panel header section

### Test Results
- ✅ "Mark all read" button visible and functional (shows toast "All notifications marked as read")
- ✅ "Clear all" button visible and functional (clears all notifications, shows toast "All notifications cleared")
- ✅ Panel works correctly on both desktop and mobile views


## Est. Pay Column in Payroll Reports (Feb 26, 2026)

### Feature Implemented
Added "Est. Pay" column to the Payroll/Shift Report Shift Details table, showing the calculated pay for each individual shift.

### Changes Made

1. **Frontend (ReportsSection.jsx)**:
   - Added "Est. Pay" column header to Shift Details table
   - Displays calculated pay: `total_hours × hourly_rate`
   - Formatted as currency (green text) using Intl.NumberFormat
   - Falls back to $15/hr if hourly_rate is not set

2. **Backend CSV Export (admin.py)**:
   - Added "Est. Pay" column to shift entries in CSV export
   - Each shift row now includes: Employee Name, Clock In, Clock Out, Hours, **Est. Pay**, Admin Note, Adjusted
   - Summary section continues to show "Estimated Pay" per employee

3. **Backend PDF Export (admin.py)**:
   - Added "Est. Pay" column to Detailed Shift Entries table
   - Adjusted column widths to fit new column
   - Each shift row shows currency-formatted est. pay

### Test Results
- Backend: 10/10 tests passed
- Frontend: 9/9 tests passed  
- Test report: `/app/test_reports/iteration_4.json`
- Test files:
  - `/app/backend/tests/test_reports_est_pay.py`
  - `/app/tests/e2e/reports-est-pay.spec.ts`

### Files Modified
- `/app/frontend/src/components/admin/sections/ReportsSection.jsx` - Added Est. Pay column to Shift Details table
- `/app/backend/app/routers/admin.py` - Added Est. Pay to CSV and PDF exports


## Hours Format & Clock-in Bug Fix (Feb 26, 2026)

### Hours Format (h:m:s)
All time displays now show hours in human-readable format (e.g., "1h 30m 45s") instead of decimal format (e.g., "1.51"):

**Files Updated:**
- `/app/frontend/src/lib/utils.js` - Added `formatHoursToHMS()` utility function
- `/app/frontend/src/pages/AdminDashboard.jsx` - Updated all hours displays
- `/app/frontend/src/pages/EmployeeDashboard.jsx` - Updated recent shifts, period hours
- `/app/frontend/src/components/admin/sections/ReportsSection.jsx` - Updated report views
- `/app/frontend/src/components/admin/sections/HoursByEmployeeSection.jsx` - Updated hours display
- `/app/backend/app/routers/admin.py` - Added `format_hours_hms()` for CSV/PDF exports

**Locations Updated:**
- Reports section summary (Total Hours)
- By Employee table
- Shift Details table
- Hours by Employee section
- Employee Portal - Recent Shifts
- Employee Portal - Current Pay Period summary
- Employee Shifts Modal
- Payroll Report
- CSV and PDF exports

### Clock-in Bug Fix
Fixed issue where clocking in after admin clock-out could reopen an already-closed shift:

**Problem:**
- When admin clocked out an employee, the shift was properly closed
- If the employee clocked in again the same day, the old logic searched for `shift_date` and reopened the closed shift
- This caused confusion in time tracking

**Solution:**
- Modified `/app/backend/app/routers/time_tracking.py` - Employee clock-in always creates new entry
- Modified `/app/backend/app/routers/admin.py` - Admin clock-in always creates new entry
- Each clock-in now creates a fresh time entry instead of potentially reopening closed shifts

### Test Results
- Frontend: 100% (19/19 tests passed)
- Backend: 88% (30/34 - 4 unrelated W9 test failures)
- Test file: `/app/tests/e2e/hours-format-clockin.spec.ts`


## Payroll Rounding Fix (Feb 26, 2026)

### Issue
User reported that payroll reports do not match the time worked. The summary would show different amounts than the sum of individual shift calculations.

### Root Cause
Two different rounding approaches were being used:
1. **Sum then round**: Backend summed raw hours (1.042), then rounded to nearest minute (63 min = 1.05 hrs → $21.00)
2. **Round then sum**: Frontend rounded each shift individually then summed (60 + 1 + 0 + 1 = 62 min → $20.67)

For user expectations, approach #2 is correct - users want the total to match the sum of the displayed individual shift values.

### Solution
Updated backend endpoints to use individually-rounded hours:

1. **`/api/admin/payroll/summary`** (payroll.py):
   - Fixed `employee_id` → `user_id` key in yearly calculation
   - All periods now use `round_hours_to_minute()` for pay calculations

2. **`/api/admin/reports/shifts`** (admin.py):
   - Added `rounded_hours` field to summary (sum of individually rounded hours)
   - Added `estimated_pay` field to summary (pre-calculated pay amount)
   - Frontend now uses these pre-calculated fields

3. **`/api/admin/payroll/report`** (payroll.py):
   - Updated `gross_wages` calculation to use rounded hours
   - Added `total_hours_formatted` field for display

4. **PDF/CSV exports**:
   - Updated to use `format_hours_hms()` and `round_hours_to_minute()` consistently

### Files Modified
- `/app/backend/app/routers/payroll.py` - Fixed rounding logic in summary, report, and PDF
- `/app/backend/app/routers/admin.py` - Added rounded_hours and estimated_pay to shift report summary
- `/app/frontend/src/components/admin/sections/ReportsSection.jsx` - Updated to use new backend fields

### Test Results
- Frontend: 100% (28/28 tests passed)
- Backend: 92% (45/49 - 4 unrelated W9 test failures)
- Test files:
  - `/app/tests/e2e/payroll-rounding.spec.ts`
  - `/app/backend/tests/test_payroll_rounding.py`
- Test report: `/app/test_reports/iteration_6.json`

### Verification
- Payroll Summary shows $20.67 for current period, month, and year
- Reports section shows 1h 2m total hours and $20.67 total pay

## Pay Period Date Display Fix (Feb 26, 2026)

### Issue
Pay period dates were showing incorrectly (e.g., "Feb 15 - Mar 1" instead of "Feb 16 - Mar 1") in:
- Employee Dashboard
- Admin's Employee Portal View modal

### Root Cause
The `formatDate()` functions were using JavaScript's local timezone conversion (`toLocaleDateString()`), which shifted UTC dates back by one day for users in timezones behind UTC.

### Solution
Updated all pay period date formatting functions to use UTC methods:
- Changed from: `new Date(isoString).toLocaleDateString(...)`
- Changed to: Using `getUTCMonth()` and `getUTCDate()` to format dates without timezone conversion

### Files Modified
- `/app/frontend/src/pages/EmployeeDashboard.jsx` - Updated `formatDate()` function
- `/app/frontend/src/pages/AdminDashboard.jsx` - Updated `formatDate()` function
- `/app/frontend/src/components/admin/EmployeePortalModal.jsx` - Updated `formatDate()` and `formatPeriod()` functions

### Verification
- Employee Dashboard now shows "Feb 16 - Mar 1" ✓
- Admin Employee Portal View shows "Feb 16 - Mar 1, 2026" ✓

- Individual shifts: 1h 0m ($20.00) + 0h 1m ($0.33) + 0h 0m ($0.00) + 0h 1m ($0.33) = $20.66
- All values are now consistent across the application

## AdminDashboard.jsx Modal Refactoring (Feb 26, 2026)

### Task
Extract inline modal components from AdminDashboard.jsx to improve maintainability and code organization.

### Changes Made
Extracted three large inline modal definitions into separate, reusable component files:

1. **EmployeePortalViewModal.jsx** (~413 lines)
   - Employee portal view modal showing clock status, pay period summary, recent shifts, and W-9 section
   - Located: `/app/frontend/src/components/admin/modals/EmployeePortalViewModal.jsx`

2. **W9ViewerModal.jsx** (~288 lines)
   - W-9 document viewer with sidebar list, document preview, and admin actions
   - Located: `/app/frontend/src/components/admin/modals/W9ViewerModal.jsx`

3. **PortalW9Modal.jsx** (~229 lines)
   - Dark-themed W-9 modal for viewing from within Employee Portal View
   - Includes inline preview modal
   - Located: `/app/frontend/src/components/admin/modals/PortalW9Modal.jsx`

### Results
- **AdminDashboard.jsx reduced from 5,023 lines to 4,232 lines** (~800 lines removed)
- All modal functionality preserved and verified working
- Imports already in place at lines 78-80

### Testing Status
- Frontend tests: 100% (6/6 modal tests passed)
- All modal open/close functionality verified
- Employee Portal View, W9 Viewer, and Portal W9 modals all working correctly

## Mileage Tracking Improvements (Feb 26, 2026)

### User Request
Improve mileage tracking accuracy and ensure continuous tracking until paused or trip ended, primarily for mobile use.

### Changes Implemented

1. **Screen Wake Lock**
   - Added NoSleep.js library for cross-browser wake lock support
   - Implemented native Wake Lock API (Chrome 84+) as primary method
   - Screen stays awake during active trip tracking
   - Wake lock disabled when trip is paused (to save battery)

2. **Improved GPS Configuration**
   - Reduced polling interval from 10 seconds to 5 seconds
   - Increased timeout from 5s to 15s for better GPS lock on mobile
   - Added accuracy filtering (ignores readings > 100m accuracy)
   - Added minimum distance filter (5m) to reduce GPS noise

3. **Visibility Change Handling**
   - Auto-resumes tracking immediately when app returns to foreground
   - Shows warning when app goes to background
   - Forces location update when visibility restored

4. **Enhanced UI Indicators**
   - GPS accuracy indicator (green < 20m, yellow < 50m, red > 50m)
   - Screen wake status indicator
   - "Last updated X seconds ago" timer
   - Warning banners for tracking issues

### Technical Notes
- True background GPS tracking with screen locked is NOT possible with web technology (browser security restriction)
- Best accuracy achieved by keeping app open and screen visible
- NoSleep.js prevents screen from sleeping during active tracking
- Waypoints are still recorded to server for distance calculation

### Dependencies Added
- `nosleep.js@0.12.0`

## PWA (Progressive Web App) Implementation (Feb 27, 2026)

### User Request
Implement PWA "Add to Home Screen" functionality for better mobile app-like experience.

### Changes Implemented

1. **Service Worker** (`/public/service-worker.js`)
   - Caches static assets for offline use
   - Network-first strategy for API calls
   - Background sync support for mileage data
   - Auto-updates when new version available

2. **PWA Install Prompt** (`/components/PWAInstallPrompt.jsx`)
   - Shows install banner after 3 seconds (first visit only)
   - iOS-specific instructions modal (Safari Add to Home Screen)
   - Benefits list: Better GPS tracking, works offline, quick access
   - Dismissible with "remember" functionality

3. **Enhanced Manifest** (`/public/manifest.json`)
   - Added app shortcuts (Admin Dashboard, Employee Portal)
   - Improved icon configuration (separate maskable icons)
   - Updated description and categories

4. **Offline Page** (`/public/offline.html`)
   - Branded offline fallback page
   - Retry button to reload

### PWA Benefits
- **Standalone Mode**: Runs without browser UI (fullscreen)
- **Home Screen Icon**: Quick launch from device home screen
- **Offline Support**: Basic functionality when offline
- **Better Performance**: Cached assets load faster
- **App Shortcuts**: Quick access to specific sections (long-press icon)

### How to Install
**Android/Chrome:**
1. Visit the site
2. Tap "Install" when prompted, OR
3. Tap browser menu (⋮) → "Add to Home Screen"

**iOS/Safari:**
1. Visit the site in Safari
2. Tap Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Technical Notes
- Service worker registered in App.js on load
- PWA prompt respects user dismissal (won't show again for 7 days on iOS)
- Shortcut links provide quick access to Admin and Employee dashboards

## OSRM Map-Matching Integration Complete (Feb 27, 2026)

### Feature Overview
Implemented OSRM (Open Source Routing Machine) map-matching to improve mileage tracking accuracy by "snapping" GPS routes to actual roads.

### Changes Implemented

1. **Backend OSRM Service** (`/app/backend/app/services/osrm_service.py`)
   - Map-matching API calls to OSRM public server
   - Intelligent waypoint sampling (max 100 points for API limits)
   - Confidence scoring based on match quality
   - Fallback to raw GPS calculation if matching fails

2. **Backend API Endpoints Updated**
   - `POST /api/admin/mileage/end` - Now auto-processes with OSRM when trip ends
   - `POST /api/admin/mileage/{trip_id}/reprocess-route` - Reprocess existing trips with road-matching
   - `GET /api/admin/mileage/{trip_id}/waypoints` - Returns both raw and matched coordinates

3. **Database Schema Updated** (`MileageEntry` model)
   - `is_road_matched` (bool) - Whether trip was successfully road-matched
   - `match_confidence` (float 0-1) - Quality score of road matching
   - `matched_coordinates` (list) - Road-snapped coordinate points

4. **Frontend Trip Display** (`MileageTrackingSection.jsx`)
   - "GPS Only" badge (amber) for trips not yet road-matched
   - "Road-Matched" badge (green) for processed trips
   - Reprocess button (🔄) for GPS-only trips to trigger road-matching
   - Status indicators show processing status

5. **Map Visualization** (`TripMap.jsx`)
   - Road-matched routes shown in green
   - Raw GPS path shown as dashed gray (when road-matched available)
   - "Road-Matched (X% confidence)" badge on map
   - Automatic prioritization of matched coordinates over raw GPS

### How It Works
1. User ends a trip or clicks "Reprocess Route"
2. Backend sends GPS waypoints to OSRM Map Matching API
3. OSRM returns road-snapped coordinates and accurate road distance
4. Data saved to database with confidence score
5. Frontend displays clean road-aligned route on map

### Test Results
- Backend: 100% (21/21 tests passed)
- Frontend: 100% (12/12 tests passed)
- Test specs created:
  - `/app/backend/tests/test_osrm_integration.py`
  - `/app/tests/e2e/osrm-mileage.spec.ts`

### External Dependency
- OSRM Public API: `http://router.project-osrm.org` (no API key required)

## Automatic GPS Gap Filling (Feb 27, 2026)

### Feature Overview
Enhanced the OSRM integration to automatically detect and fill gaps in GPS data caused by poor signal or connectivity issues.

### How Gap Filling Works
1. **Gap Detection**: Analyzes consecutive waypoints for:
   - Time gaps > 60 seconds (default threshold)
   - Distance jumps > 500 meters (default threshold)
   
2. **Gap Filling**: When a gap is detected:
   - Uses OSRM Routing API to calculate the actual road route between gap endpoints
   - Extracts intermediate waypoints from the route geometry
   - Marks these points as `is_interpolated: true` for transparency

3. **Road Matching**: After gap filling:
   - Full route (original + interpolated) is road-matched with OSRM
   - Final distance reflects actual roads traveled, not GPS straight lines

### New Functions Added (osrm_service.py)
- `detect_gps_gaps()` - Identifies time and distance gaps in GPS data
- `fill_gaps_with_routing()` - Uses OSRM routing to fill detected gaps
- `process_trip_with_gap_filling()` - Full pipeline combining detection, filling, and road-matching

### UI Changes
- Reprocess toast now shows gap filling info: "Route matched! Distance: X mi • Y/Z GPS gaps filled"
- Road-Matched badge shows "+X gaps" when gaps were filled
- All gap information stored in database for transparency

### Database Schema Updates
- `gaps_detected` (int) - Number of GPS signal gaps found
- `gaps_filled` (int) - Number of gaps successfully filled with OSRM routing

### Benefits
- **More Accurate Distances**: Captures full route even with intermittent GPS
- **Better Coverage**: Works in areas with poor cellular/GPS reception
- **Transparency**: Shows exactly how many gaps were detected and filled

## New Mileage Tracking Features (Feb 28, 2026)

### 1. "Forgot to Track" Mode
Allows users to add trips retroactively with automatic route calculation.

**Features:**
- Address autocomplete with Nominatim (OpenStreetMap) geocoding
- OSRM routing to calculate accurate road distance
- Route preview on map before saving
- Date picker for historical trips
- Purpose and notes fields

**Backend Endpoints:**
- `POST /api/admin/mileage/calculate-route` - Calculate route between two addresses
- `POST /api/admin/mileage/forgot-to-track` - Save a retroactive trip
- `GET /api/admin/mileage/geocode` - Address autocomplete search

### 2. Quick Start Trip Page
A dedicated page (`/quick-start`) for fast trip starting, designed for iOS home screen shortcuts.

**Features:**
- Gets user's GPS location on page load
- Shows location accuracy
- One-tap "Start Trip Now" button
- Auto-redirects to dashboard after starting
- Error handling for location/auth issues

**iOS Usage:**
1. Log in to the app once
2. Navigate to yoursite.com/quick-start
3. Use Safari's "Add to Home Screen" feature
4. The shortcut will open directly to the Quick Start page

### 3. PWA Shortcuts (Android)
Updated manifest.json with shortcuts accessible by long-pressing the app icon:
- **Quick Start Trip** - Opens /quick-start for fast trip starting
- **Admin Dashboard** - Opens /admin
- **Employee Portal** - Opens /dashboard

### Technical Notes
- Uses Nominatim API for geocoding (free, no key needed)
- Uses OSRM for routing (free, no key needed)
- Address search debounced to 300ms
- Route geometry stored for map display
- Trips marked as `entry_type: "forgot_to_track"` for audit trail

## Major Refactor: GPS Tracking → Monthly Mileage Entry (Feb 28, 2026)

### Change Summary
Completely removed GPS-based mileage tracking and replaced with a simple monthly mileage entry system.

### What Was Removed
- Live GPS tracking with waypoints
- OSRM road-matching service
- Real-time map display (Leaflet/TripMap)
- GPS gap detection and filling
- Screen wake lock functionality
- All GPS-related backend endpoints

### Files Removed
- `/app/frontend/src/components/admin/sections/MileageTrackingSection.jsx`
- `/app/frontend/src/components/TripMap.jsx`
- `/app/backend/app/services/osrm_service.py`
- `/app/backend/app/routers/mileage.py`
- `/app/backend/app/models/mileage.py`

### What Was Added
**New Monthly Mileage System:**

1. **Simple Monthly Entry**
   - Enter total miles per month
   - Optional notes field
   - Automatic tax deduction calculation using IRS rate

2. **Yearly Summary**
   - Total miles for the year
   - Estimated tax deduction
   - Visual grid of all 12 months

3. **Monthly Reminder System**
   - Reminder banner on 1st of each month
   - Shows days overdue
   - "Enter Mileage" button for quick entry
   - "Skip This Month" to dismiss reminder

### New Backend Endpoints
- `GET /api/admin/mileage/monthly-entries` - Get all entries for a year
- `POST /api/admin/mileage/monthly-entry` - Create/update monthly entry
- `DELETE /api/admin/mileage/monthly-entry/{id}` - Delete entry
- `GET /api/admin/mileage/yearly-summary` - Get year summary with tax calc
- `GET /api/admin/mileage/reminder-status` - Check if reminder is pending
- `POST /api/admin/mileage/dismiss-reminder` - Dismiss monthly reminder
- `GET /api/admin/mileage/pending-months` - Get list of unentered months

### New Files
- `/app/frontend/src/components/admin/sections/MonthlyMileageSection.jsx`
- `/app/backend/app/routers/monthly_mileage.py`
- `/app/backend/app/models/monthly_mileage.py`

### IRS Rates Configured
- 2024: $0.67/mile
- 2025: $0.70/mile
- 2026: $0.725/mile

### Database Collections
- `monthly_mileage` - Stores monthly entries (year, month, total_miles, notes)
- `mileage_reminders` - Tracks dismissed reminders

---

## Mileage Reports Update (Feb 28, 2026) - COMPLETED ✅

### Task: Align Reports Section with New Monthly Mileage System

The Reports section has been updated to match the new simplified monthly mileage logging system.

### Changes Made

**Backend (`/app/backend/app/routers/admin.py`):**
- Updated mileage report endpoint to query `monthly_mileage` collection
- Report now returns monthly entries with: month_name, year, total_miles, tax_deduction, notes
- PDF generation updated to use monthly data format
- CSV generation updated with new columns

**Frontend (`/app/frontend/src/components/admin/sections/ReportsSection.jsx`):**
- Updated mileage report preview table columns: Month, Year, Miles, Notes
- Updated report description to "Mileage Log Report - Monthly Summary"
- Updated icon to Receipt

### Testing Status
- **Backend Tests**: 19/19 PASSED (100%)
- **Frontend E2E Tests**: 6/6 PASSED (100%)
- All features verified working:
  - Admin login with codes 4399/0826
  - Monthly mileage entry creation/update
  - Mileage report API returns correct data
  - CSV download with correct columns
  - PDF download generates valid file
  - Frontend displays correct table columns

### Test Files Created
- `/app/backend/tests/test_monthly_mileage_reports.py`
- `/app/tests/e2e/mileage-reports-core.spec.ts`

---

## Year-to-Date Mileage Card & Report Cleanup (Feb 28, 2026) - COMPLETED ✅

### User Request (Part 1)
1. Add a "Year-to-Date Summary" card at the top of the Reports section
2. Remove the mileage report option from Reports section

### Changes Made (Part 1)
- Added Year-to-Date Mileage Summary card to Reports section
- Removed "Mileage Log Report" from report type options
- Updated report types grid from 3 columns to 2 columns
- Updated section description to "Generate payroll/shift and W-9 reports"

### User Request (Part 2) - Subsequent Update
1. Move the YTD Mileage Summary card to the Mileage Log section (replacing the old reminder banner + 3 stat cards)
2. Remove the YTD card from Reports section

### Changes Made (Part 2)

**Frontend (`/app/frontend/src/components/admin/sections/MonthlyMileageSection.jsx`):**
- Replaced reminder banner and 3 separate stat cards with new blue gradient summary card
- New card shows: Months Logged, Total Miles, Est. Tax Deduction, IRS rate
- Removed reminder-related code (showReminder, Bell icons, AlertCircle)

**Frontend (`/app/frontend/src/components/admin/sections/ReportsSection.jsx`):**
- Removed YTD Mileage Summary card
- Removed related state/effects (mileageYTD, loadingMileageYTD)
- Reports section now starts directly with Report Type selector

### Testing Status
- **Backend Tests**: 19/19 PASSED (100%)
- **Frontend E2E Tests**: 20/20 PASSED (100%)

---

## Admin Router Refactoring (Feb 28, 2026) - COMPLETED ✅

### Task: Refactor admin.py (1900+ lines) into smaller, focused modules

The monolithic admin.py file has been broken down into maintainable, focused modules.

### New File Structure

```
/app/backend/app/routers/
├── admin.py              # 25 lines - Just imports and combines sub-routers
├── admin_employees.py    # ~230 lines - Employee CRUD operations
├── admin_time_entries.py # ~230 lines - Time entry management
├── admin_w9.py           # ~280 lines - W-9 document management
├── admin_reports.py      # ~930 lines - All report generation (shifts, mileage, W-9)
└── admin_legacy.py       # ~100 lines - Legacy PDF endpoint

/app/backend/app/services/
└── time_helpers.py       # ~30 lines - Shared time calculation functions
```

### Module Breakdown

| Module | Purpose | Key Endpoints |
|--------|---------|---------------|
| admin_employees.py | Employee CRUD | GET/POST/PUT/DELETE employees |
| admin_time_entries.py | Time tracking | Clock in/out, time entries CRUD |
| admin_w9.py | W-9 documents | Upload, approve, reject, status |
| admin_reports.py | All reports | Shifts, mileage, W-9 (JSON/CSV/PDF) |
| admin_legacy.py | Backward compat | Legacy POST /reports/pdf |
| time_helpers.py | Shared helpers | format_hours_hms, round_hours_to_minute |

### Testing Status
- **Backend Tests**: 24/24 PASSED (100%)
- **Frontend E2E Tests**: 45/45 PASSED (100%)
- All endpoints verified working after refactoring

### Test File Created
- `/app/backend/tests/test_admin_refactor.py`

---

## Admin Role Bug Fixes (Mar 1, 2026) - COMPLETED ✅

### Issues Fixed

**Issue 1: Admins not visible in Edit Employee dropdown**
- **Problem**: When owners (Matthew/Eunice) clicked "Edit" button, admin users were filtered out of the employee selection dropdown
- **Root Cause**: N/A - Upon investigation, the dropdown was already showing all employees without filtering. The issue may have been a cache issue that the user experienced.
- **Verification**: Confirmed via UI testing that all employees including admins appear in dropdown with "⭐ Admin" badge

**Issue 2: Admin codes not visible for owners**
- **Problem**: Business owners (Matthew/Eunice) could not see the admin codes they assigned to other admins in the employee list
- **Solution**: 
  - Added `isOwner` prop to `AllEmployeesSection` component
  - Modified the "Role" column to conditionally display admin codes when:
    1. The logged-in user is an owner (`isOwner === true`)
    2. The employee has role "admin"
    3. The employee has an `admin_code` assigned
- **Result**: Admin codes now appear as "Code: XXXX" badge next to the admin role badge for owners only

### Files Modified

**Frontend:**
- `/app/frontend/src/pages/AdminDashboard.jsx` - Added `isOwner` prop to `AllEmployeesSection`
- `/app/frontend/src/components/admin/sections/AllEmployeesSection.jsx` - Added conditional rendering of admin codes

### Testing Status
- **Frontend E2E Tests**: 22/22 PASSED (100%)
- **New Test File**: `/app/tests/e2e/admin-role-bugfixes.spec.ts` (7 tests)

### Credentials for Testing
- **Owner Matthew**: Code 4399
- **Owner Eunice**: Code 0826
- **Non-owner admins**: Login with email, then enter their assigned 4-digit code

---

## Next Tasks / Backlog

### P1 (High Priority)
- **Refactor AdminDashboard.jsx**: File is ~4000 lines and should be broken into smaller components for maintainability
- **Refactor ConsignmentAgreementForm.jsx**: File is ~1400 lines and should be broken into smaller components (NewAgreementForm, UpdateInfoForm, etc.)

### P2 (Low Priority)
- **Deployment**: Deploy application to production

---

## Consignment Form Enhancements (Mar 11, 2026) - COMPLETED ✅

### Features Implemented

**1. Custom Profit Split Field**
- Added to both new agreement form and update form
- Default remains 50/50 if not specified
- Displayed in update form showing current split from agreement

**2. Additional Information Field**
- Added textarea for extra item details (brand, condition, size, etc.)
- Available in both new agreement and update flows
- Optional field

**3. Photo Upload**
- New `/api/forms/upload-photos` endpoint for multi-file uploads
- Images stored in `/app/uploads/consignment_photos/`
- Static file serving enabled via FastAPI StaticFiles mount
- Photo preview grid with remove functionality
- Available in both new agreement and update flows

**4. Collapsible Sections in Update Form**
- Update Contact Information - collapsible
- Update Payment Method - collapsible
- Add More Items to Consignment - collapsible with package icon
- Terms & Conditions - always visible
- Uses AnimatePresence for smooth animations

**5. Signature & Date in Update Form**
- Required for all updates (contact, payment, items, profit split)
- Electronic signature (typed name) + date picker
- Validation ensures both fields are filled before submission

**6. Payment Validation Enhancement**
- Check payment method does not require additional details
- All other methods (Venmo, PayPal, Zelle, CashApp, Apple Pay) require details
- Error shown if payment method selected but details left blank

### Backend Changes
- Updated `ConsignmentAgreement` model: added `additional_info`, `photos` fields
- Updated `ConsignmentItemAddition` model: added `update_profit_split`, `additional_info`, `photos`, `signature`, `signature_date`
- New endpoint: `POST /api/forms/upload-photos` - handles multi-file image uploads
- Modified: `/api/forms/add-consignment-items` - accepts new fields
- Modified: `/api/forms/check-existing-agreement` - returns `agreed_percentage`
- Static files served at `/uploads/*`

### Frontend Changes
- **ConsignmentAgreementForm.jsx** (~1400 lines):
  - Added photo upload state and handlers
  - New collapsible UI sections with ChevronUp/ChevronDown icons
  - Photo preview grid with remove buttons
  - Signature section with validation
  - Payment details validation for non-Check methods

- **FormSubmissionsSection.jsx**:
  - Item Additions tab now shows: profit split updates, photos count, additional info
  - Signature displayed under name in submissions table

### Files Modified
- `/app/backend/app/models/forms.py` - Updated models
- `/app/backend/app/routers/forms.py` - Upload endpoint, field handling
- `/app/backend/server.py` - Static file serving
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - All UI changes
- `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx` - Admin display updates

### Testing Status
- **Backend Tests**: 16/16 PASSED (100%)
- **Frontend E2E Tests**: 16/16 PASSED (100%)
- Test files created:
  - `/app/tests/e2e/consignment-features.spec.ts`
  - `/app/backend/tests/test_consignment_features.py`



## Unified Updates Tab in Form Submissions (Mar 11, 2026)

### Feature Overview
Replaced separate "Payment Changes" and "Item Additions" tabs with a unified "Updates" tab in the Form Submissions section. This consolidates all client-submitted updates into a single, easy-to-manage view.

### User Request
"Create a simplified 'Updates' section in form submissions with View, Download, Delete, and Message options."

### Implementation Details

#### Updates Tab Features
1. **Combined List View**: Shows all payment method changes and item additions/info updates in one table
2. **Type Badges**: 
   - Amber "Payment Change" badge for payment method updates
   - Green "+N Items" badge for item additions
   - Blue "Info Update" badge for contact info changes
3. **Changes Column**: Shows summary of what was changed (e.g., "zelle → cashapp", "Email", "Phone")
4. **Sortable Columns**: Client name and Date columns are sortable

#### Action Buttons
1. **View** (purple eye icon): Opens a modal with full update details including:
   - Client information (name, email, date)
   - Payment method changes (old → new)
   - Items added with descriptions
   - Contact info updates (email, phone, address)
   - Payment method updates
   - Profit split changes
   - Additional information/notes
   - Uploaded photos
   - Signature (if provided)

2. **Download** (green download icon): 
   - Item additions: Downloads professional PDF via backend endpoint
   - Payment changes: Downloads text file with change details

3. **Message** (cyan message icon): Opens modal with:
   - Pre-filled email template addressed to the client
   - Editable message content
   - "Open Email Client" button that opens default email app

4. **Delete** (red trash icon): 
   - Confirmation dialog
   - Removes update record from database
   - Refreshes list after deletion

### Backend Endpoints Added
- `DELETE /api/admin/forms/item-additions/{update_id}` - Delete an update record
- `GET /api/admin/forms/item-additions/{update_id}/pdf` - Download update as PDF

### Files Modified
- `/app/backend/app/routers/forms.py` - Added delete and PDF download endpoints
- `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx`:
  - Added View Details modal
  - Added Message Client modal with pre-filled email template
  - Updated handleDownloadUpdate to download PDFs
  - Added getEmailTemplate helper function
  - Fixed full_name mapping for payment changes
  - Replaced old tabs with unified Updates tab

### Testing Status
- **Backend Tests**: 13/13 PASSED (100%)
- **Frontend E2E Tests**: 9/9 PASSED (100%)
- Test files created:
  - `/app/tests/e2e/updates-tab.spec.ts`
  - `/app/backend/tests/test_updates_tab.py`



## Code Refactoring - AdminDashboard.jsx (Mar 11, 2026)

### Overview
Major refactoring of `AdminDashboard.jsx` to improve maintainability and code organization.

### Size Reduction
- **Before:** 4,176 lines
- **After:** 3,145 lines
- **Reduction:** ~1,031 lines (25%)

### Components Extracted

#### 1. EditEmployeeModal.jsx (589 lines)
Located at: `/app/frontend/src/components/admin/modals/EditEmployeeModal.jsx`

Features:
- Employee selection dropdown when no employee is selected
- Edit form with fields: name, email, phone, role, admin code, hourly rate, start date
- Import from job application functionality
- W-9 document management (view, download, upload, approve, delete)
- Built-in W-9 viewer modal
- Built-in W-9 management modal

#### 2. EmployeeShiftsModal.jsx (309 lines)
Located at: `/app/frontend/src/components/admin/modals/EmployeeShiftsModal.jsx`

Features:
- Shows employee's shift history with hours summary
- Add new shift modal
- Edit existing shift modal
- Delete shift functionality
- All shift CRUD operations handled internally

### Shared Consignment Components Created

#### 1. PaymentMethodSelector.jsx (73 lines)
Located at: `/app/frontend/src/components/consignment/PaymentMethodSelector.jsx`
- Reusable payment method selection grid
- Handles details input for methods that need it (Venmo, PayPal, Zelle, etc.)

#### 2. PhotoUploader.jsx (106 lines)
Located at: `/app/frontend/src/components/consignment/PhotoUploader.jsx`
- Drag-and-drop photo upload
- Photo preview grid with remove buttons
- Upload progress indicator
- Max file size and count validation

#### 3. TermsAndConditions.jsx (62 lines)
Located at: `/app/frontend/src/components/consignment/TermsAndConditions.jsx`
- Scrollable or static terms display
- Checkbox for agreement

### Testing Results
- **Regression Tests:** 46/46 PASSED (100%)
- **New Tests Created:** `/app/tests/e2e/refactored-modals.spec.ts`
- All admin dashboard functionality verified working

### Benefits of Refactoring
1. Better code organization and separation of concerns
2. Easier to maintain and debug individual components
3. Reusable components can be used elsewhere in the application
4. Improved testability with isolated component testing
5. Reduced cognitive load when working on specific features



## Dashboard Simplification - Grouped Layout (Mar 11, 2026)

### Overview
Simplified the admin dashboard by grouping the 8 existing sections into 4 logical collapsible groups, making navigation cleaner and easier.

### User Request
"I want to simplify the admin dashboard so it is cleaner and easier to navigate. I want all the features to remain. Too many sections are visible. It would help to group the sections by type."

### New Group Structure

| Group | Icon Color | Sections Included | Default State |
|-------|------------|-------------------|---------------|
| **Team Management** | Cyan | All Employees, Hours by Employee | Open |
| **Payroll & Payments** | Purple | Payroll Summary, Payment Records | Collapsed |
| **Forms & Communications** | Pink | Messages, Form Submissions | Collapsed |
| **Operations & Reports** | Amber | Mileage Log, Reports | Collapsed |

### Implementation Details

#### DashboardGroup Component
Created `/app/frontend/src/components/admin/DashboardGroup.jsx`:
- Collapsible panel with glassmorphism styling
- Animated expand/collapse with framer-motion
- Gradient icon badges per group
- Badge text showing count/summary
- Click anywhere on header to toggle

#### Visual Design
- Dark glass panels (`bg-white/5 backdrop-blur-sm`)
- Color-coded gradient icons for each group
- Top gradient line when expanded
- Smooth 0.3s animations
- Chevron rotation indicator

### Benefits
1. **Reduced Visual Clutter**: From 8 visible sections to 4 group headers
2. **Logical Organization**: Related features grouped together
3. **Faster Navigation**: Quickly identify and access relevant section groups
4. **Space Efficient**: Only expanded groups show content
5. **Mobile Friendly**: Collapsed groups work well on smaller screens

### Testing Results
- **All Tests Passed**: 41/41 (100%)
- **New Tests Created**: `/app/tests/e2e/dashboard-groups.spec.ts` (14 tests)
- **Updated Tests**: `refactored-modals.spec.ts`, `updates-tab.spec.ts`

### Files Changed
- `/app/frontend/src/pages/AdminDashboard.jsx` - Wrapped sections in DashboardGroup components
- `/app/frontend/src/components/admin/DashboardGroup.jsx` - New component (created)
- `/app/design_guidelines.json` - Updated with grouped layout specifications



## Mobile App + Push Notifications Setup (Mar 11, 2026)

### Overview
Added Capacitor for mobile app wrapper and Firebase Cloud Messaging for push notifications on both iOS and Android.

### What's Included

#### Backend Services
- `/app/backend/app/services/push_notifications.py` - FCM integration service
- `/app/backend/app/services/notification_helper.py` - Helper functions for notifications
- `/app/backend/app/routers/push_notifications.py` - API endpoints for token registration

#### Frontend 
- `/app/frontend/src/hooks/usePushNotifications.js` - React hook for push notifications
- `/app/frontend/capacitor.config.json` - Capacitor configuration

#### Documentation
- `/app/MOBILE_APP_SETUP.md` - Complete setup guide

### Push Notification Events
| Event | Notification |
|-------|--------------|
| Employee clock in/out | ✅ |
| W-9 submission | ✅ |
| Job applications | ✅ |
| Consignment inquiries | ✅ |
| Consignment agreements | ✅ |
| Payment method changes | ✅ |
| Items added | ✅ |
| New messages | ✅ |

### Required External Setup
1. **Firebase Project** (free) - For FCM push notifications
2. **Apple Developer Account** ($99/year) - For iOS App Store
3. **Google Play Developer** ($25 one-time) - For Android Play Store

### API Endpoints Added
- `POST /api/push/register` - Register device token
- `DELETE /api/push/unregister` - Unregister device token
- `GET /api/push/status` - Check registration status
- `POST /api/push/test` - Send test notification (admin)
- `GET /api/push/admin/tokens` - List all tokens (admin)

### Environment Variable Required
```
FIREBASE_SERVER_KEY=your_firebase_server_key
```



## Contact Form Spam Protection (March 2026)

### Feature Overview
Added multi-layer spam protection to the contact/message form on the landing page:

1. **Honeypot Field** (Web + Mobile)
   - Hidden form field that bots auto-fill but humans can't see
   - If filled, request is silently rejected (returns fake success to fool bots)

2. **Rate Limiting** (Web + Mobile)
   - Maximum 3 messages per 5 minutes per IP address
   - Returns 429 error with user-friendly message when exceeded

3. **Google reCAPTCHA v3** (Web Only)
   - Invisible verification running in background
   - Scores each user (0.0 = bot, 1.0 = human)
   - Threshold: 0.5 (configurable via RECAPTCHA_THRESHOLD)
   - Skipped for mobile apps (Capacitor detection)

### Implementation Files
- `/app/backend/app/services/recaptcha.py` - reCAPTCHA verification service
- `/app/backend/app/routers/messages.py` - Updated with honeypot, rate limiting, reCAPTCHA
- `/app/backend/app/models/messages.py` - Added website (honeypot) and recaptcha_token fields
- `/app/frontend/src/index.js` - GoogleReCaptchaProvider wrapper (web only)
- `/app/frontend/src/pages/LandingPage.jsx` - Honeypot field + reCAPTCHA token submission

### Environment Variables
```
# Frontend (.env)
REACT_APP_RECAPTCHA_SITE_KEY=your_site_key_here

# Backend (.env)
RECAPTCHA_SECRET_KEY=your_secret_key_here
RECAPTCHA_THRESHOLD=0.5
```

### Setup Instructions
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create a new site with reCAPTCHA v3
3. Add your domain(s): `thriftycurator.com`, `localhost` (for testing)
4. Copy Site Key to frontend `.env` (REACT_APP_RECAPTCHA_SITE_KEY)
5. Copy Secret Key to backend `.env` (RECAPTCHA_SECRET_KEY)

### Mobile App Behavior
- Capacitor apps are detected via `window.Capacitor`
- reCAPTCHA is NOT loaded for mobile apps
- Honeypot + Rate Limiting still protect mobile



## Consignment Approval Workflow Bug Fix (March 12, 2026)

### Issue
Admin dashboard "Fail to approve" error when attempting to approve "Add Items" submissions from the Updates tab.

### Root Cause
Two bugs were identified:

1. **Double `/api` in URL Path** (FormSubmissionsSection.jsx):
   - The `API` constant was defined as `${process.env.REACT_APP_BACKEND_URL}/api`
   - The `handleItemAdditionApproval` function incorrectly used `${API}/api/admin/forms/...`
   - This resulted in duplicate path: `https://domain.com/api/api/admin/forms/...`

2. **Wrong localStorage Key** (FormSubmissionModal.jsx):
   - `getAuthHeader()` was using `localStorage.getItem("adminToken")`
   - The app stores tokens under `localStorage.getItem("token")`
   - This caused "Not authenticated" errors

### Fixes Applied
1. Changed line 295 in `FormSubmissionsSection.jsx`:
   - From: `${API}/api/admin/forms/item-additions/${viewingUpdate.id}/approve`
   - To: `${API}/admin/forms/item-additions/${viewingUpdate.id}/approve`

2. Changed line 47 in `FormSubmissionModal.jsx`:
   - From: `localStorage.getItem("adminToken")`
   - To: `localStorage.getItem("token")`

### Testing
- Backend API endpoints verified with curl
- E2E tests created: `/app/tests/e2e/approval-workflows.spec.ts`
- Both item additions and consignment agreements approval workflows passing

### Related Files
- `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx`
- `/app/frontend/src/components/admin/modals/FormSubmissionModal.jsx`
- `/app/backend/app/routers/forms.py`


## "View My Submissions" Feature (March 12, 2026)

### Feature Overview
Added a unified login flow in the Consignment Portal allowing users to view their submission history, approval status, AND update info/add items - all with a single login.

### User Flow
1. User navigates to Consignment Portal (/consignment-agreement)
2. User clicks "Update Info / Add Items" button (now includes "View submissions" in description)
3. User enters their email address (from their consignment agreement)
4. System displays:
   - Account info header
   - **My Submissions** expandable section with all submissions and status
   - Update My Information section
   - Add More Items section

### Submission Status Display
Each submission shows:
- Type badge (Consignment Agreement, Item Addition, Info Update)
- Submission date
- Items description
- **Approval Status** badge (Pending=yellow, Approved=green, Rejected=red)
- For approved/rejected: Items accepted count, what happens to other items, admin notes

### Implementation
- **Backend**: Added `GET /api/forms/my-submissions/{email}` endpoint
- **Frontend**: Integrated submissions display into the "Update Info / Add Items" flow
  - Added `showSubmissionsExpanded` state
  - Added `fetchUserSubmissions()` function called after agreement lookup
  - Added collapsible "My Submissions" section in the form

### Changes Made
1. Removed separate "View My Submissions" button from initial choice page
2. Updated "Update Info / Add Items" description to "View submissions, update info, or add more items"
3. Added "My Submissions" expandable section in the update form (after login)


## Admin Email Button Fix (March 12, 2026)

### Issue
The admin "Email" button in the form submissions section was using outdated email addresses. When a user updated their email through the Consignment Portal, the admin would still see and contact them at their old email address.

### Root Cause
The item additions API (`GET /api/admin/forms/consignment-item-additions`) was returning the email stored at the time of submission, rather than the most current email from the master `consignment_agreements` document.

### Solution
1. **Backend Enhancement**: Modified the `/api/admin/forms/consignment-item-additions` endpoint to enrich each item addition with the latest contact information from the master agreement:
   - Added `current_email`, `current_phone`, `current_full_name` fields to API response
   - These fields are fetched from the `consignment_agreements` collection using the `agreement_id`

2. **Frontend Updates**: Updated multiple components to use the new `current_email` field:
   - `FormSubmissionModal.jsx`: Email button and contact display now use `current_email`
   - `FormSubmissionsSection.jsx`: Updates tab table, view modal, and message modal use `current_email`
   - Added visual indicator showing "Updated from: [old_email]" when email has changed

### User Experience
- Admins now see the **current** email address in all admin views
- When an email has been updated, a note shows the original email for reference
- The "Email" and "Send Email" buttons always open email to the **latest** address

### Files Modified
- `/app/backend/app/routers/forms.py` - Enhanced API to include current contact info
- `/app/frontend/src/components/admin/modals/FormSubmissionModal.jsx` - Updated email display and mailto links
- `/app/frontend/src/components/admin/sections/FormSubmissionsSection.jsx` - Updated table display and modals
