"""
Tests for Application Invite feature - Send Application Link
Tests the following endpoints:
- POST /api/admin/application-invites/send - send invite
- GET /api/admin/application-invites - list invites
- GET /api/admin/email-pool - get email suggestions
- GET /api/forms/application-invite/{token} - get invite details
- POST /api/forms/application-invite/{token} - submit invited application
- DELETE /api/admin/application-invites/{invite_id} - delete invite
"""
import pytest
import requests
import uuid
from datetime import datetime


class TestApplicationInvitesAPI:
    """Test suite for Application Invites feature"""
    
    # Test data
    TEST_EMAIL = f"test_invite_{uuid.uuid4().hex[:8]}@example.com"
    
    def test_send_invite_requires_auth(self, base_url):
        """Test that sending invite requires authentication"""
        response = requests.post(f"{base_url}/api/admin/application-invites/send", json={
            "email": self.TEST_EMAIL,
            "template": "generic",
            "required_fields": ["address", "resume_text"]
        })
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403, got {response.status_code}"
    
    def test_list_invites_requires_auth(self, base_url):
        """Test that listing invites requires authentication"""
        response = requests.get(f"{base_url}/api/admin/application-invites")
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403, got {response.status_code}"
    
    def test_email_pool_requires_auth(self, base_url):
        """Test that email pool requires authentication"""
        response = requests.get(f"{base_url}/api/admin/email-pool")
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403, got {response.status_code}"
    
    def test_send_invite_generic_template(self, base_url, auth_headers):
        """Test sending an invite with generic template"""
        test_email = f"test_generic_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": ["address", "resume_text", "why_join"]
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to send invite: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "application_url" in data
        assert test_email in data.get("message", "")
    
    def test_send_invite_onboarding_template(self, base_url, auth_headers):
        """Test sending an invite with onboarding template"""
        test_email = f"test_onboarding_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "onboarding",
                "required_fields": ["phone", "address", "availability"],
                "custom_message": "Welcome to the team! Please complete your application."
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to send invite: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "application_url" in data
    
    def test_send_invite_with_custom_message(self, base_url, auth_headers):
        """Test sending an invite with custom message"""
        test_email = f"test_custom_{uuid.uuid4().hex[:8]}@example.com"
        custom_msg = "We were impressed with your interview!"
        response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": [],
                "custom_message": custom_msg
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to send invite: {response.text}"
        data = response.json()
        assert data.get("success") is True
    
    def test_list_invites(self, base_url, auth_headers):
        """Test listing all invites"""
        response = requests.get(
            f"{base_url}/api/admin/application-invites",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to list invites: {response.text}"
        data = response.json()
        assert "invites" in data
        assert isinstance(data["invites"], list)
        
        # Check structure of invites if any exist
        if len(data["invites"]) > 0:
            invite = data["invites"][0]
            assert "id" in invite
            assert "email" in invite
            assert "status" in invite
            assert "sent_at" in invite
            assert "template" in invite
    
    def test_get_email_pool(self, base_url, auth_headers):
        """Test getting email pool for suggestions"""
        response = requests.get(
            f"{base_url}/api/admin/email-pool",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get email pool: {response.text}"
        data = response.json()
        assert "emails" in data
        assert isinstance(data["emails"], list)
        
        # Check structure of email pool entries if any exist
        if len(data["emails"]) > 0:
            entry = data["emails"][0]
            assert "email" in entry
            assert "name" in entry
            assert "source" in entry
    
    def test_get_invite_details_invalid_token(self, base_url):
        """Test getting invite details with invalid token"""
        response = requests.get(f"{base_url}/api/forms/application-invite/invalid-token-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
    
    def test_submit_application_invalid_token(self, base_url):
        """Test submitting application with invalid token"""
        response = requests.post(
            f"{base_url}/api/forms/application-invite/invalid-token-12345",
            json={
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "555-1234"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_resend_invite_to_same_email(self, base_url, auth_headers):
        """Test resending invite to same email updates existing record"""
        test_email = f"test_resend_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send first invite
        response1 = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": ["address"]
            },
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Send second invite to same email
        response2 = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "onboarding",
                "required_fields": ["phone", "address"]
            },
            headers=auth_headers
        )
        assert response2.status_code == 200
        
        # Verify only one invite exists for this email
        list_response = requests.get(
            f"{base_url}/api/admin/application-invites",
            headers=auth_headers
        )
        invites = list_response.json().get("invites", [])
        matching_invites = [i for i in invites if i["email"] == test_email.lower()]
        assert len(matching_invites) == 1, "Should have only one invite per email"
        assert matching_invites[0]["template"] == "onboarding", "Template should be updated"


class TestApplicationInviteWorkflow:
    """Test the complete workflow of sending and using an invite"""
    
    def test_complete_invite_workflow(self, base_url, auth_headers):
        """Test complete workflow: send invite -> get details -> submit application"""
        test_email = f"test_workflow_{uuid.uuid4().hex[:8]}@example.com"
        
        # Step 1: Send invite
        send_response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": ["address", "why_join"]
            },
            headers=auth_headers
        )
        assert send_response.status_code == 200, f"Failed to send invite: {send_response.text}"
        
        # Extract token from URL
        application_url = send_response.json().get("application_url", "")
        # URL format: https://thrifty-curator.com/apply/{token}
        token = application_url.split("/apply/")[-1] if "/apply/" in application_url else None
        assert token, f"Could not extract token from URL: {application_url}"
        
        # Step 2: Get invite details (simulating applicant opening link)
        details_response = requests.get(f"{base_url}/api/forms/application-invite/{token}")
        assert details_response.status_code == 200, f"Failed to get invite details: {details_response.text}"
        details = details_response.json()
        assert details.get("email") == test_email.lower()
        assert "required_fields" in details
        assert "address" in details["required_fields"]
        assert "why_join" in details["required_fields"]
        
        # Step 3: Submit application
        submit_response = requests.post(
            f"{base_url}/api/forms/application-invite/{token}",
            json={
                "full_name": "Test Applicant",
                "email": test_email,
                "phone": "555-123-4567",
                "address": "123 Test Street, Test City, TS 12345",
                "why_join": "I am excited about this opportunity!",
                "availability": "Mon-Fri 9am-5pm",
                "tasks_able_to_perform": ["photography", "listing"],
                "background_check_consent": True,
                "has_reliable_transportation": True
            }
        )
        assert submit_response.status_code == 200, f"Failed to submit application: {submit_response.text}"
        submit_data = submit_response.json()
        assert submit_data.get("success") is True
        
        # Step 4: Verify invite status changed to completed
        list_response = requests.get(
            f"{base_url}/api/admin/application-invites",
            headers=auth_headers
        )
        invites = list_response.json().get("invites", [])
        matching = [i for i in invites if i["email"] == test_email.lower()]
        assert len(matching) == 1
        assert matching[0]["status"] == "completed"
        assert matching[0]["application_id"] is not None
    
    def test_cannot_submit_twice(self, base_url, auth_headers):
        """Test that application cannot be submitted twice with same token"""
        test_email = f"test_double_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send invite
        send_response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": []
            },
            headers=auth_headers
        )
        assert send_response.status_code == 200
        
        application_url = send_response.json().get("application_url", "")
        token = application_url.split("/apply/")[-1]
        
        # Submit first application
        submit1 = requests.post(
            f"{base_url}/api/forms/application-invite/{token}",
            json={
                "full_name": "Test User",
                "email": test_email,
                "phone": ""
            }
        )
        assert submit1.status_code == 200
        
        # Try to submit again
        submit2 = requests.post(
            f"{base_url}/api/forms/application-invite/{token}",
            json={
                "full_name": "Test User Again",
                "email": test_email,
                "phone": ""
            }
        )
        assert submit2.status_code == 400, f"Expected 400, got {submit2.status_code}"
        assert "already submitted" in submit2.json().get("detail", "").lower()


class TestAlternativeContactFields:
    """Test alternative contact fields for applicants without personal phone"""
    
    def test_submit_with_alternative_contact(self, base_url, auth_headers):
        """Test submitting application with alternative contact info"""
        test_email = f"test_altcontact_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send invite
        send_response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": []
            },
            headers=auth_headers
        )
        assert send_response.status_code == 200
        
        application_url = send_response.json().get("application_url", "")
        token = application_url.split("/apply/")[-1]
        
        # Submit with alternative contact (no personal phone)
        submit_response = requests.post(
            f"{base_url}/api/forms/application-invite/{token}",
            json={
                "full_name": "Test No Phone",
                "email": test_email,
                "phone": "",  # No personal phone
                "alt_contact_name": "Parent Name",
                "alt_contact_phone": "555-987-6543",
                "alt_contact_reason": "No personal phone, please contact my parent",
                "preferred_contact": "email"
            }
        )
        assert submit_response.status_code == 200, f"Failed to submit: {submit_response.text}"
        
        # Verify application was created with alt contact fields
        # Check in job applications list
        apps_response = requests.get(
            f"{base_url}/api/admin/forms/job-applications",
            headers=auth_headers
        )
        assert apps_response.status_code == 200
        apps = apps_response.json()
        
        # Find our application
        matching = [a for a in apps if a.get("email", "").lower() == test_email.lower()]
        assert len(matching) >= 1, "Application should be in job applications list"
        app = matching[0]
        assert app.get("alt_contact_name") == "Parent Name"
        assert app.get("alt_contact_phone") == "555-987-6543"
        assert app.get("alt_contact_reason") == "No personal phone, please contact my parent"
        assert app.get("invited") is True


class TestDeleteInvite:
    """Test deleting application invites"""
    
    def test_delete_invite(self, base_url, auth_headers):
        """Test deleting an invite"""
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@example.com"
        
        # Send invite
        send_response = requests.post(
            f"{base_url}/api/admin/application-invites/send",
            json={
                "email": test_email,
                "template": "generic",
                "required_fields": []
            },
            headers=auth_headers
        )
        assert send_response.status_code == 200
        
        # Get invite ID
        list_response = requests.get(
            f"{base_url}/api/admin/application-invites",
            headers=auth_headers
        )
        invites = list_response.json().get("invites", [])
        matching = [i for i in invites if i["email"] == test_email.lower()]
        assert len(matching) == 1
        invite_id = matching[0]["id"]
        
        # Delete invite
        delete_response = requests.delete(
            f"{base_url}/api/admin/application-invites/{invite_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        
        # Verify deleted
        list_response2 = requests.get(
            f"{base_url}/api/admin/application-invites",
            headers=auth_headers
        )
        invites2 = list_response2.json().get("invites", [])
        matching2 = [i for i in invites2 if i["email"] == test_email.lower()]
        assert len(matching2) == 0, "Invite should be deleted"
    
    def test_delete_nonexistent_invite(self, base_url, auth_headers):
        """Test deleting a non-existent invite returns 404"""
        response = requests.delete(
            f"{base_url}/api/admin/application-invites/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
