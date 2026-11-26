"""Request and response bodies of the API."""

from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models import User

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=320)]


class LoginRequest(BaseModel):
    """Fake login: any non-blank name and email are accepted."""

    name: NonBlank
    email: NonBlank


class UserRead(BaseModel):
    id: int
    name: str
    email: str

    @classmethod
    def of(cls, user: User) -> "UserRead":
        return cls.model_validate(user, from_attributes=True)
