"""
Backend API tests for Payment Records Auto-fill Feature

Tests the payroll summary endpoint that provides employee owed amounts
for the auto-fill feature in the Payment Records section.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com')


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        }
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestPayrollSummaryAPI:
    """Tests for GET /api/admin/payroll/summary endpoint"""
    
    def test_payroll_summary_returns_200(self, auth_headers):
        """Test that payroll summary endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_payroll_summary_has_current_period(self, auth_headers):
        """Test that response includes current_period object"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=auth_headers
        )
        data = response.json()
        
        assert "current_period" in data
        assert "amount" in data["current_period"]
        assert "hours" in data["current_period"]
        assert "start" in data["current_period"]
        assert "end" in data["current_period"]
    
    def test_payroll_summary_has_by_employee_array(self, auth_headers):
        """Test that current_period includes by_employee array for auto-fill"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=auth_headers
        )
        data = response.json()
        
        assert "by_employee" in data["current_period"]
        assert isinstance(data["current_period"]["by_employee"], list)
    
    def test_by_employee_has_required_fields(self, auth_headers):
        """Test that each employee in by_employee has required fields for auto-fill"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=auth_headers
        )
        data = response.json()
        
        by_employee = data["current_period"]["by_employee"]
        
        # If there are employees with owed amounts, verify structure
        if len(by_employee) > 0:
            employee = by_employee[0]
            assert "name" in employee, "Employee should have 'name' field"
            assert "amount" in employee, "Employee should have 'amount' field"
            assert "hours" in employee, "Employee should have 'hours' field"
            assert "hourly_rate" in employee, "Employee should have 'hourly_rate' field"
            assert "user_id" in employee, "Employee should have 'user_id' field"
    
    def test_test_employee_has_owed_amount(self, auth_headers):
        """Test that Test Employee has an owed amount for current period"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=auth_headers
        )
        data = response.json()
        
        by_employee = data["current_period"]["by_employee"]
        
        # Find Test Employee
        test_employee = None
        for emp in by_employee:
            if emp["name"] == "Test Employee":
                test_employee = emp
                break
        
        assert test_employee is not None, "Test Employee should be in by_employee list"
        assert test_employee["amount"] > 0, "Test Employee should have owed amount > 0"
        assert test_employee["amount"] == 4.67, f"Test Employee should have $4.67 owed, got ${test_employee['amount']}"


class TestEmployeesForPaymentAPI:
    """Tests for GET /api/admin/payroll/all-employees-for-payment endpoint"""
    
    def test_employees_for_payment_returns_200(self, auth_headers):
        """Test that employees for payment endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/all-employees-for-payment",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_employees_for_payment_returns_list(self, auth_headers):
        """Test that endpoint returns a list of employees"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/all-employees-for-payment",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one employee"
    
    def test_employees_have_required_fields(self, auth_headers):
        """Test that each employee has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/all-employees-for-payment",
            headers=auth_headers
        )
        data = response.json()
        
        for employee in data:
            assert "id" in employee, "Employee should have 'id' field"
            assert "name" in employee, "Employee should have 'name' field"
            assert "email" in employee, "Employee should have 'email' field"
    
    def test_test_employee_in_list(self, auth_headers):
        """Test that Test Employee is in the employees list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/all-employees-for-payment",
            headers=auth_headers
        )
        data = response.json()
        
        test_employee = None
        for emp in data:
            if emp["name"] == "Test Employee":
                test_employee = emp
                break
        
        assert test_employee is not None, "Test Employee should be in employees list"
        assert test_employee["email"] == "testemployee@thriftycurator.com"


class TestPayrollSummaryAuthentication:
    """Tests for authentication on payroll endpoints"""
    
    def test_payroll_summary_requires_auth(self):
        """Test that payroll summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary")
        assert response.status_code == 403 or response.status_code == 401
    
    def test_employees_for_payment_requires_auth(self):
        """Test that employees for payment requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/all-employees-for-payment")
        assert response.status_code == 403 or response.status_code == 401
