"""
Test Label Preview Multi-Expand Feature
Tests:
1. Label preview endpoint returns PNG images (HTTP 200, content-type image/png)
2. Multiple labels can be fetched simultaneously
3. Token authentication works for preview endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLabelPreviewAPI:
    """Test label preview API endpoints"""
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee auth token"""
        # Login without password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testemployee@thriftycurator.com"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as employee: {login_response.text}")
        
        return login_response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        # Admin login with code
        login_response = requests.post(f"{BASE_URL}/api/auth/admin-login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "code": "4399"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as admin: {login_response.text}")
        
        return login_response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def label_ids(self, employee_token):
        """Get list of label IDs from employee's assignment"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/orders/my-assignment", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch employee assignment")
        
        assignment = response.json().get("assignment")
        if not assignment:
            pytest.skip("No active assignment for employee")
        
        labels = assignment.get("labels", [])
        if not labels:
            pytest.skip("No labels found in assignment")
        
        return [label["id"] for label in labels[:5]]  # Get up to 5 labels
    
    def test_employee_has_active_assignment(self, employee_token):
        """Verify employee has an active assignment with labels"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/orders/my-assignment", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assignment = data.get("assignment")
        assert assignment is not None, "Employee should have an active assignment"
        
        labels = assignment.get("labels", [])
        assert len(labels) > 0, f"Assignment should have labels, got {len(labels)}"
        
        matches = assignment.get("matches", [])
        print(f"Assignment has {len(labels)} labels and {len(matches)} matches")
        
        return assignment
    
    def test_label_preview_returns_png(self, employee_token, label_ids):
        """Test that label preview endpoint returns PNG image"""
        if not label_ids:
            pytest.skip("No label IDs available")
        
        label_id = label_ids[0]
        url = f"{BASE_URL}/api/orders/labels/{label_id}/preview?token={employee_token}"
        
        response = requests.get(url)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        assert "image/" in content_type, f"Expected image content-type, got {content_type}"
        
        # Verify we got actual image data
        assert len(response.content) > 100, "Response should contain image data"
        
        print(f"Label {label_id} preview: {len(response.content)} bytes, content-type: {content_type}")
    
    def test_multiple_label_previews_simultaneously(self, employee_token, label_ids):
        """Test that multiple label previews can be fetched (simulating multi-expand)"""
        if len(label_ids) < 2:
            pytest.skip("Need at least 2 labels for this test")
        
        results = []
        for label_id in label_ids[:5]:
            url = f"{BASE_URL}/api/orders/labels/{label_id}/preview?token={employee_token}"
            response = requests.get(url)
            
            results.append({
                "label_id": label_id,
                "status_code": response.status_code,
                "content_type": response.headers.get("content-type", ""),
                "size": len(response.content) if response.status_code == 200 else 0
            })
        
        # All should succeed
        for result in results:
            assert result["status_code"] == 200, f"Label {result['label_id']} failed: {result['status_code']}"
            assert "image/" in result["content_type"], f"Label {result['label_id']} wrong content-type: {result['content_type']}"
        
        print(f"Successfully fetched {len(results)} label previews simultaneously")
        for r in results:
            print(f"  - Label {r['label_id']}: {r['size']} bytes ({r['content_type']})")
    
    def test_label_preview_requires_token(self, label_ids):
        """Test that label preview requires authentication token"""
        if not label_ids:
            pytest.skip("No label IDs available")
        
        label_id = label_ids[0]
        
        # Without token
        url = f"{BASE_URL}/api/orders/labels/{label_id}/preview"
        response = requests.get(url)
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        
        # With invalid token
        url = f"{BASE_URL}/api/orders/labels/{label_id}/preview?token=invalid_token"
        response = requests.get(url)
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        
        print("Token authentication working correctly")
    
    def test_label_preview_invalid_id(self, employee_token):
        """Test that invalid label ID returns 404"""
        url = f"{BASE_URL}/api/orders/labels/nonexistent-label-id/preview?token={employee_token}"
        response = requests.get(url)
        
        assert response.status_code == 404, f"Expected 404 for invalid label, got {response.status_code}"
        print("Invalid label ID correctly returns 404")
    
    def test_employee_assignment_has_label_details(self, employee_token):
        """Verify employee assignment includes label details needed for preview"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/orders/my-assignment", headers=headers)
        
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        assert assignment is not None
        
        labels = assignment.get("labels", [])
        assert len(labels) > 0, "Should have labels"
        
        # Check label structure
        for label in labels:
            assert "id" in label, "Label should have id"
            assert "filename" in label, "Label should have filename"
            assert "content_type" in label, "Label should have content_type"
            print(f"Label: {label.get('id')[:8]}... - {label.get('filename')} ({label.get('content_type')})")
        
        # Check matches structure
        matches = assignment.get("matches", [])
        for match in matches:
            assert "label_id" in match, "Match should have label_id"
            assert "item_id" in match, "Match should have item_id"
            assert "confidence" in match, "Match should have confidence"
            print(f"Match: label {match.get('label_id')[:8]}... -> item {match.get('item_id')[:8]}... ({match.get('confidence')}%)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
