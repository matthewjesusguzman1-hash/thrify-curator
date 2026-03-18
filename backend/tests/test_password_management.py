"""
Backend tests for password management features
Tests employee password login, admin employee password management APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://resale-magic-link.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
TEST_EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"
TEST_EMPLOYEE_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Return authorization headers for admin"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestEmployeePasswordCheck:
    """Test the /api/auth/employee/has-password/{email} endpoint"""

    def test_check_admin_has_no_password(self):
        """Admin users should return is_admin=True and has_password=False"""
        response = requests.get(f"{BASE_URL}/api/auth/employee/has-password/{ADMIN_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert data["is_admin"] is True
        assert data["has_password"] is False

    def test_check_employee_with_password(self):
        """Employee with password set should return has_password=True"""
        response = requests.get(f"{BASE_URL}/api/auth/employee/has-password/{TEST_EMPLOYEE_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert data["is_admin"] is False
        assert data["has_password"] is True

    def test_check_nonexistent_user(self):
        """Non-existent user should return exists=False"""
        response = requests.get(f"{BASE_URL}/api/auth/employee/has-password/nonexistent@test.com")
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is False
        assert data["has_password"] is False


class TestAdminLoginWithCode:
    """Test admin login flow with owner code"""

    def test_admin_login_with_owner_code_4399(self):
        """Admin should be able to login using owner code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["has_password"] is False  # Admins use codes, not passwords

    def test_admin_login_without_code_fails(self):
        """Admin login without admin_code should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 401
        assert "access code" in response.json()["detail"].lower()

    def test_admin_login_with_wrong_code_fails(self):
        """Admin login with wrong admin_code should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": "0000"
        })
        assert response.status_code == 401


class TestEmployeePasswordLogin:
    """Test employee login flow with password"""

    def test_employee_with_password_requires_password(self):
        """Employee with password should require password to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL
        })
        assert response.status_code == 401
        assert "password" in response.json()["detail"].lower()

    def test_employee_with_correct_password_succeeds(self):
        """Employee with correct password should login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": TEST_EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        assert data["user"]["has_password"] is True

    def test_employee_with_wrong_password_fails(self):
        """Employee with wrong password should fail to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "invalid password" in response.json()["detail"].lower()


class TestAdminEmployeePasswordManagement:
    """Test admin password management endpoints"""

    def test_get_all_employee_passwords(self, admin_headers):
        """Admin should be able to get all employees with password status"""
        response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Find test employee in the list
        test_emp = next((e for e in data if e["email"] == TEST_EMPLOYEE_EMAIL), None)
        assert test_emp is not None
        assert test_emp["has_password"] is True
        assert test_emp["uses_admin_code"] is False

    def test_employees_passwords_shows_admin_uses_code(self, admin_headers):
        """Admin employees should show uses_admin_code=True"""
        response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find an admin in the list
        admin_emp = next((e for e in data if e["role"] == "admin"), None)
        if admin_emp:
            assert admin_emp["uses_admin_code"] is True
            assert admin_emp["has_password"] is False

    def test_set_employee_password(self, admin_headers):
        """Admin should be able to set an employee's password"""
        # First get employees to find one without password
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        employees = emp_response.json()
        
        # Find an employee without password (non-admin)
        target = next((e for e in employees if not e["has_password"] and e["role"] == "employee"), None)
        if not target:
            pytest.skip("No employee without password found")
        
        # Set password for this employee
        new_password = "temppass123"
        response = requests.post(
            f"{BASE_URL}/api/admin/employees/{target['id']}/set-password?new_password={new_password}",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify password was set - check has-password endpoint
        check_response = requests.get(f"{BASE_URL}/api/auth/employee/has-password/{target['email']}")
        assert check_response.json()["has_password"] is True
        
        # Clean up: remove password
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/employees/{target['id']}/password",
            headers=admin_headers
        )
        assert delete_response.status_code == 200

    def test_set_password_for_admin_fails(self, admin_headers):
        """Setting password for admin user should fail"""
        # Get employees to find an admin
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        employees = emp_response.json()
        
        admin_emp = next((e for e in employees if e["role"] == "admin"), None)
        if not admin_emp:
            pytest.skip("No admin employee found")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/employees/{admin_emp['id']}/set-password?new_password=testpass",
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "access codes" in response.json()["detail"].lower()

    def test_password_minimum_length(self, admin_headers):
        """Password must be at least 4 characters"""
        # Get an employee
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        employees = emp_response.json()
        
        target = next((e for e in employees if e["role"] == "employee"), None)
        if not target:
            pytest.skip("No employee found")
        
        # Try to set a short password
        response = requests.post(
            f"{BASE_URL}/api/admin/employees/{target['id']}/set-password?new_password=abc",
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "at least 4" in response.json()["detail"].lower()


class TestEmployeeWithoutPassword:
    """Test employee login without password set"""

    def test_employee_without_password_can_login(self, admin_headers):
        """Employee without password should be able to login with just email"""
        # Get employees to find one without password
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        employees = emp_response.json()
        
        target = next((e for e in employees if not e["has_password"] and e["role"] == "employee"), None)
        if not target:
            pytest.skip("No employee without password found")
        
        # Try to login with just email
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": target["email"]
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["user"]["has_password"] is False


class TestRemoveEmployeePassword:
    """Test removing employee password"""

    def test_remove_employee_password(self, admin_headers):
        """Admin should be able to remove an employee's password"""
        # Get employees to find one with password (excluding test employee)
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees/passwords", headers=admin_headers)
        employees = emp_response.json()
        
        # Find employee with password that's not our main test employee
        target = next((e for e in employees if e["has_password"] and e["email"] != TEST_EMPLOYEE_EMAIL), None)
        
        if not target:
            # Set password first on a different employee
            no_pass_emp = next((e for e in employees if not e["has_password"] and e["role"] == "employee"), None)
            if not no_pass_emp:
                pytest.skip("No suitable employee found")
            
            # Set password
            requests.post(
                f"{BASE_URL}/api/admin/employees/{no_pass_emp['id']}/set-password?new_password=temptest",
                headers=admin_headers
            )
            target = no_pass_emp
        
        # Now remove the password
        response = requests.delete(
            f"{BASE_URL}/api/admin/employees/{target['id']}/password",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify password was removed
        check_response = requests.get(f"{BASE_URL}/api/auth/employee/has-password/{target['email']}")
        assert check_response.json()["has_password"] is False


class TestEmployeeSelfServicePasswordChange:
    """Test employee self-service password change via /api/auth/employee/change-password"""

    def test_change_password_wrong_current_password(self):
        """Change password with wrong current password should fail"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": TEST_EMPLOYEE_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to change password with wrong current password
        response = requests.post(f"{BASE_URL}/api/auth/employee/change-password", json={
            "current_password": "wrongpassword",
            "new_password": "newtest5678"
        }, headers=headers)
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_change_password_short_new_password(self):
        """Change password with too short new password should fail"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": TEST_EMPLOYEE_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to change password with too short new password
        response = requests.post(f"{BASE_URL}/api/auth/employee/change-password", json={
            "current_password": TEST_EMPLOYEE_PASSWORD,
            "new_password": "abc"
        }, headers=headers)
        
        assert response.status_code == 400
        assert "at least 4" in response.json()["detail"].lower()

    def test_change_password_success(self):
        """Employee can successfully change their password"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": TEST_EMPLOYEE_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Change password
        new_password = "changedpass123"
        response = requests.post(f"{BASE_URL}/api/auth/employee/change-password", json={
            "current_password": TEST_EMPLOYEE_PASSWORD,
            "new_password": new_password
        }, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify can login with new password
        new_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMPLOYEE_EMAIL,
            "password": new_password
        })
        assert new_login.status_code == 200
        assert new_login.json()["user"]["has_password"] is True
        
        # Restore original password
        new_token = new_login.json()["access_token"]
        restore_response = requests.post(f"{BASE_URL}/api/auth/employee/change-password", json={
            "current_password": new_password,
            "new_password": TEST_EMPLOYEE_PASSWORD
        }, headers={"Authorization": f"Bearer {new_token}"})
        assert restore_response.status_code == 200

    def test_change_password_admin_blocked(self, admin_headers):
        """Admin users should not be able to use change-password endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/employee/change-password", json={
            "current_password": "anypassword",
            "new_password": "newpassword"
        }, headers=admin_headers)
        
        assert response.status_code == 400
        assert "access codes" in response.json()["detail"].lower()
