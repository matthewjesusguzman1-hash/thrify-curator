# Inspection Navigator — PRD

## Original Problem Statement
Full-stack application for CMV inspectors / DOT enforcement to search and filter FMCSA roadside violation data and assist in field inspections.

## Core Requirements
- 7-step HazMat Inspection Worksheet with interactive helpers
- AI + keyword violation search
- Dedicated Level 1 / 2 / 3 Inspection Guidance
- Photo annotation tools (device-only storage)
- Admin panel with biometric login
- Interactive Bridge Chart / Weight Calculator
- Tie-Down (Cargo Securement) Calculator
- Hours of Service 60/70-Hour Calculator with OOS recovery simulator
- Rich "Saved Inspection" store with Recreate-in-Section hydration

## Security Policy
**Photos are stored ONLY on the inspector's device (IndexedDB).** The server never receives photo bytes. Only metadata (photo_id, filename, mime, size, timestamps) is persisted to MongoDB. If the device is lost, the photos are lost — agency has accepted this trade-off.

## Architecture
- Frontend: React + Tailwind + Shadcn UI + IndexedDB (device photos)
- Backend: FastAPI + Motor (MongoDB)
- LLM: OpenAI (GPT-4.1-mini) via Emergent Universal Key — text-only, never for photos
- Auth: badge + PIN; admin badge 121

## Changelog

### 2026-02 — Device-only photos + UI consolidation (current session)
- **Device-only photos**: IndexedDB library (`devicePhotos.js`) + `<DevicePhoto>` component. All upload flows converted to local-save + JSON metadata POST. Server photo endpoints refactored to JSON-only (no multipart). One-time wipe endpoint runs on /api/admin/wipe-photos?badge=121 (executed; 3 inspections cleared).
- **Shipping-paper OCR removed entirely** — camera UI, state, handler, and backend endpoint all deleted. Endpoint returns 410 Gone.
- **Unified 3-button action bar** (Preview · Share · Save) across InspectionDetail, TieDown, HOS, BridgeChart, PhotoAnnotator.
- **Header customization**: tap badge → Customize Header → checklist of nav buttons, saved per-badge in localStorage.
- **Admin refresh button**: loading spinner + success/error toasts + cache-busting query param.
- **Weight Report tolerance logic**: "5% tolerance applied" only shows when it was actually applied (one non-gross overage within 5%). Gross & interior bridge excluded from the count.
- **Interior Bridge** hidden in saved reports when distance wasn't entered.
- **Calculation Details** now mirrors the live Bridge Chart section exactly.
- **Inspection view enhancements**: WLL gauge + count dots for tie-down assessments; green/red row coloring per axle group for weight assessments.
- **Shared PDF utility** (`/lib/pdfShare.js`) used by all pages — generates PDF and triggers native Web Share API (with download+mailto fallback).

### 2026-02 test_reports/iteration_12.json
- Backend: 14/14 PASS for photo refactor + regression (auth, inspections, violations, admin users, OCR=410, wipe=403/200).
- Frontend: code-level review confirmed. Live Playwright blocked by 2-step badge→PIN flow, deferred to manual verification.

### 2026-02 — Lite Mode + Quick Photos redesign
- **Inspection Navigator Lite**: new `LiteModeContext` (persisted per-badge in localStorage) toggled from the badge popover in the header. When on: header nav collapses to `liteAllowed` buttons only (Level 3, HOS, Photos, Inspections, Resources), a gold "LITE" pill appears next to the badge, Dashboard swaps full FilterBar for compact `LiteFilterBar` (single prominent OOS toggle), the "Steps" button is relabeled "Level 3 Steps", and the violation tree/list are force-filtered to `level_iii=Y`.
- **Backend**: `GET /api/violations/tree` now accepts a `level_iii` query param and filters leaves accordingly (server.py:587-593). `/api/stats` exposes `level_iii_count` for dataset sanity checks.
- **Quick Photos redesign**: `/app/frontend/src/pages/QuickPhotos.js` rewritten as a storage-first gallery. Inspector snaps photos back-to-back → thumbnails fill a 3/4-col grid → review and commit the batch (share as PDF contact sheet, save to new/existing inspection, or delete). Optional per-photo note via pencil FAB; notes append to the inspection's note field on save. Draft state (photo IDs + notes) persists in localStorage across reloads.

### 2026-02 test_reports/iteration_13.json
- Backend pytest: 5/5 PASS — tree level_iii filter (1597 → 346, matches stats), violations list filter, stats field, quick-photo attach flow.
- Frontend Playwright: login → badge popover → lite-mode-toggle → LITE pill → LiteFilterBar → "Level 3 Steps" relabel → toggle off → full bar restored. QuickPhotos: empty state, upload thumb renders, note editor saves, save-to-new-inspection creates inspection with attached photo.
- Regression file: `/app/backend/tests/test_lite_mode_and_quickphotos.py`.

## Backlog (P0 → P2)
- **P1**: Offline/cached mode for field use (cache violation tree + last N inspections for offline access)
- **P2**: Refactor `server.py` into modular routes (`/app/backend/routes/*`)
- **P2**: Refactor `BridgeChartPage.js` / `HoursOfServicePage.js` / `HazMatHelpers.js` into smaller components
- **P2**: Additional Inspector Tools — Spec Marking Decoder, Retest Date Calculator, OOS Quick Reference
- **P2**: Device-storage indicator in the Customize Header / admin menu (show IndexedDB usage)

## Test Credentials
- Standard User — Badge `042`, PIN `1234`
- Admin User — Badge `121`
