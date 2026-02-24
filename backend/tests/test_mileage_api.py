"""
Backend tests for Mileage Tracking API
Tests the mileage entries CRUD and related endpoints
"""
import pytest
import requests
import os

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


class TestMileageEntriesEndpoint:
    """Tests for GET /api/admin/mileage/entries endpoint"""

    def test_get_mileage_entries_returns_array(self, auth_headers):
        """Test that mileage entries endpoint returns valid JSON array"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_mileage_entries_have_user_name_field(self, auth_headers):
        """Test that all mileage entries have user_name field (the fixed bug)"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert response.status_code == 200
        
        entries = response.json()
        for entry in entries:
            assert "user_name" in entry, f"Entry {entry.get('id')} missing user_name field"
            # user_name can be "Unknown" for old entries without this field
            assert entry["user_name"] is not None, f"Entry {entry.get('id')} has None user_name"

    def test_mileage_entry_structure(self, auth_headers):
        """Test that mileage entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert response.status_code == 200
        
        entries = response.json()
        if len(entries) > 0:
            entry = entries[0]
            required_fields = ["id", "user_id", "date", "total_miles", "purpose", "created_at"]
            for field in required_fields:
                assert field in entry, f"Missing required field: {field}"


class TestMileageSummary:
    """Tests for GET /api/admin/mileage/summary endpoint"""

    def test_get_mileage_summary(self, auth_headers):
        """Test that mileage summary endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_miles" in data
        assert "total_trips" in data
        assert isinstance(data["total_miles"], (int, float))
        assert isinstance(data["total_trips"], int)


class TestMileageEntryCRUD:
    """Tests for mileage entry CRUD operations"""

    def test_create_mileage_entry(self, auth_headers):
        """Test creating a new mileage entry"""
        new_entry = {
            "date": "2026-02-25",
            "start_address": "TEST_Start Location",
            "end_address": "TEST_End Location",
            "total_miles": 12.5,
            "purpose": "thrifting",
            "notes": "TEST_Entry for testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                json=new_entry, headers=auth_headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        
        created = response.json()
        assert created["start_address"] == new_entry["start_address"]
        assert created["total_miles"] == new_entry["total_miles"]
        assert "id" in created
        
        # Store ID for cleanup
        return created["id"]

    def test_create_and_verify_persistence(self, auth_headers):
        """Test creating entry and verifying it persists via GET"""
        # Create entry
        new_entry = {
            "date": "2026-02-25",
            "start_address": "TEST_Persistence Start",
            "end_address": "TEST_Persistence End",
            "total_miles": 8.3,
            "purpose": "post_office",
            "notes": "TEST_Persistence check"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                        json=new_entry, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        entry_id = create_response.json()["id"]
        
        # Verify via GET all entries
        get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        assert get_response.status_code == 200
        
        entries = get_response.json()
        found = next((e for e in entries if e["id"] == entry_id), None)
        assert found is not None, "Created entry not found in entries list"
        assert found["start_address"] == new_entry["start_address"]
        
        # Cleanup - delete test entry
        delete_response = requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code in [200, 204]

    def test_update_mileage_entry(self, auth_headers):
        """Test updating a mileage entry"""
        # First create an entry
        new_entry = {
            "date": "2026-02-25",
            "start_address": "TEST_Update Start",
            "end_address": "TEST_Update End",
            "total_miles": 10.0,
            "purpose": "thrifting"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                        json=new_entry, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        entry_id = create_response.json()["id"]
        
        # Update the entry
        update_data = {
            "total_miles": 15.5,
            "notes": "TEST_Updated notes"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", 
                                       json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated["total_miles"] == 15.5
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        entries = get_response.json()
        found = next((e for e in entries if e["id"] == entry_id), None)
        assert found["total_miles"] == 15.5
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", headers=auth_headers)

    def test_delete_mileage_entry(self, auth_headers):
        """Test deleting a mileage entry"""
        # First create an entry
        new_entry = {
            "date": "2026-02-25",
            "start_address": "TEST_Delete Start",
            "end_address": "TEST_Delete End",
            "total_miles": 5.0,
            "purpose": "other",
            "purpose_other": "Test deletion"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/mileage/entries", 
                                        json=new_entry, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        entry_id = create_response.json()["id"]
        
        # Delete the entry
        delete_response = requests.delete(f"{BASE_URL}/api/admin/mileage/entries/{entry_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code in [200, 204]
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers=auth_headers)
        entries = get_response.json()
        found = next((e for e in entries if e["id"] == entry_id), None)
        assert found is None, "Entry should be deleted"


class TestActiveTripEndpoints:
    """Tests for active trip related endpoints"""

    def test_get_active_trip(self, auth_headers):
        """Test getting active trip status"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/active-trip", headers=auth_headers)
        assert response.status_code == 200
        # Response can be null if no active trip


class TestAuthRequired:
    """Tests that endpoints require authentication"""

    def test_entries_without_auth_fails(self):
        """Test that mileage entries requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries")
        assert response.status_code in [401, 403]

    def test_summary_without_auth_fails(self):
        """Test that mileage summary requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary")
        assert response.status_code in [401, 403]
