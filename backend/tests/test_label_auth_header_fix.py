"""
Test Label Preview Authorization Header Fix
Tests the fix for iPhone bug where localStorage.getItem('token') returns null.
Backend now accepts both ?token= query param AND Authorization: Bearer header.

Key endpoints tested:
- GET /api/orders/labels/{id}/preview with Authorization header
- GET /api/orders/labels/{id}/preview with ?token= query param (backward compat)
- GET /api/orders/labels/{id}/file with Authorization header
- GET /api/orders/labels/{id}/file with ?token= query param
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Known label IDs from the test assignment
LABEL_IDS = [
    "9fbe38b9-c649-4dd5-a70d-12e72c585cdf",
    "f8dc7d04-0a71-4993-95cd-ac61601af137",
    "24706347-9ea7-4214-953c-7a6c387bac3e",
    "40877c66-9bbd-459c-8312-0f1fe51964e7",
    "11c4bfbe-15e8-4d61-beb5-aa3a0dfa4a3c"
]


class TestLabelAuthHeaderFix:
    """Test that label endpoints accept both query param and Authorization header"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testemployee@thriftycurator.com"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as employee: {login_response.text}")
        
        return login_response.json().get("access_token")
    
    # ============== PREVIEW ENDPOINT TESTS ==============
    
    def test_preview_with_authorization_header(self, employee_token):
        """Test GET /api/orders/labels/{id}/preview with Authorization: Bearer header"""
        label_id = LABEL_IDS[0]
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/preview",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200 with Auth header, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        assert "image/" in content_type, f"Expected image content-type, got {content_type}"
        
        # Verify substantial image data (158KB+ expected)
        assert len(response.content) > 50000, f"Expected large image, got {len(response.content)} bytes"
        
        print(f"PASS: Preview with Authorization header - {len(response.content)} bytes, {content_type}")
    
    def test_preview_with_query_param_token(self, employee_token):
        """Test GET /api/orders/labels/{id}/preview with ?token= query param (backward compat)"""
        label_id = LABEL_IDS[1]
        
        response = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/preview?token={employee_token}"
        )
        
        assert response.status_code == 200, f"Expected 200 with query token, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        assert "image/" in content_type, f"Expected image content-type, got {content_type}"
        
        print(f"PASS: Preview with query param token - {len(response.content)} bytes, {content_type}")
    
    def test_preview_with_no_auth_returns_401(self):
        """Test GET /api/orders/labels/{id}/preview with no auth returns 401"""
        label_id = LABEL_IDS[0]
        
        response = requests.get(f"{BASE_URL}/api/orders/labels/{label_id}/preview")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Preview without auth returns 401")
    
    def test_preview_with_null_token_returns_401(self):
        """Test GET /api/orders/labels/{id}/preview?token=null returns 401 (the iPhone bug scenario)"""
        label_id = LABEL_IDS[0]
        
        response = requests.get(f"{BASE_URL}/api/orders/labels/{label_id}/preview?token=null")
        
        assert response.status_code == 401, f"Expected 401 with token=null, got {response.status_code}"
        print("PASS: Preview with token=null returns 401")
    
    # ============== FILE ENDPOINT TESTS ==============
    
    def test_file_with_authorization_header(self, employee_token):
        """Test GET /api/orders/labels/{id}/file with Authorization: Bearer header"""
        label_id = LABEL_IDS[2]
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/file",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200 with Auth header, got {response.status_code}: {response.text}"
        
        # File endpoint returns original file (PDF or image)
        content_type = response.headers.get("content-type", "")
        assert content_type, "Should have content-type header"
        
        print(f"PASS: File with Authorization header - {len(response.content)} bytes, {content_type}")
    
    def test_file_with_query_param_token(self, employee_token):
        """Test GET /api/orders/labels/{id}/file with ?token= query param"""
        label_id = LABEL_IDS[3]
        
        response = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/file?token={employee_token}"
        )
        
        assert response.status_code == 200, f"Expected 200 with query token, got {response.status_code}: {response.text}"
        
        print(f"PASS: File with query param token - {len(response.content)} bytes")
    
    def test_file_with_no_auth_returns_401(self):
        """Test GET /api/orders/labels/{id}/file with no auth returns 401"""
        label_id = LABEL_IDS[0]
        
        response = requests.get(f"{BASE_URL}/api/orders/labels/{label_id}/file")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: File without auth returns 401")
    
    # ============== ALL 5 LABELS TEST ==============
    
    def test_all_5_labels_load_with_auth_header(self, employee_token):
        """Test all 5 label previews load successfully with Authorization header"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        results = []
        for label_id in LABEL_IDS:
            response = requests.get(
                f"{BASE_URL}/api/orders/labels/{label_id}/preview",
                headers=headers
            )
            
            results.append({
                "label_id": label_id[:8],
                "status": response.status_code,
                "size": len(response.content) if response.status_code == 200 else 0,
                "content_type": response.headers.get("content-type", "")
            })
        
        # All should succeed
        for r in results:
            assert r["status"] == 200, f"Label {r['label_id']} failed: {r['status']}"
            assert r["size"] > 50000, f"Label {r['label_id']} too small: {r['size']} bytes"
        
        print(f"PASS: All 5 labels loaded successfully with Authorization header:")
        for r in results:
            print(f"  - {r['label_id']}: {r['size']} bytes ({r['content_type']})")
    
    # ============== BOTH AUTH METHODS RETURN SAME DATA ==============
    
    def test_both_auth_methods_return_same_data(self, employee_token):
        """Verify both auth methods return identical image data"""
        label_id = LABEL_IDS[4]
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Fetch with Authorization header
        response_header = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/preview",
            headers=headers
        )
        
        # Fetch with query param
        response_query = requests.get(
            f"{BASE_URL}/api/orders/labels/{label_id}/preview?token={employee_token}"
        )
        
        assert response_header.status_code == 200
        assert response_query.status_code == 200
        
        # Both should return same content
        assert response_header.content == response_query.content, "Both auth methods should return identical data"
        
        print(f"PASS: Both auth methods return identical {len(response_header.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
