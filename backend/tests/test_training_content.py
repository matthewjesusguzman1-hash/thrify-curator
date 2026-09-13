"""
Test Training Content and Assignments APIs
- GET /api/training-content/ - Get all training guides
- PUT /api/training-content/{guide_type} - Update training guide (admin only)
- POST /api/training-content/ai-cleanup - AI cleanup text (admin only)
- GET /api/training-assignments/ - List all assignments (admin only)
- POST /api/training-assignments/ - Assign training (admin only)
- DELETE /api/training-assignments/{id} - Remove assignment (admin only)
- GET /api/training-assignments/my - Get current user's assignments
- GET /api/training-assignments/employees - List employees for assignment (admin only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"

# Employee with training
EMPLOYEE_EMAIL = "matthewjguzman1@gmail.com"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def employee_token():
    """Get employee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Employee authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def employee_headers(employee_token):
    """Employee auth headers"""
    return {"Authorization": f"Bearer {employee_token}", "Content-Type": "application/json"}


class TestTrainingContentAPI:
    """Training content endpoint tests"""

    def test_get_training_content_as_admin(self, admin_headers):
        """GET /api/training-content/ - Admin can get training guides"""
        response = requests.get(f"{BASE_URL}/api/training-content/", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "guides" in data
        guides = data["guides"]
        assert len(guides) >= 2, "Should have at least photography and listing guides"
        
        # Verify guide structure
        guide_types = [g["guide_type"] for g in guides]
        assert "photography" in guide_types, "Should have photography guide"
        assert "listing" in guide_types, "Should have listing guide"
        
        # Verify photography guide structure
        photo_guide = next(g for g in guides if g["guide_type"] == "photography")
        assert "title" in photo_guide
        assert "sections" in photo_guide
        assert len(photo_guide["sections"]) > 0, "Photography guide should have sections"
        
        # Verify section structure
        section = photo_guide["sections"][0]
        assert "title" in section
        assert "steps" in section
        assert isinstance(section["steps"], list)

    def test_get_training_content_as_employee(self, employee_headers):
        """GET /api/training-content/ - Employee can get training guides"""
        response = requests.get(f"{BASE_URL}/api/training-content/", headers=employee_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "guides" in data
        assert len(data["guides"]) >= 2

    def test_update_training_content_photography(self, admin_headers):
        """PUT /api/training-content/photography - Admin can update photography guide"""
        # First get current content
        get_response = requests.get(f"{BASE_URL}/api/training-content/", headers=admin_headers)
        guides = get_response.json()["guides"]
        photo_guide = next(g for g in guides if g["guide_type"] == "photography")
        original_sections = photo_guide["sections"]
        
        # Modify a section title
        modified_sections = [dict(s) for s in original_sections]
        original_title = modified_sections[0]["title"]
        modified_sections[0]["title"] = "TEST_Modified Section Title"
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/training-content/photography",
            json={"sections": modified_sections},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json().get("ok") == True
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/training-content/", headers=admin_headers)
        updated_guides = verify_response.json()["guides"]
        updated_photo = next(g for g in updated_guides if g["guide_type"] == "photography")
        assert updated_photo["sections"][0]["title"] == "TEST_Modified Section Title"
        
        # Restore original
        modified_sections[0]["title"] = original_title
        requests.put(
            f"{BASE_URL}/api/training-content/photography",
            json={"sections": modified_sections},
            headers=admin_headers
        )

    def test_update_training_content_listing(self, admin_headers):
        """PUT /api/training-content/listing - Admin can update listing guide"""
        # First get current content
        get_response = requests.get(f"{BASE_URL}/api/training-content/", headers=admin_headers)
        guides = get_response.json()["guides"]
        listing_guide = next(g for g in guides if g["guide_type"] == "listing")
        original_sections = listing_guide["sections"]
        
        # Modify a step
        modified_sections = [dict(s) for s in original_sections]
        modified_sections[0]["steps"] = ["TEST_Step 1", "TEST_Step 2"]
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/training-content/listing",
            json={"sections": modified_sections},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/training-content/", headers=admin_headers)
        updated_guides = verify_response.json()["guides"]
        updated_listing = next(g for g in updated_guides if g["guide_type"] == "listing")
        assert "TEST_Step 1" in updated_listing["sections"][0]["steps"]
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/training-content/listing",
            json={"sections": original_sections},
            headers=admin_headers
        )

    def test_update_training_content_invalid_type(self, admin_headers):
        """PUT /api/training-content/invalid - Should reject invalid guide type"""
        response = requests.put(
            f"{BASE_URL}/api/training-content/invalid",
            json={"sections": []},
            headers=admin_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_update_training_content_unauthorized(self, employee_headers):
        """PUT /api/training-content/photography - Employee cannot update"""
        response = requests.put(
            f"{BASE_URL}/api/training-content/photography",
            json={"sections": []},
            headers=employee_headers
        )
        # Should be 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_ai_cleanup_section(self, admin_headers):
        """POST /api/training-content/ai-cleanup - AI cleanup text"""
        test_text = "take good photos\nmake sure lighting is ok\ncheck for damage"
        
        response = requests.post(
            f"{BASE_URL}/api/training-content/ai-cleanup",
            json={"text": test_text},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cleaned_text" in data
        assert len(data["cleaned_text"]) > 0, "Should return cleaned text"

    def test_ai_cleanup_unauthorized(self, employee_headers):
        """POST /api/training-content/ai-cleanup - Employee cannot use AI cleanup"""
        response = requests.post(
            f"{BASE_URL}/api/training-content/ai-cleanup",
            json={"text": "test"},
            headers=employee_headers
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestTrainingAssignmentsAPI:
    """Training assignments endpoint tests"""

    def test_list_employees_for_assignment(self, admin_headers):
        """GET /api/training-assignments/employees - List employees"""
        response = requests.get(f"{BASE_URL}/api/training-assignments/employees", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "employees" in data
        employees = data["employees"]
        assert len(employees) > 0, "Should have at least one employee"
        
        # Verify employee structure
        emp = employees[0]
        assert "id" in emp
        assert "name" in emp
        assert "email" in emp

    def test_list_assignments_admin(self, admin_headers):
        """GET /api/training-assignments/ - Admin can list all assignments"""
        response = requests.get(f"{BASE_URL}/api/training-assignments/", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "assignments" in data
        # May have existing assignments
        if len(data["assignments"]) > 0:
            assignment = data["assignments"][0]
            assert "id" in assignment
            assert "employee_id" in assignment
            assert "employee_name" in assignment
            assert "training_type" in assignment

    def test_my_assignments_employee(self, employee_headers):
        """GET /api/training-assignments/my - Employee can get their assignments"""
        response = requests.get(f"{BASE_URL}/api/training-assignments/my", headers=employee_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "assignments" in data
        # matthewjguzman1@gmail.com should have training assigned
        assignments = data["assignments"]
        if len(assignments) > 0:
            assignment = assignments[0]
            assert "training_type" in assignment
            assert assignment["training_type"] in ["photography", "listing"]

    def test_assign_and_remove_training(self, admin_headers):
        """POST/DELETE /api/training-assignments/ - Assign and remove training"""
        # First get an employee to assign to
        emp_response = requests.get(f"{BASE_URL}/api/training-assignments/employees", headers=admin_headers)
        employees = emp_response.json()["employees"]
        
        # Find an employee that doesn't have photography training yet
        # Use testemployee for this test
        test_emp = next((e for e in employees if "testemployee" in e.get("email", "").lower()), None)
        if not test_emp:
            # Use first employee
            test_emp = employees[0]
        
        employee_id = test_emp["id"]
        
        # Try to assign photography training
        assign_response = requests.post(
            f"{BASE_URL}/api/training-assignments/",
            json={"employee_id": employee_id, "training_type": "photography"},
            headers=admin_headers
        )
        
        # Could be 200 (new assignment) or 400 (already assigned)
        if assign_response.status_code == 200:
            data = assign_response.json()
            assert "assignment" in data
            assignment_id = data["assignment"]["id"]
            
            # Verify it appears in list
            list_response = requests.get(f"{BASE_URL}/api/training-assignments/", headers=admin_headers)
            assignments = list_response.json()["assignments"]
            assert any(a["id"] == assignment_id for a in assignments)
            
            # Remove the assignment
            delete_response = requests.delete(
                f"{BASE_URL}/api/training-assignments/{assignment_id}",
                headers=admin_headers
            )
            assert delete_response.status_code == 200
            assert delete_response.json().get("ok") == True
            
            # Verify removal
            verify_response = requests.get(f"{BASE_URL}/api/training-assignments/", headers=admin_headers)
            remaining = verify_response.json()["assignments"]
            assert not any(a["id"] == assignment_id for a in remaining)
        else:
            # Already assigned - that's fine, just verify the error message
            assert assign_response.status_code == 400
            assert "already assigned" in assign_response.json().get("detail", "").lower()

    def test_assign_training_invalid_employee(self, admin_headers):
        """POST /api/training-assignments/ - Invalid employee ID"""
        response = requests.post(
            f"{BASE_URL}/api/training-assignments/",
            json={"employee_id": "invalid-id-12345", "training_type": "photography"},
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_remove_nonexistent_assignment(self, admin_headers):
        """DELETE /api/training-assignments/{id} - Nonexistent assignment"""
        response = requests.delete(
            f"{BASE_URL}/api/training-assignments/nonexistent-id-12345",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_list_assignments_unauthorized(self, employee_headers):
        """GET /api/training-assignments/ - Employee cannot list all assignments"""
        response = requests.get(f"{BASE_URL}/api/training-assignments/", headers=employee_headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_assign_training_unauthorized(self, employee_headers):
        """POST /api/training-assignments/ - Employee cannot assign training"""
        response = requests.post(
            f"{BASE_URL}/api/training-assignments/",
            json={"employee_id": "test", "training_type": "photography"},
            headers=employee_headers
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
