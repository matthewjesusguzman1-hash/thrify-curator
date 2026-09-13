# Thrifty Curator - Product Requirements Document

## Overview
Operational dashboard for a resale/consignment business. React + FastAPI + MongoDB.

## Core Features (Implemented)
- Admin Dashboard with state-based navigation (inventory, employees, orders, payroll, sales data, shipping labels, training)
- Employee Dashboard with tile-based navigation
- Authentication (email-based login, admin code verification)
- Clock In/Out with GPS tracking
- Pay Period tracking with rate breakdowns
- Messaging system (admin-employee)
- Inventory management with Vendoo CSV import
- Shipping labels with SKU overlay
- W-9/W-8BEN/Contractor Agreement forms
- Remote Work (AnyDesk setup) for remote workers
- AI Assistant (Gemini-powered)
- Training system (Photography + Listing guides, admin-assigned)
- Notifications (web push, APNs)
- Video calls (Daily.co)
- Password management
- Session timeout (3 hours)
- Root redirect (logged-in → dashboard/admin)

## Employee Dashboard Architecture (Current)
### Tile Navigation System
- **Always Visible**: Pay Period Summary Card (hours, shifts, est pay, rate, pay breakdown)
- **Morph Tiles** (expand inline with minimize bar):
  - Messages → expands MessagingSection with minimize
  - Recent Shifts → expands shift history with minimize
- **Full-Page Tiles** (separate page with Back to Dashboard):
  - Forms → W-9, W-8BEN, Contractor Agreement
  - Training → Photography + Listing guides (only when assigned)
  - AI Assistant → full-page Gemini AI chat
  - Remote Work → AnyDesk setup (only for remote workers)
  - Orders → pull list & shipping (only when assigned)
- **Conditional Tiles**: Training (admin-assigned), Remote Work (remote workers only), Orders (when assigned)
- **Header**: Unchanged — Home, Refresh, Messages, Calls, Security, Logout, theme toggle
- **AI Floating Bubble**: Always visible on all views

### Training System
- Reference-only (no completion tracking)
- Photography: 7-step guide (Prep, Setup, Photos, Measurements, Description, SKU, Bag & Store)
- Listing: Vendoo Cross-Listing workflow (Starting in Vendoo, eBay, Poshmark, Mercari, Depop, Finish)
- Admin assigns training to employees by name via UI panel
- Admin can edit any training guide section inline with Save/Cancel
- AI Cleanup: Gemini-powered button to professionalize rough text per-section or all at once
- Admin can add/remove sections from any guide
- Training content stored in MongoDB, loaded dynamically by both views
- Employees only see training tile when assigned

## Pending/Backlog
- Gmail OAuth label import (blocked — needs valid Google client secret)
- Depop title→SKU matching via Gmail
- AnyDesk watcher autostart verification
- Bulk rate fix, rate change history log
- Trip summary card (monthly mileage/deduction)

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + Framer Motion
- Backend: FastAPI + MongoDB
- Integrations: Gemini AI (Emergent LLM Key), Daily.co, Resend, Capacitor (iOS/Android)
- Storage: Emergent Object Storage for labels/media
