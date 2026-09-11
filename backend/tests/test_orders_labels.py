"""
Test suite for Orders and Shipping Labels feature
Tests: Label upload, Order assignments, Employee order workflow
"""
import pytest
import requests
import os
import io
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
EMPLOYEE_EMAIL = "remote_worker@test.com"


class TestOrdersLabelsAPI:
    """Test suite for Orders and Shipping Labels endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.employee_token = None
        self.created_label_ids = []
        self.created_assignment_ids = []
        yield
        # Cleanup
        self._cleanup()
    
    def _cleanup(self):
        """Clean up test data"""
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            # Delete created labels
            for label_id in self.created_label_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/orders/labels/{label_id}", headers=headers)
                except Exception:
                    pass
            # Delete created assignments
            for assignment_id in self.created_assignment_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/orders/assignments/{assignment_id}", headers=headers)
                except Exception:
                    pass
    
    def _get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        
        # Admin login with email and admin_code
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data.get("access_token")
        assert self.admin_token, "No token returned from admin login"
        return self.admin_token
    
    def _get_employee_token(self):
        """Get employee authentication token"""
        if self.employee_token:
            return self.employee_token
        
        # Employee login (no password required for this test account)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={"email": EMPLOYEE_EMAIL})
        if response.status_code == 200:
            data = response.json()
            self.employee_token = data.get("access_token")
            # Store employee ID from login response
            self.employee_id = data.get("user", {}).get("id")
        
        return self.employee_token
    
    def _get_employee_id(self, token):
        """Get employee ID from stored value or token"""
        if hasattr(self, 'employee_id') and self.employee_id:
            return self.employee_id
        # Fallback: try to get from /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if response.status_code == 200:
            return response.json().get("id")
        return None
    
    # ============== LABEL UPLOAD TESTS ==============
    
    def test_labels_list_requires_auth(self):
        """Test that listing labels requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/orders/labels")
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Labels list requires authentication")
    
    def test_labels_list_as_admin(self):
        """Test admin can list shipping labels"""
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/orders/labels", headers=headers)
        assert response.status_code == 200, f"Failed to list labels: {response.text}"
        
        data = response.json()
        assert "labels" in data, "Response missing 'labels' field"
        assert "total" in data, "Response missing 'total' field"
        assert isinstance(data["labels"], list), "Labels should be a list"
        print(f"PASS: Admin can list labels (found {data['total']} labels)")
    
    def test_label_upload_requires_auth(self):
        """Test that uploading labels requires authentication"""
        # Create a simple test file
        files = {"file": ("test.pdf", b"test content", "application/pdf")}
        response = requests.post(f"{BASE_URL}/api/orders/labels/upload", files=files)
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Label upload requires authentication")
    
    def test_label_upload_as_admin(self):
        """Test admin can upload a shipping label"""
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a simple test PDF-like file
        test_content = b"%PDF-1.4 test content for shipping label"
        files = {"file": ("test_label.pdf", test_content, "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/orders/labels/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to upload label: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert "filename" in data, "Response missing 'filename' field"
        assert data["filename"] == "test_label.pdf", f"Unexpected filename: {data['filename']}"
        
        self.created_label_ids.append(data["id"])
        print(f"PASS: Admin uploaded label with ID: {data['id']}")
        return data["id"]
    
    def test_label_upload_image(self):
        """Test admin can upload an image label"""
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a simple PNG-like file
        test_content = b"\x89PNG\r\n\x1a\n test image content"
        files = {"file": ("test_label.png", test_content, "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/orders/labels/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to upload image label: {response.text}"
        
        data = response.json()
        assert data["filename"] == "test_label.png"
        self.created_label_ids.append(data["id"])
        print(f"PASS: Admin uploaded image label with ID: {data['id']}")
    
    def test_label_delete(self):
        """Test admin can delete a label"""
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # First upload a label
        test_content = b"%PDF-1.4 test content to delete"
        files = {"file": ("delete_me.pdf", test_content, "application/pdf")}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/orders/labels/upload",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        label_id = upload_response.json()["id"]
        
        # Now delete it
        delete_response = self.session.delete(
            f"{BASE_URL}/api/orders/labels/{label_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Failed to delete label: {delete_response.text}"
        assert delete_response.json().get("deleted") == True
        print(f"PASS: Admin deleted label {label_id}")
    
    def test_label_file_access_requires_token(self):
        """Test that accessing label file requires token"""
        response = self.session.get(f"{BASE_URL}/api/orders/labels/fake-id/file")
        assert response.status_code == 401
        print("PASS: Label file access requires token")
    
    # ============== ORDER ASSIGNMENT TESTS ==============
    
    def test_assignments_list_requires_auth(self):
        """Test that listing assignments requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/orders/assignments")
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Assignments list requires authentication")
    
    def test_assignments_list_as_admin(self):
        """Test admin can list order assignments"""
        token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/orders/assignments", headers=headers)
        assert response.status_code == 200, f"Failed to list assignments: {response.text}"
        
        data = response.json()
        assert "assignments" in data, "Response missing 'assignments' field"
        assert "total" in data, "Response missing 'total' field"
        print(f"PASS: Admin can list assignments (found {data['total']} assignments)")
    
    def test_assign_orders_requires_auth(self):
        """Test that assigning orders requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/orders/assign", json={
            "employee_id": "fake-id"
        })
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Assign orders requires authentication")
    
    def test_assign_orders_to_employee(self):
        """Test admin can assign orders to an employee"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get employee token and ID
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # First, cancel any existing active assignment for this employee
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Upload a test label first
        test_content = b"%PDF-1.4 test shipping label for assignment"
        files = {"file": ("assignment_label.pdf", test_content, "application/pdf")}
        label_response = requests.post(
            f"{BASE_URL}/api/orders/labels/upload",
            files=files,
            headers=admin_headers
        )
        label_id = None
        if label_response.status_code == 200:
            label_id = label_response.json()["id"]
            self.created_label_ids.append(label_id)
        
        # Assign orders
        today = time.strftime("%Y-%m-%d")
        assign_payload = {
            "employee_id": employee_id,
            "since": today,
            "until": today,
            "label_ids": [label_id] if label_id else [],
            "notes": "TEST: Automated test assignment"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json=assign_payload,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to assign orders: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data["status"] == "active", f"Unexpected status: {data['status']}"
        
        self.created_assignment_ids.append(data["id"])
        print(f"PASS: Admin assigned orders to employee, assignment ID: {data['id']}")
        return data["id"]
    
    def test_cancel_assignment(self):
        """Test admin can cancel an assignment"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get employee token and ID
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # First, cancel any existing active assignment
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create an assignment to cancel
        today = time.strftime("%Y-%m-%d")
        assign_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: To be cancelled"
            },
            headers=admin_headers
        )
        assert assign_response.status_code == 200
        assignment_id = assign_response.json()["id"]
        
        # Cancel it
        cancel_response = self.session.delete(
            f"{BASE_URL}/api/orders/assignments/{assignment_id}",
            headers=admin_headers
        )
        assert cancel_response.status_code == 200, f"Failed to cancel: {cancel_response.text}"
        assert cancel_response.json().get("deleted") == True
        print(f"PASS: Admin cancelled assignment {assignment_id}")
    
    # ============== EMPLOYEE ENDPOINTS TESTS ==============
    
    def test_employee_my_assignment_no_auth(self):
        """Test that my-assignment requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: my-assignment requires authentication")
    
    def test_employee_my_assignment_no_active(self):
        """Test employee gets null when no active assignment"""
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        
        employee_id = self._get_employee_id(employee_token)
        
        # Cancel any existing active assignment
        if employee_id:
            assignments_response = self.session.get(
                f"{BASE_URL}/api/orders/assignments?status=active",
                headers=admin_headers
            )
            if assignments_response.status_code == 200:
                for assignment in assignments_response.json().get("assignments", []):
                    if assignment.get("employee_id") == employee_id:
                        self.session.delete(
                            f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                            headers=admin_headers
                        )
        
        response = self.session.get(
            f"{BASE_URL}/api/orders/my-assignment",
            headers=employee_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("assignment") is None, "Expected null assignment"
        print("PASS: Employee gets null when no active assignment")
    
    def test_employee_my_assignment_with_active(self):
        """Test employee can fetch their active assignment"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # Cancel any existing active assignment
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create an assignment
        today = time.strftime("%Y-%m-%d")
        assign_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: Employee fetch test"
            },
            headers=admin_headers
        )
        assert assign_response.status_code == 200
        assignment_id = assign_response.json()["id"]
        self.created_assignment_ids.append(assignment_id)
        
        # Employee fetches their assignment
        response = self.session.get(
            f"{BASE_URL}/api/orders/my-assignment",
            headers=employee_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("assignment") is not None, "Expected active assignment"
        assert data["assignment"]["id"] == assignment_id
        assert "items" in data["assignment"], "Missing items in assignment"
        assert "labels" in data["assignment"], "Missing labels in assignment"
        print(f"PASS: Employee fetched their active assignment {assignment_id}")
    
    def test_employee_complete_assignment(self):
        """Test employee can complete their assignment"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # Cancel any existing active assignment
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create an assignment
        today = time.strftime("%Y-%m-%d")
        assign_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: Complete test"
            },
            headers=admin_headers
        )
        assert assign_response.status_code == 200
        assignment_id = assign_response.json()["id"]
        
        # Employee completes the assignment
        complete_response = self.session.post(
            f"{BASE_URL}/api/orders/complete/{assignment_id}",
            json={},
            headers=employee_headers
        )
        assert complete_response.status_code == 200, f"Failed to complete: {complete_response.text}"
        
        data = complete_response.json()
        assert data.get("completed") == True
        assert "completed_at" in data
        print(f"PASS: Employee completed assignment {assignment_id}")
    
    def test_duplicate_assignment_auto_replaces(self):
        """Test that assigning to employee with active assignment auto-replaces the old one as incomplete"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # Cancel any existing active assignment first
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create first assignment
        today = time.strftime("%Y-%m-%d")
        first_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: First assignment"
            },
            headers=admin_headers
        )
        assert first_response.status_code == 200
        first_id = first_response.json()["id"]
        self.created_assignment_ids.append(first_id)
        
        # Create second assignment - should succeed and mark first as incomplete
        second_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: Second assignment (replaces first)"
            },
            headers=admin_headers
        )
        assert second_response.status_code == 200, f"Expected 200, got {second_response.status_code}"
        second_id = second_response.json()["id"]
        self.created_assignment_ids.append(second_id)
        
        # Verify first assignment is now incomplete
        all_assignments = self.session.get(
            f"{BASE_URL}/api/orders/assignments",
            headers=admin_headers
        ).json().get("assignments", [])
        
        first_assignment = next((a for a in all_assignments if a["id"] == first_id), None)
        assert first_assignment is not None, "First assignment not found"
        assert first_assignment["status"] == "incomplete", f"Expected 'incomplete', got '{first_assignment['status']}'"
        assert "replaced_at" in first_assignment, "Missing replaced_at field"
        
        print("PASS: Duplicate assignment auto-replaces old one as incomplete")
    
    # ============== ASSIGNMENT HISTORY TESTS ==============
    
    def test_my_history_requires_auth(self):
        """Test that my-history endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-history")
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: my-history requires authentication")
    
    def test_my_history_returns_non_active_assignments(self):
        """Test employee can fetch their assignment history (completed and incomplete)"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # Cancel any existing active assignment
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create and complete an assignment
        today = time.strftime("%Y-%m-%d")
        assign_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: History test - to be completed"
            },
            headers=admin_headers
        )
        assert assign_response.status_code == 200
        assignment_id = assign_response.json()["id"]
        self.created_assignment_ids.append(assignment_id)
        
        # Complete the assignment
        complete_response = self.session.post(
            f"{BASE_URL}/api/orders/complete/{assignment_id}",
            json={},
            headers=employee_headers
        )
        assert complete_response.status_code == 200
        
        # Fetch history
        history_response = self.session.get(
            f"{BASE_URL}/api/orders/my-history",
            headers=employee_headers
        )
        assert history_response.status_code == 200, f"Failed: {history_response.text}"
        
        data = history_response.json()
        assert "history" in data, "Response missing 'history' field"
        assert isinstance(data["history"], list), "History should be a list"
        
        # Find our completed assignment in history
        completed_assignment = next(
            (h for h in data["history"] if h["id"] == assignment_id),
            None
        )
        assert completed_assignment is not None, "Completed assignment not found in history"
        assert completed_assignment["status"] == "completed"
        
        print(f"PASS: Employee fetched history with {len(data['history'])} entries")
    
    def test_assignments_filter_by_status(self):
        """Test admin can filter assignments by status"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test filtering by active status
        active_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        assert active_response.status_code == 200
        active_data = active_response.json()
        for assignment in active_data.get("assignments", []):
            assert assignment["status"] == "active", f"Expected active, got {assignment['status']}"
        
        # Test filtering by completed status
        completed_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=completed",
            headers=admin_headers
        )
        assert completed_response.status_code == 200
        completed_data = completed_response.json()
        for assignment in completed_data.get("assignments", []):
            assert assignment["status"] == "completed", f"Expected completed, got {assignment['status']}"
        
        # Test filtering by incomplete status
        incomplete_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=incomplete",
            headers=admin_headers
        )
        assert incomplete_response.status_code == 200
        incomplete_data = incomplete_response.json()
        for assignment in incomplete_data.get("assignments", []):
            assert assignment["status"] == "incomplete", f"Expected incomplete, got {assignment['status']}"
        
        print(f"PASS: Status filtering works - active: {active_data['total']}, completed: {completed_data['total']}, incomplete: {incomplete_data['total']}")
    
    def test_delete_assignment_from_history(self):
        """Test admin can delete an assignment from history log"""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        employee_token = self._get_employee_token()
        if not employee_token:
            pytest.skip("Could not get employee token")
        
        employee_headers = {"Authorization": f"Bearer {employee_token}"}
        employee_id = self._get_employee_id(employee_token)
        if not employee_id:
            pytest.skip("Could not get employee ID")
        
        # Cancel any existing active assignment
        assignments_response = self.session.get(
            f"{BASE_URL}/api/orders/assignments?status=active",
            headers=admin_headers
        )
        if assignments_response.status_code == 200:
            for assignment in assignments_response.json().get("assignments", []):
                if assignment.get("employee_id") == employee_id:
                    self.session.delete(
                        f"{BASE_URL}/api/orders/assignments/{assignment['id']}",
                        headers=admin_headers
                    )
        
        # Create and complete an assignment
        today = time.strftime("%Y-%m-%d")
        assign_response = self.session.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee_id,
                "since": today,
                "until": today,
                "notes": "TEST: To be deleted from history"
            },
            headers=admin_headers
        )
        assert assign_response.status_code == 200
        assignment_id = assign_response.json()["id"]
        
        # Complete the assignment
        self.session.post(
            f"{BASE_URL}/api/orders/complete/{assignment_id}",
            json={},
            headers=employee_headers
        )
        
        # Delete from history
        delete_response = self.session.delete(
            f"{BASE_URL}/api/orders/assignments/{assignment_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        assert delete_response.json().get("deleted") == True
        
        # Verify it's gone
        all_assignments = self.session.get(
            f"{BASE_URL}/api/orders/assignments",
            headers=admin_headers
        ).json().get("assignments", [])
        
        deleted_assignment = next((a for a in all_assignments if a["id"] == assignment_id), None)
        assert deleted_assignment is None, "Assignment should be deleted"
        
        print(f"PASS: Admin deleted assignment {assignment_id} from history")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
