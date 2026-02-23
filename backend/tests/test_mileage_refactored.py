"""
Backend API tests for Mileage Tracking functionality after MileageTrackingSection refactoring.
Tests all mileage CRUD operations, exports, and trip tracking.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"


class TestMileageTracking:
    """Mileage tracking endpoint tests after component refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL})
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_mileage_entries(self):
        """Test fetching all mileage entries"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify entry structure if there are entries
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "date" in entry
            assert "start_address" in entry
            assert "end_address" in entry
            assert "total_miles" in entry
            assert "purpose" in entry
    
    def test_get_mileage_summary(self):
        """Test fetching mileage summary for tax purposes"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_miles" in data
        assert "total_trips" in data
        assert "by_purpose" in data
        assert "monthly_totals" in data
        # Verify numeric types
        assert isinstance(data["total_miles"], (int, float))
        assert isinstance(data["total_trips"], int)
    
    def test_get_active_trip(self):
        """Test checking for active trip"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/active-trip", headers=self.headers)
        assert response.status_code == 200
        # Response is either null or an active trip object
    
    def test_create_mileage_entry_thrifting(self):
        """Test creating a mileage entry for thrifting purpose"""
        payload = {
            "date": "2026-02-23",
            "start_address": "TEST_Home_Location",
            "end_address": "TEST_Thrift_Store",
            "total_miles": 15.5,
            "purpose": "thrifting",
            "notes": "Test entry for verification"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries", 
            json=payload, 
            headers=self.headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["start_address"] == payload["start_address"]
        assert data["end_address"] == payload["end_address"]
        assert data["total_miles"] == payload["total_miles"]
        assert data["purpose"] == payload["purpose"]
        
        # Store ID for cleanup
        self.created_entry_id = data["id"]
        
        # Cleanup - delete the test entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/mileage/entries/{self.created_entry_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
    
    def test_create_mileage_entry_post_office(self):
        """Test creating a mileage entry for post office purpose"""
        payload = {
            "date": "2026-02-23",
            "start_address": "TEST_Home",
            "end_address": "TEST_Post_Office",
            "total_miles": 5.0,
            "purpose": "post_office",
            "notes": ""
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries", 
            json=payload, 
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["purpose"] == "post_office"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{data['id']}", headers=self.headers)
    
    def test_create_mileage_entry_other_purpose(self):
        """Test creating a mileage entry with 'other' purpose"""
        payload = {
            "date": "2026-02-23",
            "start_address": "TEST_Start",
            "end_address": "TEST_End",
            "total_miles": 20.0,
            "purpose": "other",
            "purpose_other": "Client meeting",
            "notes": "Business meeting"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries", 
            json=payload, 
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["purpose"] == "other"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{data['id']}", headers=self.headers)
    
    def test_update_mileage_entry(self):
        """Test updating an existing mileage entry"""
        # First create an entry
        create_payload = {
            "date": "2026-02-23",
            "start_address": "TEST_Original_Start",
            "end_address": "TEST_Original_End",
            "total_miles": 10.0,
            "purpose": "thrifting"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries", 
            json=create_payload, 
            headers=self.headers
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Update the entry
        update_payload = {
            "start_address": "TEST_Updated_Start",
            "total_miles": 12.5
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/mileage/entries/{entry_id}",
            json=update_payload,
            headers=self.headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["start_address"] == "TEST_Updated_Start"
        assert data["total_miles"] == 12.5
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", headers=self.headers)
    
    def test_delete_mileage_entry(self):
        """Test deleting a mileage entry"""
        # Create entry to delete
        payload = {
            "date": "2026-02-23",
            "start_address": "TEST_Delete_Start",
            "end_address": "TEST_Delete_End",
            "total_miles": 5.0,
            "purpose": "thrifting"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/mileage/entries", 
            json=payload, 
            headers=self.headers
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Delete the entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/mileage/entries/{entry_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion - should return empty list or entry not found when fetching
        get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=self.headers)
        entries = get_response.json()
        entry_ids = [e["id"] for e in entries]
        assert entry_id not in entry_ids
    
    def test_export_csv(self):
        """Test CSV export of mileage entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/export/csv?year=2026",
            headers=self.headers
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        # Verify CSV content has expected headers
        content = response.text
        assert "Date" in content
        assert "Start Location" in content
        assert "End Location" in content
        assert "Miles" in content
        assert "Deduction Amount" in content
    
    def test_export_pdf(self):
        """Test PDF export of mileage entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/export/pdf?year=2026",
            headers=self.headers
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        # Verify it's a valid PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF'
    
    def test_mileage_entries_unauthorized(self):
        """Test that mileage endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries")
        assert response.status_code in [401, 403]
    
    def test_mileage_summary_unauthorized(self):
        """Test that mileage summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary")
        assert response.status_code in [401, 403]


class TestAdminDashboardSections:
    """Tests to verify all admin dashboard sections work after refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL})
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_employees(self):
        """Test employee listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_admin_summary(self):
        """Test admin summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "total_hours" in data
        assert "total_shifts" in data
    
    def test_get_time_entries(self):
        """Test time entries endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_payroll_summary(self):
        """Test payroll summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "current_period" in data
        assert "month_total" in data
        assert "year_total" in data
    
    def test_get_notifications(self):
        """Test notifications endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
