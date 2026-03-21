"""
Tests for refactored admin endpoints.

This test suite validates that all admin endpoints continue to work correctly
after the admin.py refactoring into smaller modules:
- admin_employees.py: Employee CRUD operations
- admin_time_entries.py: Time entry management
- admin_w9.py: W-9 document management
- admin_reports.py: Report generation (shifts, mileage, W-9)
- admin_legacy.py: Legacy PDF endpoint
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://resale-portal-2.preview.emergentagent.com').rstrip('/')

# Admin credentials
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


class TestAdminEmployeesModule:
    """Tests for admin_employees.py endpoints"""

    def test_get_all_employees(self, auth_headers):
        """Test GET /admin/employees returns list of employees"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the admin user
        assert len(data) >= 1
        # Check employee structure
        if data:
            emp = data[0]
            assert "id" in emp
            assert "email" in emp
            assert "name" in emp
            assert "role" in emp

    def test_create_employee(self, auth_headers):
        """Test POST /admin/create-employee creates new employee"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=auth_headers,
            json={
                "email": unique_email,
                "name": "Test Employee",
                "phone": "555-1234"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email.lower()
        assert data["name"] == "Test Employee"
        assert data["role"] == "employee"
        
        # Store for cleanup
        employee_id = data["id"]
        
        # Clean up
        cleanup = requests.delete(
            f"{BASE_URL}/api/admin/employees/{employee_id}",
            headers=auth_headers
        )
        assert cleanup.status_code == 200

    def test_create_employee_duplicate_email_fails(self, auth_headers):
        """Test creating employee with existing email fails"""
        # First get existing employee
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        employees = response.json()
        if employees:
            existing_email = employees[0]["email"]
            # Try to create with same email
            response = requests.post(
                f"{BASE_URL}/api/admin/create-employee",
                headers=auth_headers,
                json={
                    "email": existing_email,
                    "name": "Duplicate Test"
                }
            )
            assert response.status_code == 400
            assert "already registered" in response.json()["detail"].lower()

    def test_update_employee(self, auth_headers):
        """Test PUT /admin/employees/{id} updates employee"""
        # Create test employee first
        unique_email = f"test_update_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=auth_headers,
            json={"email": unique_email, "name": "Original Name"}
        )
        assert create_response.status_code == 200
        employee_id = create_response.json()["id"]
        
        try:
            # Update the employee
            update_response = requests.put(
                f"{BASE_URL}/api/admin/employees/{employee_id}",
                headers=auth_headers,
                json={"name": "Updated Name"}
            )
            assert update_response.status_code == 200
            
            # Verify update
            get_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
            employees = get_response.json()
            updated = next((e for e in employees if e["id"] == employee_id), None)
            assert updated is not None
            assert updated["name"] == "Updated Name"
        finally:
            # Clean up
            requests.delete(f"{BASE_URL}/api/admin/employees/{employee_id}", headers=auth_headers)

    def test_delete_employee(self, auth_headers):
        """Test DELETE /admin/employees/{id} deletes employee"""
        # Create test employee
        unique_email = f"test_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=auth_headers,
            json={"email": unique_email, "name": "To Delete"}
        )
        employee_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/employees/{employee_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        employees = get_response.json()
        assert not any(e["id"] == employee_id for e in employees)


class TestAdminTimeEntriesModule:
    """Tests for admin_time_entries.py endpoints"""

    def test_get_all_time_entries(self, auth_headers):
        """Test GET /admin/time-entries returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_time_entry_structure(self, auth_headers):
        """Test time entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_headers)
        entries = response.json()
        if entries:
            entry = entries[0]
            assert "id" in entry
            assert "user_id" in entry
            assert "clock_in" in entry

    def test_admin_clock_in_out(self, auth_headers):
        """Test POST /admin/employee/{id}/clock for clock in/out"""
        # Get an employee
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        employees = [e for e in emp_response.json() if e["role"] == "employee"]
        
        if not employees:
            pytest.skip("No employees to test with")
        
        employee = employees[0]
        
        # First check if already clocked in and clock out if so
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employee/{employee['id']}/clock-status",
            headers=auth_headers
        )
        if status_response.status_code == 200 and status_response.json().get("clocked_in"):
            requests.post(
                f"{BASE_URL}/api/admin/employee/{employee['id']}/clock",
                headers=auth_headers,
                json={"action": "out"}
            )
        
        # Test clock in
        clock_in_response = requests.post(
            f"{BASE_URL}/api/admin/employee/{employee['id']}/clock",
            headers=auth_headers,
            json={"action": "in"}
        )
        assert clock_in_response.status_code == 200
        data = clock_in_response.json()
        assert "entry_id" in data
        entry_id = data["entry_id"]
        
        # Test clock out
        clock_out_response = requests.post(
            f"{BASE_URL}/api/admin/employee/{employee['id']}/clock",
            headers=auth_headers,
            json={"action": "out"}
        )
        assert clock_out_response.status_code == 200
        
        # Clean up
        if entry_id:
            requests.delete(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers=auth_headers)


class TestAdminW9Module:
    """Tests for admin_w9.py endpoints"""

    def test_get_w9_status(self, auth_headers):
        """Test GET /admin/employees/{id}/w9/status"""
        # Get an employee
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees to test with")
        
        employee = employees[0]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{employee['id']}/w9/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "has_w9" in data
        assert "status" in data

    def test_get_employee_w9s(self, auth_headers):
        """Test GET /admin/employees/{id}/w9 returns documents list"""
        # Get an employee
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees to test with")
        
        employee = employees[0]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{employee['id']}/w9",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "w9_documents" in data

    def test_get_pending_w9s(self, auth_headers):
        """Test GET /admin/w9/pending returns pending W9s"""
        response = requests.get(f"{BASE_URL}/api/admin/w9/pending", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAdminReportsModule:
    """Tests for admin_reports.py endpoints"""

    def test_shift_report(self, auth_headers):
        """Test GET /admin/reports/shifts returns report data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "summary" in data
        assert "total_entries" in data

    def test_shift_report_csv(self, auth_headers):
        """Test GET /admin/reports/shifts/csv returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/csv",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        # Check CSV content starts with expected header
        content = response.text
        assert "Employee Name" in content

    def test_shift_report_pdf(self, auth_headers):
        """Test GET /admin/reports/shifts/pdf returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/pdf",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF'

    def test_w9_report(self, auth_headers):
        """Test GET /admin/reports/w9 returns W9 report"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/w9", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "employees" in data
        assert "summary" in data

    def test_w9_report_csv(self, auth_headers):
        """Test GET /admin/reports/w9/csv returns CSV"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/w9/csv", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    def test_w9_report_pdf(self, auth_headers):
        """Test GET /admin/reports/w9/pdf returns PDF"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/w9/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")

    def test_mileage_report(self, auth_headers):
        """Test GET /admin/mileage/report returns report data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total_miles" in data
        assert "total_deduction" in data

    def test_mileage_report_csv(self, auth_headers):
        """Test GET /admin/mileage/report/csv returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/csv",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    def test_mileage_report_pdf(self, auth_headers):
        """Test GET /admin/mileage/report/pdf returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/pdf",
            headers=auth_headers,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")


class TestAdminLegacyModule:
    """Tests for admin_legacy.py endpoints"""

    def test_legacy_pdf_endpoint(self, auth_headers):
        """Test POST /admin/reports/pdf (legacy endpoint)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/reports/pdf",
            headers=auth_headers,
            json={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")


class TestAuthRequired:
    """Tests that admin endpoints require authentication"""

    def test_employees_without_auth_fails(self):
        """Test /admin/employees requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/employees")
        assert response.status_code in [401, 403, 422]

    def test_time_entries_without_auth_fails(self):
        """Test /admin/time-entries requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries")
        assert response.status_code in [401, 403, 422]

    def test_reports_without_auth_fails(self):
        """Test /admin/reports/shifts requires auth"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code in [401, 403, 422]
