"""
Test Quick Connect Host Addresses Feature
Tests the /api/remote-sessions/host-addresses endpoints for storing AnyDesk addresses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


class TestHostAddressesAPI:
    """Tests for the Quick Connect host-addresses endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "admin_code": ADMIN_CODE}
        )
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.auth_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
    
    def test_get_host_addresses_requires_auth(self):
        """GET /api/remote-sessions/host-addresses should require authentication"""
        response = requests.get(f"{BASE_URL}/api/remote-sessions/host-addresses")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: GET host-addresses requires auth")
    
    def test_post_host_addresses_requires_auth(self):
        """POST /api/remote-sessions/host-addresses should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            json=[{"label": "Test", "anydesk_address": "123456789"}]
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: POST host-addresses requires auth")
    
    def test_get_host_addresses_initially_empty(self):
        """GET /api/remote-sessions/host-addresses should return empty addresses initially"""
        # First clear any existing addresses
        clear_response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[]
        )
        assert clear_response.status_code == 200, f"Failed to clear addresses: {clear_response.text}"
        
        # Now get addresses - should be empty
        response = self.session.get(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "addresses" in data, "Response should contain 'addresses' key"
        assert isinstance(data["addresses"], list), "addresses should be a list"
        assert len(data["addresses"]) == 0, f"Expected empty list, got {data['addresses']}"
        print("PASS: GET host-addresses returns empty list initially")
    
    def test_post_host_address_saves_and_returns(self):
        """POST /api/remote-sessions/host-addresses should save and return the address"""
        test_entry = {
            "label": "Work Computer",
            "anydesk_address": "123 456 789"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[test_entry]
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should have success=True"
        assert "addresses" in data, "Response should contain 'addresses' key"
        assert len(data["addresses"]) == 1, f"Expected 1 address, got {len(data['addresses'])}"
        
        saved = data["addresses"][0]
        assert saved["label"] == "Work Computer", f"Label mismatch: {saved['label']}"
        # Address should be stripped of spaces
        assert saved["anydesk_address"] == "123 456 789", f"Address mismatch: {saved['anydesk_address']}"
        print("PASS: POST host-addresses saves and returns address")
    
    def test_get_host_addresses_returns_saved(self):
        """GET /api/remote-sessions/host-addresses should return previously saved address"""
        # First save an address
        test_entry = {
            "label": "Test Machine",
            "anydesk_address": "987654321"
        }
        save_response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[test_entry]
        )
        assert save_response.status_code == 200, f"Failed to save: {save_response.text}"
        
        # Now get it back
        response = self.session.get(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert len(data["addresses"]) == 1, f"Expected 1 address, got {len(data['addresses'])}"
        assert data["addresses"][0]["label"] == "Test Machine"
        assert data["addresses"][0]["anydesk_address"] == "987654321"
        print("PASS: GET host-addresses returns saved address")
    
    def test_post_empty_array_clears_addresses(self):
        """POST /api/remote-sessions/host-addresses with empty array should clear all addresses"""
        # First save an address
        save_response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[{"label": "To Delete", "anydesk_address": "111222333"}]
        )
        assert save_response.status_code == 200
        
        # Verify it was saved
        get_response = self.session.get(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers
        )
        assert len(get_response.json()["addresses"]) == 1
        
        # Now clear with empty array
        clear_response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[]
        )
        assert clear_response.status_code == 200, f"Expected 200, got {clear_response.status_code}"
        data = clear_response.json()
        assert data.get("success") == True
        assert len(data["addresses"]) == 0, f"Expected empty list, got {data['addresses']}"
        
        # Verify it's cleared
        verify_response = self.session.get(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers
        )
        assert len(verify_response.json()["addresses"]) == 0
        print("PASS: POST with empty array clears addresses")
    
    def test_post_strips_whitespace(self):
        """POST should strip whitespace from label and address"""
        test_entry = {
            "label": "  Spaced Label  ",
            "anydesk_address": "  555 666 777  "
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=[test_entry]
        )
        assert response.status_code == 200
        data = response.json()
        
        saved = data["addresses"][0]
        assert saved["label"] == "Spaced Label", f"Label not stripped: '{saved['label']}'"
        assert saved["anydesk_address"] == "555 666 777", f"Address not stripped: '{saved['anydesk_address']}'"
        print("PASS: POST strips whitespace from label and address")
    
    def test_post_filters_empty_addresses(self):
        """POST should filter out entries with empty anydesk_address"""
        entries = [
            {"label": "Valid", "anydesk_address": "123456"},
            {"label": "Empty", "anydesk_address": ""},
            {"label": "Whitespace", "anydesk_address": "   "}
        ]
        
        response = self.session.post(
            f"{BASE_URL}/api/remote-sessions/host-addresses",
            headers=self.auth_headers,
            json=entries
        )
        assert response.status_code == 200
        data = response.json()
        
        # Only the valid entry should be saved
        assert len(data["addresses"]) == 1, f"Expected 1 address, got {len(data['addresses'])}"
        assert data["addresses"][0]["label"] == "Valid"
        print("PASS: POST filters out empty addresses")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
