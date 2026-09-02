"""
AnyDesk Session Watcher for Thrifty Curator
============================================
Monitors AnyDesk's local connection_trace.txt (and optionally trace files)
on a macOS or Windows host and posts session events to the Thrifty Curator backend.

Requirements:  pip install watchdog requests
Run:           python anydesk_session_watcher.py
Config:        watcher_config.json in the same folder (see README_SETUP.md)
"""

import json
import os
import re
import sys
import time
import hashlib
import logging
import platform
from datetime import datetime
from pathlib import Path

import requests
from watchdog.observers.polling import PollingObserver
from watchdog.events import FileSystemEventHandler
from datetime import timezone


def local_to_utc_iso(date_part, time_part):
    """AnyDesk connection_trace.txt uses the PC's local time; convert to UTC ISO for the backend."""
    if len(time_part) == 5:
        time_part += ":00"
    naive = datetime.strptime(f"{date_part} {time_part}", "%Y-%m-%d %H:%M:%S")
    return naive.astimezone().astimezone(timezone.utc).isoformat()


def as_utc_iso(date_part, time_part):
    """macOS /var/log/anydesk.trace timestamps are already in UTC."""
    if len(time_part) == 5:
        time_part += ":00"
    dt = datetime.strptime(f"{date_part} {time_part}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return dt.isoformat()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "watcher_config.json")
STATE_PATH = os.path.join(BASE_DIR, "watcher_state.json")
RETRY_QUEUE_PATH = os.path.join(BASE_DIR, "failed_events.jsonl")
IS_MAC = platform.system() == "Darwin"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(BASE_DIR, "watcher.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("anydesk-watcher")

# Line format in connection_trace.txt (Windows):
#   Incoming    2026-09-01, 14:02    123456789    worker-alias    User
TRACE_LINE_RE = re.compile(
    r"^\s*(Incoming|Outgoing)\s+(\d{4}-\d{2}-\d{2}),?\s+(\d{2}:\d{2}(?::\d{2})?)\s+(\S+)\s*(\S*)\s*(\S*)\s*$"
)
# Session-end detection in trace files (tightened to app.backend_session only)
SVC_END_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}).*?app\.backend_session\s*-\s*[Ss]ession (?:closed|stopped|ended)"
)
# macOS /var/log/anydesk.trace session start:
#   info 2026-09-01 22:42:37.609  back  wrk1 ... app.backend_session - Incoming session request: - (1131282862)
MAC_SESSION_START_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\.\d+\s+.*?app\.backend_session\s*-\s*Incoming session request:\s*-?\s*\((\d+)\)"
)
# macOS auth: "3: Authenticated with permanent token."
MAC_AUTH_RE = re.compile(
    r"app\.session\s*-\s*\d+:\s*Authenticated with\s+(.+)\."
)


def default_trace_paths():
    """Auto-detect AnyDesk connection_trace.txt location (macOS + Windows)."""
    paths = []
    if IS_MAC:
        # macOS: portable (uninstalled) location
        home = str(Path.home())
        paths.append(os.path.join(home, ".anydesk", "connection_trace.txt"))
        # macOS: custom client variants
        anydesk_dirs = [d for d in Path(home).glob(".anydesk_ad_*") if d.is_dir()]
        for d in anydesk_dirs:
            paths.append(str(d / "connection_trace.txt"))
    else:
        # Windows
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            paths.append(os.path.join(appdata, "AnyDesk", "connection_trace.txt"))
        paths.append(r"C:\ProgramData\AnyDesk\connection_trace.txt")
    return paths


def default_service_trace_paths():
    """Auto-detect AnyDesk service/session trace files for end-of-session detection."""
    paths = []
    if IS_MAC:
        home = str(Path.home())
        # macOS portable
        paths.append(os.path.join(home, ".anydesk", "anydesk.trace"))
        # macOS installed
        paths.append("/var/log/anydesk.trace")
        # macOS custom client variants
        anydesk_dirs = [d for d in Path(home).glob(".anydesk_ad_*") if d.is_dir()]
        for d in anydesk_dirs:
            for f in d.glob("anydesk*.trace"):
                paths.append(str(f))
    else:
        # Windows
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            paths.append(os.path.join(appdata, "AnyDesk", "ad.trace"))
        paths.append(r"C:\ProgramData\AnyDesk\ad_svc.trace")
    return paths


def load_config():
    if not os.path.exists(CONFIG_PATH):
        log.error(f"Missing config file: {CONFIG_PATH}. See README_SETUP.md")
        sys.exit(1)
    with open(CONFIG_PATH) as f:
        cfg = json.load(f)
    for key in ("backend_url", "watcher_key", "host_label"):
        if not cfg.get(key):
            log.error(f"Config missing required key: {key}")
            sys.exit(1)
    cfg["backend_url"] = cfg["backend_url"].rstrip("/")
    if not cfg.get("trace_files"):
        cfg["trace_files"] = [p for p in default_trace_paths() if os.path.exists(p)]
        if not cfg["trace_files"]:
            log.warning("No connection_trace.txt found yet - will keep watching default locations")
            cfg["trace_files"] = default_trace_paths()
    if cfg.get("parse_service_trace", True):
        svc_paths = default_service_trace_paths()
        cfg["service_trace_files"] = [p for p in svc_paths if os.path.exists(p)] or svc_paths
    else:
        cfg["service_trace_files"] = []
    log.info(f"Platform: {'macOS' if IS_MAC else 'Windows'}")
    return cfg


class State:
    """Persists file offsets + processed line fingerprints (dedup across restarts)."""

    def __init__(self):
        self.offsets = {}
        self.fingerprints = []
        if os.path.exists(STATE_PATH):
            try:
                with open(STATE_PATH) as f:
                    data = json.load(f)
                self.offsets = data.get("offsets", {})
                self.fingerprints = data.get("fingerprints", [])
            except (json.JSONDecodeError, OSError):
                log.warning("State file corrupt - starting fresh")

    def save(self):
        with open(STATE_PATH, "w") as f:
            json.dump({"offsets": self.offsets, "fingerprints": self.fingerprints[-5000:]}, f)

    def seen(self, fp):
        return fp in self.fingerprints

    def mark(self, fp):
        self.fingerprints.append(fp)


def parse_connection_trace_line(line):
    m = TRACE_LINE_RE.match(line)
    if not m:
        return None
    direction, date_part, time_part, anydesk_id, alias, auth = m.groups()
    # Handle lines where the alias column is empty (e.g. rejected attempts)
    auth_tokens = {"User", "Passwd", "Token", "REJECTED", "Permanent"}
    if not auth and alias in auth_tokens:
        auth, alias = alias, None
    ts = local_to_utc_iso(date_part, time_part)
    return {
        "event_type": "session_start",
        "direction": direction,
        "timestamp": ts,
        "anydesk_id": anydesk_id,
        "alias": alias or None,
        "auth_method": auth or None,
        "raw_line": line.strip()
    }


def parse_service_trace_line(line):
    """Parse session END from trace file (both Windows and macOS)."""
    m = SVC_END_RE.search(line)
    if not m:
        return None
    date_part, time_part = m.group(1), m.group(2)
    ts = as_utc_iso(date_part, time_part) if IS_MAC else local_to_utc_iso(date_part, time_part)
    return {
        "event_type": "session_end",
        "timestamp": ts,
        "anydesk_id": None,
        "raw_line": line.strip()[:300]
    }


def parse_mac_trace_start(line):
    """Parse session START from macOS /var/log/anydesk.trace format."""
    m = MAC_SESSION_START_RE.search(line)
    if not m:
        return None
    date_part, time_part, anydesk_id = m.groups()
    # Check for auth method on the same line or nearby (usually a few lines later)
    auth_m = MAC_AUTH_RE.search(line)
    auth_method = auth_m.group(1) if auth_m else None
    return {
        "event_type": "session_start",
        "direction": "Incoming",
        "timestamp": as_utc_iso(date_part, time_part),
        "anydesk_id": anydesk_id,
        "alias": None,
        "auth_method": auth_method,
        "raw_line": line.strip()[:300]
    }


def poll_commands(cfg):
    """Poll backend for pending commands (disconnect, etc.) and execute them."""
    url = f"{cfg['backend_url']}/api/remote-sessions/watcher-commands"
    try:
        resp = requests.get(url, headers={"X-Watcher-Key": cfg["watcher_key"]}, timeout=10)
        if resp.status_code != 200:
            return
        data = resp.json()
        commands = data.get("commands", [])
        blocked_ids = set(data.get("blocked_ids", []))

        # Store blocked IDs in config for quick lookup during scan
        cfg["_blocked_ids"] = blocked_ids

        for cmd in commands:
            cmd_id = cmd.get("id")
            cmd_type = cmd.get("command")
            anydesk_id = cmd.get("anydesk_id")
            reason = cmd.get("reason", "")
            log.warning(f"Received command: {cmd_type} (ID: {anydesk_id}) — {reason}")

            if cmd_type == "disconnect":
                success = execute_disconnect()
                ack_command(cfg, cmd_id, success)
            else:
                log.warning(f"Unknown command type: {cmd_type}")
                ack_command(cfg, cmd_id, False)
    except requests.RequestException as e:
        log.debug(f"Command poll failed (will retry): {e}")


def execute_disconnect():
    """Kill AnyDesk to drop all connections. AnyDesk will auto-restart via its system service.
    Blocked users (auto-blocked on disconnect) will be caught by check_blocked_session on reconnect."""
    import subprocess
    try:
        if IS_MAC:
            log.warning("Executing disconnect: killing AnyDesk (it will auto-restart, blocked users stay blocked)...")
            subprocess.run(["pkill", "-9", "-x", "AnyDesk"], timeout=5, capture_output=True)
            # Also catch helper processes
            subprocess.run(["killall", "-9", "AnyDesk"], timeout=5, capture_output=True)
        else:
            log.warning("Executing disconnect: killing AnyDesk (Windows)...")
            subprocess.run(["taskkill", "/F", "/IM", "AnyDesk.exe"], timeout=5)

        log.info("AnyDesk killed. It will auto-restart. Blocked users cannot reconnect.")
        return True
    except Exception as e:
        log.error(f"Disconnect execution failed: {e}")
        return False


def ack_command(cfg, command_id, success):
    """Acknowledge a command back to the backend."""
    url = f"{cfg['backend_url']}/api/remote-sessions/watcher-commands/ack"
    try:
        requests.post(url, params={"command_id": command_id, "success": success},
                       headers={"X-Watcher-Key": cfg["watcher_key"]}, timeout=10)
    except requests.RequestException:
        pass


def check_blocked_session(cfg, anydesk_id):
    """If a session start is from a blocked ID, auto-issue disconnect."""
    blocked_ids = cfg.get("_blocked_ids", set())
    if anydesk_id and anydesk_id in blocked_ids:
        log.warning(f"BLOCKED AnyDesk ID {anydesk_id} detected! Auto-disconnecting...")
        execute_disconnect()
        return True
    return False


def send_heartbeat(cfg):
    """Report watcher status + whether AnyDesk is actually running to the backend."""
    import subprocess
    try:
        # Check if AnyDesk process is running
        if IS_MAC:
            result = subprocess.run(["pgrep", "-x", "AnyDesk"], capture_output=True, timeout=5)
            anydesk_running = result.returncode == 0
        else:
            result = subprocess.run(["tasklist", "/FI", "IMAGENAME eq AnyDesk.exe"], capture_output=True, text=True, timeout=5)
            anydesk_running = "AnyDesk.exe" in result.stdout

        url = f"{cfg['backend_url']}/api/remote-sessions/heartbeat"
        requests.post(url, json={
            "host": cfg["host_label"],
            "anydesk_running": anydesk_running,
        }, headers={"X-Watcher-Key": cfg["watcher_key"]}, timeout=10)
    except Exception as e:
        log.debug(f"Heartbeat failed: {e}")


def post_events(cfg, events):
    if not events:
        return True
    url = f"{cfg['backend_url']}/api/remote-sessions/log"
    payload = {"host": cfg["host_label"], "events": events}
    try:
        resp = requests.post(url, json=payload, headers={"X-Watcher-Key": cfg["watcher_key"]}, timeout=15)
        if resp.status_code == 200:
            r = resp.json()
            log.info(f"Posted {len(events)} event(s): processed={r.get('processed')} dupes={r.get('duplicates')} ends_matched={r.get('matched_ends')}")
            return True
        log.error(f"Backend rejected events: HTTP {resp.status_code} {resp.text[:200]}")
    except requests.RequestException as e:
        log.error(f"Failed to reach backend: {e}")
    # queue for retry
    with open(RETRY_QUEUE_PATH, "a", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev) + "\n")
    return False


def retry_failed(cfg):
    if not os.path.exists(RETRY_QUEUE_PATH):
        return
    try:
        with open(RETRY_QUEUE_PATH, encoding="utf-8") as f:
            events = [json.loads(l) for l in f if l.strip()]
    except (json.JSONDecodeError, OSError):
        return
    if not events:
        return
    os.remove(RETRY_QUEUE_PATH)
    log.info(f"Retrying {len(events)} queued event(s)")
    post_events(cfg, events[:200])


def read_new_lines(path, state):
    """Read appended lines without locking; handles truncation/recreation."""
    if not os.path.exists(path):
        state.offsets.pop(path, None)
        return []
    try:
        size = os.path.getsize(path)
        offset = state.offsets.get(path, None)
        if offset is None:
            # First run: start at end of file (only track NEW sessions)
            state.offsets[path] = size
            return []
        if size < offset:
            log.info(f"{os.path.basename(path)} was truncated/recreated - rescanning from start")
            offset = 0
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            f.seek(offset)
            data = f.read()
            state.offsets[path] = f.tell()
        return [l for l in data.splitlines() if l.strip()]
    except OSError as e:
        log.error(f"Cannot read {path}: {e}")
        return []


def scan_all(cfg, state):
    events = []

    # 1. Windows: connection_trace.txt → session starts
    for path in cfg["trace_files"]:
        for line in read_new_lines(path, state):
            ev = parse_connection_trace_line(line)
            if ev:
                fp = hashlib.sha256((path + line).encode()).hexdigest()
                if not state.seen(fp):
                    state.mark(fp)
                    events.append(ev)
                    log.info(f"Session start: AnyDesk ID {ev['anydesk_id']} ({ev.get('alias') or 'no alias'}) at {ev['timestamp']}")
                    # Check if this ID is blocked — auto-disconnect immediately
                    check_blocked_session(cfg, ev['anydesk_id'])

    # 2. Service trace files → session ends + macOS session starts
    for path in cfg["service_trace_files"]:
        last_start_ev_index = None  # Track last start event to attach auth retroactively
        for line in read_new_lines(path, state):
            fp = hashlib.sha256((path + line).encode()).hexdigest()
            if state.seen(fp):
                continue

            # Check for macOS session start (Incoming session request with AnyDesk ID)
            start_ev = parse_mac_trace_start(line)
            if start_ev:
                state.mark(fp)
                events.append(start_ev)
                last_start_ev_index = len(events) - 1
                log.info(f"Session start: AnyDesk ID {start_ev['anydesk_id']} at {start_ev['timestamp']}")
                check_blocked_session(cfg, start_ev['anydesk_id'])
                continue

            # Auth line comes AFTER the session start — attach to the most recent start
            auth_m = MAC_AUTH_RE.search(line)
            if auth_m and last_start_ev_index is not None:
                auth_method = auth_m.group(1)
                events[last_start_ev_index]["auth_method"] = auth_method
                log.info(f"  Auth: {auth_method}")
                state.mark(fp)
                last_start_ev_index = None
                continue

            # Check for session end
            end_ev = parse_service_trace_line(line)
            if end_ev:
                state.mark(fp)
                events.append(end_ev)
                log.info(f"Session end detected at {end_ev['timestamp']}")

    if events:
        post_events(cfg, events)
        state.save()


class TraceHandler(FileSystemEventHandler):
    def __init__(self, cfg, state):
        self.cfg = cfg
        self.state = state

    def on_modified(self, event):
        if event.is_directory:
            return
        name = os.path.basename(event.src_path).lower()
        # Trigger on any known AnyDesk log file (Windows or macOS names)
        if name in ("connection_trace.txt", "ad.trace", "ad_svc.trace") or name.startswith("anydesk"):
            scan_all(self.cfg, self.state)


def main():
    cfg = load_config()
    state = State()
    log.info(f"AnyDesk watcher starting. Host label: {cfg['host_label']}")
    log.info(f"Watching: {cfg['trace_files'] + cfg['service_trace_files']}")

    observer = PollingObserver(timeout=2)
    watch_dirs = {os.path.dirname(p) for p in cfg["trace_files"] + cfg["service_trace_files"] if os.path.dirname(p)}
    handler = TraceHandler(cfg, state)
    for d in watch_dirs:
        if os.path.isdir(d):
            observer.schedule(handler, d, recursive=False)
            log.info(f"Watching directory: {d}")
    observer.start()

    try:
        last_scan = 0
        last_heartbeat = 0
        while True:
            now = time.time()
            # Full scan + retry every 30 seconds
            if now - last_scan >= 30:
                scan_all(cfg, state)
                retry_failed(cfg)
                last_scan = now
            # Poll for commands every cycle (every 10s)
            poll_commands(cfg)
            # Heartbeat every 60 seconds
            if now - last_heartbeat >= 60:
                send_heartbeat(cfg)
                last_heartbeat = now
            time.sleep(10)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    state.save()


if __name__ == "__main__":
    main()
