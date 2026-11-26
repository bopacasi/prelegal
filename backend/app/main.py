"""Prelegal API.

Run with: uvicorn app.main:create_app --factory
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import Settings, load_settings
from app.db import make_engine, reset_db
from app.routers import auth, health, users


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the app. Run it with a single worker: each start resets the database."""
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = make_engine(settings.database_url)
        reset_db(engine)  # with several workers, each would wipe the others' data
        app.state.engine = engine
        app.state.settings = settings
        yield
        engine.dispose()

    app = FastAPI(title="Prelegal API", lifespan=lifespan)
    for router in (health.router, auth.router, users.router):
        app.include_router(router)
    return app
