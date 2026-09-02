"""
Test Remote Sessions Alert and Mapping Management Features:
1. POST /api/remote-sessions/watcher-commands/ack - watcher acknowledges command
2. DELETE /api/remote-sessions/alert/{dedup_key} - delete single alert
3. DELETE /api/remote-sessions/alerts - clear all alerts (with date/month params)
4. DELETE /api/remote-sessions/map/{anydesk_id} - delete worker mapping
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

# Configuration
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Test data from requirements
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
WATCHER_KEY = os.environ.get('ANYDESK_WATCHER_KEY', '801fa06e7e9af0c61d969c91043a87054028007103357de9')
TEST_ANYDESK_ID = f"TEST_ALERT_{uuid.uuid4().hex[:8]}"
TEST_DEDUP_KEY = f"test_alert_dedup_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def db():
    """Direct MongoDB connection for test data setup/cleanup"""
    client = MongoClient(MONGO_URL)
    database = client[DB_NAME]
    yield database
    client.close()


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, f"No access_token in response: {data}"
    return data["access_token"]


@pytest.fixture
def watcher_headers():
    """Headers for watcher API calls"""
    return {"X-Watcher-Key": WATCHER_KEY, "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(admin_token):
    """Headers for admin API calls"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data before and after each test"""
    # Cleanup before test
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": "^test_alert"}})
    db.anydesk_id_mappings.delete_many({"anydesk_id": {"$regex": "^TEST_ALERT"}})
    db.anydesk_commands.delete_many({"id": {"$regex": "^TEST_CMD"}})
    
    yield
    
    # Cleanup after test
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": "^test_alert"}})
    db.anydesk_id_mappings.delete_many({"anydesk_id": {"$regex": "^TEST_ALERT"}})
    db.anydesk_commands.delete_many({"id": {"$regex": "^TEST_CMD"}})


class TestWatcherCommandAck:
    """Test POST /api/remote-sessions/watcher-commands/ack endpoint"""
    
    def test_ack_no_watcher_key(self):
        """Should return 401 without watcher key"""
        response = requests.post(f"{BASE_URL}/api/remote-sessions/watcher-commands/ack?command_id=test&success=true")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Watcher ack requires watcher key")
    
    def test_ack_command_success(self, watcher_headers, db):
        """Should acknowledge command and update status to completed"""
        # Create a pending command
        command_id = f"TEST_CMD_{uuid.uuid4().hex[:8]}"
        db.anydesk_commands.insert_one({
            "id": command_id,
            "type": "disconnect",
            "anydesk_id": TEST_ANYDESK_ID,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Acknowledge the command
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/watcher-commands/ack?command_id={command_id}&success=true",
            headers=watcher_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        # Verify command status updated in DB
        command = db.anydesk_commands.find_one({"id": command_id})
        assert command is not None, "Command should exist"
        assert command.get("status") == "completed", f"Status should be 'completed', got {command.get('status')}"
        assert command.get("acked_at") is not None, "Should have acked_at timestamp"
        
        print(f"PASS: Watcher ack success - command {command_id} marked completed")
    
    def test_ack_command_failure(self, watcher_headers, db):
        """Should acknowledge command and update status to failed"""
        # Create a pending command
        command_id = f"TEST_CMD_{uuid.uuid4().hex[:8]}"
        db.anydesk_commands.insert_one({
            "id": command_id,
            "type": "disconnect",
            "anydesk_id": TEST_ANYDESK_ID,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Acknowledge the command as failed
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/watcher-commands/ack?command_id={command_id}&success=false",
            headers=watcher_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        # Verify command status updated in DB
        command = db.anydesk_commands.find_one({"id": command_id})
        assert command is not None, "Command should exist"
        assert command.get("status") == "failed", f"Status should be 'failed', got {command.get('status')}"
        
        print(f"PASS: Watcher ack failure - command {command_id} marked failed")


class TestDeleteSingleAlert:
    """Test DELETE /api/remote-sessions/alert/{dedup_key} endpoint"""
    
    def test_delete_alert_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.delete(f"{BASE_URL}/api/remote-sessions/alert/test_key")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Delete alert requires auth")
    
    def test_delete_alert_success(self, admin_headers, db):
        """Should delete a single alert by dedup_key"""
        # Create a test alert
        dedup_key = f"test_alert_{uuid.uuid4().hex[:8]}"
        db.anydesk_flag_notifications.insert_one({
            "dedup_key": dedup_key,
            "type": "unmapped_connection",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "detail": "Test alert for deletion"
        })
        
        # Verify alert exists
        alert = db.anydesk_flag_notifications.find_one({"dedup_key": dedup_key})
        assert alert is not None, "Test alert should exist before deletion"
        
        # Delete the alert
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/alert/{dedup_key}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        # Verify alert was deleted
        alert = db.anydesk_flag_notifications.find_one({"dedup_key": dedup_key})
        assert alert is None, "Alert should be deleted from DB"
        
        print(f"PASS: Single alert deleted - dedup_key={dedup_key}")
    
    def test_delete_alert_not_found(self, admin_headers):
        """Should return 404 for non-existent alert"""
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/alert/nonexistent_key_12345",
            headers=admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Delete non-existent alert returns 404")
    
    def test_delete_alert_with_special_chars(self, admin_headers, db):
        """Should handle dedup_key with special characters (URL encoded)"""
        # Create alert with special chars in dedup_key
        dedup_key = f"test_alert:blocked:{TEST_ANYDESK_ID}:2026-01"
        db.anydesk_flag_notifications.insert_one({
            "dedup_key": dedup_key,
            "type": "blocked_connection",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "detail": "Test alert with special chars"
        })
        
        # Delete using URL-encoded key
        import urllib.parse
        encoded_key = urllib.parse.quote(dedup_key, safe='')
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/alert/{encoded_key}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        alert = db.anydesk_flag_notifications.find_one({"dedup_key": dedup_key})
        assert alert is None, "Alert with special chars should be deleted"
        
        print("PASS: Delete alert with special chars in dedup_key")


class TestClearAlerts:
    """Test DELETE /api/remote-sessions/alerts endpoint"""
    
    def test_clear_alerts_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.delete(f"{BASE_URL}/api/remote-sessions/alerts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Clear alerts requires auth")
    
    def test_clear_all_alerts(self, admin_headers, db):
        """Should clear all alerts when no date/month params"""
        # Create multiple test alerts
        now = datetime.now(timezone.utc)
        for i in range(3):
            db.anydesk_flag_notifications.insert_one({
                "dedup_key": f"test_alert_clear_{i}_{uuid.uuid4().hex[:4]}",
                "type": "unmapped_connection",
                "sent_at": now.isoformat(),
                "detail": f"Test alert {i} for clear all"
            })
        
        # Count alerts before
        count_before = db.anydesk_flag_notifications.count_documents({"dedup_key": {"$regex": "^test_alert_clear"}})
        assert count_before >= 3, f"Should have at least 3 test alerts, got {count_before}"
        
        # Clear all alerts (no params)
        response = requests.delete(f"{BASE_URL}/api/remote-sessions/alerts", headers=admin_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "deleted" in data, f"Response should include 'deleted' count: {data}"
        assert data["deleted"] >= 3, f"Should delete at least 3 alerts, got {data['deleted']}"
        
        print(f"PASS: Clear all alerts - deleted {data['deleted']} alerts")
    
    def test_clear_alerts_by_month(self, admin_headers, db):
        """Should clear alerts for specific month only"""
        now = datetime.now(timezone.utc)
        current_month = now.strftime("%Y-%m")
        
        # Create alerts for current month
        for i in range(2):
            db.anydesk_flag_notifications.insert_one({
                "dedup_key": f"test_alert_month_{i}_{uuid.uuid4().hex[:4]}",
                "type": "unmapped_connection",
                "sent_at": now.isoformat(),
                "detail": f"Test alert {i} for month filter"
            })
        
        # Clear alerts for current month
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/alerts?month={current_month}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "deleted" in data, f"Response should include 'deleted' count: {data}"
        
        print(f"PASS: Clear alerts by month ({current_month}) - deleted {data['deleted']} alerts")
    
    def test_clear_alerts_by_date(self, admin_headers, db):
        """Should clear alerts for specific date only"""
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        
        # Create alerts for today
        for i in range(2):
            db.anydesk_flag_notifications.insert_one({
                "dedup_key": f"test_alert_date_{i}_{uuid.uuid4().hex[:4]}",
                "type": "blocked_connection",
                "sent_at": now.isoformat(),
                "detail": f"Test alert {i} for date filter"
            })
        
        # Clear alerts for today
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/alerts?date={today_str}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "deleted" in data, f"Response should include 'deleted' count: {data}"
        
        print(f"PASS: Clear alerts by date ({today_str}) - deleted {data['deleted']} alerts")


class TestDeleteMapping:
    """Test DELETE /api/remote-sessions/map/{anydesk_id} endpoint"""
    
    def test_delete_mapping_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.delete(f"{BASE_URL}/api/remote-sessions/map/test_id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Delete mapping requires auth")
    
    def test_delete_mapping_success(self, admin_headers, db):
        """Should delete worker mapping by anydesk_id"""
        anydesk_id = f"TEST_ALERT_{uuid.uuid4().hex[:8]}"
        
        # Create a mapping
        db.anydesk_id_mappings.insert_one({
            "anydesk_id": anydesk_id,
            "worker_name": "Test Worker",
            "employee_id": "emp_123",
            "employee_email": "test@test.com"
        })
        
        # Verify mapping exists
        mapping = db.anydesk_id_mappings.find_one({"anydesk_id": anydesk_id})
        assert mapping is not None, "Test mapping should exist before deletion"
        
        # Delete the mapping
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/map/{anydesk_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        # Verify mapping was deleted
        mapping = db.anydesk_id_mappings.find_one({"anydesk_id": anydesk_id})
        assert mapping is None, "Mapping should be deleted from DB"
        
        print(f"PASS: Mapping deleted - anydesk_id={anydesk_id}")
    
    def test_delete_mapping_not_found(self, admin_headers):
        """Should return 404 for non-existent mapping"""
        response = requests.delete(
            f"{BASE_URL}/api/remote-sessions/map/nonexistent_anydesk_id_12345",
            headers=admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Delete non-existent mapping returns 404")


class TestSessionCardAnyDeskIdDisplay:
    """Test that AnyDesk ID is always visible in session cards"""
    
    def test_session_has_anydesk_id_field(self, admin_headers, watcher_headers, db):
        """Session response should always include anydesk_id field"""
        now = datetime.now(timezone.utc)
        anydesk_id = f"TEST_ALERT_{uuid.uuid4().hex[:8]}"
        
        # Create a session
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": anydesk_id,
                "alias": "Test Worker",
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": now.isoformat(),
                "raw_line": f"TEST_display_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        assert response.status_code == 200, f"Log failed: {response.text}"
        
        # Get sessions
        response = requests.get(
            f"{BASE_URL}/api/remote-sessions?date={now.strftime('%Y-%m-%d')}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Find our test session
        test_sessions = [s for s in data["sessions"] if s.get("anydesk_id") == anydesk_id]
        assert len(test_sessions) > 0, f"Should find test session with anydesk_id={anydesk_id}"
        
        session = test_sessions[0]
        assert "anydesk_id" in session, "Session should have anydesk_id field"
        assert session["anydesk_id"] == anydesk_id, f"anydesk_id should be {anydesk_id}"
        
        # Cleanup
        db.anydesk_sessions.delete_many({"anydesk_id": anydesk_id})
        
        print(f"PASS: Session includes anydesk_id field - {anydesk_id}")
    
    def test_mapped_session_has_both_name_and_id(self, admin_headers, watcher_headers, db):
        """Mapped session should have both worker_name AND anydesk_id"""
        now = datetime.now(timezone.utc)
        anydesk_id = f"TEST_ALERT_{uuid.uuid4().hex[:8]}"
        worker_name = "Mapped Test Worker"
        
        # Create mapping first
        db.anydesk_id_mappings.insert_one({
            "anydesk_id": anydesk_id,
            "worker_name": worker_name,
            "employee_id": None,
            "employee_email": None
        })
        
        # Create a session
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": anydesk_id,
                "alias": "Original Alias",
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": now.isoformat(),
                "raw_line": f"TEST_mapped_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        assert response.status_code == 200
        
        # Get sessions
        response = requests.get(
            f"{BASE_URL}/api/remote-sessions?date={now.strftime('%Y-%m-%d')}",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find our test session
        test_sessions = [s for s in data["sessions"] if s.get("anydesk_id") == anydesk_id]
        assert len(test_sessions) > 0, "Should find mapped test session"
        
        session = test_sessions[0]
        assert session.get("worker_name") == worker_name, f"Should have worker_name={worker_name}"
        assert session.get("anydesk_id") == anydesk_id, f"Should still have anydesk_id={anydesk_id}"
        
        # Cleanup
        db.anydesk_sessions.delete_many({"anydesk_id": anydesk_id})
        db.anydesk_id_mappings.delete_many({"anydesk_id": anydesk_id})
        
        print(f"PASS: Mapped session has both worker_name and anydesk_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
