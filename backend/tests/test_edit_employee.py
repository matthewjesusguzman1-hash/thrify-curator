"""
Test Edit Employee API endpoint - PUT /api/admin/employees/{employee_id}
Tests name, email, role updates for employee management.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shift-sync-8.preview.emergentagent.com')

class TestEditEmployee:
    """Tests for PUT /api/admin/employees/{employee_id}"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and test employee"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get employees and find a non-admin test employee
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert employees_resp.status_code == 200
        employees = employees_resp.json()
        
        # Find first non-admin employee for testing
        non_admin_employees = [e for e in employees if e.get('role') != 'admin']
        assert len(non_admin_employees) > 0, "No non-admin employees for testing"
        self.test_employee = non_admin_employees[0]
        self.employee_id = self.test_employee['id']
        
        # Store original values for revert
        self.original_name = self.test_employee['name']
        self.original_email = self.test_employee['email']
        self.original_role = self.test_employee.get('role', 'employee')
    
    @pytest.fixture(autouse=True)
    def teardown(self, request):
        """Revert employee to original state after each test"""
        yield
        # Revert changes
        requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={
                "name": self.original_name,
                "email": self.original_email,
                "role": self.original_role
            }
        )
    
    def test_update_employee_name(self):
        """Test updating employee name"""
        new_name = f"TEST_Updated_Name_{int(time.time())}"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={"name": new_name}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["name"] == new_name
        assert data["id"] == self.employee_id
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert get_resp.status_code == 200
        employees = get_resp.json()
        updated_emp = next((e for e in employees if e['id'] == self.employee_id), None)
        assert updated_emp is not None
        assert updated_emp["name"] == new_name
    
    def test_update_employee_email(self):
        """Test updating employee email"""
        new_email = f"test_updated_{int(time.time())}@example.com"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={"email": new_email}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["email"] == new_email
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert get_resp.status_code == 200
        employees = get_resp.json()
        updated_emp = next((e for e in employees if e['id'] == self.employee_id), None)
        assert updated_emp is not None
        assert updated_emp["email"] == new_email
    
    def test_update_employee_role_to_admin(self):
        """Test updating employee role to admin"""
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={"role": "admin"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["role"] == "admin"
        
        # Revert immediately for cleanup
        requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={"role": "employee"}
        )
    
    def test_update_multiple_fields(self):
        """Test updating name, email, and role together"""
        new_name = f"TEST_Multi_Update_{int(time.time())}"
        new_email = f"test_multi_{int(time.time())}@example.com"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={
                "name": new_name,
                "email": new_email,
                "role": "employee"
            }
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["name"] == new_name
        assert data["email"] == new_email
        assert data["role"] == "employee"
    
    def test_update_nonexistent_employee_returns_404(self):
        """Test that updating non-existent employee returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/nonexistent-id-123456",
            headers=self.headers,
            json={"name": "Test"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
    
    def test_update_with_empty_fields_returns_400(self):
        """Test that update with no valid fields returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={}
        )
        
        assert response.status_code == 400
        assert "no valid fields" in response.json().get("detail", "").lower()
    
    def test_update_with_invalid_role_returns_400(self):
        """Test that invalid role returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers=self.headers,
            json={"role": "superadmin"}
        )
        
        assert response.status_code == 400
        assert "invalid role" in response.json().get("detail", "").lower()
    
    def test_update_with_duplicate_email_returns_400(self):
        """Test that using existing email returns 400"""
        # Get another employee's email
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        employees = employees_resp.json()
        other_emp = next((e for e in employees if e['id'] != self.employee_id and e.get('role') != 'admin'), None)
        
        if other_emp:
            response = requests.put(
                f"{BASE_URL}/api/admin/employees/{self.employee_id}",
                headers=self.headers,
                json={"email": other_emp['email']}
            )
            
            assert response.status_code == 400
            assert "already in use" in response.json().get("detail", "").lower()
        else:
            pytest.skip("No other employee to test duplicate email")
    
    def test_update_admin_user_returns_400(self):
        """Test that editing admin user is forbidden"""
        # Get an admin user
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        employees = employees_resp.json()
        admin_emp = next((e for e in employees if e.get('role') == 'admin'), None)
        
        if admin_emp:
            response = requests.put(
                f"{BASE_URL}/api/admin/employees/{admin_emp['id']}",
                headers=self.headers,
                json={"name": "Changed Admin Name"}
            )
            
            assert response.status_code == 400
            assert "cannot edit admin" in response.json().get("detail", "").lower()
        else:
            pytest.skip("No admin employee to test")
    
    def test_update_without_auth_returns_401(self):
        """Test that unauthorized request returns 401/403"""
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{self.employee_id}",
            headers={"Content-Type": "application/json"},
            json={"name": "Test"}
        )
        
        assert response.status_code in [401, 403]
