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
- Email notifications are configured but require a valid Resend API key (currently placeholder)
- PDF generation uses reportlab library
- Individual employee rates shown with ★ indicator in payroll reports
- Minor React hydration warning in console (cosmetic, does not affect functionality)
- **REFACTORING NEEDED**: AdminDashboard.jsx is still a large monolithic file that needs to be broken down further
