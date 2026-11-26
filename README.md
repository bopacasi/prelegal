# prelegal
A platform for drafting common legal agreements

> **🚧 Status: Work in progress**
>
> This project is under active development. The first complete version is expected by **December 3, 2026**.

## Running Prelegal

You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/). Everything else runs in containers.

```console
scripts/start.sh   # build and start; the app is at http://localhost:3000
scripts/stop.sh    # stop and remove the containers
scripts/test.sh    # run all unit and integration tests
```

Sign in with any name and email. The login is a placeholder with no password or real authentication yet.

### The AI assistant

The NDA creator is a chat with an AI assistant (via [OpenRouter](https://openrouter.ai), served by Cerebras). To enable it, copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`. The OpenRouter account needs credits. Without a key everything else works, but the assistant answers with "unavailable". The tests never call the real model.

## Architecture

| Part | Folder | Tech |
| --- | --- | --- |
| Frontend | [`frontend/`](frontend) | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | [`backend/`](backend) ([README](backend/README.md)) | FastAPI on Python 3.15, SQLModel, LiteLLM |
| Database | inside the backend container | SQLite, **temporary**: empty on every start |
| Templates | [`data/templates/`](data/templates) | Common Paper agreements (CC BY 4.0) |

- The browser only talks to the frontend (port 3000). Next.js forwards `/api/*` to the backend, so there's no CORS setup.
- The backend's API docs are at http://localhost:8000/docs.
- Signing in creates a server-side session that's referenced by an `HttpOnly` cookie. Requests without that cookie are redirected to `/login`, except `/login` itself, `/api/*` and static files. Signed-in pages also check the session with the backend, so a session lost in a restart also leads back to `/login`.
- If the backend is down, signed-in pages show a "temporarily unavailable" message, and `/login` still works.
- [`compose.yaml`](compose.yaml) defines the stack. The `integration` service (profile `test`) runs the end-to-end tests in [`tests/integration/`](tests/integration).

## Tests

`scripts/test.sh` runs everything:

1. **Backend unit tests**: pytest with FastAPI's test client (`backend/tests/`).
2. **Frontend type check and unit tests**: `tsc` and Vitest (`frontend/**/*.test.ts` and `*.test.tsx`, with Testing Library for the chat).
3. **Integration tests**: pytest against a freshly started stack (with the scripted assistant, `FAKE_LLM=true`), going through the frontend the way a browser would. Then it stops the backend and checks that the frontend shows a message instead of an error (`tests/integration/`).
