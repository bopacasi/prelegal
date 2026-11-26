"""Database engine setup.

The V1 foundation uses a temporary SQLite database that starts empty every
time the backend starts. Moving to Postgres later only means changing
DATABASE_URL (and replacing reset_db with migrations).
"""

from sqlalchemy import Engine
from sqlmodel import SQLModel, create_engine

from app import models  # noqa: F401  (registers the tables on SQLModel.metadata)


def make_engine(database_url: str) -> Engine:
    is_sqlite = database_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    return create_engine(database_url, connect_args=connect_args)


def reset_db(engine: Engine) -> None:
    """Drop and recreate all tables, so the temporary database starts empty."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
