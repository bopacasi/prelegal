"""LLM clients: the fake, the factory and the LiteLLM client (with LiteLLM mocked)."""

from types import SimpleNamespace

import pytest

from app.config import Settings
from app.llm import litellm_client
from app.llm.base import LlmError
from app.llm.factory import MissingKeyLlmClient, build_llm
from app.llm.fake import ACKNOWLEDGEMENT, FAIL_TRIGGER, GREETING, FakeLlmClient
from app.llm.litellm_client import CEREBRAS_ONLY, LiteLlmClient

SYSTEM = {"role": "system", "content": "rules"}
START = {"role": "user", "content": "(start)"}


def test_fake_greets_first() -> None:
    assert FakeLlmClient().complete_json([SYSTEM, START], {}, "t") == {"reply": GREETING, "updates": {}}


def test_fake_sets_fields_from_key_value_lines() -> None:
    history = [SYSTEM, {"role": "assistant", "content": GREETING}]
    message = {"role": "user", "content": "governingLaw: Delaware\nparty1.company: Acme Inc.\nno colon here"}
    answer = FakeLlmClient().complete_json([*history, message], {}, "t")
    assert answer == {"reply": ACKNOWLEDGEMENT, "updates": {"governingLaw": "Delaware", "party1": {"company": "Acme Inc."}}}


def test_fake_fails_on_request() -> None:
    with pytest.raises(LlmError):
        FakeLlmClient().complete_json([SYSTEM, {"role": "user", "content": FAIL_TRIGGER}], {}, "t")


def test_factory_picks_client() -> None:
    assert isinstance(build_llm(Settings(fake_llm=True, openrouter_api_key="k")), FakeLlmClient)
    assert isinstance(build_llm(Settings()), MissingKeyLlmClient)
    assert isinstance(build_llm(Settings(openrouter_api_key="k")), LiteLlmClient)
    with pytest.raises(LlmError, match="OPENROUTER_API_KEY"):
        MissingKeyLlmClient().complete_json([SYSTEM], {}, "t")


def test_litellm_client_calls_openrouter_pinned_to_cerebras(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []

    def fake_completion(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"reply": "Hi"}'))])

    monkeypatch.setattr(litellm_client.litellm, "completion", fake_completion)
    client = LiteLlmClient("key", "openrouter/openai/gpt-oss-120b", 12.0)

    assert client.complete_json([SYSTEM], {"type": "object"}, "turn") == {"reply": "Hi"}
    call = calls[0]
    assert call["model"] == "openrouter/openai/gpt-oss-120b"
    assert call["api_key"] == "key" and call["timeout"] == 12.0
    assert call["extra_body"] == CEREBRAS_ONLY == {"provider": {"order": ["cerebras"], "allow_fallbacks": False}}
    assert call["response_format"] == {
        "type": "json_schema",
        "json_schema": {"name": "turn", "strict": True, "schema": {"type": "object"}},
    }


@pytest.mark.parametrize("failure", [RuntimeError("provider down"), "not json"])
def test_litellm_client_wraps_failures(monkeypatch: pytest.MonkeyPatch, failure) -> None:
    def fake_completion(**kwargs):
        if isinstance(failure, Exception):
            raise failure
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=failure))])

    monkeypatch.setattr(litellm_client.litellm, "completion", fake_completion)
    with pytest.raises(LlmError):
        LiteLlmClient("key", "model", 1.0).complete_json([SYSTEM], {}, "turn")
