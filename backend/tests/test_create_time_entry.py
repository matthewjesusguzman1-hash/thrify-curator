"""
Backend API Tests for Admin Create Time Entry Feature
Tests: POST /api/admin/time-entries
- Create manual time entry with employee, clock_in, clock_out
- Create active shift (no clock_out)
- Auto-calculation of total_hours
- Validation: clock_out must be after clock_in
- Validation: employee must exist
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

# Try multiple sources for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '') or os.environ.get('BASE_URL', '') or 'https://thrifty-curator-1.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')
TEST_ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"


class TestCreateManualTimeEntry:
    """Admin can create manual time entries for employees"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_employee(self, admin_token):
        """Create a test employee for time entry tests"""
        emp_email = f"create_entry_test_{uuid.uuid4().hex[:8]}@test.com"
        emp_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Create Entry Test Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert emp_resp.status_code == 200
        emp_data = emp_resp.json()
        return {"id": emp_data["id"], "name": emp_data["name"], "email": emp_email}
    
    def test_create_completed_time_entry(self, admin_token, test_employee):
        """Admin can create a completed time entry with clock_in and clock_out"""
        # Create 8-hour shift
        clock_in = (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat()
        clock_out = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in,
                "clock_out": clock_out
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create time entry: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["user_id"] == test_employee["id"]
        assert data["user_name"] == test_employee["name"]
        assert data["clock_in"] == clock_in
        assert data["clock_out"] == clock_out
        
        # Verify total_hours auto-calculated (~8 hours)
        assert data["total_hours"] is not None
        assert abs(data["total_hours"] - 8.0) < 0.1, f"Expected ~8 hours, got {data['total_hours']}"
        
        print(f"Created completed time entry: {data['id']}, hours: {data['total_hours']}")
        
        # Verify persistence via GET
        get_resp = requests.get(f"{BASE_URL}/api/admin/time-entries/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["user_id"] == test_employee["id"]
        print("Verified time entry persisted in database")
    
    def test_create_active_shift_no_clock_out(self, admin_token, test_employee):
        """Admin can create an active shift (no clock_out) for an employee"""
        clock_in = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in
                # No clock_out - this creates an active shift
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create active shift: {response.text}"
        data = response.json()
        
        # Verify response
        assert "id" in data
        assert data["user_id"] == test_employee["id"]
        assert data["clock_in"] == clock_in
        assert data["clock_out"] is None  # Active shift has no clock_out
        assert data["total_hours"] is None  # No total hours for active shift
        
        print(f"Created active shift: {data['id']}, clock_out: {data['clock_out']}")
    
    def test_create_entry_total_hours_auto_calculated(self, admin_token, test_employee):
        """Total hours are automatically calculated from clock_in and clock_out"""
        # Create 3.5 hour shift
        clock_in = (datetime.now(timezone.utc) - timedelta(hours=3, minutes=30)).isoformat()
        clock_out = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in,
                "clock_out": clock_out
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify hours calculated correctly (~3.5 hours)
        assert data["total_hours"] is not None
        assert abs(data["total_hours"] - 3.5) < 0.1, f"Expected ~3.5 hours, got {data['total_hours']}"
        print(f"Total hours auto-calculated: {data['total_hours']} (expected ~3.5)")
    
    def test_create_entry_clock_out_before_clock_in_fails(self, admin_token, test_employee):
        """Validation: clock_out must be after clock_in (negative hours rejected)"""
        now = datetime.now(timezone.utc)
        clock_in = now.isoformat()
        clock_out = (now - timedelta(hours=2)).isoformat()  # 2 hours BEFORE clock_in
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in,
                "clock_out": clock_out
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Should reject clock_out before clock_in: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"Correctly rejected invalid times: {data['detail']}")
    
    def test_create_entry_nonexistent_employee_fails(self, admin_token):
        """Validation: employee_id must exist"""
        fake_employee_id = str(uuid.uuid4())
        clock_in = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": fake_employee_id,
                "clock_in": clock_in
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404, f"Should reject nonexistent employee: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print(f"Correctly rejected nonexistent employee: {data['detail']}")
    
    def test_create_entry_invalid_clock_in_format_fails(self, admin_token, test_employee):
        """Validation: clock_in must be valid ISO format"""
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": "invalid-date-format"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Should reject invalid date format: {response.text}"
        print(f"Correctly rejected invalid clock_in format")
    
    def test_create_entry_invalid_clock_out_format_fails(self, admin_token, test_employee):
        """Validation: clock_out must be valid ISO format if provided"""
        clock_in = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in,
                "clock_out": "invalid-date-format"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Should reject invalid clock_out format: {response.text}"
        print(f"Correctly rejected invalid clock_out format")
    
    def test_create_entry_with_specific_employee_id(self, admin_token):
        """Test using the specific employee ID from the request (e7a603d5-e342-4608-aca1-aa6639d00126)"""
        test_emp_id = "e7a603d5-e342-4608-aca1-aa6639d00126"
        
        # First check if employee exists
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        employees = employees_resp.json()
        employee_exists = any(e["id"] == test_emp_id for e in employees)
        
        if not employee_exists:
            pytest.skip(f"Test employee {test_emp_id} not found in database")
        
        clock_in = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
        clock_out = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_emp_id,
                "clock_in": clock_in,
                "clock_out": clock_out
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create entry for specific employee: {response.text}"
        data = response.json()
        assert data["user_id"] == test_emp_id
        print(f"Created entry for specific employee {test_emp_id}: {data['id']}")
    
    def test_entry_appears_in_all_time_entries_list(self, admin_token, test_employee):
        """Verify created entry appears in /api/admin/time-entries list"""
        # Create entry
        clock_in = datetime.now(timezone.utc).isoformat()
        
        create_resp = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": test_employee["id"],
                "clock_in": clock_in
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_resp.status_code == 200
        entry_id = create_resp.json()["id"]
        
        # Get all time entries
        list_resp = requests.get(f"{BASE_URL}/api/admin/time-entries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert list_resp.status_code == 200
        entries = list_resp.json()
        
        # Verify our entry is in the list
        entry_found = any(e["id"] == entry_id for e in entries)
        assert entry_found, f"Created entry {entry_id} not found in time entries list"
        print(f"Entry {entry_id} found in /api/admin/time-entries list")


class TestEmployeeCannotCreateTimeEntry:
    """Employees should not be able to create time entries via admin endpoint"""
    
    @pytest.fixture
    def employee_token(self):
        """Create employee and get token"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        admin_token = admin_resp.json()["access_token"]
        
        emp_email = f"auth_create_test_{uuid.uuid4().hex[:8]}@test.com"
        emp_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Auth Create Test", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        emp_id = emp_resp.json()["id"]
        
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        return {"token": login_resp.json()["access_token"], "emp_id": emp_id}
    
    def test_employee_cannot_create_time_entry(self, employee_token):
        """Employee cannot access admin time entry creation endpoint"""
        clock_in = datetime.now(timezone.utc).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/admin/time-entries",
            json={
                "employee_id": employee_token["emp_id"],
                "clock_in": clock_in
            },
            headers={"Authorization": f"Bearer {employee_token['token']}"}
        )
        
        assert response.status_code == 403, f"Employee should be denied (403): {response.text}"
        print("Employee correctly denied access to create time entry")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
