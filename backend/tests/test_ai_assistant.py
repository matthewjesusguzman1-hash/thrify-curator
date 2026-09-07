"""
AI Assistant API Tests
Tests for conversation CRUD, image upload, and message streaming endpoints
"""
import pytest
import requests
import os
import io
import base64
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


class TestAIAssistantAuth:
    """Test authentication requirements for AI Assistant endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for employee"""
        # Login as employee
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access token returned"
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Also get admin token for cross-user testing
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL})
        if admin_resp.status_code == 200:
            admin_data = admin_resp.json()
            if admin_data.get("requires_code"):
                verify_resp = requests.post(f"{BASE_URL}/api/auth/verify-code", json={
                    "email": ADMIN_EMAIL,
                    "code": ADMIN_CODE
                })
                if verify_resp.status_code == 200:
                    self.admin_token = verify_resp.json().get("access_token")
                    self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
                else:
                    self.admin_token = None
                    self.admin_headers = {}
            else:
                self.admin_token = admin_data.get("access_token")
                self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        else:
            self.admin_token = None
            self.admin_headers = {}
    
    def test_conversations_requires_auth(self):
        """GET /api/ai/conversations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/conversations")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: GET /api/ai/conversations requires auth")
    
    def test_create_conversation_requires_auth(self):
        """POST /api/ai/conversations requires authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/conversations", json={"title": "Test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: POST /api/ai/conversations requires auth")
    
    def test_upload_image_requires_auth(self):
        """POST /api/ai/upload-image requires authentication"""
        # Create a minimal valid JPEG
        jpeg_data = create_test_jpeg()
        files = {"file": ("test.jpg", jpeg_data, "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/ai/upload-image", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: POST /api/ai/upload-image requires auth")


class TestConversationCRUD:
    """Test conversation CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for employee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access token returned"
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_conv_ids = []
    
    def teardown_method(self, method):
        """Cleanup created conversations"""
        for conv_id in self.created_conv_ids:
            try:
                requests.delete(f"{BASE_URL}/api/ai/conversations/{conv_id}", headers=self.headers)
            except Exception:
                pass
    
    def test_create_conversation_default_title(self):
        """POST /api/ai/conversations creates conversation with default title"""
        response = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={},
            headers=self.headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response missing 'id'"
        assert "title" in data, "Response missing 'title'"
        assert "created_at" in data, "Response missing 'created_at'"
        assert data["title"] == "New Chat", f"Expected default title 'New Chat', got '{data['title']}'"
        
        self.created_conv_ids.append(data["id"])
        print(f"PASS: Created conversation with id={data['id']}, title='{data['title']}'")
    
    def test_create_conversation_custom_title(self):
        """POST /api/ai/conversations creates conversation with custom title"""
        response = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Custom Title"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "TEST_Custom Title", f"Expected custom title, got '{data['title']}'"
        self.created_conv_ids.append(data["id"])
        print(f"PASS: Created conversation with custom title")
    
    def test_list_conversations(self):
        """GET /api/ai/conversations lists user's conversations"""
        # Create a conversation first
        create_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_List Test"},
            headers=self.headers
        )
        assert create_resp.status_code == 200
        conv_id = create_resp.json()["id"]
        self.created_conv_ids.append(conv_id)
        
        # List conversations
        response = requests.get(f"{BASE_URL}/api/ai/conversations", headers=self.headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list response"
        # Find our created conversation
        found = any(c["id"] == conv_id for c in data)
        assert found, "Created conversation not found in list"
        print(f"PASS: Listed {len(data)} conversations, found test conversation")
    
    def test_get_conversation_by_id(self):
        """GET /api/ai/conversations/{id} returns full conversation with messages"""
        # Create a conversation
        create_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Get Test"},
            headers=self.headers
        )
        assert create_resp.status_code == 200
        conv_id = create_resp.json()["id"]
        self.created_conv_ids.append(conv_id)
        
        # Get conversation
        response = requests.get(f"{BASE_URL}/api/ai/conversations/{conv_id}", headers=self.headers)
        assert response.status_code == 200, f"Get failed: {response.text}"
        data = response.json()
        
        assert data["id"] == conv_id, "ID mismatch"
        assert "messages" in data, "Response missing 'messages' array"
        assert isinstance(data["messages"], list), "messages should be a list"
        print(f"PASS: Got conversation with {len(data['messages'])} messages")
    
    def test_get_nonexistent_conversation(self):
        """GET /api/ai/conversations/{id} returns 404 for nonexistent conversation"""
        response = requests.get(
            f"{BASE_URL}/api/ai/conversations/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 for nonexistent conversation")
    
    def test_delete_conversation(self):
        """DELETE /api/ai/conversations/{id} deletes the conversation"""
        # Create a conversation
        create_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Delete Test"},
            headers=self.headers
        )
        assert create_resp.status_code == 200
        conv_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/ai/conversations/{conv_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data.get("deleted") == True, "Expected deleted=True"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/ai/conversations/{conv_id}", headers=self.headers)
        assert get_resp.status_code == 404, "Conversation should be deleted"
        print("PASS: Deleted conversation and verified removal")
    
    def test_delete_nonexistent_conversation(self):
        """DELETE /api/ai/conversations/{id} returns 404 for nonexistent conversation"""
        response = requests.delete(
            f"{BASE_URL}/api/ai/conversations/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 for deleting nonexistent conversation")


class TestImageUpload:
    """Test image upload functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for employee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access token returned"
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.uploaded_image_ids = []
    
    def test_upload_jpeg_image(self):
        """POST /api/ai/upload-image accepts JPEG files"""
        jpeg_data = create_test_jpeg()
        files = {"file": ("test.jpg", jpeg_data, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response missing 'id'"
        assert "filename" in data, "Response missing 'filename'"
        assert "content_type" in data, "Response missing 'content_type'"
        assert "size" in data, "Response missing 'size'"
        assert data["content_type"] == "image/jpeg", f"Expected image/jpeg, got {data['content_type']}"
        
        self.uploaded_image_ids.append(data["id"])
        print(f"PASS: Uploaded JPEG image, id={data['id']}, size={data['size']}")
    
    def test_upload_png_image(self):
        """POST /api/ai/upload-image accepts PNG files"""
        png_data = create_test_png()
        files = {"file": ("test.png", png_data, "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["content_type"] == "image/png", f"Expected image/png, got {data['content_type']}"
        self.uploaded_image_ids.append(data["id"])
        print(f"PASS: Uploaded PNG image, id={data['id']}")
    
    def test_upload_webp_image(self):
        """POST /api/ai/upload-image accepts WEBP files"""
        webp_data = create_test_webp()
        files = {"file": ("test.webp", webp_data, "image/webp")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["content_type"] == "image/webp", f"Expected image/webp, got {data['content_type']}"
        self.uploaded_image_ids.append(data["id"])
        print(f"PASS: Uploaded WEBP image, id={data['id']}")
    
    def test_reject_non_image_file(self):
        """POST /api/ai/upload-image rejects non-image files"""
        text_data = b"This is not an image"
        files = {"file": ("test.txt", text_data, "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Rejected non-image file")
    
    def test_reject_gif_file(self):
        """POST /api/ai/upload-image rejects GIF files"""
        # Minimal GIF header
        gif_data = b'GIF89a\x01\x00\x01\x00\x00\x00\x00;\x00'
        files = {"file": ("test.gif", gif_data, "image/gif")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Rejected GIF file")
    
    def test_reject_oversized_file(self):
        """POST /api/ai/upload-image rejects files over 5MB"""
        # Create a 6MB file
        large_data = b'\x00' * (6 * 1024 * 1024)
        files = {"file": ("large.jpg", large_data, "image/jpeg")}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Rejected oversized file")
    
    def test_get_uploaded_image(self):
        """GET /api/ai/images/{image_id} serves back the uploaded image"""
        # Upload an image first
        jpeg_data = create_test_jpeg()
        files = {"file": ("test.jpg", jpeg_data, "image/jpeg")}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/ai/upload-image",
            files=files,
            headers=self.headers
        )
        assert upload_resp.status_code == 200
        image_id = upload_resp.json()["id"]
        self.uploaded_image_ids.append(image_id)
        
        # Get the image
        response = requests.get(
            f"{BASE_URL}/api/ai/images/{image_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get image failed: {response.status_code}"
        assert "image/" in response.headers.get("content-type", ""), "Expected image content type"
        assert len(response.content) > 0, "Image content is empty"
        print(f"PASS: Retrieved image, content-type={response.headers.get('content-type')}, size={len(response.content)}")
    
    def test_get_nonexistent_image(self):
        """GET /api/ai/images/{image_id} returns 404 for nonexistent image"""
        response = requests.get(
            f"{BASE_URL}/api/ai/images/nonexistent-image-id",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 for nonexistent image")


class TestMessageStreaming:
    """Test message sending and SSE streaming"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create a conversation"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access token returned"
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a conversation for testing
        conv_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Message Test"},
            headers=self.headers
        )
        assert conv_resp.status_code == 200
        self.conv_id = conv_resp.json()["id"]
    
    def teardown_method(self, method):
        """Cleanup conversation"""
        try:
            requests.delete(f"{BASE_URL}/api/ai/conversations/{self.conv_id}", headers=self.headers)
        except Exception:
            pass
    
    def test_send_message_returns_sse_stream(self):
        """POST /api/ai/conversations/{conv_id}/messages returns SSE stream"""
        response = requests.post(
            f"{BASE_URL}/api/ai/conversations/{self.conv_id}/messages",
            json={"text": "Hello, what marketplaces do you support?"},
            headers=self.headers,
            stream=True
        )
        assert response.status_code == 200, f"Send message failed: {response.status_code}"
        assert "text/event-stream" in response.headers.get("content-type", ""), \
            f"Expected text/event-stream, got {response.headers.get('content-type')}"
        
        # Read the stream
        events = []
        full_content = ""
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                try:
                    payload = json.loads(line[6:])
                    events.append(payload)
                    if payload.get("type") == "delta":
                        full_content += payload.get("content", "")
                    elif payload.get("type") == "done":
                        break
                except json.JSONDecodeError:
                    pass
        
        # Verify we got delta and done events
        event_types = [e.get("type") for e in events]
        assert "delta" in event_types or "done" in event_types, f"Expected delta/done events, got {event_types}"
        print(f"PASS: Received {len(events)} SSE events, content length={len(full_content)}")
    
    def test_message_persisted_in_conversation(self):
        """Messages are persisted in MongoDB"""
        # Send a message
        response = requests.post(
            f"{BASE_URL}/api/ai/conversations/{self.conv_id}/messages",
            json={"text": "TEST_Persistence check message"},
            headers=self.headers,
            stream=True
        )
        assert response.status_code == 200
        
        # Consume the stream
        for line in response.iter_lines(decode_unicode=True):
            if line and "done" in line:
                break
        
        # Wait a moment for DB write
        time.sleep(1)
        
        # Get the conversation and verify messages
        get_resp = requests.get(
            f"{BASE_URL}/api/ai/conversations/{self.conv_id}",
            headers=self.headers
        )
        assert get_resp.status_code == 200
        conv = get_resp.json()
        
        messages = conv.get("messages", [])
        assert len(messages) >= 2, f"Expected at least 2 messages (user + assistant), got {len(messages)}"
        
        # Verify user message
        user_msgs = [m for m in messages if m.get("role") == "user"]
        assert len(user_msgs) >= 1, "No user message found"
        assert "TEST_Persistence" in user_msgs[0].get("text", ""), "User message text not persisted"
        
        # Verify assistant message
        assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
        assert len(assistant_msgs) >= 1, "No assistant message found"
        assert len(assistant_msgs[0].get("text", "")) > 0, "Assistant message is empty"
        
        print(f"PASS: Messages persisted - {len(user_msgs)} user, {len(assistant_msgs)} assistant")
    
    def test_send_message_to_nonexistent_conversation(self):
        """POST /api/ai/conversations/{conv_id}/messages returns 404 for nonexistent conversation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/conversations/nonexistent-conv-id/messages",
            json={"text": "Hello"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 for message to nonexistent conversation")


class TestConversationScoping:
    """Test that conversations are scoped to authenticated user"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get tokens for two different users"""
        # Employee token
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        assert emp_resp.status_code == 200
        self.employee_token = emp_resp.json().get("access_token")
        self.employee_headers = {"Authorization": f"Bearer {self.employee_token}"}
        
        # Admin token
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL})
        if admin_resp.status_code == 200:
            admin_data = admin_resp.json()
            if admin_data.get("requires_code"):
                verify_resp = requests.post(f"{BASE_URL}/api/auth/verify-code", json={
                    "email": ADMIN_EMAIL,
                    "code": ADMIN_CODE
                })
                if verify_resp.status_code == 200:
                    self.admin_token = verify_resp.json().get("access_token")
                else:
                    self.admin_token = None
            else:
                self.admin_token = admin_data.get("access_token")
        else:
            self.admin_token = None
        
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        self.created_conv_ids = []
    
    def teardown_method(self, method):
        """Cleanup"""
        for conv_id in self.created_conv_ids:
            try:
                requests.delete(f"{BASE_URL}/api/ai/conversations/{conv_id}", headers=self.employee_headers)
            except Exception:
                pass
    
    def test_user_cannot_access_other_users_conversation(self):
        """User A cannot see user B's conversations"""
        if not self.admin_token:
            pytest.skip("Admin token not available for cross-user test")
        
        # Create conversation as employee
        create_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Employee Private Conv"},
            headers=self.employee_headers
        )
        assert create_resp.status_code == 200
        conv_id = create_resp.json()["id"]
        self.created_conv_ids.append(conv_id)
        
        # Try to access as admin - should get 404
        get_resp = requests.get(
            f"{BASE_URL}/api/ai/conversations/{conv_id}",
            headers=self.admin_headers
        )
        assert get_resp.status_code == 404, f"Admin should not access employee's conversation, got {get_resp.status_code}"
        print("PASS: User cannot access other user's conversation")
    
    def test_user_cannot_delete_other_users_conversation(self):
        """User A cannot delete user B's conversations"""
        if not self.admin_token:
            pytest.skip("Admin token not available for cross-user test")
        
        # Create conversation as employee
        create_resp = requests.post(
            f"{BASE_URL}/api/ai/conversations",
            json={"title": "TEST_Employee Private Conv 2"},
            headers=self.employee_headers
        )
        assert create_resp.status_code == 200
        conv_id = create_resp.json()["id"]
        self.created_conv_ids.append(conv_id)
        
        # Try to delete as admin - should get 404
        del_resp = requests.delete(
            f"{BASE_URL}/api/ai/conversations/{conv_id}",
            headers=self.admin_headers
        )
        assert del_resp.status_code == 404, f"Admin should not delete employee's conversation, got {del_resp.status_code}"
        
        # Verify it still exists for employee
        get_resp = requests.get(
            f"{BASE_URL}/api/ai/conversations/{conv_id}",
            headers=self.employee_headers
        )
        assert get_resp.status_code == 200, "Conversation should still exist for owner"
        print("PASS: User cannot delete other user's conversation")


# --- Helper functions to create test images ---

def create_test_jpeg():
    """Create a minimal valid JPEG image with actual visual content"""
    # This is a 2x2 pixel JPEG with different colored pixels
    jpeg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x02,
        0x00, 0x02, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xCA,
        0x8A, 0x28, 0xA0, 0x02, 0x8A, 0x28, 0xA0, 0xFF, 0xD9
    ])
    return io.BytesIO(jpeg_bytes)


def create_test_png():
    """Create a minimal valid PNG image"""
    # 1x1 red pixel PNG
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE,
        0xD4, 0xEF, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,  # IEND chunk
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    return io.BytesIO(png_bytes)


def create_test_webp():
    """Create a minimal valid WEBP image"""
    # Minimal 1x1 WEBP
    webp_bytes = bytes([
        0x52, 0x49, 0x46, 0x46,  # RIFF
        0x1A, 0x00, 0x00, 0x00,  # File size
        0x57, 0x45, 0x42, 0x50,  # WEBP
        0x56, 0x50, 0x38, 0x4C,  # VP8L
        0x0D, 0x00, 0x00, 0x00,  # Chunk size
        0x2F, 0x00, 0x00, 0x00,  # Signature
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00
    ])
    return io.BytesIO(webp_bytes)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
