---
name: cerebras
description: Use this to write code to call an LLM using LiteLLM and OpenRouter with the Cerebras inference provider
---

# Calling an LLM via Cerebras

Call the model from the **backend** (Python) with [LiteLLM](https://docs.litellm.ai), through **OpenRouter**, pinned to the **Cerebras** provider. The working example is `backend/app/llm/litellm_client.py`.

## Setup

- Dependency: `litellm` (pinned in `backend/requirements.txt`).
- Key: `OPENROUTER_API_KEY` in the gitignored root `.env` (template: `.env.example`). Compose passes it to the backend. Never log or print it.
- The OpenRouter account needs **credits**. Without them every call fails with `402 Insufficient credits`.

## Model

`openrouter/openai/gpt-oss-120b`. It supports tool calling and strict structured output. As of November 2026 it was the only model Cerebras served on OpenRouter among those checked. To check others, list the providers at `https://openrouter.ai/api/v1/models/<author>/<slug>/endpoints` and look for `Cerebras`.

## The call

```python
litellm.completion(
    model="openrouter/openai/gpt-oss-120b",
    messages=messages,
    api_key=settings.openrouter_api_key,
    timeout=30,
    num_retries=1,
    # Strict JSON output; build the schema with app/llm/schema.py:strict_schema()
    response_format={"type": "json_schema", "json_schema": {"name": "...", "strict": True, "schema": schema}},
    # OpenRouter provider routing: Cerebras only, no silent fallback
    extra_body={"provider": {"order": ["cerebras"], "allow_fallbacks": False}},
)
```

## Rules

- Put the LLM behind the `LlmClient` protocol (`backend/app/llm/base.py`) and wrap every failure in `LlmError`. The API maps that to `502`.
- Generate the schema from a pydantic model with `strict_schema()`. It inlines `$defs`, requires every property, sets `additionalProperties: false`, and drops value constraints (`maxLength`, `minimum`, `format`, …) that strict modes may reject. Then validate the answer with the same pydantic model, which enforces those constraints.
- Never call the real model in tests. Override `get_llm` with a stub in unit tests, and use `FAKE_LLM=true` (`app/llm/fake.py`) for the integration stack.
