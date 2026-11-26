"""End-to-end tests of the running stack: frontend -> /api rewrite -> backend -> database.

Requests go to the frontend, as a browser's would. Run with scripts/test.sh.
"""

import os
import uuid
from collections.abc import Iterator

import httpx2
import pytest

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
COOKIE = "prelegal_session"


@pytest.fixture
def browser() -> Iterator[httpx2.Client]:
    """A client that keeps cookies and doesn't follow redirects."""
    with httpx2.Client(base_url=FRONTEND_URL, timeout=10) as client:
        yield client


@pytest.fixture
def user() -> dict[str, str]:
    return {"name": "Ada Lovelace", "email": f"ada-{uuid.uuid4().hex[:8]}@example.com"}


def sign_in(browser: httpx2.Client, user: dict[str, str]) -> str:
    response = browser.post("/api/auth/login", json=user)
    assert response.status_code == 200, response.text
    return browser.cookies[COOKIE]


def assert_redirects(response: httpx2.Response, path: str) -> None:
    assert response.status_code in (302, 303, 307, 308), response.status_code
    assert response.headers["location"].endswith(path)


def test_backend_is_healthy() -> None:
    assert httpx2.get(f"{BACKEND_URL}/api/health").json() == {"status": "ok"}


def test_frontend_proxies_api_to_backend(browser: httpx2.Client) -> None:
    assert browser.get("/api/health").json() == {"status": "ok"}


def test_signed_out_user_is_sent_to_login(browser: httpx2.Client) -> None:
    assert_redirects(browser.get("/"), "/login")
    assert_redirects(browser.get("/nda"), "/login")
    login_page = browser.get("/login")
    assert login_page.status_code == 200
    assert "Sign in" in login_page.text


def test_sign_in_brings_user_into_the_platform(browser: httpx2.Client, user: dict[str, str]) -> None:
    sign_in(browser, user)
    assert browser.get("/api/users/me").json()["name"] == user["name"]
    assert_redirects(browser.get("/"), "/nda")
    assert_redirects(browser.get("/login"), "/nda")

    page = browser.get("/nda")
    assert page.status_code == 200
    assert "Signed in as" in page.text and user["name"] in page.text
    # The NDA creator is unchanged, with the Standard Terms read from the dataset.
    assert "Mutual NDA Creator" in page.text and "Equitable Relief" in page.text


def test_sign_out_ends_the_session(browser: httpx2.Client, user: dict[str, str]) -> None:
    token = sign_in(browser, user)
    assert browser.post("/api/auth/logout").status_code == 204
    assert browser.get("/api/users/me").status_code == 401

    # The old cookie no longer works, and doesn't cause a redirect loop.
    browser.cookies.set(COOKIE, token)
    assert_redirects(browser.get("/nda"), "/login")
    assert browser.get("/login").status_code == 200
