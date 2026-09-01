"""
Test AnyDesk Remote Session Enhancements:
1. Grace period is 3 minutes (not 5)
2. Auto clock-out on AnyDesk disconnect
3. Flag notification push and dedup
4. Cross-check flags (session_no_clock_in and clocked_in_no_session)
5. Admin-clocked entries exclusion
6. Log endpoint returns auto_clocked_out array
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
TEST_ANYDESK_ID = "999888777"
TEST_EMPLOYEE_ID = "fdafa894-a84e-4884-91da-0deecf780c47"
TEST_WORKER_NAME = "Tester Remote"


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
    db.anydesk_session_events.delete_many({"host": "TEST_HOST"})
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": f".*{TEST_EMPLOYEE_ID}.*"}})
    db.time_entries.delete_many({"user_id": TEST_EMPLOYEE_ID, "id": {"$regex": "^TEST_"}})
    
    yield
    
    # Cleanup after test
    db.anydesk_sessions.delete_many({"anydesk_id": TEST_ANYDESK_ID})
    db.anydesk_session_events.delete_many({"host": "TEST_HOST"})
    db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": f".*{TEST_EMPLOYEE_ID}.*"}})
    db.time_entries.delete_many({"user_id": TEST_EMPLOYEE_ID, "id": {"$regex": "^TEST_"}})


class TestGracePeriod:
    """Test that grace period is 3 minutes (not 5)"""
    
    def test_session_within_grace_period_no_flag(self, db, admin_headers, watcher_headers):
        """Session started 2 minutes ago should NOT be flagged"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create session started 2 minutes ago (within 3-minute grace period)
        two_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": two_min_ago,
                "raw_line": f"TEST_2min_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Log failed: {response.text}"
        
        # Check cross-check - should NOT have session_no_clock_in flag
        cross_check = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        assert cross_check.status_code == 200
        flags = cross_check.json().get("flags", [])
        
        # Filter for our test employee
        session_no_clock_in_flags = [f for f in flags if f.get("type") == "session_no_clock_in" and f.get("employee_id") == TEST_EMPLOYEE_ID]
        assert len(session_no_clock_in_flags) == 0, f"Should NOT flag session within grace period, but got: {session_no_clock_in_flags}"
        print("PASS: Session within 3-minute grace period is NOT flagged")
    
    def test_session_past_grace_period_flagged(self, db, admin_headers, watcher_headers):
        """Session started 4 minutes ago SHOULD be flagged"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create session started 4 minutes ago (past 3-minute grace period)
        four_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": four_min_ago,
                "raw_line": f"TEST_4min_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Log failed: {response.text}"
        
        # Check cross-check - SHOULD have session_no_clock_in flag
        cross_check = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        assert cross_check.status_code == 200
        flags = cross_check.json().get("flags", [])
        
        # Filter for our test employee
        session_no_clock_in_flags = [f for f in flags if f.get("type") == "session_no_clock_in" and f.get("employee_id") == TEST_EMPLOYEE_ID]
        assert len(session_no_clock_in_flags) > 0, f"Should flag session past grace period, but got no flags. All flags: {flags}"
        print("PASS: Session past 3-minute grace period IS flagged")


class TestAutoClockOut:
    """Test auto clock-out on AnyDesk disconnect"""
    
    def test_auto_clock_out_on_disconnect(self, db, watcher_headers, admin_headers):
        """When session_end is received, mapped employee should be auto-clocked out"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create an open time entry for the mapped employee
        entry_id = f"TEST_entry_{uuid.uuid4()}"
        clock_in_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        
        db.time_entries.insert_one({
            "id": entry_id,
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "last_clock_in": clock_in_time,
            "clock_out": None,
            "total_hours": 0,
            "accumulated_hours": 0
        })
        
        # First create a session_start
        session_start_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": session_start_time,
                "raw_line": f"TEST_start_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Now send session_end
        session_end_time = datetime.now(timezone.utc).isoformat()
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_end",
                "anydesk_id": TEST_ANYDESK_ID,
                "timestamp": session_end_time,
                "raw_line": f"TEST_end_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200, f"Log failed: {response.text}"
        data = response.json()
        
        # Verify auto_clocked_out array contains the entry ID
        assert "auto_clocked_out" in data, f"Response missing auto_clocked_out: {data}"
        assert entry_id in data["auto_clocked_out"], f"Entry {entry_id} not in auto_clocked_out: {data['auto_clocked_out']}"
        
        # Verify the time entry was updated
        updated_entry = db.time_entries.find_one({"id": entry_id})
        assert updated_entry is not None, "Entry not found"
        assert updated_entry.get("clock_out") is not None, "clock_out should be set"
        assert updated_entry.get("anydesk_auto_clocked_out") == True, "anydesk_auto_clocked_out should be True"
        assert "anydesk_auto_clock_out_note" in updated_entry, "anydesk_auto_clock_out_note should be present"
        assert "Auto-closed by AnyDesk disconnect" in updated_entry.get("anydesk_auto_clock_out_note", ""), "Note should mention AnyDesk disconnect"
        assert updated_entry.get("total_hours", 0) > 0, "total_hours should be calculated"
        
        print(f"PASS: Auto clock-out worked. Entry clocked out at {updated_entry['clock_out']}, hours={updated_entry['total_hours']:.4f}")
    
    def test_no_auto_clock_out_if_already_clocked_out(self, db, watcher_headers):
        """Auto clock-out should NOT trigger if employee is already clocked out"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create a CLOSED time entry (already clocked out)
        entry_id = f"TEST_closed_{uuid.uuid4()}"
        clock_in_time = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        clock_out_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        db.time_entries.insert_one({
            "id": entry_id,
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "clock_out": clock_out_time,  # Already clocked out
            "total_hours": 2.0
        })
        
        # First create a session_start
        session_start_time = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": session_start_time,
                "raw_line": f"TEST_start_closed_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Send session_end
        session_end_time = datetime.now(timezone.utc).isoformat()
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_end",
                "anydesk_id": TEST_ANYDESK_ID,
                "timestamp": session_end_time,
                "raw_line": f"TEST_end_closed_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # auto_clocked_out should be empty since no open entry
        assert data.get("auto_clocked_out", []) == [], f"Should not auto clock-out already closed entry: {data}"
        print("PASS: No auto clock-out when employee already clocked out")
    
    def test_no_auto_clock_out_if_unmapped(self, db, watcher_headers):
        """Auto clock-out should NOT trigger if AnyDesk ID is not mapped"""
        unmapped_anydesk_id = "UNMAPPED_123456"
        
        # Ensure no mapping exists for this ID
        db.anydesk_id_mappings.delete_many({"anydesk_id": unmapped_anydesk_id})
        
        # First create a session_start
        session_start_time = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": unmapped_anydesk_id,
                "alias": "Unknown Worker",
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": session_start_time,
                "raw_line": f"TEST_unmapped_start_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Send session_end
        session_end_time = datetime.now(timezone.utc).isoformat()
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_end",
                "anydesk_id": unmapped_anydesk_id,
                "timestamp": session_end_time,
                "raw_line": f"TEST_unmapped_end_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # auto_clocked_out should be empty since unmapped
        assert data.get("auto_clocked_out", []) == [], f"Should not auto clock-out unmapped AnyDesk ID: {data}"
        
        # Cleanup
        db.anydesk_sessions.delete_many({"anydesk_id": unmapped_anydesk_id})
        print("PASS: No auto clock-out for unmapped AnyDesk ID")


class TestFlagNotifications:
    """Test flag notification push and dedup"""
    
    def test_flag_notification_dedup(self, db, admin_headers, watcher_headers):
        """Calling cross-check twice within 1 hour should NOT send duplicate push"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Clear any existing dedup records
        db.anydesk_flag_notifications.delete_many({"dedup_key": {"$regex": f".*{TEST_EMPLOYEE_ID}.*"}})
        
        # Create session started 5 minutes ago (past grace period)
        five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": five_min_ago,
                "raw_line": f"TEST_dedup_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # First cross-check should create a dedup record
        requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        
        # Check dedup records
        dedup_count_1 = db.anydesk_flag_notifications.count_documents({
            "dedup_key": f"session_no_clock_in:{TEST_EMPLOYEE_ID}"
        })
        
        # Second cross-check within 1 hour should NOT create another record
        requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        
        dedup_count_2 = db.anydesk_flag_notifications.count_documents({
            "dedup_key": f"session_no_clock_in:{TEST_EMPLOYEE_ID}"
        })
        
        # Should still be 1 record (deduped)
        assert dedup_count_2 == dedup_count_1, f"Dedup failed: count went from {dedup_count_1} to {dedup_count_2}"
        print(f"PASS: Flag notification dedup working. Dedup records: {dedup_count_2}")


class TestClockedInNoSession:
    """Test clocked_in_no_session flag"""
    
    def test_clocked_in_no_session_flag(self, db, admin_headers):
        """Employee clocked in but no active AnyDesk session should be flagged"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Clear any active sessions for this employee
        db.anydesk_sessions.delete_many({"anydesk_id": TEST_ANYDESK_ID})
        
        # Create an open time entry (clocked in)
        entry_id = f"TEST_clocked_in_{uuid.uuid4()}"
        clock_in_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        db.time_entries.insert_one({
            "id": entry_id,
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "last_clock_in": clock_in_time,
            "clock_out": None,
            "total_hours": 0
        })
        
        # Check cross-check - should have clocked_in_no_session flag
        cross_check = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        assert cross_check.status_code == 200
        flags = cross_check.json().get("flags", [])
        
        # Filter for our test employee
        clocked_in_no_session_flags = [f for f in flags if f.get("type") == "clocked_in_no_session" and f.get("employee_id") == TEST_EMPLOYEE_ID]
        assert len(clocked_in_no_session_flags) > 0, f"Should flag clocked_in_no_session, but got no flags. All flags: {flags}"
        print("PASS: clocked_in_no_session flag working")
    
    def test_admin_clocked_excluded_from_flag(self, db, admin_headers):
        """Admin-clocked entries should be excluded from clocked_in_no_session flag"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Clear any active sessions for this employee
        db.anydesk_sessions.delete_many({"anydesk_id": TEST_ANYDESK_ID})
        
        # Create an admin-clocked open time entry
        entry_id = f"TEST_admin_clocked_{uuid.uuid4()}"
        clock_in_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        db.time_entries.insert_one({
            "id": entry_id,
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "last_clock_in": clock_in_time,
            "clock_out": None,
            "total_hours": 0,
            "admin_clocked": True  # Admin clocked this entry
        })
        
        # Check cross-check - should NOT have clocked_in_no_session flag for admin-clocked entry
        cross_check = requests.get(f"{BASE_URL}/api/remote-sessions/cross-check", headers=admin_headers)
        assert cross_check.status_code == 200
        flags = cross_check.json().get("flags", [])
        
        # Filter for our test employee
        clocked_in_no_session_flags = [f for f in flags if f.get("type") == "clocked_in_no_session" and f.get("employee_id") == TEST_EMPLOYEE_ID]
        assert len(clocked_in_no_session_flags) == 0, f"Admin-clocked entry should NOT be flagged, but got: {clocked_in_no_session_flags}"
        print("PASS: Admin-clocked entries excluded from clocked_in_no_session flag")


class TestLogEndpointResponse:
    """Test log endpoint response format"""
    
    def test_log_endpoint_returns_auto_clocked_out_array(self, db, watcher_headers):
        """Log endpoint should return auto_clocked_out array in response"""
        # Ensure mapping exists
        db.anydesk_id_mappings.update_one(
            {"anydesk_id": TEST_ANYDESK_ID},
            {"$set": {
                "anydesk_id": TEST_ANYDESK_ID,
                "worker_name": TEST_WORKER_NAME,
                "employee_id": TEST_EMPLOYEE_ID
            }},
            upsert=True
        )
        
        # Create an open time entry
        entry_id = f"TEST_response_{uuid.uuid4()}"
        clock_in_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        db.time_entries.insert_one({
            "id": entry_id,
            "user_id": TEST_EMPLOYEE_ID,
            "user_name": TEST_WORKER_NAME,
            "clock_in": clock_in_time,
            "last_clock_in": clock_in_time,
            "clock_out": None,
            "total_hours": 0,
            "accumulated_hours": 0
        })
        
        # Create session_start first
        session_start_time = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_start",
                "anydesk_id": TEST_ANYDESK_ID,
                "alias": TEST_WORKER_NAME,
                "auth_method": "password",
                "direction": "Incoming",
                "timestamp": session_start_time,
                "raw_line": f"TEST_response_start_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        # Send session_end
        session_end_time = datetime.now(timezone.utc).isoformat()
        response = requests.post(f"{BASE_URL}/api/remote-sessions/log", json={
            "host": "TEST_HOST",
            "events": [{
                "event_type": "session_end",
                "anydesk_id": TEST_ANYDESK_ID,
                "timestamp": session_end_time,
                "raw_line": f"TEST_response_end_{uuid.uuid4()}"
            }]
        }, headers=watcher_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data, f"Response missing 'success': {data}"
        assert "processed" in data, f"Response missing 'processed': {data}"
        assert "auto_clocked_out" in data, f"Response missing 'auto_clocked_out': {data}"
        assert isinstance(data["auto_clocked_out"], list), f"auto_clocked_out should be a list: {data}"
        assert entry_id in data["auto_clocked_out"], f"Entry ID should be in auto_clocked_out: {data}"
        
        print(f"PASS: Log endpoint returns auto_clocked_out array: {data['auto_clocked_out']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
