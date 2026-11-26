"""The NDA assistant through the frontend, with the backend's scripted LLM (FAKE_LLM=true).

The scripted LLM greets first, sets fields from "field: value" lines, and fails
on FAKE_LLM_FAIL (see backend/app/llm/fake.py).
"""

import os
import uuid
from collections.abc import Iterator

import httpx2
import pytest

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
GREETING = "Hi! I'll help you prepare a Mutual NDA. What is the purpose of the agreement?"
PARTY = {"name": "", "title": "", "company": "", "noticeAddress": ""}
VALUES = {
    "purpose": "Evaluating whether to enter into a business relationship with the other party.",
    "effectiveDate": "2026-11-26",
    "mndaTerm": "expires",
    "mndaTermYears": 1,
    "confidentialityTerm": "years",
    "confidentialityYears": 1,
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
    "parties": [PARTY, PARTY],
}


@pytest.fixture
def browser() -> Iterator[httpx2.Client]:
    with httpx2.Client(base_url=FRONTEND_URL, timeout=10) as client:
        email = f"chat-{uuid.uuid4().hex[:8]}@example.com"
        assert client.post("/api/auth/login", json={"name": "Ada", "email": email}).status_code == 200
        yield client


def chat(client: httpx2.Client, messages: list[dict]) -> httpx2.Response:
    return client.post("/api/chat/nda", json={"messages": messages, "values": VALUES})


def test_nda_page_shows_the_assistant(browser: httpx2.Client) -> None:
    page = browser.get("/nda")
    assert page.status_code == 200
    assert "Assistant" in page.text and "Your message" in page.text


def test_assistant_greets_then_fills_in_fields(browser: httpx2.Client) -> None:
    opening = chat(browser, [])
    assert opening.status_code == 200
    assert opening.json() == {"reply": GREETING, "updates": {}}

    history = [
        {"role": "assistant", "content": GREETING},
        {"role": "user", "content": "governingLaw: Delaware\nparty2.company: Globex"},
    ]
    turn = chat(browser, history).json()
    assert turn["updates"] == {"governingLaw": "Delaware", "party2": {"company": "Globex"}}


def test_assistant_failure_is_reported_as_502(browser: httpx2.Client) -> None:
    history = [{"role": "assistant", "content": GREETING}, {"role": "user", "content": "FAKE_LLM_FAIL"}]
    response = chat(browser, history)
    assert response.status_code == 502
    assert response.json() == {"detail": "The assistant is unavailable. Please try again."}


def test_chat_requires_sign_in() -> None:
    with httpx2.Client(base_url=FRONTEND_URL, timeout=10) as anonymous:
        assert chat(anonymous, []).status_code == 401
