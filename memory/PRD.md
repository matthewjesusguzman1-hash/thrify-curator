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


### 2026-02 — Roadside action cards moved from Level 3 → HOS Training Learn module
- User: roadside actions belonged in HOS Training, not the Level 3 tool. Remove from Level 3 and apply the prominent navy/gold treatment in the appropriate HOS training areas instead.
- Level 3: removed all 22 "Roadside — " items (now empty), removed the `roadside: true` rendering branch in SectionItem, removed the Target import, and reverted the `light` variant on CfrLink. Level 3 renderer is back to its original 3-variant state (sub/highlight/indent).
- HOS Training (HosTrainingPage.js LearnView): added a dedicated "Roadside — what to do" section that renders between the learn sections and the Inspector Takeaway summary. Each item renders as a navy card (#002855 filled, white text, gold #D4AF37 left accent + top-left "ROADSIDE" badge with target icon).
- hosScenarios.js LEARN_CONTENT now carries a `roadside: [...]` string array on each module: duty (3 actions), 14hr (4 actions), 11hr (4 actions), break (3 actions), recap (4 actions). CfrText auto-links any §395.x inside the text.
- Data-test hook: `data-testid="learn-roadside"` on the section + `roadside-action-{i}` per card.
- Verified live: 14hr/11hr/recap learn pages all render 4 navy action cards below the lesson sections; cards are visually dominant and read as the primary call-to-action rather than advisory.


### 2026-02 — Roadside action blocks promoted to prominent navy/gold cards
- User: roadside actions should be MORE prominent and NOT read as advisory side-notes.
- Added a new `roadside: true` item flag to the Level 3 SectionItem renderer. Items with this flag render as filled navy cards (#002855 background, white text, gold #D4AF37 left accent), with a gold "ROADSIDE" badge + target icon pinned top-left.
- The literal "Roadside — " prefix is stripped from the text when rendering (it becomes the badge label), so the narrative reads naturally after the badge.
- CfrLink gained a `light` variant so CFR citations on the navy roadside cards remain readable (gold hover → white).
- All 22 existing "Roadside —" items across the 8 HOS-related sections were flipped from `highlight: true` to `roadside: true` in one pass.
- Visually verified on 430px viewport — roadside cards now dominate each section's closer without reading as warnings.


### 2026-02 — HOS sections: background → highlighted Roadside action block
- User: each HOS section should give the approximate information THEN highlight what to do or check roadside. The inspector needs to know what to DO at roadside.
- Added amber-highlighted "Roadside — ..." action bullets at the end of every HOS-related Level 3 section: Log Book Exempt, eRODS, HOS-Interstate, HOS-Intrastate, Split Sleeper Berth, Personal Conveyance, Log Book Requirements, Electronic Logs (non-eRODS). OOS Duration is already pure roadside action and didn't need additions.
- Each section now reads: brief rule/background → "Roadside — ..." step(s) spelling out the specific action (identify, count, ask, verify, cite, place OOS if X).
- Example — Split Sleeper gets 3 roadside steps: identify qualifying segments, apply CVSA shift boundaries, fall back to 14h wall-clock if invalid split. HOS-Interstate gets 4 roadside steps covering the last-10-hour-break count, active-driving-only OOS rule, 30-min break verification, and 60/70 prior-days review.
- All CFR citations, statute references, and highlighted facts are preserved; the roadside actions are additions, not replacements.


### 2026-02 — ELD Malfunctions topic refocused on driver duties
- User: less emphasis on identifying the specific code, more emphasis on the driver's duty to notify the carrier, revert to paper, and the time allowed.
- Retitled topic "Malfunctions & Data Diagnostic Events" → **"ELD Malfunctions — Driver Duties"**; subtitle "Notify the carrier · run paper · 8-day clock".
- Summary rewritten: ELD malfunctions are almost always readily apparent — the inspector's focus is NOT diagnosing the code but verifying the driver notified the carrier in writing within 24 hours and reverted to paper.
- Reordered sections so driver duties come first (explicitly labeled "this is the focus"), then "How long paper logs are allowed" (carrier 8-day repair clock, paper until fixed — not indefinitely), then "What to check at roadside". The 6-code table demoted to a final single-paragraph "Malfunction codes — background only" section with explicit note that the code doesn't change the driver's duty.
- Removed the separate Data Diagnostic Events section and the standalone Carrier Duties section — both now absorbed into the driver-duty-focused narrative.


### 2026-02 — Level 3 Inspection Guide clarity pass (no content change)
- User asked for the Level 3 help section to be easier to read without changing the underlying information.
- Rewrote every section's items as complete sentences with consistent tone — replacing telegraphic fragments ("Count from last 10 hour break") with clear statements ("Count from the end of the last 10-hour break."). All CFR citations, statute references, Truck Guide Book page pointers, OOS rules, and highlighted callouts preserved.
- Sub-headers (`sub: true`) now render as small-caps, gold-left-border mini-heads — clearly separating the outline chunks within each accordion instead of blending into the list.
- Indented items (`indent: true`) use circle bullets (`list-[circle]`) so they visually nest under their "UNLESS…" or "if:" parent line.
- Examples of clarifying rephrases: 11-hour/14-hour "must be driving at time of violation to be OOS" → "OOS only applies if the driver is actively driving at the time of the X-hour violation"; "Count from end of last 10 hour break" → "Count from the end of the last 10-hour break"; "Violations on previous days logs — note as violation on inspection but NOT OOS" → "If the violation appears on a prior day's log, cite the violation but do NOT place OOS".


### 2026-02 — ELD Registry links + "check every inspection" emphasis
- Linked the FMCSA registered list (https://eld.fmcsa.dot.gov/List) and the revoked list (https://eld.fmcsa.dot.gov/List/Revoked) directly in the ELD Registration topic.
- Added explicit 4-step verification workflow: pull registration ID from transferred file → confirm on registered list → check revoked list → cite §395.22(a) if missing or revoked. Emphasized doing this on EVERY ELD inspection, not just when something looks off.
- Extended `cfrLinks.js` `CfrText` helper to auto-link raw `https://…` URLs alongside CFR citations and `**bold**` — so any future content with URLs renders them as live links without author effort.


### 2026-02 — False RODS vs Tampered ELD rewrite per CVSA Bulletin 2026-02
- Prior content treated the split as "false log (§395.8(e))" vs "manipulated log (CVSA OOS)" which was wrong per the bulletin.
- Correct split: **§395.8(e)(1) False RODS** (ELD works, log is wrong — driver error or misreporting) vs **§395.8(e)(2) Reengineered/Reprogrammed/Tampered ELD** (DEVICE-level alteration — fraudulent accounts, altered data). OOS rules corrected to match bulletin.
- Bulletin examples incorporated verbatim. Ghost driver subsection rewritten to map each scenario to correct §395.8(e) paragraph.

### 2026-02 — CVSA Split-Sleeper shift-boundary rule (current session)
- Per-CVSA fix across `SplitSleeperPage.js` + `hosScenarios.js`: under the sleeper-berth provision, the 14-hr work shift STARTS at the END of the FIRST qualifying rest segment and ENDS at the BEGINNING of the SECOND qualifying rest segment (§395.1(g)(1)(ii)). The 10-hour Continuous Break rule is unchanged.
- Updated `shiftMarkers`, `countedBrackets` and descriptions on SL1 (7+3), SL1 extras (7.5+2.5, 3+7-reversed), SL2 (8+2), SL2 extras (9+2, 8-SB-first), SL5 Day 1 + Day 2 overnight, SL5-b (shift crossing midnight), SL5-c (10h straight SB = full reset).
- Rewrote SP2 log to a realistic 11-hr driving violation under the CVSA window: `SB 00-08 · D 08-12 · OD 12-13 · D 13-21 · OFF 21-24` → shift 08:00-21:00 · 12h drive / 13h on-duty / 11-hr violation.
- Fixed SP1 (shift 13:00-17:00, counted 4/4), SP3 (counted 10/10 — was 14/10), SP4 (counted 6/8 — was 19/8). SL3, SL4, SP3, SP4 invalid-split scenarios retain 14-hr wall-clock boundaries.
- Updated QuestionsStack hint in SplitSleeperPage.js to cite CVSA rule verbatim.
- EldGrid received `data-testid="eld-entry-{idx}"` on selectable duty blocks (testing agent helper — no behavior change).
- **PriorResetBanner**: added a blue-chip banner ("Assume prior day ended with a full 10-hour OFF reset — driver's clocks are fresh at 00:00 of this log.") above every single-day Learn card, every single-day extra example, and every Practice scenario. Multi-day scenarios (SL5, SL5-b, SL5-c) intentionally omit it since they already show the overnight rest themselves.

### 2026-02 — 10-hour-rest-break shift windows + splits available (current session)
- Every single-day Split Sleeper Learn scenario now surfaces the **pre-split shift** running under the 10-hr continuous rule (slate #64748B markers from end of prior 10h reset → start of first qualifying rest) alongside the **CVSA split shift** (primary-color markers between the two qualifying segments).
- SL1 main, SL2 main, and all their single-day extras got 4 shift markers each (Pre-split START/END + CVSA split START/END) with slate + gold countedBrackets showing hours per shift.
- SL3 main: reinterpreted 00:00-12:00 (OFF + SB at start of day) as *extended pre-shift rest* (not a failed split) per CVSA; shift START = 12:00, continues past 24:00. SL3 extras retain 06:00/20:00 14h wall-clock.
- SL4 main + '3h SB + 7h OFF' extra: shift markers 00:00 START + 14:00 END, description enumerates alternative splits that WOULD have worked on the same log shape.
- SL4 extra '10h straight OFF': now renders TWO shifts (Shift 1 slate 00-06, 10h OFF = full reset, Shift 2 green 16:00 START + orange CONTINUES near 24:00).
- EldGrid: label text-anchor clamps to 'start' for markers at <60 min and 'end' for markers at ≥23:00 — prevents long edge labels from clipping past the SVG bounds.
- Descriptions uniformly call out: (a) prior 10h reset ended at 00:00, (b) pre-split shift duration/hours, (c) CVSA split boundaries, (d) alternative split pairings that would have been valid.

### 2026-02 — De-emphasize display/printout as review method
- User: the ELD module was treating on-screen display and printout as co-equal with transfer, which gave the wrong impression about what the primary review method is.
- Renamed topic "Required Data Elements + Roadside Display" → **"Required Data Elements & Review Method"**.
- Rewrote summary to lead with: "The DATA TRANSFER is the required, primary method to review a driver's ELD record at roadside. The ELD's on-screen graph-grid display or printout is a LAST RESORT".
- Added an explicit numbered "Order of preference" section (1. Data transfer → required; 2. Display or printout → LAST RESORT ONLY, available only when transfer cannot be completed for reasons outside the driver's control).
- Relabeled the display section to "If you do fall back to display/printout" with the reminder that it never exempts the driver from a fail-to-transfer citation.
- Updated Nebraska bullet: "treat it as a transfer-failure situation — display/printout is the absolute last resort, not a workaround."
- Removed the "Display/printout is acceptable for the inspector to review" bullet from the Fail-to-Transfer section; the caveat is now framed in terms of attempt documentation only.
- Updated ELD Registration topic so the registration-ID check points to the transferred data file rather than the display/printout.
- Refreshed hub intro paragraph to describe transfer as "the required review method".
- User provided CVSA Inspection Bulletin 2026-02. Prior content treated the split as "false log (§395.8(e))" vs "manipulated log (CVSA OOS)" which was wrong.
- Correct split per bulletin: **§395.8(e)(1) False RODS** (ELD works, log is wrong — driver error or misreporting) vs **§395.8(e)(2) Reengineered/Reprogrammed/Tampered ELD** (DEVICE-level alteration — fraudulent accounts, altered data, etc.).
- OOS rules corrected to match bulletin: (a) §395.8(e)(1) + falsification determined + driver NOT over hours → cite and proceed; (b) §395.8(e)(1) + driver IS over HOS → cite + OOS until HOS eligibility re-established; (c) §395.8(e)(2) + cannot determine actual driving → cite + OOS 10 consecutive hours.
- Bulletin examples incorporated verbatim: PC misuse 3.75h, driving without logging in (unidentified driving with SB mismatch on same VIN), fraudulent ELD accounts with one-digit CDL difference, Tolleson AZ off-duty claim contradicted by Strafford MO fuel receipt.
- Ghost driver subsection rewritten to map each scenario to the correct §395.8(e) paragraph.
- Topic title updated to "False RODS vs Tampered ELD"; subtitle now cites the bulletin.
- Stripped DataQs-specific content per user request. Topic retitled "Save the ELD Data File" (was "Save the ELD File to DataQs / RDR") with subtitle "Critical post-inspection step".
- Content reduced to 3 concise sections: (1) How to save in eRODS — "click **File → Save Data File**"; (2) Why this matters — saved local copy is the authoritative record if data is ever needed; (3) Make it a habit — save on every contact.
- Rewrote the Fail-to-Transfer section in the Data Transfer topic: clarified that §395.24(a) requires the driver to TRANSFER via a prescribed method (Telematics/USB/BT), and that viewing via display/printout is acceptable for HOS review but does NOT satisfy §395.24(a) or exempt the driver from a fail-to-transfer violation. Distinguished "not the driver's fault" (network/eRODS/routing-code issues) from "driver violation" (cannot/will not/refuses). Citation only after the driver has been given the opportunity to transfer AND the inspector has assisted as needed.
- Replaced the Routing Codes subsection with "Routing codes & inspector assistance": removed the reuse-warning and the 3-attempt/timeout note. Added explicit statement that the driver is REQUIRED to have knowledge of and ability to transfer the log (§395.22(h) competency). Inspector MAY assist to expedite the inspection (show transfer menu, help enter routing code, retry) but assistance does not relieve the driver's obligation; cite the violation after opportunity + assistance still yields no successful transfer.
- Removed the now-redundant "When transfer fails" subsection — the fail-to-transfer block covers it authoritatively.
- User requested additions after the initial 9-topic build:
  - **Nebraska state exception** on local transfer methods (Nebraska enforcement uses Telematics only — no USB / Bluetooth) — added as a bullet to `data-transfer` topic with a recommendation to move directly to display/printout when Telematics fails.
  - **Fail-to-Transfer violation caveat** — separate section in `data-transfer` distinguishing driver-caused transfer failures (violation) from network/service/routing-code issues (not a violation); documents required for defensible citation.
  - **Required In-Cab ELD Supplies** — NEW topic covering §395.22(h)(1)-(4): ELD user manual, data transfer instructions, malfunction instructions, blank-logs supply. Includes common roadside findings.
  - **False Logs, Manipulation & Ghost Drivers** — NEW topic contrasting §395.8(e) false log violation with the 2024 CVSA OOS criteria on manipulated ELD logs. Extensive list of common manipulation patterns (driving logged as OD/SB/OFF, unidentified driving matching driver's VIN, personal conveyance misuse, yard-move on public roads, vague annotations, fabricated malfunctions). Ghost-driver sub-section with detection tips at roadside and documentation requirements for a defensible OOS.
  - **Save the ELD File to DataQs / RDR** — NEW topic on the critical post-inspection best practice: save the transfer file locally on EVERY contact, how to save (standard workflow), how to use the file during a Request for Data Review, recovery options if file wasn't saved, muscle-memory habits.
- CfrText enhanced to render `**bold**` markdown as `<strong class="font-bold text-[#002855]">` so content authors can emphasize critical phrases without raw HTML. Bold segments and CFR citations coexist cleanly.
- Intro paragraph updated to reflect 12 topics.
- New tile on /hours-of-service/training (Smartphone icon, "ELD Reference · Devices, data, malfunctions, ~10 min") opens a dedicated expandable-cards view.
- Content: `/app/frontend/src/lib/eldContent.js` with 9 topics covering 49 CFR §395.8 / §395.11 / §395.15 / §395.22 / §395.24 / §395.30 / §395.32 / §395.34.
  - ELD vs Paper Log + Exemptions (short-haul, 8-day, pre-2000 engine, driveaway-towaway, rented ≤8 days)
  - Required Data Elements + Roadside Display (header fields, duty status records, screen vs printout, graph-grid requirements)
  - Data Transfer Methods (Telematics = web+email; Local = USB+Bluetooth; failure fallback; routing codes)
  - Malfunctions & Data Diagnostic Events (6 malfunction codes P/E/T/L/R/S/O, driver duties §395.34, carrier 8-day repair, roadside checks)
  - Unidentified Driving Records (driver claim flow, carrier annotation duty, red flags)
  - Edits/Annotations/Certification (immutable originals, who can edit what, driving time rule, end-of-day certification, annotation requirements)
  - Supporting Documents (§395.11 — 5 categories, 6-mo retention, 10-per-day cap)
  - ELD Registration & Revocation (FMCSA registry, 60-day replacement grace, roadside verification)
  - AOBRD vs ELD Historical (Dec 2019 transition, 4 key ELD-over-AOBRD improvements)
- Component: `EldView` + `EldTopicCard` in `HosTrainingPage.js`. Each card shows topic color, icon, title, 1-line subtitle, and CFR citation. Expand reveals a yellow TL;DR summary chip + numbered sections with body text + colored bullets.
- CFR auto-linking via `CfrText` wraps every §395.x string as a live eCFR hyperlink — including the complex anchor paths like §395.8(a)(1)(iii)(A)(1).
- Info-only for now; flashcard / practice mode deferred pending user decision on preferred format.
- User requested touching the grid to choose shift START/END time instead of typing HH:MM.
- **SplitSleeperPage.js**: lifted `tStart` / `tEnd` state out of QuestionCard into PracticeTab. Added `shiftTapNext` ("start" | "end") cycling indicator. When the shift question becomes active, EldGrid receives `onMinuteClick={handleGridTapForShift}`. Each grid tap snaps to 15-min, populates tStart or tEnd, and toggles the next tap. HH:MM inputs remain as a fallback (keyboard users / manual edits).
- Added a blue "Tap the grid to set Shift START/END" hint banner (`[data-testid="grid-tap-banner"]`) above the grid, with the active label highlighted in green (START) or red (END) so the user always knows which marker the next tap will drop.
- Live markers render on the grid as the user taps: "You: START · HH:MM" (green) on labelRow 0 and "You: END · HH:MM" (red) on labelRow 1 so they don't collide with the official CVSA markers that appear post-submission.
- Verified at desktop viewport: single tap at 13:00 → START marker appears, input fills to "13:00", banner switches to "Shift END"; second tap fires END. Tapping again after both set restarts at START.
- User flagged that dashed outlines on every selectable OFF/SB block in Practice mode effectively reveal the rest breaks before the user has chosen, and SP1/SP2 had ONLY 2 selectable blocks which were both the qualifying answer → no reasoning required.
- EldGrid: removed the default dashed outline on unselected selectable blocks. The log now reads as a normal roadside log until the user taps a block. Selected state + post-submission marks (correct/wrong/missed) still render. Cursor pointer + click handler remain for discoverability.
- SP1: added a 1h OFF distractor at 05-06 so three blocks are candidate rest periods. qualifyingBlockIdx: [2,4] → [3,5].
- SP2: rewrote log to include a 30-min §395.3(a)(3)(ii) break at 17-17:30 as a distractor. Three candidate blocks. qualifyingBlockIdx: [0,4] → [0,6]. counted14Hours: 13 → 12.5, counted11Hours: 12 → 11.5 (still an 11-hr violation).
- User reported visual overlap on SL3 (labels "Extended rest · 12h (prior 10h re" colliding with "6h SB — too short" / "4h OFF — no pair") and subsequently flagged additional overlap in multi-day extras.
- Root cause: wide pre-split countedBrackets layered on top of red failed-split brackets + long bracket labels + close-together shift markers with default labelRow 0.
- Fixes applied:
  - Removed wide pre-split/extended-rest countedBrackets from SL3 main, SL4 main, and SL4 extra "3h SB + 7h OFF".
  - Shortened shift-marker labels: "Pre-split START · 00:00", "Pre-split END · 06:00", "Split START · 13:00", "Split END · 17:00", "Shift START · 12:00", "Continues → 02:00 next day", "Next START · 03:00", etc.
  - Shortened countedBracket labels: "Pre-split · 6h" (was "Pre-split · 6h (1 OD + 5 D)"), "Split · 4h D" (was "CVSA split · 4h D"), "⟵ Period A · 3h", "Next shift · 7h", "← 10h reset ends", "Next shift · 6h", "10h SB reset →", etc.
  - Shortened qualifyingBracket labels on SL5 multi-day: "2h OFF ✓ (Period B)" (was "Period B · first segment"), "Period A · 5h ⟶", "8h SB ✓", etc.
  - SL5-b Day 1: removed the "Shift continues → Day 2" marker at 23:59 which collided with "Shift START · 23:30" at 23:30 (the continuation is already conveyed by the multi-day indicator + dashed line).
- Verified visually on 430px mobile viewport: SL1-SL5 main cards, all extras expanded, and Practice SP1 shift question all render with NO label collisions.

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
- **Tabled (re-raise later)**: ELD Training module (49 CFR §395.8 + §395.20-§395.38) — INFO MODULE SHIPPED Feb 2026 (see Changelog). User to decide if a practice/flashcard layer should follow.
- **P2**: Device-storage indicator in the Customize Header / admin menu

## Test Credentials
- Standard User — Badge `042`, PIN `1234`
- Admin User — Badge `121`
