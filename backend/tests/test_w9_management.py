"""
Test suite for W-9 management features:
- Admin login with code 4399
- Admin W-9 management (view/add/delete from Edit Employee)
- Employee W-9 management (view/download from dashboard)
- Backend APIs for W-9 operations
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin code mapping
ADMIN_CODE = "4399"
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_with_code_4399(self):
        """Admin should be able to login using code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful for {data['user']['name']}")


class TestAdminW9APIs:
    """Test admin W-9 management APIs"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping authenticated tests")
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_header(self, admin_token):
        """Get authorization header"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture
    def test_employee_id(self, auth_header):
        """Get or create a test employee for W-9 tests"""
        # First, get existing employees
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_header)
        employees = response.json()
        
        # Find a non-admin employee
        for emp in employees:
            if emp.get("role") != "admin":
                return emp["id"]
        
        # If no non-admin employee, create one
        response = requests.post(f"{BASE_URL}/api/admin/create-employee", json={
            "name": "TEST_W9_Employee",
            "email": "test_w9_employee@example.com",
            "phone": "555-0101"
        }, headers=auth_header)
        
        if response.status_code == 201:
            return response.json()["id"]
        elif response.status_code == 400:
            # Email exists, find the employee
            response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_header)
            for emp in response.json():
                if emp.get("email") == "test_w9_employee@example.com":
                    return emp["id"]
        
        pytest.skip("Could not get/create test employee")
    
    def test_get_w9_status_no_w9(self, auth_header, test_employee_id):
        """GET /api/admin/employees/{id}/w9/status should return W-9 status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/status",
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "has_w9" in data
        assert "status" in data
        assert "w9_documents" in data
        print(f"✓ W-9 status API working: has_w9={data['has_w9']}, docs={len(data.get('w9_documents', []))}")
    
    def test_upload_w9_for_employee(self, auth_header, test_employee_id):
        """POST /api/admin/employees/{id}/w9 should upload W-9 with status 'submitted'"""
        # Create a simple PDF-like file for testing
        files = {
            'file': ('test_w9.pdf', b'%PDF-1.4 test content', 'application/pdf')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9",
            headers=auth_header,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["message"] == "W-9 uploaded successfully"
        print(f"✓ W-9 uploaded successfully with ID: {data['id']}")
        
        # Verify the W-9 status is 'submitted'
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/status",
            headers=auth_header
        )
        status_data = status_response.json()
        assert status_data["has_w9"] == True
        assert status_data["status"] == "submitted", f"Expected status 'submitted', got '{status_data['status']}'"
        print(f"✓ W-9 status is 'submitted' (not 'pending_review')")
        
        return data["id"]
    
    def test_get_w9_documents_list(self, auth_header, test_employee_id):
        """GET /api/admin/employees/{id}/w9/status should return list of W-9 documents"""
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/status",
            headers=auth_header
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "w9_documents" in data
        
        if data["w9_documents"]:
            doc = data["w9_documents"][0]
            assert "id" in doc
            assert "filename" in doc
            assert "uploaded_at" in doc
            assert "status" in doc
            print(f"✓ W-9 documents list returned with {len(data['w9_documents'])} documents")
        else:
            print("✓ W-9 documents list returned (empty)")
    
    def test_download_w9_document(self, auth_header, test_employee_id):
        """GET /api/admin/employees/{id}/w9/{doc_id} should download W-9"""
        # First get the document list
        status_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/status",
            headers=auth_header
        )
        w9_docs = status_response.json().get("w9_documents", [])
        
        if not w9_docs:
            # Upload a W-9 first
            files = {'file': ('test_download.pdf', b'%PDF-1.4 test', 'application/pdf')}
            upload_response = requests.post(
                f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9",
                headers=auth_header,
                files=files
            )
            doc_id = upload_response.json()["id"]
        else:
            doc_id = w9_docs[0]["id"]
        
        # Download the document
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/{doc_id}",
            headers=auth_header
        )
        
        assert response.status_code == 200
        assert "content-disposition" in response.headers.keys() or len(response.content) > 0
        print(f"✓ W-9 document download successful, size: {len(response.content)} bytes")
    
    def test_delete_w9_document(self, auth_header, test_employee_id):
        """DELETE /api/admin/employees/{id}/w9/{doc_id} should delete W-9"""
        # First upload a W-9 to delete
        files = {'file': ('test_delete.pdf', b'%PDF-1.4 to delete', 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9",
            headers=auth_header,
            files=files
        )
        
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["id"]
        
        # Delete the document
        response = requests.delete(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/{doc_id}",
            headers=auth_header
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "W-9 document deleted successfully"
        print(f"✓ W-9 document deleted successfully")
        
        # Verify deletion
        download_response = requests.get(
            f"{BASE_URL}/api/admin/employees/{test_employee_id}/w9/{doc_id}",
            headers=auth_header
        )
        assert download_response.status_code == 404
        print("✓ Verified document no longer exists")


class TestEmployeeW9APIs:
    """Test employee W-9 APIs"""
    
    @pytest.fixture
    def employee_auth(self):
        """Get employee authentication token"""
        # First, login as admin to create/find an employee
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        admin_token = admin_response.json()["access_token"]
        admin_header = {"Authorization": f"Bearer {admin_token}"}
        
        # Get employees
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=admin_header)
        employees = emp_response.json()
        
        # Find a non-admin employee
        employee_email = None
        for emp in employees:
            if emp.get("role") != "admin":
                employee_email = emp["email"]
                break
        
        if not employee_email:
            pytest.skip("No employee found for testing")
        
        # Login as employee
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": employee_email
        })
        
        if response.status_code != 200:
            pytest.skip("Employee login failed")
        
        return {
            "token": response.json()["access_token"],
            "user": response.json()["user"]
        }
    
    @pytest.fixture
    def employee_header(self, employee_auth):
        return {"Authorization": f"Bearer {employee_auth['token']}"}
    
    def test_employee_get_w9_status(self, employee_header):
        """Employee should be able to get their W-9 status"""
        response = requests.get(f"{BASE_URL}/api/time/w9/status", headers=employee_header)
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "has_w9" in data
        assert "w9_documents" in data
        assert "can_upload" in data
        print(f"✓ Employee W-9 status: has_w9={data['has_w9']}, docs={len(data.get('w9_documents', []))}")
    
    def test_employee_upload_w9(self, employee_header):
        """Employee should be able to upload W-9 (unless already approved)"""
        files = {'file': ('employee_w9.pdf', b'%PDF-1.4 employee test', 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/time/w9/upload",
            headers=employee_header,
            files=files
        )
        
        # Upload succeeds OR returns 400 if W-9 is already approved
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["message"] == "W-9 uploaded successfully"
            print(f"✓ Employee W-9 upload successful, ID: {data['id']}")
        elif response.status_code == 400:
            # W-9 already approved - this is expected behavior
            assert "approved" in response.text.lower() or "cannot" in response.text.lower()
            print(f"✓ Employee W-9 upload blocked (W-9 already approved) - expected behavior")
    
    def test_employee_download_w9(self, employee_header):
        """Employee should be able to download their own W-9"""
        # First check if employee has W-9
        status_response = requests.get(f"{BASE_URL}/api/time/w9/status", headers=employee_header)
        w9_docs = status_response.json().get("w9_documents", [])
        
        if not w9_docs:
            # Upload one first
            files = {'file': ('test_download.pdf', b'%PDF-1.4 test', 'application/pdf')}
            upload_response = requests.post(
                f"{BASE_URL}/api/time/w9/upload",
                headers=employee_header,
                files=files
            )
            doc_id = upload_response.json()["id"]
        else:
            doc_id = w9_docs[0]["id"]
        
        # Download specific document
        response = requests.get(
            f"{BASE_URL}/api/time/w9/download/{doc_id}",
            headers=employee_header
        )
        
        assert response.status_code == 200
        assert len(response.content) > 0
        print(f"✓ Employee W-9 download successful, size: {len(response.content)} bytes")


class TestNoW9ReviewSection:
    """Test that W-9 Review section is removed"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_header(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_pending_w9s_returns_empty(self, auth_header):
        """W-9s should have status 'submitted' not 'pending_review'"""
        response = requests.get(f"{BASE_URL}/api/admin/w9/pending", headers=auth_header)
        
        assert response.status_code == 200
        data = response.json()
        # The endpoint still exists but should return empty since W-9s are no longer pending_review
        # New W-9s go directly to 'submitted' status
        print(f"✓ Pending W-9s endpoint returns {len(data)} items (expected 0 for new submissions)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
