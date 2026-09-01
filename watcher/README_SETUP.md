# AnyDesk Session Watcher — Windows Setup Guide

Tracks remote workers logging into this PC via AnyDesk and reports sessions
to the Thrifty Curator admin dashboard (Team Management → Remote Sessions).

No AnyDesk API or paid plan required — it reads AnyDesk's local log files.

---

## 1. Install Python (one time)
1. Download Python 3.11+ from https://www.python.org/downloads/windows/
2. During install, CHECK "Add python.exe to PATH".

## 2. Install the watcher
1. Copy this `watcher` folder to the Windows host, e.g. `C:\thrifty-watcher\`
2. Open Command Prompt and run:
   ```
   cd C:\thrifty-watcher
   pip install watchdog requests
   ```

## 3. Configure
Edit `watcher_config.json`:
- `backend_url`  — your deployed app URL (e.g. https://reseller-dashboard-11.emergent.host)
- `watcher_key`  — the value of `ANYDESK_WATCHER_KEY` from the app backend .env
  (ask the app admin / check backend environment settings). Keep this secret.
- `host_label`   — a friendly name for this PC (shows in the dashboard)
- `trace_files`  — leave empty `[]` to auto-detect. AnyDesk stores its log at
  `%appdata%\AnyDesk\connection_trace.txt` (per-user install) or
  `C:\ProgramData\AnyDesk\connection_trace.txt` (installed as a service).
- `parse_service_trace` — `true` enables best-effort session END detection from
  `ad_svc.trace`/`ad.trace` so durations can be computed. If AnyDesk updates
  change that log format, you still get every session START reliably.

## 4. Test it
```
cd C:\thrifty-watcher
python anydesk_session_watcher.py
```
Have a remote worker connect via AnyDesk. Within ~30 seconds you should see
"Session start: AnyDesk ID ..." in the console and the session should appear
in the admin dashboard under Team Management → Remote Sessions.

Note: on first run the watcher starts from the END of the log file — it only
reports NEW sessions, not historical ones.

## 5. Run automatically at startup (pick ONE)

### Option A — Task Scheduler (simplest)
1. Open Task Scheduler → Create Task
2. General: Name "AnyDesk Session Watcher", check "Run whether user is logged on or not"
3. Triggers: New → "At startup"
4. Actions: New →
   - Program: `pythonw.exe` (full path, e.g. `C:\Users\YOU\AppData\Local\Programs\Python\Python311\pythonw.exe`)
   - Arguments: `C:\thrifty-watcher\anydesk_session_watcher.py`
   - Start in: `C:\thrifty-watcher`
5. Settings: check "If the task fails, restart every 1 minute"

### Option B — NSSM (runs as a proper Windows service)
1. Download NSSM from https://nssm.cc/download, extract `nssm.exe`
2. Run as Administrator:
   ```
   nssm install AnyDeskWatcher "C:\...\python.exe" "C:\thrifty-watcher\anydesk_session_watcher.py"
   nssm set AnyDeskWatcher AppDirectory C:\thrifty-watcher
   nssm set AnyDeskWatcher AppRestartDelay 5000
   nssm start AnyDeskWatcher
   ```

## 6. Troubleshooting
- `watcher.log` in the watcher folder has all activity and errors.
- Failed uploads (e.g. internet down) are queued in `failed_events.jsonl`
  and retried automatically every 30 seconds.
- If `connection_trace.txt` doesn't exist yet, it appears after the first
  incoming AnyDesk connection.
- Durations show only when a session END could be detected; the session
  start (worker logged in) is always recorded.

## What gets recorded
Per session: AnyDesk ID, alias, incoming/outgoing, auth method (password/token/
manual accept or REJECTED), start time, end time + duration when detectable,
and which host PC it happened on. In the dashboard you can assign a worker
name to each AnyDesk ID so sessions show "Maria" instead of "123456789".

## What happens automatically
- **Session Alerts**: Admins get a push notification when a remote worker connects
  or when a connection is rejected.
- **Auto Clock-Out**: When an AnyDesk session ends (worker disconnects), the system
  automatically clocks out any employee still clocked in who is mapped to that
  AnyDesk ID. The time entry shows "Auto-closed by AnyDesk disconnect".
- **Cross-Check Flags**: If a worker has been on AnyDesk for 3+ minutes without
  clocking in, or is clocked in with no active AnyDesk session, admins get a push
  notification (once per hour per flag). Admin-initiated clock-ins are excluded.
