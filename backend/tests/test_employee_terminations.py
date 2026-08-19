"""
Tests for Employee Terminations API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com')


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "matthewjesusguzman1@gmail.com", "admin_code": "4399"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Get auth headers for API requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestTerminationHistory:
    """Test termination history endpoint"""
    
    def test_get_termination_history(self, auth_headers):
        """Test GET /api/employee-terminations/history returns list"""
        response = requests.get(
            f"{BASE_URL}/api/employee-terminations/history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_termination_history_requires_auth(self):
        """Test that termination history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/employee-terminations/history")
        assert response.status_code in [401, 403]


class TestTerminationEndpoints:
    """Test termination CRUD endpoints"""
    
    def test_terminate_nonexistent_employee(self, auth_headers):
        """Test terminating a non-existent employee returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/employee-terminations/terminate",
            headers=auth_headers,
            json={
                "employee_id": "nonexistent-id-12345",
                "reason": "Performance",
                "reason_details": "Test termination",
                "notes": "Test notes"
            }
        )
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
    
    def test_cannot_terminate_owner(self, auth_headers):
        """Test that business owners cannot be terminated"""
        # First get the owner's employee ID
        response = requests.get(
            f"{BASE_URL}/api/admin/employees",
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch employees")
        
        employees = response.json()
        owner = next(
            (e for e in employees if e.get("email", "").lower() == "matthewjesusguzman1@gmail.com"),
            None
        )
        
        if not owner:
            pytest.skip("Owner not found in employees list")
        
        # Try to terminate the owner
        response = requests.post(
            f"{BASE_URL}/api/employee-terminations/terminate",
            headers=auth_headers,
            json={
                "employee_id": owner["id"],
                "reason": "Performance",
                "reason_details": "Test",
                "notes": "Test"
            }
        )
        assert response.status_code == 403
        assert "owner" in response.json().get("detail", "").lower()
    
    def test_get_nonexistent_termination_detail(self, auth_headers):
        """Test getting details of non-existent termination returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/employee-terminations/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_nonexistent_termination(self, auth_headers):
        """Test deleting non-existent termination returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/employee-terminations/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestInterviewResponsePublicEndpoint:
    """Test public interview response endpoint"""
    
    def test_invalid_token_returns_404(self):
        """Test that invalid interview token returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/public/interview-response/invalid-token-test-123"
        )
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower()
    
    def test_submit_with_invalid_token_returns_404(self):
        """Test that submitting with invalid token returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/applicant-tests/public/interview-response/invalid-token-test-123",
            json={
                "availability_text": "Monday 9am-5pm",
                "additional_notes": "Test notes"
            }
        )
        assert response.status_code == 404


class TestApplicantTestsEndpoints:
    """Test applicant tests endpoints"""
    
    def test_list_tests(self, auth_headers):
        """Test GET /api/applicant-tests/list returns tests"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert isinstance(data["tests"], list)
    
    def test_get_default_fields(self, auth_headers):
        """Test GET /api/applicant-tests/default-fields returns fields"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/default-fields",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "fields" in data
        assert isinstance(data["fields"], list)
        assert len(data["fields"]) > 0


class TestInterviewInboxBug:
    """Test for interview inbox route ordering bug"""
    
    def test_interview_inbox_route_bug(self, auth_headers):
        """
        BUG: /interview-inbox is being matched as /{test_id} because it's defined after the wildcard route.
        This test documents the bug - it should return {"requests": []} but returns {"detail": "Test not found"}
        """
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=auth_headers
        )
        # This SHOULD be 200 with {"requests": [...]}
        # But due to route ordering bug, it returns 404 with {"detail": "Test not found"}
        if response.status_code == 404 and "Test not found" in response.json().get("detail", ""):
            pytest.fail(
                "BUG: /interview-inbox route is being matched as /{test_id}. "
                "The route needs to be moved BEFORE the /{test_id} route in applicant_tests.py"
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
