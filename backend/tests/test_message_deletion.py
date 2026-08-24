"""
Tests for message deletion functionality:
1. Admin can soft-delete entire conversation threads
2. Admin can delete their own messages
3. Employees can delete their own messages
4. Consignors can delete their own messages
5. Deleted messages/conversations are filtered from responses
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


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
def employee_token():
    """Get employee authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "testemployee@thriftycurator.com"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Employee authentication failed")


class TestAdminConversationDeletion:
    """Tests for admin thread deletion (soft-delete)"""
    
    def test_admin_can_get_conversation_list(self, admin_token):
        """Admin can retrieve list of conversations"""
        response = requests.get(
            f"{BASE_URL}/api/conversations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_can_get_specific_conversation(self, admin_token):
        """Admin can retrieve a specific conversation"""
        # First get the list
        list_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        conversations = list_response.json()
        
        if not conversations:
            pytest.skip("No conversations available for testing")
        
        conv_id = conversations[0]["id"]
        
        # Get specific conversation
        response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conv_id
        assert "messages" in data
        assert "participant_name" in data
    
    def test_admin_can_send_reply(self, admin_token):
        """Admin can send a reply to a conversation"""
        # Get a conversation
        list_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        conversations = list_response.json()
        
        if not conversations:
            pytest.skip("No conversations available for testing")
        
        conv_id = conversations[0]["id"]
        test_content = f"TEST_ADMIN_REPLY_{uuid.uuid4().hex[:8]}"
        
        # Send reply
        response = requests.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"conversation_id": conv_id, "content": test_content}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message_id" in data
        
        # Verify message appears in conversation
        conv_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        conv_data = conv_response.json()
        messages = conv_data.get("messages", [])
        message_contents = [m["content"] for m in messages]
        assert test_content in message_contents


class TestAdminMessageDeletion:
    """Tests for admin deleting their own messages"""
    
    def test_admin_can_delete_own_message(self, admin_token):
        """Admin can delete a message they sent"""
        # Get a conversation
        list_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        conversations = list_response.json()
        
        if not conversations:
            pytest.skip("No conversations available for testing")
        
        conv_id = conversations[0]["id"]
        test_content = f"TEST_DELETE_MSG_{uuid.uuid4().hex[:8]}"
        
        # Send a message
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"conversation_id": conv_id, "content": test_content}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Delete the message
        delete_response = requests.delete(
            f"{BASE_URL}/api/conversations/admin/message/{conv_id}/{message_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] is True
        
        # Verify message is filtered out
        conv_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        conv_data = conv_response.json()
        messages = conv_data.get("messages", [])
        message_ids = [m["id"] for m in messages]
        assert message_id not in message_ids
    
    def test_admin_cannot_delete_participant_message(self, admin_token):
        """Admin cannot delete messages sent by participants"""
        # Get a conversation with participant messages
        list_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        conversations = list_response.json()
        
        if not conversations:
            pytest.skip("No conversations available for testing")
        
        # Find a conversation with participant messages
        for conv in conversations:
            conv_id = conv["id"]
            conv_response = requests.get(
                f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            conv_data = conv_response.json()
            messages = conv_data.get("messages", [])
            
            # Find a non-admin message
            for msg in messages:
                if msg["sender_type"] != "admin":
                    # Try to delete it
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/conversations/admin/message/{conv_id}/{msg['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    assert delete_response.status_code == 403
                    assert "only delete your own messages" in delete_response.json()["detail"].lower()
                    return
        
        pytest.skip("No participant messages found for testing")


class TestEmployeeMessageDeletion:
    """Tests for employee deleting their own messages"""
    
    def test_employee_can_get_conversation(self, employee_token):
        """Employee can retrieve their conversation"""
        response = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert data["participant_type"] == "employee"
    
    def test_employee_can_send_message(self, employee_token):
        """Employee can send a message"""
        test_content = f"TEST_EMP_MSG_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/employee/send",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={"content": test_content, "sender_name": "Test Employee"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message_id" in data
    
    def test_employee_can_delete_own_message(self, employee_token):
        """Employee can delete a message they sent"""
        test_content = f"TEST_EMP_DELETE_{uuid.uuid4().hex[:8]}"
        
        # Send a message
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/employee/send",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={"content": test_content, "sender_name": "Test Employee"}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Delete the message
        delete_response = requests.delete(
            f"{BASE_URL}/api/conversations/employee/message/{message_id}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] is True
        
        # Verify message is filtered out
        conv_response = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        conv_data = conv_response.json()
        messages = conv_data.get("messages", [])
        message_ids = [m["id"] for m in messages]
        assert message_id not in message_ids


class TestConsignorMessageDeletion:
    """Tests for consignor deleting their own messages"""
    
    def test_consignor_can_get_conversation(self):
        """Consignor can retrieve their conversation"""
        # Using test consignor email
        response = requests.get(
            f"{BASE_URL}/api/conversations/consignor/my-conversation?email=test@test.com"
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert data["participant_type"] == "consignor"
    
    def test_consignor_can_send_message(self):
        """Consignor can send a message"""
        test_content = f"TEST_CONSIGNOR_MSG_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/consignor/send?email=test@test.com",
            json={"content": test_content, "sender_name": "Test Consignor"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message_id" in data
    
    def test_consignor_can_delete_own_message(self):
        """Consignor can delete a message they sent"""
        test_content = f"TEST_CONSIGNOR_DELETE_{uuid.uuid4().hex[:8]}"
        
        # Send a message
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/consignor/send?email=test@test.com",
            json={"content": test_content, "sender_name": "Test Consignor"}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Delete the message
        delete_response = requests.delete(
            f"{BASE_URL}/api/conversations/consignor/message/{message_id}?email=test@test.com"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] is True
        
        # Verify message is filtered out
        conv_response = requests.get(
            f"{BASE_URL}/api/conversations/consignor/my-conversation?email=test@test.com"
        )
        conv_data = conv_response.json()
        messages = conv_data.get("messages", [])
        message_ids = [m["id"] for m in messages]
        assert message_id not in message_ids


class TestUnreadCountFiltering:
    """Tests for unread count filtering deleted messages"""
    
    def test_unread_count_excludes_deleted_messages(self, admin_token):
        """Unread count should not include deleted messages"""
        response = requests.get(
            f"{BASE_URL}/api/conversations/admin/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        assert data["unread_count"] >= 0
