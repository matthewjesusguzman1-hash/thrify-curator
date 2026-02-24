"""
Test suite for Messages API endpoints - In-app messaging center for Thrifty Curator
Tests:
- POST /api/messages/ - Public message submission
- GET /api/messages/admin/all - Admin view all messages
- GET /api/messages/admin/unread-count - Get unread count
- PUT /api/messages/admin/{id}/status - Mark as read/unread
- DELETE /api/messages/admin/{id} - Delete message
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMessagesAPI:
    """Test the Messages API endpoints"""
    
    test_message_id = None
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        # Login with admin email and code
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("access_token")
        assert self.admin_token, "No token returned from login"
    
    def get_auth_header(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    # Test 1: Public message submission
    def test_01_create_message_success(self):
        """Test creating a message from landing page - public endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "sender_name": f"TEST_Visitor_{unique_id}",
            "sender_email": f"test_visitor_{unique_id}@example.com",
            "message": f"Test message from visitor {unique_id}. This is a test inquiry about your products."
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 200, f"Message creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain message ID"
        assert data["sender_name"] == payload["sender_name"], "Sender name mismatch"
        assert data["sender_email"] == payload["sender_email"].lower(), "Sender email should be lowercase"
        assert data["message"] == payload["message"], "Message content mismatch"
        assert data["status"] == "unread", "New messages should have unread status"
        assert "submitted_at" in data, "Response should contain submitted_at timestamp"
        
        # Store for cleanup
        TestMessagesAPI.test_message_id = data["id"]
        print(f"✓ Message created with ID: {data['id']}")
    
    # Test 2: Validation - missing name
    def test_02_create_message_missing_name(self):
        """Test message creation fails without sender_name"""
        payload = {
            "sender_email": "test@example.com",
            "message": "Test message without name"
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}"
        print("✓ Missing name validation works")
    
    # Test 3: Validation - invalid email
    def test_03_create_message_invalid_email(self):
        """Test message creation fails with invalid email"""
        payload = {
            "sender_name": "Test User",
            "sender_email": "not-an-email",
            "message": "Test message with invalid email"
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print("✓ Invalid email validation works")
    
    # Test 4: Validation - missing message
    def test_04_create_message_missing_message(self):
        """Test message creation fails without message content"""
        payload = {
            "sender_name": "Test User",
            "sender_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 422, f"Expected 422 for missing message, got {response.status_code}"
        print("✓ Missing message validation works")
    
    # Test 5: Admin - Get all messages
    def test_05_admin_get_all_messages(self):
        """Test admin can get all messages"""
        response = requests.get(
            f"{BASE_URL}/api/messages/admin/all",
            headers=self.get_auth_header()
        )
        assert response.status_code == 200, f"Failed to get messages: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should have at least our test message
        assert len(data) >= 1, "Should have at least one message"
        
        # Check message structure
        if data:
            msg = data[0]
            assert "id" in msg, "Message should have id"
            assert "sender_name" in msg, "Message should have sender_name"
            assert "sender_email" in msg, "Message should have sender_email"
            assert "message" in msg, "Message should have message content"
            assert "status" in msg, "Message should have status"
            assert "submitted_at" in msg, "Message should have submitted_at"
        
        print(f"✓ Retrieved {len(data)} messages")
    
    # Test 6: Admin - Get unread count
    def test_06_admin_get_unread_count(self):
        """Test admin can get unread message count"""
        response = requests.get(
            f"{BASE_URL}/api/messages/admin/unread-count",
            headers=self.get_auth_header()
        )
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"
        
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"
        assert isinstance(data["unread_count"], int), "unread_count should be integer"
        assert data["unread_count"] >= 0, "unread_count should be non-negative"
        
        print(f"✓ Unread count: {data['unread_count']}")
    
    # Test 7: Admin - Mark message as read
    def test_07_admin_mark_as_read(self):
        """Test admin can mark message as read"""
        if not TestMessagesAPI.test_message_id:
            pytest.skip("No test message ID available")
        
        response = requests.put(
            f"{BASE_URL}/api/messages/admin/{TestMessagesAPI.test_message_id}/status",
            json={"status": "read"},
            headers=self.get_auth_header()
        )
        assert response.status_code == 200, f"Failed to mark as read: {response.text}"
        
        # Verify the status was updated
        all_messages = requests.get(
            f"{BASE_URL}/api/messages/admin/all",
            headers=self.get_auth_header()
        ).json()
        
        test_msg = next((m for m in all_messages if m["id"] == TestMessagesAPI.test_message_id), None)
        assert test_msg, "Test message not found"
        assert test_msg["status"] == "read", f"Status should be 'read', got {test_msg['status']}"
        
        print("✓ Message marked as read")
    
    # Test 8: Admin - Mark message as unread
    def test_08_admin_mark_as_unread(self):
        """Test admin can mark message back to unread"""
        if not TestMessagesAPI.test_message_id:
            pytest.skip("No test message ID available")
        
        response = requests.put(
            f"{BASE_URL}/api/messages/admin/{TestMessagesAPI.test_message_id}/status",
            json={"status": "unread"},
            headers=self.get_auth_header()
        )
        assert response.status_code == 200, f"Failed to mark as unread: {response.text}"
        
        # Verify the status was updated
        all_messages = requests.get(
            f"{BASE_URL}/api/messages/admin/all",
            headers=self.get_auth_header()
        ).json()
        
        test_msg = next((m for m in all_messages if m["id"] == TestMessagesAPI.test_message_id), None)
        assert test_msg, "Test message not found"
        assert test_msg["status"] == "unread", f"Status should be 'unread', got {test_msg['status']}"
        
        print("✓ Message marked as unread")
    
    # Test 9: Admin - Update non-existent message
    def test_09_admin_update_nonexistent(self):
        """Test updating status of non-existent message returns 404"""
        fake_id = "nonexistent-id-12345"
        response = requests.put(
            f"{BASE_URL}/api/messages/admin/{fake_id}/status",
            json={"status": "read"},
            headers=self.get_auth_header()
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent message update returns 404")
    
    # Test 10: Unauthorized access to admin endpoints
    def test_10_unauthorized_admin_access(self):
        """Test admin endpoints require authentication"""
        # Test without token
        response = requests.get(f"{BASE_URL}/api/messages/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/messages/admin/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Admin endpoints require authentication")
    
    # Test 11: Admin - Delete message
    def test_11_admin_delete_message(self):
        """Test admin can delete a message"""
        if not TestMessagesAPI.test_message_id:
            pytest.skip("No test message ID available")
        
        response = requests.delete(
            f"{BASE_URL}/api/messages/admin/{TestMessagesAPI.test_message_id}",
            headers=self.get_auth_header()
        )
        assert response.status_code == 200, f"Failed to delete message: {response.text}"
        
        # Verify deletion
        all_messages = requests.get(
            f"{BASE_URL}/api/messages/admin/all",
            headers=self.get_auth_header()
        ).json()
        
        test_msg = next((m for m in all_messages if m["id"] == TestMessagesAPI.test_message_id), None)
        assert test_msg is None, "Message should be deleted"
        
        print("✓ Message deleted successfully")
    
    # Test 12: Admin - Delete non-existent message
    def test_12_admin_delete_nonexistent(self):
        """Test deleting non-existent message returns 404"""
        fake_id = "nonexistent-id-12345"
        response = requests.delete(
            f"{BASE_URL}/api/messages/admin/{fake_id}",
            headers=self.get_auth_header()
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent message delete returns 404")


class TestMessagesCleanup:
    """Cleanup any remaining test data"""
    
    def test_cleanup_test_messages(self):
        """Clean up any TEST_ prefixed messages"""
        # Login with admin email and code
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        if response.status_code != 200:
            pytest.skip("Could not login for cleanup")
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all messages
        messages_response = requests.get(f"{BASE_URL}/api/messages/admin/all", headers=headers)
        if messages_response.status_code != 200:
            pytest.skip("Could not fetch messages for cleanup")
        
        messages = messages_response.json()
        deleted_count = 0
        
        for msg in messages:
            if msg.get("sender_name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/messages/admin/{msg['id']}", headers=headers)
                deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test messages")
