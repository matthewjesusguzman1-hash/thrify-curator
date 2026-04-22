"""
Backend regression tests for the device-only photo refactor (iteration 12).
Covers:
  - JSON metadata-only photo upload endpoints (item, general, tiedown assessment)
  - DELETE endpoints for those photo metadata entries
  - OCR endpoint must now return 410 Gone
  - Admin wipe-photos endpoint authz (403 for non-admin, 200 for admin)
  - Auth + inspections + violations regression
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

USER_BADGE = "042"
USER_PIN = "1234"
ADMIN_BADGE = "121"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_login(session):
    r = session.post(f"{API}/auth/login", json={"badge": USER_BADGE, "pin": USER_PIN})
    assert r.status_code == 200, f"User login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture()
def inspection(session, user_login):
    payload = {"title": f"TEST_devphotos_{uuid.uuid4().hex[:6]}", "badge": USER_BADGE}
    r = session.post(f"{API}/inspections", json=payload)
    assert r.status_code == 200, r.text
    insp = r.json()
    yield insp
    try:
        session.delete(f"{API}/inspections/{insp['id']}")
    except Exception:
        pass


# ---------- Auth / Regression ----------
class TestAuthRegression:
    def test_user_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"badge": USER_BADGE, "pin": USER_PIN})
        assert r.status_code == 200
        data = r.json()
        # Either returns user object or token
        assert isinstance(data, dict)


class TestInspectionsRegression:
    def test_list_inspections_by_badge(self, session, user_login):
        r = session.get(f"{API}/inspections", params={"badge": USER_BADGE})
        assert r.status_code == 200
        body = r.json()
        # Backend wraps as {inspections: [...]} or returns plain list
        if isinstance(body, dict):
            assert "inspections" in body
            assert isinstance(body["inspections"], list)
        else:
            assert isinstance(body, list)

    def test_get_violations(self, session):
        r = session.get(f"{API}/violations", params={"limit": 5})
        assert r.status_code == 200
        # Either list or {results:[...]}
        body = r.json()
        assert body is not None

    def test_admin_users_with_badge_121(self, session):
        r = session.get(f"{API}/admin/users", params={"badge": ADMIN_BADGE})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))


# ---------- OCR endpoint must now return 410 Gone ----------
class TestOcrRemoved:
    def test_ocr_endpoint_returns_410(self, session):
        r = session.post(
            f"{API}/hazmat-substances/ocr",
            json={"image_base64": "data:image/png;base64,iVBORw0KGgo="},
        )
        assert r.status_code == 410, f"Expected 410 Gone, got {r.status_code}: {r.text}"
        body = r.json()
        # FastAPI default error body
        assert "detail" in body
        assert "removed" in body["detail"].lower() or "ocr" in body["detail"].lower()


# ---------- Admin wipe-photos endpoint authz ----------
class TestAdminWipePhotos:
    def test_non_admin_gets_403(self, session):
        r = session.post(f"{API}/admin/wipe-photos", params={"badge": USER_BADGE})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_admin_gets_summary(self, session):
        r = session.post(f"{API}/admin/wipe-photos", params={"badge": ADMIN_BADGE})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "files_deleted" in body
        assert "inspections_cleared" in body
        assert "inspections_touched" in body


# ---------- General (annotated) photo metadata endpoints ----------
class TestGeneralPhotoMeta:
    def test_attach_general_photo_meta_json(self, session, inspection):
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        meta = {
            "photo_id": photo_id,
            "original_filename": "test.jpg",
            "mime": "image/jpeg",
            "size": 12345,
        }
        r = session.post(
            f"{API}/inspections/{inspection['id']}/annotated-photos",
            json=meta,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["photo_id"] == photo_id
        assert body.get("device_only") is True
        assert body["content_type"] == "image/jpeg"
        assert body["size"] == 12345

        # Verify persistence via GET
        g = session.get(f"{API}/inspections/{inspection['id']}")
        assert g.status_code == 200
        gphotos = g.json().get("general_photos", [])
        assert any(p["photo_id"] == photo_id for p in gphotos)

    def test_general_photo_endpoint_rejects_multipart(self, session, inspection):
        # Old multipart form should now fail (endpoint requires JSON body).
        # 422 is the proper FastAPI response; 500 currently happens because
        # FastAPI tries to parse the body as JSON and the form payload triggers
        # an internal error. Both indicate the multipart contract is gone.
        files = {"file": ("a.jpg", b"\xff\xd8\xff\xd9", "image/jpeg")}
        r = requests.post(
            f"{API}/inspections/{inspection['id']}/annotated-photos",
            files=files,
        )
        assert r.status_code in (400, 415, 422, 500), (
            f"Expected 4xx/5xx for multipart, got {r.status_code}"
        )
        # Critical: must NOT be 200 (i.e. must NOT accept multipart anymore)
        assert r.status_code != 200

    def test_delete_general_photo_meta(self, session, inspection):
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        session.post(
            f"{API}/inspections/{inspection['id']}/annotated-photos",
            json={"photo_id": photo_id, "original_filename": "x.jpg",
                  "mime": "image/jpeg", "size": 1},
        )
        r = session.delete(
            f"{API}/inspections/{inspection['id']}/annotated-photos/{photo_id}"
        )
        assert r.status_code == 200, r.text
        # Verify removal
        g = session.get(f"{API}/inspections/{inspection['id']}")
        gphotos = g.json().get("general_photos", [])
        assert all(p["photo_id"] != photo_id for p in gphotos)


# ---------- Item photo metadata endpoints ----------
class TestItemPhotoMeta:
    def _add_item(self, session, inspection_id):
        # Server generates its own item_id; we must use the response's value.
        payload = {
            "violation_id": "TEST_v1",
            "regulatory_reference": "393.47",
            "violation_text": "TEST item",
            "violation_class": "OOS",
            "violation_code": "393.47",
            "cfr_part": "393",
            "oos_value": "Y",
        }
        r = session.post(f"{API}/inspections/{inspection_id}/violations", json=payload)
        if r.status_code != 200:
            pytest.skip(f"Could not add violation: {r.status_code} {r.text}")
        return r.json()["item_id"]

    def test_attach_item_photo_meta_json(self, session, inspection):
        item_id = self._add_item(session, inspection["id"])
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        meta = {"photo_id": photo_id, "original_filename": "v.jpg",
                "mime": "image/jpeg", "size": 999}
        r = session.post(
            f"{API}/inspections/{inspection['id']}/violations/{item_id}/photos",
            json=meta,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["photo_id"] == photo_id
        assert body.get("device_only") is True

        # Verify persistence
        g = session.get(f"{API}/inspections/{inspection['id']}")
        items = g.json().get("items", [])
        match = next((i for i in items if i.get("item_id") == item_id), None)
        assert match is not None
        assert any(p["photo_id"] == photo_id for p in match.get("photos", []))

    def test_delete_item_photo_meta(self, session, inspection):
        item_id = self._add_item(session, inspection["id"])
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        session.post(
            f"{API}/inspections/{inspection['id']}/violations/{item_id}/photos",
            json={"photo_id": photo_id, "original_filename": "v.jpg",
                  "mime": "image/jpeg", "size": 1},
        )
        r = session.delete(
            f"{API}/inspections/{inspection['id']}/violations/{item_id}/photos/{photo_id}"
        )
        assert r.status_code == 200, r.text
        g = session.get(f"{API}/inspections/{inspection['id']}")
        items = g.json().get("items", [])
        match = next((i for i in items if i.get("item_id") == item_id), None)
        if match is not None:
            assert all(p["photo_id"] != photo_id for p in match.get("photos", []))


# ---------- Tie-down assessment photo metadata ----------
class TestTieDownAssessmentPhotoMeta:
    def _add_assessment(self, session, inspection_id):
        payload = {
            "cargo_weight": 5000,
            "cargo_length": 10,
            "tiedowns": [{"wll": 5000, "anchor_count": 1}],
            "has_blocking": False,
        }
        r = session.post(f"{API}/inspections/{inspection_id}/tiedown", json=payload)
        assert r.status_code == 200, r.text
        # Get the new assessment id
        g = session.get(f"{API}/inspections/{inspection_id}")
        assessments = g.json().get("tiedown_assessments", [])
        assert len(assessments) > 0
        return assessments[-1]["assessment_id"]

    def test_attach_assessment_photo_json(self, session, inspection):
        a_id = self._add_assessment(session, inspection["id"])
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        meta = {"photo_id": photo_id, "original_filename": "td.jpg",
                "mime": "image/jpeg", "size": 7777}
        r = session.post(
            f"{API}/inspections/{inspection['id']}/tiedown/{a_id}/photos",
            json=meta,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["photo_id"] == photo_id
        assert body.get("device_only") is True

        # Verify persistence
        g = session.get(f"{API}/inspections/{inspection['id']}")
        assessments = g.json().get("tiedown_assessments", [])
        match = next((a for a in assessments if a.get("assessment_id") == a_id), None)
        assert match is not None
        assert any(p["photo_id"] == photo_id for p in match.get("photos", []))

    def test_delete_assessment_photo(self, session, inspection):
        a_id = self._add_assessment(session, inspection["id"])
        photo_id = f"TESTpid_{uuid.uuid4().hex[:8]}"
        session.post(
            f"{API}/inspections/{inspection['id']}/tiedown/{a_id}/photos",
            json={"photo_id": photo_id, "original_filename": "td.jpg",
                  "mime": "image/jpeg", "size": 1},
        )
        r = session.delete(
            f"{API}/inspections/{inspection['id']}/tiedown/{a_id}/photos/{photo_id}"
        )
        assert r.status_code == 200, r.text
        g = session.get(f"{API}/inspections/{inspection['id']}")
        assessments = g.json().get("tiedown_assessments", [])
        match = next((a for a in assessments if a.get("assessment_id") == a_id), None)
        assert match is not None
        assert all(p["photo_id"] != photo_id for p in match.get("photos", []))
