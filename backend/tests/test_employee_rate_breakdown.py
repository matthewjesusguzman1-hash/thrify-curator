"""
Test Employee Dashboard Rate Breakdown Feature
Tests the /api/time/summary endpoint for rate_breakdown and has_multiple_rates fields
Also tests that time entries have per-shift hourly_rate stored
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeRateBreakdown:
    """Tests for employee-facing rate breakdown feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "matthewjesusguzman1@gmail.com"
        self.admin_code = "4399"
        self.token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "admin_code": self.admin_code
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get employee IDs
        emp_response = requests.get(f"{BASE_URL}/api/admin/employees", headers=self.headers)
        assert emp_response.status_code == 200
        employees = emp_response.json()
        
        # Find Matthew Guzman (multiple rates) and Tester (single rate)
        self.matthew_id = None
        self.tester_id = None
        for emp in employees:
            if emp["email"] == "matthewjguzman1@gmail.com":
                self.matthew_id = emp["id"]
            elif emp["email"] == "tester@tester.com":
                self.tester_id = emp["id"]
    
    def test_time_summary_returns_rate_breakdown_field(self):
        """Test that /api/time/summary returns rate_breakdown array"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.matthew_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify rate_breakdown field exists
        assert "rate_breakdown" in data, "rate_breakdown field missing from response"
        assert isinstance(data["rate_breakdown"], list), "rate_breakdown should be a list"
    
    def test_time_summary_returns_has_multiple_rates_field(self):
        """Test that /api/time/summary returns has_multiple_rates boolean"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.matthew_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_multiple_rates field exists
        assert "has_multiple_rates" in data, "has_multiple_rates field missing from response"
        assert isinstance(data["has_multiple_rates"], bool), "has_multiple_rates should be boolean"
    
    def test_multiple_rates_employee_has_correct_breakdown(self):
        """Test Matthew Guzman has multiple rates (3h@$10 + 1h@$20)"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.matthew_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_multiple_rates is true
        assert data["has_multiple_rates"] == True, "Matthew should have multiple rates"
        
        # Verify rate_breakdown has multiple entries
        assert len(data["rate_breakdown"]) > 1, "rate_breakdown should have multiple entries"
        
        # Verify each breakdown entry has required fields
        for rb in data["rate_breakdown"]:
            assert "rate" in rb, "rate field missing from breakdown entry"
            assert "hours" in rb, "hours field missing from breakdown entry"
            assert "subtotal" in rb, "subtotal field missing from breakdown entry"
    
    def test_single_rate_employee_has_correct_breakdown(self):
        """Test Tester has single rate (0.02h@$18.50)"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.tester_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_multiple_rates is false
        assert data["has_multiple_rates"] == False, "Tester should have single rate"
        
        # Verify rate_breakdown has exactly one entry
        assert len(data["rate_breakdown"]) == 1, "rate_breakdown should have exactly one entry"
    
    def test_rate_breakdown_subtotals_sum_to_estimated_pay(self):
        """Test that rate_breakdown subtotals sum equals estimated_pay"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.matthew_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Calculate sum of subtotals
        subtotal_sum = sum(rb["subtotal"] for rb in data["rate_breakdown"])
        
        # Allow small floating point tolerance
        assert abs(subtotal_sum - data["estimated_pay"]) < 0.01, \
            f"Subtotals sum ({subtotal_sum}) should equal estimated_pay ({data['estimated_pay']})"
    
    def test_time_entries_have_hourly_rate_field(self):
        """Test that time entries have per-shift hourly_rate stored"""
        response = requests.get(
            f"{BASE_URL}/api/time/entries?user_id={self.tester_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        entries = response.json()
        
        # Verify at least some entries have hourly_rate
        entries_with_rate = [e for e in entries if e.get("hourly_rate") is not None]
        assert len(entries_with_rate) > 0, "At least some entries should have hourly_rate"
        
        # Verify hourly_rate is a number
        for entry in entries_with_rate:
            assert isinstance(entry["hourly_rate"], (int, float)), "hourly_rate should be a number"
    
    def test_rate_breakdown_structure(self):
        """Test rate_breakdown entry structure has rate, hours, subtotal"""
        response = requests.get(
            f"{BASE_URL}/api/time/summary?user_id={self.matthew_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for rb in data["rate_breakdown"]:
            # Verify all required fields
            assert "rate" in rb, "rate field missing"
            assert "hours" in rb, "hours field missing"
            assert "subtotal" in rb, "subtotal field missing"
            
            # Verify types
            assert isinstance(rb["rate"], (int, float)), "rate should be numeric"
            assert isinstance(rb["hours"], (int, float)), "hours should be numeric"
            assert isinstance(rb["subtotal"], (int, float)), "subtotal should be numeric"
            
            # Verify subtotal calculation (rate * hours)
            expected_subtotal = round(rb["rate"] * rb["hours"], 2)
            assert abs(rb["subtotal"] - expected_subtotal) < 0.01, \
                f"subtotal ({rb['subtotal']}) should equal rate*hours ({expected_subtotal})"


class TestAdminPayrollRateBreakdown:
    """Tests for admin payroll rate breakdown (already tested in iteration 86, quick verification)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "matthewjesusguzman1@gmail.com"
        self.admin_code = "4399"
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "admin_code": self.admin_code
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_payroll_summary_has_rate_breakdown(self):
        """Test /api/admin/payroll/summary returns rate_breakdown per employee"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify current_period.by_employee exists
        assert "current_period" in data, "current_period field missing"
        assert "by_employee" in data["current_period"], "by_employee field missing in current_period"
        
        # Check at least one employee has rate_breakdown
        employees_with_breakdown = [
            emp for emp in data["current_period"]["by_employee"] 
            if emp.get("rate_breakdown") is not None
        ]
        assert len(employees_with_breakdown) > 0, "At least one employee should have rate_breakdown"
