"""Request and response bodies of the API."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=320)]


class LoginRequest(BaseModel):
    """Fake login: any non-blank name and email are accepted."""

    name: NonBlank
    email: NonBlank


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
