"""
Test Web Push Notification API endpoints for Employee Dashboard notification opt-in feature
Tests: VAPID key endpoint, subscribe, unsubscribe, status endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYEE_EMAIL = "testemployee@thriftycurator.com"
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


class TestWebPushEndpoints:
    """Web Push API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_employee_token(self):
        """Login as test employee and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL
        })
        if response.status_code == 200:
            data = response.json()
            # Token key is 'access_token' not 'token'
            return data.get("access_token") or data.get("token")
        return None
    
    def get_admin_token(self):
        """Login as admin and get token"""
        # First login with email
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
        })
        if response.status_code != 200:
            return None
        
        data = response.json()
        if data.get("requires_code"):
            # Submit admin code
            response = self.session.post(f"{BASE_URL}/api/auth/verify-admin-code", json={
                "email": ADMIN_EMAIL,
                "code": ADMIN_CODE
            })
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token") or data.get("token")
        else:
            return data.get("access_token") or data.get("token")
        return None
    
    # ==================== VAPID Public Key Tests ====================
    
    def test_vapid_public_key_returns_valid_key(self):
        """Test /api/web-push/vapid-public-key returns a valid publicKey"""
        response = self.session.get(f"{BASE_URL}/api/web-push/vapid-public-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain 'publicKey'"
        assert isinstance(data["publicKey"], str), "publicKey should be a string"
        assert len(data["publicKey"]) > 50, "publicKey should be a valid VAPID key (>50 chars)"
        print(f"VAPID public key: {data['publicKey'][:30]}...")
    
    def test_vapid_public_key_no_auth_required(self):
        """Test VAPID key endpoint doesn't require authentication"""
        # Use a fresh session without any auth
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/web-push/vapid-public-key")
        
        assert response.status_code == 200, "VAPID key endpoint should not require auth"
    
    # ==================== Status Endpoint Tests ====================
    
    def test_status_requires_authentication(self):
        """Test /api/web-push/status requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/web-push/status")
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_status_returns_subscription_info_for_employee(self):
        """Test /api/web-push/status returns subscription status for authenticated employee"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        response = self.session.get(
            f"{BASE_URL}/api/web-push/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscribed" in data, "Response should contain 'subscribed'"
        assert "subscription_count" in data, "Response should contain 'subscription_count'"
        assert isinstance(data["subscribed"], bool), "subscribed should be boolean"
        assert isinstance(data["subscription_count"], int), "subscription_count should be integer"
        
        print(f"Employee subscription status: subscribed={data['subscribed']}, count={data['subscription_count']}")
    
    # ==================== Subscribe Endpoint Tests ====================
    
    def test_subscribe_requires_authentication(self):
        """Test /api/web-push/subscribe requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/web-push/subscribe", json={
            "endpoint": "https://test.example.com/push/123",
            "keys": {"auth": "test_auth", "p256dh": "test_p256dh"}
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_subscribe_accepts_valid_subscription(self):
        """Test /api/web-push/subscribe accepts a valid subscription object"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        # Create a test subscription object (simulating browser PushSubscription)
        test_subscription = {
            "endpoint": f"https://test.example.com/push/test-{os.urandom(8).hex()}",
            "keys": {
                "auth": "test_auth_key_base64",
                "p256dh": "test_p256dh_key_base64_longer_string_here"
            },
            "expirationTime": None
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/web-push/subscribe",
            json=test_subscription,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "id" in data, "Response should contain subscription 'id'"
        print(f"Subscription created with id: {data['id']}")
        
        # Store endpoint for cleanup
        self._test_endpoint = test_subscription["endpoint"]
    
    def test_subscribe_validates_required_fields(self):
        """Test /api/web-push/subscribe validates required fields"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        # Missing endpoint
        response = self.session.post(
            f"{BASE_URL}/api/web-push/subscribe",
            json={"keys": {"auth": "test", "p256dh": "test"}},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 422, f"Expected 422 for missing endpoint, got {response.status_code}"
        
        # Missing keys
        response = self.session.post(
            f"{BASE_URL}/api/web-push/subscribe",
            json={"endpoint": "https://test.example.com/push/123"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 422, f"Expected 422 for missing keys, got {response.status_code}"
    
    # ==================== Unsubscribe Endpoint Tests ====================
    
    def test_unsubscribe_requires_authentication(self):
        """Test DELETE /api/web-push/subscribe requires authentication"""
        response = self.session.delete(
            f"{BASE_URL}/api/web-push/subscribe?endpoint=https://test.example.com/push/123"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_unsubscribe_removes_subscription(self):
        """Test DELETE /api/web-push/subscribe removes a subscription"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        # First create a subscription
        test_endpoint = f"https://test.example.com/push/delete-test-{os.urandom(8).hex()}"
        test_subscription = {
            "endpoint": test_endpoint,
            "keys": {"auth": "test_auth", "p256dh": "test_p256dh"}
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/web-push/subscribe",
            json=test_subscription,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_response.status_code == 201, "Failed to create test subscription"
        
        # Now delete it
        import urllib.parse
        encoded_endpoint = urllib.parse.quote(test_endpoint, safe='')
        delete_response = self.session.delete(
            f"{BASE_URL}/api/web-push/subscribe?endpoint={encoded_endpoint}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"Unsubscribe response: {data['message']}")
    
    def test_unsubscribe_returns_404_for_nonexistent(self):
        """Test DELETE /api/web-push/subscribe returns 404 for non-existent subscription"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        import urllib.parse
        fake_endpoint = "https://test.example.com/push/nonexistent-12345"
        encoded_endpoint = urllib.parse.quote(fake_endpoint, safe='')
        
        response = self.session.delete(
            f"{BASE_URL}/api/web-push/subscribe?endpoint={encoded_endpoint}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent subscription, got {response.status_code}"
    
    # ==================== Integration Tests ====================
    
    def test_full_subscribe_status_unsubscribe_flow(self):
        """Test complete flow: subscribe -> check status -> unsubscribe -> check status"""
        token = self.get_employee_token()
        assert token is not None, "Failed to get employee token"
        
        headers = {"Authorization": f"Bearer {token}"}
        test_endpoint = f"https://test.example.com/push/flow-test-{os.urandom(8).hex()}"
        
        # 1. Check initial status
        status_response = self.session.get(f"{BASE_URL}/api/web-push/status", headers=headers)
        assert status_response.status_code == 200
        initial_count = status_response.json()["subscription_count"]
        print(f"Initial subscription count: {initial_count}")
        
        # 2. Subscribe
        subscribe_response = self.session.post(
            f"{BASE_URL}/api/web-push/subscribe",
            json={
                "endpoint": test_endpoint,
                "keys": {"auth": "flow_test_auth", "p256dh": "flow_test_p256dh"}
            },
            headers=headers
        )
        assert subscribe_response.status_code == 201
        
        # 3. Check status after subscribe
        status_response = self.session.get(f"{BASE_URL}/api/web-push/status", headers=headers)
        assert status_response.status_code == 200
        after_subscribe_count = status_response.json()["subscription_count"]
        assert after_subscribe_count >= initial_count + 1, "Subscription count should increase"
        print(f"After subscribe count: {after_subscribe_count}")
        
        # 4. Unsubscribe
        import urllib.parse
        encoded_endpoint = urllib.parse.quote(test_endpoint, safe='')
        unsubscribe_response = self.session.delete(
            f"{BASE_URL}/api/web-push/subscribe?endpoint={encoded_endpoint}",
            headers=headers
        )
        assert unsubscribe_response.status_code == 200
        
        # 5. Check status after unsubscribe
        status_response = self.session.get(f"{BASE_URL}/api/web-push/status", headers=headers)
        assert status_response.status_code == 200
        after_unsubscribe_count = status_response.json()["subscription_count"]
        assert after_unsubscribe_count == after_subscribe_count - 1, "Subscription count should decrease"
        print(f"After unsubscribe count: {after_unsubscribe_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
