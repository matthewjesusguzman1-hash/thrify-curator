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
- **Fixed:** "5% tolerance applied" incorrectly shown in saved Weight Reports.
  - Previous agent's first attempt computed a local `toleranceApplies` but never used it in the render (stale `a.tolerance_applies` still driving the banner) and incorrectly counted gross weight toward the tolerance threshold.
  - Now: `InspectionDetail.js` and `ReportContent.js` both recompute tolerance at render time using the correct rule (gross weight and interior bridge excluded from the count; tolerance only when exactly one group/axle/tandem overage AND not Custom mode).
- **Retained (from earlier in session):** Full structured weight reports, inline SVG truck diagrams, HOS calculator, Recreate-in-Section hydration, unified TieDown PDF styling.

## Backlog (P0 → P2)
- **P1**: Offline/cached mode for field use
- **P2**: Refactor `server.py` (~2000 lines) into modular routes (`/app/backend/routes/*`)
- **P2**: Refactor `BridgeChartPage.js` / `HoursOfServicePage.js` / `HazMatHelpers.js` into smaller components
- **P2**: Additional Inspector Tools — Spec Marking Decoder, Retest Date Calculator, OOS Quick Reference

## Test Credentials
- Standard User — Badge `042`, PIN `1234`
- Admin User — Badge `121`
