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


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", Settings.database_url),
        cookie_secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
    )
