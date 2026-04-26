"""Tests for ELP (English Language Proficiency) assessment endpoints — NEW SHAPE.

Spec: optional company_name + usdot_number (no driver_name/cdl_number),
inspector-judged interview_disposition (pass/inconclusive/fail),
exactly-4 picked signs each with result+notes, sign_test_result + counts.
"""
import os
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend .env if not in env
if "REACT_APP_BACKEND_URL" not in os.environ:
    fe = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if fe.exists():
        for line in fe.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
                break

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
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
    yield data["id"]
    # cleanup
    session.delete(f"{API}/inspections/{data['id']}")


# ── ELP Save endpoint (new shape) ──
class TestElpSave:
    def test_save_elp_full_payload(self, session, inspection_id):
        payload = {
            "company_name": "ACME Trucking LLC",
            "usdot_number": "1234567",
            "interview_administered": True,
            "interview_disposition": "inconclusive",
            "interview_answers": [
                {"key": "trip_origin", "question": "Where did you start your trip today?", "asked": True, "notes": "Hesitant"},
                {"key": "hauling", "question": "What are you hauling today?", "asked": True, "notes": ""},
                {"key": "license", "question": "Show me your driver's license please.", "asked": False, "notes": ""},
            ],
            "signs_administered": True,
            "sign_test_result": "insufficient",
            "sign_pass_count": 2,
            "sign_fail_count": 2,
            "sign_answers": [
                {"sign_id": 1, "text": "SPEED\nLIMIT\n50", "meaning": "Speed limit 50 mph", "result": "pass", "notes": ""},
                {"sign_id": 12, "text": "WRONG\nWAY", "meaning": "Wrong way", "result": "pass", "notes": ""},
                {"sign_id": 5, "text": "RUNAWAY\nTRUCK RAMP", "meaning": "Runaway truck ramp", "result": "fail", "notes": "Said 'fast truck'"},
                {"sign_id": 23, "text": "TURN ON LIGHTS", "meaning": "Turn on lights", "result": "fail", "notes": ""},
            ],
            "overall_disposition": "not_proficient",
            "citation_ref": "§391.11(b)(2)",
            "inspector_notes": "Driver could not identify 2 of 4 signs and was inconclusive on interview.",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "assessment_id" in data
        assert "created_at" in data
        assert "_id" not in data
        assert data["overall_disposition"] == "not_proficient"
        assert data["citation_ref"] == "§391.11(b)(2)"
        assert data["company_name"] == "ACME Trucking LLC"
        assert data["usdot_number"] == "1234567"
        assert data["interview_disposition"] == "inconclusive"
        assert data["sign_test_result"] == "insufficient"
        assert data["sign_pass_count"] == 2
        assert data["sign_fail_count"] == 2
        assert len(data["interview_answers"]) == 3
        assert len(data["sign_answers"]) == 4
        # No legacy fields should be present
        assert "driver_name" not in data
        assert "cdl_number" not in data
        # First interview answer shape
        a0 = data["interview_answers"][0]
        assert a0["key"] == "trip_origin"
        assert a0["asked"] is True
        # store for later test
        pytest.elp_assessment_id = data["assessment_id"]

    def test_get_inspection_returns_elp_new_shape(self, session, inspection_id):
        r = session.get(f"{API}/inspections/{inspection_id}")
        assert r.status_code == 200
        doc = r.json()
        assert "_id" not in doc
        assert "elp_assessments" in doc
        assert len(doc["elp_assessments"]) >= 1
        elp = doc["elp_assessments"][0]
        assert elp["overall_disposition"] == "not_proficient"
        assert elp["company_name"] == "ACME Trucking LLC"
        assert elp["usdot_number"] == "1234567"
        assert elp["interview_disposition"] == "inconclusive"
        assert elp["sign_test_result"] == "insufficient"
        # Legacy fields must NOT have been persisted
        assert "driver_name" not in elp
        assert "cdl_number" not in elp
        # per-question answers should have asked + notes (NOT result)
        ans = elp["interview_answers"][0]
        assert "asked" in ans
        assert "notes" in ans
        # per-sign answers should include notes
        sa = elp["sign_answers"][0]
        assert "notes" in sa
        assert "result" in sa

    def test_pydantic_rejects_extra_legacy_fields(self, session, inspection_id):
        """Older clients sending driver_name/cdl_number — extras should be ignored, NOT persisted."""
        payload = {
            "driver_name": "LEGACY DRIVER",  # extra — should be dropped
            "cdl_number": "CDL-LEGACY-9",     # extra — should be dropped
            "company_name": "Legacy Co",
            "usdot_number": "9999",
            "interview_administered": True,
            "interview_disposition": "pass",
            "interview_answers": [],
            "signs_administered": False,
            "sign_test_result": "",
            "sign_pass_count": 0,
            "sign_fail_count": 0,
            "sign_answers": [],
            "overall_disposition": "proficient",
            "citation_ref": "",
            "inspector_notes": "",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "driver_name" not in data
        assert "cdl_number" not in data
        assert data["company_name"] == "Legacy Co"
        # Verify in stored doc as well
        doc = session.get(f"{API}/inspections/{inspection_id}").json()
        stored = next(a for a in doc["elp_assessments"] if a["assessment_id"] == data["assessment_id"])
        assert "driver_name" not in stored
        assert "cdl_number" not in stored

    def test_optional_fields_default_empty(self, session, inspection_id):
        """Posting a minimal payload — all optional fields should default to empty strings / lists."""
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_name"] == ""
        assert data["usdot_number"] == ""
        assert data["interview_disposition"] == ""
        assert data["sign_test_result"] == ""
        assert data["sign_pass_count"] == 0
        assert data["sign_fail_count"] == 0
        assert data["interview_answers"] == []
        assert data["sign_answers"] == []
        # cleanup the stub
        session.delete(f"{API}/inspections/{inspection_id}/elp/{data['assessment_id']}")

    def test_delete_assessment_removes_it(self, session, inspection_id):
        # Add second
        payload = {
            "company_name": "TmpCo",
            "interview_disposition": "pass",
            "overall_disposition": "proficient",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/elp", json=payload)
        assert r.status_code == 200
        second_id = r.json()["assessment_id"]
        first_id = pytest.elp_assessment_id

        doc = session.get(f"{API}/inspections/{inspection_id}").json()
        ids = {a["assessment_id"] for a in doc["elp_assessments"]}
        assert first_id in ids and second_id in ids

        r = session.delete(f"{API}/inspections/{inspection_id}/elp/{first_id}")
        assert r.status_code == 200
        assert r.json().get("ok") is True

        doc = session.get(f"{API}/inspections/{inspection_id}").json()
        ids = {a["assessment_id"] for a in doc["elp_assessments"]}
        assert first_id not in ids
        assert second_id in ids

    def test_save_elp_to_bogus_inspection_returns_404(self, session):
        r = session.post(
            f"{API}/inspections/bogus-nonexistent-id-xyz/elp",
            json={"company_name": "X", "overall_disposition": "proficient"},
        )
        assert r.status_code == 404
