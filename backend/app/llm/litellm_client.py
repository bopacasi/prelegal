"""The real LLM: LiteLLM, via OpenRouter, pinned to the Cerebras provider."""

import json
from typing import Any

import litellm

from app.llm.base import LlmError, Message

# OpenRouter provider routing: only Cerebras, no silent fallback to others.
CEREBRAS_ONLY = {"provider": {"order": ["cerebras"], "allow_fallbacks": False}}


class LiteLlmClient:
    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    def complete_json(self, messages: list[Message], schema: dict[str, Any], schema_name: str) -> dict[str, Any]:
        try:
            response = litellm.completion(
                model=self._model,
                messages=messages,
                api_key=self._api_key,
                timeout=self._timeout,
                num_retries=1,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": schema_name, "strict": True, "schema": schema},
                },
                extra_body=CEREBRAS_ONLY,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as error:
            raise LlmError(f"{type(error).__name__}: {error}") from error
