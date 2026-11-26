"""FastAPI dependencies shared by the routers."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from app.config import Settings
from app.models import User
from app.services.sessions import get_user_by_token


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as db:
        yield db


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def session_token(request: Request, settings: AppSettings) -> str | None:
    return request.cookies.get(settings.session_cookie)


SessionToken = Annotated[str | None, Depends(session_token)]


def current_user(db: DbSession, token: SessionToken) -> User:
    user = get_user_by_token(db, token) if token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
