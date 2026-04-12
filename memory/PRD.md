# SafeSpect Violation Navigator — PRD

## Problem Statement
FMCSA roadside violation search/filter app with AI-powered search, NSP blue/gold theme.

## Key Rules
- **DIRECT** = 50% WLL (393.102)
- **INDIRECT** = 100% WLL (393.102)
- Required aggregate WLL = 50% of cargo weight (393.104)
- **Without blocking** (393.110b): 1 for ≤5ft/≤1100lbs, 2 for ≤10ft, 2+1 per 10ft beyond
- **With blocking** (393.110c): 1 per 10ft (headerboard/bulkhead prevents forward movement)

## What's Implemented
All features from previous sessions plus:
- Headerboard/Blocking toggle (393.110b vs 393.110c)
- 3D isometric-style infographic diagrams matching CVSA cert material
- Favorites-only quick access (no common presets)
- All 393.108 WLL values including 4 webbing sizes
- Collapsible sections throughout

## Backlog
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
