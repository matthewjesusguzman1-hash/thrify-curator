"""
Test suite for CORRECTED WLL percentages per 49 CFR 393.102:
- DIRECT tie-down = 50% of WLL (vehicle anchor to cargo, or same side)
- INDIRECT tie-down = 100% of WLL (vehicle anchor over cargo to OTHER side)

Also tests WLL values per 49 CFR 393.108:
- 2" Synthetic Web = 2000 lbs
- 5/16" Gr70 Chain = 6600 lbs
- 3/8" Gr70 Chain = 9200 lbs
- 1/2" Gr70 Chain = 14800 lbs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDirectIndirectWLLPercentages:
    """
    CRITICAL: Tests for CORRECTED WLL percentages per 49 CFR 393.102
    - Direct = 50% WLL
    - Indirect = 100% WLL
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test inspection for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_WLL_Percentages_Corrected"
        })
        assert response.status_code == 200, f"Failed to create test inspection: {response.text}"
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_direct_tiedown_50_percent(self):
        """
        CRITICAL: Direct tie-down should apply 50% WLL
        3/8" Gr70 Chain (9200 lbs) direct → effective 4600 lbs
        """
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain", "wll": 9200, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # CRITICAL: Direct = 50% WLL
        assert data["tiedowns"][0]["effective_wll"] == 4600, \
            f"Direct should be 50% of 9200 = 4600, got {data['tiedowns'][0]['effective_wll']}"
        assert data["total_effective_wll"] == 4600
    
    def test_indirect_tiedown_100_percent(self):
        """
        CRITICAL: Indirect tie-down should apply 100% WLL
        1/2" Gr70 Chain (14800 lbs) indirect → effective 14800 lbs
        """
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "1/2\" Gr70 Chain", "wll": 14800, "method": "indirect", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # CRITICAL: Indirect = 100% WLL
        assert data["tiedowns"][0]["effective_wll"] == 14800, \
            f"Indirect should be 100% of 14800 = 14800, got {data['tiedowns'][0]['effective_wll']}"
        assert data["total_effective_wll"] == 14800
    
    def test_math_verification_compliant(self):
        """
        Math verification per problem statement:
        20000 lbs, 10ft, direct 9200 + indirect 14800 + direct 2000
        = 4600 + 14800 + 1000 = 20400 eff = 204% COMPLIANT
        """
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain", "wll": 9200, "method": "direct", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 14800, "method": "indirect", "defective": False},
                {"type": "2\" Synthetic Web", "wll": 2000, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Required WLL = 20000 * 0.5 = 10000
        assert data["required_wll"] == 10000
        
        # Verify individual effective WLLs
        assert data["tiedowns"][0]["effective_wll"] == 4600, "Direct 9200 → 4600"
        assert data["tiedowns"][1]["effective_wll"] == 14800, "Indirect 14800 → 14800"
        assert data["tiedowns"][2]["effective_wll"] == 1000, "Direct 2000 → 1000"
        
        # Total = 4600 + 14800 + 1000 = 20400
        assert data["total_effective_wll"] == 20400, \
            f"Expected 20400, got {data['total_effective_wll']}"
        
        # Percentage = 20400 / 10000 * 100 = 204%
        pct = round(data["total_effective_wll"] / data["required_wll"] * 100)
        assert pct == 204, f"Expected 204%, got {pct}%"
        
        # COMPLIANT: 20400 >= 10000 and 3 >= 2 (min for 10ft)
        assert data["compliant"] == True
        assert data["min_tiedowns"] == 2
        assert data["active_count"] == 3
    
    def test_mixed_direct_indirect_calculation(self):
        """
        Test mixed direct/indirect with defective:
        Direct 9200 (50% = 4600) + Indirect 14800 (100% = 14800) + Defective 2000 (0)
        = 19400 effective
        """
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 15,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain", "wll": 9200, "method": "direct", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 14800, "method": "indirect", "defective": False},
                {"type": "2\" Synthetic Web", "wll": 2000, "method": "direct", "defective": True}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify effective WLLs
        assert data["tiedowns"][0]["effective_wll"] == 4600  # Direct 50%
        assert data["tiedowns"][1]["effective_wll"] == 14800  # Indirect 100%
        assert data["tiedowns"][2]["effective_wll"] == 0  # Defective
        
        # Total = 4600 + 14800 + 0 = 19400
        assert data["total_effective_wll"] == 19400
        
        # Required = 30000 * 0.5 = 15000
        assert data["required_wll"] == 15000
        
        # 19400 >= 15000 but only 2 active < 3 min (for 15ft)
        assert data["active_count"] == 2
        assert data["defective_count"] == 1
        assert data["min_tiedowns"] == 3  # 15ft = 2 + ceil((15-10)/10) = 3
        assert data["compliant"] == False  # Not enough active tie-downs


class TestWLLValuesMatch393108:
    """
    Tests that WLL values match 49 CFR 393.108 table:
    - 2" Synthetic Web = 2000 lbs
    - 5/16" Gr70 Chain = 6600 lbs
    - 3/8" Gr70 Chain = 9200 lbs
    - 1/2" Gr70 Chain = 14800 lbs
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_WLL_Values_393108"
        })
        assert response.status_code == 200
        self.inspection_id = response.json()["id"]
        
        yield
        
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_2inch_synthetic_web_2000(self):
        """2" Synthetic Web = 2000 lbs per 393.108"""
        payload = {
            "cargo_weight": 10000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "2\" Synthetic Web", "wll": 2000, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Direct = 50% of 2000 = 1000
        assert data["tiedowns"][0]["wll"] == 2000
        assert data["tiedowns"][0]["effective_wll"] == 1000
    
    def test_5_16_gr70_chain_6600(self):
        """5/16" Gr70 Chain = 6600 lbs per 393.108"""
        payload = {
            "cargo_weight": 10000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "5/16\" Gr70 Chain", "wll": 6600, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Direct = 50% of 6600 = 3300
        assert data["tiedowns"][0]["wll"] == 6600
        assert data["tiedowns"][0]["effective_wll"] == 3300
    
    def test_3_8_gr70_chain_9200(self):
        """3/8" Gr70 Chain = 9200 lbs per 393.108"""
        payload = {
            "cargo_weight": 10000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain", "wll": 9200, "method": "indirect", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Indirect = 100% of 9200 = 9200
        assert data["tiedowns"][0]["wll"] == 9200
        assert data["tiedowns"][0]["effective_wll"] == 9200
    
    def test_1_2_gr70_chain_14800(self):
        """1/2" Gr70 Chain = 14800 lbs per 393.108"""
        payload = {
            "cargo_weight": 10000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "1/2\" Gr70 Chain", "wll": 14800, "method": "indirect", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Indirect = 100% of 14800 = 14800
        assert data["tiedowns"][0]["wll"] == 14800
        assert data["tiedowns"][0]["effective_wll"] == 14800


class TestExistingInspectionData:
    """Test using existing inspection data to verify computations"""
    
    def test_existing_inspection_a4a7f51d(self):
        """
        Verify existing inspection a4a7f51d-9145-41d9-a867-3f7c97393f10
        has correct WLL computations
        """
        session = requests.Session()
        
        response = session.get(
            f"{BASE_URL}/api/inspections/a4a7f51d-9145-41d9-a867-3f7c97393f10"
        )
        
        if response.status_code == 404:
            pytest.skip("Inspection a4a7f51d not found")
        
        assert response.status_code == 200
        data = response.json()
        
        assessments = data.get("tiedown_assessments", [])
        if not assessments:
            pytest.skip("No tie-down assessments found")
        
        # Find the assessment with 3/8 Gr70 direct and 1/2 Gr70 indirect
        for a in assessments:
            tiedowns = a.get("tiedowns", [])
            for td in tiedowns:
                if td.get("method") == "direct" and not td.get("defective"):
                    # Direct should be 50% of WLL
                    expected_eff = td["wll"] * 0.5
                    assert td["effective_wll"] == expected_eff, \
                        f"Direct {td['type']} WLL {td['wll']} should have eff {expected_eff}, got {td['effective_wll']}"
                elif td.get("method") == "indirect" and not td.get("defective"):
                    # Indirect should be 100% of WLL
                    expected_eff = td["wll"]
                    assert td["effective_wll"] == expected_eff, \
                        f"Indirect {td['type']} WLL {td['wll']} should have eff {expected_eff}, got {td['effective_wll']}"


class TestExportHTMLLabels:
    """Test that export HTML shows correct percentage labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_Export_Labels"
        })
        assert response.status_code == 200
        self.inspection_id = response.json()["id"]
        
        # Add assessment with both direct and indirect
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain", "wll": 9200, "method": "direct", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 14800, "method": "indirect", "defective": False}
            ]
        }
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        assert response.status_code == 200
        
        yield
        
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_export_shows_correct_percentage_labels(self):
        """Export HTML should show 'DIRECT 50%' and 'INDIRECT 100%' labels"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export"
        )
        
        assert response.status_code == 200
        html = response.text
        
        # Check for correct percentage labels
        assert "DIRECT 50%" in html, "Export should show 'DIRECT 50%' label"
        assert "INDIRECT 100%" in html, "Export should show 'INDIRECT 100%' label"
        
        # Check for correct effective WLL values
        assert "4,600" in html or "4600" in html, "Direct 9200 should show 4600 effective"
        assert "14,800" in html or "14800" in html, "Indirect 14800 should show 14800 effective"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
