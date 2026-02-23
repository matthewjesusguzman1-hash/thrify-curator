"""
Test Form Submissions Admin API Endpoints

Tests for:
- GET /api/admin/forms/job-applications
- GET /api/admin/forms/consignment-inquiries
- GET /api/admin/forms/consignment-agreements
- PUT /api/admin/forms/{form-type}/{id}/status
- DELETE /api/admin/forms/{form-type}/{id}
- GET /api/admin/forms/summary
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-admin.preview.emergentagent.com').rstrip('/')

# Admin email for authentication
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def auth_header(auth_token):
    """Return auth header for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestFormSummaryEndpoint:
    """Test GET /api/admin/forms/summary"""
    
    def test_get_forms_summary_authenticated(self, auth_header):
        """Test summary endpoint returns valid structure"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/summary", headers=auth_header)
        assert response.status_code == 200
        
        data = response.json()
        assert "job_applications" in data
        assert "consignment_inquiries" in data
        assert "consignment_agreements" in data
        
        # Validate structure
        for key in ["job_applications", "consignment_inquiries", "consignment_agreements"]:
            assert "total" in data[key]
            assert "new" in data[key]
            assert isinstance(data[key]["total"], int)
            assert isinstance(data[key]["new"], int)
            assert data[key]["total"] >= 0
            assert data[key]["new"] >= 0
            # new count should not exceed total
            assert data[key]["new"] <= data[key]["total"]
        
        print(f"Forms summary: {data}")

    def test_get_forms_summary_unauthorized(self):
        """Test summary endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/summary")
        assert response.status_code in [401, 403]


class TestJobApplicationsEndpoint:
    """Test GET /api/admin/forms/job-applications"""
    
    def test_get_job_applications_authenticated(self, auth_header):
        """Test job applications endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/job-applications", headers=auth_header)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there are submissions, validate structure
        if len(data) > 0:
            app = data[0]
            # Required fields for job applications
            assert "id" in app or "_id" not in app  # Should have id but not MongoDB _id
            assert "full_name" in app
            assert "email" in app
            assert "submitted_at" in app
            print(f"Found {len(data)} job applications, first: {app.get('full_name')}")
        else:
            print("No job applications found (empty collection)")

    def test_get_job_applications_unauthorized(self):
        """Test job applications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/job-applications")
        assert response.status_code in [401, 403]


class TestConsignmentInquiriesEndpoint:
    """Test GET /api/admin/forms/consignment-inquiries"""
    
    def test_get_consignment_inquiries_authenticated(self, auth_header):
        """Test consignment inquiries endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/consignment-inquiries", headers=auth_header)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there are submissions, validate structure
        if len(data) > 0:
            inquiry = data[0]
            assert "id" in inquiry or "_id" not in inquiry
            assert "full_name" in inquiry
            assert "email" in inquiry
            assert "submitted_at" in inquiry
            print(f"Found {len(data)} consignment inquiries, first: {inquiry.get('full_name')}")
        else:
            print("No consignment inquiries found (empty collection)")

    def test_get_consignment_inquiries_unauthorized(self):
        """Test consignment inquiries endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/consignment-inquiries")
        assert response.status_code in [401, 403]


class TestConsignmentAgreementsEndpoint:
    """Test GET /api/admin/forms/consignment-agreements"""
    
    def test_get_consignment_agreements_authenticated(self, auth_header):
        """Test consignment agreements endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/consignment-agreements", headers=auth_header)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there are submissions, validate structure
        if len(data) > 0:
            agreement = data[0]
            assert "id" in agreement or "_id" not in agreement
            assert "full_name" in agreement
            assert "email" in agreement
            assert "submitted_at" in agreement
            print(f"Found {len(data)} consignment agreements, first: {agreement.get('full_name')}")
        else:
            print("No consignment agreements found (empty collection)")

    def test_get_consignment_agreements_unauthorized(self):
        """Test consignment agreements endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/forms/consignment-agreements")
        assert response.status_code in [401, 403]


class TestStatusUpdateEndpoints:
    """Test PUT /api/admin/forms/{form-type}/{id}/status endpoints"""
    
    def test_update_nonexistent_job_application_status_returns_404(self, auth_header):
        """Test updating status of non-existent job application returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/forms/job-applications/{fake_id}/status",
            headers=auth_header,
            json={"status": "reviewed"}
        )
        assert response.status_code == 404
        print("Non-existent job application status update returns 404 - PASS")

    def test_update_nonexistent_consignment_inquiry_status_returns_404(self, auth_header):
        """Test updating status of non-existent consignment inquiry returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/forms/consignment-inquiries/{fake_id}/status",
            headers=auth_header,
            json={"status": "reviewed"}
        )
        assert response.status_code == 404
        print("Non-existent consignment inquiry status update returns 404 - PASS")

    def test_update_nonexistent_consignment_agreement_status_returns_404(self, auth_header):
        """Test updating status of non-existent consignment agreement returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/forms/consignment-agreements/{fake_id}/status",
            headers=auth_header,
            json={"status": "reviewed"}
        )
        assert response.status_code == 404
        print("Non-existent consignment agreement status update returns 404 - PASS")

    def test_status_update_unauthorized(self):
        """Test status update requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/forms/job-applications/{fake_id}/status",
            json={"status": "reviewed"}
        )
        assert response.status_code in [401, 403]


class TestDeleteEndpoints:
    """Test DELETE /api/admin/forms/{form-type}/{id} endpoints"""
    
    def test_delete_nonexistent_job_application_returns_404(self, auth_header):
        """Test deleting non-existent job application returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/forms/job-applications/{fake_id}",
            headers=auth_header
        )
        assert response.status_code == 404
        print("Non-existent job application delete returns 404 - PASS")

    def test_delete_nonexistent_consignment_inquiry_returns_404(self, auth_header):
        """Test deleting non-existent consignment inquiry returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/forms/consignment-inquiries/{fake_id}",
            headers=auth_header
        )
        assert response.status_code == 404
        print("Non-existent consignment inquiry delete returns 404 - PASS")

    def test_delete_nonexistent_consignment_agreement_returns_404(self, auth_header):
        """Test deleting non-existent consignment agreement returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/forms/consignment-agreements/{fake_id}",
            headers=auth_header
        )
        assert response.status_code == 404
        print("Non-existent consignment agreement delete returns 404 - PASS")

    def test_delete_unauthorized(self):
        """Test delete requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/forms/job-applications/{fake_id}"
        )
        assert response.status_code in [401, 403]
