"""What the app needs from an LLM, independent of any provider or feature."""

from typing import Any, Literal, Protocol, TypedDict


class Message(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class LlmError(Exception):
    """The LLM call failed or returned something unusable."""


class LlmClient(Protocol):
    def complete_json(self, messages: list[Message], schema: dict[str, Any], schema_name: str) -> dict[str, Any]:
        """Return the model's answer as a JSON object matching the schema. Raises LlmError."""
        ...
