# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Build a "Thrifty Curator" reselling application with:
- Mobile app conversion (iOS/Android) using Capacitor
- Push notifications for user engagement
- Consignment portal for consignors to track submissions
- Admin dashboard for business management
- Email notifications for key actions

## Current Status
The web application is fully functional. iOS app has been built and uploaded to App Store Connect. Android app has been built as a signed `.aab` file.

### What's Been Implemented

**Core Application (Complete)**
- Full-stack React/FastAPI/MongoDB application
- Admin dashboard with employee management, payroll, forms, and reports
- Employee portal with time tracking and mileage logging
- Consignment workflow (inquiry → agreement → item additions)
- Payment processing for employees and consignment clients

**Mobile App (In Progress)**
- Capacitor integration for iOS and Android
- iOS app built, archived, and uploaded to App Store Connect
- Android `.aab` file generated for Play Store submission
- Push notifications setup needs iOS capabilities enabled in Xcode

**Email Integration (Complete)**
- Resend email service integrated
- Transactional emails for user and admin actions
- Test email functionality (hidden behind triple-click on Admin Dashboard)
- Default sender email: thriftycurator1@gmail.com

**Password & Session Management (March 18, 2026) - IMPLEMENTED**
1. **Employee Password System**: Employees can now have passwords set for secure login
   - Password field appears when employee has a password set
   - Admin can set/reset/remove employee passwords
   - Login flow: Enter email → shows password field if password is set → authenticate
2. **Password Management Section**: New admin dashboard section for managing all passwords
   - Employees tab: View/set/reset passwords for all employees (non-admins)
   - Consignors tab: View/set/reset passwords for consignment clients
   - Info banner explaining that admins use access codes (not passwords)
3. **Session Management**: Session timeout logic added to App.js
   - 15-minute inactivity timer with automatic logout
   - Activity listeners for clicks, keydowns, touch, and scroll events
4. **Edit Employee Modal**: Password section added for employees (not admins)
   - View password status (set/not set)
   - Set new password or reset existing
   - Remove password option

**Recent Changes (March 14, 2026)**
1. Removed "Add to Home Screen" button from landing page
2. Set default sender email to thriftycurator1@gmail.com
3. Removed all individual refresh buttons (kept only master refresh)
4. Hidden email settings button (accessible via triple-click on "Admin Dashboard")
5. Removed Status column from Job Applications and Consignment Inquiries tables
6. Fixed clock-in location check with 15-second safety timeout and cancel button
7. Updated location permission denied instructions to prompt reload first
8. Fixed Payment Records tabs to be responsive on mobile
9. **Created custom picker modals for Employee and Consignment Client selection** (fixes iOS native select issue)
10. Updated employee dropdown to show ALL employees except owners (6 total)
11. Updated consignment dropdown to show ALL agreement submitters (18 total)

## Architecture

### Frontend (`/app/frontend`)
- React with Tailwind CSS and shadcn/ui components
- Capacitor for mobile app wrapping
- Pages: Landing, Auth, Admin Dashboard, Employee Dashboard, Forms

### Backend (`/app/backend`)
- FastAPI with MongoDB
- Routers: auth, admin, employees, forms, payroll, mileage
- Services: email_service (Resend integration)

### Key Files
- `/app/frontend/src/App.js` - Main app with routing and push notification initialization
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin interface
- `/app/frontend/src/components/admin/sections/PaymentRecordsSection.jsx` - Payment records with custom picker modals
- `/app/frontend/src/pages/EmployeeDashboard.jsx` - Employee dashboard with location checking
- `/app/backend/app/services/email_service.py` - Email handling
- `/app/backend/app/routers/payroll.py` - Payment and employee endpoints
- `/app/frontend/ios/App/` - iOS native project

## Priority Backlog

### P0 (Critical - Blockers)
1. **iOS Push Notifications** - Need to enable capabilities in Xcode:
   - Add "Push Notifications" capability
   - Add "Background Modes" capability with "Remote notifications"
   - Increment build number and upload to App Store Connect
2. **iOS App Store Submission** - After push notifications confirmed working

### P1 (High Priority)
1. Android Play Store submission guidance
2. APNs key configuration for backend push notification sending

### P2 (Medium Priority)
1. Refactor `ConsignmentAgreementForm.jsx` (large monolith)
2. Add more comprehensive test coverage

## Key API Endpoints
- `GET /api/admin/payroll/all-employees-for-payment` - All employees except owners
- `GET /api/admin/payroll/consignment-clients` - All consignment agreement submitters
- `POST /api/admin/test-email` - Send test email
- `GET /api/admin/email-status` - Check email service status

**Password Management Endpoints (NEW)**
- `GET /api/auth/employee/has-password/{email}` - Check if employee has password set
- `POST /api/auth/employee/set-password` - Employee sets their own password
- `GET /api/admin/employees/passwords` - Get all employee password statuses
- `POST /api/admin/employees/{id}/set-password` - Admin sets employee password
- `DELETE /api/admin/employees/{id}/password` - Admin removes employee password
- `GET /api/forms/admin/consignment-passwords` - Get all consignor password statuses
- `POST /api/forms/admin/consignment-password/reset` - Admin resets consignor password

## Key Credentials
- Admin login: matthewjesusguzman1@gmail.com with code 4399
- Email sender: thriftycurator1@gmail.com
- Resend API key: Stored in backend/.env

## User Guidance Notes
The user is non-technical but capable of following specific command-line and UI instructions on their Mac. Provide clear, step-by-step guidance for any Xcode or terminal operations.
