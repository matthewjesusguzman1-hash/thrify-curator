"""
Test W-9 Approve Endpoint
Tests the POST /api/admin/employees/{id}/w9/{doc_id}/approve endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://thrifty-curator-2.preview.emergentagent.com')


class TestW9ApproveEndpoint:
    """Test W-9 document approval endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token using code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_login_with_code(self):
        """Test admin can login with code 4399"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Matthew Guzman"
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_get_employees_w9_status(self, auth_headers):
        """Test fetching employees shows W-9 status"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth_headers)
        assert response.status_code == 200
        employees = response.json()
        
        # Find Lisa Martinez (has 4 W-9s according to review)
        lisa = next((e for e in employees if e["id"] == "7f7731bf-a24e-475f-8353-c1069a7c6fd8"), None)
        assert lisa is not None, "Lisa Martinez not found"
        assert lisa.get("has_w9") == True, "Lisa should have W-9"
        print(f"Lisa Martinez has_w9={lisa.get('has_w9')}, w9_status={lisa.get('w9_status')}")
    
    def test_get_w9_documents_for_employee(self, auth_headers):
        """Test fetching W-9 documents for Lisa Martinez"""
        employee_id = "7f7731bf-a24e-475f-8353-c1069a7c6fd8"
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{employee_id}/w9/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify documents exist
        docs = data.get("w9_documents", [])
        assert len(docs) >= 1, "Should have at least 1 W-9 document"
        print(f"Found {len(docs)} W-9 documents for Lisa Martinez")
        
        # Print document details
        for i, doc in enumerate(docs):
            print(f"  {i+1}. ID={doc.get('id', 'N/A')[:8]}... Status={doc.get('status', 'N/A')} Filename={doc.get('filename', 'N/A')}")
    
    def test_approve_specific_w9_endpoint_exists(self, auth_headers):
        """Test the approve endpoint returns correct responses"""
        employee_id = "7f7731bf-a24e-475f-8353-c1069a7c6fd8"
        
        # Get W-9 documents
        response = requests.get(
            f"{BASE_URL}/api/admin/employees/{employee_id}/w9/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        docs = response.json().get("w9_documents", [])
        
        if not docs:
            pytest.skip("No W-9 documents found to test")
        
        # Find a non-approved document
        non_approved = [d for d in docs if d.get("status") != "approved"]
        
        if non_approved:
            doc_id = non_approved[0]["id"]
            # Test approve endpoint
            approve_response = requests.post(
                f"{BASE_URL}/api/admin/employees/{employee_id}/w9/{doc_id}/approve",
                headers=auth_headers
            )
            assert approve_response.status_code == 200
            assert "message" in approve_response.json()
            print(f"Approved W-9 document {doc_id[:8]}...")
        else:
            # All documents already approved, test with first doc (should succeed)
            doc_id = docs[0]["id"]
            approve_response = requests.post(
                f"{BASE_URL}/api/admin/employees/{employee_id}/w9/{doc_id}/approve",
                headers=auth_headers
            )
            # Already approved doc should still return 200
            assert approve_response.status_code == 200
            print(f"Document {doc_id[:8]}... already approved, endpoint still returns 200")
    
    def test_approve_nonexistent_w9_returns_404(self, auth_headers):
        """Test approving non-existent W-9 returns 404"""
        employee_id = "7f7731bf-a24e-475f-8353-c1069a7c6fd8"
        fake_doc_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/employees/{employee_id}/w9/{fake_doc_id}/approve",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent W-9 document")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
