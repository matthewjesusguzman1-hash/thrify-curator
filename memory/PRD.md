# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a reselling application with web and native mobile (iOS/Android) versions. The app features distinct portals for consignors, employees, and admins.

## Core Features

### Completed
- **Web Application**: Full-stack React/FastAPI/MongoDB application
- **Consignment Portal**: View submissions, payment history, manage account, add items with custom commission splits
- **Employee Portal**: Clock-in/out with geolocation verification, view time entries
- **Admin Dashboard**: Manage employees, consignors, payroll settings, approve/reject submissions
- **Email System**: Magic link password reset with rate limiting
- **Password Management**: Set/reset/delete passwords for employees and consignors
- **Face ID/Biometric Login**: Working for both employee and consignment portals
- **Haptic Feedback**: Comprehensive implementation across all pages (as of Mar 22, 2026)
  - Form submissions (heavy press)
  - Navigation/back buttons (light tap)
  - Success/error feedback on actions
- **Native Geolocation**: Using @capacitor/geolocation for clock-in
- **Native Permissions**: Face ID and Location prompts on iOS
- **Live Activities**: Employee shift timer on lock screen with polling fallback for admin clock-outs (as of Mar 25, 2026)
- **Consignment Agreement Form Updated (Mar 25, 2026)**:
  - Added "Number of Items to Consign" field (items_to_add)
  - Added "Items Description" text field
  - Review process now matches item additions (with items count)
  - Cleared old test data from database
- **Consignor Payment Receipt Viewing (Mar 25, 2026)**:
  - Consignors can now view payment receipt images from their portal
  - "View Receipt" button shows for payments with uploaded images
  - Secure endpoint verifies consignor email before serving image
- **Consignor Picker Fixed (Mar 25, 2026)**:
  - Made identical to the working employee picker (simple button element)
  - Works in web preview - awaiting iOS TestFlight verification
- **Login Help Text (Mar 26, 2026)**:
  - Added "Need more help logging in? Send a message from the homepage." to Employee and Consignor login screens
- **Donate or Return Preference (Mar 26, 2026)**:
  - Added to both initial consignment agreement form and Add Items form
  - Consignors can choose "Returned to me" or "Donated" for items not accepted
  - Preference shown in admin review for context when deciding item fate
- **Account Lock Feature (Mar 26, 2026)**:
  - Admins can lock/unlock employee and consignor accounts
  - Locked accounts see "Your account has been locked" error on login
  - Visual indicators in Password Management section (lock status badges)
- **Password Reset Email Fix (Mar 26, 2026)**:
  - Email now properly sending via background task with error logging
  - Verified working via backend logs

### In Progress / Pending User Verification
- **Consignor Picker Fix (Mar 25, 2026)**: Applied iOS-specific touch event handling and CSS to prevent text selection behavior. Needs TestFlight verification.
- **Live Activity Cleanup (Mar 25, 2026)**: Enhanced cleanup logic with multiple retry attempts and visibility change listener. Needs TestFlight verification.
- **Clock-Out Notification Timezone Fix**: Fixed to show correct local time and duration. Needs TestFlight verification.

### Upcoming (P1)
- Guide user through iOS App Store submission
- Guide user through Android app submission (.aab file)
- Update QR code to dynamic link service after app store launch

### Future/Backlog (P2-P3)
- **CRITICAL**: Refactor ConsignmentAgreementForm.jsx (3500+ lines monolith)
- **CRITICAL**: Refactor PaymentRecordsSection.jsx (complexity causing bugs)
- Offline usability features
- Push notification enhancements

### Future Feature: Fast Shipping Labels (P3)
*Saved Mar 27, 2026 - User requested to save for later*

**Current Setup:**
- Using Pirate Ship for label generation
- Carriers: UPS + USPS
- Thermal label printer (DYMO/ROLLO style)
- Volume: 10-15 packages/day
- Admin-only shipping workflow

**Goal:** Minimize clicks/time per label (speed is #1 priority)

**Potential Implementation:**
- Integrate Pirate Ship API or EasyPost for rate comparison
- Saved package presets (e.g., "Poly Mailer 8oz", "Small Box 2lb")
- One-tap label from sold item record
- Auto-fill dimensions from inventory data
- Direct thermal printer integration (ZPL format)
- Batch label printing for multiple orders
- QR code option for no-printer scenarios

**Bluetooth Thermal Printer Support:**
- iOS Bluetooth LE integration via Capacitor
- ZPL/ESC/POS protocol support
- Recommended: Zebra ZD421 or Munbyn Bluetooth

**Tear-Off Pick Ticket Feature:**
- Two-part label: Pick ticket (top) + Shipping label (bottom)
- Pick ticket includes:
  - Date (for filing/records)
  - Order number
  - SKU
  - Item description
  - Storage location
  - Optional: Picked by / Time fields
- Tear off pick ticket after pulling, file for future reference
- Customer only sees standard shipping label
- Paper trail for disputes, returns, audits

### Implemented: GPS Mileage Tracker (Mar 27, 2026)
**Real-time GPS tracking for business mileage with IRS deduction calculations**

**Features Implemented:**
- Start/Pause/Resume/Stop trip controls
- Real-time GPS tracking (background on native, foreground on web)
- Live distance calculation using Haversine formula
- Auto-calculate IRS deduction at $0.725/mile (2026 rate)
- Trip purpose selection: Post Office, Sourcing, Other
- Custom notes field when "Other" is selected
- Receipt photo upload capability
- Year summary with total trips, miles, and deductions
- Trip history with delete capability

**Technical Details:**
- Backend: `/app/backend/app/routers/gps_trips.py`
- Frontend: `/app/frontend/src/components/admin/sections/GPSMileageTracker.jsx`
- Uses `@capacitor-community/background-geolocation` for native background tracking
- Falls back to standard geolocation API for web
- Syncs location data every 30 seconds
- GPS jump filtering (excludes unrealistic distances)
- Receipt storage: `/app/backend/uploads/receipts/`

**API Endpoints:**
- `POST /api/admin/gps-trips/start` - Start a new trip
- `POST /api/admin/gps-trips/update-locations` - Add GPS points
- `POST /api/admin/gps-trips/pause/{trip_id}` - Pause tracking
- `POST /api/admin/gps-trips/resume/{trip_id}` - Resume tracking
- `POST /api/admin/gps-trips/complete` - Complete with purpose/notes
- `POST /api/admin/gps-trips/upload-receipt/{trip_id}` - Upload receipt
- `GET /api/admin/gps-trips/active` - Get current active trip
- `GET /api/admin/gps-trips/history` - Get completed trips
- `GET /api/admin/gps-trips/summary` - Get yearly summary
- `DELETE /api/admin/gps-trips/{trip_id}` - Delete a trip

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
- `/app/frontend/src/hooks/useHaptics.js` - Haptic feedback utility
- `/app/frontend/src/hooks/useBiometricAuth.js` - Face ID/Touch ID logic
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - NEEDS REFACTOR (3500+ lines)
- `/app/backend/app/routers/password_reset.py` - Magic link flow
- `/app/backend/app/routers/auth.py` - Login + account lock endpoints

### Key DB Schema Changes (Mar 26, 2026)
- `consignment_agreements`: Added `rejected_items_preference` field ("return" | "donate"), `is_locked`, `locked_at`, `locked_by`
- `consignment_item_additions`: Added `rejected_items_preference` field
- `users`: Added `is_locked`, `locked_at`, `locked_by` fields

## Known Issues
- Password modals had recurring freeze issues (resolved with React Portals)
- ConsignmentAgreementForm.jsx is a fragile 3500+ line monolith

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`
