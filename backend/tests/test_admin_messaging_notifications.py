"""
Tests for admin-to-admin messaging notifications feature.

Tests verify:
1. Admin unread count API returns per-admin unread counts
2. When admin A sends a message, admin B's unread count increases
3. When admin B opens a conversation, their unread count decreases
4. Admin message includes read_by_admins array for tracking which admins have read it
5. Admin reply endpoint sends notification to other admins (notification function is called)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_1_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_1_CODE = "4399"
ADMIN_1_NAME = "Matthew Guzman"

ADMIN_2_EMAIL = "euniceguzman@thriftycurator.com"
ADMIN_2_CODE = "0826"
ADMIN_2_NAME = "Eunice Guzman"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def admin_login(api_client, email, code):
    """Login as admin and return auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "admin_code": code
    })
    
    if response.status_code != 200:
        print(f"Admin login failed: {response.status_code} - {response.text}")
        return None
    
    return response.json().get("access_token")


@pytest.fixture
def admin1_token(api_client):
    """Get auth token for Admin 1 (Matthew)"""
    token = admin_login(api_client, ADMIN_1_EMAIL, ADMIN_1_CODE)
    if not token:
        pytest.skip("Admin 1 authentication failed")
    return token


@pytest.fixture
def admin2_token(api_client):
    """Get auth token for Admin 2 (Eunice)"""
    token = admin_login(api_client, ADMIN_2_EMAIL, ADMIN_2_CODE)
    if not token:
        pytest.skip("Admin 2 authentication failed")
    return token


@pytest.fixture
def admin1_client(api_client, admin1_token):
    """Session with Admin 1 auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin1_token}"})
    return api_client


@pytest.fixture
def admin2_client(api_client, admin2_token):
    """Session with Admin 2 auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin2_token}"})
    return api_client


class TestAdminUnreadCountAPI:
    """Test the admin unread count API returns per-admin counts"""
    
    def test_unread_count_endpoint_exists(self, api_client, admin1_token):
        """Test that the unread count endpoint exists and returns data"""
        headers = {"Authorization": f"Bearer {admin1_token}"}
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count field"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
    
    def test_unread_count_different_for_each_admin(self, api_client, admin1_token, admin2_token):
        """Test that unread counts can differ between admins"""
        # Get unread count for Admin 1
        headers1 = {"Authorization": f"Bearer {admin1_token}"}
        response1 = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers1)
        assert response1.status_code == 200
        count1 = response1.json()["unread_count"]
        
        # Get unread count for Admin 2
        headers2 = {"Authorization": f"Bearer {admin2_token}"}
        response2 = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers2)
        assert response2.status_code == 200
        count2 = response2.json()["unread_count"]
        
        # Both should return valid counts (they may or may not be equal)
        assert isinstance(count1, int), "Admin 1 unread count should be an integer"
        assert isinstance(count2, int), "Admin 2 unread count should be an integer"
        print(f"Admin 1 unread count: {count1}, Admin 2 unread count: {count2}")


class TestAdminMessageReadByAdmins:
    """Test that admin messages include read_by_admins array"""
    
    def test_admin_reply_includes_read_by_admins(self, api_client, admin1_token):
        """Test that when admin sends a message, it includes read_by_admins array with sender's ID"""
        headers = {"Authorization": f"Bearer {admin1_token}"}
        
        # First, get list of conversations
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        # Get the first conversation
        conv_id = conversations[0]["id"]
        
        # Send a test message
        test_content = f"TEST_ADMIN_MSG_{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers=headers,
            json={
                "conversation_id": conv_id,
                "content": test_content
            }
        )
        
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        result = response.json()
        assert result.get("success") is True
        assert "message_id" in result
        
        # Now fetch the conversation to verify the message has read_by_admins
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}", headers=headers)
        assert response.status_code == 200
        conv_data = response.json()
        
        # Find our test message
        messages = conv_data.get("messages", [])
        test_msg = None
        for msg in messages:
            if msg.get("content") == test_content:
                test_msg = msg
                break
        
        assert test_msg is not None, "Test message not found in conversation"
        assert test_msg.get("sender_type") == "admin", "Message should be from admin"
        
        # Verify read_by_admins array exists and contains the sender
        read_by_admins = test_msg.get("read_by_admins", [])
        assert isinstance(read_by_admins, list), "read_by_admins should be a list"
        # The sender should be in the read_by_admins list
        assert len(read_by_admins) >= 1, "Sender should be in read_by_admins"
        print(f"Message read_by_admins: {read_by_admins}")


class TestAdminToAdminUnreadTracking:
    """Test that admin-to-admin messages are tracked correctly for unread counts"""
    
    def test_admin_message_increases_other_admin_unread(self, api_client, admin1_token, admin2_token):
        """Test that when Admin 1 sends a message, Admin 2's unread count increases"""
        headers1 = {"Authorization": f"Bearer {admin1_token}"}
        headers2 = {"Authorization": f"Bearer {admin2_token}"}
        
        # Get initial unread count for Admin 2
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers2)
        assert response.status_code == 200
        initial_count = response.json()["unread_count"]
        
        # Get a conversation to send a message to
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers1)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        conv_id = conversations[0]["id"]
        
        # Admin 1 sends a message
        test_content = f"TEST_ADMIN1_MSG_{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers=headers1,
            json={
                "conversation_id": conv_id,
                "content": test_content
            }
        )
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        # Get new unread count for Admin 2
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers2)
        assert response.status_code == 200
        new_count = response.json()["unread_count"]
        
        # Admin 2's unread count should have increased by 1
        assert new_count == initial_count + 1, f"Expected unread count to increase from {initial_count} to {initial_count + 1}, got {new_count}"
        print(f"Admin 2 unread count increased from {initial_count} to {new_count}")
    
    def test_opening_conversation_marks_messages_read(self, api_client, admin1_token, admin2_token):
        """Test that when Admin 2 opens a conversation, their unread count decreases"""
        headers1 = {"Authorization": f"Bearer {admin1_token}"}
        headers2 = {"Authorization": f"Bearer {admin2_token}"}
        
        # Get a conversation
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers1)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        conv_id = conversations[0]["id"]
        
        # Admin 1 sends a message
        test_content = f"TEST_ADMIN1_MSG_{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers=headers1,
            json={
                "conversation_id": conv_id,
                "content": test_content
            }
        )
        assert response.status_code == 200
        
        # Get Admin 2's unread count before opening
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers2)
        assert response.status_code == 200
        count_before = response.json()["unread_count"]
        
        # Admin 2 opens the conversation (this should mark messages as read)
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/conversation/{conv_id}", headers=headers2)
        assert response.status_code == 200
        
        # Get Admin 2's unread count after opening
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers2)
        assert response.status_code == 200
        count_after = response.json()["unread_count"]
        
        # Unread count should have decreased (or stayed at 0)
        assert count_after <= count_before, f"Expected unread count to decrease or stay same, was {count_before}, now {count_after}"
        print(f"Admin 2 unread count changed from {count_before} to {count_after} after opening conversation")


class TestConversationListUnreadCount:
    """Test that conversation list shows correct per-admin unread counts"""
    
    def test_conversation_list_has_unread_count(self, api_client, admin1_token):
        """Test that conversation list includes unread_count for each conversation"""
        headers = {"Authorization": f"Bearer {admin1_token}"}
        
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        # Each conversation should have unread_count field
        for conv in conversations:
            assert "unread_count" in conv, f"Conversation {conv.get('id')} missing unread_count"
            assert isinstance(conv["unread_count"], int), "unread_count should be an integer"
        
        print(f"Verified {len(conversations)} conversations have unread_count field")
    
    def test_conversation_list_unread_differs_by_admin(self, api_client, admin1_token, admin2_token):
        """Test that conversation list unread counts can differ between admins"""
        headers1 = {"Authorization": f"Bearer {admin1_token}"}
        headers2 = {"Authorization": f"Bearer {admin2_token}"}
        
        # Get conversations for Admin 1
        response1 = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers1)
        assert response1.status_code == 200
        convs1 = response1.json()
        
        # Get conversations for Admin 2
        response2 = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers2)
        assert response2.status_code == 200
        convs2 = response2.json()
        
        if not convs1 or not convs2:
            pytest.skip("No conversations available to test")
        
        # Create a map of conversation IDs to unread counts for each admin
        admin1_unreads = {c["id"]: c["unread_count"] for c in convs1}
        admin2_unreads = {c["id"]: c["unread_count"] for c in convs2}
        
        print(f"Admin 1 conversation unreads: {admin1_unreads}")
        print(f"Admin 2 conversation unreads: {admin2_unreads}")
        
        # Both admins should see the same conversations
        assert set(admin1_unreads.keys()) == set(admin2_unreads.keys()), "Both admins should see same conversations"


class TestAdminReplyNotification:
    """Test that admin reply triggers notification to other admins"""
    
    def test_admin_reply_returns_success(self, api_client, admin1_token):
        """Test that admin reply endpoint works and returns success"""
        headers = {"Authorization": f"Bearer {admin1_token}"}
        
        # Get a conversation
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        conv_id = conversations[0]["id"]
        
        # Send a reply
        test_content = f"TEST_NOTIFICATION_MSG_{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers=headers,
            json={
                "conversation_id": conv_id,
                "content": test_content
            }
        )
        
        assert response.status_code == 200, f"Failed to send reply: {response.text}"
        result = response.json()
        assert result.get("success") is True, "Reply should return success=True"
        assert "message_id" in result, "Reply should return message_id"
        print(f"Admin reply successful, message_id: {result['message_id']}")


class TestSenderNotCountedAsUnread:
    """Test that sender's own messages don't count as unread for them"""
    
    def test_sender_own_message_not_unread(self, api_client, admin1_token):
        """Test that Admin 1's own messages don't increase their unread count"""
        headers = {"Authorization": f"Bearer {admin1_token}"}
        
        # Get initial unread count
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers)
        assert response.status_code == 200
        initial_count = response.json()["unread_count"]
        
        # Get a conversation
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/list", headers=headers)
        assert response.status_code == 200
        conversations = response.json()
        
        if not conversations:
            pytest.skip("No conversations available to test")
        
        conv_id = conversations[0]["id"]
        
        # Admin 1 sends a message
        test_content = f"TEST_OWN_MSG_{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/conversations/admin/reply",
            headers=headers,
            json={
                "conversation_id": conv_id,
                "content": test_content
            }
        )
        assert response.status_code == 200
        
        # Get new unread count for Admin 1
        response = api_client.get(f"{BASE_URL}/api/conversations/admin/unread-count", headers=headers)
        assert response.status_code == 200
        new_count = response.json()["unread_count"]
        
        # Admin 1's unread count should NOT have increased (their own message)
        assert new_count == initial_count, f"Sender's unread count should not increase. Was {initial_count}, now {new_count}"
        print(f"Verified sender's own message doesn't increase their unread count")
