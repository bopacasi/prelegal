"""Settings, read from environment variables."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./prelegal.db"
    session_cookie: str = "prelegal_session"
    # Local development runs over plain HTTP; set COOKIE_SECURE=true behind HTTPS.
    cookie_secure: bool = False


def load_settings() -> Settings:
    defaults = Settings()
    return Settings(
        database_url=os.environ.get("DATABASE_URL", defaults.database_url),
        cookie_secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
    )
