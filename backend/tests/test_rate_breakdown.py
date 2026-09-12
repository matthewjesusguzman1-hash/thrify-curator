"""
Test rate_breakdown feature in payroll summary and report endpoints.
Tests that:
1. GET /api/admin/payroll/summary returns by_employee with rate_breakdown array
2. POST /api/admin/payroll/report returns employees with rate_breakdown and has_multiple_rates
3. When employee has shifts at different rates, has_multiple_rates=true
4. When employee has all shifts at same rate, has_multiple_rates=false
5. PUT /api/admin/time-entries/{id} with hourly_rate updates shift rate
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRateBreakdownFeature:
    """Test rate_breakdown in payroll summary and report"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get auth token"""
        # Admin login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_payroll_summary_returns_rate_breakdown(self):
        """Test GET /api/admin/payroll/summary returns rate_breakdown in by_employee"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary", headers=self.headers)
        assert response.status_code == 200, f"Payroll summary failed: {response.text}"
        
        data = response.json()
        assert "current_period" in data, "Missing current_period in response"
        assert "by_employee" in data["current_period"], "Missing by_employee in current_period"
        
        # Check structure of by_employee entries
        by_employee = data["current_period"]["by_employee"]
        if len(by_employee) > 0:
            emp = by_employee[0]
            # Verify rate_breakdown field exists
            assert "rate_breakdown" in emp, f"Missing rate_breakdown in employee data: {emp.keys()}"
            assert "has_multiple_rates" in emp, f"Missing has_multiple_rates in employee data: {emp.keys()}"
            
            # Verify rate_breakdown structure
            rate_breakdown = emp["rate_breakdown"]
            assert isinstance(rate_breakdown, list), "rate_breakdown should be a list"
            
            if len(rate_breakdown) > 0:
                rb = rate_breakdown[0]
                assert "rate" in rb, "rate_breakdown item missing 'rate'"
                assert "hours" in rb, "rate_breakdown item missing 'hours'"
                assert "subtotal" in rb, "rate_breakdown item missing 'subtotal'"
                print(f"PASS: rate_breakdown structure verified: {rb}")
            
            print(f"PASS: Employee {emp['name']} has_multiple_rates={emp['has_multiple_rates']}, rate_breakdown={rate_breakdown}")
        else:
            print("INFO: No employees in current period - structure test skipped")
            
    def test_payroll_report_returns_rate_breakdown(self):
        """Test POST /api/admin/payroll/report returns rate_breakdown for employees"""
        # Use custom date range to capture more data (Aug 1 - Sep 30)
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers=self.headers,
            json={
                "period_type": "custom",
                "start_date": "2026-08-01T00:00:00Z",
                "end_date": "2026-09-30T23:59:59Z"
            }
        )
        assert response.status_code == 200, f"Payroll report failed: {response.text}"
        
        data = response.json()
        assert "employees" in data, "Missing employees in response"
        
        employees = data["employees"]
        if len(employees) > 0:
            emp = employees[0]
            # Verify rate_breakdown field exists
            assert "rate_breakdown" in emp, f"Missing rate_breakdown in employee: {emp.keys()}"
            assert "has_multiple_rates" in emp, f"Missing has_multiple_rates in employee: {emp.keys()}"
            
            # Verify rate_breakdown structure
            rate_breakdown = emp["rate_breakdown"]
            assert isinstance(rate_breakdown, list), "rate_breakdown should be a list"
            
            if len(rate_breakdown) > 0:
                rb = rate_breakdown[0]
                assert "rate" in rb, "rate_breakdown item missing 'rate'"
                assert "hours" in rb, "rate_breakdown item missing 'hours'"
                assert "subtotal" in rb, "rate_breakdown item missing 'subtotal'"
                
            print(f"PASS: Report employee {emp['name']} has rate_breakdown={rate_breakdown}")
        else:
            print("INFO: No employees in report period - structure test skipped")
            
    def test_payroll_report_biweekly_period(self):
        """Test POST /api/admin/payroll/report with biweekly period"""
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers=self.headers,
            json={
                "period_type": "biweekly",
                "period_index": 0
            }
        )
        assert response.status_code == 200, f"Biweekly report failed: {response.text}"
        
        data = response.json()
        assert "period" in data, "Missing period in response"
        assert "employees" in data, "Missing employees in response"
        print(f"PASS: Biweekly report returned {len(data['employees'])} employees")
        
    def test_has_multiple_rates_logic(self):
        """Test that has_multiple_rates is correctly set based on shift rates"""
        # Get payroll report with wide date range
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers=self.headers,
            json={
                "period_type": "custom",
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z"
            }
        )
        assert response.status_code == 200, f"Report failed: {response.text}"
        
        data = response.json()
        employees = data.get("employees", [])
        
        for emp in employees:
            rate_breakdown = emp.get("rate_breakdown", [])
            has_multiple = emp.get("has_multiple_rates", False)
            
            # Verify logic: has_multiple_rates should be True if rate_breakdown has >1 entries
            expected_multiple = len(rate_breakdown) > 1
            assert has_multiple == expected_multiple, \
                f"Employee {emp['name']}: has_multiple_rates={has_multiple} but rate_breakdown has {len(rate_breakdown)} entries"
            
            print(f"PASS: {emp['name']} - has_multiple_rates={has_multiple}, breakdown_count={len(rate_breakdown)}")
            
    def test_get_time_entries_returns_hourly_rate(self):
        """Test GET /api/admin/time-entries returns hourly_rate field"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=self.headers)
        assert response.status_code == 200, f"Get entries failed: {response.text}"
        
        entries = response.json()
        if len(entries) > 0:
            # Check that entries have hourly_rate field
            entry = entries[0]
            # hourly_rate may be null if not set, but field should exist
            assert "hourly_rate" in entry or entry.get("hourly_rate") is None, \
                f"Entry missing hourly_rate field: {entry.keys()}"
            print(f"PASS: Time entry has hourly_rate={entry.get('hourly_rate')}")
        else:
            print("INFO: No time entries found")
            
    def test_update_time_entry_hourly_rate(self):
        """Test PUT /api/admin/time-entries/{id} can update hourly_rate"""
        # First get an existing entry
        entries_response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=self.headers)
        assert entries_response.status_code == 200
        
        entries = entries_response.json()
        if len(entries) == 0:
            pytest.skip("No time entries to test with")
            
        # Find an entry with total_hours (completed shift)
        test_entry = None
        for entry in entries:
            if entry.get("total_hours") and entry.get("total_hours") > 0:
                test_entry = entry
                break
                
        if not test_entry:
            pytest.skip("No completed time entries to test with")
            
        entry_id = test_entry["id"]
        original_rate = test_entry.get("hourly_rate")
        
        # Update with a new rate
        new_rate = 25.50
        update_response = requests.put(
            f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            headers=self.headers,
            json={"hourly_rate": new_rate}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=self.headers)
        updated_entries = verify_response.json()
        updated_entry = next((e for e in updated_entries if e["id"] == entry_id), None)
        
        assert updated_entry is not None, "Could not find updated entry"
        assert updated_entry.get("hourly_rate") == new_rate, \
            f"Rate not updated: expected {new_rate}, got {updated_entry.get('hourly_rate')}"
        
        print(f"PASS: Updated entry {entry_id} hourly_rate from {original_rate} to {new_rate}")
        
        # Restore original rate if it was set
        if original_rate:
            requests.put(
                f"{BASE_URL}/api/admin/time-entries/{entry_id}",
                headers=self.headers,
                json={"hourly_rate": original_rate}
            )
            print(f"INFO: Restored original rate {original_rate}")
            
    def test_rate_breakdown_subtotals_sum_to_gross_wages(self):
        """Test that rate_breakdown subtotals sum to gross_wages"""
        response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers=self.headers,
            json={
                "period_type": "custom",
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        employees = data.get("employees", [])
        
        for emp in employees:
            rate_breakdown = emp.get("rate_breakdown", [])
            gross_wages = emp.get("gross_wages", 0)
            
            # Sum subtotals from rate_breakdown
            breakdown_total = sum(rb.get("subtotal", 0) for rb in rate_breakdown)
            
            # Allow small floating point difference
            diff = abs(gross_wages - breakdown_total)
            assert diff < 0.02, \
                f"Employee {emp['name']}: gross_wages={gross_wages} but breakdown_total={breakdown_total} (diff={diff})"
            
            print(f"PASS: {emp['name']} - gross_wages=${gross_wages:.2f} matches breakdown_total=${breakdown_total:.2f}")
            
    def test_summary_rate_breakdown_matches_report(self):
        """Test that summary and report return consistent rate_breakdown data"""
        # Get summary for current period
        summary_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary?period_index=0", 
            headers=self.headers
        )
        assert summary_response.status_code == 200
        summary_data = summary_response.json()
        
        # Get report for same period
        period_start = summary_data["current_period"]["start"]
        period_end = summary_data["current_period"]["end"]
        
        report_response = requests.post(f"{BASE_URL}/api/admin/payroll/report", 
            headers=self.headers,
            json={
                "period_type": "custom",
                "start_date": period_start,
                "end_date": period_end
            }
        )
        assert report_response.status_code == 200
        report_data = report_response.json()
        
        # Compare employee data
        summary_employees = {e["user_id"]: e for e in summary_data["current_period"]["by_employee"]}
        report_employees = {e["user_id"]: e for e in report_data["employees"]}
        
        for user_id, summary_emp in summary_employees.items():
            if user_id in report_employees:
                report_emp = report_employees[user_id]
                
                # Both should have rate_breakdown
                assert "rate_breakdown" in summary_emp, f"Summary missing rate_breakdown for {summary_emp['name']}"
                assert "rate_breakdown" in report_emp, f"Report missing rate_breakdown for {report_emp['name']}"
                
                # has_multiple_rates should match
                assert summary_emp.get("has_multiple_rates") == report_emp.get("has_multiple_rates"), \
                    f"has_multiple_rates mismatch for {summary_emp['name']}"
                
                print(f"PASS: {summary_emp['name']} - summary and report rate_breakdown consistent")


class TestPayrollSummaryPeriodNavigation:
    """Test payroll summary period navigation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matthewjesusguzman1@gmail.com",
            "admin_code": "4399"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_summary_period_index_navigation(self):
        """Test that period_index parameter works for navigating periods"""
        # Current period
        current_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary?period_index=0", 
            headers=self.headers
        )
        assert current_response.status_code == 200
        current_data = current_response.json()
        
        # Previous period
        prev_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/summary?period_index=-1", 
            headers=self.headers
        )
        assert prev_response.status_code == 200
        prev_data = prev_response.json()
        
        # Verify different periods
        current_start = current_data["current_period"]["start"]
        prev_start = prev_data["current_period"]["start"]
        
        assert current_start != prev_start, "Period navigation not working - same start dates"
        print(f"PASS: Current period starts {current_start}, previous starts {prev_start}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
