"""
GPS Trips API Integration Tests
Tests the GPS mileage tracking endpoints against the live API
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com')
TEST_USER_EMAIL = "matthewjesusguzman1@gmail.com"
TEST_ACCESS_CODE = "4399"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "admin_code": TEST_ACCESS_CODE
        }
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def auth_header(auth_token):
    """Get authentication header"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestGPSTripsAPIIntegration:
    """Integration tests for GPS Trips API"""
    
    def test_get_trip_summary(self, auth_header):
        """Test fetching trip summary (today, month, year)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/summary",
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "total_trips" in data
        assert "total_miles" in data
        assert "irs_rate" in data
        assert "today" in data
        assert "this_month" in data
        assert "year" in data
        assert "by_purpose" in data
        assert "by_user" in data
        assert "monthly" in data
        assert "daily" in data
        
        # Verify IRS rate for 2026
        assert data["irs_rate"] == 0.725
        
    def test_get_trip_history(self, auth_header):
        """Test fetching trip history"""
        response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/history?limit=10",
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "trips" in data
        assert isinstance(data["trips"], list)
        
    def test_get_active_trip(self, auth_header):
        """Test fetching active trip"""
        response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/active",
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have active_trip key (can be null)
        assert "active_trip" in data
        
    def test_manual_trip_entry_and_delete(self, auth_header):
        """Test creating and deleting a manual trip entry"""
        # Create manual trip
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 15.5,
            "purpose": "sourcing",
            "notes": f"TEST_trip_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "trip_id" in data
        assert data.get("total_miles") == 15.5
        
        # IRS rate is $0.725/mile for 2026
        expected_deduction = round(15.5 * 0.725, 2)
        assert abs(data.get("tax_deduction", 0) - expected_deduction) < 0.01
        
        trip_id = data["trip_id"]
        
        # Verify trip appears in history
        history_response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/history?limit=5",
            headers=auth_header
        )
        assert history_response.status_code == 200
        trips = history_response.json().get("trips", [])
        trip_ids = [t["id"] for t in trips]
        assert trip_id in trip_ids
        
        # Delete the test trip
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}",
            headers=auth_header
        )
        
        assert delete_response.status_code == 200
        assert delete_response.json().get("success") == True
        
    def test_manual_trip_validation(self, auth_header):
        """Test validation for manual trip entry"""
        # Test with invalid miles (0)
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json={
                "date": datetime.now().strftime("%Y-%m-%d"),
                "total_miles": 0,
                "purpose": "sourcing"
            },
            headers=auth_header
        )
        
        assert response.status_code == 400
        
        # Test with miles too high
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json={
                "date": datetime.now().strftime("%Y-%m-%d"),
                "total_miles": 1500,
                "purpose": "sourcing"
            },
            headers=auth_header
        )
        
        assert response.status_code == 400
        
    def test_mileage_adjustment(self, auth_header):
        """Test mileage adjustment endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/adjust",
            json={
                "period": "day",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "adjustment_miles": 5.0,
                "reason": "TEST_adjustment"
            },
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "adjustment_id" in data
        assert data.get("adjustment_miles") == 5.0
        
        # Clean up - delete the adjustment
        adjustment_id = data["adjustment_id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gps-trips/{adjustment_id}",
            headers=auth_header
        )
        assert delete_response.status_code == 200
        
    def test_adjustment_validation(self, auth_header):
        """Test validation for mileage adjustments"""
        # Test with adjustment too large
        response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/adjust",
            json={
                "period": "day",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "adjustment_miles": 150.0,  # Max is 100
                "reason": "TEST_too_large"
            },
            headers=auth_header
        )
        
        assert response.status_code == 400
        
    def test_trip_update(self, auth_header):
        """Test updating a trip"""
        # First create a trip
        trip_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_miles": 10.0,
            "purpose": "sourcing",
            "notes": f"TEST_update_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gps-trips/manual",
            json=trip_data,
            headers=auth_header
        )
        
        assert create_response.status_code == 200
        trip_id = create_response.json()["trip_id"]
        
        # Update the trip
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}",
            json={
                "total_miles": 20.0,
                "purpose": "post_office",
                "notes": "Updated notes"
            },
            headers=auth_header
        )
        
        assert update_response.status_code == 200
        assert update_response.json().get("success") == True
        
        # Verify update via GET
        get_response = requests.get(
            f"{BASE_URL}/api/admin/gps-trips/trip/{trip_id}",
            headers=auth_header
        )
        
        assert get_response.status_code == 200
        trip = get_response.json().get("trip", {})
        assert trip.get("total_miles") == 20.0
        assert trip.get("purpose") == "post_office"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", headers=auth_header)


class TestGPSDistanceCalculation:
    """Test distance calculation logic"""
    
    def test_haversine_formula(self):
        """Test the Haversine distance calculation"""
        import math
        
        def haversine_distance(lat1, lon1, lat2, lon2):
            R = 3959  # Earth's radius in miles
            lat1_rad = math.radians(lat1)
            lat2_rad = math.radians(lat2)
            delta_lat = math.radians(lat2 - lat1)
            delta_lon = math.radians(lon2 - lon1)
            
            a = math.sin(delta_lat / 2) ** 2 + \
                math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            return R * c
        
        # Test: Atlanta to Marietta (approximately 15 miles)
        distance = haversine_distance(33.7490, -84.3880, 33.9526, -84.5499)
        assert 10 < distance < 20, f"Expected ~15 miles, got {distance}"
        
        # Test: Same point should be 0
        distance_same = haversine_distance(33.7490, -84.3880, 33.7490, -84.3880)
        assert distance_same < 0.001, f"Same point should be 0, got {distance_same}"
        
    def test_distance_filter_thresholds(self):
        """Test distance filter thresholds for GPS noise"""
        MIN_THRESHOLD = 0.001  # 5 feet
        MAX_THRESHOLD = 5.0    # 5 miles
        
        test_cases = [
            (0.0005, False, "Too small - GPS noise"),
            (0.001, True, "Minimum valid distance"),
            (0.5, True, "Normal driving distance"),
            (2.0, True, "Longer segment"),
            (4.9, True, "Just under max"),
            (5.0, False, "At max - GPS jump"),
            (10.0, False, "Way too large - GPS error"),
        ]
        
        for distance, should_include, description in test_cases:
            is_valid = MIN_THRESHOLD <= distance < MAX_THRESHOLD
            assert is_valid == should_include, f"Failed: {description} - {distance} miles"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login_with_code(self):
        """Test admin login with access code"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "admin_code": TEST_ACCESS_CODE
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == TEST_USER_EMAIL
        
    def test_admin_login_without_code_fails(self):
        """Test admin login without code fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL
            }
        )
        
        assert response.status_code == 401
        
    def test_admin_login_wrong_code_fails(self):
        """Test admin login with wrong code fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "admin_code": "0000"
            }
        )
        
        assert response.status_code == 401
        
    def test_check_employee_password(self):
        """Test checking if employee has password"""
        response = requests.get(
            f"{BASE_URL}/api/auth/employee/has-password/{TEST_USER_EMAIL}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "has_password" in data
        assert "exists" in data
        assert data["is_admin"] == True  # This is an admin account
