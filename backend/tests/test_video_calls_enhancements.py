"""
Test suite for Video Calls Enhancements:
1. Push notifications on call-request (verify no crash, check logs)
2. Recordings sync endpoint (POST /api/video-calls/recordings/sync)
3. Get recordings endpoint (GET /api/video-calls/recordings)
4. Recording access link endpoint (GET /api/video-calls/recordings/{recording_id}/access-link)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
TEST_EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"


class TestRecordingsEndpoints:
    """Test recordings-related endpoints"""
    
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
    def employee_token(self):
        """Get employee authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMPLOYEE_EMAIL})
        if resp.status_code != 200:
            pytest.skip(f"Employee login failed: {resp.text}")
        
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in employee response: {data}")
        return token
    
    def test_get_recordings_returns_list(self, admin_token):
        """GET /api/video-calls/recordings returns recordings array"""
        resp = requests.get(
            f"{BASE_URL}/api/video-calls/recordings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "recordings" in data, f"Response missing 'recordings' key: {data}"
        assert isinstance(data["recordings"], list), f"recordings should be a list: {data}"
        print(f"PASS: GET /api/video-calls/recordings returns {len(data['recordings'])} recordings")
    
    def test_sync_recordings_requires_admin(self, employee_token):
        """POST /api/video-calls/recordings/sync requires admin role"""
        resp = requests.post(
            f"{BASE_URL}/api/video-calls/recordings/sync",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={}
        )
        # Should return 403 for non-admin users
        assert resp.status_code in [401, 403], f"Expected 401/403 for non-admin, got {resp.status_code}: {resp.text}"
        print("PASS: POST /api/video-calls/recordings/sync requires admin role")
    
    def test_sync_recordings_success(self, admin_token):
        """POST /api/video-calls/recordings/sync fetches from Daily.co and returns synced count"""
        resp = requests.post(
            f"{BASE_URL}/api/video-calls/recordings/sync",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "synced" in data, f"Response missing 'synced' key: {data}"
        assert "total_daily_recordings" in data, f"Response missing 'total_daily_recordings' key: {data}"
        assert isinstance(data["synced"], int), f"synced should be an integer: {data}"
        assert isinstance(data["total_daily_recordings"], int), f"total_daily_recordings should be an integer: {data}"
        print(f"PASS: POST /api/video-calls/recordings/sync returned synced={data['synced']}, total={data['total_daily_recordings']}")
    
    def test_recording_access_link_requires_admin(self, employee_token):
        """GET /api/video-calls/recordings/{id}/access-link requires admin role"""
        # Use a fake recording ID - should still check auth first
        resp = requests.get(
            f"{BASE_URL}/api/video-calls/recordings/fake-recording-id/access-link",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        # Should return 403 for non-admin users (before checking if recording exists)
        assert resp.status_code in [401, 403], f"Expected 401/403 for non-admin, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/video-calls/recordings/{id}/access-link requires admin role")
    
    def test_recording_access_link_invalid_id(self, admin_token):
        """GET /api/video-calls/recordings/{id}/access-link returns error for invalid ID"""
        resp = requests.get(
            f"{BASE_URL}/api/video-calls/recordings/invalid-recording-id-12345/access-link",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Daily.co API should return an error for invalid recording ID
        # This could be 404 or 502 depending on how Daily.co responds
        assert resp.status_code in [400, 404, 502], f"Expected 400/404/502 for invalid ID, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/video-calls/recordings/invalid-id/access-link returns {resp.status_code}")


class TestCallRequestWithPushNotifications:
    """Test call-request endpoint with push notification integration"""
    
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
        admin_id = data.get("user", {}).get("id")
        if not token:
            pytest.skip(f"No token in response: {data}")
        return {"token": token, "admin_id": admin_id}
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMPLOYEE_EMAIL})
        if resp.status_code != 200:
            pytest.skip(f"Employee login failed: {resp.text}")
        
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            pytest.skip(f"No token in employee response: {data}")
        return token
    
    def test_call_request_triggers_push_no_crash(self, admin_token, employee_token):
        """POST /api/video-calls/call-request triggers push notifications without crashing"""
        admin_id = admin_token["admin_id"]
        if not admin_id:
            pytest.skip("Could not get admin ID from login response")
        
        # Worker requests a call with admin
        resp = requests.post(
            f"{BASE_URL}/api/video-calls/call-request",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={
                "admin_id": admin_id,
                "message": "TEST: Push notification test call request"
            }
        )
        
        # Should succeed even if push notifications fail (they're wrapped in try/except)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "id" in data, f"Response missing 'id': {data}"
        assert "room_name" in data, f"Response missing 'room_name': {data}"
        assert "app_url" in data, f"Response missing 'app_url': {data}"
        assert "status" in data, f"Response missing 'status': {data}"
        assert data["status"] == "pending", f"Expected status 'pending', got {data['status']}"
        
        print(f"PASS: POST /api/video-calls/call-request succeeded with push notification attempt")
        print(f"  - Request ID: {data['id']}")
        print(f"  - Room: {data['room_name']}")
        print(f"  - Note: Push notifications attempted but may not deliver (no device tokens in preview)")
        
        return data
    
    def test_call_request_creates_room_and_request(self, admin_token, employee_token):
        """POST /api/video-calls/call-request creates both room and request records"""
        admin_id = admin_token["admin_id"]
        if not admin_id:
            pytest.skip("Could not get admin ID from login response")
        
        # Create call request
        resp = requests.post(
            f"{BASE_URL}/api/video-calls/call-request",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={
                "admin_id": admin_id,
                "message": "TEST: Verify room creation"
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        room_name = data["room_name"]
        
        # Verify room was created by fetching it
        room_resp = requests.get(f"{BASE_URL}/api/video-calls/rooms/{room_name}")
        assert room_resp.status_code == 200, f"Room not found: {room_resp.status_code}"
        room_data = room_resp.json()
        assert room_data["room_name"] == room_name
        assert room_data["purpose"] == "worker-admin"
        assert room_data["status"] in ["pending", "active"]
        
        print(f"PASS: Call request created room '{room_name}' with purpose 'worker-admin'")


class TestVideoCallsPageEndpoints:
    """Test endpoints used by VideoCallsPage"""
    
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
    
    def test_history_endpoint(self, admin_token):
        """GET /api/video-calls/history returns call history"""
        resp = requests.get(
            f"{BASE_URL}/api/video-calls/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "calls" in data, f"Response missing 'calls' key: {data}"
        assert isinstance(data["calls"], list), f"calls should be a list: {data}"
        print(f"PASS: GET /api/video-calls/history returns {len(data['calls'])} calls")
    
    def test_pending_requests_endpoint(self, admin_token):
        """GET /api/video-calls/call-requests/pending returns pending requests"""
        resp = requests.get(
            f"{BASE_URL}/api/video-calls/call-requests/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "requests" in data, f"Response missing 'requests' key: {data}"
        assert isinstance(data["requests"], list), f"requests should be a list: {data}"
        print(f"PASS: GET /api/video-calls/call-requests/pending returns {len(data['requests'])} requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
