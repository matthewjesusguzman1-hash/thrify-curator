"""
Shared pytest fixtures for backend tests
"""
import pytest
import requests
import os

# Set BASE_URL from REACT_APP_BACKEND_URL or default to preview URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://thrifty-curator-7.preview.emergentagent.com').rstrip('/')

# Admin credentials for testing
ADMIN_EMAIL = "matthewjesusguzman1@gmail.com"
ADMIN_CODE = "4399"
ADMIN_2_EMAIL = "euniceguzman@thriftycurator.com"
ADMIN_2_CODE = "0826"


@pytest.fixture(scope="module")
def base_url():
    """Return the base URL for API calls"""
    return BASE_URL


@pytest.fixture(scope="module")
def auth_token(base_url):
    """Get authentication token for admin user"""
    response = requests.post(f"{base_url}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="function")
def fresh_auth_token(base_url):
    """Get a fresh authentication token (function-scoped)"""
    response = requests.post(f"{base_url}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "admin_code": ADMIN_CODE
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]
