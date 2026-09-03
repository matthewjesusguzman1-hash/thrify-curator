# AnyDesk Session Watcher — Setup Guide (macOS & Windows)

Tracks remote workers logging into this computer via AnyDesk and reports sessions
to the Thrifty Curator admin dashboard (Remote Sessions page).

No AnyDesk API or paid plan required — it reads AnyDesk's local log files.

---

## 1. Install Python (one time)

### macOS
Python 3 is often pre-installed. Check by opening Terminal and running:
```
python3 --version
```
If not installed, download from https://www.python.org/downloads/macos/

### Windows
Download Python 3.11+ from https://www.python.org/downloads/windows/
During install, CHECK "Add python.exe to PATH".

## 2. Install the watcher
1. Create a folder for the watcher files, e.g.:
   - **macOS**: `~/thrifty-watcher/`
   - **Windows**: `C:\thrifty-watcher\`
2. Download these 3 files from GitHub into that folder:
   - `anydesk_session_watcher.py`
   - `watcher_config.json`
   - `README_SETUP.md` (this file)
3. Open Terminal (macOS) or Command Prompt (Windows) and run:
   ```
   cd ~/thrifty-watcher        # macOS
   cd C:\thrifty-watcher       # Windows

   pip3 install watchdog requests   # macOS
   pip install watchdog requests    # Windows
   ```

## 3. Configure
Edit `watcher_config.json`:
- `backend_url`  — your deployed app URL (e.g. https://thrifty-curator.com)
- `watcher_key`  — the value of `ANYDESK_WATCHER_KEY` from the app backend .env
  (check your backend environment settings). Keep this secret.
- `host_label`   — a friendly name for this computer (shows in the dashboard)
- `trace_files`  — leave empty `[]` to auto-detect:
  - **macOS**: `~/.anydesk/connection_trace.txt`
  - **Windows**: `%appdata%\AnyDesk\connection_trace.txt` or `C:\ProgramData\AnyDesk\connection_trace.txt`
- `parse_service_trace` — `true` enables best-effort session END detection so
  durations can be computed and **auto clock-out** works on disconnect.

## 4. Test it
```
cd ~/thrifty-watcher           # macOS
python3 anydesk_session_watcher.py

cd C:\thrifty-watcher          # Windows
python anydesk_session_watcher.py
```
Have a remote worker connect via AnyDesk. Within ~30 seconds you should see
"Session start: AnyDesk ID ..." in the console and the session should appear
in the admin dashboard under Remote Sessions.

Note: on first run the watcher starts from the END of the log file — it only
reports NEW sessions, not historical ones.

## 5. Run automatically at startup

### macOS — Launch Agent (recommended)
1. Create a plist file:
   ```
   nano ~/Library/LaunchAgents/com.thriftycurator.anydesk-watcher.plist
   ```
2. Paste this (update paths if different):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
     "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key>
     <string>com.thriftycurator.anydesk-watcher</string>
     <key>ProgramArguments</key>
     <array>
       <string>/usr/bin/python3</string>
       <string>/Users/YOUR_USERNAME/thrifty-watcher/anydesk_session_watcher.py</string>
     </array>
     <key>WorkingDirectory</key>
     <string>/Users/YOUR_USERNAME/thrifty-watcher</string>
     <key>RunAtLoad</key>
     <true/>
     <key>KeepAlive</key>
     <true/>
     <key>StandardOutPath</key>
     <string>/Users/YOUR_USERNAME/thrifty-watcher/stdout.log</string>
     <key>StandardErrorPath</key>
     <string>/Users/YOUR_USERNAME/thrifty-watcher/stderr.log</string>
   </dict>
   </plist>
   ```
3. Replace `YOUR_USERNAME` with your actual macOS username
4. Load it:
   ```
   launchctl load ~/Library/LaunchAgents/com.thriftycurator.anydesk-watcher.plist
   ```
5. To stop: `launchctl unload ~/Library/LaunchAgents/com.thriftycurator.anydesk-watcher.plist`

### Windows — Task Scheduler
1. Open Task Scheduler → Create Task
2. General: Name "AnyDesk Session Watcher", check "Run whether user is logged on or not"
3. Triggers: New → "At startup"
4. Actions: New →
   - Program: `pythonw.exe` (full path, e.g. `C:\Users\YOU\AppData\Local\Programs\Python\Python311\pythonw.exe`)
   - Arguments: `C:\thrifty-watcher\anydesk_session_watcher.py`
   - Start in: `C:\thrifty-watcher`
5. Settings: check "If the task fails, restart every 1 minute"

## 6. Troubleshooting
- `watcher.log` in the watcher folder has all activity and errors.
- Failed uploads (e.g. internet down) are queued in `failed_events.jsonl`
  and retried automatically every 30 seconds.
- If `connection_trace.txt` doesn't exist yet, it appears after the first
  incoming AnyDesk connection.
- Durations show only when a session END could be detected; the session
  start (worker logged in) is always recorded.
- **macOS permissions**: If the watcher can't read AnyDesk files, you may need
  to grant Terminal (or python3) Full Disk Access in System Settings →
  Privacy & Security → Full Disk Access.

## What gets recorded
Per session: AnyDesk ID, alias, incoming/outgoing, auth method (password/token/
manual accept or REJECTED), start time, end time + duration when detectable,
and which host PC it happened on. In the dashboard you can assign a worker
name to each AnyDesk ID so sessions show "Maria" instead of "123456789".

## What happens automatically
- **Session Alerts**: Admins get a push notification when a remote worker connects
  or when a connection is rejected.
- **Shutdown & Restart**: Use the Shutdown button in the app to kill AnyDesk, and
  the Restart button to bring it back. The Shutdown modal shows who was connected
  and instructions for denying access via AnyDesk's Access Control List.
- **Cross-Check Flags**: If a worker has been on AnyDesk for 3+ minutes without
  clocking in, or is clocked in with no active AnyDesk session, admins get a push
  notification (once per hour per flag). Admin-initiated clock-ins are excluded.
