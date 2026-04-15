"""
Test suite for new features:
1. AI Smart Search - natural language queries for violations
2. Photo Annotator page (frontend only - tested via Playwright)
3. Placard Calculator (frontend only - tested via Playwright)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAISmartSearch:
    """Test AI-powered smart search for natural language violation queries"""
    
    def test_seatbelt_query_returns_392_16(self):
        """Query 'driver not wearing seatbelt' should return violations with 392.16"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={"query": "driver not wearing seatbelt"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that we got results
        assert data["total"] > 0, "Expected at least one result for seatbelt query"
        
        # Check that expanded terms include relevant terms
        expanded = data.get("expanded_terms", [])
        assert len(expanded) > 0, "Expected expanded terms from AI"
        
        # Check that at least one violation has 392.16 in regulatory_reference
        violations = data.get("violations", [])
        has_392_16 = any("392.16" in v.get("regulatory_reference", "") for v in violations)
        assert has_392_16, "Expected at least one violation with 392.16 (seatbelt regulation)"
    
    def test_cell_phone_query_returns_392_82_or_390_17(self):
        """Query 'cell phone in hand' should return violations with 392.82 or 390.17"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={"query": "cell phone in hand"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that we got results
        assert data["total"] > 0, "Expected at least one result for cell phone query"
        
        # Check that expanded terms include relevant terms
        expanded = data.get("expanded_terms", [])
        assert len(expanded) > 0, "Expected expanded terms from AI"
        
        # Check that at least one violation has 392.82 or 390.17
        violations = data.get("violations", [])
        has_phone_violation = any(
            "392.82" in v.get("regulatory_reference", "") or 
            "390.17" in v.get("regulatory_reference", "")
            for v in violations
        )
        assert has_phone_violation, "Expected at least one violation with 392.82 or 390.17 (phone regulations)"
    
    def test_texting_query_returns_results(self):
        """Query 'texting while driving' should return relevant violations"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={"query": "texting while driving"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that we got results
        assert data["total"] > 0, "Expected at least one result for texting query"
        
        # Check expanded terms
        expanded = data.get("expanded_terms", [])
        assert any("392.80" in str(t) or "392.82" in str(t) or "texting" in str(t).lower() for t in expanded), \
            "Expected expanded terms to include texting-related terms"
    
    def test_empty_query_returns_empty(self):
        """Empty query should return empty results"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={"query": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["violations"]) == 0
    
    def test_smart_search_with_filters(self):
        """Smart search should work with additional filters"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={
                "query": "brakes",
                "oos": "Y"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned violations should have oos_value = Y
        for v in data.get("violations", []):
            assert v.get("oos_value") == "Y", f"Expected OOS=Y but got {v.get('oos_value')}"
    
    def test_smart_search_response_structure(self):
        """Verify smart search response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/violations/smart-search",
            json={"query": "tire"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "violations" in data
        assert "total" in data
        assert "expanded_terms" in data
        assert "original_query" in data
        
        # Check original query is preserved
        assert data["original_query"] == "tire"
        
        # Check violations have required fields
        if data["violations"]:
            v = data["violations"][0]
            assert "id" in v
            assert "regulatory_reference" in v
            assert "violation_text" in v
            assert "oos_value" in v


class TestExistingEndpoints:
    """Verify existing endpoints still work after new feature additions"""
    
    def test_violations_search(self):
        """Basic violations search should still work"""
        response = requests.get(f"{BASE_URL}/api/violations?keyword=brake")
        assert response.status_code == 200
        data = response.json()
        assert "violations" in data
        assert "total" in data
    
    def test_violations_filters(self):
        """Filter options endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/violations/filters")
        assert response.status_code == 200
        data = response.json()
        assert "violation_classes" in data
        assert "violation_categories" in data
    
    def test_violations_stats(self):
        """Stats endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/violations/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "oos_count" in data
    
    def test_hazmat_substances_search(self):
        """HazMat substances search should still work"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=benzene")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
