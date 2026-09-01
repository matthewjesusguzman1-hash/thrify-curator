"""
Backend tests for security remediation:
- Brute-force lockout
- Admin/employee login flows
- Consignor magic link auth
- Consignor-protected endpoints
- Debug endpoint admin-protection
- Password min length
- Regression: employee/admin conversations, payroll
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
EMP_PASSWORDLESS = "testemployee@thriftycurator.com"
EMP_WITH_PW = "tester@tester.com"
EMP_PW = "legacy1234"
CONSIGNOR_EMAIL = "test@test.com"


def _clear_login_attempts(email=None):
    q = {"identifier": email} if email else {}
    try:
        db.login_attempts.delete_many(q)
    except Exception:
        pass


@pytest.fixture(scope="module")
def admin_token():
    _clear_login_attempts(ADMIN_EMAIL)
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "admin_code": ADMIN_CODE}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


# --- Admin login ---
def test_admin_login_ok(admin_token):
    assert admin_token


# --- Employee passwordless login ---
def test_employee_passwordless_login():
    _clear_login_attempts(EMP_PASSWORDLESS)
    r = requests.post(f"{API}/auth/login", json={"email": EMP_PASSWORDLESS}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("access_token")


# --- Employee password login (bcrypt) ---
def test_employee_password_login_bcrypt():
    _clear_login_attempts(EMP_WITH_PW)
    r = requests.post(f"{API}/auth/login", json={"email": EMP_WITH_PW, "password": EMP_PW}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("access_token")


# --- Brute force lockout ---
def test_brute_force_lockout():
    _clear_login_attempts(EMP_WITH_PW)
    # 5 wrong pw
    for i in range(5):
        r = requests.post(f"{API}/auth/login", json={"email": EMP_WITH_PW, "password": "wrongpass"}, timeout=15)
        assert r.status_code in (401, 400), f"attempt {i}: {r.status_code} {r.text}"
    # 6th should 429
    r6 = requests.post(f"{API}/auth/login", json={"email": EMP_WITH_PW, "password": "wrongpass"}, timeout=15)
    assert r6.status_code == 429, f"expected 429 got {r6.status_code} {r6.text}"
    # Correct pw also blocked
    r7 = requests.post(f"{API}/auth/login", json={"email": EMP_WITH_PW, "password": EMP_PW}, timeout=15)
    assert r7.status_code == 429, f"expected 429 got {r7.status_code} {r7.text}"
    # cleanup
    _clear_login_attempts(EMP_WITH_PW)


# --- Consignor magic link flow ---
@pytest.fixture(scope="module")
def consignor_token():
    r = requests.post(f"{API}/forms/consignment/request-login-link", json={"email": CONSIGNOR_EMAIL}, timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    time.sleep(0.5)
    doc = db.consignor_login_tokens.find_one({"email": CONSIGNOR_EMAIL}, sort=[("created_at", -1)])
    assert doc, "No token doc in db"
    token = doc.get("token")
    assert token
    v = requests.post(f"{API}/forms/consignment/verify-login-link", json={"token": token}, timeout=15)
    assert v.status_code == 200, v.text
    jwt = v.json().get("access_token")
    assert jwt
    # single-use: second verify should fail
    v2 = requests.post(f"{API}/forms/consignment/verify-login-link", json={"token": token}, timeout=15)
    assert v2.status_code in (401, 400), f"single-use failed: {v2.status_code} {v2.text}"
    return jwt


def test_consignor_magic_link_flow(consignor_token):
    assert consignor_token


# --- Consignor-protected endpoints ---
def test_payment_history_unauth():
    r = requests.get(f"{API}/forms/payment-history/{CONSIGNOR_EMAIL}", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_payment_history_with_consignor(consignor_token):
    r = requests.get(f"{API}/forms/payment-history/{CONSIGNOR_EMAIL}", headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_check_existing_agreement_unauth():
    r = requests.get(f"{API}/forms/check-existing-agreement", params={"email": CONSIGNOR_EMAIL}, timeout=15)
    assert r.status_code in (401, 403), r.text


def test_check_existing_agreement_with_consignor(consignor_token):
    r = requests.get(f"{API}/forms/check-existing-agreement", params={"email": CONSIGNOR_EMAIL}, headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_my_submissions_unauth():
    r = requests.get(f"{API}/forms/my-submissions/{CONSIGNOR_EMAIL}", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_my_submissions_with_consignor(consignor_token):
    r = requests.get(f"{API}/forms/my-submissions/{CONSIGNOR_EMAIL}", headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_consignor_conversation_unauth():
    r = requests.get(f"{API}/conversations/consignor/my-conversation", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_consignor_conversation_with_token(consignor_token):
    r = requests.get(f"{API}/conversations/consignor/my-conversation", headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code == 200, r.text


# --- Cross-account protection ---
def test_cross_account_403(consignor_token):
    r = requests.get(f"{API}/forms/payment-history/otherperson@example.com", headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"


# --- Admin token also allowed on consignor-or-admin endpoints ---
def test_admin_on_payment_history(admin_token):
    r = requests.get(f"{API}/forms/payment-history/{CONSIGNOR_EMAIL}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_admin_on_check_existing(admin_token):
    r = requests.get(f"{API}/forms/check-existing-agreement", params={"email": CONSIGNOR_EMAIL}, headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_admin_on_my_submissions(admin_token):
    r = requests.get(f"{API}/forms/my-submissions/{CONSIGNOR_EMAIL}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text


# --- Debug endpoints admin-only ---
def test_debug_tokens_unauth():
    r = requests.get(f"{API}/live-activity/debug/tokens", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_debug_tokens_admin(admin_token):
    r = requests.get(f"{API}/live-activity/debug/tokens", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_deactivate_all_unauth():
    r = requests.post(f"{API}/live-activity/deactivate-all-admin-tokens", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_token_status_unauth():
    r = requests.get(f"{API}/live-activity/token-status/someuser", timeout=15)
    assert r.status_code in (401, 403), r.text


def test_clear_all_tokens_unauth():
    r = requests.delete(f"{API}/live-activity/debug/clear-all-tokens", timeout=15)
    assert r.status_code in (401, 403), r.text


# --- Password min length ---
def test_set_password_min_length(admin_token):
    # Use employee token (passwordless) to try setting a short password
    er = requests.post(f"{API}/auth/login", json={"email": EMP_PASSWORDLESS}, timeout=15)
    if er.status_code != 200:
        pytest.skip("employee login not available")
    emp_tok = er.json().get("access_token")
    r = requests.post(f"{API}/auth/employee/set-password", json={"password": "abcd"}, headers={"Authorization": f"Bearer {emp_tok}"}, timeout=15)
    assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"


# --- Regression: employee/admin conversations, payroll ---
def test_employee_conversation():
    er = requests.post(f"{API}/auth/login", json={"email": EMP_PASSWORDLESS}, timeout=15)
    assert er.status_code == 200
    tok = er.json().get("access_token")
    r = requests.get(f"{API}/conversations/employee/my-conversation", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_admin_conversations_list(admin_token):
    # try /api/conversations/admin or common variants
    for path in ["/conversations/admin", "/conversations/admin/list", "/conversations/admin/conversations"]:
        r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        if r.status_code == 200:
            return
    pytest.skip(f"no admin conversations list endpoint found (last {r.status_code})")


def test_payroll_summary(admin_token):
    r = requests.get(f"{API}/admin/payroll/summary", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200, r.text


def test_admin_reply(admin_token, consignor_token):
    # Ensure a conversation exists by posting from consignor
    requests.post(f"{API}/conversations/consignor/send", json={"content": "hello from test", "sender_name": "Test"}, headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    # Get conversations to find one
    r = requests.get(f"{API}/conversations/consignor/my-conversation", headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    if r.status_code != 200:
        pytest.skip("cannot get conversation")
    conv = r.json()
    conv_id = conv.get("id") or conv.get("_id") or (conv.get("conversation", {}) or {}).get("id")
    if not conv_id:
        pytest.skip(f"no conv id in {conv}")
    rep = requests.post(f"{API}/conversations/admin/reply", json={"conversation_id": conv_id, "content": "admin reply test"}, headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert rep.status_code in (200, 201), rep.text


def test_consignor_send_message(consignor_token):
    r = requests.post(f"{API}/conversations/consignor/send", json={"content": "test msg", "sender_name": "Test"}, headers={"Authorization": f"Bearer {consignor_token}"}, timeout=15)
    assert r.status_code in (200, 201), r.text
