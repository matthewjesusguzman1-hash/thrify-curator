"""
Tests for 1099-NEC Email with PDF Attachment Feature

Tests the following:
1. Email endpoint generates PDF and attaches it for draft form_type
2. Email uses filed document when form_type is 'filed' and filed_document_id exists
3. Entry is marked as emailed after successful send
4. Error handling for missing entries
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://curator-app-3.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"

# Test year to avoid conflicts
TEST_YEAR = 2098


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="function")
def test_1099_entry(auth_headers):
    """Create a test 1099 entry and clean up after test"""
    unique_id = str(uuid.uuid4())[:8]
    entry_data = {
        "year": TEST_YEAR,
        "contractor_name": f"TEST_Contractor_{unique_id}",
        "contractor_tin": "123-45-6789",
        "contractor_address": "123 Test St, Test City, TS 12345",
        "amount_paid": 1500.00,
        "notes": f"TEST_1099_email_{unique_id}"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/financials/issued-1099s",
        json=entry_data,
        headers=auth_headers
    )
    
    if response.status_code != 200:
        pytest.skip(f"Failed to create test 1099 entry: {response.text}")
    
    entry = response.json().get("entry", {})
    entry_id = entry.get("id")
    
    yield entry
    
    # Cleanup
    if entry_id:
        requests.delete(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}",
            headers=auth_headers
        )


class TestIssued1099sEmailEndpoint:
    """Tests for POST /api/financials/issued-1099s/{entry_id}/email"""
    
    def test_email_1099_draft_success(self, auth_headers, test_1099_entry):
        """Test emailing 1099 with draft form_type generates PDF and sends"""
        entry_id = test_1099_entry.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/email",
            json={
                "email": "test@example.com",
                "form_type": "draft"
            },
            headers=auth_headers
        )
        
        # Should succeed (email may be mocked but endpoint should work)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "email" in data
        assert data["email"] == "test@example.com"
        assert "attachment" in data["message"].lower() or "emailed" in data["message"].lower()
    
    def test_email_1099_marks_entry_as_emailed(self, auth_headers, test_1099_entry):
        """Test that emailing 1099 marks the entry as emailed"""
        entry_id = test_1099_entry.get("id")
        
        # Send email
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/email",
            json={
                "email": "test@example.com",
                "form_type": "draft"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify entry is marked as emailed
        get_response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{TEST_YEAR}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        entries = get_response.json().get("entries", [])
        
        # Find our entry
        entry = next((e for e in entries if e.get("id") == entry_id), None)
        assert entry is not None, "Entry not found after email"
        assert entry.get("emailed") == True, "Entry should be marked as emailed"
        assert entry.get("emailed_to") == "test@example.com", "emailed_to should be set"
        assert entry.get("emailed_at") is not None, "emailed_at should be set"
    
    def test_email_1099_nonexistent_entry(self, auth_headers):
        """Test emailing non-existent 1099 returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{fake_id}/email",
            json={
                "email": "test@example.com",
                "form_type": "draft"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
    
    def test_email_1099_missing_email_field(self, auth_headers, test_1099_entry):
        """Test emailing 1099 without email field returns validation error"""
        entry_id = test_1099_entry.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/email",
            json={
                "form_type": "draft"
            },
            headers=auth_headers
        )
        
        # Should return 422 validation error
        assert response.status_code == 422
    
    def test_email_1099_default_form_type(self, auth_headers, test_1099_entry):
        """Test emailing 1099 without form_type defaults to draft"""
        entry_id = test_1099_entry.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/email",
            json={
                "email": "test@example.com"
                # form_type not specified, should default to "draft"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestIssued1099sFiledDocument:
    """Tests for filed document handling in email"""
    
    def test_upload_filed_document(self, auth_headers, test_1099_entry):
        """Test uploading a filed 1099 document"""
        entry_id = test_1099_entry.get("id")
        
        # Create a simple PDF-like content for testing
        pdf_content = b"%PDF-1.4 test content"
        
        files = {
            "file": ("test_filed_1099.pdf", pdf_content, "application/pdf")
        }
        
        # Remove Content-Type from headers for multipart upload
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/upload-filed",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doc_id" in data
        assert "message" in data
        assert "uploaded" in data["message"].lower()
    
    def test_entry_marked_as_filed_after_upload(self, auth_headers, test_1099_entry):
        """Test that entry is marked as filed after document upload"""
        entry_id = test_1099_entry.get("id")
        
        # Upload filed document
        pdf_content = b"%PDF-1.4 test content"
        files = {"file": ("test_filed_1099.pdf", pdf_content, "application/pdf")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/upload-filed",
            files=files,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        
        # Verify entry is marked as filed
        get_response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{TEST_YEAR}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        entries = get_response.json().get("entries", [])
        
        entry = next((e for e in entries if e.get("id") == entry_id), None)
        assert entry is not None
        assert entry.get("filed") == True, "Entry should be marked as filed"
        assert entry.get("filed_document_id") is not None, "filed_document_id should be set"
    
    def test_email_filed_1099_uses_uploaded_document(self, auth_headers, test_1099_entry):
        """Test that emailing with form_type='filed' uses the uploaded document"""
        entry_id = test_1099_entry.get("id")
        
        # First upload a filed document
        pdf_content = b"%PDF-1.4 test filed content"
        files = {"file": ("test_filed_1099.pdf", pdf_content, "application/pdf")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/upload-filed",
            files=files,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        
        # Now email with form_type='filed'
        email_response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/email",
            json={
                "email": "test@example.com",
                "form_type": "filed"
            },
            headers=auth_headers
        )
        
        assert email_response.status_code == 200
        data = email_response.json()
        assert "message" in data
        assert "emailed" in data["message"].lower()


class TestIssued1099sCRUD:
    """Basic CRUD tests for issued-1099s endpoint"""
    
    def test_get_issued_1099s_for_year(self, auth_headers):
        """Test getting all issued 1099s for a year"""
        response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{TEST_YEAR}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total_paid" in data
        assert isinstance(data["entries"], list)
    
    def test_create_issued_1099(self, auth_headers):
        """Test creating a new issued 1099 entry"""
        unique_id = str(uuid.uuid4())[:8]
        entry_data = {
            "year": TEST_YEAR,
            "contractor_name": f"TEST_Create_{unique_id}",
            "contractor_tin": "987-65-4321",
            "contractor_address": "456 Test Ave",
            "amount_paid": 2000.00,
            "notes": f"TEST_create_{unique_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s",
            json=entry_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entry" in data
        entry = data["entry"]
        assert entry["contractor_name"] == entry_data["contractor_name"]
        assert entry["amount_paid"] == entry_data["amount_paid"]
        
        # Cleanup
        entry_id = entry.get("id")
        if entry_id:
            requests.delete(
                f"{BASE_URL}/api/financials/issued-1099s/{entry_id}",
                headers=auth_headers
            )
    
    def test_delete_issued_1099(self, auth_headers):
        """Test deleting an issued 1099 entry"""
        # Create entry first
        unique_id = str(uuid.uuid4())[:8]
        entry_data = {
            "year": TEST_YEAR,
            "contractor_name": f"TEST_Delete_{unique_id}",
            "amount_paid": 500.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/financials/issued-1099s",
            json=entry_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        entry_id = create_response.json()["entry"]["id"]
        
        # Delete entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{TEST_YEAR}",
            headers=auth_headers
        )
        
        entries = get_response.json().get("entries", [])
        assert not any(e.get("id") == entry_id for e in entries)


class TestGeneratePDFEndpoint:
    """Tests for PDF generation endpoint"""
    
    def test_generate_pdf_success(self, auth_headers, test_1099_entry):
        """Test generating PDF for a 1099 entry"""
        entry_id = test_1099_entry.get("id")
        
        response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{entry_id}/generate-pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
    
    def test_generate_pdf_nonexistent_entry(self, auth_headers):
        """Test generating PDF for non-existent entry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.get(
            f"{BASE_URL}/api/financials/issued-1099s/{fake_id}/generate-pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 404
