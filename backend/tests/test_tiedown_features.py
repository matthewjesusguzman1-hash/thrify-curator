"""
Test suite for Tie-Down Calculator Export and Save-to-Inspection features.
Tests the new endpoints:
- POST /api/inspections/{id}/tiedown - Save tie-down assessment to inspection
- DELETE /api/inspections/{id}/tiedown/{assessment_id} - Remove tie-down assessment
- GET /api/inspections/{id}/export - Export inspection with tie-down data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTieDownSaveToInspection:
    """Tests for saving tie-down assessments to inspections"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test inspection for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_TieDown_Inspection"
        })
        assert response.status_code == 200, f"Failed to create test inspection: {response.text}"
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        yield
        
        # Cleanup: delete the test inspection
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_save_tiedown_basic(self):
        """Test saving a basic tie-down assessment to an inspection"""
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "direct", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to save tiedown: {response.text}"
        data = response.json()
        
        # Verify computed values
        assert data["cargo_weight"] == 30000
        assert data["cargo_length"] == 20
        assert data["required_wll"] == 15000  # 50% of 30000
        assert data["min_tiedowns"] == 3  # 20ft = 2 + ceil((20-10)/10) = 3
        assert data["total_effective_wll"] == 21200  # 3300 + 6600 + 11300
        assert data["active_count"] == 3
        assert data["defective_count"] == 0
        assert data["compliant"] == True  # 21200 >= 15000 and 3 >= 3
        assert "assessment_id" in data
        assert "created_at" in data
        
        # Verify it was saved to the inspection
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        assert get_response.status_code == 200
        inspection = get_response.json()
        assert "tiedown_assessments" in inspection
        assert len(inspection["tiedown_assessments"]) == 1
        assert inspection["tiedown_assessments"][0]["assessment_id"] == data["assessment_id"]
    
    def test_save_tiedown_with_indirect_method(self):
        """Test that indirect method applies 50% WLL correctly"""
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "indirect", "defective": False},  # 50% = 3300
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify indirect method applies 50%
        assert data["total_effective_wll"] == 17900  # 3300 + 3300 (50% of 6600) + 11300
        assert data["compliant"] == True  # 17900 >= 15000
        
        # Verify individual tiedown effective WLL
        tiedowns = data["tiedowns"]
        assert tiedowns[0]["effective_wll"] == 3300  # direct
        assert tiedowns[1]["effective_wll"] == 3300  # indirect 50%
        assert tiedowns[2]["effective_wll"] == 11300  # direct
    
    def test_save_tiedown_with_defective(self):
        """Test that defective tie-downs contribute 0 WLL"""
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "indirect", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": True}  # 0 WLL
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify defective contributes 0
        assert data["total_effective_wll"] == 6600  # 3300 + 3300 + 0
        assert data["active_count"] == 2
        assert data["defective_count"] == 1
        assert data["compliant"] == False  # 6600 < 15000 and 2 < 3
        
        # Verify individual tiedown effective WLL
        tiedowns = data["tiedowns"]
        assert tiedowns[2]["effective_wll"] == 0  # defective
    
    def test_math_verification_not_compliant(self):
        """
        Math verification: 30000 lbs cargo, 20ft
        direct 3300 + indirect 6600 (50%=3300) + defective 11300 (0) = eff 6600 = 44% NOT COMPLIANT
        """
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "indirect", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": True}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required WLL = 30000 * 0.5 = 15000
        assert data["required_wll"] == 15000
        # Effective WLL = 3300 (direct) + 3300 (indirect 50%) + 0 (defective) = 6600
        assert data["total_effective_wll"] == 6600
        # Percentage = 6600 / 15000 * 100 = 44%
        pct = round(data["total_effective_wll"] / data["required_wll"] * 100)
        assert pct == 44
        # NOT COMPLIANT because 6600 < 15000 and active_count (2) < min_tiedowns (3)
        assert data["compliant"] == False
    
    def test_math_verification_compliant(self):
        """
        Math verification: 30000 lbs cargo, 20ft
        all direct 3300+6600+11300 = 21200 = 141% COMPLIANT
        """
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "direct", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required WLL = 30000 * 0.5 = 15000
        assert data["required_wll"] == 15000
        # Effective WLL = 3300 + 6600 + 11300 = 21200
        assert data["total_effective_wll"] == 21200
        # Percentage = 21200 / 15000 * 100 = 141%
        pct = round(data["total_effective_wll"] / data["required_wll"] * 100)
        assert pct == 141
        # COMPLIANT because 21200 >= 15000 and active_count (3) >= min_tiedowns (3)
        assert data["compliant"] == True
    
    def test_save_tiedown_to_nonexistent_inspection(self):
        """Test saving to a non-existent inspection returns 404"""
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/nonexistent-id/tiedown",
            json=payload
        )
        
        assert response.status_code == 404


class TestTieDownDelete:
    """Tests for deleting tie-down assessments from inspections"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test inspection with a tie-down assessment"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_TieDown_Delete_Inspection"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        # Add a tie-down assessment
        payload = {
            "cargo_weight": 10000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "Test Strap", "wll": 5000, "method": "direct", "defective": False}
            ]
        }
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        assert response.status_code == 200
        self.assessment = response.json()
        self.assessment_id = self.assessment["assessment_id"]
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_delete_tiedown_assessment(self):
        """Test deleting a tie-down assessment from an inspection"""
        # Verify assessment exists
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        assert get_response.status_code == 200
        inspection = get_response.json()
        assert len(inspection.get("tiedown_assessments", [])) == 1
        
        # Delete the assessment
        response = self.session.delete(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{self.assessment_id}"
        )
        assert response.status_code == 200
        
        # Verify it was removed
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        assert get_response.status_code == 200
        inspection = get_response.json()
        assert len(inspection.get("tiedown_assessments", [])) == 0


class TestInspectionExportWithTieDown:
    """Tests for inspection export including tie-down assessment data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test inspection with tie-down assessment"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_Export_Inspection"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        # Add a tie-down assessment
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False},
                {"type": "3/8\" Gr70 Chain", "wll": 6600, "method": "indirect", "defective": False},
                {"type": "1/2\" Gr70 Chain", "wll": 11300, "method": "direct", "defective": True}
            ]
        }
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        assert response.status_code == 200
        self.assessment = response.json()
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_export_includes_tiedown_section(self):
        """Test that inspection export includes tie-down assessment HTML section"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export"
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        
        # Verify tie-down section is present
        assert "Tie-Down Assessment" in html
        assert "Cargo Weight" in html
        assert "Cargo Length" in html
        assert "Required WLL" in html
        assert "Min Tie-Downs" in html
        
        # Verify tie-down data
        assert "30,000" in html or "30000" in html  # cargo weight
        assert "20" in html  # cargo length
        assert "15,000" in html or "15000" in html  # required WLL
        
        # Verify compliance status
        assert "NOT COMPLIANT" in html  # This assessment is not compliant
        
        # Verify tie-down items
        assert "1\" Ratchet Strap" in html or "1&quot; Ratchet Strap" in html
        assert "DIRECT" in html
        assert "INDIRECT" in html
        assert "DEFECTIVE" in html
    
    def test_export_without_photos(self):
        """Test export without photos parameter"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export?include_photos=N"
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
    
    def test_export_with_photos(self):
        """Test export with photos parameter"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export?include_photos=Y"
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")


class TestExistingInspectionWithTieDown:
    """Tests using existing inspection data"""
    
    def test_get_existing_inspection_with_tiedown(self):
        """Test fetching an existing inspection that has tie-down assessments"""
        session = requests.Session()
        
        # Get list of inspections
        response = session.get(f"{BASE_URL}/api/inspections")
        assert response.status_code == 200
        
        inspections = response.json().get("inspections", [])
        
        # Find an inspection with tiedown_assessments
        inspection_with_tiedown = None
        for insp in inspections:
            if insp.get("tiedown_assessments") and len(insp["tiedown_assessments"]) > 0:
                inspection_with_tiedown = insp
                break
        
        if inspection_with_tiedown:
            # Verify the structure
            assessment = inspection_with_tiedown["tiedown_assessments"][0]
            assert "assessment_id" in assessment
            assert "cargo_weight" in assessment
            assert "cargo_length" in assessment
            assert "required_wll" in assessment
            assert "min_tiedowns" in assessment
            assert "tiedowns" in assessment
            assert "total_effective_wll" in assessment
            assert "active_count" in assessment
            assert "defective_count" in assessment
            assert "compliant" in assessment
            assert "created_at" in assessment
            
            # Verify tiedown items structure
            for td in assessment["tiedowns"]:
                assert "type" in td
                assert "wll" in td
                assert "method" in td
                assert "defective" in td
                assert "effective_wll" in td
        else:
            pytest.skip("No existing inspection with tie-down assessments found")


class TestListInspections:
    """Tests for listing inspections endpoint"""
    
    def test_list_inspections(self):
        """Test that list inspections returns proper structure"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/inspections")
        assert response.status_code == 200
        
        data = response.json()
        assert "inspections" in data
        assert isinstance(data["inspections"], list)
        
        if len(data["inspections"]) > 0:
            insp = data["inspections"][0]
            assert "id" in insp
            assert "title" in insp
            assert "created_at" in insp
            assert "items" in insp


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
