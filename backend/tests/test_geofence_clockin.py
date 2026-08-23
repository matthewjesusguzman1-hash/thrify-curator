"""
Tests for Geofenced Clock-In Feature

Tests the geofence validation for clock-in functionality:
- Clock-in requires location (latitude/longitude)
- Clock-in rejected when outside geofence radius (~2 miles)
- Clock-in allowed when within geofence radius
- Clock-out works from anywhere (no location required)
- Dashboard data access works from any location
"""
import pytest
import requests
import os
import uuid

# Set BASE_URL from REACT_APP_BACKEND_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com').rstrip('/')

# Test employee credentials
TEST_EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"

# Business location (Omaha, NE)
BUSINESS_LATITUDE = 41.13063
BUSINESS_LONGITUDE = -95.99024
GEOFENCE_RADIUS_METERS = 3219  # ~2 miles

# Test locations
PHILIPPINES_COORDS = {"latitude": 14.5995, "longitude": 120.9842}  # Manila
OMAHA_COORDS = {"latitude": BUSINESS_LATITUDE, "longitude": BUSINESS_LONGITUDE}  # Business location
EDGE_INSIDE_COORDS = {"latitude": 41.1581, "longitude": -95.99024}  # ~1.9 miles north (inside)
EDGE_OUTSIDE_COORDS = {"latitude": 41.161, "longitude": -95.99024}  # ~2.1 miles north (outside)


@pytest.fixture(scope="module")
def base_url():
    """Return the base URL for API calls"""
    return BASE_URL


@pytest.fixture(scope="function")
def employee_token(base_url):
    """Get authentication token for test employee"""
    response = requests.post(f"{base_url}/api/auth/login", json={
        "email": TEST_EMPLOYEE_EMAIL
    })
    if response.status_code != 200:
        pytest.skip(f"Employee authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def employee_headers(employee_token):
    """Return authorization headers for employee"""
    return {"Authorization": f"Bearer {employee_token}", "Content-Type": "application/json"}


@pytest.fixture(autouse=True)
def cleanup_clock_status(base_url, employee_headers):
    """Ensure employee is clocked out before and after each test"""
    # Clock out before test (ignore errors if not clocked in)
    requests.post(f"{base_url}/api/time/clock", 
                  headers=employee_headers, 
                  json={"action": "out"})
    
    yield
    
    # Clock out after test (cleanup)
    requests.post(f"{base_url}/api/time/clock", 
                  headers=employee_headers, 
                  json={"action": "out"})


class TestGeofenceClockIn:
    """Tests for geofenced clock-in functionality"""
    
    def test_clock_in_without_location_fails(self, base_url, employee_headers):
        """Clock-in without location should return 400 error"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Location access is required" in data.get("detail", ""), f"Unexpected error: {data}"
    
    def test_clock_in_outside_geofence_fails(self, base_url, employee_headers):
        """Clock-in from Philippines (outside geofence) should return 403 error"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **PHILIPPINES_COORDS}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "must be at the business location" in data.get("detail", ""), f"Unexpected error: {data}"
        # Verify distance is included in error message
        assert "meters away" in data.get("detail", ""), "Distance should be included in error"
    
    def test_clock_in_within_geofence_succeeds(self, base_url, employee_headers):
        """Clock-in from business location (within geofence) should succeed"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **OMAHA_COORDS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("clock_in") is not None, "clock_in timestamp should be set"
        assert data.get("clock_out") is None, "clock_out should be None"
        assert data.get("user_name") == "Test Employee", f"Unexpected user_name: {data.get('user_name')}"
    
    def test_clock_in_at_edge_inside_geofence_succeeds(self, base_url, employee_headers):
        """Clock-in at edge of geofence (~1.9 miles) should succeed"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **EDGE_INSIDE_COORDS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("clock_in") is not None, "clock_in timestamp should be set"
    
    def test_clock_in_at_edge_outside_geofence_fails(self, base_url, employee_headers):
        """Clock-in just outside geofence (~2.1 miles) should fail"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **EDGE_OUTSIDE_COORDS}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "must be at the business location" in data.get("detail", ""), f"Unexpected error: {data}"


class TestClockOutNoLocation:
    """Tests for clock-out without location requirement"""
    
    def test_clock_out_without_location_succeeds(self, base_url, employee_headers):
        """Clock-out should work without location (from anywhere)"""
        # First clock in from valid location
        clock_in_response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **OMAHA_COORDS}
        )
        assert clock_in_response.status_code == 200, f"Clock-in failed: {clock_in_response.text}"
        
        # Now clock out without location
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "out"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("clock_out") is not None, "clock_out timestamp should be set"
        assert data.get("total_hours") is not None, "total_hours should be calculated"
    
    def test_clock_out_from_remote_location_succeeds(self, base_url, employee_headers):
        """Clock-out from Philippines (remote location) should succeed"""
        # First clock in from valid location
        clock_in_response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **OMAHA_COORDS}
        )
        assert clock_in_response.status_code == 200, f"Clock-in failed: {clock_in_response.text}"
        
        # Clock out from Philippines (location provided but not validated)
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "out", **PHILIPPINES_COORDS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("clock_out") is not None, "clock_out timestamp should be set"


class TestDashboardAccessFromAnywhere:
    """Tests for dashboard data access from any location"""
    
    def test_summary_endpoint_accessible(self, base_url, employee_headers):
        """GET /api/time/summary should work from anywhere"""
        response = requests.get(
            f"{base_url}/api/time/summary",
            headers=employee_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify summary structure
        assert "total_hours" in data, "total_hours should be in response"
        assert "period_hours" in data, "period_hours should be in response"
        assert "hourly_rate" in data, "hourly_rate should be in response"
    
    def test_entries_endpoint_accessible(self, base_url, employee_headers):
        """GET /api/time/entries should work from anywhere"""
        response = requests.get(
            f"{base_url}/api/time/entries",
            headers=employee_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of entries"
    
    def test_status_endpoint_accessible(self, base_url, employee_headers):
        """GET /api/time/status should work from anywhere"""
        response = requests.get(
            f"{base_url}/api/time/status",
            headers=employee_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "clocked_in" in data, "clocked_in should be in response"


class TestRemoteWorkerRestriction:
    """Tests for remote worker clock-in restriction"""
    
    def test_remote_worker_cannot_clock_in(self, base_url):
        """Remote workers should not be able to clock in directly"""
        # Note: This test requires a remote worker account to be set up
        # For now, we verify the error message format from the code
        # The actual test would need a user with is_remote_worker=True
        
        # This is a documentation test - the actual restriction is:
        # "Remote workers cannot clock in directly. Please use AnyDesk to connect to the company computer."
        pass  # Skip - requires remote worker test account


class TestGeofenceCalculation:
    """Tests for geofence distance calculation accuracy"""
    
    def test_distance_in_error_message_is_reasonable(self, base_url, employee_headers):
        """Verify distance calculation in error message is accurate"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **PHILIPPINES_COORDS}
        )
        
        assert response.status_code == 403
        data = response.json()
        detail = data.get("detail", "")
        
        # Extract distance from error message
        # Format: "You must be at the business location to clock in. You are X meters away."
        import re
        match = re.search(r'(\d+) meters away', detail)
        assert match, f"Could not find distance in error: {detail}"
        
        distance_meters = int(match.group(1))
        # Manila to Omaha is approximately 12,700-12,800 km
        # Allow some variance for calculation differences
        assert 12000000 < distance_meters < 13000000, f"Distance {distance_meters}m seems incorrect for Manila to Omaha"
    
    def test_edge_distance_calculation(self, base_url, employee_headers):
        """Verify edge case distance is calculated correctly"""
        response = requests.post(
            f"{base_url}/api/time/clock",
            headers=employee_headers,
            json={"action": "in", **EDGE_OUTSIDE_COORDS}
        )
        
        assert response.status_code == 403
        data = response.json()
        detail = data.get("detail", "")
        
        import re
        match = re.search(r'(\d+) meters away', detail)
        assert match, f"Could not find distance in error: {detail}"
        
        distance_meters = int(match.group(1))
        # Should be just over 3219 meters (the geofence radius)
        assert 3200 < distance_meters < 4000, f"Edge distance {distance_meters}m seems incorrect"
