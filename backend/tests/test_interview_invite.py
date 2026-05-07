"""
Tests for the Interview Invite feature for job applicants.
Tests the POST /api/admin/forms/job-applications/{submission_id}/invite endpoint.
"""
import pytest
import requests
import uuid
from datetime import datetime, timedelta


class TestInterviewInviteAPI:
    """Test suite for Interview Invite API endpoint"""
    
    @pytest.fixture(scope="class")
    def test_job_application(self, base_url, auth_headers):
        """Create a test job application for testing invites"""
        # First check if there's an existing application we can use
        response = requests.get(
            f"{base_url}/api/admin/forms/job-applications",
            headers=auth_headers
        )
        if response.status_code == 200:
            applications = response.json()
            if applications:
                return applications[0]
        
        # If no existing application, create one
        test_app = {
            "full_name": f"TEST_Invite_{uuid.uuid4().hex[:8]}",
            "email": f"test_invite_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "555-0123",
            "address": "123 Test Street",
            "resume_text": "Test resume for invite testing",
            "why_join": "Testing the invite feature",
            "availability": "Flexible",
            "tasks_able_to_perform": ["shipping", "photography"],
            "background_check_consent": True,
            "has_reliable_transportation": True
        }
        
        response = requests.post(
            f"{base_url}/api/forms/job-application",
            json=test_app
        )
        assert response.status_code == 200, f"Failed to create test application: {response.text}"
        return response.json()
    
    def test_send_invite_with_single_slot(self, base_url, auth_headers, test_job_application):
        """Test sending an interview invite with a single availability slot"""
        submission_id = test_job_application["id"]
        
        # Create availability slot for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        invite_data = {
            "availability_slots": [
                {"date": tomorrow, "startTime": "10:00", "endTime": "12:00"}
            ]
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{submission_id}/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to send invite: {response.text}"
        data = response.json()
        assert "message" in data
        assert "Invite email sent successfully" in data["message"]
        assert "result" in data
        assert data["result"]["status"] in ["success", "mocked"]
    
    def test_send_invite_with_multiple_slots(self, base_url, auth_headers, test_job_application):
        """Test sending an interview invite with multiple availability slots"""
        submission_id = test_job_application["id"]
        
        # Create multiple availability slots
        day1 = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        day2 = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        day3 = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        
        invite_data = {
            "availability_slots": [
                {"date": day1, "startTime": "09:00", "endTime": "11:00"},
                {"date": day2, "startTime": "14:00", "endTime": "16:00"},
                {"date": day3, "startTime": "10:00", "endTime": "12:00"}
            ]
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{submission_id}/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to send invite: {response.text}"
        data = response.json()
        assert data["result"]["status"] in ["success", "mocked"]
    
    def test_invite_updates_application_record(self, base_url, auth_headers, test_job_application):
        """Test that sending an invite updates the application record with invite_sent flag"""
        submission_id = test_job_application["id"]
        
        # Send an invite
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        invite_data = {
            "availability_slots": [
                {"date": tomorrow, "startTime": "10:00", "endTime": "12:00"}
            ]
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{submission_id}/invite",
            json=invite_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify the application record was updated
        response = requests.get(
            f"{base_url}/api/admin/forms/job-applications",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        applications = response.json()
        updated_app = next((a for a in applications if a["id"] == submission_id), None)
        
        assert updated_app is not None, "Application not found after invite"
        assert updated_app.get("invite_sent") == True, "invite_sent flag not set"
        assert "invite_sent_at" in updated_app, "invite_sent_at timestamp not set"
        assert "invite_availability_slots" in updated_app, "invite_availability_slots not stored"
    
    def test_invite_with_invalid_submission_id(self, base_url, auth_headers):
        """Test sending invite to non-existent application returns 404"""
        fake_id = str(uuid.uuid4())
        
        invite_data = {
            "availability_slots": [
                {"date": "2026-03-20", "startTime": "10:00", "endTime": "12:00"}
            ]
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{fake_id}/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert "not found" in response.json()["detail"].lower()
    
    def test_invite_without_auth_fails(self, base_url, test_job_application):
        """Test that sending invite without authentication fails"""
        submission_id = test_job_application["id"]
        
        invite_data = {
            "availability_slots": [
                {"date": "2026-03-20", "startTime": "10:00", "endTime": "12:00"}
            ]
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{submission_id}/invite",
            json=invite_data
        )
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
    
    def test_invite_with_empty_slots(self, base_url, auth_headers, test_job_application):
        """Test sending invite with empty availability slots"""
        submission_id = test_job_application["id"]
        
        invite_data = {
            "availability_slots": []
        }
        
        response = requests.post(
            f"{base_url}/api/admin/forms/job-applications/{submission_id}/invite",
            json=invite_data,
            headers=auth_headers
        )
        
        # The API should still work with empty slots (email will show generic message)
        # This tests the edge case handling
        assert response.status_code == 200, f"Failed with empty slots: {response.text}"


class TestEmailServiceIntegration:
    """Test the email service integration for interview invites"""
    
    def test_email_service_status(self, base_url, auth_headers):
        """Test that email service status endpoint works"""
        response = requests.get(
            f"{base_url}/api/admin/email/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "mode" in data
        assert data["mode"] in ["live", "mocked"]
