# Thrifty Curator - Changelog

## [Sep 11, 2026] - iOS Date Picker Fix & Preview Count Enhancement

### Fixed
- **iOS date capture**: Added `onInput` and `onBlur` handlers alongside `onChange` for date inputs — iOS Safari sometimes fires `input` but not `change` event
- **0 orders root cause**: User's original assignment stored dates as Sept 11–11 (today only) instead of intended Sept 1–11. Now preview count validates before assigning
- **Employee dropdown**: Replaced native `<select>` with tappable chips for iOS compatibility

### Added
- **Live preview count**: Shows order count AND label match count before assigning (e.g., "83 orders found · 5 label matches")
- **Match preview**: Backend `/api/orders/preview-count` now accepts `label_ids` param and returns `{count, match_count}`
- **Assign button count**: Shows "Assign 83 Orders" when count available, disabled when count is 0
- **Zero orders warning**: Red banner "0 orders found for this date range — check your dates"

### Technical
- Files modified: `OrderAssignmentSection.jsx`, `orders.py`
- Testing: 100% pass (11/11 backend, all frontend) — iteration_79

---

## [Sep 11, 2026] - Business Files Multi-page Preview & Download

### Added
- Multi-page document preview with swipe/arrow navigation
- Page indicator (Page X of Y) and dots
- Blob-based download for any device
- Backend page-specific preview endpoint

---

## [Sep 11, 2026] - Business Files Document Vault

### Added
- Admin-only document storage with own tile on home page
- Folders (Bank Account, LLC Formation, Tax, Other) + custom folders
- Tags, OCR search, upload with metadata
- Document rows with preview, print, download, edit, delete

---

## [Sep 11, 2026] - Shipping Labels & Order Assignments

### Added
- Label upload, preview, SKU tagging, auto-name via AI OCR
- Order assignment to employees with date range + labels
- Assignment history (active/completed/incomplete)
- Employee Orders page with matched labels
- Print individual/all labels

---

## [May 2, 2026] - Sales Data Section UI Refinements

### Changed
- Average Days to Sale relocated to Reports section only
- Report Builder simplified — removed "Report Type" dropdown
- Platform filter buttons removed from Sales Data section
- Enhanced Report display with Avg Sale Price

### Fixed
- YoY Chart now shows full year with proper line termination
- Avg Days to Sale calculation fixed

---

## [Mar 28, 2026] - GPS Tracker Refactoring & Hierarchical Trip View

### Added
- Extracted GPS tracker sub-components
- Hierarchical trip view (Today/Month/Year tabs)
- Scrollable trip history with accordion

---

## [Feb 24, 2026] - W-9 Dark Theme & Feature Redesign

### Added
- Messaging-style W-9 submission form
- W-9 Management Modal with Preview/Download/Approve/Delete
- Status badges (Pending/Approved)

### Fixed
- Dark theme applied to Edit Employee modal W-9 section

---

## [Feb 24, 2026] - Mileage, Admin Refactoring, Calendar Fix

### Added
- AllEmployeesSection, TimeEntriesSection, HoursByEmployeeSection extracted
- Messages section with search, notifications, date filtering

### Fixed
- Calendar date range filter, mileage form input focus, deployment prep

---

## [Feb 23, 2026] - Multiple Sessions

### Added
- Phone numbers, collapsible payroll, multi-admin codes
- Mileage GPS + manual entry with pause/resume

---

## [Feb 22, 2026] - Initial Implementation

### Added
- Landing page, platform links, social links, QR code
- Job Application, Consignment forms
- JWT auth, employee clock in/out, admin dashboard, payroll, W-9
