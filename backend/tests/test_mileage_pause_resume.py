"""
Test suite for Mileage Tracking Pause/Resume Feature
Testing: Pause trip, Resume trip, Paused state persistence
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMileagePauseResume:
    """Test pause/resume functionality for mileage tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={"code": "4399"})
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("token")
        assert token, "No token received from login"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Cleanup any existing active trip before tests
        self.session.post(f"{BASE_URL}/api/admin/mileage/cancel-trip")
        yield
        # Cleanup after tests
        self.session.post(f"{BASE_URL}/api/admin/mileage/cancel-trip")
    
    def test_pause_trip_endpoint(self):
        """Test POST /api/admin/mileage/pause-trip endpoint"""
        # First start a trip
        start_data = {
            "start_location": {
                "latitude": 37.7749,
                "longitude": -122.4194
            },
            "start_address": "Test Start Location"
        }
        start_response = self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        assert start_response.status_code == 200, f"Failed to start trip: {start_response.text}"
        
        trip_data = start_response.json()
        assert trip_data.get("is_paused") == False, "New trip should not be paused"
        
        # Pause the trip
        pause_response = self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        assert pause_response.status_code == 200, f"Failed to pause trip: {pause_response.text}"
        
        pause_data = pause_response.json()
        assert pause_data.get("message") == "Trip paused", f"Unexpected response: {pause_data}"
        assert "paused_at" in pause_data, "Response should include paused_at timestamp"
    
    def test_pause_already_paused_trip_fails(self):
        """Test that pausing an already paused trip returns error"""
        # Start a trip
        start_data = {
            "start_location": {"latitude": 37.7749, "longitude": -122.4194},
            "start_address": "Test Location"
        }
        self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        
        # Pause the trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        
        # Try to pause again - should fail
        second_pause = self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        assert second_pause.status_code == 400, "Should not be able to pause an already paused trip"
        assert "already paused" in second_pause.json().get("detail", "").lower()
    
    def test_resume_trip_endpoint(self):
        """Test POST /api/admin/mileage/resume-trip endpoint"""
        # Start a trip
        start_data = {
            "start_location": {"latitude": 37.7749, "longitude": -122.4194},
            "start_address": "Test Location"
        }
        self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        
        # Pause the trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        
        # Wait a bit to accumulate some pause duration
        time.sleep(1)
        
        # Resume the trip
        resume_response = self.session.post(f"{BASE_URL}/api/admin/mileage/resume-trip")
        assert resume_response.status_code == 200, f"Failed to resume trip: {resume_response.text}"
        
        resume_data = resume_response.json()
        assert resume_data.get("message") == "Trip resumed", f"Unexpected response: {resume_data}"
        assert "total_paused_duration" in resume_data, "Response should include total_paused_duration"
        assert resume_data.get("total_paused_duration") >= 1, "Should have paused for at least 1 second"
    
    def test_resume_non_paused_trip_fails(self):
        """Test that resuming a non-paused trip returns error"""
        # Start a trip (not paused)
        start_data = {
            "start_location": {"latitude": 37.7749, "longitude": -122.4194},
            "start_address": "Test Location"
        }
        self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        
        # Try to resume without pausing first - should fail
        resume_response = self.session.post(f"{BASE_URL}/api/admin/mileage/resume-trip")
        assert resume_response.status_code == 400, "Should not be able to resume a non-paused trip"
        assert "not paused" in resume_response.json().get("detail", "").lower()
    
    def test_paused_state_persists_in_active_trip(self):
        """Test that paused state is correctly reflected in active trip"""
        # Start a trip
        start_data = {
            "start_location": {"latitude": 37.7749, "longitude": -122.4194},
            "start_address": "Test Location"
        }
        self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        
        # Check active trip - should not be paused
        active_trip = self.session.get(f"{BASE_URL}/api/admin/mileage/active-trip")
        assert active_trip.status_code == 200
        assert active_trip.json().get("is_paused") == False, "New trip should not be paused"
        
        # Pause the trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        
        # Check active trip - should be paused
        active_trip = self.session.get(f"{BASE_URL}/api/admin/mileage/active-trip")
        assert active_trip.status_code == 200
        trip_data = active_trip.json()
        assert trip_data.get("is_paused") == True, "Trip should be paused"
        assert trip_data.get("paused_at") is not None, "Should have paused_at timestamp"
        
        # Resume the trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/resume-trip")
        
        # Check active trip - should not be paused
        active_trip = self.session.get(f"{BASE_URL}/api/admin/mileage/active-trip")
        assert active_trip.status_code == 200
        trip_data = active_trip.json()
        assert trip_data.get("is_paused") == False, "Trip should be resumed"
        assert trip_data.get("paused_at") is None, "paused_at should be cleared after resume"
    
    def test_location_not_recorded_when_paused(self):
        """Test that location updates are ignored when trip is paused"""
        # Start a trip
        start_data = {
            "start_location": {"latitude": 37.7749, "longitude": -122.4194},
            "start_address": "Test Location"
        }
        self.session.post(f"{BASE_URL}/api/admin/mileage/start-trip", json=start_data)
        
        # Add a waypoint - should work
        location_data = {"location": {"latitude": 37.7750, "longitude": -122.4195}}
        response = self.session.post(f"{BASE_URL}/api/admin/mileage/update-location", json=location_data)
        assert response.status_code == 200
        assert response.json().get("message") == "Location updated"
        
        # Pause the trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        
        # Try to add a waypoint while paused - should be ignored
        location_data = {"location": {"latitude": 37.7751, "longitude": -122.4196}}
        response = self.session.post(f"{BASE_URL}/api/admin/mileage/update-location", json=location_data)
        assert response.status_code == 200
        assert "paused" in response.json().get("message", "").lower(), "Should indicate trip is paused"
    
    def test_pause_without_active_trip_fails(self):
        """Test that pausing without an active trip returns 404"""
        # Cancel any existing trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/cancel-trip")
        
        # Try to pause - should fail
        pause_response = self.session.post(f"{BASE_URL}/api/admin/mileage/pause-trip")
        assert pause_response.status_code == 404, "Should return 404 when no active trip"
    
    def test_resume_without_active_trip_fails(self):
        """Test that resuming without an active trip returns 404"""
        # Cancel any existing trip
        self.session.post(f"{BASE_URL}/api/admin/mileage/cancel-trip")
        
        # Try to resume - should fail
        resume_response = self.session.post(f"{BASE_URL}/api/admin/mileage/resume-trip")
        assert resume_response.status_code == 404, "Should return 404 when no active trip"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
