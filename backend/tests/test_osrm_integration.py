"""
Backend tests for OSRM Map-Matching Integration
Tests the road-matching functionality for mileage tracking
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for testing
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestMileageEntriesOSRMFields:
    """Tests that mileage entries include OSRM-related fields"""

    def test_entries_include_is_road_matched_field(self, auth_headers):
        """Test that mileage entries include is_road_matched field"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert response.status_code == 200
        
        entries = response.json()
        if len(entries) > 0:
            entry = entries[0]
            assert "is_road_matched" in entry, "Entry missing is_road_matched field"
            assert isinstance(entry["is_road_matched"], bool), "is_road_matched should be boolean"

    def test_entries_include_match_confidence_field(self, auth_headers):
        """Test that mileage entries include match_confidence field"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert response.status_code == 200
        
        entries = response.json()
        if len(entries) > 0:
            entry = entries[0]
            assert "match_confidence" in entry, "Entry missing match_confidence field"
            assert isinstance(entry["match_confidence"], (int, float)), "match_confidence should be numeric"
            # Confidence should be between 0 and 1
            assert 0 <= entry["match_confidence"] <= 1, "match_confidence should be between 0 and 1"


class TestTripWaypointsEndpoint:
    """Tests for GET /api/admin/mileage/{trip_id}/waypoints endpoint"""

    def test_get_trip_waypoints_for_invalid_trip_returns_404(self, auth_headers):
        """Test that invalid trip ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/admin/mileage/{fake_id}/waypoints", headers=auth_headers)
        assert response.status_code == 404

    def test_get_trip_waypoints_returns_road_matched_data(self, auth_headers):
        """Test that waypoints endpoint returns road-matched data structure"""
        # First get an existing trip with waypoints
        entries_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert entries_response.status_code == 200
        
        entries = entries_response.json()
        # Find an entry with waypoints
        entry_with_waypoints = next(
            (e for e in entries if e.get("waypoint_count", 0) > 0), 
            None
        )
        
        if entry_with_waypoints:
            trip_id = entry_with_waypoints["id"]
            response = requests.get(f"{BASE_URL}/api/admin/mileage/{trip_id}/waypoints", headers=auth_headers)
            assert response.status_code == 200
            
            data = response.json()
            # Check expected fields
            assert "waypoints" in data, "Response should include waypoints"
            assert "matched_coordinates" in data, "Response should include matched_coordinates"
            assert "is_road_matched" in data, "Response should include is_road_matched"
            assert "match_confidence" in data, "Response should include match_confidence"
            assert "total_miles" in data, "Response should include total_miles"
        else:
            pytest.skip("No entries with waypoints found to test")


class TestReprocessRouteEndpoint:
    """Tests for POST /api/admin/mileage/{trip_id}/reprocess-route endpoint"""

    def test_reprocess_route_for_invalid_trip_returns_404(self, auth_headers):
        """Test that invalid trip ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/admin/mileage/{fake_id}/reprocess-route", headers=auth_headers)
        assert response.status_code == 404

    def test_reprocess_route_requires_auth(self):
        """Test that reprocess-route requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/admin/mileage/{fake_id}/reprocess-route")
        assert response.status_code in [401, 403]

    def test_reprocess_route_returns_expected_fields(self, auth_headers):
        """Test that reprocess-route returns expected response structure"""
        # Find an entry with waypoints to reprocess
        entries_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        entries = entries_response.json()
        
        entry_with_waypoints = next(
            (e for e in entries if e.get("waypoint_count", 0) >= 2), 
            None
        )
        
        if entry_with_waypoints:
            trip_id = entry_with_waypoints["id"]
            response = requests.post(f"{BASE_URL}/api/admin/mileage/{trip_id}/reprocess-route", headers=auth_headers)
            
            # Should succeed (200) or fail gracefully with proper error
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                # Check expected response fields
                assert "trip_id" in data, "Response should include trip_id"
                assert "original_miles" in data, "Response should include original_miles"
                assert "road_matched_miles" in data, "Response should include road_matched_miles"
                assert "confidence" in data, "Response should include confidence"
                assert "is_road_matched" in data, "Response should include is_road_matched"
        else:
            pytest.skip("No entries with enough waypoints found to test reprocess")

    def test_reprocess_route_fails_with_insufficient_waypoints(self, auth_headers):
        """Test that reprocess fails gracefully when trip has insufficient waypoints"""
        # Create a manual entry (no waypoints)
        new_entry = {
            "date": "2026-02-26",
            "start_address": "TEST_OSRM_Start",
            "end_address": "TEST_OSRM_End",
            "total_miles": 5.0,
            "purpose": "thrifting",
            "notes": "TEST_OSRM no waypoints test"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                        json=new_entry, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        entry_id = create_response.json()["id"]
        
        try:
            # Try to reprocess - should fail with 400 (not enough waypoints)
            reprocess_response = requests.post(
                f"{BASE_URL}/api/admin/mileage/{entry_id}/reprocess-route", 
                headers=auth_headers
            )
            # Manual entries have no waypoints, so reprocess should fail
            assert reprocess_response.status_code == 400, "Should fail with insufficient waypoints"
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", headers=auth_headers)


class TestMileageEntryFieldValidation:
    """Tests that newly created entries have correct OSRM fields"""

    def test_manual_entry_has_default_osrm_fields(self, auth_headers):
        """Test that manually created entries have default OSRM field values"""
        new_entry = {
            "date": "2026-02-26",
            "start_address": "TEST_OSRM_Field_Start",
            "end_address": "TEST_OSRM_Field_End",
            "total_miles": 7.5,
            "purpose": "post_office",
            "notes": "TEST_OSRM fields validation"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                        json=new_entry, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        entry_id = created["id"]
        
        try:
            # Check fields in response
            assert "is_road_matched" in created, "Created entry should have is_road_matched"
            assert "match_confidence" in created, "Created entry should have match_confidence"
            
            # Manual entries should not be road-matched
            assert created["is_road_matched"] == False, "Manual entry should not be road-matched"
            assert created["match_confidence"] == 0, "Manual entry should have 0 confidence"
            
            # Verify via GET
            get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
            entries = get_response.json()
            found = next((e for e in entries if e["id"] == entry_id), None)
            
            assert found is not None, "Created entry should be in list"
            assert found["is_road_matched"] == False
            assert found["match_confidence"] == 0
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", headers=auth_headers)


class TestOSRMServiceIntegration:
    """Integration tests for OSRM service with real coordinates"""

    def test_reprocess_with_real_coordinates(self, auth_headers):
        """Test reprocessing a trip with actual GPS coordinates"""
        # Find a trip with waypoints
        entries_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        entries = entries_response.json()
        
        # Find trip with most waypoints for better OSRM matching
        trips_with_waypoints = [e for e in entries if e.get("waypoint_count", 0) >= 3]
        
        if not trips_with_waypoints:
            pytest.skip("No trips with 3+ waypoints found for OSRM integration test")
            return
        
        # Sort by waypoint count (descending) and take first
        trip = max(trips_with_waypoints, key=lambda x: x.get("waypoint_count", 0))
        trip_id = trip["id"]
        
        # Reprocess the route
        response = requests.post(f"{BASE_URL}/api/admin/mileage/{trip_id}/reprocess-route", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert data["trip_id"] == trip_id
            assert "road_matched_miles" in data
            assert "confidence" in data
            
            # If matched successfully, verify entry was updated
            if data["is_road_matched"]:
                entry_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
                updated_entries = entry_response.json()
                updated_trip = next((e for e in updated_entries if e["id"] == trip_id), None)
                
                assert updated_trip is not None
                assert updated_trip["is_road_matched"] == True
                assert updated_trip["match_confidence"] > 0
        else:
            # OSRM may fail due to network issues - this is acceptable
            pytest.skip(f"OSRM service unavailable or returned error: {response.status_code}")
