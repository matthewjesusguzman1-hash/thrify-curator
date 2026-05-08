# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Building a comprehensive reselling application with native iOS/Android apps via Capacitor. Core features include consignment management, employee time tracking, GPS mileage tracking, tax prep tools, and job application/interview scheduling.

## What's Been Implemented

### Session - May 8, 2026
- **Admin Dashboard Notifications** - Added notification triggers for:
  - Interview booked/cancelled/rescheduled
  - All notification types now have unique icons and colors
  
- **Soft Rejection System (Pre-Interview)** - For applicants who won't get an interview:
  - "Not Moving Forward" button in Form Submissions
  - Preview modal before sending
  - Availability-focused messaging (not mentioning other candidates)
  - Keep-on-file response with Yes/No buttons
  - Response tracking page for applicants

- **Post-Interview Rejection System** - For applicants who had an interview but won't be hired:
  - "Not Moving Forward" button in Interview Scheduler (Upcoming Interviews)
  - Preview modal with interview date/time
  - Simple, warm thank-you message
  - Same keep-on-file option

- **UI Fixes**:
  - Removed "Prefers: Text/Email" badges (email only now)
  - Made Interview Scheduler collapsible
  - Removed password key icon from Form Submissions header
  - Fixed applicant card layout (email/phone no longer running off page)
  - Fixed schedule page footer to link to contact page instead of "reply to email"
  - Removed "Contact Preference" from confirmation emails

- **Twilio Cleanup**:
  - Stripped all SMS/Twilio functionality per user request
  - System is now 100% email-based for notifications

### Previously Implemented
- Full Interview Scheduler system (Admin UI, Applicant Booking, Cancel/Reschedule)
- Job Application form with work history
- GPS Mileage tracking
- Employee time tracking and payroll
- Consignment management portal
- Password reset via magic link
- Tax prep tools

## Prioritized Backlog

### P0 (Critical)
- Refactor `ConsignmentAgreementForm.jsx` (~3850 lines) - Major tech debt

### P1 (High)
- Android app submission guidance
- Payroll Summary penny-for-penny verification in production
- Refactor `FormSubmissionModal.jsx` (>1100 lines)

### P2 (Medium)
- Amazon Business Supplies Quick Links
- Fast Shipping Labels (Pirate Ship integration)
- Dynamic QR Code for app stores (onelink.to)
- Auto-calculate future 1099s

### P3 (Low)
- Additional notification customization

## Technical Architecture
- Frontend: React + Capacitor (iOS/Android)
- Backend: FastAPI + MongoDB
- Email: Resend
- Push Notifications: Firebase + APNs

## Key Files
- `/app/backend/app/routers/interview_scheduler.py` - Interview scheduling + rejection
- `/app/backend/app/routers/forms.py` - Form submissions + pre-interview rejection
- `/app/backend/app/services/email_service.py` - All email templates
- `/app/frontend/src/components/admin/sections/InterviewSchedulerSection.jsx`
- `/app/frontend/src/components/admin/modals/FormSubmissionModal.jsx`
- `/app/frontend/src/pages/ApplicationResponsePage.jsx` - Keep-on-file response
