"""
Comprehensive Backend API Tests for Iteration 19
Testing all core API endpoints: Admin clock in/out, sections, modals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-hub-4.preview.emergentagent.com')


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Thrifty Curator API"
    
    def test_admin_login_with_code(self):
        """Test admin login with access code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["name"] == "Matthew Guzman"
        assert data["user"]["role"] == "admin"
    
    def test_admin_login_alternate_code(self):
        """Test admin login with alternate access code 0826"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "euniceguzman@thriftycurator.com",
            "admin_code": "0826"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_code(self):
        """Test login with wrong admin code"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "0000"
        })
        assert response.status_code == 401


class TestAdminEndpoints:
    """Admin endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_employees(self, admin_token):
        """Test getting all employees"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify employee structure
        emp = data[0]
        assert "id" in emp
        assert "name" in emp
        assert "email" in emp
        print(f"SUCCESS: Found {len(data)} employees")
    
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
        print(f"SUCCESS: Summary shows {data['total_employees']} employees, {data['total_hours']} hours")
    
    def test_get_time_entries(self, admin_token):
        """Test getting all time entries"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} time entries")
    
    def test_get_employee_clock_status(self, admin_token):
        """Test getting employee clock status - needed for Employee Portal View"""
        # First get employees to get an ID
        emp_res = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        employees = emp_res.json()
        
        # Get clock status for first non-admin employee
        employee = None
        for emp in employees:
            if emp["role"] == "employee":
                employee = emp
                break
        
        if employee:
            response = requests.get(f"{BASE_URL}/api/admin/employee/{employee['id']}/clock-status", headers={
                "Authorization": f"Bearer {admin_token}"
            })
            assert response.status_code == 200
            data = response.json()
            assert "is_clocked_in" in data
            print(f"SUCCESS: Employee {employee['name']} clock status: {'In' if data['is_clocked_in'] else 'Out'}")
        else:
            pytest.skip("No employees found")


class TestPayrollEndpoints:
    """Payroll endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_payroll_settings(self, admin_token):
        """Test getting payroll settings"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/settings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "pay_period_start_date" in data
        assert "default_hourly_rate" in data
        print(f"SUCCESS: Payroll settings - Start: {data['pay_period_start_date']}, Rate: ${data['default_hourly_rate']}")
    
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
        print(f"SUCCESS: Payroll summary - Current: ${data['current_period']['amount']}, Month: ${data['month_total']}")
    
    def test_generate_payroll_report(self, admin_token):
        """Test generating payroll report"""
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", json={
            "period_type": "biweekly",
            "period_index": 0
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "summary" in data
        assert "employees" in data
        print(f"SUCCESS: Payroll report generated - {data['summary']['total_employees']} employees, ${data['summary']['total_wages']} wages")


class TestMileageEndpoints:
    """Mileage tracking endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_mileage_entries(self, admin_token):
        """Test getting mileage entries"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/entries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} mileage entries")
    
    def test_get_mileage_summary(self, admin_token):
        """Test getting mileage summary"""
        response = requests.get(f"{BASE_URL}/api/admin/mileage/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_miles" in data
        assert "total_trips" in data
        print(f"SUCCESS: Mileage summary - {data['total_miles']} miles, {data['total_trips']} trips")


class TestFormSubmissions:
    """Form submissions endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_form_summary(self, admin_token):
        """Test getting form submissions summary"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "job_applications" in data
        assert "consignment_inquiries" in data
        print(f"SUCCESS: Form summary - Jobs: {data['job_applications']['total']}, Inquiries: {data['consignment_inquiries']['total']}")
    
    def test_get_job_applications(self, admin_token):
        """Test getting job applications"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/job-applications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} job applications")


class TestCheckRecords:
    """Payroll check records endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_check_records(self, admin_token):
        """Test getting payroll check records"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/check-records", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} check records")


class TestNotifications:
    """Notification endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        return response.json()["access_token"]
    
    def test_get_notifications(self, admin_token):
        """Test getting notifications"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"SUCCESS: Found {len(data['notifications'])} notifications, {data['unread_count']} unread")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
