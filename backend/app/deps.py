"""FastAPI dependencies shared by the routers."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.config import SESSION_COOKIE, Settings
from app.llm.base import LlmClient
from app.models import User
from app.services.sessions import get_user_by_token


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as db:
        yield db


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
SessionToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE)]


def current_user(db: DbSession, token: SessionToken = None) -> User:
    user = get_user_by_token(db, token) if token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def get_llm(request: Request) -> LlmClient:
    return request.app.state.llm


Llm = Annotated[LlmClient, Depends(get_llm)]
