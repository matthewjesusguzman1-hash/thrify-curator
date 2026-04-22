"""Backend regression for Lite Mode (level_iii filter) and Quick Photos save flow."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://violation-navigator.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def stats():
    r = requests.get(f"{API}/violations/stats", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- /api/stats ----------
class TestStats:
    def test_stats_has_level_iii_count(self, stats):
        assert "level_iii_count" in stats, f"Missing level_iii_count, keys: {list(stats.keys())}"
        assert isinstance(stats["level_iii_count"], int)
        # Soft assertion: should be > 0 if dataset seeded
        print(f"level_iii_count={stats['level_iii_count']}, total={stats.get('total_violations')}")


# ---------- /api/violations/tree ----------
class TestViolationsTree:
    def test_tree_full(self):
        r = requests.get(f"{API}/violations/tree", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_tree_level_iii_filter(self, stats):
        if stats.get("level_iii_count", 0) == 0:
            pytest.skip("No level_iii=Y data seeded; cannot validate filter")
        full = requests.get(f"{API}/violations/tree", timeout=60).json()
        filt = requests.get(f"{API}/violations/tree?level_iii=Y", timeout=60).json()

        def total_count(resp):
            tree = resp.get("tree", resp) if isinstance(resp, dict) else {}
            return sum((cls.get("count", 0) for cls in tree.values() if isinstance(cls, dict)))

        full_n = total_count(full)
        filt_n = total_count(filt)
        print(f"full count={full_n}, filtered count={filt_n}")
        assert full_n > 0, "Full tree should have items"
        assert filt_n > 0, "Filtered tree should contain some level III items"
        assert filt_n < full_n, f"Filtered ({filt_n}) should be < full ({full_n})"
        # Should match stats level_iii_count (approximately)
        assert filt_n == stats["level_iii_count"], f"tree filtered count {filt_n} != stats level_iii_count {stats['level_iii_count']}"


# ---------- /api/violations list ----------
class TestViolationsList:
    def test_violations_level_iii_filter(self):
        r = requests.get(f"{API}/violations?level_iii=Y&page=1", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Find list of items
        items = data.get("violations") or data.get("items") or data.get("results") or []
        if not items:
            pytest.skip("Empty list returned; cannot validate field")
        for v in items[:20]:
            assert str(v.get("level_iii", "")).upper() == "Y", f"Non-Y item leaked: {v}"


# ---------- Quick Photos -> Inspection metadata ----------
class TestQuickPhotosToInspection:
    BADGE = "042"

    def test_create_inspection_and_attach_photo_meta(self):
        # 1) Create inspection
        r = requests.post(f"{API}/inspections", json={"title": "TEST_quickphotos_inspection", "badge": self.BADGE}, timeout=30)
        assert r.status_code in (200, 201), r.text
        insp = r.json()
        insp_id = insp.get("id") or insp.get("_id")
        assert insp_id

        # 2) Attach a device-only photo metadata
        photo_meta = {
            "photo_id": "qp_test_photo_1",
            "original_filename": "test.jpg",
            "mime": "image/jpeg",
            "size": 12345,
        }
        r2 = requests.post(f"{API}/inspections/{insp_id}/annotated-photos", json=photo_meta, timeout=30)
        assert r2.status_code in (200, 201), r2.text
        body = r2.json()
        assert body.get("device_only") is True or "photo_id" in body

        # 3) GET inspection and confirm
        r3 = requests.get(f"{API}/inspections/{insp_id}", timeout=30)
        assert r3.status_code == 200
        got = r3.json()
        photos = got.get("general_photos") or got.get("annotated_photos") or []
        assert any(p.get("photo_id") == "qp_test_photo_1" for p in photos), f"Photo not attached, photos={photos}"

        # cleanup
        requests.delete(f"{API}/inspections/{insp_id}", timeout=15)
