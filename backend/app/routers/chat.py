"""The AI assistant that fills in the Mutual NDA."""

import logging
from datetime import date

from fastapi import APIRouter, HTTPException, status

from app.chat.schemas import NdaChatRequest, NdaChatTurn
from app.chat.service import run_nda_chat
from app.deps import CurrentUser, Llm
from app.llm.base import LlmError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/nda", response_model=NdaChatTurn, response_model_exclude_none=True)
def nda_chat(body: NdaChatRequest, llm: Llm, _user: CurrentUser) -> NdaChatTurn:
    try:
        return run_nda_chat(llm, body, date.today())
    except LlmError:
        logger.exception("NDA chat turn failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The assistant is unavailable. Please try again.")
