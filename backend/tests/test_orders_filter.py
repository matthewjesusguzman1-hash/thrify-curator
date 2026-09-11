"""
Test Order Filter Feature - Employee Orders Page Filter Chips
Tests the my-assignment endpoint returns data needed for filter functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"


class TestOrdersFilterBackend:
    """Tests for the order filter feature backend support"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get employee token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as employee
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_my_assignment_returns_items(self):
        """Test that my-assignment endpoint returns items array"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        assert assignment is not None, "No active assignment found"
        
        items = assignment.get("items", [])
        assert len(items) == 83, f"Expected 83 items, got {len(items)}"
        print(f"PASS: my-assignment returns {len(items)} items")
    
    def test_my_assignment_returns_labels(self):
        """Test that my-assignment endpoint returns labels array"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        assert assignment is not None
        
        labels = assignment.get("labels", [])
        assert len(labels) == 5, f"Expected 5 labels, got {len(labels)}"
        print(f"PASS: my-assignment returns {len(labels)} labels")
    
    def test_my_assignment_returns_matches(self):
        """Test that my-assignment endpoint returns matches array for filter"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        assert assignment is not None
        
        matches = assignment.get("matches", [])
        assert len(matches) == 5, f"Expected 5 matches, got {len(matches)}"
        print(f"PASS: my-assignment returns {len(matches)} matches")
    
    def test_matches_have_required_fields(self):
        """Test that each match has item_id, label_id, confidence, reason"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        matches = assignment.get("matches", [])
        
        for match in matches:
            assert "item_id" in match, "Match missing item_id"
            assert "label_id" in match, "Match missing label_id"
            assert "confidence" in match, "Match missing confidence"
            assert "reason" in match, "Match missing reason"
        
        print(f"PASS: All {len(matches)} matches have required fields")
    
    def test_matched_skus_are_correct(self):
        """Test that the matched SKUs are D1800, D1835, A2405, E361, C1083"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        matches = assignment.get("matches", [])
        items = assignment.get("items", [])
        
        # Build item_id -> sku map
        item_sku_map = {item["id"]: item.get("sku", "") for item in items}
        
        # Get matched SKUs
        matched_skus = set()
        for match in matches:
            item_id = match["item_id"]
            sku = item_sku_map.get(item_id, "")
            if sku:
                matched_skus.add(sku.upper())
        
        expected_skus = {"D1800", "D1835", "A2405", "E361", "C1083"}
        assert matched_skus == expected_skus, f"Expected SKUs {expected_skus}, got {matched_skus}"
        print(f"PASS: Matched SKUs are correct: {matched_skus}")
    
    def test_match_item_ids_exist_in_items(self):
        """Test that all match item_ids reference valid items"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        matches = assignment.get("matches", [])
        items = assignment.get("items", [])
        
        item_ids = {item["id"] for item in items}
        
        for match in matches:
            assert match["item_id"] in item_ids, f"Match item_id {match['item_id']} not found in items"
        
        print(f"PASS: All {len(matches)} match item_ids exist in items list")
    
    def test_match_label_ids_exist_in_labels(self):
        """Test that all match label_ids reference valid labels"""
        response = self.session.get(f"{BASE_URL}/api/orders/my-assignment")
        assert response.status_code == 200
        
        data = response.json()
        assignment = data.get("assignment")
        matches = assignment.get("matches", [])
        labels = assignment.get("labels", [])
        
        label_ids = {label["id"] for label in labels}
        
        for match in matches:
            assert match["label_id"] in label_ids, f"Match label_id {match['label_id']} not found in labels"
        
        print(f"PASS: All {len(matches)} match label_ids exist in labels list")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
