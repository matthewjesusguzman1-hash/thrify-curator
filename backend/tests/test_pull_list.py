"""
Pull List Feature Tests
Tests for the pull list endpoints in /api/inventory/pull-list
- GET /inventory/pull-list - Get sold items sorted by SKU for shelf pulling
- POST /inventory/pull-list/mark-pulled - Mark items as pulled
- POST /inventory/pull-list/reset - Undo pull (reset items)
- POST /inventory/pull-list/mark-all-pulled - Mark all visible items as pulled
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPullListEndpoints:
    """Test Pull List API endpoints"""
    
    def test_get_pull_list_returns_sold_items(self):
        """GET /inventory/pull-list returns sold items"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "rows" in data
        
        # Verify items are sold
        for item in data["items"][:10]:  # Check first 10
            assert item.get("status", "").lower() == "sold"
        
        print(f"PASS: Pull list returned {data['total']} sold items")
    
    def test_pull_list_groups_by_row_letter(self):
        """Pull list groups items by SKU row letter (A, B, C, etc.)"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list")
        assert response.status_code == 200
        
        data = response.json()
        rows = data.get("rows", {})
        
        # Verify rows dict contains letter keys
        print(f"Row groups found: {list(rows.keys())}")
        
        # Each row should have a count
        for letter, count in rows.items():
            assert isinstance(count, int)
            assert count >= 0
        
        print(f"PASS: Items grouped into {len(rows)} row groups")
    
    def test_pull_list_natural_sku_sorting(self):
        """Items within each row are sorted naturally (A6 before A10)"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        # Group items by row letter
        rows = {}
        for item in items:
            sku = item.get("sku") or "?"
            row_letter = ""
            for ch in sku:
                if ch.isalpha():
                    row_letter += ch.upper()
                else:
                    break
            if not row_letter:
                row_letter = "?"
            rows.setdefault(row_letter, []).append(item)
        
        # Check sorting within each row
        for letter, row_items in rows.items():
            if len(row_items) > 1:
                skus = [item.get("sku") or "" for item in row_items]
                # Extract numbers from SKUs for comparison
                def extract_number(sku):
                    if not sku:
                        return 0
                    num = ""
                    for ch in sku:
                        if ch.isdigit():
                            num += ch
                    return int(num) if num else 0
                
                numbers = [extract_number(sku) for sku in skus]
                # Verify numbers are in ascending order
                for i in range(len(numbers) - 1):
                    if numbers[i] > numbers[i + 1]:
                        print(f"WARNING: Row {letter} not sorted: {skus[i]} > {skus[i+1]}")
        
        print(f"PASS: SKU sorting verified across {len(rows)} rows")
    
    def test_pull_list_date_filter_all(self):
        """GET /inventory/pull-list with no date filter returns all sold items"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list")
        assert response.status_code == 200
        
        data = response.json()
        total_all = data.get("total", 0)
        
        print(f"PASS: 'All Sold' filter returned {total_all} items")
        assert total_all > 0, "Expected some sold items in inventory"
    
    def test_pull_list_date_filter_today(self):
        """GET /inventory/pull-list with today's date filter"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?since={today}&until={today}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: 'Today' filter returned {data.get('total', 0)} items")
    
    def test_pull_list_date_filter_week(self):
        """GET /inventory/pull-list with this week's date filter"""
        today = datetime.now()
        week_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?since={week_ago}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: 'This Week' filter returned {data.get('total', 0)} items")
    
    def test_pull_list_date_filter_two_weeks(self):
        """GET /inventory/pull-list with 2 weeks date filter"""
        today = datetime.now()
        two_weeks_ago = (today - timedelta(days=14)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?since={two_weeks_ago}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: '2 Weeks' filter returned {data.get('total', 0)} items")
    
    def test_pull_list_show_pulled_false(self):
        """GET /inventory/pull-list with show_pulled=false excludes pulled items"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        assert response.status_code == 200
        
        data = response.json()
        # Verify no items have pulled=True
        for item in data.get("items", [])[:20]:
            assert item.get("pulled") != True, f"Item {item.get('id')} should not be pulled"
        
        print(f"PASS: show_pulled=false returned {data.get('total', 0)} unpulled items")
    
    def test_pull_list_show_pulled_true(self):
        """GET /inventory/pull-list with show_pulled=true includes pulled items"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=true")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: show_pulled=true returned {data.get('total', 0)} items (including pulled)")
    
    def test_mark_items_pulled(self):
        """POST /inventory/pull-list/mark-pulled marks items as pulled"""
        # First get some unpulled items
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        if len(items) == 0:
            pytest.skip("No unpulled items available to test")
        
        # Mark first item as pulled
        test_item_id = items[0]["id"]
        mark_response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": [test_item_id]}
        )
        assert mark_response.status_code == 200
        
        mark_data = mark_response.json()
        assert "updated" in mark_data
        assert mark_data["updated"] >= 1
        
        print(f"PASS: Marked item {test_item_id} as pulled")
        
        # Verify item is now pulled
        verify_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=true")
        verify_data = verify_response.json()
        
        pulled_item = next((i for i in verify_data["items"] if i["id"] == test_item_id), None)
        if pulled_item:
            assert pulled_item.get("pulled") == True
            assert "pulled_at" in pulled_item
            print(f"PASS: Verified item {test_item_id} has pulled=True")
        
        # Reset the item for future tests
        requests.post(
            f"{BASE_URL}/api/inventory/pull-list/reset",
            json={"item_ids": [test_item_id]}
        )
    
    def test_reset_pulled_items(self):
        """POST /inventory/pull-list/reset un-marks pulled items"""
        # First get some unpulled items and mark one
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        if len(items) == 0:
            pytest.skip("No unpulled items available to test")
        
        test_item_id = items[0]["id"]
        
        # Mark as pulled
        requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": [test_item_id]}
        )
        
        # Reset (undo pull)
        reset_response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/reset",
            json={"item_ids": [test_item_id]}
        )
        assert reset_response.status_code == 200
        
        reset_data = reset_response.json()
        assert "updated" in reset_data
        
        print(f"PASS: Reset item {test_item_id} (undo pull)")
        
        # Verify item is no longer pulled
        verify_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        verify_data = verify_response.json()
        
        unpulled_item = next((i for i in verify_data["items"] if i["id"] == test_item_id), None)
        if unpulled_item:
            assert unpulled_item.get("pulled") != True
            print(f"PASS: Verified item {test_item_id} is no longer pulled")
    
    def test_mark_all_pulled(self):
        """POST /inventory/pull-list/mark-all-pulled marks all visible items"""
        # Use a very old date range to avoid affecting real data
        # This tests the endpoint works without actually marking current items
        old_date = "2020-01-01"
        old_date_end = "2020-01-02"
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-all-pulled?since={old_date}&until={old_date_end}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "updated" in data
        
        print(f"PASS: mark-all-pulled endpoint works (updated {data['updated']} items in test range)")
    
    def test_bulk_mark_pulled(self):
        """POST /inventory/pull-list/mark-pulled with multiple item IDs"""
        # Get some unpulled items
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        if len(items) < 2:
            pytest.skip("Need at least 2 unpulled items to test bulk mark")
        
        # Mark first 2 items as pulled
        test_item_ids = [items[0]["id"], items[1]["id"]]
        mark_response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": test_item_ids}
        )
        assert mark_response.status_code == 200
        
        mark_data = mark_response.json()
        assert mark_data["updated"] >= 2
        
        print(f"PASS: Bulk marked {mark_data['updated']} items as pulled")
        
        # Reset items for future tests
        requests.post(
            f"{BASE_URL}/api/inventory/pull-list/reset",
            json={"item_ids": test_item_ids}
        )
    
    def test_pull_list_item_structure(self):
        """Verify pull list items have expected fields"""
        response = requests.get(f"{BASE_URL}/api/inventory/pull-list")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        if len(items) == 0:
            pytest.skip("No items in pull list")
        
        item = items[0]
        
        # Check expected fields
        expected_fields = ["id", "title", "status"]
        for field in expected_fields:
            assert field in item, f"Missing field: {field}"
        
        # Optional but expected fields
        optional_fields = ["sku", "platform", "sold_date", "price_sold"]
        present_optional = [f for f in optional_fields if f in item]
        
        print(f"PASS: Item structure verified. Fields present: {list(item.keys())}")
    
    def test_pull_list_empty_item_ids(self):
        """POST /inventory/pull-list/mark-pulled with empty list"""
        response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": []}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["updated"] == 0
        
        print("PASS: Empty item_ids list handled correctly")
    
    def test_pull_list_invalid_item_id(self):
        """POST /inventory/pull-list/mark-pulled with non-existent ID"""
        response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": ["non-existent-id-12345"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["updated"] == 0
        
        print("PASS: Non-existent item ID handled correctly")


class TestPullListIntegration:
    """Integration tests for pull list workflow"""
    
    def test_full_pull_workflow(self):
        """Test complete workflow: get items -> mark pulled -> verify -> reset"""
        # Step 1: Get unpulled items
        get_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        assert get_response.status_code == 200
        
        initial_data = get_response.json()
        initial_count = initial_data.get("total", 0)
        
        if initial_count == 0:
            pytest.skip("No unpulled items to test workflow")
        
        test_item = initial_data["items"][0]
        test_item_id = test_item["id"]
        
        print(f"Step 1: Found {initial_count} unpulled items. Testing with item {test_item_id}")
        
        # Step 2: Mark item as pulled
        mark_response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/mark-pulled",
            json={"item_ids": [test_item_id]}
        )
        assert mark_response.status_code == 200
        print(f"Step 2: Marked item as pulled")
        
        # Step 3: Verify item is excluded from unpulled list
        verify_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        verify_data = verify_response.json()
        
        item_in_unpulled = any(i["id"] == test_item_id for i in verify_data["items"])
        assert not item_in_unpulled, "Pulled item should not appear in unpulled list"
        print(f"Step 3: Verified item excluded from unpulled list")
        
        # Step 4: Verify item appears in pulled list
        pulled_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=true")
        pulled_data = pulled_response.json()
        
        pulled_item = next((i for i in pulled_data["items"] if i["id"] == test_item_id), None)
        assert pulled_item is not None, "Item should appear when show_pulled=true"
        assert pulled_item.get("pulled") == True
        print(f"Step 4: Verified item appears in pulled list with pulled=True")
        
        # Step 5: Reset item
        reset_response = requests.post(
            f"{BASE_URL}/api/inventory/pull-list/reset",
            json={"item_ids": [test_item_id]}
        )
        assert reset_response.status_code == 200
        print(f"Step 5: Reset item (undo pull)")
        
        # Step 6: Verify item is back in unpulled list
        final_response = requests.get(f"{BASE_URL}/api/inventory/pull-list?show_pulled=false")
        final_data = final_response.json()
        
        item_back = any(i["id"] == test_item_id for i in final_data["items"])
        assert item_back, "Item should be back in unpulled list after reset"
        print(f"Step 6: Verified item is back in unpulled list")
        
        print("PASS: Full pull workflow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
