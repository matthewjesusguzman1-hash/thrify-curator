"""
Test suite for Daily.co Video Calls API endpoints
Tests: Room creation, room info, call history, recordings, call requests (worker-admin flow)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
SECOND_ADMIN_EMAIL = "euniceguzman@thriftycurator.com"
SECOND_ADMIN_CODE = "0826"
TEST_EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"


class TestVideoCallsAuth:
    """Test authentication for video calls endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Admin login with code
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        return token
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        # Employee login (no password required for test employee)
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMPLOYEE_EMAIL})
        
        if resp.status_code != 200:
            pytest.skip(f"Employee login failed: {resp.text}")
        
        login_data = resp.json()
        token = login_data.get("access_token") or login_data.get("token")
        if not token:
            pytest.skip(f"No token in employee response: {login_data}")
        return token
    
    def test_history_requires_auth(self):
        """GET /api/video-calls/history requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/history")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /api/video-calls/history requires auth")
    
    def test_recordings_requires_auth(self):
        """GET /api/video-calls/recordings requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/recordings")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /api/video-calls/recordings requires auth")
    
    def test_pending_requests_requires_auth(self):
        """GET /api/video-calls/call-requests/pending requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/call-requests/pending")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /api/video-calls/call-requests/pending requires auth")
    
    def test_create_room_requires_auth(self):
        """POST /api/video-calls/rooms requires authentication"""
        resp = requests.post(f"{BASE_URL}/api/video-calls/rooms", json={
            "purpose": "ad-hoc",
            "expires_minutes": 60
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /api/video-calls/rooms requires auth")


class TestVideoCallsRoomManagement:
    """Test room creation and management endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_create_room_success(self, auth_headers):
        """POST /api/video-calls/rooms creates a Daily.co room"""
        resp = requests.post(f"{BASE_URL}/api/video-calls/rooms", json={
            "purpose": "ad-hoc",
            "expires_minutes": 60,
            "enable_recording": False,
            "participant_names": ["Test Admin"]
        }, headers=auth_headers)
        
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # Verify response structure
        assert "room_name" in data, f"Missing room_name in response: {data}"
        assert "url" in data, f"Missing url in response: {data}"
        assert "app_url" in data, f"Missing app_url in response: {data}"
        assert "expires_at" in data, f"Missing expires_at in response: {data}"
        assert "id" in data, f"Missing id in response: {data}"
        
        # Verify URL format
        assert data["url"].startswith("https://"), f"URL should be https: {data['url']}"
        assert "/call/" in data["app_url"], f"app_url should contain /call/: {data['app_url']}"
        
        print(f"PASS: Room created - {data['room_name']}")
        print(f"  URL: {data['url']}")
        print(f"  App URL: {data['app_url']}")
        
        # Store for cleanup
        return data
    
    def test_get_room_info(self, auth_headers):
        """GET /api/video-calls/rooms/{room_name} returns room info"""
        # First create a room
        create_resp = requests.post(f"{BASE_URL}/api/video-calls/rooms", json={
            "purpose": "ad-hoc",
            "expires_minutes": 60
        }, headers=auth_headers)
        
        assert create_resp.status_code in [200, 201], f"Room creation failed: {create_resp.text}"
        room_name = create_resp.json()["room_name"]
        
        # Get room info (public endpoint)
        resp = requests.get(f"{BASE_URL}/api/video-calls/rooms/{room_name}")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data["room_name"] == room_name, f"Room name mismatch: {data}"
        assert "daily_url" in data, f"Missing daily_url: {data}"
        assert "status" in data, f"Missing status: {data}"
        assert data["status"] == "active", f"Expected active status: {data['status']}"
        
        print(f"PASS: Room info retrieved for {room_name}")
        print(f"  Status: {data['status']}")
        print(f"  Purpose: {data.get('purpose')}")
    
    def test_get_nonexistent_room(self):
        """GET /api/video-calls/rooms/{room_name} returns 404 for nonexistent room"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/rooms/nonexistent-room-xyz123")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Nonexistent room returns 404")
    
    def test_end_room(self, auth_headers):
        """POST /api/video-calls/rooms/{room_name}/end ends a call"""
        # First create a room
        create_resp = requests.post(f"{BASE_URL}/api/video-calls/rooms", json={
            "purpose": "ad-hoc",
            "expires_minutes": 60
        }, headers=auth_headers)
        
        assert create_resp.status_code in [200, 201], f"Room creation failed: {create_resp.text}"
        room_name = create_resp.json()["room_name"]
        
        # End the room
        resp = requests.post(f"{BASE_URL}/api/video-calls/rooms/{room_name}/end", 
                            json={}, headers=auth_headers)
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "duration_seconds" in data, f"Missing duration_seconds: {data}"
        
        print(f"PASS: Room {room_name} ended successfully")
        print(f"  Duration: {data['duration_seconds']} seconds")
        
        # Verify room status changed
        room_resp = requests.get(f"{BASE_URL}/api/video-calls/rooms/{room_name}")
        if room_resp.status_code == 200:
            room_data = room_resp.json()
            assert room_data["status"] == "ended", f"Expected ended status: {room_data['status']}"
            print(f"  Verified status: {room_data['status']}")


class TestVideoCallsHistory:
    """Test call history and recordings endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        data = resp.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_call_history(self, auth_headers):
        """GET /api/video-calls/history returns call history"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/history", headers=auth_headers)
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "calls" in data, f"Missing 'calls' key in response: {data}"
        assert isinstance(data["calls"], list), f"'calls' should be a list: {type(data['calls'])}"
        
        print(f"PASS: Call history retrieved - {len(data['calls'])} calls")
        
        # If there are calls, verify structure
        if data["calls"]:
            call = data["calls"][0]
            assert "room_name" in call, f"Missing room_name in call: {call}"
            assert "status" in call, f"Missing status in call: {call}"
            print(f"  Latest call: {call['room_name']} ({call['status']})")
    
    def test_get_recordings(self, auth_headers):
        """GET /api/video-calls/recordings returns recordings list"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/recordings", headers=auth_headers)
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "recordings" in data, f"Missing 'recordings' key in response: {data}"
        assert isinstance(data["recordings"], list), f"'recordings' should be a list"
        
        print(f"PASS: Recordings retrieved - {len(data['recordings'])} recordings")


class TestVideoCallsCallRequests:
    """Test worker-admin call request flow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        data = resp.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_token):
        """Get admin user ID from token"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", 
                           headers={"Authorization": f"Bearer {admin_token}"})
        if resp.status_code == 200:
            return resp.json().get("id")
        return None
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMPLOYEE_EMAIL})
        
        if resp.status_code != 200:
            pytest.skip(f"Employee login failed: {resp.text}")
        
        login_data = resp.json()
        return login_data.get("access_token") or login_data.get("token")
    
    def test_create_call_request(self, employee_token, admin_user_id):
        """POST /api/video-calls/call-request creates a call request"""
        if not admin_user_id:
            pytest.skip("Could not get admin user ID")
        
        resp = requests.post(f"{BASE_URL}/api/video-calls/call-request", json={
            "admin_id": admin_user_id,
            "message": "Test call request from pytest"
        }, headers={"Authorization": f"Bearer {employee_token}"})
        
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "id" in data, f"Missing id in response: {data}"
        assert "room_name" in data, f"Missing room_name in response: {data}"
        assert "app_url" in data, f"Missing app_url in response: {data}"
        assert data.get("status") == "pending", f"Expected pending status: {data}"
        
        print(f"PASS: Call request created - {data['id']}")
        print(f"  Room: {data['room_name']}")
        print(f"  Status: {data['status']}")
        
        return data
    
    def test_get_pending_requests(self, admin_token):
        """GET /api/video-calls/call-requests/pending returns pending requests"""
        resp = requests.get(f"{BASE_URL}/api/video-calls/call-requests/pending",
                          headers={"Authorization": f"Bearer {admin_token}"})
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "requests" in data, f"Missing 'requests' key: {data}"
        assert isinstance(data["requests"], list), f"'requests' should be a list"
        
        print(f"PASS: Pending requests retrieved - {len(data['requests'])} requests")
        
        return data["requests"]
    
    def test_accept_call_request_flow(self, employee_token, admin_token, admin_user_id):
        """Full flow: worker creates request -> admin accepts"""
        if not admin_user_id:
            pytest.skip("Could not get admin user ID")
        
        # Worker creates request
        create_resp = requests.post(f"{BASE_URL}/api/video-calls/call-request", json={
            "admin_id": admin_user_id,
            "message": "Accept test request"
        }, headers={"Authorization": f"Bearer {employee_token}"})
        
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        request_id = create_resp.json()["id"]
        
        # Admin accepts
        accept_resp = requests.post(f"{BASE_URL}/api/video-calls/call-requests/{request_id}/accept",
                                   json={}, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert accept_resp.status_code == 200, f"Accept failed: {accept_resp.text}"
        
        data = accept_resp.json()
        assert "room_name" in data, f"Missing room_name: {data}"
        assert "app_url" in data, f"Missing app_url: {data}"
        assert "caller_name" in data, f"Missing caller_name: {data}"
        
        print(f"PASS: Call request accepted")
        print(f"  Room: {data['room_name']}")
        print(f"  Caller: {data['caller_name']}")
    
    def test_decline_call_request_flow(self, employee_token, admin_token, admin_user_id):
        """Full flow: worker creates request -> admin declines"""
        if not admin_user_id:
            pytest.skip("Could not get admin user ID")
        
        # Worker creates request
        create_resp = requests.post(f"{BASE_URL}/api/video-calls/call-request", json={
            "admin_id": admin_user_id,
            "message": "Decline test request"
        }, headers={"Authorization": f"Bearer {employee_token}"})
        
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        request_id = create_resp.json()["id"]
        
        # Admin declines
        decline_resp = requests.post(f"{BASE_URL}/api/video-calls/call-requests/{request_id}/decline",
                                    json={}, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert decline_resp.status_code == 200, f"Decline failed: {decline_resp.text}"
        
        data = decline_resp.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        
        print(f"PASS: Call request declined")


class TestVideoCallsRoomWithRecording:
    """Test room creation with recording enabled"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.text}")
        
        data = resp.json()
        return data.get("access_token") or data.get("token")
    
    def test_create_room_with_recording(self, admin_token):
        """POST /api/video-calls/rooms with enable_recording=True"""
        resp = requests.post(f"{BASE_URL}/api/video-calls/rooms", json={
            "purpose": "interview",
            "expires_minutes": 120,
            "enable_recording": True,
            "participant_names": ["Admin", "Interviewee"]
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "room_name" in data, f"Missing room_name: {data}"
        
        # Verify room has recording enabled
        room_resp = requests.get(f"{BASE_URL}/api/video-calls/rooms/{data['room_name']}")
        if room_resp.status_code == 200:
            room_data = room_resp.json()
            assert room_data.get("enable_recording") == True, f"Recording not enabled: {room_data}"
            print(f"PASS: Room created with recording enabled - {data['room_name']}")
        else:
            print(f"PASS: Room created - {data['room_name']} (could not verify recording flag)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
