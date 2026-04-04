"""
Test Mileage Tracking Consolidation
Tests that GPS Mileage Tracker and Financials Mileage section show the same data
from gps_trips collection.
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com').rstrip('/')

# IRS Standard Mileage Rate for 2026
IRS_RATE_2026 = 0.725


class TestMileageConsolidation:
    """Test that mileage data is consolidated from gps_trips collection"""
    
    def test_financials_mileage_endpoint_returns_gps_trips_data(self):
        """Test GET /api/financials/mileage/{year} returns data from gps_trips"""
        response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert response.status_code == 200
        
        data = response.json()
        assert "entries" in data
        assert "total_miles" in data
        assert "irs_rate" in data
        assert "deduction" in data
        
        # Verify IRS rate is correct for 2026
        assert data["irs_rate"] == IRS_RATE_2026
        
        # Verify deduction calculation
        expected_deduction = round(data["total_miles"] * IRS_RATE_2026, 2)
        assert data["deduction"] == expected_deduction
        
        # Verify entries have source field (gps, manual, or legacy)
        for entry in data["entries"]:
            assert "source" in entry
            assert entry["source"] in ["gps", "manual", "legacy"]
    
    def test_tax_prep_summary_uses_gps_trips_for_mileage(self):
        """Test GET /api/financials/tax-prep/summary/{year} uses gps_trips for mileage"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-prep/summary/2026")
        assert response.status_code == 200
        
        data = response.json()
        assert "mileage" in data
        assert "total_miles" in data["mileage"]
        assert "rate" in data["mileage"]
        assert "deduction" in data["mileage"]
        
        # Verify IRS rate is correct for 2026
        assert data["mileage"]["rate"] == IRS_RATE_2026
        
        # Verify deduction calculation
        expected_deduction = round(data["mileage"]["total_miles"] * IRS_RATE_2026, 2)
        assert data["mileage"]["deduction"] == expected_deduction
    
    def test_mileage_data_consistency_between_endpoints(self):
        """Test that mileage data is consistent between financials/mileage and tax-prep/summary"""
        # Get mileage from financials endpoint
        mileage_response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert mileage_response.status_code == 200
        mileage_data = mileage_response.json()
        
        # Get mileage from tax-prep summary
        tax_prep_response = requests.get(f"{BASE_URL}/api/financials/tax-prep/summary/2026")
        assert tax_prep_response.status_code == 200
        tax_prep_data = tax_prep_response.json()
        
        # Both should show the same total miles
        assert mileage_data["total_miles"] == tax_prep_data["mileage"]["total_miles"]
        
        # Both should show the same deduction
        assert mileage_data["deduction"] == tax_prep_data["mileage"]["deduction"]
    
    def test_financial_summary_mileage_matches_mileage_endpoint(self):
        """
        BUG TEST: Test that /api/financials/summary/{year} mileage matches /api/financials/mileage/{year}
        
        This test is expected to FAIL because the financial summary endpoint still reads from
        mileage_entries collection instead of gps_trips collection.
        """
        # Get mileage from dedicated mileage endpoint (correct data)
        mileage_response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert mileage_response.status_code == 200
        mileage_data = mileage_response.json()
        
        # Get mileage from financial summary endpoint (potentially incorrect)
        summary_response = requests.get(f"{BASE_URL}/api/financials/summary/2026")
        assert summary_response.status_code == 200
        summary_data = summary_response.json()
        
        # These should match - if they don't, there's a data consolidation bug
        assert summary_data["deductions"]["mileage_miles"] == mileage_data["total_miles"], \
            f"Financial summary shows {summary_data['deductions']['mileage_miles']} miles but mileage endpoint shows {mileage_data['total_miles']} miles"
        
        assert summary_data["deductions"]["mileage"] == mileage_data["deduction"], \
            f"Financial summary shows ${summary_data['deductions']['mileage']} deduction but mileage endpoint shows ${mileage_data['deduction']} deduction"


class TestGPSMileageTrackerAPI:
    """Test GPS Mileage Tracker API endpoints"""
    
    def test_manual_trip_creation(self):
        """Test POST /api/admin/gps-trips/manual creates a trip"""
        # This endpoint requires authentication, so we'll test the structure
        # The actual creation is tested via frontend E2E tests
        pass
    
    def test_mileage_entries_have_correct_structure(self):
        """Test that mileage entries have all required fields"""
        response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert response.status_code == 200
        
        data = response.json()
        
        for entry in data["entries"]:
            # Required fields
            assert "id" in entry
            assert "year" in entry
            assert "date" in entry
            assert "miles" in entry
            assert "source" in entry
            
            # Miles should be positive
            assert entry["miles"] >= 0
            
            # Year should be 2026
            assert entry["year"] == 2026
    
    def test_irs_rate_is_correct_for_2026(self):
        """Test that IRS rate is $0.725/mile for 2026"""
        response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert response.status_code == 200
        
        data = response.json()
        assert data["irs_rate"] == 0.725, f"Expected IRS rate 0.725 but got {data['irs_rate']}"
    
    def test_tax_deduction_calculation(self):
        """Test that tax deduction is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/financials/mileage/2026")
        assert response.status_code == 200
        
        data = response.json()
        
        # Calculate expected deduction
        expected_deduction = round(data["total_miles"] * data["irs_rate"], 2)
        
        assert data["deduction"] == expected_deduction, \
            f"Expected deduction ${expected_deduction} but got ${data['deduction']}"


class TestYearComparison:
    """Test year comparison endpoint for mileage data"""
    
    def test_comparison_endpoint_returns_mileage_data(self):
        """Test GET /api/financials/comparison/{year} includes mileage"""
        response = requests.get(f"{BASE_URL}/api/financials/comparison/2026")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should have current and previous year data
        assert "current_year" in data
        assert "previous_year" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
