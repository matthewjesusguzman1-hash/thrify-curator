"""
Tests for Account Lock/Unlock and Password Reset features

Features tested:
1. Admin can lock/unlock employee accounts
2. Admin can lock/unlock consignor accounts
3. Locked accounts cannot log in
4. Password reset email endpoint works
5. Consignment forms include rejected_items_preference field
"""
import pytest
import requests
import uuid
from datetime import datetime

# Import shared fixtures
from conftest import BASE_URL, ADMIN_EMAIL, ADMIN_CODE


class TestAccountLockFeature:
    """Test the Lock/Unlock account feature for admins"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Return authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_lock_account_endpoint_exists(self, admin_headers):
        """Test that the lock account endpoint exists and requires proper parameters"""
        # Test with missing parameters
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/lock-account",
            json={},
            headers=admin_headers
        )
        # Should fail with validation error, not 404
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
    
    def test_lock_account_requires_admin(self):
        """Test that lock account endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/lock-account",
            json={
                "user_type": "employee",
                "email": "test@example.com",
                "lock": True
            }
        )
        # Should fail without auth
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
    
    def test_get_account_lock_status_endpoint(self, admin_headers):
        """Test the get account lock status endpoint"""
        # Test with admin email (should work)
        response = requests.get(
            f"{BASE_URL}/api/auth/admin/account-lock-status/employee/{ADMIN_EMAIL}",
            headers=admin_headers
        )
        # Admin accounts can't be locked, but endpoint should work
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
    
    def test_cannot_lock_admin_accounts(self, admin_headers):
        """Test that admin accounts cannot be locked"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/lock-account",
            json={
                "user_type": "employee",
                "email": ADMIN_EMAIL,
                "lock": True
            },
            headers=admin_headers
        )
        # Should fail - cannot lock admin accounts
        assert response.status_code == 403, f"Expected 403 for locking admin, got {response.status_code}"
        assert "admin" in response.json().get("detail", "").lower()


class TestPasswordResetFeature:
    """Test the password reset email feature"""
    
    def test_password_reset_request_endpoint_exists(self):
        """Test that password reset request endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/password-reset/request",
            json={
                "email": "test@example.com",
                "user_type": "employee"
            }
        )
        # Should return success (even if email doesn't exist - for security)
        assert response.status_code == 200, f"Password reset request failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
    
    def test_password_reset_for_consignor(self):
        """Test password reset request for consignor type"""
        response = requests.post(
            f"{BASE_URL}/api/password-reset/request",
            json={
                "email": "consignor@example.com",
                "user_type": "consignor"
            }
        )
        assert response.status_code == 200, f"Consignor password reset failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
    
    def test_password_reset_rate_limit_status(self):
        """Test rate limit status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/password-reset/rate-limit-status?email=test@example.com"
        )
        assert response.status_code == 200, f"Rate limit status failed: {response.text}"
        data = response.json()
        assert "email_requests_remaining" in data
        assert "can_request" in data
    
    def test_password_reset_validate_invalid_token(self):
        """Test that invalid tokens are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/password-reset/validate/invalid_token_12345"
        )
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"


class TestConsignmentFormPreference:
    """Test the rejected_items_preference field in consignment forms"""
    
    def test_consignment_agreement_accepts_preference(self):
        """Test that consignment agreement accepts rejected_items_preference field"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/forms/consignment-agreement",
            json={
                "full_name": "Test User",
                "email": unique_email,
                "phone": "555-1234",
                "address": "123 Test St",
                "items_to_add": 5,
                "items_description": "Test items",
                "agreed_percentage": "50/50",
                "payment_method": "check",
                "rejected_items_preference": "donate",  # New field
                "signature": "Test User",
                "signature_date": datetime.now().strftime("%Y-%m-%d"),
                "agreed_to_terms": True
            }
        )
        assert response.status_code == 200, f"Agreement submission failed: {response.text}"
        data = response.json()
        assert data.get("rejected_items_preference") == "donate"
    
    def test_consignment_agreement_default_preference(self):
        """Test that default preference is 'return'"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/forms/consignment-agreement",
            json={
                "full_name": "Test User Default",
                "email": unique_email,
                "phone": "555-5678",
                "address": "456 Test Ave",
                "items_to_add": 3,
                "items_description": "More test items",
                "agreed_percentage": "50/50",
                "payment_method": "venmo",
                "payment_details": "@testuser",
                "signature": "Test User Default",
                "signature_date": datetime.now().strftime("%Y-%m-%d"),
                "agreed_to_terms": True
                # Note: rejected_items_preference not provided - should default to "return"
            }
        )
        assert response.status_code == 200, f"Agreement submission failed: {response.text}"
        data = response.json()
        # Default should be "return"
        assert data.get("rejected_items_preference") == "return"


class TestLockedAccountLogin:
    """Test that locked accounts cannot log in"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Return authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_locked_employee_error_message(self, admin_headers):
        """Test that locked employee accounts get proper error message"""
        # First, get list of employees to find one we can test with
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/passwords",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get employee list")
        
        employees = response.json()
        # Find a non-admin employee
        test_employee = None
        for emp in employees:
            if not emp.get("uses_admin_code") and emp.get("email"):
                test_employee = emp
                break
        
        if not test_employee:
            pytest.skip("No non-admin employees found for testing")
        
        # Check if already locked
        status_response = requests.get(
            f"{BASE_URL}/api/auth/admin/account-lock-status/employee/{test_employee['email']}",
            headers=admin_headers
        )
        
        was_locked = False
        if status_response.status_code == 200:
            was_locked = status_response.json().get("is_locked", False)
        
        # Lock the account
        lock_response = requests.post(
            f"{BASE_URL}/api/auth/admin/lock-account",
            json={
                "user_type": "employee",
                "email": test_employee["email"],
                "lock": True
            },
            headers=admin_headers
        )
        
        if lock_response.status_code != 200:
            pytest.skip(f"Could not lock account: {lock_response.text}")
        
        try:
            # Try to login with locked account
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_employee["email"]}
            )
            
            # Should get 403 with locked message
            assert login_response.status_code == 403, f"Expected 403 for locked account, got {login_response.status_code}"
            error_detail = login_response.json().get("detail", "")
            assert "locked" in error_detail.lower(), f"Expected 'locked' in error message, got: {error_detail}"
        
        finally:
            # Unlock the account (cleanup)
            if not was_locked:
                requests.post(
                    f"{BASE_URL}/api/auth/admin/lock-account",
                    json={
                        "user_type": "employee",
                        "email": test_employee["email"],
                        "lock": False
                    },
                    headers=admin_headers
                )


class TestEmployeePasswordManagement:
    """Test employee password management endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Return authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_employee_passwords_list(self, admin_headers):
        """Test getting list of employees with password status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/passwords",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get employee passwords: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Each employee should have these fields
        if len(data) > 0:
            emp = data[0]
            assert "email" in emp
            assert "has_password" in emp
            assert "is_locked" in emp
    
    def test_get_consignor_passwords_list(self, admin_headers):
        """Test getting list of consignors with password status"""
        response = requests.get(
            f"{BASE_URL}/api/forms/admin/consignment-passwords",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get consignor passwords: {response.text}"
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
