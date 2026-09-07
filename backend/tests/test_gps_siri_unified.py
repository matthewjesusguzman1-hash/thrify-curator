"""
GPS Mileage Tracker - Unified Quick Trip System & Siri API Key Tests
Tests the new unified trip system (log-drive endpoint) and Siri API key management.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"

# Test coordinates (Los Angeles area)
START_COORDS = {"latitude": 34.0522, "longitude": -118.2437}
END_COORDS = {"latitude": 34.0622, "longitude": -118.2537}


class TestAdminLogin:
    """Test admin authentication flow"""
    
    def test_admin_login(self):
        """Admin can login with email and code"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        assert data["access_token"], "access_token is empty"
        print(f"PASS: Admin login successful, got access_token")
        return data["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    data = response.json()
    if "access_token" not in data:
        pytest.skip(f"No access_token in login response: {data}")
    return data["access_token"]


@pytest.fixture
def auth_header(admin_token):
    """Auth header for requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestSiriAPIKeyManagement:
    """Test Siri API key generation, status, and revocation"""
    
    def test_get_siri_key_status_no_key(self, auth_header):
        """GET /api/admin/gps-trips/siri-key returns has_key=false when no key exists"""
        # First revoke any existing key
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert response.status_code == 200, f"Failed to get siri key status: {response.text}"
        data = response.json()
        assert "has_key" in data, f"Missing has_key field: {data}"
        assert data["has_key"] == False, f"Expected has_key=false, got: {data}"
        print(f"PASS: Siri key status returns has_key=false when no key exists")
    
    def test_generate_siri_key(self, auth_header):
        """POST /api/admin/gps-trips/siri-key generates a new API key"""
        # First revoke any existing key
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        
        response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert response.status_code == 200, f"Failed to generate siri key: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        assert "api_key" in data, f"Missing api_key in response: {data}"
        assert "key_prefix" in data, f"Missing key_prefix in response: {data}"
        assert data["api_key"].startswith("siri_"), f"API key should start with 'siri_': {data['api_key']}"
        assert len(data["api_key"]) > 20, f"API key too short: {data['api_key']}"
        print(f"PASS: Siri API key generated: {data['key_prefix']}...")
        return data["api_key"]
    
    def test_get_siri_key_status_has_key(self, auth_header):
        """GET /api/admin/gps-trips/siri-key returns has_key=true and key_prefix after generation"""
        # Generate a key first
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        gen_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert gen_response.status_code == 200
        gen_data = gen_response.json()
        
        # Now check status
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert response.status_code == 200, f"Failed to get siri key status: {response.text}"
        data = response.json()
        assert data.get("has_key") == True, f"Expected has_key=true: {data}"
        assert "key_prefix" in data, f"Missing key_prefix: {data}"
        assert data["key_prefix"] == gen_data["key_prefix"], f"Key prefix mismatch"
        print(f"PASS: Siri key status returns has_key=true with key_prefix={data['key_prefix']}")
    
    def test_revoke_siri_key(self, auth_header):
        """DELETE /api/admin/gps-trips/siri-key revokes the key"""
        # Generate a key first
        requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        
        # Revoke it
        response = requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert response.status_code == 200, f"Failed to revoke siri key: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        
        # Verify it's gone
        status_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        status_data = status_response.json()
        assert status_data.get("has_key") == False, f"Key should be revoked: {status_data}"
        print(f"PASS: Siri API key revoked successfully")


class TestSiriKeyAuthentication:
    """Test that Siri API key can authenticate log-drive endpoint"""
    
    def test_siri_key_auth_start_trip(self, auth_header):
        """Siri API key can authenticate POST /api/admin/gps-trips/log-drive (start event)"""
        # Generate a fresh Siri key
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        gen_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert gen_response.status_code == 200
        siri_key = gen_response.json()["api_key"]
        
        # Cancel any active trips first (using JWT auth)
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        # Use Siri key to start a trip
        siri_header = {"Authorization": f"Bearer {siri_key}"}
        response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", 
            json={**START_COORDS, "event": "start"},
            headers=siri_header
        )
        assert response.status_code == 200, f"Siri key auth failed for start: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        assert data.get("event") == "trip_started", f"Expected event=trip_started: {data}"
        assert "trip_id" in data, f"Missing trip_id: {data}"
        assert "start_address" in data, f"Missing start_address: {data}"
        print(f"PASS: Siri key authenticated start trip - {data['start_address']}")
        return data["trip_id"], siri_key
    
    def test_siri_key_auth_end_trip(self, auth_header):
        """Siri API key can authenticate POST /api/admin/gps-trips/log-drive (end event)"""
        # Generate a fresh Siri key and start a trip
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        gen_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        siri_key = gen_response.json()["api_key"]
        
        # Cancel any active trips first
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        siri_header = {"Authorization": f"Bearer {siri_key}"}
        
        # Start trip with Siri key
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=siri_header
        )
        assert start_response.status_code == 200
        trip_id = start_response.json()["trip_id"]
        
        # End trip with Siri key
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=siri_header
        )
        assert end_response.status_code == 200, f"Siri key auth failed for end: {end_response.text}"
        data = end_response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        assert data.get("event") == "trip_completed", f"Expected event=trip_completed: {data}"
        assert "total_miles" in data, f"Missing total_miles: {data}"
        assert "tax_deduction" in data, f"Missing tax_deduction: {data}"
        assert "end_address" in data, f"Missing end_address: {data}"
        print(f"PASS: Siri key authenticated end trip - {data['total_miles']} miles, ${data['tax_deduction']} deduction")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestLogDriveWithJWT:
    """Test log-drive endpoint still works with regular JWT token"""
    
    def test_jwt_auth_start_trip(self, auth_header):
        """JWT token can authenticate POST /api/admin/gps-trips/log-drive (start event)"""
        # Cancel any active trips first
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert response.status_code == 200, f"JWT auth failed for start: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        assert data.get("event") == "trip_started", f"Expected event=trip_started: {data}"
        print(f"PASS: JWT authenticated start trip")
        return data["trip_id"]
    
    def test_jwt_auth_end_trip(self, auth_header):
        """JWT token can authenticate POST /api/admin/gps-trips/log-drive (end event)"""
        # Cancel any active trips first
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        # Start trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start_response.status_code == 200
        trip_id = start_response.json()["trip_id"]
        
        # End trip
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=auth_header
        )
        assert end_response.status_code == 200, f"JWT auth failed for end: {end_response.text}"
        data = end_response.json()
        assert data.get("success") == True, f"Expected success=true: {data}"
        assert data.get("event") == "trip_completed", f"Expected event=trip_completed: {data}"
        print(f"PASS: JWT authenticated end trip - {data['total_miles']} miles")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestLogDriveEdgeCases:
    """Test edge cases for log-drive endpoint"""
    
    def test_start_when_trip_active(self, auth_header):
        """Starting a trip when one is already active returns error"""
        # Cancel any active trips first
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        # Start first trip
        start1 = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start1.status_code == 200
        trip_id = start1.json()["trip_id"]
        
        # Try to start second trip
        start2 = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start2.status_code == 200
        data = start2.json()
        assert data.get("success") == False, f"Expected success=false: {data}"
        assert "pending_trip_id" in data, f"Should return pending_trip_id: {data}"
        print(f"PASS: Starting trip when one is active returns error with pending_trip_id")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
    
    def test_end_when_no_trip_active(self, auth_header):
        """Ending a trip when none is active returns error"""
        # Cancel any active trips first
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
        
        # Try to end trip when none active
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=auth_header
        )
        assert end_response.status_code == 200
        data = end_response.json()
        assert data.get("success") == False, f"Expected success=false: {data}"
        assert "No active trip" in data.get("message", ""), f"Should mention no active trip: {data}"
        print(f"PASS: Ending trip when none active returns error")


class TestInvalidSiriKeyAuth:
    """Test that invalid Siri keys are rejected"""
    
    def test_invalid_siri_key_rejected(self):
        """Invalid Siri API key is rejected"""
        invalid_header = {"Authorization": "Bearer siri_invalid_key_12345678901234567890"}
        response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=invalid_header
        )
        assert response.status_code == 401, f"Expected 401 for invalid key, got {response.status_code}: {response.text}"
        print(f"PASS: Invalid Siri key rejected with 401")
    
    def test_revoked_siri_key_rejected(self, auth_header):
        """Revoked Siri API key is rejected"""
        # Generate and then revoke a key
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        gen_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        siri_key = gen_response.json()["api_key"]
        
        # Revoke it
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        
        # Try to use revoked key
        revoked_header = {"Authorization": f"Bearer {siri_key}"}
        response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=revoked_header
        )
        assert response.status_code == 401, f"Expected 401 for revoked key, got {response.status_code}: {response.text}"
        print(f"PASS: Revoked Siri key rejected with 401")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_active_trips(self, auth_header):
        """Clean up any active trips from tests"""
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        if active_response.status_code == 200:
            active_data = active_response.json()
            if active_data.get("active_trip"):
                trip_id = active_data["active_trip"]["id"]
                requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
                print(f"Cleaned up active trip: {trip_id}")
        print("PASS: Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
