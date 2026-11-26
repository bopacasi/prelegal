"""The frontend while the backend is stopped. scripts/test.sh stops it first."""

import os

import httpx2

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
COOKIE = "prelegal_session"  # must match backend/app/config.py


def test_backend_down_shows_message_instead_of_error() -> None:
    with httpx2.Client(base_url=FRONTEND_URL, timeout=10) as browser:
        browser.cookies.set(COOKIE, "token-from-before")

        login = browser.get("/login")
        assert login.status_code == 200 and "Sign in" in login.text

        page = browser.get("/nda")
        assert page.status_code == 200
        assert "temporarily unavailable" in page.text
