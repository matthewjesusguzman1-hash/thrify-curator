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
- **Tax Returns Archive (Apr 1, 2026)**:
  - Year-round section in Admin Dashboard under Operations & Reports
  - **Collapsible section** - starts collapsed by default
  - **Only shows years with data** - filters to years with income or uploaded returns
  - Badges: "Filed" (green) for uploaded returns, "Has Income Data" (blue) for income-only years
  - Upload, download, and delete filed tax return PDFs
  - Backend: `/api/financials/tax-returns/{year}` CRUD endpoints
  - Files stored in `/app/uploads/tax-returns/{year}/`
  - Testing: 100% pass (10/10 backend, 18/18 frontend)
- **1099-NEC Email PDF Attachment (Apr 2, 2026)**:
  - Contractors now receive the actual 1099-NEC PDF attached to emails
  - Supports both draft PDFs (auto-generated via reportlab) and filed documents (user-uploaded)
  - Email service updated to support Resend attachments
  - Testing: 100% pass (13/13 backend tests)
- **Mileage Tracking Consolidation (Apr 4, 2026)**:
  - **Single source of truth**: GPS Mileage Tracker is the ONLY place to enter/view mileage
  - **Removed duplicate Mileage section** from Financials (was redundant)
  - **Automatic Tax Prep flow**: All trips from GPS Mileage Tracker automatically flow to Tax Prep deductions
  - **Fixed manual trip entry bug**: Save button was passing click event, breaking validation
  - **Fixed $0 deduction bug**: YTD summary field name mismatch corrected
  - **IRS Rate**: 2026 mileage rate set to $0.725/mile
  - Backend updated: Tax Prep summary pulls mileage from `gps_trips` collection
  - Testing: 100% pass (19/19 tests)

### In Progress / Pending User Verification
- **Pay Period Label Fix (Apr 13, 2026)**: FIXED - When no hours exist in the current pay period, the Employee Dashboard now shows "Previous Pay Period" instead of "Current Pay Period". Also added Year-to-Date (YTD) paid amount display that pulls from actual payment records.
- **Payment Records Pickers Fixed (Apr 13, 2026)**: FIXED - Employee and Consignment Client picker modals were causing a React error ("Target container is not a DOM element") when opened. The issue was `AnimatePresence` combined with `createPortal` not playing well together. Fixed by:
  1. Removing `AnimatePresence` wrapper from the picker modals
  2. Using plain `div` elements instead of `motion.div` for the portals
  3. Both Employee Picker and Consignment Client Picker now work correctly on mobile
  4. Modal opens, displays list of available employees/clients, and selection correctly populates the form
- **GPS Bounce-Back Fix (Apr 7, 2026)**: IMPLEMENTED - Added robust bounce-back detection that:
  1. Tracks the start point and maximum distance traveled
  2. Rejects any point that jumps back more than 50% of the furthest distance reached
  3. Rejects any point within 100 feet of an older point (excluding last 2 points)
  4. Applies to both the `useGPSTracking` hook and internal `GPSMileageTracker` fallback tracking
- **Live Map During GPS Tracking (Apr 7, 2026)**: IMPLEMENTED - Added real-time map view that shows during active GPS trips. The map displays the route as you drive, with a pulsing current-location marker.
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
- **IN PROGRESS**: Complete GPSMileageTracker.jsx refactor (components created, not fully integrated)
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

### Implemented: GPS Mileage Tracker (Mar 27-28, 2026)
**Real-time GPS tracking for business mileage with IRS deduction calculations**

**Features Implemented:**
- Start/Pause/Resume/Stop trip controls
- Real-time GPS tracking (background on native, foreground on web)
- Live distance calculation using Haversine formula
- Auto-calculate IRS deduction at $0.725/mile (2026 rate)
- Trip purpose selection: Post Office, Sourcing, Other
- Custom notes field when "Other" is selected
- Receipt photo upload capability
- Tabbed mileage summary (Today | Month | Year) with stats
- Manual trip entry (Log Trip Manually)
- Edit/Delete trip functionality
- Silent mileage adjustments (Adjust button)
- Collapsible live map during tracking
- **Hierarchical trip history (Mar 28, 2026)**:
  - Today: Simple flat list
  - Month: Collapsible days → trips accordion
  - Year: Collapsible months → days → trips accordion
  - Scrollable container with max-height
  - `TripRow` component for compact trip display

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

### Implemented: Taxes & Deductions Feature (Mar 30, 2026)
**Dual-mode tax system: Year-round Financials Dashboard + Seasonal 5-step Tax Prep Portal**

**Year-Round Financials Dashboard (FinancialsSection.jsx):**
- Summary cards: Gross Sales, COGS, Deductions, Net Profit
- Year-over-year comparison with trend indicators
- Collapsible sections: Sales Data, Deductible Expenses, Mileage
- Add/Delete Expenses with 19 IRS-recognized categories
- Add/Delete Mileage trips with IRS rate ($0.70/mile for 2025)
- Tax Prep banner (shown Jan-Apr) linking to Tax Prep Portal

**5-Step Tax Prep Portal (TaxPrepPage.jsx, TaxPrepStepPage.jsx):**
- Linear wizard with progress tracking
- Year selector persists across all step pages via URL params
- **Step 1: Income** - Add/Delete 1099s and Other Income by platform
- **Step 2: Cost of Goods** - Add/Delete inventory purchases with source, date, item count
- **Step 3: Deductions** - Review/Add Mileage and Expenses by category
- **Step 4: Documents** - Upload receipts, 1099s, licenses (PDF, JPEG, PNG up to 10MB)
- **Step 5: Generate Reports** - Tax Summary with download options (PDF/CSV)

**Financial Calculations:**
- Gross Profit = Total Income - COGS
- Total Deductions = Expenses + Mileage Deduction
- Net Profit = Gross Profit - Total Deductions
- Mileage Deduction = Total Miles × IRS Rate

**Technical Details:**
- Backend: `/app/backend/app/routers/financials.py` (~560 lines)
- Backend Models: `/app/backend/app/models/financials.py`
- Frontend: `/app/frontend/src/components/admin/sections/FinancialsSection.jsx`
- Frontend: `/app/frontend/src/pages/TaxPrepPage.jsx`, `TaxPrepStepPage.jsx`
- Routes: `/admin/tax-prep`, `/admin/tax-prep/step/:step?year=YYYY`

**API Endpoints:**
- `GET/POST/PUT/DELETE /api/financials/income/{year}` - Income entries
- `GET/POST/PUT/DELETE /api/financials/cogs/{year}` - COGS entries  
- `GET/POST/PUT/DELETE /api/financials/expenses/{year}` - Expense entries
- `GET/POST/DELETE /api/financials/mileage/{year}` - Mileage entries
- `POST /api/financials/documents/upload` - Upload tax documents
- `GET /api/financials/documents/{year}` - List documents
- `GET/PUT /api/financials/tax-prep/progress/{year}` - Step completion tracking
- `GET /api/financials/summary/{year}` - Financial summary
- `GET /api/financials/comparison/{year}` - Year-over-year comparison
- `GET /api/financials/monthly/{year}` - Monthly breakdown for charts
- `POST /api/financials/vendoo/import` - Import Vendoo CSV export
- `GET /api/financials/vendoo/template` - Get Vendoo import format info
- `GET /api/financials/1099/eligible/{year}` - Get consignors with $600+ payouts
- `GET /api/financials/1099/generate/{year}/{email}` - Generate individual 1099-NEC PDF
- `GET /api/financials/1099/batch/{year}` - Generate batch 1099-NEC PDF
- `POST /api/financials/1099/update-tin` - Store recipient TIN from W-9
- `GET /api/financials/tax-summary/{year}/download` - Download tax summary (PDF/CSV)

**Vendoo CSV Import (Mar 30, 2026):**
- Upload Vendoo sales export to auto-populate income data
- Supports filtering by year
- Optional COGS import from Cost of Goods column
- Optional marketplace fees import as expenses
- Platform mapping: eBay, Poshmark, Mercari, Depop, Etsy, Facebook Marketplace
- VendooImportModal with drag-and-drop file upload

**1099-NEC Generation (Mar 31, 2026):**
- Auto-detect consignors who received $600+ in payouts
- Generate IRS-compliant 1099-NEC forms (Copy B for recipient records)
- Individual or batch PDF download
- W-9 TIN storage for official filing
- Form1099Section UI component in Tax Prep Step 5

**AI-Powered Screenshot Import (Mar 31, 2026):**
- Scan Vendoo Analytics or platform dashboard screenshots
- Uses GPT-4o Vision via emergentintegrations library to extract:
  - Gross Revenue, Net Profit, Items Sold, Items Listed, Avg Sale Price
  - Platform name, date range, fees, shipping costs
- "Save & Add Another" continuous entry loop for rapid monthly data entry
- After saving, shows confirmation and "+ Add Another Month" button
- resetForm() clears all fields for seamless next entry
- Uses React Portals for proper modal rendering
- Both "Take Photo" (camera) and "Choose File" (upload) options

**Tax Summary Downloads:**
- PDF and CSV export of Schedule C tax summary
- Includes Gross Income, COGS, Deductions, Net Profit
- Professional formatting with Thrifty Curator branding

**DB Collections:**
- `income_entries` - Income/Sales data
- `cogs_entries` - Cost of Goods Sold
- `expense_entries` - Deductible expenses by category
- `mileage_entries` - Business mileage trips
- `tax_documents` - Uploaded documents (base64 encoded)
- `tax_prep_progress` - Step completion status per year

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
- FinancialsSection.jsx growing large (~1900 lines) - consider extracting modals

## Testing Status (Mar 31, 2026)
- AI Screenshot Import: VERIFIED ✅ (iteration_29.json - 50/50 backend, 5/5 frontend)
- Financials CRUD: VERIFIED ✅
- Screenshot analysis API: VERIFIED ✅

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`
