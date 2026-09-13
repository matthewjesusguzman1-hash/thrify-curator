# Thrifty Curator - Changelog

## 2026-09-13 — Employee Dashboard Tile Restructuring & Training Update
- Fixed broken build (syntax error in EmployeeDashboard.jsx from incomplete ternary)
- Restructured employee dashboard with tile-based navigation:
  - Pay Period Summary Card always visible (not behind any tile)
  - Messages + Recent Shifts: morph tiles with consistent minimize bars
  - Forms, Training, AI, Remote Work, Orders: full-page tiles with Back to Dashboard
  - Conditional tile visibility (Training when assigned, Remote for remote workers, Orders when assigned)
- Updated Listing Training content to match Vendoo Cross-Listing Training Guide PDF exactly
  - 6 sections: Starting in Vendoo, eBay, Poshmark, Mercari, Depop, Finish
  - Includes marketplace-specific details (eBay item specifics, Mercari brand fixes, Depop weight selection)
- Fixed duplicate back button on Training page
- Assigned Photography + Listing training to matthewjguzman1@gmail.com
- All tests passing (iteration_88.json: 100% frontend pass rate)

## Previous Changes
- Training system: backend assignments API, Photography/Listing reference guides
- Employee dashboard: empPage state for full-page views, activeTile for morph views
- Session timeout changed to 3 hours
- Root redirect logic (employee→/dashboard, admin→/admin)
- Shipping labels with SKU overlay (PDF→PNG rendering)
- Gmail OAuth integration (blocked by invalid client secret)
- AnyDesk watcher for remote work monitoring
- Core features: auth, clock in/out, payroll, inventory, messaging, forms, AI assistant
