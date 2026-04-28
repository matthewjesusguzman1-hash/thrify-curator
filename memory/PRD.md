# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a reselling application with web and native mobile (iOS/Android) versions. The app features distinct portals for consignors, employees, and admins.

## Core Features

### Completed
- **Payment Records Enhancement (Apr 28, 2026)**:
  - Added Pay Period(s) multi-select picker: Users can now select one or more bi-weekly pay periods when recording payments
  - Supports paying for multiple periods at once (e.g., employee who quit mid-period)
  - Edit all fields: Pencil icon now enables editing ALL payment fields including employee name, pay periods, amount, date, description, and image
  - Pay periods displayed in record list and expanded details

- **Compact Payroll Layout (Apr 28, 2026)**: Reformatted Admin Payroll Summary/History into inline compact badges

- **iOS Quick Actions - JavaScript Implementation (Apr 4, 2026)**:
  - Completed frontend listener logic for iOS Home Screen long-press shortcuts

- **Web Application**: Full-stack React/FastAPI/MongoDB application
- **Consignment Portal**: View submissions, payment history, manage account, add items with custom commission splits
- **Employee Portal**: Clock-in/out with geolocation verification, view time entries
- **Admin Dashboard**: Manage employees, consignors, payroll settings, approve/reject submissions
- **Email System**: Magic link password reset with rate limiting
- **Password Management**: Set/reset/delete passwords for employees and consignors
- **Face ID/Biometric Login**: Working for both employee and consignment portals
- **Haptic Feedback**: Comprehensive implementation across all pages
- **Native Geolocation**: Using @capacitor/geolocation for clock-in
- **Native Permissions**: Face ID and Location prompts on iOS
- **Live Activities**: Employee shift timer on lock screen
- **Tax Returns Archive**: Year-round section in Admin Dashboard
- **1099-NEC Email PDF Attachment**: Contractors receive actual 1099-NEC PDF attached to emails
- **Mileage Tracking Consolidation**: Single source of truth via GPS Mileage Tracker
- **Payroll History Feature**: Comprehensive payroll history tracking in Admin Dashboard

### Pending User Verification
- **Compact Layout (Apr 28, 2026)**: Need user to confirm the compact Payroll Summary/History layout
- **Login on Cellular/LTE**: Need user to confirm if Xcode `.env` pointing to production domain resolved the issue
- **iOS App Store Rejection**: Need user to confirm if removing "processing" from `UIBackgroundModes` resolved the rejection

### Upcoming (P1)
- Guide user through iOS App Store submission
- Guide user through Android app submission (.aab file)
- Update QR code to dynamic link service after app store launch

### Future/Backlog (P2-P3)
- **CRITICAL**: Refactor ConsignmentAgreementForm.jsx (~4000 lines monolith)
- **CRITICAL**: Refactor PaymentRecordsSection.jsx (complexity causing bugs)
- Amazon Business Supplies Quick Links
- Vendoo CSV Import & Inventory Dashboard
- Fast Shipping Labels with Pirate Ship integration
- Offline usability features
- Push notification enhancements

## Technical Architecture

### Frontend
- React 18 with Vite
- Capacitor 5 for native iOS/Android
- Tailwind CSS + Shadcn/UI components
- Key plugins: @capacitor/haptics, @capacitor/geolocation, @capgo/capacitor-native-biometric

### Backend
- FastAPI
- MongoDB
- Resend for emails

### Key Files
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin dashboard with compact payroll layout
- `/app/frontend/src/components/admin/sections/PayrollHistorySection.jsx` - Compact employee payroll breakdown
- `/app/frontend/src/components/admin/sections/PaymentRecordsSection.jsx` - Payment records with pay period selection
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - NEEDS REFACTOR (4000+ lines)
- `/app/backend/app/routers/payroll.py` - Payroll endpoints including pay periods

### Key DB Schema
- `users`: Core data source for calculating `hourly_rate`
- `payroll_check_records`: Source of truth for "Amount Paid" logic, now includes `pay_periods` array
- `time_entries`: Used to calculate "Amount Owed" (gross pay)
- `gps_trips`: GPS mileage tracking data

### Key API Endpoints
- `/api/time/summary` (Employee dashboard source of truth)
- `/api/admin/payroll/summary` (Admin broad summary)
- `/api/admin/payroll/employee/{employee_id}/history` (Individual payroll history)
- `/api/admin/payroll/all-employees-for-payment` (Employees list for payroll)
- `/api/admin/payroll/available-pay-periods` (NEW: Get available pay periods for selection)
- `/api/admin/payroll/check-records` (GET/POST/PUT/DELETE payment records)

## Known Issues
- ConsignmentAgreementForm.jsx is a fragile 4000+ line monolith - high risk for changes
- PaymentRecordsSection.jsx is ~1200 lines and growing

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`

## Critical Deployment Note
The user tests on their native iOS app which points to their *Production Backend*, while the Emergent preview modifies the *Preview Backend*. After making backend changes, instruct the user to "Deploy to Custom Domain" so their iOS app can receive the fix.
