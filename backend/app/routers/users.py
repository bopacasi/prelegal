"""The signed-in user."""

from fastapi import APIRouter

from app.deps import CurrentUser
from app.models import User
from app.schemas import UserRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user
