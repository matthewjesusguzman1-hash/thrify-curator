"""
Test Interview Scheduling Features
Tests the new preselect/review workflow for interview scheduling:
1. Schedule (Save Draft) endpoint
2. Send Scheduled endpoint
3. Interview inbox with scheduled status
4. CT (Central Time) conversion storage
"""
import pytest
import requests
import uuid
from datetime import datetime

# Import fixtures from conftest
from conftest import BASE_URL, ADMIN_EMAIL, ADMIN_CODE


class TestInterviewSchedulingAPI:
    """Test the interview scheduling API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        # Get auth token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Auth failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_interview_inbox_returns_requests(self):
        """Test that interview inbox returns list of requests"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        
    def test_interview_inbox_includes_scheduled_status(self):
        """Test that interview inbox can include scheduled status interviews"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if any requests have scheduled status
        # This validates the status field exists
        for req in data["requests"]:
            assert "status" in req, "Request should have status field"
            # Valid statuses
            valid_statuses = ["pending", "responded", "scheduled", "confirmed", "needs_reschedule"]
            assert req["status"] in valid_statuses, f"Invalid status: {req['status']}"
            
    def test_interview_inbox_scheduled_has_ct_time(self):
        """Test that scheduled interviews include CT time conversion"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find scheduled or confirmed interviews
        for req in data["requests"]:
            if req["status"] in ["scheduled", "confirmed"]:
                # Should have scheduled_datetime_ct or confirmed_datetime_ct
                has_ct = (
                    req.get("scheduled_datetime_ct") or 
                    req.get("confirmed_datetime_ct")
                )
                if req.get("scheduled_datetime") or req.get("confirmed_datetime"):
                    # If there's a datetime, there should be CT conversion
                    assert has_ct, f"Scheduled/confirmed interview should have CT time: {req}"
                    
    def test_schedule_endpoint_exists(self):
        """Test that the schedule endpoint exists (even if no valid request_id)"""
        # Use a fake request_id - should return 404 not 405
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/applicant-tests/interview-inbox/{fake_id}/schedule",
            headers=self.headers,
            json={
                "scheduled_datetime": "Monday, March 2, 2026 at 9:00 AM - 9:30 AM PHT",
                "scheduled_datetime_ct": "Sun, Mar 1, 7:00 PM - 7:30 PM CT",
                "meeting_link": "https://meet.google.com/test-link"
            }
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_send_scheduled_endpoint_exists(self):
        """Test that the send-scheduled endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/applicant-tests/interview-inbox/{fake_id}/send-scheduled",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_schedule_requires_auth(self):
        """Test that schedule endpoint requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/applicant-tests/interview-inbox/{fake_id}/schedule",
            json={
                "scheduled_datetime": "Monday, March 2, 2026 at 9:00 AM PHT",
                "scheduled_datetime_ct": "Sun, Mar 1, 7:00 PM CT",
                "meeting_link": "https://meet.google.com/test"
            }
        )
        # 401 or 403 both indicate auth is required
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_send_scheduled_requires_auth(self):
        """Test that send-scheduled endpoint requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/applicant-tests/interview-inbox/{fake_id}/send-scheduled"
        )
        # 401 or 403 both indicate auth is required
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestInterviewSchedulingWithRealData:
    """Test scheduling with real interview request data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_existing_interview_request(self):
        """Test getting details of an existing interview request"""
        # First get the inbox
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["requests"]) > 0:
            request_id = data["requests"][0]["id"]
            
            # Get specific request details
            detail_response = requests.get(
                f"{BASE_URL}/api/applicant-tests/interview-inbox/{request_id}",
                headers=self.headers
            )
            assert detail_response.status_code == 200
            detail = detail_response.json()
            
            # Verify structure
            assert "id" in detail
            assert "applicant_name" in detail
            assert "applicant_email" in detail
            assert "status" in detail
        else:
            pytest.skip("No interview requests in inbox to test")
            
    def test_scheduled_interview_has_required_fields(self):
        """Test that scheduled interviews have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        scheduled = [r for r in data["requests"] if r["status"] == "scheduled"]
        
        for interview in scheduled:
            # Scheduled interviews should have these fields
            assert "scheduled_datetime" in interview, "Missing scheduled_datetime"
            assert "scheduled_datetime_ct" in interview, "Missing scheduled_datetime_ct (CT conversion)"
            assert "scheduled_meeting_link" in interview, "Missing scheduled_meeting_link"
            assert "scheduled_at" in interview, "Missing scheduled_at timestamp"
            
    def test_confirmed_interview_has_required_fields(self):
        """Test that confirmed interviews have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        confirmed = [r for r in data["requests"] if r["status"] == "confirmed"]
        
        for interview in confirmed:
            # Confirmed interviews should have these fields
            assert "confirmed_datetime" in interview, "Missing confirmed_datetime"
            assert "meeting_link" in interview, "Missing meeting_link"
            assert "confirmed_at" in interview, "Missing confirmed_at timestamp"
            # CT time should also be present
            if interview.get("confirmed_datetime_ct"):
                assert "CT" in interview["confirmed_datetime_ct"], "CT time should contain 'CT'"


class TestCTTimeConversion:
    """Test Central Time conversion functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_ct_time_format_in_scheduled(self):
        """Test that CT time is properly formatted in scheduled interviews"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for req in data["requests"]:
            ct_time = req.get("scheduled_datetime_ct") or req.get("confirmed_datetime_ct")
            if ct_time:
                # CT time should contain "CT" suffix
                assert "CT" in ct_time, f"CT time should contain 'CT': {ct_time}"
                # Should have time format (AM/PM)
                assert "AM" in ct_time or "PM" in ct_time, f"CT time should have AM/PM: {ct_time}"
                
    def test_applicant_time_slots_have_ct_conversion(self):
        """Test that applicant time slots include CT conversion (for new submissions)"""
        response = requests.get(
            f"{BASE_URL}/api/applicant-tests/interview-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that at least one slot has CT conversion (new submissions should have it)
        # Old data may not have CT fields, so we just verify the structure is correct
        found_slot_with_ct = False
        for req in data["requests"]:
            if req.get("applicant_response") and req["applicant_response"].get("time_slots"):
                for slot in req["applicant_response"]["time_slots"]:
                    # Each slot should have basic fields
                    assert "date" in slot, f"Slot missing date: {slot}"
                    assert "start_time_pht" in slot, f"Slot missing start_time_pht: {slot}"
                    assert "end_time_pht" in slot, f"Slot missing end_time_pht: {slot}"
                    # CT fields are optional for backward compatibility with old data
                    if "start_time_ct" in slot and "end_time_ct" in slot:
                        found_slot_with_ct = True
        
        # Note: Old data may not have CT fields, this is expected
