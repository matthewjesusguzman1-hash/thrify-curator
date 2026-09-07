"""
GPS Mileage Tracker API Tests
Tests for: log-drive (start/end), trip update, classify, categories, export-csv
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"

# Houston TX coordinates for testing
START_LAT = 29.7604
START_LNG = -95.3698
END_LAT = 29.7874
END_LNG = -95.4085


class TestGPSMileageTracker:
    """GPS Mileage Tracker API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.status_code} - {login_resp.text}")
        
        data = login_resp.json()
        token = data.get("access_token")
        if not token:
            pytest.skip("No access_token in login response")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_trip_ids = []
        self.created_category_ids = []
        yield
        
        # Cleanup: delete test trips and categories
        for trip_id in self.created_trip_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}")
            except Exception:
                pass
        for cat_id in self.created_category_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/gps-trips/categories/{cat_id}")
            except Exception:
                pass

    # ========== LOG-DRIVE ENDPOINT TESTS ==========
    
    def test_log_drive_start_returns_trip_id_and_address(self):
        """POST /api/admin/gps-trips/log-drive with event=start returns trip_id and start_address"""
        response = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("event") == "trip_started", f"Expected event=trip_started, got {data.get('event')}"
        assert "trip_id" in data, f"Missing trip_id in response: {data}"
        assert "start_address" in data, f"Missing start_address in response: {data}"
        assert isinstance(data["trip_id"], str), "trip_id should be a string"
        assert len(data["trip_id"]) > 0, "trip_id should not be empty"
        
        # Store for cleanup and end test
        self.created_trip_ids.append(data["trip_id"])
        print(f"✓ Trip started: {data['trip_id']}, address: {data['start_address']}")
    
    def test_log_drive_end_completes_trip_with_distance(self):
        """POST /api/admin/gps-trips/log-drive with event=end completes trip with road distance and end_address"""
        # First start a trip
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        
        assert start_resp.status_code == 200, f"Start failed: {start_resp.text}"
        start_data = start_resp.json()
        trip_id = start_data.get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        # Small delay to simulate trip
        time.sleep(1)
        
        # End the trip at different location
        end_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        assert end_resp.status_code == 200, f"End failed: {end_resp.text}"
        data = end_resp.json()
        
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("event") == "trip_completed", f"Expected event=trip_completed, got {data.get('event')}"
        assert data.get("trip_id") == trip_id, f"Trip ID mismatch"
        assert "end_address" in data, f"Missing end_address in response: {data}"
        assert "total_miles" in data, f"Missing total_miles in response: {data}"
        assert "tax_deduction" in data, f"Missing tax_deduction in response: {data}"
        assert isinstance(data["total_miles"], (int, float)), "total_miles should be numeric"
        assert data["total_miles"] > 0, f"total_miles should be > 0, got {data['total_miles']}"
        
        print(f"✓ Trip completed: {data['total_miles']} miles, deduction: ${data['tax_deduction']}")
    
    def test_log_drive_start_when_trip_active_returns_error(self):
        """Starting a new trip when one is already active should return error"""
        # Start first trip
        start1 = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        assert start1.status_code == 200
        trip_id = start1.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        # Try to start another trip
        start2 = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        
        assert start2.status_code == 200  # Returns 200 but with success=False
        data = start2.json()
        assert data.get("success") == False, f"Expected success=False when trip already active"
        assert "pending_trip_id" in data or "already in progress" in data.get("message", "").lower()
        
        # End the trip for cleanup
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        print("✓ Correctly rejected starting trip when one is active")
    
    def test_log_drive_end_without_active_trip_returns_error(self):
        """Ending a trip when none is active should return error"""
        response = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        assert response.status_code == 200  # Returns 200 but with success=False
        data = response.json()
        assert data.get("success") == False, f"Expected success=False when no active trip"
        print("✓ Correctly rejected ending trip when none active")

    # ========== TRIP UPDATE ENDPOINT TESTS ==========
    
    def test_update_trip_all_fields(self):
        """PUT /api/admin/gps-trips/{id} accepts start_address, end_address, classification, notes, purpose, miles"""
        # Create a trip first
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        # End the trip
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Update all fields
        update_resp = self.session.put(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", json={
            "start_address": "123 Test Start St, Houston, TX",
            "end_address": "456 Test End Ave, Houston, TX",
            "classification": "personal",
            "notes": "Test trip notes",
            "purpose": "sourcing",
            "total_miles": 15.5
        })
        
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        data = update_resp.json()
        assert data.get("success") == True
        
        # Verify fields were updated
        updated_fields = data.get("updated_fields", [])
        assert "start_address" in updated_fields, "start_address not updated"
        assert "end_address" in updated_fields, "end_address not updated"
        assert "classification" in updated_fields, "classification not updated"
        assert "notes" in updated_fields, "notes not updated"
        assert "purpose" in updated_fields, "purpose not updated"
        assert "total_miles" in updated_fields, "total_miles not updated"
        
        print(f"✓ Trip updated with fields: {updated_fields}")
    
    def test_update_trip_partial_fields(self):
        """PUT /api/admin/gps-trips/{id} works with partial updates"""
        # Create and complete a trip
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Update only notes
        update_resp = self.session.put(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", json={
            "notes": "Only updating notes"
        })
        
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data.get("success") == True
        assert "notes" in data.get("updated_fields", [])
        print("✓ Partial update (notes only) successful")

    # ========== CLASSIFY ENDPOINT TESTS ==========
    
    def test_classify_trip_business(self):
        """PUT /api/admin/gps-trips/{id}/classify toggles to business with deduction"""
        # Create and complete a trip
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Classify as business
        classify_resp = self.session.put(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}/classify?classification=business"
        )
        
        assert classify_resp.status_code == 200, f"Classify failed: {classify_resp.text}"
        data = classify_resp.json()
        assert data.get("success") == True
        assert data.get("classification") == "business"
        assert "tax_deduction" in data
        assert data["tax_deduction"] > 0, "Business trips should have tax deduction > 0"
        
        print(f"✓ Trip classified as business, deduction: ${data['tax_deduction']}")
    
    def test_classify_trip_personal(self):
        """PUT /api/admin/gps-trips/{id}/classify toggles to personal with 0 deduction"""
        # Create and complete a trip
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Classify as personal
        classify_resp = self.session.put(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}/classify?classification=personal"
        )
        
        assert classify_resp.status_code == 200, f"Classify failed: {classify_resp.text}"
        data = classify_resp.json()
        assert data.get("success") == True
        assert data.get("classification") == "personal"
        assert data.get("tax_deduction") == 0, f"Personal trips should have 0 deduction, got {data.get('tax_deduction')}"
        
        print("✓ Trip classified as personal, deduction: $0")

    # ========== CATEGORIES ENDPOINT TESTS ==========
    
    def test_get_categories_returns_defaults(self):
        """GET /api/admin/gps-trips/categories returns default categories (seeded on first call)"""
        response = self.session.get(f"{BASE_URL}/api/admin/gps-trips/categories")
        
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        data = response.json()
        
        assert "categories" in data, f"Missing categories in response: {data}"
        categories = data["categories"]
        assert isinstance(categories, list), "categories should be a list"
        assert len(categories) > 0, "Should have at least default categories"
        
        # Check for expected default categories
        category_names = [c.get("name") for c in categories]
        expected_defaults = ["Resale Sourcing", "Shipping / Post Office", "Pickup / Delivery", "Client Meeting"]
        
        for expected in expected_defaults:
            assert expected in category_names, f"Missing default category: {expected}"
        
        print(f"✓ Got {len(categories)} categories including defaults")
    
    def test_create_custom_category(self):
        """POST /api/admin/gps-trips/categories creates custom category"""
        response = self.session.post(f"{BASE_URL}/api/admin/gps-trips/categories", json={
            "name": "TEST_Custom Category"
        })
        
        assert response.status_code == 200, f"Create category failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "category" in data
        category = data["category"]
        assert category.get("name") == "TEST_Custom Category"
        assert "id" in category
        assert category.get("is_default") == False
        
        self.created_category_ids.append(category["id"])
        print(f"✓ Created custom category: {category['id']}")

    # ========== EXPORT CSV ENDPOINT TESTS ==========
    
    def test_export_csv_returns_irs_format(self):
        """GET /api/admin/gps-trips/export-csv returns IRS-format CSV"""
        response = self.session.get(f"{BASE_URL}/api/admin/gps-trips/export-csv")
        
        assert response.status_code == 200, f"Export CSV failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got {content_disp}"
        assert "mileage_log" in content_disp, f"Expected mileage_log in filename, got {content_disp}"
        
        # Check CSV headers
        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) >= 1, "CSV should have at least header row"
        
        header = lines[0]
        expected_columns = ["Date", "Start Address", "End Address", "Miles", "Purpose", "Classification", "Tax Deduction", "Notes"]
        for col in expected_columns:
            assert col in header, f"Missing column '{col}' in CSV header: {header}"
        
        print(f"✓ CSV export has correct IRS format with {len(lines)} rows")
    
    def test_export_csv_with_year_filter(self):
        """GET /api/admin/gps-trips/export-csv?year=2026 filters by year"""
        response = self.session.get(f"{BASE_URL}/api/admin/gps-trips/export-csv?year=2026")
        
        assert response.status_code == 200, f"Export CSV with year failed: {response.text}"
        
        content_disp = response.headers.get("Content-Disposition", "")
        assert "2026" in content_disp, f"Expected 2026 in filename, got {content_disp}"
        
        print("✓ CSV export with year filter works")


class TestGPSMileageTrackerEdgeCases:
    """Edge case tests for GPS Mileage Tracker"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.status_code}")
        
        token = login_resp.json().get("access_token")
        if not token:
            pytest.skip("No access_token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_trip_ids = []
        yield
        
        for trip_id in self.created_trip_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/gps-trips/{trip_id}")
            except Exception:
                pass
    
    def test_update_nonexistent_trip_returns_404(self):
        """PUT /api/admin/gps-trips/{id} returns 404 for nonexistent trip"""
        response = self.session.put(f"{BASE_URL}/api/admin/gps-trips/nonexistent-id-12345", json={
            "notes": "test"
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for nonexistent trip")
    
    def test_classify_invalid_classification_returns_error(self):
        """PUT /api/admin/gps-trips/{id}/classify with invalid classification returns error"""
        # Create a trip first
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Try invalid classification
        response = self.session.put(
            f"{BASE_URL}/api/admin/gps-trips/{trip_id}/classify?classification=invalid"
        )
        
        assert response.status_code == 422, f"Expected 422 for invalid classification, got {response.status_code}"
        print("✓ Correctly rejects invalid classification")
    
    def test_update_trip_invalid_miles_returns_error(self):
        """PUT /api/admin/gps-trips/{id} with invalid miles returns error"""
        # Create a trip
        start_resp = self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": START_LAT,
            "longitude": START_LNG,
            "event": "start"
        })
        trip_id = start_resp.json().get("trip_id")
        self.created_trip_ids.append(trip_id)
        
        self.session.post(f"{BASE_URL}/api/admin/gps-trips/log-drive", json={
            "latitude": END_LAT,
            "longitude": END_LNG,
            "event": "end"
        })
        
        # Try negative miles
        response = self.session.put(f"{BASE_URL}/api/admin/gps-trips/{trip_id}", json={
            "total_miles": -5
        })
        
        assert response.status_code == 400, f"Expected 400 for negative miles, got {response.status_code}"
        print("✓ Correctly rejects negative miles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
