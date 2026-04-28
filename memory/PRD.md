# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a reselling application with web and native mobile (iOS/Android) versions. The app features distinct portals for consignors, employees, and admins.

## Core Features

### Completed
- **iOS Quick Actions - JavaScript Implementation (Apr 4, 2026)**:
  - Completed frontend listener logic for iOS Home Screen long-press shortcuts
  - `shortcutHandler.js` updated to use dynamic imports (handles web preview gracefully)
  - `AdminDashboard.jsx` now listens for `shortcutAction` custom events and `pendingShortcutAction` localStorage
  - Three shortcuts implemented: `StartTrip` (GPS tracking), `LogMiles` (manual trip entry), `ClockIn` (hours section)
  - `GPSMileageTracker` exposes `openManualEntry()` via `useImperativeHandle` for external control
  - User must add native `Info.plist` and `AppDelegate.swift` code locally for full iOS functionality
- **Web Application**: Full-stack React/FastAPI/MongoDB application
- **Consignment Portal**: View submissions, payment history, manage account, add items with custom commission splits
- **Employee Portal**: Clock-in/out with geolocation verification, view time entries
- **Admin Dashboard**: Manage employees, consignors, payroll settings, approve/reject submissions
- **Email System**: Magic link password reset with rate limiting
- **Password Management**: Set/reset/delete passwords for employees and consignors
- **Face ID/Biometric Login**: Working for both employee and consignment portals
- **Haptic Feedback**: Comprehensive implementation across all pages (as of Mar 22, 2026)
- **Native Geolocation**: Using @capacitor/geolocation for clock-in
- **Native Permissions**: Face ID and Location prompts on iOS
- **Live Activities**: Employee shift timer on lock screen with polling fallback for admin clock-outs (as of Mar 25, 2026)
- **Tax Returns Archive (Apr 1, 2026)**: Year-round section in Admin Dashboard under Operations & Reports
- **1099-NEC Email PDF Attachment (Apr 2, 2026)**: Contractors receive actual 1099-NEC PDF attached to emails
- **Mileage Tracking Consolidation (Apr 4, 2026)**: Single source of truth via GPS Mileage Tracker
- **Payroll History Feature (Apr 28, 2026)**: Comprehensive payroll history tracking in Admin Dashboard

### Completed This Session (Apr 28, 2026)
- **Compact Payroll Layout Verified**: The Payroll Summary and Payroll History sections have been reformatted into a "Compact Mode":
  1. Inline summary stats badges: "To Be Paid", "This Month", "This Year" with pay period dates
  2. Collapsible Employee Breakdown section with 3-column employee selector grid
  3. Compact employee payroll details with period/month/year badges
  4. Collapsible Previous Periods section to reduce scrolling
  5. All data properly syncs with Payment Records

### Pending User Verification
- **Compact Layout (Apr 28, 2026)**: USER VERIFICATION PENDING - Need user to confirm the compact Payroll Summary/History layout meets their space-saving needs
- **Login on Cellular/LTE**: USER VERIFICATION PENDING - Need user to confirm if Xcode `.env` pointing to production domain resolved the issue
- **iOS App Store Rejection**: USER VERIFICATION PENDING - Need user to confirm if removing "processing" from `UIBackgroundModes` resolved the rejection

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
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - NEEDS REFACTOR (4000+ lines)
- `/app/backend/app/routers/payroll.py` - Payroll history endpoints

### Key DB Schema
- `users`: Core data source for calculating `hourly_rate`
- `payroll_check_records`: Source of truth for "Amount Paid" logic
- `time_entries`: Used to calculate "Amount Owed" (gross pay)
- `gps_trips`: GPS mileage tracking data

### Key API Endpoints
- `/api/time/summary` (Employee dashboard source of truth)
- `/api/admin/payroll/summary` (Admin broad summary)
- `/api/admin/payroll/employee/{employee_id}/history` (Individual payroll history)
- `/api/admin/payroll/all-employees-for-payment` (Employees list for payroll)

## Known Issues
- ConsignmentAgreementForm.jsx is a fragile 4000+ line monolith - high risk for changes
- PaymentRecordsSection.jsx complexity causing modal/picker bugs

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`

## Critical Deployment Note
The user tests on their native iOS app which points to their *Production Backend*, while the Emergent preview modifies the *Preview Backend*. After making backend changes, instruct the user to "Deploy to Custom Domain" so their iOS app can receive the fix.
