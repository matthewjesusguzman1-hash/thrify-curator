"""
AnyDesk Session Watcher for Thrifty Curator
============================================
Monitors AnyDesk's local connection_trace.txt (and optionally ad_svc.trace)
on a Windows host and posts session events to the Thrifty Curator backend.

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
from datetime import datetime

import requests
from watchdog.observers.polling import PollingObserver
from watchdog.events import FileSystemEventHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "watcher_config.json")
STATE_PATH = os.path.join(BASE_DIR, "watcher_state.json")
RETRY_QUEUE_PATH = os.path.join(BASE_DIR, "failed_events.jsonl")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(BASE_DIR, "watcher.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("anydesk-watcher")

# Line format in connection_trace.txt:
#   Incoming    2026-09-01, 14:02    123456789    worker-alias    User
TRACE_LINE_RE = re.compile(
    r"^\s*(Incoming|Outgoing)\s+(\d{4}-\d{2}-\d{2}),?\s+(\d{2}:\d{2}(?::\d{2})?)\s+(\S+)\s*(\S*)\s*(\S*)\s*$"
)
# Best-effort session-end detection in ad_svc.trace / ad.trace
SVC_END_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}).*?[Ss]ession (?:closed|stopped|ended)"
)


def default_trace_paths():
    paths = []
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        paths.append(os.path.join(appdata, "AnyDesk", "connection_trace.txt"))
    paths.append(r"C:\ProgramData\AnyDesk\connection_trace.txt")
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
        svc_paths = []
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            svc_paths.append(os.path.join(appdata, "AnyDesk", "ad.trace"))
        svc_paths.append(r"C:\ProgramData\AnyDesk\ad_svc.trace")
        cfg["service_trace_files"] = [p for p in svc_paths if os.path.exists(p)] or svc_paths
    else:
        cfg["service_trace_files"] = []
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
    ts = f"{date_part}T{time_part if len(time_part) == 8 else time_part + ':00'}"
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
    m = SVC_END_RE.search(line)
    if not m:
        return None
    return {
        "event_type": "session_end",
        "timestamp": f"{m.group(1)}T{m.group(2)}",
        "anydesk_id": None,
        "raw_line": line.strip()[:300]
    }


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
    for path in cfg["trace_files"]:
        for line in read_new_lines(path, state):
            ev = parse_connection_trace_line(line)
            if ev:
                fp = hashlib.sha256((path + line).encode()).hexdigest()
                if not state.seen(fp):
                    state.mark(fp)
                    events.append(ev)
                    log.info(f"Session start: AnyDesk ID {ev['anydesk_id']} ({ev.get('alias') or 'no alias'}) at {ev['timestamp']}")
    for path in cfg["service_trace_files"]:
        for line in read_new_lines(path, state):
            ev = parse_service_trace_line(line)
            if ev:
                fp = hashlib.sha256((path + line).encode()).hexdigest()
                if not state.seen(fp):
                    state.mark(fp)
                    events.append(ev)
                    log.info(f"Session end detected at {ev['timestamp']}")
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
        if name in ("connection_trace.txt", "ad.trace", "ad_svc.trace"):
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
        while True:
            # Periodic safety scan + retry queue (covers missed FS events)
            scan_all(cfg, state)
            retry_failed(cfg)
            time.sleep(30)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    state.save()


if __name__ == "__main__":
    main()
