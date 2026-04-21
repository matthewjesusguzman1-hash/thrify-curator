# Inspection Navigator — PRD

## Original Problem Statement
Full-stack application to search and filter FMCSA roadside violation data and assist in field inspections. Target user: CMV inspectors / DOT enforcement.

## Core Requirements
- 7-step HazMat Inspection Worksheet with interactive helpers
- Optimized AI + keyword violation search
- OCR for shipping papers
- Dedicated Level 1 / 2 / 3 Inspection Guidance
- Photo annotation tools
- Admin panel with biometric login
- Interactive Bridge Chart / Weight Calculator (Interstate/Non-Interstate/Custom modes)
- Tie-Down (Cargo Securement) Calculator
- Hours of Service (HOS) 60/70 Hour Calculator with OOS recovery simulator
- Unified "Saved Inspection" store: rich structured data for every assessment + "Recreate in Section" hydration

## Architecture
- Frontend: React + Tailwind + Shadcn UI
- Backend: FastAPI + Motor (MongoDB)
- LLM: OpenAI (GPT-4.1-mini / 4o Vision) via Emergent Universal Key

## Changelog

### 2026-02 — Session (current)
- **Fixed:** "5% tolerance applied" banner on saved Weight Reports now only appears when tolerance was **actually applied** — i.e., exactly one non-gross, non-interior overage exists AND that overage was forgiven (within 5%). Gross weight and interior bridge are excluded from the count per statutory rule. Custom/Permit mode never shows tolerance.
- **Fixed:** Interior Bridge now only renders in the saved report when the interior distance was entered (`a.interior.enabled === true`). Prevents misleading "Interior bridge 0/0" lines when the check was never performed.
- **Enhanced:** Saved Weight Report Calculation Details now mirrors the live Bridge Chart Record Weights → Calculation Details card: per-group weight breakdown, dummy discount narrative, rule checks with source & tolerance notes, separate Gross Weight and Interior Bridge sections with full subtraction narrative.
- **Enhanced:** `BridgeChartPage` now persists `gross_source` and `axle_numbers` on save so legacy source labels (`Interstate 80,000 cap`, `Bridge (52ft, 5ax)`, etc.) render exactly as seen live. Backward-compat fallback in place for older saves.

### Earlier this session
- HOS Calculator (60/70-Hour with Property/Passenger toggles, OOS simulator)
- TieDown PDF styling unification (circular WLL gauges)
- Recreate-in-Section hydration for HOS / Tie-Down / Bridge Chart
- Weight Reports store structured data + inline SVG (no PNG)

## Backlog (P0 → P2)
- **P1**: Offline/cached mode for field use
- **P2**: Refactor `server.py` (~2000 lines) into modular routes (`/app/backend/routes/*`)
- **P2**: Refactor `BridgeChartPage.js` / `HoursOfServicePage.js` / `HazMatHelpers.js` into smaller components
- **P2**: Additional Inspector Tools — Spec Marking Decoder, Retest Date Calculator, OOS Quick Reference

## Test Credentials
- Standard User — Badge `042`, PIN `1234`
- Admin User — Badge `121`
