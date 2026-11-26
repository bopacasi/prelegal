"""Browser sessions, stored server-side and referenced by an opaque token."""

import secrets

from sqlmodel import Session

from app.models import User, UserSession


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(UserSession(token=token, user_id=user.id))
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> User | None:
    session = db.get(UserSession, token)
    return db.get(User, session.user_id) if session else None


def delete_session(db: Session, token: str) -> None:
    session = db.get(UserSession, token)
    if session:
        db.delete(session)
        db.commit()
