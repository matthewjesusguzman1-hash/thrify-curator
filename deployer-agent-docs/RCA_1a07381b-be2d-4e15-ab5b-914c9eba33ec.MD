# RCA — Admin-to-admin push notifications not delivered (employee-to-admin works)

Deployment: reseller-dashboard-11 | Run: 1a07381b-be2d-4e15-ab5b-914c9eba33ec
Prod DB: secondhand-shop-25-test_database

## Verdict
The root cause is **NOT the sender-exclusion filter** and is **none of hypotheses (a)–(d)** as framed. The real cause is a **code-path asymmetry between two notification channels**:

- The **employee→admin** path (`send_admin_push_notification`) fans out over **web push** (`web_push_subscriptions`) **in addition to** APNs device tokens. The web-push leg is what actually reaches the admins.
- The **admin→admin** path (`send_other_admins_notification`, conversations.py ~line 186) fans out over **APNs `device_push_tokens` only** — it has **no web-push leg**.
- In production, **every APNs `device_push_tokens` row is `active:false` (0 active of 6)**. So the APNs channel is dead for everyone. The employee path survives purely on web push; the admin path has no web-push fallback and therefore delivers nothing.

The originally-suspected `user_id` sender exclusion is a **red herring**: with zero active admin APNs tokens, the pre-exclusion count is already 0, so exclusion never even runs against a candidate.

## Evidence

### 1. Backend logs (last 24h)
Admin→admin send (Matthew sending):
- `[ADMIN MSG] Admin Matthew Guzman (id: ab798217-710c-4525-b163-1a6a89abfb52) sent message to Katherine Genio Razon`
- `[ADMIN MSG] Looking for other admin tokens excluding user_id: ab798217-710c-4525-b163-1a6a89abfb52`
- `[PUSH] No active admin devices found`  ← query returns 0 tokens BEFORE exclusion; never reaches an APNs send. So NOT a "✗ Failed / status code" case.

Employee→admin send (same period), delivered via a DIFFERENT channel:
- `[WebPush] Payload: {"title": "Message from Katherine Genio Razon", ... "tag": "employee_message"}` — emitted **3×** (one per admin web-push subscription; see §3).
- `No active admin device tokens for employee_message notification`  ← the employee path's APNs leg ALSO finds 0 active tokens, but its **web-push leg still delivers**.

This single pair of log lines is the crux: both paths agree APNs has 0 active admin tokens; only the employee path additionally does web push, which is why only employee notifications arrive.

### 2. device_push_tokens (APNs) — all inactive
- Total docs: 6. **Active (active:true): 0** (whole collection). Active with user_type=admin: 0.
- Admin rows (device_token masked):
  - user_id `ab798217-...` (Matthew), user_type admin, **active:false**, updated 2026-08-24
  - user_id `02dd79fa-...` (Eunice), user_type admin, **active:false**, updated 2026-06-14
- Other 4 rows (employees) are also active:false.

### 3. web_push_subscriptions — this is the working channel
The collection keys admins by field **`role`**, NOT `user_type` (a `{user_type:"admin"}` filter returns 0 here — easy to miss). 3 docs, all `role:"admin"`:
- user_id `ab798217-...` (Matthew) — 2 subs, created 2026-08-19 & 2026-08-29
- user_id `02dd79fa-...` (Eunice) — 1 sub, created 2026-08-24
Both admins have live web-push subscriptions → both CAN receive web push. The `[WebPush]` payload fired 3× = these 3 subscriptions.

### 4. users (role=admin)
- Matthew Guzman — id `ab798217-710c-4525-b163-1a6a89abfb52` — email `matth***@gmail.com`
- Eunice Guzman — id `02dd79fa-4d07-4f8c-9229-e5bca0b72c24` — email `eunice***@thriftycurator.com`
Distinct user_ids → hypothesis (b) is false.

## Hypotheses (a)–(d) adjudicated
- (a) only the sender's token active → FALSE. ZERO active admin APNs tokens (both inactive).
- (b) both admins share one user_id → FALSE. Distinct ids (see §4).
- (c) receiver's token deactivated by same-device logic → NOT the mechanism. The receiver's (Eunice) token IS inactive, but so is the sender's and every other token; this is a blanket-stale APNs token population, not selective same-device deactivation of the receiver.
- (d) APNs send failing with a status code → FALSE. No send is attempted — the token query returns 0, logging "No active admin devices found" (never "✗ Failed for admin {id}: {status}").

## Why employee works but admin doesn't (one line)
Both channels' APNs leg is dead (0 active tokens). The employee path has a web-push leg that reaches both admins' `web_push_subscriptions`; the admin→admin path has no web-push leg, so it silently delivers nothing.

## Fix (SOURCE change — E1 to apply, not a deploy/manifest fix)
In `backend/app/routers/conversations.py`, `send_other_admins_notification()`: add a **web-push fan-out** mirroring the employee path (`send_admin_push_notification`). Specifically:
- Query `web_push_subscriptions` for the other admins — note the field is **`role: "admin"`** (not `user_type`), and exclude `user_id == sending_admin_id`.
- Send the web-push payload to each (same shape as the employee `[WebPush]` payload, with an appropriate tag e.g. `admin_message`).
- Keep the existing APNs leg as-is; it's simply inert until admins re-register active device tokens.

Secondary (optional, separate): investigate why ALL `device_push_tokens` are `active:false` in production (no admin or employee device has an active APNs token). APNs is currently delivering to no one; the app is running entirely on web push. Not required to fix this specific report, but worth noting.

## Notes
- Read-only investigation; no production state was changed. No redeploy performed.
- Field-name trap to flag to E1: `device_push_tokens` uses `user_type`; `web_push_subscriptions` uses `role`. Any unified query must account for both.
