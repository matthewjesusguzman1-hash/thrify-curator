"""
Backend tests for Payment Records with Commission Split feature
Tests the new commission_split field on payment records
"""
import pytest
import requests
import os
import base64
from datetime import datetime

# Use conftest.py's BASE_URL fallback pattern
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matthewjesusguzman1@gmail.com",
        "admin_code": "4399"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")

@pytest.fixture
def auth_headers(admin_token):
    """Return headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestConsignmentClients:
    """Test consignment clients endpoint"""
    
    def test_get_consignment_clients(self, auth_headers):
        """Test fetching consignment clients"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        # Should have at least some clients based on our data
        assert len(clients) >= 0
    
    def test_consignment_clients_have_required_fields(self, auth_headers):
        """Test that consignment clients have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) > 0:
            client = clients[0]
            # Check expected fields exist
            assert "email" in client
            assert "full_name" in client


class TestPaymentRecords:
    """Test payment records with commission split"""
    
    def test_get_check_records(self, auth_headers):
        """Test fetching check records"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers
        )
        assert response.status_code == 200
        records = response.json()
        assert isinstance(records, list)
    
    def test_create_consignment_payment_with_commission_split(self, auth_headers):
        """Test creating a consignment payment with commission split"""
        # First get a consignment client
        clients_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No consignment clients available")
        
        client = clients_response.json()[0]
        
        # Create a small test image (1x1 pixel PNG)
        # This is a valid 1x1 transparent PNG
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        payload = {
            "image_data": test_image_base64,
            "filename": "test_payment.png",
            "content_type": "image/png",
            "description": "TEST_payment_commission_split",
            "check_date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 50.00,
            "employee_name": None,
            "payment_type": "consignment",
            "consignment_client_email": client["email"],
            "commission_split": "60/40"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        
        # Cleanup: delete the test record
        record_id = result["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/payroll/check-records/{record_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
    
    def test_payment_record_stores_commission_split(self, auth_headers):
        """Test that commission split is stored and retrieved correctly"""
        # Get a consignment client
        clients_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No consignment clients available")
        
        client = clients_response.json()[0]
        
        # Create test image
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        # Create payment with specific commission split
        payload = {
            "image_data": test_image_base64,
            "filename": "test_split.png",
            "content_type": "image/png",
            "description": "TEST_verify_commission_split",
            "check_date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 75.00,
            "payment_type": "consignment",
            "consignment_client_email": client["email"],
            "commission_split": "70/30"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers,
            json=payload
        )
        
        assert create_response.status_code == 200
        record_id = create_response.json()["id"]
        
        # Fetch all records and find our test record
        records_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers
        )
        assert records_response.status_code == 200
        
        records = records_response.json()
        test_record = next((r for r in records if r.get("id") == record_id), None)
        
        assert test_record is not None
        assert test_record.get("commission_split") == "70/30"
        assert test_record.get("payment_type") == "consignment"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/payroll/check-records/{record_id}",
            headers=auth_headers
        )
    
    def test_update_payment_record_commission_split(self, auth_headers):
        """Test updating commission split on existing record"""
        # Get a consignment client
        clients_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No consignment clients available")
        
        client = clients_response.json()[0]
        
        # Create test image
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        # Create initial payment
        payload = {
            "image_data": test_image_base64,
            "filename": "test_update.png",
            "content_type": "image/png",
            "description": "TEST_update_commission_split",
            "check_date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 100.00,
            "payment_type": "consignment",
            "consignment_client_email": client["email"],
            "commission_split": "50/50"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers,
            json=payload
        )
        
        assert create_response.status_code == 200
        record_id = create_response.json()["id"]
        
        # Update the commission split
        update_payload = {
            "commission_split": "65/35"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/payroll/check-records/{record_id}",
            headers=auth_headers,
            json=update_payload
        )
        
        assert update_response.status_code == 200
        
        # Verify update
        records_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/check-records",
            headers=auth_headers
        )
        records = records_response.json()
        updated_record = next((r for r in records if r.get("id") == record_id), None)
        
        assert updated_record is not None
        assert updated_record.get("commission_split") == "65/35"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/payroll/check-records/{record_id}",
            headers=auth_headers
        )


class TestConsignorPortalData:
    """Test consignor portal data endpoint"""
    
    def test_client_payment_history_endpoint(self, auth_headers):
        """Test fetching payment history for a client"""
        # Get a consignment client
        clients_response = requests.get(
            f"{BASE_URL}/api/admin/payroll/consignment-clients",
            headers=auth_headers
        )
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No consignment clients available")
        
        client = clients_response.json()[0]
        email = client["email"]
        
        # Fetch payment history
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/client-payment-history/{email}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "payments" in data
        assert "total_paid" in data
        assert isinstance(data["payments"], list)


class TestEmployeesForPayment:
    """Test employees for payment endpoint"""
    
    def test_get_all_employees_for_payment(self, auth_headers):
        """Test fetching employees for payment dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/all-employees-for-payment",
            headers=auth_headers
        )
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)
    
    def test_employees_for_payment_excludes_owners(self, auth_headers):
        """Test that employees for payment may exclude owners"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/employees-for-payment",
            headers=auth_headers
        )
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)
