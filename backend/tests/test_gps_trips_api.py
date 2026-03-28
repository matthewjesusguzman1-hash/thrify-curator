"""
Backend tests for GPS Trips API
Tests the GPS mileage tracking endpoints including manual trip entry
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

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


class TestGPSTripsSummary:
    """Tests for GET /api/admin/gps-trips/summary endpoint"""

    def test_get_summary_returns_valid_structure(self, auth_headers):
        """Test that summary endpoint returns valid data structure"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/summary", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check required fields
        assert "year" in data
        assert "irs_rate" in data
        assert "total_miles" in data
        assert "total_trips" in data
        assert "tax_deduction" in data
        assert "today" in data
        assert "this_month" in data
        
    def test_summary_today_structure(self, auth_headers):
        """Test that today's summary has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        today = data.get("today", {})
        assert "trips" in today
        assert "miles" in today
        assert "deduction" in today
        
    def test_summary_this_month_structure(self, auth_headers):
        """Test that this month's summary has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        this_month = data.get("this_month", {})
        assert "trips" in this_month
        assert "miles" in this_month
        assert "deduction" in this_month
        assert "name" in this_month  # Month name like "March"


class TestGPSTripsHistory:
    """Tests for GET /api/admin/gps-trips/history endpoint"""

    def test_get_history_returns_array(self, auth_headers):
        """Test that history endpoint returns valid array"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/history", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "trips" in data
        assert isinstance(data["trips"], list)
        
    def test_history_trip_structure(self, auth_headers):
        """Test that trip entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/history", headers=auth_headers)
        assert response.status_code == 200
        
        trips = response.json().get("trips", [])
        if len(trips) > 0:
            trip = trips[0]
            required_fields = ["id", "user_id", "status", "start_time", "total_miles"]
            for field in required_fields:
                assert field in trip, f"Missing required field: {field}"


class TestManualTripEntry:
    """Tests for POST /api/admin/gps-trips/manual endpoint"""

    def test_create_manual_trip_success(self, auth_headers):
        """Test creating a manual trip entry"""
        test_id = str(uuid.uuid4())[:8]
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 15.5,
            "purpose": "post_office",
            "notes": f"TEST_{test_id}_Manual trip entry"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "trip_id" in data
        assert data["total_miles"] == 15.5
        assert "tax_deduction" in data
        
        # Cleanup - delete the test trip
        trip_id = data["trip_id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200

    def test_create_manual_trip_validates_miles(self, auth_headers):
        """Test that manual trip validates miles > 0"""
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 0,  # Invalid - must be > 0
            "purpose": "sourcing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        
    def test_create_manual_trip_validates_max_miles(self, auth_headers):
        """Test that manual trip validates miles <= 1000"""
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 1500,  # Invalid - too high
            "purpose": "sourcing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_create_manual_trip_persists(self, auth_headers):
        """Test that manual trip persists and appears in history"""
        test_id = str(uuid.uuid4())[:8]
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 8.2,
            "purpose": "sourcing",
            "notes": f"TEST_{test_id}_Persistence check"
        }
        
        # Create trip
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        trip_id = create_response.json()["trip_id"]
        
        # Verify in history
        history_response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/history",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        
        trips = history_response.json().get("trips", [])
        found = next((t for t in trips if t["id"] == trip_id), None)
        assert found is not None, "Created trip not found in history"
        assert found["total_miles"] == 8.2
        assert found["purpose"] == "sourcing"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_headers)


class TestTripUpdate:
    """Tests for PUT /api/admin/gps-trips/{trip_id} endpoint"""

    def test_update_trip_miles(self, auth_headers):
        """Test updating trip miles"""
        test_id = str(uuid.uuid4())[:8]
        
        # Create a trip first
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 10.0,
            "purpose": "post_office",
            "notes": f"TEST_{test_id}_Update test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        trip_id = create_response.json()["trip_id"]
        
        # Update the trip
        update_data = {
            "total_miles": 25.5,
            "purpose": "sourcing"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["success"] == True
        
        # Verify update persisted
        history_response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/history",
            headers=auth_headers
        )
        trips = history_response.json().get("trips", [])
        found = next((t for t in trips if t["id"] == trip_id), None)
        assert found is not None
        assert found["total_miles"] == 25.5
        assert found["purpose"] == "sourcing"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_headers)


class TestTripDelete:
    """Tests for DELETE /api/admin/gps-trips/{trip_id} endpoint"""

    def test_delete_trip(self, auth_headers):
        """Test deleting a trip"""
        test_id = str(uuid.uuid4())[:8]
        
        # Create a trip first
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 5.0,
            "purpose": "other",
            "notes": f"TEST_{test_id}_Delete test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        trip_id = create_response.json()["trip_id"]
        
        # Delete the trip
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify deletion
        history_response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/history",
            headers=auth_headers
        )
        trips = history_response.json().get("trips", [])
        found = next((t for t in trips if t["id"] == trip_id), None)
        assert found is None, "Trip should be deleted"


class TestActiveTrip:
    """Tests for active trip endpoints"""

    def test_get_active_trip_when_none(self, auth_headers):
        """Test getting active trip when none exists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/active",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # active_trip can be null if no active trip
        assert "active_trip" in data


class TestAuthRequired:
    """Tests that endpoints require authentication"""

    def test_summary_without_auth_fails(self):
        """Test that summary requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/summary")
        assert response.status_code in [401, 403, 422]

    def test_history_without_auth_fails(self):
        """Test that history requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/gps-trips/history")
        assert response.status_code in [401, 403, 422]

    def test_manual_trip_without_auth_fails(self):
        """Test that manual trip creation requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json={"date": "2026-03-28", "total_miles": 10, "purpose": "other"}
        )
        assert response.status_code in [401, 403, 422]
