# Test Credentials

## Employee Portal
- Email: `testemployee@thriftycurator.com`
- Name: Test Employee
- Password: Not required (no password set)

## Remote Worker Test Account
- Email: `remote_worker@test.com`
- Name: Remote Test Worker
- Password: Not required
- Note: Used for testing AnyDesk remote worker UI section

## Other Test Employees
- Email: `matthewjguzman1@gmail.com` (Matthew Guzman - owner)
- Email: `test@test.com` (Test)
- Email: `tester@tester.com` (Tester) — Password: `legacy1234` (bcrypt, migrated from legacy sha256)

## Consignor Portal (magic link auth)
- Test consignor agreement email: `test@test.com` (name: Test, no password set)
- Login flow: enter email on /consignment-agreement (Add More Items) → POST /api/forms/consignment/request-login-link → one-time token stored in db.consignor_login_tokens → POST /api/forms/consignment/verify-login-link {token} → returns consignor JWT (role "consignor")
- Frontend stores JWT in localStorage key `consignorToken` (+ `consignorEmail`); email link format: FRONTEND_URL/consignment-agreement?login_token=TOKEN
- Consignor-protected endpoints require `Authorization: Bearer <consignorToken>`

## Admin Access
- Admin access code for Matthew Guzman: `4399`
- Admin email: `matthewjesusguzman1@gmail.com`
- Admin code for Eunice Guzman: `0826`
- Admin email: `euniceguzman@thriftycurator.com`

## Notes
- Employee login flow: Enter email -> Find My Account -> Dashboard
- Admin login flow: Enter admin email -> Find My Account -> Enter 4-digit code -> Sign In
- Employees without passwords can log in directly; those with passwords must enter them
- Admin users were removed from the system except for business owners
- Remote workers see the AnyDesk Remote Work Setup section in their dashboard
