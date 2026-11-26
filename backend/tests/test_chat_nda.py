"""The NDA prompt, the missing-field check and the output schema."""

from datetime import date

from app.chat.nda import build_system_prompt, missing_fields
from app.chat.schemas import NdaChatRequest, NdaUpdates, NdaValues
from app.chat.service import OUTPUT_SCHEMA, START_MESSAGE, build_messages
from tests.helpers import nda_values

FILLED_PARTY = {"name": "Ada", "title": "CEO", "company": "Acme", "noticeAddress": "ada@acme.test"}


def values(**overrides) -> NdaValues:
    return NdaValues.model_validate(nda_values(**overrides))


def test_missing_fields_of_fresh_document() -> None:
    assert missing_fields(values()) == [
        "governingLaw",
        "jurisdiction",
        *[f"party{n}.{f}" for n in (1, 2) for f in ("name", "title", "company", "noticeAddress")],
    ]


def test_nothing_missing_when_filled() -> None:
    filled = values(governingLaw="Delaware", jurisdiction="New Castle, DE", parties=[FILLED_PARTY, FILLED_PARTY])
    assert missing_fields(filled) == []


def test_years_only_needed_for_their_term() -> None:
    assert "mndaTermYears" in missing_fields(values(mndaTermYears=None))
    assert "mndaTermYears" not in missing_fields(values(mndaTerm="untilTerminated", mndaTermYears=None))
    assert "confidentialityYears" not in missing_fields(values(confidentialityTerm="perpetual", confidentialityYears=None))


def test_system_prompt_has_values_date_and_missing_list() -> None:
    prompt = build_system_prompt(values(governingLaw="Delaware"), date(2026, 11, 26))
    assert "Today is 2026-11-26." in prompt
    assert '"governingLaw": "Delaware"' in prompt
    assert "Still missing: jurisdiction, party1.name, party1.title" in prompt


def test_start_message_only_without_history() -> None:
    request = NdaChatRequest(messages=[], values=values(), today=date(2026, 11, 26))
    assert build_messages(request)[1:] == [START_MESSAGE]


def test_output_schema_is_strict() -> None:
    def objects(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                yield node
            for value in node.values():
                yield from objects(value)
        elif isinstance(node, list):
            for item in node:
                yield from objects(item)

    found = list(objects(OUTPUT_SCHEMA))
    assert len(found) == 4  # turn, updates, party1, party2
    for obj in found:
        assert obj["additionalProperties"] is False
        assert obj["required"] == list(obj["properties"])
    assert "$ref" not in str(OUTPUT_SCHEMA) and "$defs" not in OUTPUT_SCHEMA


def test_output_schema_keeps_every_field() -> None:
    updates = OUTPUT_SCHEMA["properties"]["updates"]
    party = updates["properties"]["party1"]["anyOf"][0]
    assert party["required"] == ["name", "title", "company", "noticeAddress"]
    assert set(updates["required"]) == set(NdaUpdates.model_fields)


def schema_keywords(node) -> set[str]:
    """Keywords used anywhere in a schema, not counting property names."""
    if isinstance(node, list):
        return set().union(*(schema_keywords(item) for item in node))
    if not isinstance(node, dict):
        return set()
    found = set(node) | schema_keywords([v for k, v in node.items() if k != "properties"])
    return found | schema_keywords(list(node.get("properties", {}).values()))


def test_output_schema_leaves_validation_keywords_to_pydantic() -> None:
    # Strict modes often reject these; pydantic still enforces them on the answer.
    dropped = {"maxLength", "minLength", "minimum", "maximum", "format", "title", "default", "$defs", "$ref"}
    assert schema_keywords(OUTPUT_SCHEMA) & dropped == set()


def test_update_models_cover_every_value_field() -> None:
    from app.chat.schemas import PartyUpdates, PartyValues

    assert set(NdaUpdates.model_fields) - {"party1", "party2"} == set(NdaValues.model_fields) - {"parties"}
    assert set(PartyUpdates.model_fields) == set(PartyValues.model_fields)
