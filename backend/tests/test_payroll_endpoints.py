"""
Tests for Payroll Period Reports feature.
- GET/PUT /api/admin/payroll/settings - Payroll settings management
- POST /api/admin/payroll/report - Generate payroll reports (biweekly/monthly/yearly/custom)
- POST /api/admin/payroll/report/pdf - Generate PDF payroll reports
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Try multiple sources for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '') or os.environ.get('BASE_URL', '') or 'https://thrifty-curator-1.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

class TestPayrollEndpoints:
    """Test payroll report endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com"
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("access_token")
            self.admin_id = login_response.json().get("user", {}).get("id")
        else:
            pytest.skip("Admin login failed - skipping authenticated tests")
        
        self.auth_header = {"Authorization": f"Bearer {self.admin_token}"}
    
    # ==================== Payroll Settings Tests ====================
    
    def test_get_payroll_settings_returns_defaults(self):
        """GET /api/admin/payroll/settings returns default settings if none configured"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/settings",
            headers=self.auth_header
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pay_period_start_date" in data
        assert "default_hourly_rate" in data
        # Should have reasonable defaults
        assert isinstance(data["default_hourly_rate"], (int, float))
        print(f"Payroll settings: {data}")
    
    def test_update_payroll_settings(self):
        """PUT /api/admin/payroll/settings updates settings"""
        new_settings = {
            "id": "payroll_settings",
            "pay_period_start_date": "2026-01-13",  # A Monday
            "default_hourly_rate": 18.50
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/payroll/settings",
            headers=self.auth_header,
            json=new_settings
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["pay_period_start_date"] == "2026-01-13"
        assert data["default_hourly_rate"] == 18.50
        print(f"Updated payroll settings: {data}")
    
    def test_get_payroll_settings_returns_updated_values(self):
        """GET /api/admin/payroll/settings returns previously updated values"""
        # First update
        requests.put(
            f"{BASE_URL}/api/admin/payroll/settings",
            headers=self.auth_header,
            json={
                "id": "payroll_settings",
                "pay_period_start_date": "2026-01-06",
                "default_hourly_rate": 20.00
            }
        )
        
        # Then get
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/settings",
            headers=self.auth_header
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["pay_period_start_date"] == "2026-01-06"
        assert data["default_hourly_rate"] == 20.00
    
    def test_payroll_settings_requires_admin(self):
        """Payroll settings endpoints require admin access"""
        # Create a test employee to test non-admin access
        unique_id = str(uuid.uuid4())[:8]
        employee_email = f"payroll_test_emp_{unique_id}@test.com"
        
        # Create employee
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=self.auth_header,
            json={"name": f"PayrollTestEmp_{unique_id}", "email": employee_email}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test employee")
        
        employee_id = create_resp.json()["id"]
        
        # Login as employee
        emp_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": employee_email})
        if emp_login.status_code != 200:
            pytest.skip("Employee login failed")
        
        emp_token = emp_login.json()["access_token"]
        emp_header = {"Authorization": f"Bearer {emp_token}"}
        
        # Try to access payroll settings - should fail with 403
        response = requests.get(f"{BASE_URL}/api/admin/payroll/settings", headers=emp_header)
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/employees/{employee_id}", headers=self.auth_header)
        print("Verified employee cannot access payroll settings (403)")
    
    # ==================== Payroll Report Tests ====================
    
    def test_generate_biweekly_report_current_period(self):
        """POST /api/admin/payroll/report generates biweekly report for current period"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": 0
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "period" in data
        assert "summary" in data
        assert "employees" in data
        assert "settings" in data
        
        # Period details
        assert data["period"]["type"] == "biweekly"
        assert "start" in data["period"]
        assert "end" in data["period"]
        assert "start_formatted" in data["period"]
        assert "end_formatted" in data["period"]
        
        # Settings
        assert "default_hourly_rate" in data["settings"]
        assert data["settings"].get("uses_individual_rates") == True
        
        # Summary
        assert "total_employees" in data["summary"]
        assert "total_hours" in data["summary"]
        assert "total_shifts" in data["summary"]
        assert "total_wages" in data["summary"]
        
        print(f"Biweekly report generated: {data['period']['start_formatted']} - {data['period']['end_formatted']}")
        print(f"Summary: {data['summary']}")
    
    def test_generate_biweekly_report_last_period(self):
        """POST /api/admin/payroll/report generates biweekly report for last period (period_index=-1)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": -1
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "biweekly"
        
        # Verify it's a past period (end date should be before today)
        end_date = datetime.fromisoformat(data["period"]["end"].replace('Z', '+00:00'))
        now = datetime.now(end_date.tzinfo)
        assert end_date < now, "Last period should end before today"
        
        print(f"Last biweekly period: {data['period']['start_formatted']} - {data['period']['end_formatted']}")
    
    def test_generate_monthly_report(self):
        """POST /api/admin/payroll/report generates monthly report"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "monthly",
                "period_index": 0
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "monthly"
        
        # Monthly period should span full month
        start = datetime.fromisoformat(data["period"]["start"].replace('Z', '+00:00'))
        assert start.day == 1, "Monthly period should start on day 1"
        
        print(f"Monthly report: {data['period']['start_formatted']} - {data['period']['end_formatted']}")
    
    def test_generate_yearly_report(self):
        """POST /api/admin/payroll/report generates yearly report"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "yearly",
                "period_index": 0
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "yearly"
        
        # Yearly period should span full year
        start = datetime.fromisoformat(data["period"]["start"].replace('Z', '+00:00'))
        assert start.month == 1 and start.day == 1, "Yearly period should start Jan 1"
        
        print(f"Yearly report: {data['period']['start_formatted']} - {data['period']['end_formatted']}")
    
    def test_generate_custom_range_report(self):
        """POST /api/admin/payroll/report generates custom date range report"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "custom",
                "start_date": "2026-01-01T00:00:00+00:00",
                "end_date": "2026-01-15T23:59:59+00:00"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "custom"
        print(f"Custom range report: {data['period']['start_formatted']} - {data['period']['end_formatted']}")
    
    def test_custom_range_requires_dates(self):
        """POST /api/admin/payroll/report with custom type requires start_date and end_date"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "custom"
                # Missing start_date and end_date
            }
        )
        assert response.status_code == 400, f"Expected 400 for missing dates, got {response.status_code}"
        print("Verified custom period requires start_date and end_date")
    
    def test_report_with_hourly_rate_override(self):
        """POST /api/admin/payroll/report accepts hourly_rate override"""
        override_rate = 25.00
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": 0,
                "hourly_rate": override_rate
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["settings"]["default_hourly_rate"] == override_rate
        
        # Verify wages are calculated correctly (individual rates override default)
        if len(data["employees"]) > 0:
            emp = data["employees"][0]
            # Wages use employee's individual rate or the default rate
            expected_wages = round(emp["total_hours"] * emp["hourly_rate"], 2)
            assert emp["gross_wages"] == expected_wages, f"Wages should be calculated with employee rate"
        
        print(f"Verified default hourly rate override: ${override_rate}")
    
    def test_report_with_employee_filter(self):
        """POST /api/admin/payroll/report filters by employee_id"""
        # First, get list of employees
        employees_response = requests.get(
            f"{BASE_URL}/api/admin/employees",
            headers=self.auth_header
        )
        employees = employees_response.json()
        non_admin_employees = [e for e in employees if e.get("role") != "admin"]
        
        if len(non_admin_employees) == 0:
            pytest.skip("No non-admin employees to filter by")
        
        target_employee = non_admin_employees[0]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "yearly",
                "period_index": 0,
                "employee_id": target_employee["id"]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # If there are employees in the report, should only be the filtered one
        if len(data["employees"]) > 0:
            assert len(data["employees"]) == 1
            assert data["employees"][0]["user_id"] == target_employee["id"]
        
        print(f"Verified employee filter for: {target_employee['name']}")
    
    def test_invalid_period_type_rejected(self):
        """POST /api/admin/payroll/report rejects invalid period_type"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "invalid_type"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid period_type, got {response.status_code}"
        print("Verified invalid period_type rejected")
    
    def test_report_employee_data_structure(self):
        """POST /api/admin/payroll/report returns correct employee data structure"""
        # First create a test employee with time entries
        unique_id = str(uuid.uuid4())[:8]
        employee_email = f"payroll_report_test_{unique_id}@test.com"
        
        # Create employee
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=self.auth_header,
            json={"name": f"PayrollReportTest_{unique_id}", "email": employee_email}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test employee")
        
        employee_id = create_resp.json()["id"]
        
        # Create a time entry for this employee
        now = datetime.now()
        clock_in = now.replace(hour=9, minute=0).isoformat()
        clock_out = now.replace(hour=17, minute=0).isoformat()
        
        entry_resp = requests.post(
            f"{BASE_URL}/api/admin/time-entries",
            headers=self.auth_header,
            json={
                "employee_id": employee_id,
                "clock_in": clock_in,
                "clock_out": clock_out
            }
        )
        
        if entry_resp.status_code not in [200, 201]:
            # Cleanup and skip
            requests.delete(f"{BASE_URL}/api/admin/employees/{employee_id}", headers=self.auth_header)
            pytest.skip("Could not create test time entry")
        
        entry_id = entry_resp.json().get("id")
        
        # Generate report
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": 0,
                "employee_id": employee_id
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify employee data structure if employee has entries
        if len(data["employees"]) > 0:
            emp = data["employees"][0]
            assert "user_id" in emp
            assert "name" in emp
            assert "total_hours" in emp
            assert "total_shifts" in emp
            assert "hourly_rate" in emp
            assert "gross_wages" in emp
            assert "shifts" in emp
            assert "daily_totals" in emp
            
            # Verify shift structure
            if len(emp["shifts"]) > 0:
                shift = emp["shifts"][0]
                assert "clock_in" in shift
                assert "clock_out" in shift
                assert "hours" in shift
            
            print(f"Employee data structure verified: {list(emp.keys())}")
        
        # Cleanup
        if entry_id:
            requests.delete(f"{BASE_URL}/api/admin/time-entries/{entry_id}", headers=self.auth_header)
        requests.delete(f"{BASE_URL}/api/admin/employees/{employee_id}", headers=self.auth_header)
    
    # ==================== Payroll PDF Tests ====================
    
    def test_generate_biweekly_pdf(self):
        """POST /api/admin/payroll/report/pdf generates PDF file"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": 0
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Check content disposition header for filename
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "PDF should be returned as attachment"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        
        # Check PDF has content (PDF files start with %PDF)
        content = response.content
        assert len(content) > 0, "PDF should not be empty"
        assert content[:4] == b'%PDF', "Response should be valid PDF"
        
        print(f"PDF generated successfully, size: {len(content)} bytes")
        print(f"Content-Disposition: {content_disp}")
    
    def test_generate_monthly_pdf(self):
        """POST /api/admin/payroll/report/pdf generates monthly PDF"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "monthly",
                "period_index": 0
            }
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print(f"Monthly PDF generated, size: {len(response.content)} bytes")
    
    def test_generate_yearly_pdf(self):
        """POST /api/admin/payroll/report/pdf generates yearly PDF"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "yearly",
                "period_index": 0
            }
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print(f"Yearly PDF generated, size: {len(response.content)} bytes")
    
    def test_generate_custom_range_pdf(self):
        """POST /api/admin/payroll/report/pdf generates custom range PDF"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "custom",
                "start_date": "2026-01-01T00:00:00+00:00",
                "end_date": "2026-01-31T23:59:59+00:00"
            }
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print(f"Custom range PDF generated, size: {len(response.content)} bytes")
    
    def test_pdf_with_hourly_rate_override(self):
        """POST /api/admin/payroll/report/pdf accepts hourly_rate override"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "biweekly",
                "period_index": 0,
                "hourly_rate": 30.00
            }
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print("PDF with hourly rate override generated")
    
    def test_pdf_custom_requires_dates(self):
        """POST /api/admin/payroll/report/pdf with custom type requires dates"""
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=self.auth_header,
            json={
                "period_type": "custom"
                # Missing dates
            }
        )
        assert response.status_code == 400
        print("Verified PDF custom period requires dates")
    
    def test_payroll_report_requires_admin(self):
        """Payroll report endpoint requires admin access"""
        # Create a test employee
        unique_id = str(uuid.uuid4())[:8]
        employee_email = f"payroll_pdf_emp_{unique_id}@test.com"
        
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/create-employee",
            headers=self.auth_header,
            json={"name": f"PayrollPDFEmp_{unique_id}", "email": employee_email}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test employee")
        
        employee_id = create_resp.json()["id"]
        
        # Login as employee
        emp_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": employee_email})
        if emp_login.status_code != 200:
            pytest.skip("Employee login failed")
        
        emp_token = emp_login.json()["access_token"]
        emp_header = {"Authorization": f"Bearer {emp_token}"}
        
        # Try to generate report - should fail with 403
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            headers=emp_header,
            json={"period_type": "biweekly"}
        )
        assert response.status_code == 403
        
        # Try to generate PDF - should fail with 403
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report/pdf",
            headers=emp_header,
            json={"period_type": "biweekly"}
        )
        assert response.status_code == 403
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/employees/{employee_id}", headers=self.auth_header)
        print("Verified employee cannot access payroll report endpoints (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
