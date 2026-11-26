"""Turn a pydantic JSON schema into one usable for strict structured output."""

from typing import Any

# Schema keywords left out of what the model sees: labels that mean nothing to
# it, and value constraints that strict modes often reject. Pydantic still
# enforces the constraints when it validates the answer.
_DROPPED_KEYWORDS = {"$defs", "title", "default", "format", "minLength", "maxLength", "minimum", "maximum"}


def strict_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Inline $defs, require every property, forbid additional ones.

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
        result = {key: walk(value) for key, value in node.items() if key not in _DROPPED_KEYWORDS | {"properties"}}
        if "properties" in node:  # property names are field names, never dropped
            result["properties"] = {name: walk(field) for name, field in node["properties"].items()}
            result["required"] = list(result["properties"])
            result["additionalProperties"] = False
        return result

    return walk(schema)
