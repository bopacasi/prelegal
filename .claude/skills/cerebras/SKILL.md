---
name: cerebras
description: Use this to write code to call an LLM using LiteLLM and OpenRouter, by default via OpenRouter's Free Models Router, optionally pinned to the Cerebras inference provider
---

# Calling an LLM via OpenRouter (free by default, Cerebras optional)

Call the model from the **backend** (Python) with [LiteLLM](https://docs.litellm.ai), through **OpenRouter**. The working example is `backend/app/llm/litellm_client.py`, configured by `backend/app/config.py`.

## Setup

- Dependencies: `litellm` and `tenacity`, both pinned in `backend/requirements.txt`. LiteLLM needs `tenacity` for `num_retries` but doesn't install it.
- Key: `OPENROUTER_API_KEY` in the gitignored root `.env` (template: `.env.example`). Compose passes it to the backend. Never log or print it.

## Models

| Setup | `LLM_MODEL` | `LLM_PROVIDER` | Credits |
| --- | --- | --- | --- |
| **Default:** Free Models Router | `openrouter/openrouter/free` | (empty) | none; rate-limited |
| Cerebras | `openrouter/openai/gpt-oss-120b` | `cerebras` | required (otherwise `402 Insufficient credits`) |

- The free router picks a free model on each request, so quality and speed vary.
- To find other Cerebras models, list the providers at `https://openrouter.ai/api/v1/models/<author>/<slug>/endpoints`.

## The call

```python
litellm.completion(
    model=settings.llm_model,
    messages=messages,
    api_key=settings.openrouter_api_key,
    timeout=30,
    num_retries=1,
    # Strict JSON output; build the schema with app/llm/schema.py:strict_schema()
    response_format={"type": "json_schema", "json_schema": {"name": "...", "strict": True, "schema": schema}},
    # app/llm/litellm_client.py:provider_routing(settings.llm_provider)
    extra_body={"provider": {"require_parameters": True}},  # + "order": ["cerebras"], "allow_fallbacks": False
)
```

- `require_parameters` makes OpenRouter use only models that support the strict schema. This matters most with the free router.
- With a provider set, requests go only to that provider, with no silent fallback.

## Rules

- Put the LLM behind the `LlmClient` protocol (`backend/app/llm/base.py`) and wrap every failure in `LlmError`. The API maps that to `502`.
- Generate the schema from a pydantic model with `strict_schema()`. It inlines `$defs`, requires every property, sets `additionalProperties: false`, and drops value constraints (`maxLength`, `minimum`, `format`, …) that strict modes may reject. Then validate the answer with the same pydantic model, which enforces those constraints.
- Ask for plain text in prompts if the UI doesn't render Markdown. Models add it otherwise.
- Never call the real model in tests. Override `get_llm` with a stub in unit tests, and use `FAKE_LLM=true` (`app/llm/fake.py`) for the integration stack.
