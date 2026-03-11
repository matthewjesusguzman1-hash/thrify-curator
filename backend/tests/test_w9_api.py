"""
W-9 Management API Tests
Tests for both admin and employee W-9 endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://consign-portal-1.preview.emergentagent.com').rstrip('/')

# Test data
TEST_EMPLOYEE_ID = '6707c692-416d-4bd1-9596-2a9950419e2c'
TEST_EMPLOYEE_EMAIL = 'testemployee@thriftycurator.com'
ADMIN_EMAIL = 'matthewjesusguzman1@gmail.com'
ADMIN_CODE = '4399'
W9_DOC_ID = 'a0de9d4c-58d6-4c9c-9add-b66000604bc1'


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def employee_token(api_client):
    """Get employee authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMPLOYEE_EMAIL
    })
    assert response.status_code == 200, f"Employee login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture
def employee_client(api_client, employee_token):
    """Session with employee auth header"""
    api_client.headers.update({"Authorization": f"Bearer {employee_token}"})
    return api_client


class TestAdminW9Endpoints:
    """Tests for admin W-9 management endpoints"""
    
    def test_get_all_employees_with_w9_status(self, admin_client):
        """GET /api/admin/employees should include W-9 status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/employees")
        assert response.status_code == 200
        
        employees = response.json()
        assert isinstance(employees, list)
        
        # Find test employee and verify W-9 fields are present
        test_emp = next((e for e in employees if e['id'] == TEST_EMPLOYEE_ID), None)
        assert test_emp is not None, "Test employee not found"
        assert 'has_w9' in test_emp, "has_w9 field missing"
        assert test_emp['has_w9'] == True, "Test employee should have W-9"
        
    def test_get_employee_w9_status(self, admin_client):
        """GET /api/admin/employees/{id}/w9/status should return W-9 status"""
        response = admin_client.get(f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data['has_w9'] == True
        assert 'w9_documents' in data
        assert isinstance(data['w9_documents'], list)
        assert len(data['w9_documents']) > 0
        
    def test_get_employee_w9_documents(self, admin_client):
        """GET /api/admin/employees/{id}/w9 should return W-9 documents"""
        response = admin_client.get(f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9")
        assert response.status_code == 200
        
        data = response.json()
        assert 'w9_documents' in data
        
        # Verify document structure
        docs = data['w9_documents']
        assert len(docs) > 0
        
        # Check that at least one document has proper structure
        doc_with_id = next((d for d in docs if d.get('id')), None)
        assert doc_with_id is not None, "No W-9 documents with 'id' field found"
        assert 'employee_id' in doc_with_id
        assert 'filename' in doc_with_id
        assert 'status' in doc_with_id
        
    def test_download_w9_document(self, admin_client):
        """GET /api/admin/employees/{id}/w9/{doc_id} should download W-9"""
        response = admin_client.get(
            f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/{W9_DOC_ID}",
            headers={"Accept": "*/*"}
        )
        assert response.status_code == 200
        
        # Should return binary content (PDF or image)
        content_type = response.headers.get('content-type', '')
        assert any(t in content_type for t in ['pdf', 'image', 'octet']), \
            f"Expected PDF/image content type, got: {content_type}"
        
    def test_approve_w9_document(self, admin_client):
        """POST /api/admin/employees/{id}/w9/{doc_id}/approve should approve W-9"""
        response = admin_client.post(
            f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/{W9_DOC_ID}/approve"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data
        assert 'approved' in data['message'].lower()
        
    def test_get_pending_w9s(self, admin_client):
        """GET /api/admin/w9/pending should return pending W-9s"""
        response = admin_client.get(f"{BASE_URL}/api/admin/w9/pending")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_download_nonexistent_w9(self, admin_client):
        """GET /api/admin/employees/{id}/w9/{bad_id} should return 404"""
        fake_id = str(uuid.uuid4())
        response = admin_client.get(
            f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/{fake_id}"
        )
        assert response.status_code == 404


class TestEmployeeW9Endpoints:
    """Tests for employee W-9 endpoints"""
    
    def test_get_own_w9_status(self, employee_client):
        """GET /api/time/w9/status should return employee's W-9 status"""
        response = employee_client.get(f"{BASE_URL}/api/time/w9/status")
        assert response.status_code == 200
        
        data = response.json()
        assert 'status' in data
        assert 'has_w9' in data
        assert 'w9_documents' in data
        
    def test_download_own_w9(self, employee_client):
        """GET /api/time/w9/download should download employee's W-9"""
        response = employee_client.get(
            f"{BASE_URL}/api/time/w9/download",
            headers={"Accept": "*/*"}
        )
        
        # If employee has W-9, should return 200 with content
        # If not, should return 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            assert any(t in content_type for t in ['pdf', 'image', 'octet'])
            
    def test_download_specific_w9(self, employee_client):
        """GET /api/time/w9/download/{doc_id} should download specific W-9"""
        response = employee_client.get(
            f"{BASE_URL}/api/time/w9/download/{W9_DOC_ID}",
            headers={"Accept": "*/*"}
        )
        assert response.status_code == 200
        
        content_type = response.headers.get('content-type', '')
        assert any(t in content_type for t in ['pdf', 'image', 'octet'])


class TestW9UploadEndpoint:
    """Tests for W-9 upload endpoint behavior"""
    
    def test_employee_w9_upload_generates_id(self, employee_client):
        """POST /api/time/w9/upload should generate unique ID for document"""
        # Create a simple test PDF-like file
        test_content = b'%PDF-1.4 test content'
        files = {
            'file': ('test_w9_upload.pdf', test_content, 'application/pdf')
        }
        
        # Remove Content-Type header for multipart upload
        del employee_client.headers['Content-Type']
        
        response = employee_client.post(
            f"{BASE_URL}/api/time/w9/upload",
            files=files,
            data={'notes': 'Test upload from pytest'}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert 'id' in data, "Response should contain 'id' field"
        assert 'filename' in data
        assert 'uploaded_at' in data
        
        # Store the ID for cleanup
        doc_id = data['id']
        
        # Verify the document was stored with ID
        employee_client.headers['Content-Type'] = 'application/json'
        status_response = employee_client.get(f"{BASE_URL}/api/time/w9/status")
        status_data = status_response.json()
        
        docs_with_id = [d for d in status_data.get('w9_documents', []) if d.get('id') == doc_id]
        assert len(docs_with_id) == 1, "Uploaded document should have ID in status response"
        
        # Verify notes were stored
        assert docs_with_id[0].get('notes') == 'Test upload from pytest', "Notes should be stored"
        
        # Cleanup - delete the test document
        cleanup_response = employee_client.delete(f"{BASE_URL}/api/time/w9/{doc_id}")
        assert cleanup_response.status_code == 200, "Cleanup failed"


class TestW9DocumentFiltering:
    """Tests to verify W-9 documents are properly filtered/displayed"""
    
    def test_w9_documents_have_required_fields(self, admin_client):
        """Verify all W-9 documents have required fields for UI display"""
        response = admin_client.get(f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/status")
        assert response.status_code == 200
        
        docs = response.json().get('w9_documents', [])
        
        required_fields = ['employee_id', 'status', 'uploaded_at', 'filename']
        
        for doc in docs:
            for field in required_fields:
                assert field in doc, f"Document missing required field: {field}"
                
    def test_documents_with_id_are_returned(self, admin_client):
        """Verify that documents with ID are included in response"""
        response = admin_client.get(f"{BASE_URL}/api/admin/employees/{TEST_EMPLOYEE_ID}/w9/status")
        assert response.status_code == 200
        
        docs = response.json().get('w9_documents', [])
        docs_with_id = [d for d in docs if d.get('id')]
        
        # At least the test document should have an ID
        assert len(docs_with_id) >= 1, "At least one document should have 'id' field"
        
        # Verify our test document is present
        test_doc = next((d for d in docs_with_id if d['id'] == W9_DOC_ID), None)
        assert test_doc is not None, f"Test document {W9_DOC_ID} not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
