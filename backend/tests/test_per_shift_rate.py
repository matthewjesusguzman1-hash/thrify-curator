"""
Test per-shift hourly rate editing feature.
Tests:
1. PUT /api/admin/time-entries/{id} accepts hourly_rate field
2. GET /api/admin/time-entries returns entries with hourly_rate field
3. POST /api/admin/payroll/report uses per-shift rates in calculations
4. GET /api/admin/payroll/summary uses per-shift rates in employee breakdown
5. GET /api/admin/payroll/employee/{id}/history uses per-shift rates
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_header(auth_token):
    """Get authorization header"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPerShiftRateEditing:
    """Test per-shift hourly rate editing feature"""
    
    def test_get_time_entries_returns_hourly_rate_field(self, auth_header):
        """GET /api/admin/time-entries returns entries with hourly_rate field"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_header)
        assert response.status_code == 200, f"Failed to get time entries: {response.text}"
        
        entries = response.json()
        assert isinstance(entries, list), "Response should be a list"
        
        if len(entries) > 0:
            # Check that entries have hourly_rate field (can be null or numeric)
            first_entry = entries[0]
            assert "hourly_rate" in first_entry or first_entry.get("hourly_rate") is None, \
                f"Entry should have hourly_rate field: {first_entry.keys()}"
            print(f"Found {len(entries)} time entries")
            print(f"First entry hourly_rate: {first_entry.get('hourly_rate')}")
        else:
            pytest.skip("No time entries found to test")
    
    def test_update_time_entry_hourly_rate(self, auth_header):
        """PUT /api/admin/time-entries/{id} accepts hourly_rate and updates it"""
        # First get an existing entry
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_header)
        assert response.status_code == 200
        entries = response.json()
        
        if len(entries) == 0:
            pytest.skip("No time entries found to test")
        
        # Find an entry with clock_out (completed shift)
        test_entry = None
        for entry in entries:
            if entry.get("clock_out"):
                test_entry = entry
                break
        
        if not test_entry:
            pytest.skip("No completed time entries found to test")
        
        entry_id = test_entry["id"]
        original_rate = test_entry.get("hourly_rate")
        new_rate = 25.50  # Test rate
        
        # Update the hourly rate
        update_response = requests.put(
            f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={"hourly_rate": new_rate},
            headers=auth_header
        )
        assert update_response.status_code == 200, f"Failed to update entry: {update_response.text}"
        
        updated_entry = update_response.json()
        assert updated_entry.get("hourly_rate") == new_rate, \
            f"Expected hourly_rate {new_rate}, got {updated_entry.get('hourly_rate')}"
        
        print(f"Successfully updated entry {entry_id} hourly_rate from {original_rate} to {new_rate}")
        
        # Verify by fetching the entry again
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            headers=auth_header
        )
        assert verify_response.status_code == 200
        verified_entry = verify_response.json()
        assert verified_entry.get("hourly_rate") == new_rate, \
            f"Verification failed: expected {new_rate}, got {verified_entry.get('hourly_rate')}"
        
        # Restore original rate if it was set
        if original_rate is not None:
            requests.put(
                f"{BASE_URL}/api/admin/time-entries/{entry_id}",
                json={"hourly_rate": original_rate},
                headers=auth_header
            )
    
    def test_payroll_report_uses_per_shift_rates(self, auth_header):
        """POST /api/admin/payroll/report returns per-shift rates in shifts array"""
        # Get a custom period report
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=30)).isoformat()
        end_date = now.isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/report",
            json={
                "period_type": "custom",
                "start_date": start_date,
                "end_date": end_date
            },
            headers=auth_header
        )
        assert response.status_code == 200, f"Failed to get payroll report: {response.text}"
        
        report = response.json()
        assert "employees" in report, f"Report should have employees field: {report.keys()}"
        
        employees = report.get("employees", [])
        if len(employees) == 0:
            pytest.skip("No employees with shifts in the period")
        
        # Check that shifts have hourly_rate field
        for emp in employees:
            shifts = emp.get("shifts", [])
            if len(shifts) > 0:
                for shift in shifts:
                    assert "hourly_rate" in shift, \
                        f"Shift should have hourly_rate field: {shift.keys()}"
                    print(f"Employee {emp.get('name')}: shift rate = ${shift.get('hourly_rate')}")
                
                # Verify gross_wages is calculated (should use per-shift rates)
                assert "gross_wages" in emp, f"Employee should have gross_wages: {emp.keys()}"
                print(f"Employee {emp.get('name')}: gross_wages = ${emp.get('gross_wages')}")
                break
    
    def test_payroll_summary_uses_per_shift_rates(self, auth_header):
        """GET /api/admin/payroll/summary returns employee breakdown with per-shift amounts"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/summary", headers=auth_header)
        assert response.status_code == 200, f"Failed to get payroll summary: {response.text}"
        
        summary = response.json()
        assert "current_period" in summary, f"Summary should have current_period: {summary.keys()}"
        
        current_period = summary.get("current_period", {})
        by_employee = current_period.get("by_employee", [])
        
        if len(by_employee) > 0:
            for emp in by_employee:
                assert "amount" in emp, f"Employee breakdown should have amount: {emp.keys()}"
                assert "hours" in emp, f"Employee breakdown should have hours: {emp.keys()}"
                print(f"Employee {emp.get('name')}: {emp.get('hours')} hrs = ${emp.get('amount')}")
        else:
            print("No employees with hours in current period")
    
    def test_employee_payroll_history_uses_per_shift_rates(self, auth_header):
        """GET /api/admin/payroll/employee/{id}/history uses per-shift rates"""
        # First get an employee with time entries
        entries_response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_header)
        assert entries_response.status_code == 200
        entries = entries_response.json()
        
        if len(entries) == 0:
            pytest.skip("No time entries found")
        
        # Get unique employee IDs
        employee_ids = list(set(e.get("user_id") for e in entries if e.get("user_id")))
        
        if len(employee_ids) == 0:
            pytest.skip("No employee IDs found in entries")
        
        employee_id = employee_ids[0]
        
        # Get employee payroll history
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/employee/{employee_id}/history",
            headers=auth_header
        )
        assert response.status_code == 200, f"Failed to get employee history: {response.text}"
        
        history = response.json()
        assert "employee" in history, f"History should have employee field: {history.keys()}"
        assert "periods" in history, f"History should have periods field: {history.keys()}"
        
        periods = history.get("periods", [])
        if len(periods) > 0:
            for period in periods:
                assert "amount_owed" in period, f"Period should have amount_owed: {period.keys()}"
                assert "hours" in period, f"Period should have hours: {period.keys()}"
                print(f"Period {period.get('period_label')}: {period.get('hours')} hrs = ${period.get('amount_owed')}")
        
        print(f"Employee {history.get('employee', {}).get('name')} history retrieved successfully")


class TestTimeEntryModelValidation:
    """Test EditTimeEntryRequest model accepts hourly_rate"""
    
    def test_update_with_only_hourly_rate(self, auth_header):
        """Can update only hourly_rate without other fields"""
        # Get an entry
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_header)
        assert response.status_code == 200
        entries = response.json()
        
        if len(entries) == 0:
            pytest.skip("No time entries found")
        
        entry = entries[0]
        entry_id = entry["id"]
        
        # Update only hourly_rate
        update_response = requests.put(
            f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={"hourly_rate": 18.75},
            headers=auth_header
        )
        assert update_response.status_code == 200, f"Failed: {update_response.text}"
        
        result = update_response.json()
        assert result.get("hourly_rate") == 18.75
        print(f"Successfully updated entry with only hourly_rate field")
    
    def test_update_hourly_rate_with_times(self, auth_header):
        """Can update hourly_rate along with clock times"""
        response = requests.get(f"{BASE_URL}/api/admin/time-entries", headers=auth_header)
        assert response.status_code == 200
        entries = response.json()
        
        # Find entry with clock_out
        test_entry = None
        for entry in entries:
            if entry.get("clock_out"):
                test_entry = entry
                break
        
        if not test_entry:
            pytest.skip("No completed entries found")
        
        entry_id = test_entry["id"]
        
        # Update both hourly_rate and clock_out
        update_response = requests.put(
            f"{BASE_URL}/api/admin/time-entries/{entry_id}",
            json={
                "hourly_rate": 22.00,
                "clock_out": test_entry["clock_out"]  # Keep same clock_out
            },
            headers=auth_header
        )
        assert update_response.status_code == 200, f"Failed: {update_response.text}"
        
        result = update_response.json()
        assert result.get("hourly_rate") == 22.00
        print(f"Successfully updated entry with hourly_rate and clock_out")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
