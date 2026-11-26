from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from app.config import Settings
from app.db import make_engine, reset_db
from app.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}")


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as client:
        yield client


@pytest.fixture
def engine(settings: Settings) -> Iterator[Engine]:
    engine = make_engine(settings.database_url)
    reset_db(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    with Session(engine) as db:
        yield db


def sign_in(client: TestClient, name: str = "Ada Lovelace", email: str = "ada@example.com"):
    return client.post("/api/auth/login", json={"name": name, "email": email})
