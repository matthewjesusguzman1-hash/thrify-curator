"""
Test Monthly Mileage Reports API

Tests the monthly mileage report endpoints that replaced GPS tracking:
- GET /api/admin/mileage/report - Get monthly mileage entries
- GET /api/admin/mileage/report/csv - Download CSV report
- GET /api/admin/mileage/report/pdf - Download PDF report
- POST /api/admin/mileage/monthly-entry - Create/update monthly entry
"""

import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE_MATTHEW = "4399"
ADMIN_CODE_EUNICE = "0826"


@pytest.fixture
def admin_token_matthew():
    """Get admin token for Matthew Guzman using code 4399"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "admin_code": ADMIN_CODE_MATTHEW}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin auth failed: {response.text}")


@pytest.fixture
def admin_token_eunice():
    """Get admin token for Eunice Guzman using code 0826"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "admin_code": ADMIN_CODE_EUNICE}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin auth failed: {response.text}")


@pytest.fixture
def auth_header_matthew(admin_token_matthew):
    """Return auth header for Matthew"""
    return {"Authorization": f"Bearer {admin_token_matthew}"}


@pytest.fixture
def auth_header_eunice(admin_token_eunice):
    """Return auth header for Eunice"""
    return {"Authorization": f"Bearer {admin_token_eunice}"}


class TestAdminLoginWithCodes:
    """Test admin login with both admin codes"""
    
    def test_admin_login_code_4399_matthew(self):
        """Admin login with code 4399 returns Matthew Guzman"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "admin_code": "4399"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["name"] == "Matthew Guzman"
        assert data["user"]["role"] == "admin"
    
    def test_admin_login_code_0826_eunice(self):
        """Admin login with code 0826 returns Eunice Guzman"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "admin_code": "0826"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["name"] == "Eunice Guzman"
        assert data["user"]["role"] == "admin"
    
    def test_admin_login_invalid_code(self):
        """Admin login with invalid code fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "admin_code": "9999"}
        )
        assert response.status_code == 401
        assert "Invalid access code" in response.json().get("detail", "")
    
    def test_admin_login_no_code(self):
        """Admin login without code fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL}
        )
        assert response.status_code == 401
        assert "access code" in response.json().get("detail", "").lower()


class TestMonthlyMileageEntry:
    """Test monthly mileage entry creation API"""
    
    def test_create_monthly_entry(self, auth_header_matthew):
        """Create monthly mileage entry via POST"""
        test_year = 2024
        test_month = 11  # November
        test_miles = 99.9
        test_notes = f"TEST_{uuid.uuid4().hex[:8]} mileage entry"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/monthly-entry",
            headers=auth_header_matthew,
            json={
                "year": test_year,
                "month": test_month,
                "total_miles": test_miles,
                "notes": test_notes
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response fields
        assert data["year"] == test_year
        assert data["month"] == test_month
        assert data["month_name"] == "November"
        assert data["total_miles"] == test_miles
        assert data["notes"] == test_notes
        assert "tax_deduction" in data
        assert data["tax_deduction"] > 0  # Should be miles * IRS rate
        assert "id" in data
        assert "created_at" in data
        
        # Cleanup - delete the entry
        entry_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/mileage/monthly-entry/{entry_id}",
            headers=auth_header_matthew
        )
    
    def test_update_existing_monthly_entry(self, auth_header_matthew):
        """Update existing monthly entry (same month/year)"""
        test_year = 2024
        test_month = 10  # October
        
        # Create initial entry
        response1 = requests.post(
            f"{BASE_URL}/api/admin/mileage/monthly-entry",
            headers=auth_header_matthew,
            json={
                "year": test_year,
                "month": test_month,
                "total_miles": 100.0,
                "notes": "Initial entry"
            }
        )
        assert response1.status_code == 200
        entry_id = response1.json()["id"]
        
        # Update the entry (same month/year)
        response2 = requests.post(
            f"{BASE_URL}/api/admin/mileage/monthly-entry",
            headers=auth_header_matthew,
            json={
                "year": test_year,
                "month": test_month,
                "total_miles": 200.0,
                "notes": "Updated entry"
            }
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should update, not create new
        assert data2["id"] == entry_id
        assert data2["total_miles"] == 200.0
        assert data2["notes"] == "Updated entry"
        assert data2["updated_at"] is not None
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/mileage/monthly-entry/{entry_id}",
            headers=auth_header_matthew
        )
    
    def test_create_entry_requires_auth(self):
        """Monthly entry creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/mileage/monthly-entry",
            json={"year": 2024, "month": 1, "total_miles": 100}
        )
        assert response.status_code == 401


class TestMileageReportEndpoint:
    """Test GET /api/admin/mileage/report endpoint"""
    
    def test_mileage_report_returns_correct_fields(self, auth_header_matthew):
        """Mileage report returns month_name, year, total_miles, deduction"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level fields
        assert "start_date" in data
        assert "end_date" in data
        assert "entries" in data
        assert "employees" in data
        assert "total_trips" in data
        assert "total_miles" in data
        assert "total_deduction" in data
        
        # Check entry fields
        if data["entries"]:
            entry = data["entries"][0]
            assert "month_name" in entry
            assert "year" in entry
            assert "total_miles" in entry
            assert "deduction" in entry
            assert "notes" in entry
            assert "user_name" in entry
    
    def test_mileage_report_calculates_totals(self, auth_header_matthew):
        """Mileage report correctly calculates total miles and deduction"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["entries"]:
            # Verify total_miles equals sum of entry miles
            calculated_total = sum(e["total_miles"] for e in data["entries"])
            assert abs(data["total_miles"] - calculated_total) < 0.1
            
            # Verify total_trips equals number of entries
            assert data["total_trips"] == len(data["entries"])
    
    def test_mileage_report_requires_auth(self):
        """Mileage report endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 401


class TestMileageReportCSV:
    """Test GET /api/admin/mileage/report/csv endpoint"""
    
    def test_csv_download_format(self, auth_header_matthew):
        """CSV download contains correct columns: Month, Year, Total Miles, Tax Deduction, Notes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/csv",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        csv_content = response.text
        lines = csv_content.split("\n")
        
        # Check header row
        header = lines[0]
        assert "Month" in header
        assert "Year" in header
        assert "Total Miles" in header
        assert "Tax Deduction" in header
        assert "Notes" in header
    
    def test_csv_download_has_summary(self, auth_header_matthew):
        """CSV download includes summary section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/csv",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        csv_content = response.text
        
        assert "SUMMARY" in csv_content
        assert "Months Logged" in csv_content
        assert "Total Miles" in csv_content
        assert "Total Tax Deduction" in csv_content
    
    def test_csv_download_has_irs_note(self, auth_header_matthew):
        """CSV download includes IRS rate note"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/csv",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        csv_content = response.text
        
        assert "IRS standard mileage rates" in csv_content
    
    def test_csv_download_requires_auth(self):
        """CSV download requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/csv",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 401


class TestMileageReportPDF:
    """Test GET /api/admin/mileage/report/pdf endpoint"""
    
    def test_pdf_download_valid_file(self, auth_header_matthew):
        """PDF download generates valid PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/pdf",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF'
    
    def test_pdf_download_has_content(self, auth_header_matthew):
        """PDF download has reasonable file size (not empty)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/pdf",
            headers=auth_header_matthew,
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        
        assert response.status_code == 200
        # PDF should be at least 1KB
        assert len(response.content) > 1000
    
    def test_pdf_download_requires_auth(self):
        """PDF download requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/report/pdf",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"}
        )
        assert response.status_code == 401


class TestYearlySummary:
    """Test yearly summary endpoint"""
    
    def test_yearly_summary_endpoint(self, auth_header_matthew):
        """Yearly summary returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mileage/yearly-summary",
            headers=auth_header_matthew,
            params={"year": 2025}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "year" in data
        assert "total_miles" in data
        assert "total_tax_deduction" in data
        assert "irs_rate" in data
        assert "monthly_entries" in data
        assert "months_entered" in data
        assert "months_missing" in data
    
    def test_yearly_summary_irs_rates(self, auth_header_matthew):
        """Verify correct IRS rates for different years"""
        # Test 2024 rate (0.67)
        response_2024 = requests.get(
            f"{BASE_URL}/api/admin/mileage/yearly-summary",
            headers=auth_header_matthew,
            params={"year": 2024}
        )
        assert response_2024.status_code == 200
        assert response_2024.json()["irs_rate"] == 0.67
        
        # Test 2025 rate (0.70)
        response_2025 = requests.get(
            f"{BASE_URL}/api/admin/mileage/yearly-summary",
            headers=auth_header_matthew,
            params={"year": 2025}
        )
        assert response_2025.status_code == 200
        assert response_2025.json()["irs_rate"] == 0.70
        
        # Test 2026 rate (0.725)
        response_2026 = requests.get(
            f"{BASE_URL}/api/admin/mileage/yearly-summary",
            headers=auth_header_matthew,
            params={"year": 2026}
        )
        assert response_2026.status_code == 200
        assert response_2026.json()["irs_rate"] == 0.725


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
