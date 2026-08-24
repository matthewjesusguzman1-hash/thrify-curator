"""
Tests for read receipts functionality:
1. read_at timestamp is set when messages are marked as read
2. Employee/consignor can see when admin read their messages
3. Admin can see when participant read their messages
"""
import pytest
import requests
import os
import uuid
import time

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


class TestReadReceiptsBackend:
    """Tests for read receipts at the API level"""
    
    def test_admin_message_gets_read_at_when_employee_reads(self, admin_token, employee_token):
        """When employee fetches conversation, admin messages should get read_at timestamp"""
        # First, admin sends a message to employee's conversation
        # Get employee's conversation first
        emp_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert emp_conv_response.status_code == 200
        emp_conv = emp_conv_response.json()
        conv_id = emp_conv["id"]
        
        # Admin sends a message
        test_content = f"TEST_READ_RECEIPT_{uuid.uuid4().hex[:8]}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"conversation_id": conv_id, "content": test_content}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Employee fetches conversation - this should mark admin messages as read
        emp_conv_response2 = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert emp_conv_response2.status_code == 200
        emp_conv2 = emp_conv_response2.json()
        
        # Find the message we sent
        messages = emp_conv2.get("messages", [])
        our_message = next((m for m in messages if m["id"] == message_id), None)
        
        assert our_message is not None, "Message not found in conversation"
        assert our_message.get("read") is True, "Message should be marked as read"
        assert our_message.get("read_at") is not None, "Message should have read_at timestamp"
        
        # Clean up - delete the test message
        requests.delete(
            f"{BASE_URL}/api/conversations/admin/message/{conv_id}/{message_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_employee_message_gets_read_at_when_admin_reads(self, admin_token, employee_token):
        """When admin fetches conversation, employee messages should get read_at timestamp"""
        # Employee sends a message
        test_content = f"TEST_EMP_READ_RECEIPT_{uuid.uuid4().hex[:8]}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/employee/send",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={"content": test_content, "sender_name": "Test Employee"}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Get employee's conversation to find the conv_id
        emp_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        conv_id = emp_conv_response.json()["id"]
        
        # Admin fetches the conversation - this should mark employee messages as read
        admin_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_conv_response.status_code == 200
        admin_conv = admin_conv_response.json()
        
        # Find the message we sent
        messages = admin_conv.get("messages", [])
        our_message = next((m for m in messages if m["id"] == message_id), None)
        
        assert our_message is not None, "Message not found in conversation"
        assert our_message.get("read") is True, "Message should be marked as read"
        assert our_message.get("read_at") is not None, "Message should have read_at timestamp"
        
        # Clean up - delete the test message
        requests.delete(
            f"{BASE_URL}/api/conversations/employee/message/{message_id}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
    
    def test_consignor_message_gets_read_at_when_admin_reads(self, admin_token):
        """When admin fetches conversation, consignor messages should get read_at timestamp"""
        consignor_email = "test@test.com"
        
        # Consignor sends a message
        test_content = f"TEST_CONSIGNOR_READ_RECEIPT_{uuid.uuid4().hex[:8]}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/consignor/send?email={consignor_email}",
            json={"content": test_content, "sender_name": "Test Consignor"}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Get consignor's conversation to find the conv_id
        consignor_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/consignor/my-conversation?email={consignor_email}"
        )
        conv_id = consignor_conv_response.json()["id"]
        
        # Admin fetches the conversation - this should mark consignor messages as read
        admin_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_conv_response.status_code == 200
        admin_conv = admin_conv_response.json()
        
        # Find the message we sent
        messages = admin_conv.get("messages", [])
        our_message = next((m for m in messages if m["id"] == message_id), None)
        
        assert our_message is not None, "Message not found in conversation"
        assert our_message.get("read") is True, "Message should be marked as read"
        assert our_message.get("read_at") is not None, "Message should have read_at timestamp"
        
        # Clean up - delete the test message
        requests.delete(
            f"{BASE_URL}/api/conversations/consignor/message/{message_id}?email={consignor_email}"
        )
    
    def test_admin_message_to_consignor_gets_read_at(self, admin_token):
        """When consignor fetches conversation, admin messages should get read_at timestamp"""
        consignor_email = "test@test.com"
        
        # Get consignor's conversation first
        consignor_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/consignor/my-conversation?email={consignor_email}"
        )
        assert consignor_conv_response.status_code == 200
        conv_id = consignor_conv_response.json()["id"]
        
        # Admin sends a message
        test_content = f"TEST_ADMIN_TO_CONSIGNOR_{uuid.uuid4().hex[:8]}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"conversation_id": conv_id, "content": test_content}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Consignor fetches conversation - this should mark admin messages as read
        consignor_conv_response2 = requests.get(
            f"{BASE_URL}/api/conversations/consignor/my-conversation?email={consignor_email}"
        )
        assert consignor_conv_response2.status_code == 200
        consignor_conv2 = consignor_conv_response2.json()
        
        # Find the message we sent
        messages = consignor_conv2.get("messages", [])
        our_message = next((m for m in messages if m["id"] == message_id), None)
        
        assert our_message is not None, "Message not found in conversation"
        assert our_message.get("read") is True, "Message should be marked as read"
        assert our_message.get("read_at") is not None, "Message should have read_at timestamp"
        
        # Clean up - delete the test message
        requests.delete(
            f"{BASE_URL}/api/conversations/admin/message/{conv_id}/{message_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_read_at_timestamp_format(self, admin_token, employee_token):
        """Verify read_at timestamp is in ISO format"""
        # Employee sends a message
        test_content = f"TEST_TIMESTAMP_FORMAT_{uuid.uuid4().hex[:8]}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/employee/send",
            headers={"Authorization": f"Bearer {employee_token}"},
            json={"content": test_content, "sender_name": "Test Employee"}
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["message_id"]
        
        # Get employee's conversation to find the conv_id
        emp_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/employee/my-conversation",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        conv_id = emp_conv_response.json()["id"]
        
        # Admin fetches the conversation
        admin_conv_response = requests.get(
            f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_conv = admin_conv_response.json()
        
        # Find the message
        messages = admin_conv.get("messages", [])
        our_message = next((m for m in messages if m["id"] == message_id), None)
        
        assert our_message is not None
        read_at = our_message.get("read_at")
        assert read_at is not None
        
        # Verify ISO format (should contain T and timezone info or Z)
        assert "T" in read_at, "read_at should be in ISO format with T separator"
        
        # Clean up
        requests.delete(
            f"{BASE_URL}/api/conversations/employee/message/{message_id}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
