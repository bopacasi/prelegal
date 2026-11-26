from fastapi.testclient import TestClient
from httpx2 import Response


def sign_in(client: TestClient, name: str = "Ada Lovelace", email: str = "ada@example.com") -> Response:
    return client.post("/api/auth/login", json={"name": name, "email": email})
