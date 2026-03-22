# Thrifty Curator - Product Requirements Document

## Overview
Thrifty Curator is a reselling application with web and native mobile (iOS/Android) versions. The app features distinct portals for consignors, employees, and admins.

## Core Features

### Completed
- **Web Application**: Full-stack React/FastAPI/MongoDB application
- **Consignment Portal**: View submissions, payment history, manage account, add items with custom commission splits
- **Employee Portal**: Clock-in/out with geolocation verification, view time entries
- **Admin Dashboard**: Manage employees, consignors, payroll settings, approve/reject submissions
- **Email System**: Magic link password reset with rate limiting
- **Password Management**: Set/reset/delete passwords for employees and consignors
- **Face ID/Biometric Login**: Working for both employee and consignment portals
- **Haptic Feedback**: Comprehensive implementation across all pages (as of Mar 22, 2026)
  - Form submissions (heavy press)
  - Navigation/back buttons (light tap)
  - Success/error feedback on actions
- **Native Geolocation**: Using @capacitor/geolocation for clock-in
- **Native Permissions**: Face ID and Location prompts on iOS

### In Progress
- Native iOS app build (user is building locally via Capacitor)

### Upcoming (P1)
- Guide user through iOS App Store submission
- Guide user through Android app submission (.aab file)
- Dynamic Island & Lock Screen widgets for employees
- Update QR code to dynamic link service after app store launch

### Future/Backlog (P2-P3)
- **CRITICAL**: Refactor ConsignmentAgreementForm.jsx (3000+ lines monolith)
- Offline usability features
- Push notification enhancements

## Technical Architecture

### Frontend
- React 18 with Vite
- Capacitor 5 for native iOS/Android
- Tailwind CSS + Shadcn/UI components
- Key plugins: @capacitor/haptics, @capacitor/geolocation, @capgo/capacitor-native-biometric

### Backend
- FastAPI
- MongoDB
- Resend for emails

### Key Files
- `/app/frontend/src/hooks/useHaptics.js` - Haptic feedback utility
- `/app/frontend/src/hooks/useBiometricAuth.js` - Face ID/Touch ID logic
- `/app/frontend/src/pages/ConsignmentAgreementForm.jsx` - NEEDS REFACTOR
- `/app/backend/app/routers/password_reset.py` - Magic link flow

## Known Issues
- Password modals had recurring freeze issues (resolved with React Portals)
- ConsignmentAgreementForm.jsx is a fragile 3000+ line monolith

## Credentials
- Admin login (Matthew Guzman): Access code `4399`
- Admin login (Eunice Guzman): Access code `0826`
