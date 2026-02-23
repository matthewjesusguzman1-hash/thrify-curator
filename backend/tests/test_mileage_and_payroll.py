"""
Test module for Mileage Tracking and Payroll Summary features
Tests backend APIs for:
- Mileage CRUD operations
- Payroll summary with current pay period
- Payroll settings with pay period start date
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-1.preview.emergentagent.com').rstrip('/')


class TestPayrollSummary:
    """Payroll Summary API tests - Current Pay Period display feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_payroll_summary(self):
        """Test payroll summary endpoint returns current pay period data"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify current period structure
        assert "current_period" in data
        assert "amount" in data["current_period"]
        assert "hours" in data["current_period"]
        assert "start" in data["current_period"]
        assert "end" in data["current_period"]
        
        # Verify other summary fields
        assert "month_total" in data
        assert "year_total" in data
        
        print(f"Current Pay Period: {data['current_period']['start']} - {data['current_period']['end']}")
        print(f"Hours tracked: {data['current_period']['hours']}")
    
    def test_get_payroll_settings(self):
        """Test payroll settings endpoint returns pay period start date"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/settings", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify settings structure
        assert "pay_period_start_date" in data
        assert "default_hourly_rate" in data
        
        print(f"Pay Period Start Date: {data['pay_period_start_date']}")
        print(f"Default Hourly Rate: {data['default_hourly_rate']}")
    
    def test_update_payroll_settings(self):
        """Test updating payroll settings with new start date"""
        # First get current settings
        response = requests.get(f"{BASE_URL}/api/admin/payroll/settings", headers=self.headers)
        original_settings = response.json()
        
        # Update settings
        update_payload = {
            "id": "payroll_settings",
            "pay_period_start_date": "2026-01-21",
            "default_hourly_rate": 20.00
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/payroll/settings",
            json=update_payload,
            headers=self.headers
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated["pay_period_start_date"] == "2026-01-21"
        
        print("Payroll settings updated successfully")


class TestMileageTracking:
    """Mileage Tracking API tests - GPS and Manual Entry features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_mileage_entries(self):
        """Test getting mileage entries list"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} mileage entries")
        
        # Check existing entry structure if any
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "date" in entry
            assert "start_address" in entry
            assert "end_address" in entry
            assert "total_miles" in entry
            assert "purpose" in entry
            print(f"Sample entry: {entry['start_address']} -> {entry['end_address']}, {entry['total_miles']} miles, purpose: {entry['purpose']}")
    
    def test_get_mileage_summary(self):
        """Test mileage summary endpoint returns IRS rate calculations"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "total_miles" in data
        assert "total_trips" in data
        assert "by_purpose" in data
        assert "monthly_totals" in data
        
        print(f"Total Miles: {data['total_miles']}")
        print(f"Total Trips: {data['total_trips']}")
        print(f"By Purpose: {data['by_purpose']}")
    
    def test_create_mileage_entry_thrifting(self):
        """Test creating mileage entry with Thrifting purpose"""
        test_entry = {
            "date": "2026-02-23",
            "start_address": "TEST_Office",
            "end_address": "TEST_Thrift Store",
            "total_miles": 15.5,
            "purpose": "thrifting",
            "notes": "Test entry for thrifting"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries",
            json=test_entry,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_miles"] == 15.5
        assert data["purpose"] == "thrifting"
        assert data["start_address"] == "TEST_Office"
        assert data["end_address"] == "TEST_Thrift Store"
        
        # Store ID for cleanup
        self.test_entry_id = data["id"]
        print(f"Created mileage entry with purpose 'thrifting': {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{data['id']}", headers=self.headers)
    
    def test_create_mileage_entry_post_office(self):
        """Test creating mileage entry with Post Office purpose"""
        test_entry = {
            "date": "2026-02-23",
            "start_address": "TEST_Home",
            "end_address": "TEST_Post Office",
            "total_miles": 5.2,
            "purpose": "post_office",
            "notes": "Test entry for post office"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries",
            json=test_entry,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_miles"] == 5.2
        assert data["purpose"] == "post_office"
        print(f"Created mileage entry with purpose 'post_office': {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{data['id']}", headers=self.headers)
    
    def test_create_mileage_entry_other_purpose(self):
        """Test creating mileage entry with Other purpose (manual entry)"""
        test_entry = {
            "date": "2026-02-23",
            "start_address": "TEST_Warehouse",
            "end_address": "TEST_Client Meeting",
            "total_miles": 22.3,
            "purpose": "other",
            "purpose_other": "Client Visit",
            "notes": "Test entry for other purpose"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries",
            json=test_entry,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_miles"] == 22.3
        assert data["purpose"] == "other"
        assert data["purpose_other"] == "Client Visit"
        print(f"Created mileage entry with purpose 'other': {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{data['id']}", headers=self.headers)
    
    def test_update_mileage_entry(self):
        """Test updating an existing mileage entry"""
        # Create entry first
        test_entry = {
            "date": "2026-02-23",
            "start_address": "TEST_Update_Start",
            "end_address": "TEST_Update_End",
            "total_miles": 10.0,
            "purpose": "thrifting"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries",
            json=test_entry,
            headers=self.headers
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Update entry
        update_payload = {
            "total_miles": 12.5,
            "end_address": "TEST_Update_New_End",
            "notes": "Updated notes"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/mileage/entries/{entry_id}",
            json=update_payload,
            headers=self.headers
        )
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["total_miles"] == 12.5
        assert updated["end_address"] == "TEST_Update_New_End"
        print(f"Updated mileage entry: {entry_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", headers=self.headers)
    
    def test_delete_mileage_entry(self):
        """Test deleting a mileage entry"""
        # Create entry first
        test_entry = {
            "date": "2026-02-23",
            "start_address": "TEST_Delete_Start",
            "end_address": "TEST_Delete_End",
            "total_miles": 5.0,
            "purpose": "post_office"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries",
            json=test_entry,
            headers=self.headers
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Delete entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/mileage/entries/{entry_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        print(f"Deleted mileage entry: {entry_id}")
        
        # Verify deletion - should not appear in list
        get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=self.headers)
        entries = get_response.json()
        assert not any(e["id"] == entry_id for e in entries), "Entry should be deleted"
    
    def test_get_active_trip(self):
        """Test getting active trip status"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/active-trip", headers=self.headers)
        
        assert response.status_code == 200
        # Response can be null if no active trip
        print(f"Active trip: {response.json()}")
    
    def test_start_trip_and_cancel(self):
        """Test starting and canceling a GPS trip"""
        start_payload = {
            "start_location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "timestamp": "2026-02-23T10:00:00Z"
            },
            "start_address": "TEST_GPS_Start"
        }
        
        # Start trip
        start_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/start-trip",
            json=start_payload,
            headers=self.headers
        )
        
        assert start_response.status_code == 200
        trip = start_response.json()
        assert trip["start_address"] == "TEST_GPS_Start"
        print(f"Started trip: {trip['id']}")
        
        # Verify active trip exists
        active_response = requests.get(f"{BASE_URL}/api/admin/mileage/active-trip", headers=self.headers)
        assert active_response.status_code == 200
        assert active_response.json() is not None
        
        # Cancel trip
        cancel_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/cancel-trip",
            headers=self.headers
        )
        
        assert cancel_response.status_code == 200
        print("Trip cancelled successfully")
        
        # Verify no active trip
        final_response = requests.get(f"{BASE_URL}/api/admin/mileage/active-trip", headers=self.headers)
        assert final_response.json() is None


class TestMileageUnauthorized:
    """Test mileage endpoints without authentication"""
    
    def test_mileage_entries_unauthorized(self):
        """Test mileage entries requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries")
        assert response.status_code in [401, 403]
    
    def test_mileage_summary_unauthorized(self):
        """Test mileage summary requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
