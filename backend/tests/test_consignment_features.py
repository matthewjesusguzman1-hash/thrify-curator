"""
Tests for new consignment agreement features:
- Custom profit split
- Additional information field
- Photo upload
- Update Info / Add Items flow
- Payment validation (Check vs other methods)
"""
import pytest
import requests
import os
import uuid
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPhotoUploadEndpoint:
    """Test photo upload API endpoint"""
    
    def test_upload_single_photo(self):
        """Upload a single photo successfully"""
        # Create a test image in memory
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'files': ('test_image.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/forms/upload-photos", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert 'uploaded_paths' in data
        assert len(data['uploaded_paths']) == 1
        assert data['uploaded_paths'][0].startswith('/uploads/consignment_photos/')
    
    def test_upload_multiple_photos(self):
        """Upload multiple photos successfully"""
        files = []
        for i in range(3):
            img = Image.new('RGB', (100, 100), color=['red', 'green', 'blue'][i])
            img_bytes = BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            files.append(('files', (f'test_{i}.jpg', img_bytes, 'image/jpeg')))
        
        response = requests.post(f"{BASE_URL}/api/forms/upload-photos", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data['uploaded_paths']) == 3


class TestConsignmentAgreement:
    """Test consignment agreement creation with new fields"""
    
    def test_create_agreement_with_custom_profit_split(self):
        """Create agreement with custom profit split"""
        unique_email = f"test_custom_split_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Custom Split User",
            "email": unique_email,
            "phone": "555-111-2222",
            "address": "123 Test St, Test City, TS 12345",
            "items_description": "10",
            "agreed_percentage": "60/40",  # Custom profit split
            "payment_method": "venmo",
            "payment_details": "@testuser",
            "additional_info": "These are high-end designer items",
            "photos": [],
            "signature": "Test Custom Split User",
            "signature_date": "2026-03-11",
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['agreed_percentage'] == "60/40"
        assert data['additional_info'] == "These are high-end designer items"
    
    def test_create_agreement_with_default_profit_split(self):
        """Create agreement with default 50/50 profit split"""
        unique_email = f"test_default_split_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Default Split User",
            "email": unique_email,
            "phone": "555-333-4444",
            "address": "456 Test Ave, Test City, TS 67890",
            "items_description": "5",
            "agreed_percentage": "50/50",  # Default profit split
            "payment_method": "check",
            "payment_details": "",  # Check doesn't need details
            "additional_info": "",
            "photos": [],
            "signature": "Test Default Split User",
            "signature_date": "2026-03-11",
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['agreed_percentage'] == "50/50"
    
    def test_create_agreement_with_photos(self):
        """Create agreement with uploaded photos"""
        # First upload a photo
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        upload_response = requests.post(
            f"{BASE_URL}/api/forms/upload-photos",
            files={'files': ('test_photo.jpg', img_bytes, 'image/jpeg')}
        )
        photo_path = upload_response.json()['uploaded_paths'][0]
        
        unique_email = f"test_with_photos_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Photos User",
            "email": unique_email,
            "phone": "555-555-6666",
            "address": "789 Photo St, Test City, TS 11111",
            "items_description": "3",
            "agreed_percentage": "50/50",
            "payment_method": "paypal",
            "payment_details": "testuser@paypal.com",
            "additional_info": "Items with photos",
            "photos": [photo_path],
            "signature": "Test Photos User",
            "signature_date": "2026-03-11",
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data['photos']) == 1
        assert data['photos'][0] == photo_path


class TestCheckExistingAgreement:
    """Test checking for existing agreement"""
    
    def test_check_existing_agreement_found(self):
        """Check for existing agreement - found"""
        response = requests.get(
            f"{BASE_URL}/api/forms/check-existing-agreement",
            params={"email": "testuser@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['has_agreement'] == True
        assert 'agreement' in data
        assert data['agreement']['email'] == "testuser@example.com"
    
    def test_check_existing_agreement_not_found(self):
        """Check for existing agreement - not found"""
        response = requests.get(
            f"{BASE_URL}/api/forms/check-existing-agreement",
            params={"email": f"nonexistent_{uuid.uuid4().hex}@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['has_agreement'] == False


class TestAddConsignmentItems:
    """Test adding items to existing consignment"""
    
    def test_add_items_with_signature(self):
        """Add items with signature and date"""
        payload = {
            "email": "testuser@example.com",
            "full_name": "Test User",
            "items_to_add": 3,
            "items_description": "3 vintage jackets",
            "acknowledged_terms": True,
            "update_email": None,
            "update_phone": None,
            "update_address": None,
            "update_payment_method": None,
            "update_payment_details": None,
            "update_profit_split": None,
            "additional_info": "Excellent condition",
            "photos": [],
            "signature": "Test User",
            "signature_date": "2026-03-11"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/add-consignment-items", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['items_to_add'] == 3
        assert data['signature'] == "Test User"
        assert data['signature_date'] == "2026-03-11"
    
    def test_update_contact_info(self):
        """Update contact information only"""
        payload = {
            "email": "testuser@example.com",
            "full_name": "Test User",
            "items_to_add": 0,
            "items_description": "",
            "acknowledged_terms": True,
            "update_email": None,
            "update_phone": "555-999-8888",
            "update_address": "999 New Address St",
            "update_payment_method": None,
            "update_payment_details": None,
            "update_profit_split": None,
            "additional_info": "",
            "photos": [],
            "signature": "Test User",
            "signature_date": "2026-03-11"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/add-consignment-items", json=payload)
        
        assert response.status_code == 200
    
    def test_update_payment_method(self):
        """Update payment method"""
        payload = {
            "email": "testuser@example.com",
            "full_name": "Test User",
            "items_to_add": 0,
            "items_description": "",
            "acknowledged_terms": True,
            "update_email": None,
            "update_phone": None,
            "update_address": None,
            "update_payment_method": "zelle",
            "update_payment_details": "testuser@zelle.com",
            "update_profit_split": None,
            "additional_info": "",
            "photos": [],
            "signature": "Test User",
            "signature_date": "2026-03-11"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/add-consignment-items", json=payload)
        
        assert response.status_code == 200
    
    def test_update_profit_split(self):
        """Update profit split"""
        payload = {
            "email": "testuser@example.com",
            "full_name": "Test User",
            "items_to_add": 0,
            "items_description": "",
            "acknowledged_terms": True,
            "update_email": None,
            "update_phone": None,
            "update_address": None,
            "update_payment_method": None,
            "update_payment_details": None,
            "update_profit_split": "70/30",
            "additional_info": "",
            "photos": [],
            "signature": "Test User",
            "signature_date": "2026-03-11"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/add-consignment-items", json=payload)
        
        assert response.status_code == 200
    
    def test_add_items_nonexistent_agreement(self):
        """Try to add items to non-existent agreement"""
        payload = {
            "email": f"nonexistent_{uuid.uuid4().hex}@example.com",
            "full_name": "Nonexistent User",
            "items_to_add": 5,
            "items_description": "Some items",
            "acknowledged_terms": True,
            "signature": "Nonexistent User",
            "signature_date": "2026-03-11"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/add-consignment-items", json=payload)
        
        assert response.status_code == 404


class TestPaymentMethodValidation:
    """Test payment method validation - Check doesn't need details"""
    
    def test_check_payment_no_details_required(self):
        """Check payment method doesn't require details"""
        unique_email = f"test_check_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Check Payment User",
            "email": unique_email,
            "phone": "555-777-8888",
            "address": "111 Check St, Test City, TS 22222",
            "items_description": "2",
            "agreed_percentage": "50/50",
            "payment_method": "check",
            "payment_details": "",  # No details needed for check
            "additional_info": "",
            "photos": [],
            "signature": "Test Check Payment User",
            "signature_date": "2026-03-11",
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['payment_method'] == "check"
        assert data['payment_details'] == ""
    
    def test_venmo_payment_with_details(self):
        """Venmo payment requires details"""
        unique_email = f"test_venmo_{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "full_name": "Test Venmo User",
            "email": unique_email,
            "phone": "555-888-9999",
            "address": "222 Venmo Ave, Test City, TS 33333",
            "items_description": "4",
            "agreed_percentage": "50/50",
            "payment_method": "venmo",
            "payment_details": "@venmouser",
            "additional_info": "",
            "photos": [],
            "signature": "Test Venmo User",
            "signature_date": "2026-03-11",
            "agreed_to_terms": True
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/consignment-agreement", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['payment_method'] == "venmo"
        assert data['payment_details'] == "@venmouser"


class TestUpdatePaymentMethod:
    """Test updating payment method for existing agreement"""
    
    def test_update_payment_method_success(self):
        """Update payment method successfully"""
        payload = {
            "email": "testuser@example.com",
            "payment_method": "cashapp",
            "payment_details": "$testcashapp"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/update-payment-method", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
    
    def test_update_payment_method_not_found(self):
        """Update payment method - agreement not found"""
        payload = {
            "email": f"nonexistent_{uuid.uuid4().hex}@example.com",
            "payment_method": "paypal",
            "payment_details": "test@paypal.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/forms/update-payment-method", json=payload)
        
        assert response.status_code == 404
