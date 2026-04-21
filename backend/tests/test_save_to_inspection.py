"""Tests for Save-to-Inspection flows: HOS, TieDown, BridgeChart annotated-photos."""
import base64
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://violation-navigator.preview.emergentagent.com").rstrip("/")
BADGE = "042"

# Smallest valid PNG (1x1 transparent)
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def created_inspection_ids():
    ids = []
    yield ids
    # Cleanup
    for iid in ids:
        try:
            requests.delete(f"{BASE_URL}/api/inspections/{iid}", timeout=10)
        except Exception:
            pass


def _create_inspection(session, title, created_inspection_ids):
    r = session.post(
        f"{BASE_URL}/api/inspections",
        json={"title": title, "badge": BADGE},
        timeout=15,
    )
    assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text}"
    body = r.json()
    assert "id" in body
    iid = body["id"]
    created_inspection_ids.append(iid)
    return iid


# ---------- HOS ----------
class TestHosSaveToInspection:
    def test_save_hos_and_persist(self, session, created_inspection_ids):
        iid = _create_inspection(session, "TEST_HOS_Insp", created_inspection_ids)

        days = [
            {"date": f"2026-01-{i+1:02d}", "day_label": f"Day {i+1}", "drive": 0, "on_duty": 10, "total": 10}
            for i in range(8)
        ]
        payload = {
            "rule_type": "property",
            "limit_hours": 70,
            "day_count": 8,
            "days": days,
            "total_hours": 80,
            "is_oos": True,
            "over_by": 10,
            "hours_left_today": 0,
            "recovery_steps": [
                {"step_num": 1, "description": "Rest 10h", "oos_hours": 10, "running_total": 10, "passes": True, "gained": 10, "available": 0}
            ],
            "oos_duration": 10,
            "recommend_restart": False,
            "notes": "TEST_HOS",
        }
        r = session.post(f"{BASE_URL}/api/inspections/{iid}/hos", json=payload, timeout=15)
        assert r.status_code == 200, f"hos save failed: {r.status_code} {r.text}"
        assess = r.json()
        assert "assessment_id" in assess
        assert assess["rule_type"] == "property"
        assert assess["limit_hours"] == 70
        assert assess["total_hours"] == 80
        assert assess["is_oos"] is True
        assert len(assess["days"]) == 8
        assert len(assess["recovery_steps"]) >= 1

        # GET via list endpoint with badge
        r2 = session.get(f"{BASE_URL}/api/inspections?badge={BADGE}", timeout=15)
        assert r2.status_code == 200
        listing = r2.json()
        match = next((i for i in listing.get("inspections", []) if i["id"] == iid), None)
        assert match is not None, "Inspection not found in badge listing"
        # hos_assessments may not be in listing summary; fetch detail
        r3 = session.get(f"{BASE_URL}/api/inspections/{iid}", timeout=15)
        assert r3.status_code == 200
        detail = r3.json()
        assert "hos_assessments" in detail
        assert len(detail["hos_assessments"]) == 1
        h = detail["hos_assessments"][0]
        assert h["rule_type"] == "property"
        assert h["limit_hours"] == 70
        assert h["total_hours"] == 80
        assert h["is_oos"] is True
        assert len(h["days"]) == 8
        assert len(h["recovery_steps"]) >= 1


# ---------- TieDown ----------
class TestTieDownSaveToInspection:
    def test_save_tiedown_and_persist(self, session, created_inspection_ids):
        iid = _create_inspection(session, "TEST_TD_Insp", created_inspection_ids)
        payload = {
            "cargo_weight": 5000,
            "cargo_length": 10,
            "has_blocking": False,
            "tiedowns": [{"wll": 5000, "type": "chain", "qty": 2}],
            "photos": [],
        }
        r = session.post(f"{BASE_URL}/api/inspections/{iid}/tiedown", json=payload, timeout=15)
        assert r.status_code == 200, f"tiedown save failed: {r.status_code} {r.text}"
        assess = r.json()
        assert "assessment_id" in assess

        r3 = session.get(f"{BASE_URL}/api/inspections/{iid}", timeout=15)
        assert r3.status_code == 200
        detail = r3.json()
        assert "tiedown_assessments" in detail
        assert len(detail["tiedown_assessments"]) == 1


# ---------- Bridge Chart annotated-photos ----------
class TestBridgeChartAnnotatedPhotos:
    def test_upload_annotated_photo(self, session, created_inspection_ids):
        iid = _create_inspection(session, "TEST_BC_Insp", created_inspection_ids)
        files = {"file": ("weight.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/inspections/{iid}/annotated-photos",
            files=files,
            timeout=30,
        )
        assert r.status_code == 200, f"annotated upload failed: {r.status_code} {r.text}"
        photo = r.json()
        assert "photo_id" in photo
        assert "storage_path" in photo

        r3 = requests.get(f"{BASE_URL}/api/inspections/{iid}", timeout=15)
        assert r3.status_code == 200
        detail = r3.json()
        assert "general_photos" in detail
        assert len(detail["general_photos"]) >= 1


# ---------- Auth (regression) ----------
class TestAuthRegression:
    def test_login_works(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"badge": BADGE, "pin": "1234"}, timeout=15)
        assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
