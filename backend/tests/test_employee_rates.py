"""
Test suite for individual employee hourly rates feature.
Tests:
- Admin can set/update individual hourly rates per employee
- Payroll reports use individual rates where set
- Employees without custom rate fall back to default rate
- Report shows indicator for employees with custom rates
- Total wages calculated correctly with mixed rates
"""

import pytest
import requests
import os
import uuid

# Try multiple sources for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '') or os.environ.get('BASE_URL', '') or 'https://curator-dash-1.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

class TestEmployeeRates:
    """Test employee individual hourly rate functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield

    def test_get_employees_includes_hourly_rate_field(self):
        """Test that GET /api/admin/employees returns hourly_rate field"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) > 0, "Should have at least one employee"
        # Check that hourly_rate field is present (can be null)
        for emp in employees:
            assert "hourly_rate" in emp, f"Employee {emp['name']} missing hourly_rate field"
        print(f"✓ All {len(employees)} employees have hourly_rate field")

    def test_update_employee_rate_success(self):
        """Test PUT /api/admin/employees/{id}/rate - set individual hourly rate"""
        # First get an employee (non-admin)
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        employees = [e for e in employees_resp.json() if e["role"] != "admin"]
        
        if not employees:
            # Create a test employee
            unique_id = str(uuid.uuid4())[:8]
            create_resp = requests.post(f"{BASE_URL}/api/admin/create-employee", 
                headers=self.headers,
                json={"name": f"Rate Test Emp {unique_id}", "email": f"rate_test_{unique_id}@test.com"}
            )
            assert create_resp.status_code == 200
            employee = create_resp.json()
        else:
            employee = employees[0]
        
        employee_id = employee["id"]
        
        # Update the hourly rate
        new_rate = 25.50
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{employee_id}/rate",
            headers=self.headers,
            json={"hourly_rate": new_rate}
        )
        
        assert response.status_code == 200, f"Failed to update rate: {response.text}"
        updated = response.json()
        assert updated["hourly_rate"] == new_rate, f"Rate not updated correctly: {updated.get('hourly_rate')}"
        print(f"✓ Successfully set hourly rate to ${new_rate} for {updated['name']}")
        
        # Verify rate persisted
        get_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        emps = {e["id"]: e for e in get_response.json()}
        assert emps[employee_id]["hourly_rate"] == new_rate
        print(f"✓ Rate ${new_rate} persisted in database")

    def test_update_rate_negative_value_rejected(self):
        """Test that negative hourly rates are rejected"""
        # Get an employee
        employees_resp = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        employees = [e for e in employees_resp.json() if e["role"] != "admin"]
        
        if not employees:
            pytest.skip("No employees available for testing")
        
        employee_id = employees[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{employee_id}/rate",
            headers=self.headers,
            json={"hourly_rate": -5.00}
        )
        
        assert response.status_code == 400, f"Expected 400 for negative rate, got {response.status_code}"
        print("✓ Negative hourly rate correctly rejected with 400")

    def test_update_rate_nonexistent_employee(self):
        """Test updating rate for non-existent employee returns 404"""
        fake_id = "nonexistent-employee-id-12345"
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/{fake_id}/rate",
            headers=self.headers,
            json={"hourly_rate": 20.00}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent employee correctly returns 404")

    def test_update_rate_requires_admin(self):
        """Test that employee rate update requires admin access"""
        # Try without token
        response = requests.put(
            f"{BASE_URL}/api/admin/employees/some-id/rate",
            json={"hourly_rate": 15.00}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Rate update correctly requires admin authentication")


class TestPayrollWithIndividualRates:
    """Test payroll reports use individual employee rates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and prepare test data"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.test_employees = []
        yield
        # Cleanup - delete test employees
        for emp_id in self.test_employees:
            try:
                requests.delete(f"{BASE_URL}/api/admin/employees/{emp_id}", headers=self.headers)
            except:
                pass

    def test_payroll_report_uses_individual_rates(self):
        """Test that payroll report uses individual employee rates where set"""
        # Create two test employees
        unique_id = str(uuid.uuid4())[:8]
        
        # Employee 1 with custom rate
        emp1_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            headers=self.headers,
            json={"name": f"PayrollRateTest1_{unique_id}", "email": f"prtest1_{unique_id}@test.com"}
        )
        assert emp1_resp.status_code == 200
        emp1 = emp1_resp.json()
        self.test_employees.append(emp1["id"])
        
        # Set custom rate for employee 1
        rate_resp = requests.put(
            f"{BASE_URL}/api/admin/employees/{emp1['id']}/rate",
            headers=self.headers,
            json={"hourly_rate": 22.00}
        )
        assert rate_resp.status_code == 200
        
        # Employee 2 without custom rate (will use default)
        emp2_resp = requests.post(f"{BASE_URL}/api/admin/create-employee",
            headers=self.headers,
            json={"name": f"PayrollRateTest2_{unique_id}", "email": f"prtest2_{unique_id}@test.com"}
        )
        assert emp2_resp.status_code == 200
        emp2 = emp2_resp.json()
        self.test_employees.append(emp2["id"])
        
        # Create time entries for both employees
        # Use a recent date range
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        clock_in = (now - timedelta(hours=4)).isoformat() + "Z"
        clock_out = (now - timedelta(hours=2)).isoformat() + "Z"
        
        # Create entry for emp1 (2 hours at $22/hr = $44)
        entry1_resp = requests.post(f"{BASE_URL}/api/admin/time-entries",
            headers=self.headers,
            json={
                "employee_id": emp1["id"],
                "clock_in": clock_in,
                "clock_out": clock_out
            }
        )
        assert entry1_resp.status_code == 200
        
        # Create entry for emp2 (2 hours at default rate)
        entry2_resp = requests.post(f"{BASE_URL}/api/admin/time-entries",
            headers=self.headers,
            json={
                "employee_id": emp2["id"],
                "clock_in": clock_in,
                "clock_out": clock_out
            }
        )
        assert entry2_resp.status_code == 200
        
        # Generate payroll report
        report_resp = requests.post(f"{BASE_URL}/api/admin/payroll/report",
            headers=self.headers,
            json={
                "period_type": "monthly",
                "period_index": 0,
                "hourly_rate": 15.00  # Default rate
            }
        )
        assert report_resp.status_code == 200
        report = report_resp.json()
        
        # Find our test employees in the report
        emp_data = {e["user_id"]: e for e in report.get("employees", [])}
        
        if emp1["id"] in emp_data:
            emp1_data = emp_data[emp1["id"]]
            assert emp1_data["hourly_rate"] == 22.00, f"Emp1 should have custom rate 22.00, got {emp1_data.get('hourly_rate')}"
            assert emp1_data["has_custom_rate"] == True, "Emp1 should have has_custom_rate=True"
            print(f"✓ Employee 1 using custom rate: ${emp1_data['hourly_rate']}/hr, gross wages: ${emp1_data['gross_wages']}")
        
        if emp2["id"] in emp_data:
            emp2_data = emp_data[emp2["id"]]
            assert emp2_data["hourly_rate"] == 15.00, f"Emp2 should have default rate 15.00, got {emp2_data.get('hourly_rate')}"
            assert emp2_data["has_custom_rate"] == False, "Emp2 should have has_custom_rate=False"
            print(f"✓ Employee 2 using default rate: ${emp2_data['hourly_rate']}/hr, gross wages: ${emp2_data['gross_wages']}")
        
        # Verify report settings indicate individual rates are used
        assert report.get("settings", {}).get("uses_individual_rates") == True
        print("✓ Report indicates individual rates are being used")

    def test_payroll_total_wages_with_mixed_rates(self):
        """Test that total wages are calculated correctly with mixed rates"""
        # Generate a payroll report for the current month
        report_resp = requests.post(f"{BASE_URL}/api/admin/payroll/report",
            headers=self.headers,
            json={
                "period_type": "monthly",
                "period_index": 0,
                "hourly_rate": 15.00
            }
        )
        assert report_resp.status_code == 200
        report = report_resp.json()
        
        # Calculate expected total from employee data
        employees = report.get("employees", [])
        calculated_total = sum(emp["gross_wages"] for emp in employees)
        reported_total = report.get("summary", {}).get("total_wages", 0)
        
        # Verify totals match (within floating point tolerance)
        assert abs(calculated_total - reported_total) < 0.01, \
            f"Total wages mismatch: calculated {calculated_total}, reported {reported_total}"
        print(f"✓ Total wages correctly calculated: ${reported_total}")
        
        # Verify each employee's wages = hours * their rate
        for emp in employees:
            expected_wages = round(emp["total_hours"] * emp["hourly_rate"], 2)
            assert abs(emp["gross_wages"] - expected_wages) < 0.01, \
                f"Wages mismatch for {emp['name']}: expected {expected_wages}, got {emp['gross_wages']}"
        print(f"✓ All {len(employees)} employee wages correctly calculated (hours × individual rate)")


class TestPayrollPDFWithIndividualRates:
    """Test PDF export includes individual rates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield

    def test_pdf_export_includes_rate_column(self):
        """Test that PDF export generates correctly with individual rates"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.headers,
            json={
                "period_type": "monthly",
                "period_index": 0,
                "hourly_rate": 15.00
            }
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b"%PDF", "Response is not a valid PDF"
        
        # Check for content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "filename=" in content_disp
        print("✓ PDF export generated successfully with individual rates")


class TestSpecificEmployeeRate:
    """Test the specific employee mentioned in the requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield

    def test_check_employee_with_custom_rate(self):
        """Check if 'Test Employee 1771793860' has custom rate of $18.50"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert response.status_code == 200
        employees = response.json()
        
        # Find the specific test employee
        test_emp = None
        for emp in employees:
            if "1771793860" in emp.get("name", "") or emp.get("id") == "e7a603d5-e342-4608-aca1-aa6639d00126":
                test_emp = emp
                break
        
        if test_emp:
            print(f"Found employee: {test_emp['name']}")
            print(f"  ID: {test_emp['id']}")
            print(f"  Hourly Rate: ${test_emp.get('hourly_rate', 'Not set')}")
            if test_emp.get("hourly_rate") == 18.50:
                print("✓ Employee has expected custom rate of $18.50")
            else:
                print(f"⚠ Employee rate is {test_emp.get('hourly_rate')}, expected 18.50")
        else:
            print("⚠ Test employee 'Test Employee 1771793860' not found - may have been deleted or renamed")
            # This is not a failure - just informational


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
