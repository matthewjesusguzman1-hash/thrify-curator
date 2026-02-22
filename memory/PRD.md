# Thrifty Curator - Product Requirements Document

## Original Problem Statement
Build a reselling app with links to major selling platforms, job application form, consignment inquiry form, consignment agreement form, TikTok link, share functionality, business logo, and employee login for tracking hours worked.

## User Personas
1. **Customers** - Browse platform links, submit consignment inquiries
2. **Job Seekers** - Submit job applications
3. **Employees** - Clock in/out, track work hours
4. **Admin** - View all employee hours, manage team

## Core Requirements (Static)
- Landing page with logo and platform links
- Links to eBay, Poshmark, Mercari, Depop, Facebook
- TikTok social link
- Share app functionality
- Job Application form
- Consignment Inquiry form
- Consignment Agreement form
- Employee authentication (JWT)
- Clock in/out functionality
- Hours tracking dashboard
- Admin dashboard

## What's Been Implemented (Jan 2026)
- [x] Landing page with Thrifty Curator logo
- [x] All 5 platform links with actual store URLs
- [x] TikTok link (@thrifty_curator)
- [x] Native share API integration
- [x] Job Application form with MongoDB storage
- [x] Consignment Inquiry form
- [x] Consignment Agreement form with e-signature
- [x] JWT authentication system
- [x] Employee registration/login
- [x] Clock in/out functionality with real-time timer
- [x] Hours summary (weekly, total, shifts)
- [x] Admin dashboard with employee hour reports

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Framer Motion
- Backend: FastAPI, MongoDB
- Auth: JWT with bcrypt password hashing

## Prioritized Backlog
### P0 (Critical)
- All complete

### P1 (High Priority)
- Email notifications for form submissions
- Password reset functionality
- Employee schedule management

### P2 (Medium Priority)
- Export hours to CSV/PDF
- Multi-location support
- Inventory integration with platforms

## Next Tasks
1. Add email notifications (SendGrid/Resend integration)
2. Implement password reset flow
3. Add date range filtering on admin dashboard
