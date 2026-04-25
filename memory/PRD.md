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


### 2026-02 — 8-day overnight shift pair UX
- When a day is flagged `continuesToNext` and the following day is `continuesFromPrev`, the EightDayRunner now renders BOTH grids together and asks the inspector for a SINGLE shift bracketed across them (Start day+time + End day+time, mirroring MultiDayRunner's pattern). This fixes the prior bug where Day 2 (Day −6) and Day 3 (Day −5) of E1 displayed wrong start/end expectations because the user could only bracket one day at a time.
- New `OvernightPairCard` + `PairDayTimePicker` components.
- After answering the overnight pair (shift + violation), the runner advances by 2 days. Both day answers are populated so the stepper and CompletedDayCard show both as complete.
- `violationCorrectForOvernight` helper ORs the two days' violation flags so a violation surfacing on the second half is graded correctly. Stored as `overnightCorrect` on each answer.
- CompletedDayCard now renders only the overnight markers that fall on its own day (Start on Day 1's grid, End on Day 2's grid).

### 2026-02 — 8-day scenarios harder + cycle calc + multi-pairing
- E1 rebalanced (was all clean): added an OVERNIGHT shift across Day −6 / Day −5, a 14-hr shift violation on Day −4, an 8-hr break violation on Day −1, and a multi-pairing split-sleeper day on Day −3.
- E2 enhanced: new 8-hr break violation on Day −5, new OVERNIGHT shift across Day −1 / Day 0, multi-pairing split-sleeper on Day −3 (compound option removed). Cycle total recomputed to 74h (still over the 70-hr cap).
- Cycle calc in `EightDayRunner.js` now starts BLANK — inspector must enter each day's on-duty hours from the logs themselves, then click "Check my totals" to grade each cell against canonical `onDutyHours` (±0.25h tolerance, red border + "was X" hint on wrong cells).
- New `MultiPairingShiftQ` component for split-sleeper days flagged `requireAllPairings: true`. Inspector must Add/Remove pairings iteratively until every work segment is bracketed, then submit. Grading lists each user pairing matched/unmatched against canonical pairings, and surfaces missed pairings explicitly.
- Markers in active and completed day cards updated to render every submitted pairing for multi-pair days.

### 2026-02 — Multi-Day Runner overnight-shift continuity fix
- User: "For the multi day scenario the start of the work shift begins in the first day and the end stops on the second day the app needs to compensate for that without giving away that the start and stop lines are on different days."
- Rewrote `/app/frontend/src/components/hos/MultiDayRunner.js` to present BOTH Day 1 + Day 2 grids together with a single ShiftQuestionCard ("When did this work shift START and END?") whose Start/End handles each carry their own day picker (Day 1 or Day 2). The runner advances shift-by-shift via a neutral "Is there another work shift?" card so the UI never reveals scenario count or whether the active shift crosses midnight.
- Added a `deriveShifts(days)` helper at the bottom of the same file that merges per-day MULTIDAY_SCENARIOS data (`continuesToNext` + `continuesFromPrev`) into a flat shifts[] array. M2 and M3 (overnight Day1→Day2) collapse to ONE merged shift with violations and regulatoryEnd carried from the day where they surface. M1 (priorDay→Day1 overnight + Day 2 contained) stays as 2 shifts; M4 (two contained) stays as 2 shifts.
- Verified by testing agent (iteration_38) via deep source review of all 4 scenarios; UI wording confirmed neutral, all required data-testids present.




### 2026-02 — New Personal Conveyance reference module
- User: "I want another module in hos general for personal conveyance under eld"
- Added new HOS Training module **Personal Conveyance** between ELD Reference and HOS Exemptions.
- New content file `/app/frontend/src/lib/pcContent.js` with 5 reference topics drawn from §395.8 + FMCSA Regulatory Guidance 83 FR 26377 (June 7, 2018):
  1. What PC is — core test + carrier authorization + RODS recording
  2. Allowed uses — FMCSA-listed acceptable PC use cases
  3. Prohibited uses — load-advancing moves + red flags at roadside
  4. PC vs Yard Move vs On-Duty — three-status decision tree with clock impacts
  5. Investigating suspected false PC — documents to pull, §395.8(e) citation, §395.13 OOS criteria
- New PcView + PcTopicCard renderer in HosTrainingPage (mirrors EldView pattern, accordion of topic cards). Car icon (lucide-react), green color (#10B981), 7-min minutes estimate.
- Lint clean, frontend compiled cleanly.

### 2026-02 — Split-sleeper days now accept all valid pairing answers
- User: "Again, it explains the two pairs but doesn't show them correctly." Screenshot showed answering 06:00→11:00 (Pairing A's morning shift) marked WRONG because grader only accepted the compound 06:00→21:00 form.
- Added `acceptableShifts` array on each split-sleeper day (E1 Day −3 + E2 Day −3). Three valid forms per day under the rolling-pair interpretation:
  - Pairing A — morning shift (between morning OFF and SB)
  - Pairing B — evening shift (between SB and overnight rest)
  - Compound — both work segments bracketed together (first OD → last D)
- DayShiftQ refactored to grade against the array — first match within ±10 min wins. Falls back to single `shiftStartMin/EndMin` for non-split days.
- Post-answer feedback now lists all three acceptable answers with a ✓ next to whichever the user matched, so inspectors learn which valid pairing they identified.
- DayCard + CompletedDayCard markers redrawn from the user's answered bounds (not canonical), so the SVG visually reflects what the inspector identified.
- Frontend compiled cleanly.

### 2026-02 — 8-Day flow polish: 15-min snap restored, split-sleeper tip-offs hidden until after answering
- User: "I won't like the snap to 5 mins. The 15 minutes is easier to use. The examples should be in 15 minute increments. The explanation in the scenarios should be given before the user has tried. On day 5 of 8 the split sleeper it shouldnt be labeled split sleeper for one because the user should be checking for split pairings without help but also the pairings are explained and then told they are incorrect."
- **Snap reverted to 15-min** in EldGrid.handleMarkerPointerMove. Shift-bounds correctness tolerance back to ±10 min (covers a 15-min snap with grace) in both MultiDayRunner and EightDayRunner. All scenario examples already on 15-min boundaries.
- **Active-day card no longer reveals split-sleeper status**: removed the "Split sleeper" orange badge from the dark blue header and the splitNote ribbon from below the grid. Inspector now must identify split-sleeper provisions themselves. CompletedDayCard retains the badge + a re-displayed splitNote so cross-day context is preserved once the user has worked through that day.
- **splitNote moved to post-answer feedback** (DayViolationQ): after the user commits a violation choice, the explanation block renders, then a "Split-sleeper analysis" callout walks through the pairings (including the rolling-pair interpretation). User can't see the analysis until they've tried.
- **Scenario primers updated** for E1 and E2: added explicit upfront teaching ("watch carefully — some days may use a split-sleeper provision per §395.1(g)(1)(ii)") without naming WHICH days, so inspector has conceptual heads-up but must still find the days.
- Frontend compiled cleanly. Self-tested via lint + supervisor logs — no testing-agent run needed (changes are visual + data scoped, all paths previously validated).

### 2026-02 — Split-sleeper rolling-pair interpretation on E1/E2 Day −3
- User: "For day 5 of 8 the split sleeper rest periods appears wrong. There is another pairing using the off duty time from midnight to 6 am and then pairing it with the sleeper berth 11 am to 7 pm. That would satisfy the rules. Then you could pair the end of that sleeper time with the 2 hours of off duty time at the end of the day."
- User caught a real teaching gap: the explanations only described ONE valid pairing on Day −3 (Friday), but under FMCSA's 2020 rolling-pair interpretation the same 8h SB block can serve as Period A for two different pairs — one with the morning OFF and one with the overnight SB+OFF.
- Updated splitNote + explanation on E1 Day −3 and E2 Day −3 to enumerate BOTH pairings explicitly:
  - E1: Pairing A (00:00–06:00 OFF + 11:00–19:00 SB → bounds morning shift 06:00–11:00). Pairing B (11:00–19:00 SB + 21:00 Fri → 06:00 Sat overnight rest → bounds evening shift 19:00–21:00).
  - E2: Pairing A (00:00–05:00 OFF + 10:00–18:00 SB → bounds 05:00–10:00). Pairing B (10:00–18:00 SB + 20:00 Fri → 06:00 Sat → bounds 18:00–20:00).
- Notes call out that the 8h SB block legally serves as Period A in BOTH pairings (rolling-pair interpretation) and explain that combined with the surrounding qualifying rests, every work segment is fully bracketed.
- Frontend compiled cleanly. No code paths changed — pure data/explanation refinement.

### 2026-02 — 8-Day inspector workflow polish: 5-min snap, completed-day visibility, cross-midnight SB pairing
- User: "I chose 7 and it read that I chose 7:15. Also the previous day when visible should be active not just the last day in the period. So when it goes the next day, the previous day should show. Also it's important that with the previous days logs that the split sleeper be applied correct. It should allow pairing with the previous days knowledge..."
- **5-min snap precision** (`EldGrid.js`): drag handler snap changed from `Math.round(x/HOUR_W * 4) * 15` to `Math.round(x/HOUR_W * 12) * 5`. Users can now hit precise values (07:00, 07:05, 07:10, ...) without overshooting to 07:15. Shift-bounds correctness tolerance also tightened from ±10 min to ±5 min in both MultiDayRunner and EightDayRunner so 5-min precision actually grades as "Correct".
- **CompletedDayCard** (`EightDayRunner.js`): every previously-answered day stays rendered as a readonly summary card above the active day card. Grey #475569 header reads "Day N of 8 · completed · Day −X · Wed", green/amber outcome badge in the corner, full EldGrid with shift markers in place, splitNote re-displayed with the orange SB badge if applicable. So as the inspector advances through Days 1→8, the page grows downward with full-context cards above and the active card at the bottom. Auto-skipped off-duty days also render as completed cards.
- **Cross-midnight split-sleeper notes** (`hosAdvancedScenarios.js`): E1 and E2 Friday/Saturday days now explicitly explain the Period A / Period B pairing across midnight. E1 example: 8h SB Fri 11:00–19:00 = Period A; 9h consecutive SB+OFF spanning 21:00 Fri → 06:00 Sat = Period B; pair completes at 06:00 Sat with fresh 11/14 clocks. E2 example: 8h SB Fri 10:00–18:00 = Period A; 10h SB+OFF spanning 20:00 Fri → 06:00 Sat = Period B. The Day −2 (Saturday) explanation shows that today's shift starts AFTER Period B ends, not at the first OD entry of the calendar day.
- Tested via testing_agent_v3_fork iteration 37 — 11/11 verifications pass; ALL 8 completed-day cards visible above the cycle step at end of E1; split-sleeper notes verified verbatim on both E1 and E2 Fri/Sat days.
- Tester flagged file-size concerns: EightDayRunner.js is now ~720 lines, MultiDayRunner.js ~503 lines. Future refactor — extract ContextDayStrip, CompletedDayCard, DayCard, CycleStep, OosStep into separate files.

### 2026-02 — Multi-Day + 8-Day: prior-day / next-day context strips (overnight rest visibility)
- User: "For any multi day scenario the user needs to be able to see the day before and the day after if available. To properly check the split sleeper provision it can be necessary to see how the rest breaks were taken overnight."
- Added `priorDayLog`, `priorDayNote`, `nextDayLog`, `nextDayNote` fields to all 4 MULTIDAY_SCENARIOS (M1-M4) and both EIGHTDAY_SCENARIOS (E1, E2). Most prior/next days are full off-duty rest, but M4's prior day shows an SB block starting at 20:00 the night before — useful for evaluating whether the overnight rest qualified as a 10-hr reset or a split-sleeper Period A.
- New shared visual pattern: **ContextDayStrip** — readonly EldGrid wrapped in a dashed-border / light-grey card with a "Context · readonly" badge + caption. Visually distinct from the active dark-headered day cards so the inspector instantly recognizes context-only days.
- MultiDayRunner: prior strip rendered ABOVE Day 1 grid; next strip rendered after Day 2's ViolationCard (gated on `questionIdx >= 2` so it appears alongside the Day 2 grid).
- EightDayRunner: prior strip rendered above the day stepper; next strip rendered above the CycleStep when phase advances to `cycle` (so the inspector sees the day-after pattern at the moment they're evaluating cycle compliance).
- Tested via testing_agent_v3_fork iteration 36 — 8/8 verification points pass; positions, styling, gating, and Combined/Split regression all good.
- Tester also flagged 2 future-refactor candidates (non-blocking): ContextDayStrip is duplicated in both runners — extract to a shared component when convenient; both runners are approaching 700 lines — split sub-components into separate files in a future refactor pass.

### 2026-02 — 8-Day Inspection drill rebuilt as full inspector workflow
- User: "The eight day inspection scenario was supposed to have 8 days to review and have easy violations to identify for 11 and 14 violations mixed in but also 70 hour violation and required the user to use the 70 hour calculator. It should also include some split sleeper. It should allow the user to throw a little of everything together. The first step is properly identifying rest breaks and work times. Then identifying potential 11, 14 and 8 hour violations. Then the 70 hour rule with the use of the calculator. If necessary place the driver OOS."
- **Scenarios rewritten** (`hosAdvancedScenarios.js` EIGHTDAY_SCENARIOS): 2 full 8-day scenarios. E1 = clean baseline (60h cycle, no violations, includes a split-sleeper Friday and an off-duty Thursday). E2 = kitchen sink — Day −6 14-hr violation, Day −4 11-hr violation, Day −2 8-hr break violation, split-sleeper usage Day −3+−2, cumulative 77.5h on the 70-hr clock = cycle violation + OOS required. Each day has full ELD log + shiftStartMin/End + onDutyHours + per-day violation flags + explanation prose.
- **New EightDayRunner** (`/components/hos/EightDayRunner.js`, ~600 lines): 4-phase runner: `days` → `cycle` → `oos` → `done`. Per-day flow: drag handles for shift START/END → violation choice (none/11/14/8/multiple). Off-duty days (`day.offDay===true`) auto-collapse into a single "Confirm off-duty · advance" button to keep momentum. Day stepper at top (8 chips) shows live status — gold ring on active, green check on correct, amber bang on wrong. Pre-scenario primer card lists the 4-step inspector workflow before the user begins. Built-in mini 70-hr calc on the cycle step prefilled from each day's onDutyHours, fully editable (so the user can simulate a 34-hr restart by zeroing days). Final OOS step has shield/shield-off icons for the release/place-OOS decision. Cycle-question post-answer feedback strip mirrors the other questions (added after tester flagged the inconsistency).
- **Page integration** (`HosPracticePage.js`): added `mode: "eightday"` for the category, swapped in EightDayRunner; removed obsolete EightDayContext / RecapTable / MiniCycleCalc helpers (now consolidated inside EightDayRunner). Rules list updated to reflect 14 / 11 / 8-hr break / 70-hr cycle / §395.13 OOS.
- Tested via `testing_agent_v3_fork` iteration 35 — 14/14 assertions passed end-to-end. E1 ran clean; E2 confirmed Day −6=14, Day −4=11, Day −2=8, split-sleeper badge visible, cycle 77.5h over by 7.5h, OOS required.

### 2026-02 — Multi-Day scenarios rewritten · 11/14 focus · both-day analysis · overnight shift · pre-scenario primer
- User: "For the multi day scenario it should be for 11/14 violations. It should have the user find start and end times for both days. At least one of the scenarios should include overnight driving/work time. It also should explain the violations before the scenario has been participated in."
- **Scenarios rewritten** (`hosAdvancedScenarios.js` MULTIDAY_SCENARIOS): 4 new 11/14-focused 2-day scenarios. M1 clean baseline, M2 Day 1 14-hr violation, M3 OVERNIGHT shift (18:00 Day 1 → 08:30 Day 2 with 11 AND 14 violations on the Day 2 portion), M4 Day 1 11-hr violation. Scenario shape moved from single-focal-day to `days: [{ label, log, shiftStartMin, shiftEndMin, violation11, violation14, continuesFromPrev?, continuesToNext?, regulatoryEndMin?, explanation }, ...]` with a top-level `primer` string.
- **New MultiDayRunner** (`/components/hos/MultiDayRunner.js`, ~430 lines): dedicated 2-grid runner for multiday. Flow: pre-scenario primer card → Day 1 grid + Day 1 shift question (drag handles) → Day 1 violation (multi-choice) → Day 2 grid appears + Day 2 shift question → Day 2 violation → done. Overnight support: `continuesToNext` flag lets Day 1 END handle sit at 24:00 (right edge); `continuesFromPrev` lets Day 2 START sit at 00:00 (left edge). HTML time input rejects literal "24:00", so the grader normalizes user-typed 00:00 to 1440 min when `day.shiftEndMin===1440` — hint text now explicitly tells the user that.
- **Per-category rules primer** (`HosPracticePage.js`): every category tab now shows a "Rules being tested" bulleted list (under `data-testid=category-primer`) alongside the description. Rules are drawn from a new `rules` field on each CATEGORIES entry. This satisfies "explain the violations BEFORE the scenario has been participated in" across all practice flows, not just multi-day.
- Testing: `testing_agent_v3_fork` iteration 34 — all 11 assertions pass; tester ran M3 end-to-end (18:00→00:00 normalized to 24:00, violation "none" on Day 1, violation "both" on Day 2) with correct feedback at each step. No regressions on Combined, 8-Day, or Split Sleeper.

### 2026-02 — ELD grid: same size as trainer on wide, scales down to fit on narrow
- User: "Now it is running off the page"
- Previous revert went too far — fixed natural-pixel sizing with overflow-x-auto meant the grid was wider than the viewport on smaller laptops/phones.
- New strategy: keep `width={svgW}` / `height={svgH}` (so the natural size is the trainer's 822×162) but add `style={{ maxWidth: "100%", height: "auto" }}` to the SVG. Container wider than 822 → grid renders at exactly natural trainer size. Container narrower → grid scales down proportionally to fit. No horizontal scroll, no overflow, fits on the page at every viewport.
- Frontend compiled cleanly. Drag-marker scroll-lock preserved (touchAction:none on SVG when hasDraggable).

### 2026-02 — ELD grid reverted to original Split Sleeper Trainer dimensions
- User: "Can you make it the same size the split sleeper trainer grid was?"
- Found via git log: when EldGrid was first built, the Split Sleeper Trainer practice grid used `HOUR_W=28, ROW_H=32, LABEL_W=74, TOTAL_W=76, HEADER_H=22` and rendered at NATURAL pixel size (`width={svgW}` / `height={svgH}`) wrapped in `overflow-x-auto`. A later refactor switched to `width="100%"` + `viewBox` + `h-auto` for responsive scaling, which is what made the grid *appear* a different size depending on the container — and what made my prior "make it bigger" tweaks visually fall flat.
- Reverted EldGrid to the original sizing strategy: SVG at natural pixel size 822×162, wrapper uses `overflow-x-auto` (with the existing `touchAction: none` exception when draggable shift markers are active so dragging doesn't get hijacked as a scroll on mobile). All font sizes and marker badge dimensions restored to their original values.
- Lint clean; frontend compiled successfully. Behavior unchanged — only visual sizing strategy reverted.

### 2026-02 — ELD grid size pushed further (~+110% vs original)
- User: "Can you make it any bigger and still have everything visible on the page?"
- Pushed non-compact dims further: HOUR_W 28→26, ROW_H 52→70, LABEL_W 74→80, TOTAL_W 76→84, HEADER_H 24→28. Aspect ratio drops from 3.37 to 2.46 — at a 840-wide container, displayed height grows from ~249px to ~341px (+37% vs previous tweak, +110% vs the original).
- Font sizes bumped proportionally so labels don't look lost in the taller rows: row label 10→13, totals 13→16, hour ticks 9→11, START/END marker badges 9.5→11, marker text 10→12.
- Marker badges resized: START/END flag width 44→54, CONTINUES 74→90, badge height 13→16. Marker label vertical spacing bumped 12→14 so the larger labels don't collide.
- Compact dims also bumped (used in Learn cards): HOUR_W 22→24, ROW_H 38→48, etc., so Learn-card grids also benefit.
- Lint clean; smoke test compiled successfully. Page layout unaffected — the grid is the focal element so growing it just gives it more room.

### 2026-02 — Split Sleeper rename, /practice header simplification, ELD grid genuinely larger
- User: "Rename the split sleeper trainer to just split sleeper. When entering the practice scenarios the tabs for 70 hour calc and general tab are visible at the top, remove that. I just want a back button like all the others. The grid doesn't look any larger. I asked for it to be at least as large as the one that was in the split sleeper trainer practice area."
- **Rename:** `Split Sleeper Trainer` → `Split Sleeper` everywhere it appears: SplitSleeperPage h1, HosTrainingPage hub tile (`module-split` title).
- **Header cleanup on /practice:** removed the `<HosTabs />` sibling tab bar (60/70 Calculator + HOS General) from /hours-of-service/practice. Header now matches every other top-level page: just a back chevron + title. The HosTabs strip is preserved on /hours-of-service and /hours-of-service/training where it still belongs.
- **Genuinely larger grid:** previous bump (HOUR_W 28→34, ROW_H 32→38) didn't change the on-screen size because the SVG uses `h-auto` with `viewBox` — display height is dictated by aspect ratio, and proportional bumps to both axes keep the aspect identical. New tuning swings the aspect from "wide-and-short" toward "less-wide-and-tall": HOUR_W=28, ROW_H=52 (was 32 originally). svgH grew from ~162 to ~244 internal units against the same svgW=822, so on a 900px-wide container the displayed grid is now ~50% taller than the original. Rows are visibly thicker; duty trace is easier to read at a glance.
- Bonus: cleaned up the `fontFeatureSettings` JSX prop on the SVG hour labels — replaced with `style={{ fontVariantNumeric: "tabular-nums" }}` to silence the React DOM warning that's been showing in console (introduced when military-time labels were added).
- Tested via testing_agent_v3_fork iteration 33 — all three checks passed; HosTabs preserved on the right pages and removed on /practice; ELD grid taller in screenshot.


### 2026-02 — HOS Practice consolidation: 4-category unified runner + neutral picker IDs + larger grid
- User: "I don't want the user to know the type of scenario it is. That defeats the purpose ... remove the clean 13 hour name." Then: "Make the grid larger. It should be at least the size of the one in the split sleeper trainer. It would also be good to incorporate the split sleeper trainer with the other scenarios."
- Stripped every `title` and `subtitle` field from the 11 advanced scenarios (`hosAdvancedScenarios.js`). The runner's picker reads `s.title || s.id`, so it now shows neutral codes only — `C1..C5`, `M1..M3`, `E1..E3`, `SP1..SP4`. Inspectors see no hint about the scenario's "trap" or violation type before solving it.
- Added a 4th tab to `/hours-of-service/practice`: **Split Sleeper** (mode='split', renders SPLIT_PRACTICE_SCENARIOS through the same shared PracticeRunner). The category-tab grid switched from 3-col to `grid-cols-2 sm:grid-cols-4`. Per-category `mode` is now part of the CATEGORIES config so the runner picks the right phase order.
- Removed the Practice tab from `/hours-of-service/split-sleeper` — page is Learn-only now, with a `goto-practice-btn` shortcut in the header that navigates to `/practice`. Single home for all practice drills.
- Bumped non-compact EldGrid dimensions for a larger, more readable grid everywhere it appears (Learn cards + practice runner): `HOUR_W 28→34`, `ROW_H 32→38`, `LABEL_W 74→78`, `TOTAL_W 76→80`, `HEADER_H 22→26`. Compact mode bumped equivalently. Multi-day prior-day context grids now also render non-compact so they match the focal-day grid size.
- HOS Training hub tile copy updated: Split Sleeper Trainer subtitle is now "Learn the qualifying-pair rule"; HOS Practice Scenarios subtitle is "Combined · multi-day · 8-day · split sleeper".
- Bug caught in testing: when removing the top-level tab state from SplitSleeperPage I dropped `useState` from imports, but `LearnCard` (declared in the same file) still uses it locally for the "show extras" toggle. Tester re-added the import; verified live. Lesson: when removing top-level state, scan the whole file for child-component usages before pruning imports.
- Tested via testing_agent_v3_fork iteration 32 — 12 / 12 frontend assertions passed.


### 2026-02 — HOS Practice Scenarios (NEW section · 11 scenarios) + military time + Restart/Pick controls
- User asked for: more practice (just-14/11 combined, multi-day, full 8-day inspection period), a Restart Scenario button + Pick scenario picker, military time across the ELD trainer, and an embedded mini 70-hr calculator that does NOT affect the real /hours-of-service tool.
- Extracted the practice runner from `SplitSleeperPage` into shared `/app/frontend/src/components/hos/PracticeRunner.js` (~440 lines). Two modes: `mode="split"` (full qualify→select→questions flow) and `mode="shift"` (skips qualify+select for non-split scenarios). Same drag-to-place handles, same scroll-lock on iOS.
- New top bar inside the runner: Pick scenario (opens an inline list of all scenarios with title + subtitle, jump to any) and Restart (resets the active scenario back to step 1). Both data-testids: `${category}-pick-scenario-btn`, `${category}-restart-btn`, `${category}-scenario-pick-{i}`.
- New scenarios file `/app/frontend/src/lib/hosAdvancedScenarios.js`: COMBINED_SCENARIOS (5 single-day 11/14), MULTIDAY_SCENARIOS (3 two-day with prior-day ELD context), EIGHTDAY_SCENARIOS (3 full 8-day with prior 7-day recap + cycle compliance). 11 total, all military time.
- New page `/app/frontend/src/pages/HosPracticePage.js` (~315 lines) at route `/hours-of-service/practice`. Three category tabs (combined / multiday / eightday). Per-category context renderer: multi-day shows prior-day ELD cards above the runner; 8-day shows the recap table + an embedded **MiniCycleCalc**.
- MiniCycleCalc is a self-contained 70/60-hr calculator with editable prior-day overrides (so the inspector can simulate a 34-hr restart by zeroing days), a Today on-duty input, live verdict (under / at limit / over), and a "Reveal correct numbers" button. State is local React state only — remounted on category switch via `key={catId}` and never reads/writes the real /hours-of-service calculator state.
- EldGrid hour labels switched from 12-hour Mid/Noon/1-11 to 24-hour 00..23 (24 hidden to prevent right-edge crowding) — `String(h).padStart(2, "0")` with `font-feature-settings: 'tnum'` for tabular alignment. All scenario shift markers and explanations were already 24-hr, so no scenario data needed conversion.
- New module tile "HOS Practice Scenarios" added to the HOS Training hub (color: #D4AF37, icon: Target) routing to the new page. Existing Split Sleeper tile unchanged.
- Files touched: PracticeRunner.js (new), hosAdvancedScenarios.js (new), HosPracticePage.js (new), SplitSleeperPage.js (refactored to thin wrapper around PracticeRunner mode="split"), EldGrid.js (military labels), HosTrainingPage.js (added module tile), App.js (added route).
- Tested: testing_agent_v3_fork iteration 31 — 18 / 18 assertions passed, no regressions on Split Sleeper or 60/70 calculator.


### 2026-02 — HOS section: sibling tab bar for 60/70 Calculator ⇄ HOS Training
- User: "I want the hours of service training button to be an HOS general tab. I want it next to the 60/70 hour calc in a tab."
- Created `/app/frontend/src/components/hos/HosTabs.js` — route-driven shared tab bar (no local state). Two tabs: `60/70 Calculator` → `/hours-of-service`, `HOS Training` → `/hours-of-service/training`. Active tab is inferred from the current pathname, gold text + gold underline accent on the active one, white/60 on the inactive.
- Removed the standalone "Training" button from the HoursOfServicePage header (also dropped the now-unused `GraduationCap` import there).
- Injected `<HosTabs />` below the sticky header on both HoursOfServicePage and HosTrainingPage hub. Bumped the HoursOfServicePage floating action-bar sticky offset from `top-[52px]` → `top-[88px]` so it still clears the taller sticky header.
- Data-test hooks: `hos-tabs` on the container, `hos-tab-calc` / `hos-tab-training` on the two tabs.
- Verified live: both tabs toggle correctly, `aria-current="page"` set on the active tab, routing works in both directions.

### 2026-02 — HOS Training Hub: Compact Mode toggle REMOVED
- User feedback: "It's cool but it makes no difference to the user. Remove the quick button and function."
- Removed the Detailed ⇄ Quick toggle button, the `compact`/`setCompact`/`toggleCompact` state, and all `compact ? ... : ...` conditional styling from HosTrainingPage hub tiles.
- Hub tiles now render in a single (detailed) layout only — title + subtitle + Roadside chip + minute/quiz meta row + chevron.
- localStorage key `hos-hub-compact-mode` is now unused (harmless residue, no cleanup needed).

### 2026-02 — HOS Training Hub: Compact Mode toggle (VERIFIED, later removed)
- User approved: "Yeah, try it" on compact-mode toggle proposal. Inspectors working an active roadside stop needed to see all six HOS rules on one screen without scrolling.
- Added a Detailed ⇄ Quick toggle button in the HosTrainingPage hub header (gold when active, white/10 when inactive).
- State persists via `localStorage["hos-hub-compact-mode"]`, so an inspector who prefers the cheat-sheet density keeps it across sessions.
- In Quick mode: smaller icon tile (w-8 h-8 vs w-10 h-10), smaller padding (p-2.5 vs p-3), title drops to 13px leading-tight, subtitle + meta row + chevron all hidden. Roadside preview chip remains visible (compressed top margin).
- Fix applied in previous session: moved the `useState(compactKey)` hook above the conditional early returns so the hooks order stays stable when switching modules. Verified live — no React rules-of-hooks error, toggle cycles label DETAILED ⇄ QUICK correctly, tiles collapse and re-expand.
- Data-test hooks: `hub-compact-toggle` on the button, `module-{id}-roadside-preview` on the preview chip.



### 2026-02 — HOS hub tile previews shortened to single-line rule-of-thumb
- User: the full first Roadside action was too much information for a hub-glance preview.
- Added a short `roadsideQuick` string to each LEARN_CONTENT module — one-line rule-of-thumb, typically 6-10 words:
  - duty → "Classify every block OFF/SB/D/OD first."
  - 14hr → "First on-duty after 10h rest + 14h = end of shift."
  - 11hr → "Sum D segments only. >11h driving = violation."
  - break → ">8h driving without a 30-min break = violation."
  - recap → "Sum D+OD over prior 7 days. >70h = violation."
- Hub tile now prefers `roadsideQuick` over the first full Roadside action. Chip text switched from `line-clamp-2` to `truncate` (single line) so the tile height stays tight.
- Full Roadside action cards still render inside each Learn module — this is a hub-only shortening.


### 2026-02 — HOS Training hub: Roadside preview chips on every module tile
- User approved the proposed enhancement: preview each module's first Roadside action on the hub tile.
- HosTrainingPage hub now looks up `LEARN_CONTENT[m.learnKey].roadside[0]` for each module and renders it below the subtitle as a compact navy-tinted chip (#002855/95 filled, gold 2px left accent) with a mini "ROADSIDE" badge (gold background, Target icon, 8px font). Text is clamped to 2 lines with `line-clamp-2`.
- Applied to 5 tiles with learn content: Duty Status 101, 14-Hour Window, 11-Hour Driving, 30-Min Break, 70-Hour Recap. The 3 non-learn tiles (Split Sleeper Trainer, HOS Exemptions, ELD Reference) retain their original compact layout.
- The hub now doubles as a quick-reference card grid — an inspector can glance at 5 Roadside actions without opening any module.
- Data-test hook: `module-{id}-roadside-preview` on each chip.


### 2026-02 — HOS Training Learn: merge Inspector Takeaway into Roadside, keep only Roadside
- User: Inspector takeaway and Roadside sections had overlapping information. Combine and display only Roadside — more noticeable and more relevant.
- Removed the amber "Inspector takeaway" summary section in LearnView (HosTrainingPage.js). The roadside action block is now the sole call-to-action before the "Take the quiz" button.
- Merged any unique information from each summary into the corresponding `roadside` array on duty / 14hr / 11hr / break / recap. Examples: 14hr now has a dedicated card stating the clock runs wall-clock time and off-duty blocks don't pause it; 11hr now explicitly reminds that OD counts toward the 14-hr window but NOT the 11-hr limit; duty adds the literal "Driving = wheels turning…" rule-of-thumb; break adds the scan-the-log phrasing; recap adds the D+OD bracket reading + §395.3(b)(2) citation.
- Verified live: "Inspector takeaway" text no longer renders anywhere; 5 roadside cards on 14hr, 5 on duty/11hr/recap (varies by module), all navy/gold prominent.


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
