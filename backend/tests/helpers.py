from fastapi.testclient import TestClient
from httpx2 import Response


def sign_in(client: TestClient, name: str = "Ada Lovelace", email: str = "ada@example.com") -> Response:
    return client.post("/api/auth/login", json={"name": name, "email": email})


def nda_values(**overrides) -> dict:
    """NdaValues as the browser sends them: the frontend's defaults, plus overrides."""
    party = {"name": "", "title": "", "company": "", "noticeAddress": ""}
    values = {
        "purpose": "Evaluating whether to enter into a business relationship with the other party.",
        "effectiveDate": "2026-11-26",
        "mndaTerm": "expires",
        "mndaTermYears": 1,
        "confidentialityTerm": "years",
        "confidentialityYears": 1,
        "governingLaw": "",
        "jurisdiction": "",
        "modifications": "",
        "parties": [dict(party), dict(party)],
    }
    return values | overrides


class StubLlm:
    """Returns a fixed answer and records what it was asked."""

    def __init__(self, answer: dict | Exception) -> None:
        self.answer = answer
        self.calls: list[dict] = []

    def complete_json(self, messages, schema, schema_name):
        self.calls.append({"messages": messages, "schema": schema, "schema_name": schema_name})
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer
