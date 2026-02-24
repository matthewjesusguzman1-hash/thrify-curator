"""
Pre-Deployment Backend API Tests for Thrifty Curator
Tests core functionality before deployment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://thrifty-curator-1.preview.emergentagent.com').rstrip('/')

class TestAdminLogin:
    """Test admin authentication with code 4399"""
    
    def test_admin_login_with_code_4399(self):
        """Admin can login with code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "matthewjesusguzman1@gmail.com"
        assert data["user"]["role"] == "admin"
        assert data["user"]["name"] == "Matthew Guzman"

    def test_admin_login_with_code_0826(self):
        """Admin can login with code 0826 (Eunice)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "euniceguzman@thriftycurator.com", 
            "admin_code": "0826"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"


class TestEmployeeEndpoints:
    """Test employee management APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_all_employees(self, auth_token):
        """Get all employees - should return 6 real employees"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) == 6
        
        # Verify expected employees
        employee_names = [e["name"] for e in employees]
        assert "Matthew Guzman" in employee_names
        assert "Eunice Guzman" in employee_names
        assert "Sarah Johnson" in employee_names
        assert "Emily Davis" in employee_names
        assert "James Wilson" in employee_names
        assert "Lisa Martinez" in employee_names
        
        # Verify no test data (no @test.com emails)
        for emp in employees:
            assert "@test.com" not in emp["email"], f"Test data found: {emp['email']}"
    
    def test_admin_summary(self, auth_token):
        """Get admin dashboard summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "total_hours" in data
        assert "total_shifts" in data
        assert data["total_employees"] == 6


class TestTimeEntryEndpoints:
    """Test time entry APIs"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_time_entries(self, auth_token):
        """Get all time entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/time-entries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)
        assert len(entries) >= 0


class TestPayrollEndpoints:
    """Test payroll APIs"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_payroll_summary(self, auth_token):
        """Get payroll summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "current_period" in data
        assert "month_total" in data
        assert "year_total" in data
    
    def test_payroll_settings(self, auth_token):
        """Get payroll settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200


class TestMileageEndpoints:
    """Test mileage tracking APIs"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_mileage_entries(self, auth_token):
        """Get mileage entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/entries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)
    
    def test_mileage_summary(self, auth_token):
        """Get mileage summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_miles" in data
        assert "total_trips" in data
    
    def test_active_trip_status(self, auth_token):
        """Get active trip status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/active-trip",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # 200 or null response is expected
        assert response.status_code == 200


class TestFormSubmissionEndpoints:
    """Test form submission APIs"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_forms_summary(self, auth_token):
        """Get forms summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/forms/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "job_applications" in data
        assert "consignment_inquiries" in data
        assert "consignment_agreements" in data
    
    def test_job_applications(self, auth_token):
        """Get job applications"""
        response = requests.get(
            f"{BASE_URL}/api/admin/forms/job-applications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_consignment_inquiries(self, auth_token):
        """Get consignment inquiries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/forms/consignment-inquiries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestNotificationEndpoints:
    """Test notification APIs"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_notifications(self, auth_token):
        """Get notifications"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
