"""
Multi-Page Preview and Download Tests
Tests for:
- Multi-page PDF preview with ?page= parameter
- Page count badge display
- Download with Content-Disposition: attachment header
- Out-of-range page handling (404)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"


class TestMultiPagePreview:
    """Test multi-page PDF preview functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def multi_page_doc(self, auth_headers):
        """Find a multi-page PDF document for testing"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200, f"List documents failed: {response.text}"
        
        docs = response.json()["documents"]
        # Find a document with page_count > 1
        multi_page = next((d for d in docs if d.get("page_count", 1) > 1), None)
        if not multi_page:
            pytest.skip("No multi-page documents available for testing")
        
        print(f"Using multi-page doc: {multi_page['display_name']} ({multi_page.get('page_count', 1)} pages)")
        return multi_page
    
    @pytest.fixture(scope="class")
    def single_page_doc(self, auth_headers):
        """Find a single-page document for testing"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        # Find a document with page_count == 1 or no page_count
        single_page = next((d for d in docs if d.get("page_count", 1) == 1), None)
        if not single_page:
            pytest.skip("No single-page documents available for testing")
        
        print(f"Using single-page doc: {single_page['display_name']}")
        return single_page
    
    def test_documents_have_page_count(self, auth_headers):
        """Verify documents list includes page_count field"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        assert len(docs) > 0, "Should have at least one document"
        
        # Check that page_count is present in documents
        docs_with_page_count = [d for d in docs if "page_count" in d]
        print(f"Documents with page_count: {len(docs_with_page_count)}/{len(docs)}")
        
        # List multi-page documents
        multi_page_docs = [d for d in docs if d.get("page_count", 1) > 1]
        for doc in multi_page_docs:
            print(f"  - {doc['display_name']}: {doc['page_count']} pages")
    
    def test_preview_page_0(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview?page=0 returns first page preview"""
        doc_id = multi_page_doc["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page=0&token={admin_token}"
        )
        assert response.status_code == 200, f"Preview page 0 failed: {response.status_code}"
        assert len(response.content) > 0, "Preview content should not be empty"
        
        # Check content type is image
        content_type = response.headers.get("content-type", "")
        assert "image" in content_type, f"Expected image content type, got {content_type}"
        
        print(f"Page 0 preview: {len(response.content)} bytes, type: {content_type}")
    
    def test_preview_page_1(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview?page=1 returns second page for multi-page docs"""
        doc_id = multi_page_doc["id"]
        page_count = multi_page_doc.get("page_count", 1)
        
        if page_count < 2:
            pytest.skip("Document has only 1 page")
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page=1&token={admin_token}"
        )
        assert response.status_code == 200, f"Preview page 1 failed: {response.status_code}"
        assert len(response.content) > 0, "Preview content should not be empty"
        
        content_type = response.headers.get("content-type", "")
        assert "image" in content_type, f"Expected image content type, got {content_type}"
        
        print(f"Page 1 preview: {len(response.content)} bytes")
    
    def test_preview_last_page(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview?page=N-1 returns last page"""
        doc_id = multi_page_doc["id"]
        page_count = multi_page_doc.get("page_count", 1)
        last_page = page_count - 1
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page={last_page}&token={admin_token}"
        )
        assert response.status_code == 200, f"Preview last page ({last_page}) failed: {response.status_code}"
        assert len(response.content) > 0, "Preview content should not be empty"
        
        print(f"Last page ({last_page}) preview: {len(response.content)} bytes")
    
    def test_preview_out_of_range_page(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview?page=99 returns 404 for out-of-range page"""
        doc_id = multi_page_doc["id"]
        page_count = multi_page_doc.get("page_count", 1)
        
        # Request a page that doesn't exist
        out_of_range = page_count + 10
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page={out_of_range}&token={admin_token}"
        )
        assert response.status_code == 404, f"Expected 404 for out-of-range page, got {response.status_code}"
        
        print(f"Out-of-range page ({out_of_range}) correctly returned 404")
    
    def test_preview_negative_page(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview?page=-1 returns 404 for negative page"""
        doc_id = multi_page_doc["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page=-1&token={admin_token}"
        )
        assert response.status_code == 404, f"Expected 404 for negative page, got {response.status_code}"
        
        print("Negative page (-1) correctly returned 404")
    
    def test_preview_default_page_is_0(self, admin_token, multi_page_doc):
        """GET /api/documents/{id}/preview without page param defaults to page 0"""
        doc_id = multi_page_doc["id"]
        
        # Request without page parameter
        response_default = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?token={admin_token}"
        )
        assert response_default.status_code == 200, f"Default preview failed: {response_default.status_code}"
        
        # Request with explicit page=0
        response_page0 = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/preview?page=0&token={admin_token}"
        )
        assert response_page0.status_code == 200
        
        # Both should return the same content
        assert response_default.content == response_page0.content, "Default page should be page 0"
        
        print("Default page correctly returns page 0")


class TestDownloadWithAttachment:
    """Test file download with Content-Disposition: attachment header"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def test_doc(self, auth_headers):
        """Get a document for download testing"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        if not docs:
            pytest.skip("No documents available for testing")
        
        return docs[0]
    
    def test_download_has_attachment_header(self, admin_token, test_doc):
        """GET /api/documents/{id}/file returns Content-Disposition: attachment header"""
        doc_id = test_doc["id"]
        filename = test_doc.get("filename", "document")
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/file?token={admin_token}"
        )
        assert response.status_code == 200, f"Download failed: {response.status_code}"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition.lower(), \
            f"Expected 'attachment' in Content-Disposition, got: {content_disposition}"
        
        # Check filename is included
        assert "filename" in content_disposition.lower(), \
            f"Expected 'filename' in Content-Disposition, got: {content_disposition}"
        
        print(f"Content-Disposition: {content_disposition}")
    
    def test_download_returns_file_content(self, admin_token, test_doc):
        """GET /api/documents/{id}/file returns actual file content"""
        doc_id = test_doc["id"]
        expected_size = test_doc.get("file_size", 0)
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/file?token={admin_token}"
        )
        assert response.status_code == 200
        
        # Check content is not empty
        assert len(response.content) > 0, "File content should not be empty"
        
        # If we know the expected size, verify it
        if expected_size > 0:
            assert len(response.content) == expected_size, \
                f"Expected {expected_size} bytes, got {len(response.content)}"
        
        print(f"Downloaded {len(response.content)} bytes")
    
    def test_download_requires_token(self):
        """GET /api/documents/{id}/file without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/documents/some-id/file")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
    
    def test_download_invalid_token(self, test_doc):
        """GET /api/documents/{id}/file with invalid token returns 401"""
        doc_id = test_doc["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/file?token=invalid-token-12345"
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
    
    def test_download_nonexistent_document(self, admin_token):
        """GET /api/documents/{id}/file for nonexistent doc returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/documents/nonexistent-doc-id/file?token={admin_token}"
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent doc, got {response.status_code}"


class TestPageCountInDocumentList:
    """Test that page_count is properly returned in document list"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_includes_page_count(self, auth_headers):
        """Document list should include page_count for PDFs"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        pdf_docs = [d for d in docs if d.get("extension") == "pdf"]
        
        print(f"Found {len(pdf_docs)} PDF documents")
        
        for doc in pdf_docs:
            page_count = doc.get("page_count", 1)
            print(f"  - {doc['display_name']}: {page_count} pages")
            assert isinstance(page_count, int), f"page_count should be int, got {type(page_count)}"
            assert page_count >= 1, f"page_count should be >= 1, got {page_count}"
    
    def test_multi_page_documents_exist(self, auth_headers):
        """Verify there are multi-page documents in the system"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        multi_page = [d for d in docs if d.get("page_count", 1) > 1]
        
        print(f"Multi-page documents: {len(multi_page)}")
        for doc in multi_page:
            print(f"  - {doc['display_name']}: {doc['page_count']} pages")
        
        # According to the context, there should be multi-page docs
        # Operating Agreement (12 pages), LLC Company Authorization Resolution (4 pages), etc.
        assert len(multi_page) > 0, "Expected at least one multi-page document"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
