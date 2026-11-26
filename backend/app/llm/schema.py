"""Turn a pydantic JSON schema into one usable for strict structured output."""

from typing import Any

# Keywords that carry no meaning for the model and that strict modes may reject.
_DROPPED_KEYS = {"title", "default"}


def strict_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Inline $defs, require every property and forbid additional ones.

    Strict mode wants optional fields as required-but-nullable, which pydantic
    already expresses as anyOf [type, null] for `X | None` fields.
    """
    defs = schema.get("$defs", {})

    def walk(node: Any) -> Any:
        if isinstance(node, list):
            return [walk(item) for item in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            return walk(defs[node["$ref"].split("/")[-1]])
        result = {key: walk(value) for key, value in node.items() if key not in _DROPPED_KEYS | {"$defs"}}
        if result.get("type") == "object":
            result["required"] = list(result.get("properties", {}))
            result["additionalProperties"] = False
        return result

    return walk(schema)
