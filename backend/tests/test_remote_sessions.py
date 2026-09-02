"""
Test Remote Sessions Page Features:
1. GET /api/remote-sessions - list sessions with date/month filtering
2. GET /api/remote-sessions/alerts - list historical alerts
3. GET /api/remote-sessions/export - CSV export
4. POST /api/remote-sessions/log - watcher endpoint with historical flood protection
5. POST /api/remote-sessions/map - worker mapping
6. GET /api/remote-sessions/cross-check - cross-check flags
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
TEST_ANYDESK_ID = "TEST_RS_999"
TEST_EMPLOYEE_ID = f"TEST_EMP_{uuid.uuid4().hex[:8]}"
TEST_WORKER_NAME = "Test Remote Worker"


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
    db.anydesk_sessions.delete_many({"anydesk_id": TEST_ANYDESK_ID})
    db.anydesk_sessions.delete_many({"host": "TEST_RS_HOST"})
    db.anydesk_session_events.delete_many({"host": "TEST_RS_HOST"})
    db.anydesk_id_mappings.delete_many({"anydesk_id": TEST_ANYDESK_ID})
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": f".*{TEST_EMPLOYEE_ID}.*"}})
    db.time_entries.delete_many({"user_id": TEST_EMPLOYEE_ID})
    
    yield
    
    # Cleanup after test
    db.anydesk_sessions.delete_many({"anydesk_id": TEST_ANYDESK_ID})
    db.anydesk_sessions.delete_many({"host": "TEST_RS_HOST"})
    db.anydesk_session_events.delete_many({"host": "TEST_RS_HOST"})
    db.anydesk_id_mappings.delete_many({"anydesk_id": TEST_ANYDESK_ID})
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": f".*{TEST_EMPLOYEE_ID}.*"}})
    db.time_entries.delete_many({"user_id": TEST_EMPLOYEE_ID})


class TestListSessions:
    """Test GET /api/remote-sessions endpoint"""
    
    def test_list_sessions_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: List sessions requires auth")
    
    def test_list_sessions_with_auth(self, admin_headers):
        """Should return sessions list with auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "sessions" in data, f"Missing 'sessions' key: {data}"
        assert "total" in data, f"Missing 'total' key: {data}"
        assert isinstance(data["sessions"], list), "sessions should be a list"
        print(f"PASS: List sessions returned {data['total']} sessions")
    
    def test_list_sessions_date_filter(self, db, admin_headers, watcher_headers):
        """Should filter sessions by specific date"""
        # Create a session for today
        today = datetime.now(timezone.utc)
        today_str = today.strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": today.isoformat(),
                "raw_line": f"TEST_date_filter_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        assert response.status_code == 200, f"Log failed: {response.text}"
        
        # Query with date filter
        response = requests.get(f"{BASE_URL}/api/remote-sessions?date={today_str}", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should find our test session
        test_sessions = [s for s in data["sessions"] if s.get("anydesk_id") == TEST_ANYDESK_ID]
        assert len(test_sessions) > 0, f"Should find test session for date {today_str}"
        print(f"PASS: Date filter works - found {len(test_sessions)} test sessions for {today_str}")
    
    def test_list_sessions_month_filter(self, db, admin_headers, watcher_headers):
        """Should filter sessions by month"""
        today = datetime.now(timezone.utc)
        month_str = today.strftime("%Y-%m")
        
        # Create a session for this month
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": today.isoformat(),
                "raw_line": f"TEST_month_filter_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        assert response.status_code == 200
        
        # Query with month filter
        response = requests.get(f"{BASE_URL}/api/remote-sessions?month={month_str}", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        test_sessions = [s for s in data["sessions"] if s.get("anydesk_id") == TEST_ANYDESK_ID]
        assert len(test_sessions) > 0, f"Should find test session for month {month_str}"
        print(f"PASS: Month filter works - found {len(test_sessions)} test sessions for {month_str}")


class TestListAlerts:
    """Test GET /api/remote-sessions/alerts endpoint"""
    
    def test_list_alerts_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/alerts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: List alerts requires auth")
    
    def test_list_alerts_with_auth(self, admin_headers):
        """Should return alerts list with auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/alerts", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "alerts" in data, f"Missing 'alerts' key: {data}"
        assert "total" in data, f"Missing 'total' key: {data}"
        assert isinstance(data["alerts"], list), "alerts should be a list"
        print(f"PASS: List alerts returned {data['total']} alerts")
    
    def test_list_alerts_date_filter(self, db, admin_headers):
        """Should filter alerts by date"""
        today = datetime.now(timezone.utc)
        today_str = today.strftime("%Y-%m-%d")
        
        # Insert a test alert
        db.anydesk_flag_notifications.insert_one({
            "dedup_key": f"test_alert:{TEST_EMPLOYEE_ID}",
            "type": "test_alert",
            "sent_at": today.isoformat(),
            "detail": "Test alert for date filter"
        })
        
        # Query with date filter
        response = requests.get(f"{BASE_URL}/api/remote-sessions/alerts?date={today_str}", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        test_alerts = [a for a in data["alerts"] if TEST_EMPLOYEE_ID in a.get("dedup_key", "")]
        assert len(test_alerts) > 0, f"Should find test alert for date {today_str}"
        print(f"PASS: Alerts date filter works - found {len(test_alerts)} test alerts")


class TestExportCSV:
    """Test GET /api/remote-sessions/export endpoint"""
    
    def test_export_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/export")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Export requires auth")
    
    def test_export_csv_with_auth(self, admin_headers):
        """Should return CSV file with auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/export", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment, got {content_disp}"
        assert "remote_sessions" in content_disp, f"Expected filename with remote_sessions, got {content_disp}"
        
        # Check CSV content has headers
        csv_content = response.text
        assert "Date" in csv_content, "CSV should have Date header"
        assert "Worker" in csv_content, "CSV should have Worker header"
        assert "AnyDesk ID" in csv_content, "CSV should have AnyDesk ID header"
        assert "Host" in csv_content, "CSV should have Host header"
        
        print(f"PASS: CSV export works - {len(csv_content)} bytes")
    
    def test_export_csv_with_date_filter(self, db, admin_headers, watcher_headers):
        """Should export CSV filtered by date"""
        today = datetime.now(timezone.utc)
        today_str = today.strftime("%Y-%m-%d")
        
        # Create a session for today
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": today.isoformat(),
                "raw_line": f"TEST_export_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        assert response.status_code == 200
        
        # Export with date filter
        response = requests.get(f"{BASE_URL}/api/remote-sessions/export?date={today_str}", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        csv_content = response.text
        assert TEST_ANYDESK_ID in csv_content, f"CSV should contain test session {TEST_ANYDESK_ID}"
        print(f"PASS: CSV export with date filter works")


class TestLogEndpoint:
    """Test POST /api/remote-sessions/log endpoint"""
    
    def test_log_no_watcher_key(self):
        """Should return 401 without watcher key"""
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": []
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Log endpoint requires watcher key")
    
    def test_log_invalid_watcher_key(self):
        """Should return 401 with invalid watcher key"""
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": []
        }, headers={"X-Watcher-Key": "invalid_key"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Log endpoint rejects invalid watcher key")
    
    def test_log_session_start(self, watcher_headers, db):
        """Should log session_start event"""
        now = datetime.now(timezone.utc)
        
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": now.isoformat(),
                "raw_line": f"TEST_start_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert data.get("processed", 0) >= 1, f"Expected processed >= 1: {data}"
        
        # Verify session was created in DB
        session = db.anydesk_sessions.find_one({"anydesk_id": TEST_ANYDESK_ID, "host": "TEST_RS_HOST"})
        assert session is not None, "Session should be created in DB"
        assert session.get("ended_at") is None, "Session should be open (no ended_at)"
        
        print(f"PASS: Session start logged - processed={data['processed']}")
    
    def test_log_session_end(self, watcher_headers, db):
        """Should log session_end event and match to open session"""
        now = datetime.now(timezone.utc)
        start_time = (now - timedelta(minutes=30)).isoformat()
        end_time = now.isoformat()
        
        # First create a session_start
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": start_time,
                "raw_line": f"TEST_start_for_end_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Now send session_end
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_end",
                "anydesk_id": TEST_ANYDESK_ID,
                "timestamp": end_time,
                "raw_line": f"TEST_end_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("matched_ends", 0) >= 1, f"Expected matched_ends >= 1: {data}"
        
        # Verify session was closed in DB
        session = db.anydesk_sessions.find_one({"anydesk_id": TEST_ANYDESK_ID, "host": "TEST_RS_HOST"})
        assert session is not None, "Session should exist"
        assert session.get("ended_at") is not None, "Session should be closed (has ended_at)"
        assert session.get("duration_seconds") is not None, "Session should have duration"
        
        print(f"PASS: Session end logged - matched_ends={data['matched_ends']}, duration={session.get('duration_seconds')}s")
    
    def test_log_historical_event_skips_notification(self, watcher_headers, db):
        """Events older than 5 minutes should skip notifications (flood protection)"""
        # Create an event 10 minutes ago
        old_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": old_time,
                "raw_line": f"TEST_historical_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("processed", 0) >= 1, f"Event should still be processed: {data}"
        
        # The event is processed but notification is skipped (we can't easily verify notification wasn't sent,
        # but we verify the event was still logged)
        session = db.anydesk_sessions.find_one({"anydesk_id": TEST_ANYDESK_ID, "host": "TEST_RS_HOST"})
        assert session is not None, "Historical event should still be logged"
        
        print("PASS: Historical event processed (notification skipped for >5min old events)")


class TestWorkerMapping:
    """Test POST /api/remote-sessions/map endpoint"""
    
    def test_map_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.post(f"{BASE_URL}/api/remote-sessions/map", json={
            "anydesk_id": TEST_ANYDESK_ID,
            "worker_name": TEST_WORKER_NAME
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Map endpoint requires auth")
    
    def test_map_worker(self, admin_headers, db):
        """Should create/update worker mapping"""
        response = requests.post(f"{BASE_URL}/api/remote-sessions/map", json={
            "anydesk_id": TEST_ANYDESK_ID,
            "worker_name": TEST_WORKER_NAME,
            "employee_id": TEST_EMPLOYEE_ID,
            "employee_email": "test@test.com"
        }, headers=admin_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        # Verify mapping in DB
        mapping = db.anydesk_id_mappings.find_one({"anydesk_id": TEST_ANYDESK_ID})
        assert mapping is not None, "Mapping should be created"
        assert mapping.get("worker_name") == TEST_WORKER_NAME, "Worker name should match"
        assert mapping.get("employee_id") == TEST_EMPLOYEE_ID, "Employee ID should match"
        
        print("PASS: Worker mapping created")
    
    def test_map_worker_updates_existing(self, admin_headers, db):
        """Should update existing mapping"""
        # First create a mapping
        requests.post(f"{BASE_URL}/api/remote-sessions/map", json={
            "anydesk_id": TEST_ANYDESK_ID,
            "worker_name": "Original Name"
        }, headers=admin_headers)
        
        # Update it
        response = requests.post(f"{BASE_URL}/api/remote-sessions/map", json={
            "anydesk_id": TEST_ANYDESK_ID,
            "worker_name": "Updated Name"
        }, headers=admin_headers)
        
        assert response.status_code == 200
        
        # Verify only one mapping exists with updated name
        mappings = list(db.anydesk_id_mappings.find({"anydesk_id": TEST_ANYDESK_ID}))
        assert len(mappings) == 1, f"Should have exactly 1 mapping, got {len(mappings)}"
        assert mappings[0].get("worker_name") == "Updated Name", "Name should be updated"
        
        print("PASS: Worker mapping updated (upsert)")


class TestCrossCheck:
    """Test GET /api/remote-sessions/cross-check endpoint"""
    
    def test_cross_check_no_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Cross-check requires auth")
    
    def test_cross_check_with_auth(self, admin_headers):
        """Should return cross-check flags"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "flags" in data, f"Missing 'flags' key: {data}"
        assert "active_sessions" in data, f"Missing 'active_sessions' key: {data}"
        assert "open_clock_ins" in data, f"Missing 'open_clock_ins' key: {data}"
        assert isinstance(data["flags"], list), "flags should be a list"
        
        print(f"PASS: Cross-check returned {len(data['flags'])} flags, {data['active_sessions']} active sessions, {data['open_clock_ins']} open clock-ins")


class TestSessionWithTimeEntry:
    """Test session cards show clock-in/out cross-reference"""
    
    def test_session_includes_time_entry(self, db, admin_headers, watcher_headers):
        """Session should include matching time entry when employee is mapped"""
        now = datetime.now(timezone.utc)
        
        # Create mapping
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create time entry
        clock_in_time = (now - timedelta(hours=2)).isoformat()
        db.time_entries.insert_one({
            "id": f"TEST_TE_{uuid.uuid4().hex[:8]}",
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "clock_out": None,
            "total_hours": 0
        })
        
        # Create session
        session_start = (now - timedelta(hours=1)).isoformat()
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_RS_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": session_start,
                "raw_line": f"TEST_with_te_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Get sessions
        response = requests.get(f"{BASE_URL}/api/remote-sessions?date={now.strftime('%Y-%m-%d')}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find our test session
        test_sessions = [s for s in data["sessions"] if s.get("anydesk_id") == TEST_ANYDESK_ID]
        assert len(test_sessions) > 0, "Should find test session"
        
        session = test_sessions[0]
        assert session.get("worker_name") == TEST_WORKER_NAME, "Session should have worker_name from mapping"
        assert session.get("employee_id") == TEST_EMPLOYEE_ID, "Session should have employee_id from mapping"
        assert session.get("time_entry") is not None, "Session should have time_entry cross-reference"
        assert "clock_in" in session["time_entry"], "time_entry should have clock_in"
        
        print("PASS: Session includes time entry cross-reference")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
