"""Service tests, run directly against the database."""

from sqlmodel import Session, select

from app.models import User
from app.services.sessions import create_session, delete_session, get_user_by_token
from app.services.users import upsert_user


def test_upsert_user_creates_then_updates(db: Session) -> None:
    created = upsert_user(db, "Ada", "Ada@Example.com")
    updated = upsert_user(db, "Ada King", "ada@example.com")
    assert updated.id == created.id
    assert updated.name == "Ada King"
    assert len(db.exec(select(User)).all()) == 1


def test_session_lifecycle(db: Session) -> None:
    user = upsert_user(db, "Ada", "ada@example.com")
    token = create_session(db, user)
    assert len(token) >= 40
    assert get_user_by_token(db, token) == user

    delete_session(db, token)
    assert get_user_by_token(db, token) is None
    delete_session(db, token)  # deleting twice is a no-op


def test_sessions_are_independent(db: Session) -> None:
    user = upsert_user(db, "Ada", "ada@example.com")
    first, second = create_session(db, user), create_session(db, user)
    assert first != second
    delete_session(db, first)
    assert get_user_by_token(db, second) == user
