# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a reselling application with web and native mobile (iOS/Android) versions. The app features distinct portals for consignors, employees, and admins.

## Core Features

### Completed
- **Job Application Visitor Tracking (May 2, 2026)**:
  - Added silent visitor tracking on the `/apply` page (invisible to applicants)
  - Visitor stats displayed in Admin Dashboard > Forms & Communications > Form Submissions > Job Applications
  - Shows unique visitors and total page views (excludes Matthew & Eunice)
  - Includes 7-day activity mini-chart

- **Job Application Work History Update (May 2, 2026)**:
  - Modified Work History section to show only the most recent employer by default
  - Added "+ Add Another Employer" button to dynamically add more work history entries
  - Each additional employer entry has a delete button (trash icon)
  - Added `/apply` route alias for `/job-application` page

- **Sales Data Section UI Refinements (May 2, 2026)**:
  - "Average Days to Sale" moved to Reports section only (not in main stats)
  - Calculation fixed: now shows days from listing to sale for items LISTED in selected year
  - 2026 avg is now 20.1 days (was incorrectly showing 186 days)
  - Report Builder simplified (removed Report Type dropdown)
  - Platform filter buttons removed (were non-functional)
  
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
- **Sales Data Section UI (May 2, 2026)**: Need user to verify:
  - Avg Days to Sale displays correctly in Reports (20.1 days for 2026)
  - Platform buttons are gone
  - Report Builder is simplified (no Report Type dropdown)
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
- `/app/frontend/src/components/admin/sections/SalesDataSection.jsx` - Sales analytics with CSV import, YoY charts, reports
- `/app/frontend/src/components/admin/sections/PayrollHistorySection.jsx` - Compact employee payroll breakdown
- `/app/frontend/src/components/admin/sections/PaymentRecordsSection.jsx` - Payment records with pay period selection
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - NEEDS REFACTOR (4000+ lines)
- `/app/backend/app/routers/payroll.py` - Payroll endpoints including pay periods
- `/app/backend/app/routers/inventory.py` - Vendoo CSV import and analytics endpoints

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

## iOS App Store Submission Checklist

### Required Info.plist Privacy Keys
Add these to `ios/App/App/Info.plist` in Xcode:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos of items and receipts</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to upload item images</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to track mileage for business trips</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app tracks your location in the background to accurately log business mileage</string>

<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID for secure and quick login</string>
```

### Build Configuration
Before building for App Store submission:

1. **Ensure Production Backend URL** in `frontend/.env`:
   ```
   REACT_APP_BACKEND_URL=https://thrifty-curator.com
   ```

2. **Rebuild and sync**:
   ```bash
   cd frontend
   yarn build
   npx cap sync ios
   ```

3. **Verify in Xcode** that the app doesn't show "Frontend Preview Only" message

### App Store Connect - Review Information
When submitting, provide in the **App Review Information** section:

- **Demo Account Username:** `4399`
- **Demo Account Password:** (leave blank or put "N/A")
- **Notes for Reviewer:**
  ```
  To test the app:
  1. Enter "4399" in the Email field on the login screen
  2. Tap "Continue"
  3. This will log you in as an admin user with full access
  
  The app is a business management tool for a reselling company.
  Admin features include: employee time tracking, consignment management, 
  GPS mileage tracking, and payroll management.
  ```

### Common Rejection Reasons & Fixes
1. **Guideline 2.1(a) - App Completeness / Login Failed**
   - Cause: App pointing to preview backend (which sleeps) instead of production
   - Fix: Rebuild with `REACT_APP_BACKEND_URL=https://thrifty-curator.com`

2. **Privacy Crash (TCC Violation)**
   - Cause: Missing NSCameraUsageDescription or other privacy keys
   - Fix: Add all required privacy keys to Info.plist

3. **UIBackgroundModes "processing" rejection**
   - Cause: Declared background processing without using it
   - Fix: Remove "processing" from Background Modes in Xcode Signing & Capabilities

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`

## Critical Deployment Note
The user tests on their native iOS app which points to their *Production Backend*, while the Emergent preview modifies the *Preview Backend*. After making backend changes, instruct the user to "Deploy to Custom Domain" so their iOS app can receive the fix.
