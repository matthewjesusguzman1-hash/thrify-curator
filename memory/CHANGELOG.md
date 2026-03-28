# Thrifty Curator - Changelog

## [Mar 28, 2026] - GPS Tracker Refactoring & Component Extraction

### Added
- Created `/app/frontend/src/components/admin/sections/gps-tracker/` folder with extracted components:
  - `TripRow.jsx` - Reusable trip display row
  - `MileageSummaryTabs.jsx` - Today/Month/Year summary tabs
  - `HierarchicalTripList.jsx` - Collapsible trip history view
  - `ManualTripForm.jsx` - Manual trip entry form
  - `EditTripModal.jsx` - Trip editing modal
  - `TripMapModal.jsx` - Trip route map viewer
  - `MileageAdjustmentModal.jsx` - Silent mileage adjustment
  - `index.js` - Component exports

### Changed
- Updated `GPSMileageTracker.jsx` to import new sub-components (partial integration)
- Fixed missing icon imports after initial refactor
- Maintained backward compatibility with existing inline code

### Technical
- Components are ready for full integration in future refactor pass
- Main file still functional with inline code
- Total file size: ~2250 lines (reduced from 2287)

---

## [Mar 28, 2026] - Hierarchical Trip View

### Added
- Scrollable, hierarchical "Recent Trips" section in GPS Mileage Tracker
- **Today tab**: Simple flat list of today's trips
- **Month tab**: Collapsible days → trips accordion
- **Year tab**: Collapsible months → days → trips accordion
- `TripRow` reusable component for compact trip display
- `expandedMonths` and `expandedDays` state for accordion control

### Changed
- Trip history now dynamically renders based on selected summary tab
- Each trip row shows purpose icon, miles, deduction, and action buttons
- Scrollable container with max-height (max-h-64)

### Technical
- File: `/app/frontend/src/components/admin/sections/GPSMileageTracker.jsx`
- Lines added: ~350 (hierarchical rendering logic)
- Total file size: ~2288 lines

---

## [Feb 24, 2026] - W-9 Dark Theme & Button Verification

### Fixed
- Applied dark theme to Edit Employee modal W-9 section
- Removed duplicate code in AdminDashboard.jsx (lines 2908-2928)
- All W-9 action buttons verified working across all sections

### Tested
- 28/28 frontend E2E tests passed
- 13/13 backend API tests passed
- Spec files: admin-w9-management.spec.ts, employee-w9-section.spec.ts, edit-employee-w9.spec.ts

---

## [Feb 24, 2026] - W-9 Feature Redesign

### Added
- Messaging-style W-9 submission form with notes field (Employee Portal)
- W-9 Management Modal in All Employees section
- Preview, Download, Approve, Delete buttons for each W-9 document
- Status badges (Pending/Approved)

### Changed
- W-9 upload endpoint now accepts `notes` field
- Each W-9 document now has unique `id`

---

## [Feb 24, 2026] - Deployment Preparation

### Fixed
- Moved hardcoded URLs to environment variables
- Added defensive guards to prevent API calls with undefined IDs

---

## [Feb 24, 2026] - Mileage Section Bug Fixes

### Fixed
- Backend: Made `user_name` optional in MileageEntryResponse model
- Frontend: Fixed input fields losing focus in mileage form

---

## [Feb 24, 2026] - AdminDashboard Refactoring

### Added
- AllEmployeesSection.jsx (439 lines)
- TimeEntriesSection.jsx (200 lines)
- HoursByEmployeeSection.jsx (155 lines)
- ShiftReportModal.jsx (395 lines) - created, not integrated
- PayrollModal.jsx (390 lines) - created, not integrated
- TimeEntryModal.jsx (204 lines) - created, not integrated

### Changed
- AdminDashboard.jsx reduced from 5778 to ~5350 lines

---

## [Feb 24, 2026] - Calendar Date Range Filter Fix

### Fixed
- Messages section date filter now uses pending state pattern
- User can select date range without messages disappearing

---

## [Feb 24, 2026] - Messaging Enhancements

### Added
- Collapsible message rows
- Message search bar
- Browser push notifications toggle

### Changed
- All sections auto-refresh when expanded

---

## [Feb 24, 2026] - In-App Messaging Center

### Added
- Message submission modal on landing page
- Messages section in Admin Dashboard
- Reply via Email, Mark as Read, Delete actions
- API endpoints: POST /api/messages/, GET /api/messages/admin/all, etc.

---

## [Feb 23, 2026] - Multiple Sessions

### Added
- Phone number support for employees
- Collapsible payroll check records
- Multi-admin code support (Matthew: 4399, Eunice: 0826)
- W-9 viewing modal (replaced forced download)
- Mileage tracking with GPS and manual entry
- Mileage pause/resume functionality
- Back to top button

### Fixed
- Notification dropdown mobile positioning
- Employee pay period sync
- W-9 corrections handling

### Refactored
- MileageTrackingSection extracted
- PayrollCheckRecordsSection extracted
- FormSubmissionsSection extracted

---

## [Feb 22, 2026] - Initial Implementation

### Added
- Landing page with two-column layout
- Platform links (eBay, Poshmark, Mercari, Depop, Facebook)
- Social links (TikTok, Facebook, Message)
- QR code and share functionality
- Job Application, Consignment Inquiry, Consignment Agreement forms
- Passwordless JWT authentication
- Employee clock in/out
- Admin dashboard with employee management
- Payroll reports with PDF export
- W-9 document management
