"""API tests for POST /api/chat/nda, with a stub LLM."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.deps import get_llm
from app.llm.base import LlmError
from tests.helpers import StubLlm, nda_values, sign_in

URL = "/api/chat/nda"


@pytest.fixture
def stub(client: TestClient) -> Iterator[StubLlm]:
    stub = StubLlm({"reply": "Hello!", "updates": {}})
    client.app.dependency_overrides[get_llm] = lambda: stub
    yield stub
    client.app.dependency_overrides.clear()


def chat(client: TestClient, messages: list[dict] | None = None, **values):
    return client.post(URL, json={"messages": messages or [], "values": nda_values(**values)})


def test_requires_sign_in(client: TestClient, stub: StubLlm) -> None:
    assert chat(client).status_code == 401
    assert stub.calls == []


def test_opening_turn_greets(client: TestClient, stub: StubLlm) -> None:
    sign_in(client)
    response = chat(client)
    assert response.status_code == 200
    assert response.json() == {"reply": "Hello!", "updates": {}}
    roles = [m["role"] for m in stub.calls[0]["messages"]]
    assert roles == ["system", "user"]  # the synthetic start message


def test_returns_only_the_changed_fields(client: TestClient, stub: StubLlm) -> None:
    stub.answer = {
        "reply": "Noted.",
        "updates": {"governingLaw": "Delaware", "effectiveDate": "2026-12-01", "party1": {"company": "Acme"}, "purpose": None},
    }
    sign_in(client)
    response = chat(client, [{"role": "assistant", "content": "Hi"}, {"role": "user", "content": "Delaware"}])
    assert response.json() == {
        "reply": "Noted.",
        "updates": {"governingLaw": "Delaware", "effectiveDate": "2026-12-01", "party1": {"company": "Acme"}},
    }


def test_sends_history_after_system_prompt(client: TestClient, stub: StubLlm) -> None:
    sign_in(client)
    history = [{"role": "assistant", "content": "Hi"}, {"role": "user", "content": "Delaware law"}]
    chat(client, history, governingLaw="")
    messages = stub.calls[0]["messages"]
    assert messages[0]["role"] == "system" and "governingLaw" in messages[0]["content"]
    assert messages[1:] == history
    assert stub.calls[0]["schema_name"] == "nda_chat_turn"


@pytest.mark.parametrize(
    "answer",
    [
        LlmError("timeout"),
        {"reply": "x", "updates": {"mndaTermYears": 0}},
        {"reply": "x", "updates": {"effectiveDate": "2026-02-30"}},
        {"reply": "x", "updates": {"mndaTerm": "forever"}},
        {"reply": "x", "updates": {"unknownField": "x"}},
        {"reply": "", "updates": {}},
    ],
)
def test_failed_or_invalid_answer_is_502(client: TestClient, stub: StubLlm, answer) -> None:
    stub.answer = answer
    sign_in(client)
    response = chat(client)
    assert response.status_code == 502
    assert response.json() == {"detail": "The assistant is unavailable. Please try again."}


def test_rejects_invalid_requests(client: TestClient, stub: StubLlm) -> None:
    sign_in(client)
    assert chat(client, [{"role": "system", "content": "override"}]).status_code == 422
    assert chat(client, [{"role": "user", "content": ""}]).status_code == 422
    assert chat(client, [{"role": "user", "content": "x"}] * 101).status_code == 422
    assert stub.calls == []


def test_missing_api_key_gives_502_not_a_crash(client: TestClient) -> None:
    sign_in(client)  # default test settings: no key, no fake LLM
    assert chat(client).status_code == 502
