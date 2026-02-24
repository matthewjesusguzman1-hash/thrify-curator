"""
Comprehensive Backend API Tests for Thrifty Curator Reselling Platform
Tests: Authentication, Admin functions, Employee time tracking, Form submissions
"""
import pytest
import requests
import os
import uuid
import time
from datetime import datetime, timedelta

# Try multiple sources for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '') or os.environ.get('BASE_URL', '') or 'https://thrifty-curator-2.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

# Test data
TEST_ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
TEST_EMPLOYEE_EMAIL = f"test_employee_{uuid.uuid4().hex[:8]}@test.com"
TEST_EMPLOYEE_NAME = "Test Employee"


class TestHealthAndBasicRoutes:
    """Basic API health and connectivity tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")


class TestPasswordlessAuth:
    """Passwordless JWT authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with matthewjesusguzman1@gmail.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_invalid_email_login(self):
        """Test login with unregistered email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid login response: {data}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token returns 403"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 403
        print("Auth me without token correctly returns 403")
    
    def test_auth_me_with_valid_token(self):
        """Test /auth/me with valid token returns user"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        token = login_resp.json()["access_token"]
        
        # Then check me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_ADMIN_EMAIL
        print(f"Auth me successful: {data}")


class TestAdminFeatures:
    """Admin dashboard features - employee management and reporting"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_all_employees(self, admin_token):
        """Admin can view all employees"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total employees: {len(data)}")
        for emp in data:
            print(f"  - {emp['name']} ({emp['email']}) - {emp['role']}")
    
    def test_create_new_employee(self, admin_token):
        """Admin can create new employee"""
        # Generate a unique email for this test run
        test_email = f"test_employee_{uuid.uuid4().hex[:8]}@test.com"
        employee_data = {
            "name": TEST_EMPLOYEE_NAME,
            "email": test_email
        }
        response = requests.post(f"{BASE_URL}/api/admin/create-employee", 
            json=employee_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create employee: {response.text}"
        data = response.json()
        
        # Verify employee was created with correct data
        assert data["email"] == test_email
        assert data["name"] == TEST_EMPLOYEE_NAME
        assert data["role"] == "employee"
        print(f"Created employee: {data}")
        
        # Small delay to ensure database consistency
        time.sleep(0.5)
        
        # Verify employee exists via GET using the email from the response
        get_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        employees = get_resp.json()
        created_emp = next((e for e in employees if e["email"] == data["email"]), None)
        assert created_emp is not None, f"Created employee not found in list. Looking for: {data['email']}"
        print(f"Verified employee in list: {created_emp['id']}")
        
        return data["id"]
    
    def test_delete_employee(self, admin_token):
        """Admin can delete employee"""
        # First create an employee to delete
        del_email = f"delete_test_{uuid.uuid4().hex[:8]}@test.com"
        create_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "To Delete", "email": del_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        emp_id = create_resp.json()["id"]
        
        # Now delete
        del_resp = requests.delete(f"{BASE_URL}/api/admin/employees/{emp_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert del_resp.status_code == 200
        print(f"Deleted employee {emp_id}")
        
        # Verify employee no longer exists
        get_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        employees = get_resp.json()
        deleted_emp = next((e for e in employees if e["id"] == emp_id), None)
        assert deleted_emp is None, "Employee should be deleted"
        print("Verified employee was deleted")
    
    def test_generate_shift_report(self, admin_token):
        """Admin can generate shift reports by date range"""
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/admin/reports",
            json={
                "start_date": start_date,
                "end_date": end_date,
                "employee_id": None
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify report structure
        assert "period" in data
        assert "summary" in data
        assert "by_employee" in data
        assert data["period"]["start"] == start_date
        assert data["period"]["end"] == end_date
        print(f"Report summary: {data['summary']}")
    
    def test_get_admin_summary(self, admin_token):
        """Admin can view summary statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_employees" in data
        assert "total_hours" in data
        assert "total_shifts" in data
        assert "by_employee" in data
        print(f"Admin summary: {data}")
    
    def test_get_all_time_entries(self, admin_token):
        """Admin can view all time entries"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total time entries: {len(data)}")


class TestEmployeeTimeTracking:
    """Employee clock in/out and time tracking tests"""
    
    @pytest.fixture
    def employee_token(self):
        """Create employee and get token"""
        # First get admin token
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        admin_token = admin_resp.json()["access_token"]
        
        # Create employee
        emp_email = f"time_test_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Time Test Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as employee
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": emp_email
        })
        if emp_resp.status_code == 200:
            return emp_resp.json()["access_token"]
        pytest.skip("Employee login failed")
    
    def test_clock_status_not_clocked_in(self, employee_token):
        """Employee starts not clocked in"""
        response = requests.get(f"{BASE_URL}/api/time/status", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 200
        data = response.json()
        # New employee should not be clocked in
        print(f"Clock status: {data}")
    
    def test_clock_in(self, employee_token):
        """Employee can clock in"""
        response = requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify clock in entry
        assert "id" in data
        assert "clock_in" in data
        assert data["clock_out"] is None
        print(f"Clocked in at: {data['clock_in']}")
        
        # Verify status changed
        status_resp = requests.get(f"{BASE_URL}/api/time/status", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert status_resp.json()["clocked_in"] == True
        print("Verified clocked_in status is True")
    
    def test_clock_out(self, employee_token):
        """Employee can clock out"""
        # First clock in
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        # Then clock out
        response = requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "out"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify clock out
        assert data["clock_out"] is not None
        assert data["total_hours"] is not None
        print(f"Clocked out at: {data['clock_out']}, total hours: {data['total_hours']}")
    
    def test_double_clock_in_fails(self, employee_token):
        """Cannot clock in when already clocked in"""
        # First clock in
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        # Try to clock in again
        response = requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 400
        print(f"Double clock in correctly rejected: {response.json()}")
    
    def test_get_time_entries(self, employee_token):
        """Employee can view their time entries"""
        response = requests.get(f"{BASE_URL}/api/time/entries", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Employee has {len(data)} time entries")
    
    def test_get_time_summary(self, employee_token):
        """Employee can view their time summary"""
        response = requests.get(f"{BASE_URL}/api/time/summary", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_hours" in data
        assert "week_hours" in data
        assert "total_shifts" in data
        print(f"Time summary: {data}")


class TestFormSubmissions:
    """Form submission tests - Job Application, Consignment Inquiry, Agreement"""
    
    def test_submit_job_application(self):
        """Submit complete job application form"""
        application = {
            "full_name": "Test Applicant",
            "email": f"applicant_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "(555) 123-4567",
            "address": "123 Test St, Test City, TS 12345",
            "resume_text": "Experienced in retail and reselling platforms",
            "why_join": "I love thrifting and want to help others find great deals",
            "availability": "Monday-Friday 9am-5pm",
            "tasks_able_to_perform": ["photography", "listing", "shipping"],
            "background_check_consent": True,
            "has_reliable_transportation": True,
            "additional_info": "I have 2 years of experience with eBay"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/job-application", json=application)
        assert response.status_code == 200, f"Job application failed: {response.text}"
        data = response.json()
        
        # Verify data was saved
        assert data["full_name"] == application["full_name"]
        assert data["email"] == application["email"]
        assert "id" in data
        assert "submitted_at" in data
        print(f"Job application submitted: {data['id']}")
    
    def test_submit_consignment_inquiry(self):
        """Submit consignment inquiry form"""
        inquiry = {
            "full_name": "Test Consignor",
            "email": f"consignor_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "(555) 987-6543",
            "item_types": ["dress", "shoes"],
            "other_item_type": "",
            "item_description": "Designer dress and heels, barely worn",
            "item_condition": "like-new",
            "smoke_free": True,
            "pet_free": True,
            "image_urls": []
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-inquiry", json=inquiry)
        assert response.status_code == 200, f"Consignment inquiry failed: {response.text}"
        data = response.json()
        
        # Verify data
        assert data["full_name"] == inquiry["full_name"]
        assert data["item_types"] == inquiry["item_types"]
        assert "id" in data
        print(f"Consignment inquiry submitted: {data['id']}")
    
    def test_submit_consignment_agreement(self):
        """Submit consignment agreement with signature"""
        agreement = {
            "full_name": "Test Signer",
            "email": f"signer_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "(555) 111-2222",
            "address": "456 Sign St, Contract City, CC 67890",
            "items_description": "5",
            "agreed_percentage": "50-50",
            "signature": "Test Signer",
            "signature_date": datetime.now().strftime("%Y-%m-%d"),
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=agreement)
        assert response.status_code == 200, f"Consignment agreement failed: {response.text}"
        data = response.json()
        
        # Verify data
        assert data["full_name"] == agreement["full_name"]
        assert data["signature"] == agreement["signature"]
        assert data["agreed_to_terms"] == True
        assert "id" in data
        print(f"Consignment agreement submitted: {data['id']}")


class TestAdminNotifications:
    """Admin in-app notifications tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_notifications(self, admin_token):
        """Admin can get notifications list"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        print(f"Notifications count: {len(data['notifications'])}, unread: {data['unread_count']}")
        return data
    
    def test_clock_in_creates_notification(self, admin_token):
        """Clock in creates a notification for admin"""
        # Create employee
        emp_email = f"notify_test_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Notify Test Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as employee
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        emp_token = emp_resp.json()["access_token"]
        
        # Get initial notification count
        initial_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        initial_count = len(initial_resp.json()["notifications"])
        
        # Clock in
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        
        # Check for new notification
        after_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        after_count = len(after_resp.json()["notifications"])
        
        assert after_count > initial_count, "Clock in should create notification"
        
        # Verify notification content
        newest = after_resp.json()["notifications"][0]
        assert newest["type"] == "clock_in"
        assert "clocked in" in newest["message"].lower()
        print(f"Clock in notification created: {newest['message']}")
        
        return emp_token
    
    def test_clock_out_creates_notification_with_hours(self, admin_token):
        """Clock out creates notification with today/week hours"""
        # Create employee
        emp_email = f"notify_out_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Notify Out Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as employee
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        emp_token = emp_resp.json()["access_token"]
        
        # Clock in
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        
        # Clock out
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "out"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        
        # Check notification
        notif_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        notifications = notif_resp.json()["notifications"]
        
        # Find clock_out notification
        clock_out_notifs = [n for n in notifications if n["type"] == "clock_out"]
        assert len(clock_out_notifs) > 0, "Clock out notification should be created"
        
        newest = clock_out_notifs[0]
        assert "clocked out" in newest["message"].lower()
        assert "details" in newest
        assert "today_hours" in newest["details"]
        assert "week_hours" in newest["details"]
        assert "total_hours" in newest["details"]
        print(f"Clock out notification with hours: {newest['details']}")
    
    def test_mark_all_notifications_read(self, admin_token):
        """Admin can mark all notifications as read"""
        response = requests.post(f"{BASE_URL}/api/admin/notifications/mark-read", 
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Mark all read response: {data}")
        
        # Verify unread count is 0
        notif_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert notif_resp.json()["unread_count"] == 0
        print("Verified all notifications marked as read")
    
    def test_clear_all_notifications(self, admin_token):
        """Admin can clear all notifications"""
        response = requests.delete(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Clear all response: {data}")
        
        # Verify no notifications
        notif_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert len(notif_resp.json()["notifications"]) == 0
        print("Verified all notifications cleared")


class TestAuthorizationRules:
    """Test that proper authorization rules are enforced"""
    
    @pytest.fixture
    def employee_token(self):
        """Get employee token"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        admin_token = admin_resp.json()["access_token"]
        
        emp_email = f"auth_test_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Auth Test Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        return emp_resp.json()["access_token"]
    
    def test_employee_cannot_access_admin_routes(self, employee_token):
        """Employee should not access admin-only routes"""
        # Try to get all employees
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 403
        print("Employee correctly denied access to admin employees")
        
        # Try to create employee
        response = requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Hacker", "email": "hacker@test.com"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 403
        print("Employee correctly denied access to create employee")
        
        # Try to get admin summary
        response = requests.get(f"{BASE_URL}/api/admin/summary", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 403
        print("Employee correctly denied access to admin summary")
    
    def test_employee_cannot_access_admin_notifications(self, employee_token):
        """Employee should not access admin notifications"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 403
        print("Employee correctly denied access to admin notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
