"""A scripted stand-in for the LLM, so tests never call the real one.

Before any assistant reply it greets. After that it reads "field: value" lines
in the last user message, for example "governingLaw: Delaware" or
"party1.company: Acme Inc.", and sets those fields. A message containing
FAIL_TRIGGER makes it fail like an unreachable LLM.
"""

from typing import Any

from app.llm.base import LlmError, Message

FAIL_TRIGGER = "FAKE_LLM_FAIL"
GREETING = "Hi! I'll help you prepare a Mutual NDA. What is the purpose of the agreement?"
ACKNOWLEDGEMENT = "Thanks, I've updated the document. What else should we fill in?"


def _parse_updates(text: str) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if not separator or not value.strip():
            continue
        field, _, party_field = key.strip().partition(".")
        if party_field:
            updates.setdefault(field, {})[party_field] = value.strip()
        else:
            updates[field] = value.strip()
    return updates


class FakeLlmClient:
    def complete_json(self, messages: list[Message], schema: dict[str, Any], schema_name: str) -> dict[str, Any]:
        last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if FAIL_TRIGGER in last:
            raise LlmError("Fake LLM failure requested")
        is_opening = not any(m["role"] == "assistant" for m in messages)
        if is_opening:
            return {"reply": GREETING, "updates": {}}
        return {"reply": ACKNOWLEDGEMENT, "updates": _parse_updates(last)}
