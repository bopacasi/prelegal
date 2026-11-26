"""One turn of the NDA chat: prompt, LLM call, validated result."""

from datetime import date

from pydantic import ValidationError

from app.chat.nda import build_system_prompt
from app.chat.schemas import NdaChatRequest, NdaChatTurn
from app.llm.base import LlmClient, LlmError, Message
from app.llm.schema import strict_schema

OUTPUT_SCHEMA = strict_schema(NdaChatTurn.model_json_schema())

# Sent instead of a history when the chat starts, so the assistant speaks first.
START_MESSAGE: Message = {
    "role": "user",
    "content": "(The user has just opened the page. Greet them and ask your first question.)",
}


def build_messages(request: NdaChatRequest, today: date) -> list[Message]:
    system: Message = {"role": "system", "content": build_system_prompt(request.values, today)}
    history: list[Message] = [{"role": m.role, "content": m.content} for m in request.messages]
    return [system, *(history or [START_MESSAGE])]


def run_nda_chat(llm: LlmClient, request: NdaChatRequest, today: date) -> NdaChatTurn:
    raw = llm.complete_json(build_messages(request, today), OUTPUT_SCHEMA, "nda_chat_turn")
    try:
        return NdaChatTurn.model_validate(raw)
    except ValidationError as error:
        raise LlmError(f"Invalid model output: {error}") from error
