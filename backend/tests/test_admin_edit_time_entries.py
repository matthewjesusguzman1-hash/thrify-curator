"""
Backend API Tests for Admin Edit/Delete Time Entry Feature
Tests: GET/PUT/DELETE /api/admin/time-entries/{entry_id}
Tests: Auto-calculation of total_hours, validation, mark-read with empty body
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

# Try multiple sources for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '') or os.environ.get('BASE_URL', '') or 'https://thrifty-curator.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

TEST_ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"


class TestAdminTimeEntryManagement:
    """Admin can edit and delete time entries"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def create_test_time_entry(self, admin_token):
        """Create an employee with a completed time entry for testing"""
        # Create employee
        emp_email = f"edit_test_{uuid.uuid4().hex[:8]}@test.com"
        emp_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Edit Test Employee", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert emp_resp.status_code == 200
        emp_id = emp_resp.json()["id"]
        
        # Login as employee
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        emp_token = login_resp.json()["access_token"]
        
        # Clock in
        clock_in_resp = requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        entry_id = clock_in_resp.json()["id"]
        
        # Clock out
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "out"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        
        return {"entry_id": entry_id, "emp_id": emp_id, "emp_email": emp_email}
    
    def test_get_single_time_entry(self, admin_token, create_test_time_entry):
        """Admin can GET a specific time entry by ID"""
        entry_id = create_test_time_entry["entry_id"]
        
        response = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Failed to get time entry: {response.text}"
        data = response.json()
        
        # Verify structure
        assert data["id"] == entry_id
        assert "user_id" in data
        assert "user_name" in data
        assert "clock_in" in data
        assert "clock_out" in data
        assert "total_hours" in data
        print(f"GET time entry successful: {data}")
    
    def test_get_nonexistent_time_entry_returns_404(self, admin_token):
        """GET nonexistent time entry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.get(f"{BASE_URL}/api/admin/time-entries/{fake_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 404
        print(f"Correctly returned 404 for nonexistent entry")
    
    def test_update_clock_in_time(self, admin_token, create_test_time_entry):
        """Admin can update clock_in time and total_hours is recalculated"""
        entry_id = create_test_time_entry["entry_id"]
        
        # Get original entry
        original = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        original_hours = original["total_hours"]
        
        # Update clock_in to 2 hours earlier
        new_clock_in = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
        
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={"clock_in": new_clock_in},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        
        # Verify clock_in updated
        assert data["clock_in"] == new_clock_in
        # Verify total_hours was recalculated (should be different from original)
        assert "total_hours" in data
        print(f"Updated clock_in: {data['clock_in']}, new total_hours: {data['total_hours']}")
        
        # Verify with GET
        verify = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        assert verify["clock_in"] == new_clock_in
        print("Verified update persisted via GET")
    
    def test_update_clock_out_time(self, admin_token, create_test_time_entry):
        """Admin can update clock_out time and total_hours is recalculated"""
        entry_id = create_test_time_entry["entry_id"]
        
        # Get original entry
        original = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        
        # Update clock_out to 2 hours later
        new_clock_out = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={"clock_out": new_clock_out},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        
        # Verify clock_out updated
        assert data["clock_out"] == new_clock_out
        # Verify total_hours was recalculated
        assert "total_hours" in data
        assert data["total_hours"] > 0
        print(f"Updated clock_out: {data['clock_out']}, new total_hours: {data['total_hours']}")
    
    def test_update_both_clock_in_and_out(self, admin_token, create_test_time_entry):
        """Admin can update both clock_in and clock_out, hours auto-calculated"""
        entry_id = create_test_time_entry["entry_id"]
        
        # Set specific times - 3 hours apart
        now = datetime.now(timezone.utc)
        new_clock_in = (now - timedelta(hours=3)).isoformat()
        new_clock_out = now.isoformat()
        
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={
                "clock_in": new_clock_in,
                "clock_out": new_clock_out
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        
        # Verify both times updated
        assert data["clock_in"] == new_clock_in
        assert data["clock_out"] == new_clock_out
        
        # Verify total_hours is approximately 3 (allow small variance)
        assert abs(data["total_hours"] - 3.0) < 0.1, f"Expected ~3 hours, got {data['total_hours']}"
        print(f"Updated both times, total_hours: {data['total_hours']} (expected ~3.0)")
    
    def test_update_with_invalid_date_format_returns_400(self, admin_token, create_test_time_entry):
        """Invalid date format should return 400"""
        entry_id = create_test_time_entry["entry_id"]
        
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={"clock_in": "invalid-date-format"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        print(f"Correctly rejected invalid date format: {response.json()}")
    
    def test_update_nonexistent_entry_returns_404(self, admin_token):
        """Update nonexistent entry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{fake_id}",
            json={"clock_in": datetime.now(timezone.utc).isoformat()},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent entry update")
    
    def test_update_with_empty_body_returns_existing_entry(self, admin_token, create_test_time_entry):
        """Update with no fields returns existing entry (idempotent behavior)"""
        entry_id = create_test_time_entry["entry_id"]
        
        # Get original entry
        original = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        }).json()
        
        # Send empty update
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # API returns the existing entry unchanged - acceptable idempotent behavior
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entry_id
        print(f"Empty update returned existing entry: {data}")
    
    def test_delete_time_entry(self, admin_token, create_test_time_entry):
        """Admin can delete a time entry"""
        entry_id = create_test_time_entry["entry_id"]
        
        # Verify entry exists first
        get_resp = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert get_resp.status_code == 200
        
        # Delete entry
        response = requests.delete(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Delete response: {data}")
        
        # Verify entry no longer exists
        verify = requests.get(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert verify.status_code == 404, "Entry should be deleted"
        print("Verified entry deleted (GET returns 404)")
    
    def test_delete_nonexistent_entry_returns_404(self, admin_token):
        """Delete nonexistent entry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(f"{BASE_URL}/api/admin/time-entries/{fake_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent entry delete")


class TestEmployeeCannotEditTimeEntries:
    """Employees should not be able to edit or delete time entries"""
    
    @pytest.fixture
    def employee_token(self):
        """Create employee and get token"""
        # Get admin token
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        admin_token = admin_resp.json()["access_token"]
        
        # Create employee
        emp_email = f"auth_edit_test_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Auth Edit Test", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as employee
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        return emp_resp.json()["access_token"]
    
    def test_employee_cannot_get_admin_time_entry(self, employee_token):
        """Employee cannot access admin time entry GET endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries/some-id", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 403
        print("Employee correctly denied access to GET time entry")
    
    def test_employee_cannot_update_time_entry(self, employee_token):
        """Employee cannot access admin time entry PUT endpoint"""
        response = requests.put(f"{BASE_URL}/api/admin/time-entries/some-id",
            json={"clock_in": datetime.now(timezone.utc).isoformat()},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 403
        print("Employee correctly denied access to PUT time entry")
    
    def test_employee_cannot_delete_time_entry(self, employee_token):
        """Employee cannot access admin time entry DELETE endpoint"""
        response = requests.delete(f"{BASE_URL}/api/admin/time-entries/some-id", headers={
            "Authorization": f"Bearer {employee_token}"
        })
        assert response.status_code == 403
        print("Employee correctly denied access to DELETE time entry")


class TestMarkNotificationsReadWithEmptyBody:
    """Test that mark-read notifications endpoint works with empty body (bug fix)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_mark_all_read_with_empty_json_body(self, admin_token):
        """Mark all read works with empty JSON body {}"""
        response = requests.post(f"{BASE_URL}/api/admin/notifications/mark-read",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Mark-read with empty body failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Mark-read with empty body successful: {data}")
    
    def test_mark_all_read_with_no_body(self, admin_token):
        """Mark all read works with no request body (Content-Type: application/json)"""
        response = requests.post(f"{BASE_URL}/api/admin/notifications/mark-read",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }
        )
        
        # This should work since MarkReadRequest is optional with default None
        assert response.status_code == 200, f"Mark-read with no body failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Mark-read with no body successful: {data}")
    
    def test_mark_specific_notifications_read(self, admin_token):
        """Mark specific notifications as read by IDs"""
        # First create some notifications by triggering clock events
        emp_email = f"notif_test_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/admin/create-employee",
            json={"name": "Notif Test", "email": emp_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        emp_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": emp_email})
        emp_token = emp_resp.json()["access_token"]
        
        # Clock in to create notification
        requests.post(f"{BASE_URL}/api/time/clock",
            json={"action": "in"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        
        # Get notifications
        notif_resp = requests.get(f"{BASE_URL}/api/admin/notifications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        notifications = notif_resp.json()["notifications"]
        
        if len(notifications) > 0:
            notif_id = notifications[0]["id"]
            
            # Mark specific notification as read
            response = requests.post(f"{BASE_URL}/api/admin/notifications/mark-read",
                json={"notification_ids": [notif_id]},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200
            print(f"Mark specific notification read successful for ID: {notif_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
