"""Choose the LLM client for the current settings."""

import logging
from typing import Any

from app.config import Settings
from app.llm.base import LlmClient, LlmError, Message
from app.llm.fake import FakeLlmClient

logger = logging.getLogger(__name__)


class MissingKeyLlmClient:
    """Lets the app start without a key; each AI request then fails clearly."""

    def complete_json(self, messages: list[Message], schema: dict[str, Any], schema_name: str) -> dict[str, Any]:
        raise LlmError("OPENROUTER_API_KEY is not set")


def build_llm(settings: Settings) -> LlmClient:
    if settings.fake_llm:
        logger.warning("FAKE_LLM is on: the AI assistant is scripted, not real")
        return FakeLlmClient()
    if not settings.openrouter_api_key:
        logger.warning("OPENROUTER_API_KEY is not set: the AI assistant is unavailable")
        return MissingKeyLlmClient()
    from app.llm.litellm_client import LiteLlmClient  # LiteLLM is slow to import

    return LiteLlmClient(settings.openrouter_api_key, settings.llm_model, settings.llm_timeout_seconds)
