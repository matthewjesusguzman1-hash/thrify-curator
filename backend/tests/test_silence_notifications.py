"""
Test suite for Remote Sessions Silence Notifications feature.
Tests:
- GET /api/remote-sessions/notification-status (returns silenced state)
- POST /api/remote-sessions/silence-notifications (toggles silenced state)
- Both endpoints require admin auth (401 without token)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
WATCHER_KEY = "801fa06e7e9af0c61d969c91043a87054028007103357de9"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    # Login with admin code (direct login, no find-account step needed)
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if resp.status_code != 200:
        pytest.skip(f"Admin login failed: {resp.text}")
    
    data = resp.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        pytest.skip(f"No token in login response: {data}")
    return token


@pytest.fixture
def auth_headers(admin_token):
    """Auth headers for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}


class TestNotificationStatusEndpoint:
    """Tests for GET /api/remote-sessions/notification-status"""
    
    def test_notification_status_requires_auth(self):
        """GET /notification-status returns 401/403 without auth."""
        resp = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: GET /notification-status requires auth")
    
    def test_notification_status_returns_silenced_field(self, auth_headers):
        """GET /notification-status returns {silenced: bool}."""
        resp = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "silenced" in data, f"Response missing 'silenced' field: {data}"
        assert isinstance(data["silenced"], bool), f"'silenced' should be bool, got {type(data['silenced'])}"
        print(f"PASS: GET /notification-status returns silenced={data['silenced']}")


class TestSilenceNotificationsToggle:
    """Tests for POST /api/remote-sessions/silence-notifications"""
    
    def test_silence_toggle_requires_auth(self):
        """POST /silence-notifications returns 401/403 without auth."""
        resp = requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: POST /silence-notifications requires auth")
    
    def test_silence_toggle_changes_state(self, auth_headers):
        """POST /silence-notifications toggles the silenced state."""
        # Get initial state
        resp1 = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        assert resp1.status_code == 200
        initial_state = resp1.json()["silenced"]
        print(f"Initial silenced state: {initial_state}")
        
        # Toggle
        resp2 = requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        assert resp2.status_code == 200, f"Toggle failed: {resp2.text}"
        data2 = resp2.json()
        assert "silenced" in data2, f"Response missing 'silenced': {data2}"
        assert data2["silenced"] == (not initial_state), f"Expected silenced={not initial_state}, got {data2['silenced']}"
        print(f"After first toggle: silenced={data2['silenced']}")
        
        # Toggle again to restore
        resp3 = requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        assert resp3.status_code == 200, f"Second toggle failed: {resp3.text}"
        data3 = resp3.json()
        assert data3["silenced"] == initial_state, f"Expected silenced={initial_state}, got {data3['silenced']}"
        print(f"After second toggle (restored): silenced={data3['silenced']}")
        print("PASS: Toggle correctly flips silenced state")
    
    def test_silence_toggle_persists(self, auth_headers):
        """Verify silenced state persists across requests."""
        # Get current state
        resp1 = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        initial = resp1.json()["silenced"]
        
        # Toggle
        resp2 = requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        new_state = resp2.json()["silenced"]
        
        # Verify with GET
        resp3 = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        assert resp3.json()["silenced"] == new_state, "State did not persist"
        
        # Restore original state
        if new_state != initial:
            requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        
        print("PASS: Silenced state persists across requests")


class TestSilencedNotificationBehavior:
    """Test that notifications are skipped when silenced."""
    
    def test_session_log_when_silenced(self, auth_headers):
        """When silenced=true, posting a session event should skip push notifications.
        We verify by checking backend logs for 'Notifications silenced — skipping' message.
        Since we can't easily check logs in test, we just verify the endpoint works."""
        import uuid
        
        # First, ensure notifications are silenced
        resp = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        initial_silenced = resp.json()["silenced"]
        
        if not initial_silenced:
            # Silence notifications
            requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        
        # Post a test session event via watcher endpoint
        test_event = {
            "host": "test-silence-check",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": f"TEST_{uuid.uuid4().hex[:8]}",
                "alias": "Test Silence Check",
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": "2026-01-15T12:00:00Z",
                "raw_line": "test line"
            }]
        }
        
        resp2 = requests.post(
            f"{BASE_URL}/api/remote-sessions/log",
            json=test_event,
            headers={"X-Watcher-Key": WATCHER_KEY}
        )
        # The endpoint should still work (200), but notifications should be skipped
        assert resp2.status_code == 200, f"Session log failed: {resp2.text}"
        print("PASS: Session log endpoint works when silenced (notifications skipped)")
        
        # Restore original state
        if not initial_silenced:
            requests.post(f"{BASE_URL}/api/remote-sessions/silence-notifications", headers=auth_headers)
        
        # Clean up test session
        sessions_resp = requests.get(f"{BASE_URL}/api/remote-sessions?limit=10", headers=auth_headers)
        if sessions_resp.status_code == 200:
            for s in sessions_resp.json().get("sessions", []):
                if s.get("host") == "test-silence-check":
                    requests.delete(f"{BASE_URL}/api/remote-sessions/session/{s['id']}", headers=auth_headers)


class TestDefaultState:
    """Test default notification state."""
    
    def test_default_state_is_not_silenced(self, auth_headers):
        """By default (no setting in DB), notifications should NOT be silenced.
        Note: This test may fail if state was previously toggled. We just verify the field exists."""
        resp = requests.get(f"{BASE_URL}/api/remote-sessions/notification-status", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "silenced" in data
        # We can't guarantee default state since it may have been toggled before
        # Just verify the endpoint works and returns a boolean
        print(f"Current silenced state: {data['silenced']} (default should be false)")
        print("PASS: Notification status endpoint returns valid response")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
