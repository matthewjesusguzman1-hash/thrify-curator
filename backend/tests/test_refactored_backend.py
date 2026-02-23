"""
Backend API Tests - Thrifty Curator Refactored Backend
Testing all API endpoints after refactoring from monolithic server.py to modular structure.
Covers: Auth, Admin, Payroll endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-dash-1.preview.emergentagent.com')

class TestHealth:
    """Root health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Thrifty Curator API"
        assert data["version"] == "2.0.0"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_valid_admin(self):
        """Test admin login with valid email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "matthewjesusguzman1@gmail.com"
        assert data["user"]["role"] == "admin"
        assert "id" in data["user"]
        assert "name" in data["user"]
        
    def test_login_unregistered_email(self):
        """Test login with unregistered email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "not registered" in data["detail"].lower() or "contact" in data["detail"].lower()

    def test_auth_me_authenticated(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        token = login_res.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "matthewjesusguzman1@gmail.com"
        assert data["role"] == "admin"

    def test_auth_me_unauthenticated(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        # Backend returns 403 Forbidden for missing/invalid auth
        assert response.status_code in [401, 403]


class TestAdminEmployees:
    """Admin employee management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        return response.json()["access_token"]
    
    def test_get_all_employees_authenticated(self, admin_token):
        """Test getting all employees as admin"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify structure of employee objects
        if len(data) > 0:
            emp = data[0]
            assert "id" in emp
            assert "email" in emp
            assert "name" in emp
            assert "role" in emp

    def test_get_all_employees_unauthenticated(self):
        """Test getting employees without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/employees")
        # Backend returns 403 Forbidden for missing/invalid auth
        assert response.status_code in [401, 403]

    def test_get_admin_summary(self, admin_token):
        """Test getting admin summary"""
        response = requests.get(f"{BASE_URL}/api/admin/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "total_hours" in data
        assert "total_shifts" in data
        assert "by_employee" in data

    def test_get_employee_entries(self, admin_token):
        """Test getting employee time entries"""
        # First get an employee
        emp_res = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        employees = emp_res.json()
        if len(employees) > 0:
            emp_id = employees[0]["id"]
            response = requests.get(f"{BASE_URL}/api/admin/employee/{emp_id}/entries", headers={
                "Authorization": f"Bearer {admin_token}"
            })
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

    def test_get_employee_entries_nonexistent(self, admin_token):
        """Test getting entries for non-existent employee"""
        response = requests.get(f"{BASE_URL}/api/admin/employee/nonexistent-id/entries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 404


class TestPayroll:
    """Payroll endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        return response.json()["access_token"]
    
    def test_get_payroll_summary(self, admin_token):
        """Test getting payroll summary"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "current_period" in data
        assert "month_total" in data
        assert "year_total" in data
        # Verify period structure
        assert "amount" in data["current_period"]
        assert "hours" in data["current_period"]
        assert "start" in data["current_period"]
        assert "end" in data["current_period"]

    def test_get_payroll_settings(self, admin_token):
        """Test getting payroll settings"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/settings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "pay_period_start_date" in data
        assert "default_hourly_rate" in data

    def test_generate_payroll_report_biweekly(self, admin_token):
        """Test generating biweekly payroll report"""
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "period_type": "biweekly",
                "period_index": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "summary" in data
        assert "employees" in data
        assert data["period"]["type"] == "biweekly"

    def test_generate_payroll_report_monthly(self, admin_token):
        """Test generating monthly payroll report"""
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "period_type": "monthly",
                "period_index": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"]["type"] == "monthly"

    def test_payroll_summary_unauthorized(self):
        """Test payroll summary without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary")
        # Backend returns 403 Forbidden for missing/invalid auth
        assert response.status_code in [401, 403]


class TestTimeEntries:
    """Time entry management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        return response.json()["access_token"]
    
    def test_get_all_time_entries(self, admin_token):
        """Test getting all time entries"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestNotifications:
    """Notification endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        return response.json()["access_token"]
    
    def test_get_notifications(self, admin_token):
        """Test getting admin notifications"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data

    def test_notifications_unauthorized(self):
        """Test notifications without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications")
        # Backend returns 403 Forbidden for missing/invalid auth
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
