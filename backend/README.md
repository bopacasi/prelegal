# Prelegal backend

The FastAPI service behind the Prelegal frontend. It currently provides the placeholder sign-in. Run the whole stack from the repo root with `scripts/start.sh`; see the [root README](../README.md).

## API

| Endpoint | What it does |
| --- | --- |
| `GET /api/health` | Liveness check |
| `POST /api/auth/login` | Fake login: any non-blank `name` and `email`. Creates or updates the user, starts a session and sets the `prelegal_session` cookie (`HttpOnly`). |
| `POST /api/auth/logout` | Ends the session and clears the cookie |
| `GET /api/users/me` | The signed-in user, or `401` |

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
tests/             pytest unit tests (FastAPI TestClient)
```

## Database

The database is **temporary**: SQLite, dropped and recreated empty every time the backend starts. Run a single worker, because each worker would reset it on start. Switching to Postgres later means changing `DATABASE_URL` and replacing `reset_db()` with migrations.

| Variable | Default | |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./prelegal.db` | The Docker image uses `sqlite:////app/db/prelegal.db` |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS |

## Tests

```console
docker build --target test -t prelegal-backend-test backend
docker run --rm prelegal-backend-test
```
