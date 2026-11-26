"""API tests: health, fake login, current user and logout."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.conftest import sign_in


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_sets_http_only_session_cookie(client: TestClient) -> None:
    response = sign_in(client)
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "Ada Lovelace", "email": "ada@example.com"}
    cookie = response.headers["set-cookie"]
    assert cookie.startswith("prelegal_session=")
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie


def test_me_returns_signed_in_user(client: TestClient) -> None:
    sign_in(client)
    response = client.get("/api/users/me")
    assert response.status_code == 200
    assert response.json()["name"] == "Ada Lovelace"


def test_me_requires_session(client: TestClient) -> None:
    assert client.get("/api/users/me").status_code == 401
    client.cookies.set("prelegal_session", "not-a-real-token")
    assert client.get("/api/users/me").status_code == 401


def test_login_again_updates_name_of_same_user(client: TestClient) -> None:
    first = sign_in(client).json()
    second = sign_in(client, name="Ada King", email="ADA@example.com").json()
    assert second == {"id": first["id"], "name": "Ada King", "email": "ada@example.com"}


def test_login_rejects_blank_fields(client: TestClient) -> None:
    assert sign_in(client, name="  ").status_code == 422
    assert sign_in(client, email="").status_code == 422


def test_logout_ends_session(client: TestClient) -> None:
    sign_in(client)
    response = client.post("/api/auth/logout")
    assert response.status_code == 204
    assert 'prelegal_session=""' in response.headers["set-cookie"]
    assert client.get("/api/users/me").status_code == 401


def test_logout_without_session_is_harmless(client: TestClient) -> None:
    assert client.post("/api/auth/logout").status_code == 204


def test_database_starts_empty_on_each_start(settings: Settings) -> None:
    with TestClient(create_app(settings)) as client:
        sign_in(client)
        token = client.cookies["prelegal_session"]
    with TestClient(create_app(settings)) as restarted:
        restarted.cookies.set("prelegal_session", token)
        assert restarted.get("/api/users/me").status_code == 401
