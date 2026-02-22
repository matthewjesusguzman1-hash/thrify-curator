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

## User Personas
1. **Customers** - Browse platform links, submit consignment inquiries
2. **Job Seekers** - Submit job applications
3. **Employees** - Clock in/out, track work hours (passwordless email login)
4. **Admin** - Manage employees, view shift reports, edit hours, receive notifications (matthewjesusguzman1@gmail.com)

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

## What's Been Implemented (Dec 2025)
- [x] Landing page with Thrifty Curator logo
- [x] Two-column grid layout (Shop/Connect on left, Forms/Employee on right)
- [x] All 5 platform links with actual store URLs
- [x] Connect links: TikTok, Facebook Page, Message Me (email)
- [x] QR code above share button
- [x] Native share API integration
- [x] Job Application form with all required fields
- [x] Consignment Inquiry form with brand list, clothing types, image upload
- [x] Consignment Agreement form with e-signature
- [x] Passwordless JWT authentication (email only, no passwords)
- [x] 24-hour session persistence
- [x] Employee clock in/out with real-time timer
- [x] Hours summary (weekly, total, shifts)
- [x] Admin dashboard: add/remove employees, shift reports with date range filters
- [x] Pre-seeded admin account (matthewjesusguzman1@gmail.com)
- [x] In-app notifications for admin (clock in/out events)
- [x] Admin can edit employee time entries (clock in/out times)
- [x] Admin can delete employee time entries
- [x] Auto-calculation of total hours when editing

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI, MongoDB
- Auth: Passwordless JWT (email only, 24-hour expiry)
- Email: Resend (configured, requires API key for production)

## Architecture
```
/app/
├── backend/
│   ├── server.py         # FastAPI backend with all API endpoints
│   └── tests/            # pytest tests for API
└── frontend/src/
    ├── pages/
    │   ├── LandingPage.jsx        # Two-column layout
    │   ├── AuthPage.jsx           # Passwordless login
    │   ├── AdminDashboard.jsx     # Admin features + notifications + edit hours
    │   ├── EmployeeDashboard.jsx  # Employee clock in/out
    │   ├── JobApplicationForm.jsx
    │   ├── ConsignmentInquiryForm.jsx
    │   └── ConsignmentAgreementForm.jsx
    └── App.js                     # Router
```

## Key API Endpoints
- `POST /api/auth/login` - Passwordless login
- `POST /api/time/clock` - Clock in/out (triggers notifications)
- `GET /api/admin/notifications` - Get admin notifications
- `POST /api/admin/notifications/mark-read` - Mark notifications as read
- `PUT /api/admin/time-entries/{id}` - Edit time entry
- `DELETE /api/admin/time-entries/{id}` - Delete time entry
- `POST /api/admin/reports` - Generate shift reports

## Key Credentials
- **Admin Email**: matthewjesusguzman1@gmail.com (no password needed)

## Prioritized Backlog
### P0 (Critical)
- All complete ✅

### P1 (High Priority)
- Add Resend API key for email notifications to work in production
- Employee schedule/shift management

### P2 (Medium Priority)
- Export hours to CSV/PDF
- Multi-location support
- Inventory integration with platforms

## Next Tasks
1. Configure Resend API key for production email notifications
2. Employee schedule/shift management
3. Export hours to CSV/PDF

## Testing Status
- Backend: 100% pass (43/43 tests)
- Frontend: 100% pass
- Test reports: `/app/test_reports/iteration_3.json`
- Test files: `/app/backend/tests/`

## Notes
- Email notifications are configured but require a valid Resend API key (currently placeholder)
- Console hydration warnings exist in AdminDashboard (non-blocking)
