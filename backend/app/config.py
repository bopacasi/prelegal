"""Settings, read from environment variables."""

import os
from dataclasses import dataclass

# Name of the session cookie. The frontend uses the same name (frontend/lib/config.ts).
SESSION_COOKIE = "prelegal_session"


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./prelegal.db"
    # Local development runs over plain HTTP; set COOKIE_SECURE=true behind HTTPS.
    cookie_secure: bool = False
    # The AI assistant, via OpenRouter (see app/llm/litellm_client.py). The default
    # is OpenRouter's Free Models Router, which needs no credits. For the paid
    # Cerebras setup: LLM_MODEL=openrouter/openai/gpt-oss-120b, LLM_PROVIDER=cerebras.
    openrouter_api_key: str = ""
    llm_model: str = "openrouter/openrouter/free"
    llm_provider: str = ""  # OpenRouter provider to pin requests to; empty lets OpenRouter choose
    llm_timeout_seconds: float = 30.0
    # Scripted stand-in for the LLM, for tests. Never enable in production.
    fake_llm: bool = False


def _flag(name: str) -> bool:
    return os.environ.get(name, "false").lower() == "true"


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", Settings.database_url),
        cookie_secure=_flag("COOKIE_SECURE"),
        openrouter_api_key=os.environ.get("OPENROUTER_API_KEY", ""),
        llm_model=os.environ.get("LLM_MODEL", Settings.llm_model),
        llm_provider=os.environ.get("LLM_PROVIDER", Settings.llm_provider),
        llm_timeout_seconds=float(os.environ.get("LLM_TIMEOUT_SECONDS", Settings.llm_timeout_seconds)),
        fake_llm=_flag("FAKE_LLM"),
    )
