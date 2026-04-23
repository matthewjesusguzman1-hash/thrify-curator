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

### 2026-02 — CVSA Split-Sleeper shift-boundary rule (current session)
- Per-CVSA fix across `SplitSleeperPage.js` + `hosScenarios.js`: under the sleeper-berth provision, the 14-hr work shift STARTS at the END of the FIRST qualifying rest segment and ENDS at the BEGINNING of the SECOND qualifying rest segment (§395.1(g)(1)(ii)). The 10-hour Continuous Break rule is unchanged.
- Updated `shiftMarkers`, `countedBrackets` and descriptions on SL1 (7+3), SL1 extras (7.5+2.5, 3+7-reversed), SL2 (8+2), SL2 extras (9+2, 8-SB-first), SL5 Day 1 + Day 2 overnight, SL5-b (shift crossing midnight), SL5-c (10h straight SB = full reset).
- Rewrote SP2 log to a realistic 11-hr driving violation under the CVSA window: `SB 00-08 · D 08-12 · OD 12-13 · D 13-21 · OFF 21-24` → shift 08:00-21:00 · 12h drive / 13h on-duty / 11-hr violation.
- Fixed SP1 (shift 13:00-17:00, counted 4/4), SP3 (counted 10/10 — was 14/10), SP4 (counted 6/8 — was 19/8). SL3, SL4, SP3, SP4 invalid-split scenarios retain 14-hr wall-clock boundaries.
- Updated QuestionsStack hint in SplitSleeperPage.js to cite CVSA rule verbatim.
- EldGrid received `data-testid="eld-entry-{idx}"` on selectable duty blocks (testing agent helper — no behavior change).

### 2026-02 test_reports/iteration_28.json — 100% frontend pass
- 13/13 checkpoints: CVSA bullets visible · SL1-SL5 + extras · SP1-SP4 full 4-question flow · shift-time validation tolerates ±10 min · hours ±0.5. No runtime errors.

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

### 2026-02 — Split Sleeper Trainer decoupled + NASI-A references stripped
- **Dedicated Split Sleeper Trainer**: new `/hours-of-service/split-sleeper` route rendering `SplitSleeperPage.js` with two tabs — **Learn** (4 step-by-step walkthroughs: 10-hr reset, 7+3 split, 8+2 split, invalid pairings) and **Practice** (block editor + live verdict for arbitrary day builds; 4 preset days: valid 7+3, valid 8+2, invalid 6+4, invalid 5+5-SB).
- **HoursOfServicePage CTA redesign**: two side-by-side buttons — `hos-training-cta` (Log Book Training, navy/gold) and `hos-split-sleeper-cta` (Split Sleeper Trainer, white/navy) — kept independent from the 70-hr calc below.
- **Removed embedded `SplitModule` + `PeriodSlider`** from `HosTrainingPage.js` to eliminate duplication.
- **Stripped every NASI-A manual reference** from the UI: scenario `manualRef` fields gone, drill header subtitles cleaned, HoS page caption rewritten to "5 quiz drills · property-carrying rules". Only **49 CFR Part 395** citations remain.
- **Removed `BADGES` export** from `hosScenarios.js` (gamification had been pulled from UI earlier; the dead export is now gone too).
- **Bug fix**: `validateSplit` used "7/3"/"8/2" labels — changed to "7+3"/"8+2" to match preset buttons and walkthroughs.
- **Bug fix**: PracticeTab split validation used clamped-at-midnight entries, making `preset-valid-8-2` render red. Now derives rest-candidate durations from raw `blocks[].hours` so midnight wrapping doesn't affect the verdict.

### 2026-02 test_reports/iteration_17.json
- Frontend Playwright: 5/5 PASS (100%). `hos-training-btn` pill in HoS sticky header → opens training grid. 6 modules present. Learn-first flow intact. EldGrid bracket annotations render above the grid. Recap Learn + Quiz both render per-day mini-ELDs with on-duty brackets. Split Sleeper preset-valid-7-3 still green 'Legal 7+3 split'.

### 2026-02 — Learn-first training + bracket-annotated ELD grids
- **Training entry moved into HoS header**: compact gold `Training` pill in the top-right of the 60/70-hr Calculator sticky header (next to Clear). The previous full-width body CTAs are gone.
- **6 modules** on `/hours-of-service/training`: Duty Status, 14-Hour, 11-Hour, 30-Min Break, 70-Hour Recap, **Split Sleeper Trainer** (6th tile, navigates to the standalone `/hours-of-service/split-sleeper` interactive page).
- **Learn-first flow**: every non-split module opens a Learn view FIRST — rule intro + numbered sections each pairing plain-English explanation with an example ELD log. Quiz is a secondary option (primary `take-quiz-btn` CTA at the bottom + compact `skip-to-quiz-btn` pill in the Learn header).
- **Bracket annotations on EldGrid**: new `brackets` + `shade` props draw roadside-style corner brackets (with labels) above the duty grid to call out the exact span each rule counts — 14-hr window, 11-hr driving cumulative, 8-hr drive + break, violation spans, on-duty segments, etc.
- **70-Hour Recap upgrade**: each day in both Learn visual and Quiz now renders as a **miniature ELD log** (synthesized via `synthesizeDayLog`) with gold brackets drawn over the on-duty (D+OD) runs — so inspectors practice reading a log the way they would roadside, instead of staring at a single abstracted number.
- **Helpers added**: `onDutyBrackets(entries)` auto-derives bracket sets from duty runs; `synthesizeDayLog(onDutyHours)` generates a realistic mixed log for a given total.

### 2026-02 test_reports/iteration_19.json
- Frontend Playwright: 12/12 PASS (100%). Every §x.y CFR citation in HOS Training + Split Sleeper renders as a clickable `[data-testid=cfr-link]` anchor pointing to `ecfr.gov/current/title-49/section-{major}.{minor}`. Inline refs (e.g. §395.2 in the utility-service-vehicle definition) are auto-linkified via the new `CfrText` component. `49 CFR Part 395` falls back to the part index page.

### 2026-02 — CFR reference links
- **New utility** `/app/frontend/src/lib/cfrLinks.js`: `linkifyCitation(text)` parses any §X.Y(…) citation and `<CfrText>` renders strings with auto-linked references pointing to the eCFR (`https://www.ecfr.gov/current/title-49/section-{major}.{minor}`). Keeps existing text styling; links are underline-dotted → solid on hover.
- Applied across: Learn view headers and intro/body/summary prose, Duty Status feedback, Violation-Finder + Recap feedback, Exemptions header/intro/card-CFR/card-summary/card-conditions, Split Sleeper header + Learn descriptions + Practice explanations.
- Enhanced exemption prose (oilfield, agricultural, utility-service, driver-salesperson, hawaii) to include inline §x.y definition references that now auto-link. Added §395.1(g)(1)(ii), §395.3(a)(2/3) inline citations to Split Sleeper Learn descriptions.
- `49 CFR Part 395` (no specific section) links to `/current/title-49/part-395`.


### 2026-02 test_reports/iteration_18.json
- Source review: 100% PASS for (1) ds5 per-question CFR/explanation override, (2) 7th module tile `module-exempt` + ExemptionsView accordion, (3) SplitSleeperPage Learn/Practice rewrite.
- Playwright runtime couldn't assert across routes due to an auth-session quirk with programmatic pushState navigation (real user clicks work — iteration_17 already validated in-app nav path).

### 2026-02 — Duty Status #5 clarified + HOS Exemptions + Split Sleeper redesign
- **Duty Status ds5** (passenger seat): per-question `explain` + `cfr` override. Feedback now cites **49 CFR §395.2 · §395.1(g)(1)(i)(A)** and explains the 3-hour passenger-seat carve-out (requires ≥7 consecutive hours in sleeper berth). `DutyStatusQuiz` uses `q.explain || DUTY_STATUS_EXPLAIN[q.answer]` and `q.cfr || "49 CFR §395.2"` so only edge-case scenarios need overrides.
- **HOS Exemptions module** (7th training tile `module-exempt`) — dedicated `ExemptionsView` with two accordion groups:
  - **Top (9)**: 150-mi short-haul, 16-hr short-haul, adverse driving, emergency, driver-salesperson, oilfield, agricultural, covered farm vehicle, utility service.
  - **Others (9)**: construction, motion picture, Alaska, Hawaii, retail-holiday, bees, livestock, hi-rail, pipeline welding.
  - Each card expands to show summary + bulleted qualifying conditions + CFR citation. Source: NASI-A Part A Module 6.
- **Split Sleeper Learn tab** rewritten — 4 scenario cards (legal 7+3, legal 8+2, invalid 6+4, invalid longer-period-not-SB) with GREEN brackets on qualifying rest periods and GOLD brackets on hours that count toward 11 & 14. Each has an inspector's-math description.
- **Split Sleeper Practice tab** rewritten — interactive flow: (1) user taps rest blocks on the grid to identify qualifying split periods; (2) submit reveals correct/wrong/missed via in-grid color marks; (3) three graded follow-up questions stack: valid split (Y/N), 11/14 violation (none/11/14/both), counted hours toward 11 & 14 (two numeric inputs). Every answer gets a per-scenario explanation. 4 scenarios cycle.
- **EldGrid** got `selectableIndices`, `selectedIndices`, `onEntryClick`, `blockMarks` props for the interactive block-selection overlay.


## Backlog (P0 → P2)
- **P0 ON HOLD**: **Photo Annotator + Quick Photos** — UI entirely hidden (header buttons, per-violation attach, routes redirect to /inspections) pending the user's agency decision on whether to store photos at all. Code kept intact for later reactivation.
- **P1 ✅ SHIPPED** — HOS Log Book Training: Learn-first flow + 6 modules + bracket-annotated ELD grids + standalone Split Sleeper Trainer. Property-carrying only. Extension ideas: passenger-carrying rules, short-haul exemption, adverse driving, RODS falsification drill (source material in `/app/memory/references/hos-section.pdf`).
- **P1**: Offline/cached mode for field use (cache violation tree + last N inspections for offline access)
- **P2**: Refactor `server.py` into modular routes (`/app/backend/routes/*`)
- **P2**: Refactor `BridgeChartPage.js` / `HoursOfServicePage.js` / `HazMatHelpers.js` into smaller components
- **P2**: Additional Inspector Tools — Spec Marking Decoder, Retest Date Calculator, OOS Quick Reference
- **P2**: Device-storage indicator in the Customize Header / admin menu

## Test Credentials
- Standard User — Badge `042`, PIN `1234`
- Admin User — Badge `121`
