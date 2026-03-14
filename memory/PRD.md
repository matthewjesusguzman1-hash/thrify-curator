# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Build a "Thrifty Curator" reselling application with:
- Mobile app conversion (iOS/Android) using Capacitor
- Push notifications for user engagement
- Consignment portal for consignors to track submissions
- Admin dashboard for business management
- Email notifications for key actions

## Current Status
The web application is fully functional. iOS app has been built and uploaded to App Store Connect. Android app has been built as a signed `.aab` file.

### What's Been Implemented

**Core Application (Complete)**
- Full-stack React/FastAPI/MongoDB application
- Admin dashboard with employee management, payroll, forms, and reports
- Employee portal with time tracking and mileage logging
- Consignment workflow (inquiry → agreement → item additions)
- Payment processing for employees and consignment clients

**Mobile App (In Progress)**
- Capacitor integration for iOS and Android
- iOS app built, archived, and uploaded to App Store Connect
- Android `.aab` file generated for Play Store submission
- Push notifications setup (INCOMPLETE - needs iOS capabilities enabled)

**Email Integration (Complete)**
- Resend email service integrated
- Transactional emails for user and admin actions
- Test email functionality (hidden behind triple-click on Admin Dashboard)

**Recent Changes (March 14, 2026)**
1. Removed "Add to Home Screen" button from landing page (no longer needed with App Store distribution)
2. Set default sender email to thriftycurator1@gmail.com
3. Fixed consignment client dropdown in Payment Records section
4. Removed all individual refresh buttons (kept only master refresh)
5. Hidden email settings button (accessible via triple-click on "Admin Dashboard")

## Architecture

### Frontend (`/app/frontend`)
- React with Tailwind CSS and shadcn/ui components
- Capacitor for mobile app wrapping
- Pages: Landing, Auth, Admin Dashboard, Employee Dashboard, Forms

### Backend (`/app/backend`)
- FastAPI with MongoDB
- Routers: auth, admin, employees, forms, payroll, mileage
- Services: email_service (Resend integration)

### Key Files
- `/app/frontend/src/App.js` - Main app with routing and push notification initialization
- `/app/frontend/src/pages/AdminDashboard.jsx` - Admin interface
- `/app/backend/app/services/email_service.py` - Email handling
- `/app/frontend/ios/App/` - iOS native project

## Priority Backlog

### P0 (Critical - Blockers)
1. **iOS Push Notifications** - Need to enable capabilities in Xcode:
   - Add "Push Notifications" capability
   - Add "Background Modes" capability with "Remote notifications"
   - Increment build number and upload to App Store Connect
2. **iOS App Store Submission** - After push notifications confirmed working

### P1 (High Priority)
1. Android Play Store submission guidance
2. APNs key configuration for backend push notification sending

### P2 (Medium Priority)
1. Refactor `ConsignmentAgreementForm.jsx` (large monolith)
2. Add more comprehensive test coverage

## Key Credentials
- Admin login: matthewjesusguzman1@gmail.com with code 4399
- Email sender: thriftycurator1@gmail.com
- Resend API key: Stored in backend/.env

## User Guidance Notes
The user is non-technical but capable of following specific command-line and UI instructions on their Mac. Provide clear, step-by-step guidance for any Xcode or terminal operations.
