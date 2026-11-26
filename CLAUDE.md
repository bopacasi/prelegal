# Prelegal Project

## Tooling
- Use Atlassian MCP to read and move tasks in JIRA. The project's prefix is `KAN-`.
- Use GitHub MCP.
- Use Docker to run the Next.js app in a container, for tests and for me to try it.

## Development Process
1. Use the installed Atlassian MCP tools to read feature instructions from JIRA.
2. Develop the feature - do not skip steps from the feature-dev 7-step process.
3. Thoroughly test the feature with unit tests and integration tests, and address any issues.
4. Submit a PR using the installed GitHub MCP tools and move the JIRA task to "In Review".

## Running and testing
- Everything runs in Docker; only Docker Desktop is needed on the host.
  - `scripts/start.sh` builds and starts the stack (frontend on :3000, backend on :8000) and waits for its health checks.
  - `scripts/stop.sh` stops it and deletes the temporary database.
  - `scripts/test.sh` runs everything: backend pytest, frontend `tsc` and Vitest, integration tests against a fresh stack, and a test with the backend stopped. Run it before every PR.
- **No Node.js on the host.** Run npm only in Docker. After changing `frontend/package.json`, regenerate the lockfile:
  `docker run --rm -v "$PWD/frontend":/w -w /w node:24-alpine npm install --package-lock-only`
  The frontend Docker build uses `npm ci`.
- Build `frontend/Dockerfile` from the **repo root** (`-f frontend/Dockerfile .`), because it needs `data/templates`. Build `backend/` with `backend` as the build context.
- Docker Desktop is sometimes not running. If the docker socket is missing, ask the user to start it.
- LibreOffice is installed at `/Applications/LibreOffice.app`. It can convert a generated `.odt` to PDF or PNG headlessly (`soffice --headless --convert-to pdf`) for visual checks.

## Git, GitHub and Jira
- **Branch per change**, never commit to `main`. Use names like `feature/KAN-<n>-<slug>`, `refactor/<slug>` or `chore/<slug>`.
- `git push` works over SSH. `gh` is not installed.
- **GitHub MCP:** the token can create and read issues and PRs, and update a PR (for example its base). It **cannot** create branches or commits, or merge (`403`). So:
  - Push branches with git, then open PRs with `mcp__github__create_pull_request`.
  - **Merge locally:** check that the remote PR head is the reviewed SHA. Then on `main`: `git pull --ff-only`, `git merge --no-ff <head> -m "Merge pull request #N from bopacasi/<branch>"`, and `git push origin main`. GitHub then marks the PR merged, which can take a few seconds. Then delete the branch (`git push origin --delete <branch>` and `git branch -d <branch>`).
  - For stacked PRs, retarget the dependent PR to `main` (`mcp__github__update_pull_request`) before merging it.
- **Jira:** the Atlassian site is `bogdanlangendorf.atlassian.net`, cloudId `07b65ec0-b662-4b6d-a787-f43cf7822bf3`. Statuses are in German. Transition ids:
  - `11` Zu erledigen (To Do)
  - `21` In Arbeit (In Progress)
  - `31` In Review (status "Wird überprüft")
  - `41` Fertig (Done)
- Usual flow:
  - On start: move to In Progress.
  - With the PR: move to In Review, plus a comment linking the PR.
  - After merging: move to Done.
- The shell is zsh with `noclobber`. Use `>|` to overwrite files. Pass word lists to commands literally, because zsh doesn't word-split `$VAR`.
- `.env` (holding `OPENROUTER_API_KEY`) is gitignored. Never print, commit or paste the key. Check that it's not staged before committing.

## Architecture (see README.md, backend/README.md and frontend/README.md)
- **`frontend/`:** Next.js 16 (App Router, standalone output), React 19, TypeScript 7, Tailwind 4, Vitest 5, Node 24.
  - `app/(public)/login` is the fake login.
  - `app/(app)/layout.tsx` checks the session with the backend. If the backend is unreachable it shows "unavailable".
  - `app/(app)/nda` is the NDA creator: `NdaCreator` holds the values, `NdaChat` plus `lib/chat/useNdaChat.ts` is the assistant, and `NdaPreview` and `lib/nda/odt.ts` produce the preview and the `.odt`.
  - `proxy.ts` is Next 16's replacement for middleware. It sends requests without a session cookie to `/login`.
- **`backend/`:** FastAPI on Python 3.15 with SQLModel, using a temporary SQLite database that is reset on every start (run a single uvicorn worker).
  - Layers: `routers/` (thin), `services/`, `deps.py`.
  - `llm/` holds the LLM clients behind the `LlmClient` protocol.
  - `chat/` holds the NDA assistant: schemas, prompt (`nda.py`) and one turn (`service.py`).
- **`data/templates/`:** 11 Common Paper templates (CC BY 4.0) with a `manifest.json`, rebuilt by `scripts/fetch_templates.py`.
- **`tests/integration/`:** pytest with `httpx2` against the running stack, through the frontend URL.

## Pitfalls already hit (don't repeat)
- **Next.js rewrites are fixed at build time.** `/api/*` goes to `BACKEND_URL`, which is passed as a Docker **build arg**. Setting it only at runtime doesn't change the rewrite. `lib/api/server.ts` reads it at runtime.
- **Signed-in pages render per request**, because the layout reads cookies. That means `loadStandardTerms` runs at runtime, and the image needs `data/templates` plus `TEMPLATES_DIR`, which are already set up.
- **Vitest and JSX:** `tsconfig.json` has `"jsx": "preserve"` for Next. `vitest.config.ts` sets `oxc: { jsx: { runtime: "automatic" } }`, and component tests use `// @vitest-environment jsdom`. `frontend/package.json` has `"type": "module"`, which Vite needs.
- **Vitest needs the `@/` alias,** which is configured in `vitest.config.ts`.
- **Backend tests use `httpx2`**, because Starlette's TestClient deprecated `httpx`.
  - When a test sets a cookie that the server has already set, call `client.cookies.clear()` first. Otherwise both cookies are sent and the server's wins.
- **Server components and the backend:** `getCurrentUser()` raises `BackendUnavailableError` when the backend is unreachable. Callers must handle it; don't let it become a 500.
- **The proxy matcher** must exclude `login` and `api` only as whole path segments, with `(?:/|$)`.

## The AI assistant (LLM)
- Follow the `cerebras` skill (`.claude/skills/cerebras/SKILL.md`): LiteLLM via OpenRouter, called from the backend only.
- **Default model:** OpenRouter's **Free Models Router**, `LLM_MODEL=openrouter/openrouter/free`. It needs no credits.
  - It's rate-limited (roughly 50 requests a day).
  - The model can change per request, so quality varies.
- **Paid alternative:** `LLM_MODEL=openrouter/openai/gpt-oss-120b` with `LLM_PROVIDER=cerebras`. It needs OpenRouter credits; without them every call returns `402 Insufficient credits`.
  - On OpenRouter, Cerebras served only gpt-oss-120b among the models checked.
- Requests always send `extra_body.provider.require_parameters=true`, so OpenRouter only picks models that support the strict JSON schema.
- **`tenacity` must stay pinned.** LiteLLM's `num_retries` needs it, and without it every retry crashes. `test_litellm_retry_dependency_is_installed` guards this.
- **`strict_schema()`** (`app/llm/schema.py`):
  - It must never drop entries of a `properties` map. A bug once removed the party field `title` this way.
  - It drops `maxLength`, `minimum`, `format` and similar keywords. Pydantic validates the answer afterwards.
- **Plain text:** the chat UI shows plain text, so the prompt says "no Markdown". Free models add `**bold**` otherwise.
- The browser sends its local date (`today`) with each turn. Don't use the server's `date.today()` in prompts.
- **Tests never call the real model.**
  - Unit tests override `get_llm` with `StubLlm`.
  - The integration stack runs with `FAKE_LLM=true`, which `scripts/test.sh` sets. `app/llm/fake.py` understands `field: value` lines and fails on `FAKE_LLM_FAIL`.
  - A stub doesn't validate the real request, so check one real turn after changing the LLM call. Use `docker run --env-file .env` with a small script, or `scripts/start.sh` and curl.

## Working style that worked here
- Follow all 7 feature-dev phases. Use code-explorer, code-architect and code-reviewer agents, ask clarifying questions, and get approval before implementing.
- Prove a bug before fixing it. Write the regression test, run it against the **old** code to see it fail, then fix.
  - When searching logs to prove something, read the full error, not one grep match. A grep for one message once hid a second error right after it.
- Before writing new code, check the latest package versions (`npm view …` and `pip index versions …` inside Docker) and use them.
