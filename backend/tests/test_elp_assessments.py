"""Tests for ELP (English Language Proficiency) assessment endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://violation-navigator.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def inspection_id(session):
    r = session.post(f"{API}/inspections", json={"title": "TEST_ELP_Inspection", "badge": "042"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data
    assert "_id" not in data
    return data["id"]


# ── ELP Save endpoint ──
class TestElpSave:
    def test_save_elp_full_payload(self, session, inspection_id):
        payload = {
            "driver_name": "John Doe",
            "cdl_number": "CDL-12345",
            "interview_administered": True,
            "interview_answers": [
                {"key": "name_dob", "question": "What is your name?", "result": "pass", "notes": ""},
                {"key": "license", "question": "Show CDL.", "result": "inconclusive", "notes": "Hesitated"},
                {"key": "destination", "question": "Where headed?", "result": "fail", "notes": "Could not answer"},
            ],
            "signs_administered": True,
            "sign_answers": [
                {"sign_id": 1, "text": "STOP", "meaning": "Stop", "result": "pass", "driver_response": "stop"},
                {"sign_id": 2, "text": "YIELD", "meaning": "Yield", "result": "fail", "driver_response": "no idea"},
            ],
            "overall_disposition": "not_proficient",
            "citation_ref": "§391.11(b)(2)",
            "inspector_notes": "Driver could not communicate destination.",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "assessment_id" in data
        assert "created_at" in data
        assert "_id" not in data
        assert data["overall_disposition"] == "not_proficient"
        assert data["citation_ref"] == "§391.11(b)(2)"
        assert len(data["interview_answers"]) == 3
        assert len(data["sign_answers"]) == 2
        # store for later test
        pytest.elp_assessment_id = data["assessment_id"]

    def test_get_inspection_returns_elp(self, session, inspection_id):
        r = session.get(f"{API}/inspections/{inspection_id}")
        assert r.status_code == 200
        doc = r.json()
        assert "_id" not in doc
        assert "elp_assessments" in doc
        assert len(doc["elp_assessments"]) >= 1
        elp = doc["elp_assessments"][0]
        assert elp["overall_disposition"] == "not_proficient"
        assert elp["driver_name"] == "John Doe"
        assert "assessment_id" in elp

    def test_save_second_elp_then_delete_first_only(self, session, inspection_id):
        # Add a second assessment
        payload = {
            "driver_name": "Jane Roe",
            "cdl_number": "CDL-99999",
            "interview_administered": True,
            "interview_answers": [{"key": "name_dob", "question": "Name?", "result": "pass", "notes": ""}],
            "signs_administered": False,
            "sign_answers": [],
            "overall_disposition": "proficient",
            "citation_ref": "",
            "inspector_notes": "",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json=payload)
        assert r.status_code == 200
        second_id = r.json()["assessment_id"]
        first_id = pytest.elp_assessment_id

        # Verify both exist
        doc = session.get(f"{API}/inspections/{inspection_id}").json()
        ids = {a["assessment_id"] for a in doc["elp_assessments"]}
        assert first_id in ids and second_id in ids

        # Delete only the first
        r = session.delete(f"{API}/inspections/{inspection_id}/elp/{first_id}")
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Confirm only the second remains
        doc = session.get(f"{API}/inspections/{inspection_id}").json()
        ids = {a["assessment_id"] for a in doc["elp_assessments"]}
        assert first_id not in ids
        assert second_id in ids

    def test_save_elp_to_bogus_inspection_returns_404(self, session):
        r = session.post(
            f"{API}/inspections/bogus-nonexistent-id-xyz/elp",
            json={"driver_name": "X", "overall_disposition": "proficient"},
        )
        assert r.status_code == 404


# ── Cleanup ──
def test_cleanup(session, inspection_id):
    r = session.delete(f"{API}/inspections/{inspection_id}")
    assert r.status_code in (200, 204)
