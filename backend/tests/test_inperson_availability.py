"""
Test In-Person Interview Availability Scheduling APIs
Tests the new availability-based in-person interview scheduling system:
1. Admin sends availability request to applicant
2. Applicant submits availability windows
3. Admin reviews and schedules from availability
4. Admin sends confirmation email
5. CT/PHT time display
"""
import pytest
import requests
import uuid
from datetime import datetime, timedelta

# Import fixtures from conftest
from conftest import BASE_URL, ADMIN_EMAIL, ADMIN_CODE


class TestAvailabilityInboxAPI:
    """Test the availability inbox API endpoints"""
    
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
        
    def test_availability_inbox_endpoint_exists(self):
        """Test that availability inbox endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        
    def test_availability_inbox_requires_auth(self):
        """Test that availability inbox requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_availability_inbox_request_structure(self):
        """Test that availability inbox requests have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for req in data["requests"]:
            # Required fields
            assert "id" in req, "Request should have id"
            assert "applicant_id" in req, "Request should have applicant_id"
            assert "applicant_name" in req, "Request should have applicant_name"
            assert "applicant_email" in req, "Request should have applicant_email"
            assert "status" in req, "Request should have status"
            
            # Valid statuses
            valid_statuses = ["pending", "responded", "scheduled", "confirmed", "needs_reschedule"]
            assert req["status"] in valid_statuses, f"Invalid status: {req['status']}"


class TestSendAvailabilityRequestAPI:
    """Test sending availability request to applicants"""
    
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
        
    def test_send_availability_request_endpoint_exists(self):
        """Test that send availability request endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/send-availability-request/{fake_id}",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_send_availability_request_requires_auth(self):
        """Test that send availability request requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/send-availability-request/{fake_id}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestApplicantAvailabilitySubmission:
    """Test applicant availability submission endpoints"""
    
    def test_get_availability_with_invalid_token(self):
        """Test that invalid token returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/availability/invalid-token-12345"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "Invalid" in data["detail"] or "expired" in data["detail"]
        
    def test_post_availability_with_invalid_token(self):
        """Test that posting availability with invalid token returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/availability/invalid-token-12345",
            json={
                "availability": [
                    {
                        "date": "2026-03-15",
                        "start_time": "09:00",
                        "end_time": "12:00"
                    }
                ]
            }
        )
        assert response.status_code == 404


class TestScheduleFromAvailabilityAPI:
    """Test scheduling from availability endpoints"""
    
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
        
    def test_schedule_endpoint_exists(self):
        """Test that schedule endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}/schedule",
            headers=self.headers,
            json={
                "selected_datetime": "Monday, March 15, 2026 at 9:00 AM - 9:30 AM PHT",
                "selected_datetime_ct": "Sun, Mar 14, 7:00 PM - 7:30 PM CT",
                "location": "Thrifty Curator Store"
            }
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_schedule_requires_auth(self):
        """Test that schedule endpoint requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}/schedule",
            json={
                "selected_datetime": "Monday, March 15, 2026 at 9:00 AM PHT",
                "selected_datetime_ct": "Sun, Mar 14, 7:00 PM CT",
                "location": "Thrifty Curator Store"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_send_confirmation_endpoint_exists(self):
        """Test that send confirmation endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}/send-confirmation",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_send_confirmation_requires_auth(self):
        """Test that send confirmation requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}/send-confirmation"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_unschedule_endpoint_exists(self):
        """Test that unschedule endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}/unschedule",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
    def test_delete_availability_request_endpoint_exists(self):
        """Test that delete endpoint exists"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox/{fake_id}",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


class TestAvailabilityInboxWithRealData:
    """Test availability inbox with real data if available"""
    
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
        
    def test_responded_requests_have_availability(self):
        """Test that responded requests have availability data"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        responded = [r for r in data["requests"] if r["status"] == "responded"]
        
        for req in responded:
            assert "availability" in req, "Responded request should have availability"
            assert isinstance(req["availability"], list), "Availability should be a list"
            
            # Each availability window should have date, start_time, end_time
            for window in req["availability"]:
                assert "date" in window, "Availability window should have date"
                assert "start_time" in window, "Availability window should have start_time"
                assert "end_time" in window, "Availability window should have end_time"
                
    def test_scheduled_requests_have_datetime_and_ct(self):
        """Test that scheduled requests have datetime and CT conversion"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        scheduled = [r for r in data["requests"] if r["status"] == "scheduled"]
        
        for req in scheduled:
            assert "scheduled_datetime" in req, "Scheduled request should have scheduled_datetime"
            assert "scheduled_datetime_ct" in req, "Scheduled request should have scheduled_datetime_ct"
            assert "scheduled_location" in req, "Scheduled request should have scheduled_location"
            
            # CT time should contain "CT"
            if req.get("scheduled_datetime_ct"):
                assert "CT" in req["scheduled_datetime_ct"], f"CT time should contain 'CT': {req['scheduled_datetime_ct']}"
                
    def test_confirmed_requests_have_confirmed_datetime(self):
        """Test that confirmed requests have confirmed datetime"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/availability-inbox",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        confirmed = [r for r in data["requests"] if r["status"] == "confirmed"]
        
        for req in confirmed:
            assert "confirmed_datetime" in req, "Confirmed request should have confirmed_datetime"
            assert "confirmed_at" in req, "Confirmed request should have confirmed_at timestamp"


class TestConflictDetectionAPI:
    """Test interview conflict detection"""
    
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
        
    def test_check_conflicts_endpoint_exists(self):
        """Test that check conflicts endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/check-conflicts",
            headers=self.headers,
            params={"datetime_ct": "Mon, Mar 15, 9:00 AM CT"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "conflicts" in data
        assert isinstance(data["conflicts"], list)
        
    def test_check_conflicts_requires_auth(self):
        """Test that check conflicts requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/check-conflicts",
            params={"datetime_ct": "Mon, Mar 15, 9:00 AM CT"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAllInpersonInterviewsAPI:
    """Test getting all in-person interviews"""
    
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
        
    def test_all_inperson_interviews_endpoint_exists(self):
        """Test that all in-person interviews endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/all-inperson-interviews",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have both availability-based and slot-based interviews
        assert "availability_based" in data
        assert "slot_based" in data
        assert isinstance(data["availability_based"], list)
        assert isinstance(data["slot_based"], list)
        
    def test_all_inperson_interviews_requires_auth(self):
        """Test that all in-person interviews requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/interview-scheduler/admin/all-inperson-interviews"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
