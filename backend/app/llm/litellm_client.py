"""The real LLM: LiteLLM, via OpenRouter."""

import json
from typing import Any

import litellm

from app.llm.base import LlmError, Message


def provider_routing(provider: str) -> dict[str, Any]:
    """OpenRouter provider preferences.

    Only route to models and providers that support every parameter we send,
    above all the strict JSON schema. With a provider (e.g. "cerebras"), use
    only that one, with no silent fallback to others.
    """
    routing: dict[str, Any] = {"require_parameters": True}
    if provider:
        routing |= {"order": [provider], "allow_fallbacks": False}
    return {"provider": routing}


class LiteLlmClient:
    def __init__(self, api_key: str, model: str, timeout: float, provider: str = "") -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._routing = provider_routing(provider)

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
                extra_body=self._routing,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as error:
            raise LlmError(f"{type(error).__name__}: {error}") from error
