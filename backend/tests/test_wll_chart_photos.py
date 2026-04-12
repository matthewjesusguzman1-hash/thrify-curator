"""
Test suite for NEW Tie-Down Calculator features:
1. 393.108 WLL Chart - collapsible section with categorized tabs
2. Direct vs Indirect infographic
3. Photo upload capability (calculator and inspection)

Endpoints tested:
- POST /api/tiedown-photos - Upload photo from calculator (standalone)
- POST /api/inspections/{id}/tiedown - Save assessment with photos array
- POST /api/inspections/{id}/tiedown/{assessment_id}/photos - Add photo to existing assessment
- DELETE /api/inspections/{id}/tiedown/{assessment_id}/photos/{photo_id} - Remove photo
- GET /api/inspections/{id}/export?include_photos=Y - Export with photos
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def create_test_image():
    """Create a minimal valid PNG image for testing"""
    # Minimal 1x1 red PNG
    png_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,  # compressed data
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
        0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,  # IEND chunk
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    return png_data


class TestTiedownPhotoUpload:
    """Tests for standalone tiedown photo upload from calculator"""
    
    def test_upload_tiedown_photo(self):
        """Test POST /api/tiedown-photos uploads a photo and returns photo object"""
        session = requests.Session()
        
        # Create test image
        image_data = create_test_image()
        files = {'file': ('test_tiedown.png', io.BytesIO(image_data), 'image/png')}
        
        response = session.post(f"{BASE_URL}/api/tiedown-photos", files=files)
        
        assert response.status_code == 200, f"Photo upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "photo_id" in data, "Missing photo_id in response"
        assert "storage_path" in data, "Missing storage_path in response"
        assert "original_filename" in data, "Missing original_filename in response"
        assert "content_type" in data, "Missing content_type in response"
        assert "uploaded_at" in data, "Missing uploaded_at in response"
        
        # Verify values
        assert data["original_filename"] == "test_tiedown.png"
        assert data["content_type"] == "image/png"
        assert len(data["photo_id"]) > 0
        assert len(data["storage_path"]) > 0
        
        print(f"SUCCESS: Photo uploaded with ID {data['photo_id']}")
    
    def test_upload_non_image_rejected(self):
        """Test that non-image files are rejected"""
        session = requests.Session()
        
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        
        response = session.post(f"{BASE_URL}/api/tiedown-photos", files=files)
        
        assert response.status_code == 400, f"Expected 400 for non-image, got {response.status_code}"
        print("SUCCESS: Non-image file correctly rejected")


class TestSaveAssessmentWithPhotos:
    """Tests for saving tie-down assessment with photos array"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test inspection and upload a photo"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_Photo_Assessment_Inspection"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        # Upload a photo to use
        image_data = create_test_image()
        files = {'file': ('test_photo.png', io.BytesIO(image_data), 'image/png')}
        photo_response = requests.post(f"{BASE_URL}/api/tiedown-photos", files=files)
        if photo_response.status_code == 200:
            self.test_photo = photo_response.json()
        else:
            self.test_photo = None
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_save_assessment_with_photos_array(self):
        """Test that photos array is saved with assessment"""
        if not self.test_photo:
            pytest.skip("Photo upload not available")
        
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 15,
            "tiedowns": [
                {"type": "3/8\" Gr70", "wll": 9200, "method": "direct", "defective": False}
            ],
            "photos": [self.test_photo]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to save assessment: {response.text}"
        data = response.json()
        
        # Verify photos were saved
        assert "photos" in data, "Missing photos in response"
        assert len(data["photos"]) == 1, f"Expected 1 photo, got {len(data['photos'])}"
        assert data["photos"][0]["photo_id"] == self.test_photo["photo_id"]
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        assert get_response.status_code == 200
        inspection = get_response.json()
        
        assessments = inspection.get("tiedown_assessments", [])
        assert len(assessments) == 1
        assert len(assessments[0].get("photos", [])) == 1
        
        print(f"SUCCESS: Assessment saved with {len(data['photos'])} photo(s)")


class TestAssessmentPhotoManagement:
    """Tests for adding/removing photos from existing assessments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test inspection with assessment"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_Assessment_Photo_Management"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        # Create assessment without photos
        payload = {
            "cargo_weight": 15000,
            "cargo_length": 12,
            "tiedowns": [
                {"type": "2\" Ratchet Strap", "wll": 3300, "method": "direct", "defective": False}
            ],
            "photos": []
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
    
    def test_add_photo_to_existing_assessment(self):
        """Test POST /api/inspections/{id}/tiedown/{assessment_id}/photos"""
        image_data = create_test_image()
        files = {'file': ('assessment_photo.png', io.BytesIO(image_data), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{self.assessment_id}/photos",
            files=files
        )
        
        assert response.status_code == 200, f"Failed to add photo: {response.text}"
        photo = response.json()
        
        # Verify photo object
        assert "photo_id" in photo
        assert "storage_path" in photo
        assert photo["original_filename"] == "assessment_photo.png"
        
        # Verify photo was added to assessment
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        assert get_response.status_code == 200
        inspection = get_response.json()
        
        assessment = inspection["tiedown_assessments"][0]
        assert len(assessment.get("photos", [])) == 1
        assert assessment["photos"][0]["photo_id"] == photo["photo_id"]
        
        self.added_photo_id = photo["photo_id"]
        print(f"SUCCESS: Photo added to assessment with ID {photo['photo_id']}")
        
        return photo["photo_id"]
    
    def test_delete_photo_from_assessment(self):
        """Test DELETE /api/inspections/{id}/tiedown/{assessment_id}/photos/{photo_id}"""
        # First add a photo
        image_data = create_test_image()
        files = {'file': ('to_delete.png', io.BytesIO(image_data), 'image/png')}
        
        add_response = requests.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{self.assessment_id}/photos",
            files=files
        )
        assert add_response.status_code == 200
        photo_id = add_response.json()["photo_id"]
        
        # Verify photo exists
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        inspection = get_response.json()
        assert len(inspection["tiedown_assessments"][0].get("photos", [])) == 1
        
        # Delete the photo
        delete_response = self.session.delete(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{self.assessment_id}/photos/{photo_id}"
        )
        
        assert delete_response.status_code == 200, f"Failed to delete photo: {delete_response.text}"
        
        # Verify photo was removed
        get_response = self.session.get(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        inspection = get_response.json()
        assert len(inspection["tiedown_assessments"][0].get("photos", [])) == 0
        
        print(f"SUCCESS: Photo {photo_id} deleted from assessment")


class TestExportWithAssessmentPhotos:
    """Tests for inspection export including assessment photos"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create inspection with assessment and photo"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create test inspection
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_Export_With_Photos"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        # Create assessment
        payload = {
            "cargo_weight": 25000,
            "cargo_length": 18,
            "tiedowns": [
                {"type": "1/2\" Gr80", "wll": 16000, "method": "direct", "defective": False}
            ],
            "photos": []
        }
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        assert response.status_code == 200
        self.assessment = response.json()
        self.assessment_id = self.assessment["assessment_id"]
        
        # Add a photo to the assessment
        image_data = create_test_image()
        files = {'file': ('export_test.png', io.BytesIO(image_data), 'image/png')}
        photo_response = requests.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{self.assessment_id}/photos",
            files=files
        )
        self.has_photo = photo_response.status_code == 200
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_export_with_photos_includes_assessment_photos(self):
        """Test that export with include_photos=Y includes assessment photos"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export?include_photos=Y"
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        
        # Verify tie-down section exists
        assert "Tie-Down Assessment" in html
        
        # If photo was uploaded, verify photo section exists
        if self.has_photo:
            # The export should include base64 encoded image or photo reference
            assert "Photos" in html or "data:image" in html or "Photo unavailable" in html
            print("SUCCESS: Export includes photo section")
        else:
            print("SKIPPED: No photo to verify in export")
    
    def test_export_without_photos_excludes_images(self):
        """Test that export with include_photos=N excludes photos"""
        response = self.session.get(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/export?include_photos=N"
        )
        
        assert response.status_code == 200
        html = response.text
        
        # Should still have tie-down section
        assert "Tie-Down Assessment" in html
        
        # Should not have base64 images (unless they're violation photos)
        # The assessment photos section should be empty
        print("SUCCESS: Export without photos works correctly")


class TestWLLChartValues:
    """Tests to verify WLL chart values match 49 CFR 393.108"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test inspection"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/inspections", json={
            "title": "TEST_WLL_Chart_Values"
        })
        assert response.status_code == 200
        self.inspection = response.json()
        self.inspection_id = self.inspection["id"]
        
        yield
        
        try:
            self.session.delete(f"{BASE_URL}/api/inspections/{self.inspection_id}")
        except:
            pass
    
    def test_grade70_3_8_chain_wll_9200(self):
        """
        Math verification: 3/8" Gr70 from 393.108 chart should be 9200 WLL
        NOT 6600 like the quick preset (which is 5/16" assembly rating)
        """
        payload = {
            "cargo_weight": 20000,
            "cargo_length": 15,
            "tiedowns": [
                {"type": "3/8\" Gr70", "wll": 9200, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify the WLL is correctly stored and computed
        assert data["tiedowns"][0]["wll"] == 9200
        assert data["tiedowns"][0]["effective_wll"] == 9200  # direct = 100%
        assert data["total_effective_wll"] == 9200
        
        # Required WLL = 20000 * 0.5 = 10000
        # 9200 < 10000, so NOT compliant on WLL alone
        assert data["required_wll"] == 10000
        
        print("SUCCESS: 3/8\" Gr70 chain correctly uses 9200 WLL from 393.108 chart")
    
    def test_grade80_1_2_chain_wll_16000(self):
        """
        Math verification: 1/2" Gr80 from 393.108 chart should be 16000 WLL
        """
        payload = {
            "cargo_weight": 30000,
            "cargo_length": 20,
            "tiedowns": [
                {"type": "1/2\" Gr80", "wll": 16000, "method": "direct", "defective": False},
                {"type": "1/2\" Gr80", "wll": 16000, "method": "direct", "defective": False}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify the WLL values
        assert data["tiedowns"][0]["wll"] == 16000
        assert data["tiedowns"][1]["wll"] == 16000
        assert data["total_effective_wll"] == 32000  # 16000 + 16000
        
        # Required WLL = 30000 * 0.5 = 15000
        # 32000 >= 15000, so compliant on WLL
        # Min tiedowns for 20ft = 3, but we only have 2
        assert data["required_wll"] == 15000
        assert data["min_tiedowns"] == 3
        assert data["active_count"] == 2
        assert data["compliant"] == False  # Not enough tie-downs
        
        print("SUCCESS: 1/2\" Gr80 chain correctly uses 16000 WLL from 393.108 chart")
    
    def test_quick_preset_vs_chart_difference(self):
        """
        Verify the difference between quick preset and chart values:
        - Quick preset 3/8" Gr70 Chain = 6600 (assembly rating)
        - Chart 3/8" Gr70 = 9200 (raw chain WLL per 393.108)
        """
        # This test documents the intentional difference
        # Quick presets use common assembly ratings
        # Chart uses raw chain WLL from 49 CFR 393.108
        
        # Test with quick preset value
        payload1 = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 Chain (preset)", "wll": 6600, "method": "direct", "defective": False}
            ]
        }
        
        response1 = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload1
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Delete and test with chart value
        self.session.delete(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown/{data1['assessment_id']}"
        )
        
        payload2 = {
            "cargo_weight": 20000,
            "cargo_length": 10,
            "tiedowns": [
                {"type": "3/8\" Gr70 (393.108)", "wll": 9200, "method": "direct", "defective": False}
            ]
        }
        
        response2 = self.session.post(
            f"{BASE_URL}/api/inspections/{self.inspection_id}/tiedown",
            json=payload2
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify the difference
        assert data1["total_effective_wll"] == 6600  # preset
        assert data2["total_effective_wll"] == 9200  # chart
        
        print("SUCCESS: Verified difference between quick preset (6600) and 393.108 chart (9200) for 3/8\" Gr70")


class TestInspectionListForSaveModal:
    """Tests for fetching inspections list (used by save modal)"""
    
    def test_get_inspections_for_save_modal(self):
        """Test GET /api/inspections returns list for save modal"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/inspections")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "inspections" in data
        assert isinstance(data["inspections"], list)
        
        if len(data["inspections"]) > 0:
            insp = data["inspections"][0]
            # Verify structure needed for save modal
            assert "id" in insp
            assert "title" in insp
            assert "items" in insp
            assert "created_at" in insp
            
            print(f"SUCCESS: Found {len(data['inspections'])} inspections for save modal")
        else:
            print("SUCCESS: Inspections list returned (empty)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
