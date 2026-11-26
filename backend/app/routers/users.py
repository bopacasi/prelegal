from fastapi import APIRouter

from app.deps import CurrentUser
from app.schemas import UserRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def me(user: CurrentUser) -> UserRead:
    return UserRead.of(user)
