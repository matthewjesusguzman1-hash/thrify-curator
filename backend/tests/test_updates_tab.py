"""
Tests for the Updates Tab API endpoints - combines payment method changes and item additions/updates
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://resale-magic-link.preview.emergentagent.com').rstrip('/')


class TestUpdatesTabAPI:
    """Test suite for Updates Tab backend endpoints"""
    
    # ============ GET Endpoints Tests ============
    
    def test_get_item_additions_endpoint(self, auth_headers, base_url):
        """Test GET /api/admin/forms/consignment-item-additions returns list"""
        response = requests.get(
            f"{base_url}/api/admin/forms/consignment-item-additions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify each item has expected fields
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "email" in item
            assert "submitted_at" in item
    
    def test_get_payment_method_changes_endpoint(self, auth_headers, base_url):
        """Test GET /api/admin/forms/payment-method-changes returns list"""
        response = requests.get(
            f"{base_url}/api/admin/forms/payment-method-changes",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify each item has expected fields
        if len(data) > 0:
            change = data[0]
            assert "id" in change
            assert "email" in change
            assert "changed_at" in change
    
    def test_item_additions_sorted_by_date_descending(self, auth_headers, base_url):
        """Test that item additions are returned sorted by submitted_at descending"""
        response = requests.get(
            f"{base_url}/api/admin/forms/consignment-item-additions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        if len(data) > 1:
            dates = [item.get("submitted_at", "") for item in data]
            # Verify sorted descending
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i+1], "Items should be sorted by date descending"
    
    def test_payment_changes_sorted_by_date_descending(self, auth_headers, base_url):
        """Test that payment changes are returned sorted by changed_at descending"""
        response = requests.get(
            f"{base_url}/api/admin/forms/payment-method-changes",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        if len(data) > 1:
            dates = [item.get("changed_at", "") for item in data]
            # Verify sorted descending
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i+1], "Payment changes should be sorted by date descending"
    
    # ============ PDF Download Tests ============
    
    def test_download_item_addition_pdf(self, auth_headers, base_url):
        """Test downloading an item addition as PDF"""
        # First get an existing item addition
        list_response = requests.get(
            f"{base_url}/api/admin/forms/consignment-item-additions",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        items = list_response.json()
        
        if len(items) == 0:
            pytest.skip("No item additions available for PDF download test")
        
        item_id = items[0]["id"]
        
        # Download PDF
        pdf_response = requests.get(
            f"{base_url}/api/admin/forms/item-additions/{item_id}/pdf",
            headers=auth_headers
        )
        assert pdf_response.status_code == 200
        assert "application/pdf" in pdf_response.headers.get("Content-Type", "")
        assert len(pdf_response.content) > 0
    
    def test_download_pdf_invalid_id_returns_404(self, auth_headers, base_url):
        """Test that downloading PDF with invalid ID returns 404"""
        invalid_id = str(uuid.uuid4())
        response = requests.get(
            f"{base_url}/api/admin/forms/item-additions/{invalid_id}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    # ============ Delete Tests ============
    
    def test_delete_item_addition(self, auth_headers, base_url):
        """Test deleting an item addition record"""
        # First create test data - we need to submit an update first
        # Get existing agreement email
        agreements_response = requests.get(
            f"{base_url}/api/admin/forms/consignment-agreements",
            headers=auth_headers
        )
        
        if agreements_response.status_code != 200 or len(agreements_response.json()) == 0:
            pytest.skip("No consignment agreements available for testing delete")
        
        existing_email = agreements_response.json()[0]["email"]
        
        # Submit a new item addition
        test_update = {
            "email": existing_email,
            "items_to_add": 1,
            "items_description": f"TEST_DELETE_{uuid.uuid4()}",
            "acknowledged_terms": True,
            "signature": "Test Signature",
            "signature_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        create_response = requests.post(
            f"{base_url}/api/forms/add-consignment-items",
            json=test_update
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test item addition for delete test")
        
        created_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{base_url}/api/admin/forms/item-additions/{created_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify it's deleted - should return 404 when trying to download PDF
        verify_response = requests.get(
            f"{base_url}/api/admin/forms/item-additions/{created_id}/pdf",
            headers=auth_headers
        )
        assert verify_response.status_code == 404
    
    def test_delete_invalid_id_returns_404(self, auth_headers, base_url):
        """Test that deleting with invalid ID returns 404"""
        invalid_id = str(uuid.uuid4())
        response = requests.delete(
            f"{base_url}/api/admin/forms/item-additions/{invalid_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    # ============ Authorization Tests ============
    
    def test_item_additions_requires_auth(self, base_url):
        """Test that item additions endpoint requires authentication"""
        response = requests.get(f"{base_url}/api/admin/forms/consignment-item-additions")
        assert response.status_code == 403 or response.status_code == 401
    
    def test_payment_changes_requires_auth(self, base_url):
        """Test that payment changes endpoint requires authentication"""
        response = requests.get(f"{base_url}/api/admin/forms/payment-method-changes")
        assert response.status_code == 403 or response.status_code == 401
    
    def test_delete_requires_auth(self, base_url):
        """Test that delete endpoint requires authentication"""
        response = requests.delete(f"{base_url}/api/admin/forms/item-additions/some-id")
        assert response.status_code == 403 or response.status_code == 401
    
    def test_pdf_download_requires_auth(self, base_url):
        """Test that PDF download requires authentication"""
        response = requests.get(f"{base_url}/api/admin/forms/item-additions/some-id/pdf")
        assert response.status_code == 403 or response.status_code == 401
    
    # ============ Data Structure Tests ============
    
    def test_item_addition_contains_expected_fields(self, auth_headers, base_url):
        """Test that item additions have all expected fields"""
        response = requests.get(
            f"{base_url}/api/admin/forms/consignment-item-additions",
            headers=auth_headers
        )
        assert response.status_code == 200
        items = response.json()
        
        if len(items) == 0:
            pytest.skip("No item additions available")
        
        expected_fields = ["id", "email", "submitted_at"]
        item = items[0]
        for field in expected_fields:
            assert field in item, f"Missing expected field: {field}"
    
    def test_payment_change_contains_expected_fields(self, auth_headers, base_url):
        """Test that payment changes have all expected fields"""
        response = requests.get(
            f"{base_url}/api/admin/forms/payment-method-changes",
            headers=auth_headers
        )
        assert response.status_code == 200
        changes = response.json()
        
        if len(changes) == 0:
            pytest.skip("No payment changes available")
        
        expected_fields = ["id", "email", "changed_at", "old_payment_method", "new_payment_method"]
        change = changes[0]
        for field in expected_fields:
            assert field in change, f"Missing expected field: {field}"
