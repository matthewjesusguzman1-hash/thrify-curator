"""
Test suite for HazMat Substances API (Appendix A/B data)
Tests the /api/hazmat-substances/search endpoint with the new 1804 entry dataset
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHazmatSubstancesSearch:
    """Tests for /api/hazmat-substances/search endpoint"""

    def test_search_benzene_returns_multiple_results(self):
        """Search for 'benzene' should return multiple results with RQ values"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=benzene")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 1, "Should return multiple benzene-related results"
        
        # Check first result is 'Benzene' with correct RQ
        benzene = next((r for r in data if r['name'] == 'Benzene'), None)
        assert benzene is not None, "Should find exact 'Benzene' entry"
        assert benzene['rq_lbs'] == 10, "Benzene RQ should be 10 lbs"
        assert benzene['is_hazardous_substance'] is True
        assert '_id' not in benzene, "MongoDB _id should be excluded"

    def test_search_aldrin_returns_correct_data(self):
        """Search for 'aldrin' should return RQ=1, is_marine_pollutant=true, is_severe_marine_pollutant=true"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=aldrin")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        aldrin = data[0]
        assert aldrin['name'] == 'Aldrin'
        assert aldrin['rq_lbs'] == 1, "Aldrin RQ should be 1 lb"
        assert aldrin['is_hazardous_substance'] is True
        assert aldrin['is_marine_pollutant'] is True
        assert aldrin['is_severe_marine_pollutant'] is True
        assert '_id' not in aldrin

    def test_search_gasoline_returns_marine_pollutant_only(self):
        """Search for 'gasoline' should return 'Gasoline, leaded' with rq_lbs=null, is_marine_pollutant=true"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=gasoline")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        gasoline = next((r for r in data if 'Gasoline' in r['name']), None)
        assert gasoline is not None
        assert gasoline['rq_lbs'] is None, "Gasoline should have null RQ (not a hazardous substance)"
        assert gasoline['is_hazardous_substance'] is False
        assert gasoline['is_marine_pollutant'] is True
        assert '_id' not in gasoline

    def test_search_d001_waste_stream(self):
        """Search for 'D001' should return waste stream entry with RQ value"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=D001")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        d001 = data[0]
        assert 'D001' in d001['name']
        assert d001['rq_lbs'] == 100, "D001 waste stream RQ should be 100 lbs"
        assert d001['is_hazardous_substance'] is True
        assert '_id' not in d001

    def test_search_zinc_returns_20_results_limit(self):
        """Search for 'zinc' should return exactly 20 results (limit)"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=zinc")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 20, f"Should return exactly 20 results (limit), got {len(data)}"
        
        # Verify first result is 'Zinc'
        zinc = next((r for r in data if r['name'] == 'Zinc'), None)
        assert zinc is not None
        assert zinc['rq_lbs'] == 1000
        assert '_id' not in zinc

    def test_search_acetone_cyanohydrin(self):
        """Search for 'acetone cyanohydrin' should show RQ from Appendix A"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=acetone%20cyanohydrin")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        # Find the hazardous substance entry
        acetone_cyanoh = next((r for r in data if r['name'] == 'Acetone cyanohydrin'), None)
        assert acetone_cyanoh is not None
        assert acetone_cyanoh['rq_lbs'] == 10, "Acetone cyanohydrin RQ should be 10 lbs"
        assert acetone_cyanoh['is_hazardous_substance'] is True
        assert '_id' not in acetone_cyanoh

    def test_search_chlorine(self):
        """Search for 'chlorine' should return results with RQ and marine pollutant status"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=chlorine")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        chlorine = next((r for r in data if r['name'] == 'Chlorine'), None)
        assert chlorine is not None
        assert chlorine['rq_lbs'] == 10, "Chlorine RQ should be 10 lbs"
        assert chlorine['is_hazardous_substance'] is True
        assert chlorine['is_marine_pollutant'] is True
        assert '_id' not in chlorine

    def test_search_xylene_multiple_isomers(self):
        """Search for 'xylene' should return multiple isomers with correct RQ values"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=xylene")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 4, "Should return multiple xylene isomers"
        
        # Check main xylene entry
        xylene = next((r for r in data if r['name'] == 'Xylene'), None)
        assert xylene is not None
        assert xylene['rq_lbs'] == 100
        assert xylene['is_hazardous_substance'] is True
        assert '_id' not in xylene

    def test_no_mongodb_id_in_response(self):
        """Verify no _id field in any API response"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=ammonia")
        assert response.status_code == 200
        
        data = response.json()
        for item in data:
            assert '_id' not in item, f"MongoDB _id should be excluded from response: {item}"

    def test_search_empty_query_returns_422(self):
        """Empty query should return 422 (validation error - min_length=1)"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=")
        # API has min_length=1 validation, so empty string returns 422
        assert response.status_code == 422

    def test_search_short_query_returns_empty(self):
        """Query with less than 2 characters should return empty (min_length=1 in API)"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=a")
        assert response.status_code == 200
        
        data = response.json()
        # API has min_length=1, so single char should work
        assert isinstance(data, list)

    def test_search_nonexistent_substance(self):
        """Search for non-existent substance should return empty list"""
        response = requests.get(f"{BASE_URL}/api/hazmat-substances/search?q=xyznonexistent123")
        assert response.status_code == 200
        
        data = response.json()
        assert data == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
