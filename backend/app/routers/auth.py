"""Fake login: no password, any name and email sign the user in."""

from fastapi import APIRouter, Response, status

from app.config import SESSION_COOKIE
from app.deps import AppSettings, DbSession, SessionToken
from app.models import User
from app.schemas import LoginRequest, UserRead
from app.services.sessions import create_session, delete_session
from app.services.users import upsert_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserRead)
def login(
    body: LoginRequest,
    response: Response,
    db: DbSession,
    settings: AppSettings,
    token: SessionToken = None,
) -> User:
    if token:  # signing in again replaces the browser's previous session
        delete_session(db, token)
    user = upsert_user(db, body.name, body.email)
    response.set_cookie(
        SESSION_COOKIE,
        create_session(db, user),
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, db: DbSession, token: SessionToken = None) -> None:
    if token:
        delete_session(db, token)
    response.delete_cookie(SESSION_COOKIE)
