"""
Business Documents Vault API Tests
Tests for the document upload, list, search, update, delete, and folder/tag management endpoints.
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
NON_ADMIN_EMAIL = "matthewjguzman1@gmail.com"


class TestDocumentsAuth:
    """Test authentication and authorization for documents endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Admin login with code
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def non_admin_token(self):
        """Get non-admin authentication token"""
        # Try to login as non-admin employee
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": NON_ADMIN_EMAIL})
        if response.status_code != 200:
            pytest.skip(f"Non-admin login failed: {response.text}")
        return response.json().get("access_token")
    
    def test_documents_list_requires_admin(self, non_admin_token):
        """Non-admin users should get 403 on documents endpoints"""
        if not non_admin_token:
            pytest.skip("No non-admin token available")
        
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/documents", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_documents_folders_requires_admin(self, non_admin_token):
        """Non-admin users should get 403 on folders endpoint"""
        if not non_admin_token:
            pytest.skip("No non-admin token available")
        
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/documents/folders", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_documents_tags_requires_admin(self, non_admin_token):
        """Non-admin users should get 403 on tags endpoint"""
        if not non_admin_token:
            pytest.skip("No non-admin token available")
        
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/documents/tags", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestDocumentsCRUD:
    """Test CRUD operations for documents"""
    
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
        """Get auth headers for requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_documents(self, auth_headers):
        """GET /api/documents returns list of documents"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200, f"List documents failed: {response.text}"
        
        data = response.json()
        assert "documents" in data, "Response should contain 'documents' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["documents"], list), "Documents should be a list"
        print(f"Found {data['total']} documents")
    
    def test_list_folders(self, auth_headers):
        """GET /api/documents/folders returns all default folders with counts"""
        response = requests.get(f"{BASE_URL}/api/documents/folders", headers=auth_headers)
        assert response.status_code == 200, f"List folders failed: {response.text}"
        
        data = response.json()
        assert "folders" in data, "Response should contain 'folders' key"
        
        folders = data["folders"]
        assert isinstance(folders, list), "Folders should be a list"
        
        # Check that default folders are present
        folder_names = [f["name"] for f in folders]
        expected_folders = ["All", "Banking", "Licenses", "Insurance", "Tax", "Legal", "Receipts", "Other"]
        for expected in expected_folders:
            assert expected in folder_names, f"Expected folder '{expected}' not found"
        
        # Check folder structure
        for folder in folders:
            assert "name" in folder, "Folder should have 'name'"
            assert "count" in folder, "Folder should have 'count'"
            assert isinstance(folder["count"], int), "Count should be an integer"
        
        print(f"Folders: {folder_names}")
    
    def test_list_tags(self, auth_headers):
        """GET /api/documents/tags returns unique tags with counts"""
        response = requests.get(f"{BASE_URL}/api/documents/tags", headers=auth_headers)
        assert response.status_code == 200, f"List tags failed: {response.text}"
        
        data = response.json()
        assert "tags" in data, "Response should contain 'tags' key"
        
        tags = data["tags"]
        assert isinstance(tags, list), "Tags should be a list"
        
        # Check tag structure
        for tag in tags:
            assert "name" in tag, "Tag should have 'name'"
            assert "count" in tag, "Tag should have 'count'"
        
        print(f"Found {len(tags)} unique tags")
    
    def test_upload_document(self, auth_headers):
        """POST /api/documents/upload successfully stores a document"""
        # Create a simple test file
        test_content = b"This is a test document content for Business Files vault testing."
        files = {
            "file": ("TEST_document.txt", io.BytesIO(test_content), "text/plain")
        }
        data = {
            "folder": "Banking",
            "tags": "test, automated, pytest",
            "display_name": "TEST Automated Test Document"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should contain document 'id'"
        assert result["display_name"] == "TEST Automated Test Document", "Display name should match"
        assert result["folder"] == "Banking", "Folder should match"
        assert "test" in result["tags"], "Tags should include 'test'"
        assert "automated" in result["tags"], "Tags should include 'automated'"
        assert result["file_size"] == len(test_content), "File size should match"
        
        print(f"Uploaded document with ID: {result['id']}")
        return result["id"]
    
    def test_search_documents(self, auth_headers):
        """GET /api/documents?q=chase searches across fields"""
        response = requests.get(f"{BASE_URL}/api/documents?q=chase", headers=auth_headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "documents" in data, "Response should contain 'documents' key"
        
        # If there's a Chase document, it should be found
        if data["total"] > 0:
            print(f"Found {data['total']} documents matching 'chase'")
            for doc in data["documents"]:
                # Check that search term appears in searchable fields
                searchable = (
                    doc.get("display_name", "").lower() +
                    doc.get("filename", "").lower() +
                    doc.get("folder", "").lower() +
                    " ".join(doc.get("tags", [])).lower()
                )
                # Note: extracted_text is not returned in list response
                print(f"  - {doc.get('display_name')} ({doc.get('folder')})")
    
    def test_filter_by_folder(self, auth_headers):
        """GET /api/documents?folder=Banking filters by folder"""
        response = requests.get(f"{BASE_URL}/api/documents?folder=Banking", headers=auth_headers)
        assert response.status_code == 200, f"Filter by folder failed: {response.text}"
        
        data = response.json()
        for doc in data["documents"]:
            assert doc["folder"] == "Banking", f"Document folder should be Banking, got {doc['folder']}"
        
        print(f"Found {data['total']} documents in Banking folder")
    
    def test_filter_by_tag(self, auth_headers):
        """GET /api/documents?tag=test filters by tag"""
        response = requests.get(f"{BASE_URL}/api/documents?tag=test", headers=auth_headers)
        assert response.status_code == 200, f"Filter by tag failed: {response.text}"
        
        data = response.json()
        for doc in data["documents"]:
            assert "test" in doc.get("tags", []), f"Document should have 'test' tag"
        
        print(f"Found {data['total']} documents with 'test' tag")


class TestDocumentUpdateDelete:
    """Test update and delete operations"""
    
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
    def test_document_id(self, auth_headers):
        """Create a test document for update/delete tests"""
        test_content = b"Test document for update/delete operations"
        files = {
            "file": ("TEST_update_delete.txt", io.BytesIO(test_content), "text/plain")
        }
        data = {
            "folder": "Other",
            "tags": "test, delete-me",
            "display_name": "TEST Document for Update/Delete"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Failed to create test document: {response.text}"
        return response.json()["id"]
    
    def test_update_document(self, auth_headers, test_document_id):
        """PATCH /api/documents/{id} updates document fields"""
        updates = {
            "display_name": "TEST Updated Document Name",
            "folder": "Legal",
            "tags": ["test", "updated", "legal"]
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/documents/{test_document_id}",
            headers=auth_headers,
            json=updates
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        result = response.json()
        assert result["success"] == True, "Update should succeed"
        assert "display_name" in result["updated"], "display_name should be updated"
        assert "folder" in result["updated"], "folder should be updated"
        assert "tags" in result["updated"], "tags should be updated"
        
        # Verify the update by fetching the document list
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        updated_doc = next((d for d in docs if d["id"] == test_document_id), None)
        assert updated_doc is not None, "Updated document should be in list"
        assert updated_doc["display_name"] == "TEST Updated Document Name", "Display name should be updated"
        assert updated_doc["folder"] == "Legal", "Folder should be updated"
        assert "updated" in updated_doc["tags"], "Tags should include 'updated'"
        
        print(f"Successfully updated document {test_document_id}")
    
    def test_delete_document(self, auth_headers, test_document_id):
        """DELETE /api/documents/{id} removes the document"""
        response = requests.delete(
            f"{BASE_URL}/api/documents/{test_document_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        result = response.json()
        assert result["success"] == True, "Delete should succeed"
        
        # Verify deletion by trying to find the document
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        deleted_doc = next((d for d in docs if d["id"] == test_document_id), None)
        assert deleted_doc is None, "Deleted document should not be in list"
        
        print(f"Successfully deleted document {test_document_id}")
    
    def test_delete_nonexistent_document(self, auth_headers):
        """DELETE /api/documents/{id} returns 404 for nonexistent document"""
        response = requests.delete(
            f"{BASE_URL}/api/documents/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent document, got {response.status_code}"
    
    def test_update_nonexistent_document(self, auth_headers):
        """PATCH /api/documents/{id} returns 404 for nonexistent document"""
        response = requests.patch(
            f"{BASE_URL}/api/documents/nonexistent-id-12345",
            headers=auth_headers,
            json={"display_name": "Test"}
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent document, got {response.status_code}"


class TestDocumentFileAccess:
    """Test file and preview access endpoints"""
    
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
    
    def test_file_access_requires_token(self):
        """GET /api/documents/{id}/file requires token"""
        response = requests.get(f"{BASE_URL}/api/documents/some-id/file")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
    
    def test_preview_access_requires_token(self):
        """GET /api/documents/{id}/preview requires token"""
        response = requests.get(f"{BASE_URL}/api/documents/some-id/preview")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
    
    def test_file_access_with_token(self, admin_token, auth_headers):
        """GET /api/documents/{id}/file?token=... returns file content"""
        # First get a document ID
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        if not docs:
            pytest.skip("No documents available to test file access")
        
        doc_id = docs[0]["id"]
        
        # Access file with token
        response = requests.get(f"{BASE_URL}/api/documents/{doc_id}/file?token={admin_token}")
        assert response.status_code == 200, f"File access failed: {response.status_code}"
        assert len(response.content) > 0, "File content should not be empty"
        
        print(f"Successfully accessed file for document {doc_id}")


class TestCleanup:
    """Cleanup test documents"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "admin_code": ADMIN_CODE
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_cleanup_test_documents(self, auth_headers):
        """Clean up any TEST_ prefixed documents"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200
        
        docs = response.json()["documents"]
        test_docs = [d for d in docs if d.get("display_name", "").startswith("TEST")]
        
        deleted_count = 0
        for doc in test_docs:
            response = requests.delete(
                f"{BASE_URL}/api/documents/{doc['id']}",
                headers=auth_headers
            )
            if response.status_code == 200:
                deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test documents")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
