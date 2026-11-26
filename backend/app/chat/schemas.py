"""Request, response and model-output shapes of the NDA chat.

Field names are camelCase to match the frontend's NdaValues exactly.
"""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Text = Annotated[str, Field(max_length=2000)]
Years = Annotated[int, Field(ge=1, le=99)]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class PartyValues(BaseModel):
    name: Text
    title: Text
    company: Text
    noticeAddress: Text


class NdaValues(BaseModel):
    """The document as the browser currently has it (context for the model)."""

    purpose: Text
    effectiveDate: Text
    mndaTerm: Literal["expires", "untilTerminated"]
    mndaTermYears: int | None  # null when the browser has no valid number
    confidentialityTerm: Literal["years", "perpetual"]
    confidentialityYears: int | None
    governingLaw: Text
    jurisdiction: Text
    modifications: Text
    parties: tuple[PartyValues, PartyValues]


class NdaChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(max_length=100)
    values: NdaValues


class PartyUpdates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Text | None = None
    title: Text | None = None
    company: Text | None = None
    noticeAddress: Text | None = None


class NdaUpdates(BaseModel):
    """Fields to change. A null (or missing) field stays as it is."""

    model_config = ConfigDict(extra="forbid")

    purpose: Text | None = None
    effectiveDate: date | None = None
    mndaTerm: Literal["expires", "untilTerminated"] | None = None
    mndaTermYears: Years | None = None
    confidentialityTerm: Literal["years", "perpetual"] | None = None
    confidentialityYears: Years | None = None
    governingLaw: Text | None = None
    jurisdiction: Text | None = None
    modifications: Text | None = None
    party1: PartyUpdates | None = None
    party2: PartyUpdates | None = None


class NdaChatTurn(BaseModel):
    """One assistant turn: the chat reply and the resulting field updates."""

    model_config = ConfigDict(extra="forbid")

    reply: str = Field(min_length=1, max_length=4000)
    updates: NdaUpdates
