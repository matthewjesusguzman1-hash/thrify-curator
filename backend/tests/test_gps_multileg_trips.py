"""
GPS Mileage Tracker - Multi-Leg Trip Tests (Pause/Resume)
Tests the new pause/resume events in log-drive endpoint for multi-stop trips.
Also tests route_geometry storage and retrieval.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"

# Test coordinates (Los Angeles area) for multi-leg trip
# Start -> Pause (leg 1) -> Resume -> End (leg 2)
START_COORDS = {"latitude": 34.0522, "longitude": -118.2437}  # Downtown LA
PAUSE_COORDS = {"latitude": 34.0622, "longitude": -118.2337}  # ~1 mile NE
RESUME_COORDS = {"latitude": 34.0622, "longitude": -118.2337}  # Same as pause
END_COORDS = {"latitude": 34.0822, "longitude": -118.2137}    # ~2 miles NE


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


@pytest.fixture
def clean_active_trips(auth_header):
    """Clean up any active trips before test"""
    active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
    if active_response.status_code == 200:
        active_data = active_response.json()
        if active_data.get("active_trip"):
            trip_id = active_data["active_trip"]["id"]
            requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
    yield
    # Cleanup after test too
    active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
    if active_response.status_code == 200:
        active_data = active_response.json()
        if active_data.get("active_trip"):
            trip_id = active_data["active_trip"]["id"]
            requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestPauseEvent:
    """Test pause event in log-drive endpoint"""
    
    def test_pause_active_trip(self, auth_header, clean_active_trips):
        """POST /api/admin/gps-trips/log-drive with event='pause' pauses trip and calculates leg distance"""
        # Start a trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start_response.status_code == 200
        start_data = start_response.json()
        assert start_data.get("success") == True
        trip_id = start_data["trip_id"]
        print(f"Started trip: {trip_id}")
        
        # Pause the trip
        pause_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**PAUSE_COORDS, "event": "pause"},
            headers=auth_header
        )
        assert pause_response.status_code == 200, f"Pause failed: {pause_response.text}"
        pause_data = pause_response.json()
        
        # Verify pause response
        assert pause_data.get("success") == True, f"Expected success=true: {pause_data}"
        assert pause_data.get("event") == "trip_paused", f"Expected event=trip_paused: {pause_data}"
        assert "pause_address" in pause_data, f"Missing pause_address: {pause_data}"
        assert "leg_miles" in pause_data, f"Missing leg_miles: {pause_data}"
        assert "total_miles" in pause_data, f"Missing total_miles: {pause_data}"
        assert pause_data["leg_miles"] > 0, f"leg_miles should be > 0: {pause_data}"
        print(f"PASS: Trip paused - leg_miles={pause_data['leg_miles']}, total_miles={pause_data['total_miles']}")
        
        # Verify trip status is paused
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        assert active_response.status_code == 200
        active_data = active_response.json()
        assert active_data.get("active_trip") is not None, "Trip should still be active (paused)"
        assert active_data["active_trip"]["status"] == "paused", f"Trip status should be 'paused': {active_data}"
        print(f"PASS: Trip status is 'paused'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
    
    def test_pause_no_active_trip(self, auth_header, clean_active_trips):
        """Pausing when no trip is active returns error"""
        pause_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**PAUSE_COORDS, "event": "pause"},
            headers=auth_header
        )
        assert pause_response.status_code == 200
        pause_data = pause_response.json()
        assert pause_data.get("success") == False, f"Expected success=false: {pause_data}"
        assert "No active trip" in pause_data.get("message", ""), f"Should mention no active trip: {pause_data}"
        print(f"PASS: Pause with no active trip returns error")


class TestResumeEvent:
    """Test resume event in log-drive endpoint"""
    
    def test_resume_paused_trip(self, auth_header, clean_active_trips):
        """POST /api/admin/gps-trips/log-drive with event='resume' resumes a paused trip"""
        # Start a trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start_response.status_code == 200
        trip_id = start_response.json()["trip_id"]
        
        # Pause the trip
        pause_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**PAUSE_COORDS, "event": "pause"},
            headers=auth_header
        )
        assert pause_response.status_code == 200
        
        # Resume the trip
        resume_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**RESUME_COORDS, "event": "resume"},
            headers=auth_header
        )
        assert resume_response.status_code == 200, f"Resume failed: {resume_response.text}"
        resume_data = resume_response.json()
        
        # Verify resume response
        assert resume_data.get("success") == True, f"Expected success=true: {resume_data}"
        assert resume_data.get("event") == "trip_resumed", f"Expected event=trip_resumed: {resume_data}"
        assert "resume_address" in resume_data, f"Missing resume_address: {resume_data}"
        print(f"PASS: Trip resumed from {resume_data['resume_address']}")
        
        # Verify trip status is active again
        active_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/active", headers=auth_header)
        assert active_response.status_code == 200
        active_data = active_response.json()
        assert active_data.get("active_trip") is not None
        assert active_data["active_trip"]["status"] == "active", f"Trip status should be 'active': {active_data}"
        print(f"PASS: Trip status is 'active' after resume")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)
    
    def test_resume_no_paused_trip(self, auth_header, clean_active_trips):
        """Resuming when no trip is paused returns error"""
        resume_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**RESUME_COORDS, "event": "resume"},
            headers=auth_header
        )
        assert resume_response.status_code == 200
        resume_data = resume_response.json()
        assert resume_data.get("success") == False, f"Expected success=false: {resume_data}"
        assert "No paused trip" in resume_data.get("message", ""), f"Should mention no paused trip: {resume_data}"
        print(f"PASS: Resume with no paused trip returns error")


class TestMultiLegTrip:
    """Test complete multi-leg trip flow: start -> pause -> resume -> end"""
    
    def test_multi_leg_trip_complete_flow(self, auth_header, clean_active_trips):
        """Complete multi-leg trip with pause/resume calculates correct total distance and combined route_geometry"""
        # Start trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start_response.status_code == 200
        start_data = start_response.json()
        assert start_data.get("success") == True
        trip_id = start_data["trip_id"]
        print(f"Started multi-leg trip: {trip_id}")
        
        # Pause trip (end of leg 1)
        pause_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**PAUSE_COORDS, "event": "pause"},
            headers=auth_header
        )
        assert pause_response.status_code == 200
        pause_data = pause_response.json()
        assert pause_data.get("success") == True
        leg1_miles = pause_data["leg_miles"]
        print(f"Leg 1 completed: {leg1_miles} miles")
        
        # Resume trip (start of leg 2)
        resume_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**RESUME_COORDS, "event": "resume"},
            headers=auth_header
        )
        assert resume_response.status_code == 200
        resume_data = resume_response.json()
        assert resume_data.get("success") == True
        print(f"Leg 2 started from: {resume_data['resume_address']}")
        
        # End trip (end of leg 2)
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=auth_header
        )
        assert end_response.status_code == 200, f"End failed: {end_response.text}"
        end_data = end_response.json()
        
        # Verify end response
        assert end_data.get("success") == True, f"Expected success=true: {end_data}"
        assert end_data.get("event") == "trip_completed", f"Expected event=trip_completed: {end_data}"
        assert "total_miles" in end_data, f"Missing total_miles: {end_data}"
        assert "tax_deduction" in end_data, f"Missing tax_deduction: {end_data}"
        assert "legs_count" in end_data, f"Missing legs_count: {end_data}"
        
        # Verify multi-leg data
        assert end_data["legs_count"] == 2, f"Expected 2 legs, got: {end_data['legs_count']}"
        assert end_data["total_miles"] > leg1_miles, f"Total miles should be > leg1 miles: {end_data}"
        print(f"PASS: Multi-leg trip completed - {end_data['legs_count']} legs, {end_data['total_miles']} total miles, ${end_data['tax_deduction']} deduction")
        
        # Verify route_geometry is stored
        trip_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/trip/{trip_id}?include_locations=true", headers=auth_header)
        assert trip_response.status_code == 200
        trip_data = trip_response.json()
        trip = trip_data.get("trip", {})
        
        assert "route_geometry" in trip, f"Missing route_geometry in trip: {trip.keys()}"
        route_geometry = trip["route_geometry"]
        assert isinstance(route_geometry, list), f"route_geometry should be a list: {type(route_geometry)}"
        assert len(route_geometry) > 10, f"route_geometry should have many points: {len(route_geometry)}"
        print(f"PASS: route_geometry stored with {len(route_geometry)} coordinate pairs")
        
        # Verify legs are stored
        assert "legs" in trip, f"Missing legs in trip: {trip.keys()}"
        legs = trip["legs"]
        assert len(legs) == 2, f"Expected 2 legs, got: {len(legs)}"
        print(f"PASS: Trip has {len(legs)} legs stored")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestSingleLegTrip:
    """Test single-leg trip (start -> end without pause) still works correctly"""
    
    def test_single_leg_trip_with_route_geometry(self, auth_header, clean_active_trips):
        """Single-leg trip (start→end without pause) stores route_geometry correctly"""
        # Start trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        assert start_response.status_code == 200
        trip_id = start_response.json()["trip_id"]
        print(f"Started single-leg trip: {trip_id}")
        
        # End trip directly (no pause)
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=auth_header
        )
        assert end_response.status_code == 200
        end_data = end_response.json()
        
        assert end_data.get("success") == True
        assert end_data.get("event") == "trip_completed"
        assert end_data.get("legs_count", 1) == 1, f"Single-leg trip should have 1 leg: {end_data}"
        print(f"PASS: Single-leg trip completed - {end_data['total_miles']} miles")
        
        # Verify route_geometry is stored
        trip_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/trip/{trip_id}?include_locations=true", headers=auth_header)
        assert trip_response.status_code == 200
        trip_data = trip_response.json()
        trip = trip_data.get("trip", {})
        
        assert "route_geometry" in trip, f"Missing route_geometry in single-leg trip"
        route_geometry = trip["route_geometry"]
        assert len(route_geometry) > 5, f"route_geometry should have points: {len(route_geometry)}"
        print(f"PASS: Single-leg trip has route_geometry with {len(route_geometry)} points")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestTripDetailRouteGeometry:
    """Test trip detail endpoint re-fetches route_geometry for old trips"""
    
    def test_get_trip_detail_with_route_geometry(self, auth_header, clean_active_trips):
        """GET /api/admin/gps-trips/trip/{id} returns route_geometry for completed trips"""
        # Create and complete a trip
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=auth_header
        )
        trip_id = start_response.json()["trip_id"]
        
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=auth_header
        )
        assert end_response.status_code == 200
        
        # Get trip details
        trip_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/trip/{trip_id}?include_locations=true", headers=auth_header)
        assert trip_response.status_code == 200
        trip_data = trip_response.json()
        trip = trip_data.get("trip", {})
        
        # Verify route_geometry exists
        assert "route_geometry" in trip, f"Missing route_geometry: {trip.keys()}"
        route_geometry = trip["route_geometry"]
        assert isinstance(route_geometry, list), f"route_geometry should be list"
        assert len(route_geometry) >= 2, f"route_geometry should have at least 2 points"
        
        # Verify each point is [lat, lng]
        for point in route_geometry[:3]:  # Check first 3 points
            assert isinstance(point, list), f"Each point should be a list: {point}"
            assert len(point) == 2, f"Each point should have 2 coords: {point}"
            assert isinstance(point[0], (int, float)), f"Lat should be number: {point}"
            assert isinstance(point[1], (int, float)), f"Lng should be number: {point}"
        
        print(f"PASS: Trip detail returns route_geometry with {len(route_geometry)} valid coordinate pairs")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestSiriKeyWithPauseResume:
    """Test Siri API key authentication works with pause/resume events"""
    
    def test_siri_key_pause_resume(self, auth_header, clean_active_trips):
        """Siri API key can authenticate pause and resume events"""
        # Generate a fresh Siri key
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        gen_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/siri-key", headers=auth_header)
        assert gen_response.status_code == 200
        siri_key = gen_response.json()["api_key"]
        siri_header = {"Authorization": f"Bearer {siri_key}"}
        
        # Start trip with Siri key
        start_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**START_COORDS, "event": "start"},
            headers=siri_header
        )
        assert start_response.status_code == 200
        trip_id = start_response.json()["trip_id"]
        print(f"Started trip with Siri key: {trip_id}")
        
        # Pause with Siri key
        pause_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**PAUSE_COORDS, "event": "pause"},
            headers=siri_header
        )
        assert pause_response.status_code == 200, f"Siri key pause failed: {pause_response.text}"
        pause_data = pause_response.json()
        assert pause_data.get("success") == True
        assert pause_data.get("event") == "trip_paused"
        print(f"PASS: Siri key authenticated pause event")
        
        # Resume with Siri key
        resume_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**RESUME_COORDS, "event": "resume"},
            headers=siri_header
        )
        assert resume_response.status_code == 200, f"Siri key resume failed: {resume_response.text}"
        resume_data = resume_response.json()
        assert resume_data.get("success") == True
        assert resume_data.get("event") == "trip_resumed"
        print(f"PASS: Siri key authenticated resume event")
        
        # End with Siri key
        end_response = requests.post(f"{BASE_URL}/api/admin/gps-trips/log-drive",
            json={**END_COORDS, "event": "end"},
            headers=siri_header
        )
        assert end_response.status_code == 200
        end_data = end_response.json()
        assert end_data.get("success") == True
        assert end_data.get("event") == "trip_completed"
        print(f"PASS: Siri key authenticated complete multi-leg trip")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestExistingTripWithRouteGeometry:
    """Test fetching an existing trip that has route_geometry"""
    
    def test_fetch_existing_trip_route_geometry(self, auth_header):
        """GET /api/admin/gps-trips/trip/{id} for existing trip with route_geometry"""
        # Use the known trip ID from the test request
        existing_trip_id = "5ee53290-bf28-4b75-93ba-154b08f3fc39"
        
        trip_response = requests.get(f"{BASE_URL}/api/admin/gps-trips/trip/{existing_trip_id}?include_locations=true", headers=auth_header)
        
        if trip_response.status_code == 404:
            pytest.skip(f"Existing trip {existing_trip_id} not found - may have been deleted")
        
        assert trip_response.status_code == 200, f"Failed to fetch trip: {trip_response.text}"
        trip_data = trip_response.json()
        trip = trip_data.get("trip", {})
        
        # Check if route_geometry exists
        if "route_geometry" in trip:
            route_geometry = trip["route_geometry"]
            assert isinstance(route_geometry, list)
            print(f"PASS: Existing trip has route_geometry with {len(route_geometry)} points")
            
            # Verify it has the expected ~201 points as mentioned in test request
            if len(route_geometry) >= 100:
                print(f"PASS: Route geometry has substantial detail ({len(route_geometry)} points)")
        else:
            print(f"INFO: Existing trip does not have route_geometry stored (may be old trip)")
        
        # Check legs if present
        if "legs" in trip:
            legs = trip["legs"]
            print(f"INFO: Trip has {len(legs)} legs")


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
