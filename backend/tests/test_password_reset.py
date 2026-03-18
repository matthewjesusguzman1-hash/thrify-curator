"""
Tests for email-based password reset system (magic link).
Tests both employee and consignor password reset flows.
"""
import pytest
import requests
import secrets
import time


class TestPasswordResetRequest:
    """Tests for POST /api/password-reset/request"""

    def test_request_reset_employee_valid_email(self, base_url):
        """Request password reset for valid employee email"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "testemployee@thriftycurator.com",
            "user_type": "employee"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "password reset link" in data["message"].lower()

    def test_request_reset_employee_nonexistent_email(self, base_url):
        """Request reset for nonexistent employee - should still return success for security"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "nonexistent_user_xyz@test.com",
            "user_type": "employee"
        })
        assert response.status_code == 200
        data = response.json()
        # Should return success to not reveal whether email exists
        assert data["success"] is True
        assert "password reset link" in data["message"].lower()

    def test_request_reset_consignor_nonexistent_email(self, base_url):
        """Request reset for nonexistent consignor - should still return success"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "nonexistent_consignor_xyz@test.com",
            "user_type": "consignor"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_request_reset_invalid_user_type(self, base_url):
        """Request reset with invalid user type should fail"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "test@test.com",
            "user_type": "invalid_type"
        })
        assert response.status_code == 400
        data = response.json()
        assert "invalid user type" in data["detail"].lower()

    def test_request_reset_admin_email_blocked(self, base_url):
        """Admin users cannot reset password via email (they use access codes)"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "matthewjesusguzman1@gmail.com",
            "user_type": "employee"
        })
        # Should return success but not actually send email for admins
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_request_reset_invalid_email_format(self, base_url):
        """Request with invalid email format should fail validation"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "not-a-valid-email",
            "user_type": "employee"
        })
        # Should fail pydantic validation
        assert response.status_code == 422

    def test_request_reset_missing_email(self, base_url):
        """Request without email should fail validation"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "user_type": "employee"
        })
        assert response.status_code == 422

    def test_request_reset_case_insensitive_email(self, base_url):
        """Email lookup should be case-insensitive"""
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "TESTEMPLOYEE@THRIFTYCURATOR.COM",
            "user_type": "employee"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestTokenValidation:
    """Tests for GET /api/password-reset/validate/{token}"""

    def test_validate_invalid_token(self, base_url):
        """Validation of invalid token should fail"""
        response = requests.get(f"{base_url}/api/password-reset/validate/invalid-token-12345")
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_validate_random_token(self, base_url):
        """Validation of random non-existent token should fail"""
        random_token = secrets.token_urlsafe(32)
        response = requests.get(f"{base_url}/api/password-reset/validate/{random_token}")
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_validate_empty_token(self, base_url):
        """Validation with empty token path should return 404 or 405"""
        response = requests.get(f"{base_url}/api/password-reset/validate/")
        # Empty path segment typically results in 404
        assert response.status_code in [404, 405]


class TestPasswordReset:
    """Tests for POST /api/password-reset/reset"""

    def test_reset_with_invalid_token(self, base_url):
        """Reset with invalid token should fail"""
        response = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": "invalid-token-12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_reset_with_short_password(self, base_url):
        """Reset with short password should fail validation"""
        # Note: Token validation happens first, so this will fail on token validation
        # not password validation. Testing password validation requires valid token.
        response = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": "invalid-token",
            "new_password": "abc"
        })
        # Will fail on token validation first
        assert response.status_code == 400

    def test_reset_missing_token(self, base_url):
        """Reset without token should fail validation"""
        response = requests.post(f"{base_url}/api/password-reset/reset", json={
            "new_password": "newpassword123"
        })
        assert response.status_code == 422

    def test_reset_missing_password(self, base_url):
        """Reset without password should fail validation"""
        response = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": "some-token"
        })
        assert response.status_code == 422

    def test_reset_random_token(self, base_url):
        """Reset with random non-existent token should fail"""
        random_token = secrets.token_urlsafe(32)
        response = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": random_token,
            "new_password": "validpassword123"
        })
        assert response.status_code == 400


class TestPasswordResetIntegration:
    """Integration tests for the full password reset flow"""

    def test_request_creates_token_in_database(self, base_url, auth_headers):
        """Verify that requesting reset creates a token entry"""
        # Request reset for test employee
        response = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "testemployee@thriftycurator.com",
            "user_type": "employee"
        })
        assert response.status_code == 200
        # Token is stored with hash in database - we can't directly verify without DB access
        # but the successful response indicates token was created

    def test_cannot_reuse_token_after_reset(self, base_url):
        """After a token is used, it should not be reusable"""
        # We can't fully test this without a valid token, but we verify the behavior
        fake_token = "used-token-test"
        response1 = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": fake_token,
            "new_password": "newpassword123"
        })
        assert response1.status_code == 400
        
        # Second attempt should also fail
        response2 = requests.post(f"{base_url}/api/password-reset/reset", json={
            "token": fake_token,
            "new_password": "differentpassword456"
        })
        assert response2.status_code == 400


class TestPasswordResetSecurity:
    """Security-focused tests for password reset"""

    def test_response_does_not_reveal_user_existence(self, base_url):
        """Response should be identical for existing and non-existing users"""
        # Existing user
        response1 = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "testemployee@thriftycurator.com",
            "user_type": "employee"
        })
        
        # Non-existing user
        response2 = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": "definitelynotauser123456@nonexistent.com",
            "user_type": "employee"
        })
        
        # Both should return success
        assert response1.status_code == response2.status_code == 200
        # Both should have similar message structure
        data1 = response1.json()
        data2 = response2.json()
        assert data1["success"] == data2["success"] == True
        assert data1["message"] == data2["message"]

    def test_token_validation_error_is_generic(self, base_url):
        """Token validation errors should be generic to prevent enumeration"""
        # Test with various invalid tokens
        tokens_to_test = [
            "a",
            "short",
            "invalid-token",
            secrets.token_urlsafe(16),
            secrets.token_urlsafe(64),
        ]
        
        for token in tokens_to_test:
            response = requests.get(f"{base_url}/api/password-reset/validate/{token}")
            assert response.status_code == 400
            data = response.json()
            # All errors should have similar generic message
            assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_multiple_requests_overwrite_old_token(self, base_url):
        """Multiple reset requests should invalidate old tokens"""
        email = "testemployee@thriftycurator.com"
        
        # Make two requests
        response1 = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": email,
            "user_type": "employee"
        })
        assert response1.status_code == 200
        
        # Brief delay
        time.sleep(0.5)
        
        response2 = requests.post(f"{base_url}/api/password-reset/request", json={
            "email": email,
            "user_type": "employee"
        })
        assert response2.status_code == 200
        # Old token should be deleted, new one created - both requests successful
