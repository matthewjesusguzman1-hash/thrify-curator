# Test Order Assignment Preview Count and Assignment Flow
# Tests the iOS date picker fix and preview-count endpoint enhancements

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderAssignmentPreview:
    """Tests for order assignment preview-count and assign endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin auth token"""
        self.admin_email = "matthewjesusguzman1@gmail.com"
        self.admin_code = "4399"
        self.employee_email = "testemployee@thriftycurator.com"
        
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "admin_code": self.admin_code
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json().get("access_token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Login as employee
        emp_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.employee_email
        })
        if emp_login.status_code == 200:
            self.employee_token = emp_login.json().get("access_token")
            self.employee_headers = {"Authorization": f"Bearer {self.employee_token}"}
        else:
            self.employee_token = None
            self.employee_headers = {}
    
    def test_admin_login_success(self):
        """Test admin can login with email and admin code"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "admin_code": self.admin_code
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        print(f"PASS: Admin login successful, got access_token")
    
    def test_preview_count_basic(self):
        """Test preview-count endpoint returns count for date range"""
        # Use Sept 1-11, 2026 as specified in the test requirements
        resp = requests.get(
            f"{BASE_URL}/api/orders/preview-count",
            params={"since": "2026-09-01", "until": "2026-09-11"},
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Preview count failed: {resp.text}"
        data = resp.json()
        assert "count" in data
        print(f"PASS: Preview count returned count={data['count']}")
    
    def test_preview_count_with_label_ids(self):
        """Test preview-count returns match_count when label_ids provided"""
        # First get all labels
        labels_resp = requests.get(f"{BASE_URL}/api/orders/labels", headers=self.admin_headers)
        assert labels_resp.status_code == 200
        labels = labels_resp.json().get("labels", [])
        
        if len(labels) == 0:
            pytest.skip("No labels in system to test with")
        
        label_ids = ",".join([l["id"] for l in labels])
        
        resp = requests.get(
            f"{BASE_URL}/api/orders/preview-count",
            params={
                "since": "2026-09-01",
                "until": "2026-09-11",
                "label_ids": label_ids
            },
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Preview count with labels failed: {resp.text}"
        data = resp.json()
        assert "count" in data
        assert "match_count" in data
        print(f"PASS: Preview count with labels: count={data['count']}, match_count={data['match_count']}")
    
    def test_preview_count_future_dates_returns_zero(self):
        """Test preview-count returns 0 for future date range with no orders"""
        resp = requests.get(
            f"{BASE_URL}/api/orders/preview-count",
            params={"since": "2026-12-01", "until": "2026-12-31"},
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Preview count failed: {resp.text}"
        data = resp.json()
        assert data["count"] == 0, f"Expected 0 orders for future dates, got {data['count']}"
        print(f"PASS: Preview count for future dates returns 0")
    
    def test_list_labels(self):
        """Test listing shipping labels"""
        resp = requests.get(f"{BASE_URL}/api/orders/labels", headers=self.admin_headers)
        assert resp.status_code == 200, f"List labels failed: {resp.text}"
        data = resp.json()
        assert "labels" in data
        labels = data["labels"]
        print(f"PASS: Listed {len(labels)} labels")
        
        # Check label structure
        if len(labels) > 0:
            label = labels[0]
            assert "id" in label
            assert "filename" in label or "display_name" in label
            print(f"  First label: {label.get('display_name') or label.get('filename')}")
    
    def test_list_employees(self):
        """Test listing employees for assignment"""
        resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.admin_headers)
        assert resp.status_code == 200, f"List employees failed: {resp.text}"
        employees = resp.json()
        assert isinstance(employees, list)
        print(f"PASS: Listed {len(employees)} employees")
        
        if len(employees) > 0:
            emp = employees[0]
            assert "id" in emp
            assert "name" in emp
            print(f"  First employee: {emp.get('name')}")
    
    def test_assign_orders_creates_assignment(self):
        """Test assigning orders to an employee"""
        # Get an employee
        emp_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.admin_headers)
        employees = emp_resp.json()
        if len(employees) == 0:
            pytest.skip("No employees to assign to")
        
        employee = employees[0]
        
        # Get labels
        labels_resp = requests.get(f"{BASE_URL}/api/orders/labels", headers=self.admin_headers)
        labels = labels_resp.json().get("labels", [])
        label_ids = [l["id"] for l in labels] if labels else []
        
        # Create assignment
        resp = requests.post(
            f"{BASE_URL}/api/orders/assign",
            json={
                "employee_id": employee["id"],
                "since": "2026-09-01",
                "until": "2026-09-11",
                "label_ids": label_ids,
                "notes": "TEST_ASSIGNMENT - automated test"
            },
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Assign orders failed: {resp.text}"
        data = resp.json()
        
        assert "id" in data
        assert "employee_name" in data
        assert "item_count" in data
        assert "label_count" in data
        assert "match_count" in data
        
        self.test_assignment_id = data["id"]
        print(f"PASS: Created assignment {data['id']} for {data['employee_name']}")
        print(f"  item_count={data['item_count']}, label_count={data['label_count']}, match_count={data['match_count']}")
        
        # Cleanup - delete the test assignment
        del_resp = requests.delete(
            f"{BASE_URL}/api/orders/assignments/{data['id']}",
            headers=self.admin_headers
        )
        assert del_resp.status_code == 200, f"Failed to cleanup test assignment: {del_resp.text}"
        print(f"  Cleaned up test assignment")
    
    def test_list_assignments(self):
        """Test listing order assignments"""
        resp = requests.get(f"{BASE_URL}/api/orders/assignments", headers=self.admin_headers)
        assert resp.status_code == 200, f"List assignments failed: {resp.text}"
        data = resp.json()
        assert "assignments" in data
        print(f"PASS: Listed {len(data['assignments'])} assignments")
    
    def test_employee_my_assignment(self):
        """Test employee can fetch their assignment"""
        if not self.employee_token:
            pytest.skip("Employee login failed")
        
        resp = requests.get(
            f"{BASE_URL}/api/orders/my-assignment",
            headers=self.employee_headers
        )
        assert resp.status_code == 200, f"My assignment failed: {resp.text}"
        data = resp.json()
        # assignment can be None if no active assignment
        print(f"PASS: Employee my-assignment endpoint works, assignment={'present' if data.get('assignment') else 'none'}")
    
    def test_preview_count_requires_auth(self):
        """Test preview-count requires authentication"""
        resp = requests.get(
            f"{BASE_URL}/api/orders/preview-count",
            params={"since": "2026-09-01", "until": "2026-09-11"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Preview count requires auth (got {resp.status_code})")
    
    def test_assign_requires_auth(self):
        """Test assign endpoint requires authentication"""
        resp = requests.post(
            f"{BASE_URL}/api/orders/assign",
            json={"employee_id": "test", "since": "2026-09-01", "until": "2026-09-11"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Assign requires auth (got {resp.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
