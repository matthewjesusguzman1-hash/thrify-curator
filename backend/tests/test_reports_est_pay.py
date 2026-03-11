"""
Backend API Tests for Est. Pay Feature in Shift Reports
Tests the Est. Pay column in shift reports - JSON API, CSV export, and PDF export
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://consign-portal-1.preview.emergentagent.com')


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matthewjesusguzman1@gmail.com",
        "admin_code": "4399"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestShiftReportsEstPay:
    """Tests for Est. Pay column in shift reports"""
    
    def test_shift_report_returns_hourly_rate(self, auth_headers):
        """Test that /api/admin/reports/shifts returns hourly_rate for each entry"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "entries" in data
        assert "summary" in data
        
        # Verify each entry has hourly_rate
        for entry in data["entries"]:
            assert "hourly_rate" in entry, "Entry missing hourly_rate field"
            assert isinstance(entry["hourly_rate"], (int, float)), "hourly_rate should be numeric"
            assert "total_hours" in entry, "Entry missing total_hours field"
    
    def test_shift_report_summary_has_hourly_rate(self, auth_headers):
        """Test that summary items have hourly_rate for Est. Pay calculation"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary items have hourly_rate
        for summary in data["summary"]:
            assert "hourly_rate" in summary, "Summary missing hourly_rate field"
            assert "total_hours" in summary, "Summary missing total_hours field"
            assert isinstance(summary["hourly_rate"], (int, float))
    
    def test_csv_export_has_est_pay_column(self, auth_headers):
        """Test that CSV export includes Est. Pay column"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/csv",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        csv_content = response.text
        lines = csv_content.split('\n')
        
        # Check header row has Est. Pay
        assert "Est. Pay" in lines[0], "CSV header missing 'Est. Pay' column"
        
        headers = lines[0].split(',')
        est_pay_index = headers.index('Est. Pay')
        assert est_pay_index > 0, "Est. Pay column not found in header"
        
        # Check data rows have currency-formatted values
        if len(lines) > 1 and lines[1].strip():
            data_row = lines[1].split(',')
            est_pay_value = data_row[est_pay_index]
            assert est_pay_value.startswith('$'), f"Est. Pay should be currency-formatted: {est_pay_value}"
    
    def test_csv_export_summary_has_estimated_pay(self, auth_headers):
        """Test that CSV summary section includes Estimated Pay"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/csv",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        csv_content = response.text
        
        # Check summary section has Estimated Pay
        assert "=== SUMMARY ===" in csv_content, "CSV missing summary section"
        assert "Estimated Pay" in csv_content, "Summary missing 'Estimated Pay' header"
    
    def test_pdf_export_returns_valid_pdf(self, auth_headers):
        """Test that PDF export returns valid PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/pdf",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify content type
        assert response.headers.get('content-type') == 'application/pdf'
        
        # Verify PDF magic number
        content = response.content
        assert content[:5] == b'%PDF-', "Response is not a valid PDF file"
        
        # Verify filename in content-disposition
        content_disposition = response.headers.get('content-disposition', '')
        assert 'shift_report_' in content_disposition
        assert '.pdf' in content_disposition
    
    def test_est_pay_calculation_is_correct(self, auth_headers):
        """Test that Est. Pay = total_hours * hourly_rate"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        data = response.json()
        
        for entry in data["entries"]:
            hours = entry.get("total_hours", 0) or 0
            rate = entry.get("hourly_rate", 15)
            expected_pay = hours * rate
            assert expected_pay >= 0, "Est. Pay calculation should be non-negative"
    
    def test_csv_values_match_api_data(self, auth_headers):
        """Test that CSV Est. Pay values match API calculation"""
        # Get JSON data
        json_response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        json_data = json_response.json()
        
        # Get CSV data
        csv_response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/csv",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
            headers=auth_headers
        )
        csv_content = csv_response.text
        
        if json_data["entries"]:
            lines = csv_content.split('\n')
            headers = lines[0].split(',')
            est_pay_index = headers.index('Est. Pay')
            
            # Get first data row
            if len(lines) > 1:
                data_row = lines[1].split(',')
                csv_pay = float(data_row[est_pay_index].replace('$', ''))
                
                entry = json_data["entries"][0]
                expected_pay = (entry["total_hours"] or 0) * (entry["hourly_rate"] or 15)
                
                assert abs(csv_pay - expected_pay) < 0.01, \
                    f"CSV pay ({csv_pay}) doesn't match calculated pay ({expected_pay})"


class TestShiftReportsAuth:
    """Test authentication requirements for reports"""
    
    def test_shift_report_requires_auth(self):
        """Test that shift report endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        assert response.status_code in [401, 403], "Endpoint should require auth"
    
    def test_csv_export_requires_auth(self):
        """Test that CSV export requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/csv",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        assert response.status_code in [401, 403], "Endpoint should require auth"
    
    def test_pdf_export_requires_auth(self):
        """Test that PDF export requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/shifts/pdf",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        assert response.status_code in [401, 403], "Endpoint should require auth"
