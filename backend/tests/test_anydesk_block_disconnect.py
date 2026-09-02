"""
Test AnyDesk Block/Disconnect Features
=======================================
Tests for:
- POST /api/remote-sessions/block - Block an AnyDesk ID
- DELETE /api/remote-sessions/block/{anydesk_id} - Unblock an ID
- GET /api/remote-sessions/blocklist - Get blocked IDs
- POST /api/remote-sessions/disconnect - Queue disconnect command
- GET /api/remote-sessions/watcher-commands - Get pending commands (watcher auth)
- POST /api/remote-sessions/watcher-commands/ack - Acknowledge command
- GET /api/remote-sessions/unread-count - Get alert count for badge
- Blocked connection alert creation on session_start
- Unmapped connection alert creation on session_start
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
WATCHER_KEY = "801fa06e7e9af0c61d969c91043a87054028007103357de9"

# Test data
TEST_ANYDESK_ID = f"TEST_{uuid.uuid4().hex[:8]}"
TEST_ANYDESK_ID_2 = f"TEST_{uuid.uuid4().hex[:8]}"
TEST_UNMAPPED_ID = f"UNMAPPED_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    # Login as admin
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matthewjesusguzman1@gmail.com",
        "admin_code": "4399"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def auth_header(admin_token):
    """Auth header for admin requests"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def watcher_header():
    """Auth header for watcher requests"""
    return {"X-Watcher-Key": WATCHER_KEY}


class TestBlocklistCRUD:
    """Test blocklist CRUD operations"""

    def test_block_anydesk_id(self, auth_header):
        """POST /api/remote-sessions/block - Block an AnyDesk ID"""
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/block",
            json={"anydesk_id": TEST_ANYDESK_ID, "reason": "Test block reason"},
            headers=auth_header
        )
        assert response.status_code == 200, f"Block failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        # Should include reminder message about AnyDesk settings
        assert "message" in data
        assert "AnyDesk" in data["message"]
        assert "Settings" in data["message"] or "Security" in data["message"]
        print(f"✓ Block endpoint returns reminder: {data['message'][:80]}...")

    def test_get_blocklist(self, auth_header):
        """GET /api/remote-sessions/blocklist - Get blocked IDs"""
        response = requests.get(
            f"{BASE_URL}/api/remote-sessions/blocklist",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert "blocked" in data
        # Find our test ID
        blocked_ids = [b["anydesk_id"] for b in data["blocked"]]
        assert TEST_ANYDESK_ID in blocked_ids, f"Test ID not in blocklist: {blocked_ids}"
        # Check blocked entry has required fields
        test_entry = next(b for b in data["blocked"] if b["anydesk_id"] == TEST_ANYDESK_ID)
        assert "reason" in test_entry
        assert "blocked_by" in test_entry
        assert "blocked_at" in test_entry
        print(f"✓ Blocklist contains {len(data['blocked'])} entries with reason/blocker info")

    def test_unblock_anydesk_id(self, auth_header):
        """DELETE /api/remote-sessions/block/{anydesk_id} - Unblock an ID"""
        # First block a second ID
        requests.post(
            f"{BASE_URL}/api/remote-sessions/block",
            json={"anydesk_id": TEST_ANYDESK_ID_2},
            headers=auth_header
        )
        # Now unblock it
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/block/{TEST_ANYDESK_ID_2}",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Verify it's removed from blocklist
        blocklist_resp = requests.get(f"{BASE_URL}/api/remote-sessions/blocklist", headers=auth_header)
        blocked_ids = [b["anydesk_id"] for b in blocklist_resp.json()["blocked"]]
        assert TEST_ANYDESK_ID_2 not in blocked_ids
        print("✓ Unblock removes ID from blocklist")

    def test_unblock_nonexistent_returns_404(self, auth_header):
        """DELETE /api/remote-sessions/block/{anydesk_id} - 404 for non-existent ID"""
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/block/NONEXISTENT_ID_12345",
            headers=auth_header
        )
        assert response.status_code == 404
        print("✓ Unblock non-existent ID returns 404")


class TestDisconnectCommand:
    """Test disconnect command functionality"""

    def test_disconnect_queues_command(self, auth_header):
        """POST /api/remote-sessions/disconnect - Queue disconnect command"""
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/disconnect",
            json={"anydesk_id": TEST_ANYDESK_ID},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "command_id" in data
        assert "message" in data
        assert "watcher" in data["message"].lower() or "disconnect" in data["message"].lower()
        print(f"✓ Disconnect command queued: {data['command_id']}")
        return data["command_id"]


class TestWatcherCommands:
    """Test watcher command polling and acknowledgment"""

    def test_watcher_commands_requires_auth(self):
        """GET /api/remote-sessions/watcher-commands - Requires watcher key"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/watcher-commands")
        assert response.status_code == 401
        print("✓ Watcher commands endpoint requires auth")

    def test_watcher_commands_returns_pending(self, watcher_header, auth_header):
        """GET /api/remote-sessions/watcher-commands - Returns pending commands and blocked_ids"""
        # First queue a disconnect command
        disconnect_resp = requests.post(
            f"{BASE_URL}/api/remote-sessions/disconnect",
            json={"anydesk_id": f"WATCHER_TEST_{uuid.uuid4().hex[:6]}"},
            headers=auth_header
        )
        cmd_id = disconnect_resp.json().get("command_id")
        
        # Now poll as watcher
        response = requests.get(
            f"{BASE_URL}/api/remote-sessions/watcher-commands",
            headers=watcher_header
        )
        assert response.status_code == 200
        data = response.json()
        assert "commands" in data
        assert "blocked_ids" in data
        assert isinstance(data["commands"], list)
        assert isinstance(data["blocked_ids"], list)
        # Our command should be in the list
        cmd_ids = [c["id"] for c in data["commands"]]
        assert cmd_id in cmd_ids, f"Command {cmd_id} not in pending: {cmd_ids}"
        print(f"✓ Watcher commands returns {len(data['commands'])} pending, {len(data['blocked_ids'])} blocked IDs")
        return cmd_id

    def test_watcher_ack_command(self, watcher_header, auth_header):
        """POST /api/remote-sessions/watcher-commands/ack - Acknowledge command"""
        # Queue a command
        disconnect_resp = requests.post(
            f"{BASE_URL}/api/remote-sessions/disconnect",
            json={"anydesk_id": f"ACK_TEST_{uuid.uuid4().hex[:6]}"},
            headers=auth_header
        )
        cmd_id = disconnect_resp.json().get("command_id")
        
        # Acknowledge it
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/watcher-commands/ack",
            params={"command_id": cmd_id, "success": True},
            headers=watcher_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify it's no longer pending
        poll_resp = requests.get(f"{BASE_URL}/api/remote-sessions/watcher-commands", headers=watcher_header)
        pending_ids = [c["id"] for c in poll_resp.json()["commands"]]
        assert cmd_id not in pending_ids, "Acknowledged command should not be pending"
        print("✓ Watcher ack removes command from pending")


class TestUnreadCount:
    """Test unread count endpoint for header badge"""

    def test_unread_count_returns_counts(self, auth_header):
        """GET /api/remote-sessions/unread-count - Returns alert_count and active_sessions"""
        response = requests.get(
            f"{BASE_URL}/api/remote-sessions/unread-count",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert "alert_count" in data
        assert "active_sessions" in data
        assert isinstance(data["alert_count"], int)
        assert isinstance(data["active_sessions"], int)
        print(f"✓ Unread count: {data['alert_count']} alerts, {data['active_sessions']} active sessions")


class TestBlockedConnectionAlert:
    """Test that blocked AnyDesk ID creates alert and auto-queues disconnect"""

    def test_blocked_id_session_start_creates_alert(self, auth_header, watcher_header):
        """When blocked ID posts session_start, creates blocked_connection alert + disconnect command"""
        blocked_id = f"BLOCKED_TEST_{uuid.uuid4().hex[:6]}"
        
        # 1. Block the ID first
        block_resp = requests.post(
            f"{BASE_URL}/api/remote-sessions/block",
            json={"anydesk_id": blocked_id, "reason": "Test blocked connection"},
            headers=auth_header
        )
        assert block_resp.status_code == 200
        
        # 2. Post a session_start from this blocked ID (recent timestamp)
        now = datetime.now(timezone.utc)
        log_resp = requests.post(
            f"{BASE_URL}/api/remote-sessions/log",
            json={
                "host": "test-host",
                "events": [{
                    "event_type": "session_start",
                    "anydesk_id": blocked_id,
                    "alias": "blocked-user",
                    "auth_method": "Token",
                    "direction": "Incoming",
                    "timestamp": now.isoformat(),
                    "raw_line": f"Incoming {now.strftime('%Y-%m-%d')}, {now.strftime('%H:%M')} {blocked_id} blocked-user Token"
                }]
            },
            headers=watcher_header
        )
        assert log_resp.status_code == 200
        
        # 3. Check alerts for blocked_connection type
        alerts_resp = requests.get(f"{BASE_URL}/api/remote-sessions/alerts", headers=auth_header)
        assert alerts_resp.status_code == 200
        alerts = alerts_resp.json()["alerts"]
        blocked_alerts = [a for a in alerts if a.get("type") == "blocked_connection" and blocked_id in a.get("detail", "")]
        assert len(blocked_alerts) > 0, f"No blocked_connection alert found for {blocked_id}"
        print(f"✓ Blocked connection alert created: {blocked_alerts[0]['detail'][:60]}...")
        
        # 4. Check that a disconnect command was auto-queued
        cmds_resp = requests.get(f"{BASE_URL}/api/remote-sessions/watcher-commands", headers=watcher_header)
        commands = cmds_resp.json()["commands"]
        disconnect_cmds = [c for c in commands if c.get("anydesk_id") == blocked_id and c.get("command") == "disconnect"]
        assert len(disconnect_cmds) > 0, f"No auto-disconnect command for blocked ID {blocked_id}"
        print("✓ Auto-disconnect command queued for blocked ID")
        
        # Cleanup: unblock
        requests.delete(f"{BASE_URL}/api/remote-sessions/block/{blocked_id}", headers=auth_header)


class TestUnmappedConnectionAlert:
    """Test that unmapped AnyDesk ID creates unmapped_connection alert"""

    def test_unmapped_id_session_start_creates_alert(self, auth_header, watcher_header):
        """When unmapped ID posts session_start, creates unmapped_connection alert with 1h dedup"""
        unmapped_id = f"UNMAPPED_{uuid.uuid4().hex[:6]}"
        
        # Post a session_start from unmapped ID (recent timestamp)
        now = datetime.now(timezone.utc)
        log_resp = requests.post(
            f"{BASE_URL}/api/remote-sessions/log",
            json={
                "host": "test-host",
                "events": [{
                    "event_type": "session_start",
                    "anydesk_id": unmapped_id,
                    "alias": "unknown-user",
                    "auth_method": "Token",
                    "direction": "Incoming",
                    "timestamp": now.isoformat(),
                    "raw_line": f"Incoming {now.strftime('%Y-%m-%d')}, {now.strftime('%H:%M')} {unmapped_id} unknown-user Token"
                }]
            },
            headers=watcher_header
        )
        assert log_resp.status_code == 200
        
        # Check alerts for unmapped_connection type
        alerts_resp = requests.get(f"{BASE_URL}/api/remote-sessions/alerts", headers=auth_header)
        assert alerts_resp.status_code == 200
        alerts = alerts_resp.json()["alerts"]
        unmapped_alerts = [a for a in alerts if a.get("type") == "unmapped_connection" and unmapped_id in a.get("detail", "")]
        assert len(unmapped_alerts) > 0, f"No unmapped_connection alert found for {unmapped_id}"
        print(f"✓ Unmapped connection alert created: {unmapped_alerts[0]['detail'][:60]}...")

    def test_unmapped_alert_dedup_1_hour(self, auth_header, watcher_header):
        """Unmapped connection alert should not duplicate within 1 hour"""
        unmapped_id = f"DEDUP_{uuid.uuid4().hex[:6]}"
        now = datetime.now(timezone.utc)
        
        # Post first session_start
        requests.post(
            f"{BASE_URL}/api/remote-sessions/log",
            json={
                "host": "test-host",
                "events": [{
                    "event_type": "session_start",
                    "anydesk_id": unmapped_id,
                    "timestamp": now.isoformat(),
                    "raw_line": f"first {unmapped_id}"
                }]
            },
            headers=watcher_header
        )
        
        # Post second session_start (same ID, different timestamp)
        now2 = now + timedelta(minutes=5)
        requests.post(
            f"{BASE_URL}/api/remote-sessions/log",
            json={
                "host": "test-host",
                "events": [{
                    "event_type": "session_start",
                    "anydesk_id": unmapped_id,
                    "timestamp": now2.isoformat(),
                    "raw_line": f"second {unmapped_id}"
                }]
            },
            headers=watcher_header
        )
        
        # Check alerts - should only have ONE unmapped_connection for this ID
        alerts_resp = requests.get(f"{BASE_URL}/api/remote-sessions/alerts", headers=auth_header)
        alerts = alerts_resp.json()["alerts"]
        unmapped_alerts = [a for a in alerts if a.get("type") == "unmapped_connection" and unmapped_id in a.get("detail", "")]
        assert len(unmapped_alerts) == 1, f"Expected 1 deduped alert, got {len(unmapped_alerts)}"
        print("✓ Unmapped connection alert deduped within 1 hour")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_blocklist(self, auth_header):
        """Remove test entries from blocklist"""
        # Get blocklist
        resp = requests.get(f"{BASE_URL}/api/remote-sessions/blocklist", headers=auth_header)
        blocked = resp.json().get("blocked", [])
        # Remove test entries
        for entry in blocked:
            if entry["anydesk_id"].startswith("TEST_") or entry["anydesk_id"].startswith("BLOCKED_"):
                requests.delete(f"{BASE_URL}/api/remote-sessions/block/{entry['anydesk_id']}", headers=auth_header)
        print("✓ Test blocklist entries cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
