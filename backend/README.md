# Prelegal backend

The FastAPI service behind the Prelegal frontend. It provides the placeholder sign-in and the AI assistant that fills in the Mutual NDA. Run the whole stack from the repo root with `scripts/start.sh`; see the [root README](../README.md).

## API

| Endpoint | What it does |
| --- | --- |
| `GET /api/health` | Liveness check |
| `POST /api/auth/login` | Fake login: any non-blank `name` and `email`. Creates or updates the user, starts a session and sets the `prelegal_session` cookie (`HttpOnly`). |
| `POST /api/auth/logout` | Ends the session and clears the cookie |
| `GET /api/users/me` | The signed-in user, or `401` |
| `POST /api/chat/nda` | One assistant turn: send `messages` (the chat so far) and the NDA `values`; get `reply` and `updates` (only changed fields). `502` if the LLM fails. Requires sign-in. |

Interactive docs: http://localhost:8000/docs while the stack runs.

## Structure

```
app/main.py        create_app(): lifespan (resets the database), routers
app/config.py      Settings from environment variables, SESSION_COOKIE
app/db.py          Engine and reset_db()
app/models.py      Tables: users, user_sessions (SQLModel)
app/schemas.py     Request and response bodies
app/deps.py        Dependencies: database session, settings, current user
app/routers/       HTTP endpoints, kept thin
app/services/      Logic that works with the database
app/llm/           LLM clients behind one protocol: LiteLLM via OpenRouter, a scripted fake, a factory
app/chat/          The NDA assistant: request/response schemas, instructions and fields (nda.py), one turn (service.py)
tests/             pytest unit tests (FastAPI TestClient)
```

## Database

The database is **temporary**: SQLite, dropped and recreated empty every time the backend starts. Run a single worker, because each worker would reset it on start. Switching to Postgres later means changing `DATABASE_URL` and replacing `reset_db()` with migrations.

| Variable | Default | |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./prelegal.db` | The Docker image uses `sqlite:////app/db/prelegal.db` |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS |
| `OPENROUTER_API_KEY` | (empty) | Key for the AI assistant, from the root `.env`. Without it the app runs, but chat turns return `502`. |
| `LLM_MODEL` | `openrouter/openrouter/free` | LiteLLM model name. The default is OpenRouter's Free Models Router (no credits needed). |
| `LLM_PROVIDER` | (empty) | OpenRouter provider to pin requests to, with no fallback, e.g. `cerebras` with `openrouter/openai/gpt-oss-120b`. Empty lets OpenRouter choose. |
| `LLM_TIMEOUT_SECONDS` | `30` | Per request; one retry (needs `tenacity`) |
| `FAKE_LLM` | `false` | `true` swaps in a scripted assistant (`app/llm/fake.py`). For tests only. |

## The AI assistant

Each turn rebuilds the instructions from the current NDA values, the fields that are still missing, and today's date, so the backend keeps no chat state. The model must answer in a strict JSON schema (`reply` and `updates`). OpenRouter only routes to models that support it (`require_parameters`). The answer is then validated with pydantic: real dates, years from 1 to 99, the allowed term values only, no unknown fields. Anything invalid counts as a failed turn (`502`).

## Tests

```console
docker build --target test -t prelegal-backend-test backend
docker run --rm prelegal-backend-test
```
