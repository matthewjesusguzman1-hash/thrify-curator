"""
W-9 Management API Tests
Tests W-9 view, download, and delete functionality for:
- Admin: All Employees table W-9 buttons
- Admin: W-9 Viewer Modal
- Admin: Edit Employee Modal W-9 section
- Employee: Dashboard W-9 section
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test users
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
EMPLOYEE_EMAIL = "lisa.martinez@thriftycurator.com"

# Known employee IDs with W-9 documents
LISA_MARTINEZ_ID = "7f7731bf-a24e-475f-8353-c1069a7c6fd8"
JAMES_WILSON_ID = "6654a8f9-63f7-4b11-85fb-5aa7ef6c783c"
SARAH_JOHNSON_ID = "ccbe3646-201e-4952-9933-af327b85c786"


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def employee_token():
    """Get employee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL
    })
    assert response.status_code == 200, f"Employee login failed: {response.text}"
    return response.json()["access_token"]


class TestAdminW9Status:
    """Test Admin W-9 status endpoint - used by All Employees table"""
    
    def test_get_w9_status_james_wilson(self, admin_token):
        """James Wilson has 1 W-9 document"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{JAMES_WILSON_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_w9"] == True
        assert "w9_documents" in data
        assert len(data["w9_documents"]) >= 1
        # Verify each document has an 'id' field
        for doc in data["w9_documents"]:
            assert "id" in doc, f"Document missing 'id' field: {doc}"
    
    def test_get_w9_status_lisa_martinez(self, admin_token):
        """Lisa Martinez has 3 W-9 documents"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{LISA_MARTINEZ_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_w9"] == True
        assert data["total_documents"] == 3
        assert len(data["w9_documents"]) == 3
        # Verify all documents have 'id' field
        for doc in data["w9_documents"]:
            assert "id" in doc, f"Document missing 'id' field: {doc}"
    
    def test_get_w9_status_sarah_johnson(self, admin_token):
        """Sarah Johnson has 1 W-9 document"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{SARAH_JOHNSON_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_w9"] == True
        assert len(data["w9_documents"]) >= 1
        for doc in data["w9_documents"]:
            assert "id" in doc, f"Document missing 'id' field: {doc}"


class TestAdminW9Download:
    """Test Admin W-9 download endpoint - used by W-9 Viewer Modal and Edit Employee Modal"""
    
    def test_download_w9_james_wilson(self, admin_token):
        """Download W-9 for James Wilson"""
        # First get the document ID
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{JAMES_WILSON_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert status_response.status_code == 200
        docs = status_response.json()["w9_documents"]
        assert len(docs) > 0, "James Wilson should have W-9 documents"
        doc_id = docs[0]["id"]
        
        # Now download the document
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{JAMES_WILSON_ID}/w9/{doc_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_download_w9_lisa_martinez(self, admin_token):
        """Download W-9 for Lisa Martinez (first document)"""
        # First get the document ID
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{LISA_MARTINEZ_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert status_response.status_code == 200
        docs = status_response.json()["w9_documents"]
        assert len(docs) > 0, "Lisa Martinez should have W-9 documents"
        doc_id = docs[0]["id"]
        
        # Now download the document
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{LISA_MARTINEZ_ID}/w9/{doc_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_download_w9_sarah_johnson(self, admin_token):
        """Download W-9 for Sarah Johnson"""
        # First get the document ID
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{SARAH_JOHNSON_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert status_response.status_code == 200
        docs = status_response.json()["w9_documents"]
        assert len(docs) > 0, "Sarah Johnson should have W-9 documents"
        doc_id = docs[0]["id"]
        
        # Now download the document
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{SARAH_JOHNSON_ID}/w9/{doc_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_download_nonexistent_w9(self, admin_token):
        """Should return 404 for non-existent W-9"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{JAMES_WILSON_ID}/w9/nonexistent-doc-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404


class TestEmployeeW9Status:
    """Test Employee W-9 status endpoint - used by Employee Dashboard"""
    
    def test_employee_get_own_w9_status(self, employee_token):
        """Employee can view their own W-9 status"""
        response = requests.get(
            f"{BASE_URL}/api/time/w9/status",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "has_w9" in data
        assert "w9_documents" in data
        # Lisa Martinez should have W-9s
        assert data["has_w9"] == True
        assert len(data["w9_documents"]) >= 1
        # Verify documents have 'id' field
        for doc in data["w9_documents"]:
            assert "id" in doc, f"Document missing 'id' field: {doc}"


class TestEmployeeW9Download:
    """Test Employee W-9 download endpoint - used by Employee Dashboard View/Download buttons"""
    
    def test_employee_download_own_w9_by_id(self, employee_token):
        """Employee can download their own W-9 by document ID"""
        # First get the document ID
        status_response = requests.get(
            f"{BASE_URL}/api/time/w9/status",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert status_response.status_code == 200
        docs = status_response.json()["w9_documents"]
        assert len(docs) > 0, "Lisa Martinez should have W-9 documents"
        doc_id = docs[0]["id"]
        
        # Download the specific document
        response = requests.get(
            f"{BASE_URL}/api/time/w9/download/{doc_id}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_employee_download_latest_w9(self, employee_token):
        """Employee can download their latest W-9 (backward compatibility)"""
        response = requests.get(
            f"{BASE_URL}/api/time/w9/download",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_employee_download_nonexistent_w9(self, employee_token):
        """Should return 404 for non-existent W-9"""
        response = requests.get(
            f"{BASE_URL}/api/time/w9/download/nonexistent-doc-id",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 404


class TestW9RouteOrdering:
    """Test that /status route is matched before /{doc_id} route"""
    
    def test_status_route_not_matched_as_doc_id(self, admin_token):
        """Ensure /status is not interpreted as a doc_id parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{JAMES_WILSON_ID}/w9/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return W-9 status, not 404 (which would happen if 'status' was treated as doc_id)
        assert response.status_code == 200
        data = response.json()
        assert "has_w9" in data
        assert "w9_documents" in data
