"""User accounts."""

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import User


def find_user(db: Session, email: str) -> User | None:
    return db.exec(select(User).where(User.email == email)).first()


def upsert_user(db: Session, name: str, email: str) -> User:
    """Return the user with this email, creating it or updating its name."""
    email = email.lower()
    user = find_user(db, email) or User(email=email, name=name)
    user.name = name
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # another request created this user at the same moment
        db.rollback()
        return upsert_user(db, name, email)
    db.refresh(user)
    return user
