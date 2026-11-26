"""User accounts."""

from sqlmodel import Session, select

from app.models import User


def upsert_user(db: Session, name: str, email: str) -> User:
    """Return the user with this email, creating it or updating its name."""
    email = email.lower()
    user = db.exec(select(User).where(User.email == email)).first()
    if user is None:
        user = User(name=name, email=email)
    else:
        user.name = name
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
