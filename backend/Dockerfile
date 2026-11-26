# syntax=docker/dockerfile:1
#
# Prelegal API (FastAPI). Build context: backend/
#   docker build --target test -t prelegal-backend-test backend && docker run --rm prelegal-backend-test
#   docker build -t prelegal-backend backend

ARG PYTHON_VERSION=3.15

FROM python:${PYTHON_VERSION}-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app ./app

# --- Unit tests: `docker run` this target ------------------------------------
FROM base AS test
COPY requirements-dev.txt pytest.ini ./
RUN pip install -r requirements-dev.txt
COPY tests ./tests
CMD ["pytest", "-q"]

# --- Runtime -----------------------------------------------------------------
FROM base AS runtime
# The temporary SQLite database lives in /app/db and is reset on every start.
RUN useradd --create-home app && mkdir /app/db && chown app /app/db
ENV DATABASE_URL=sqlite:////app/db/prelegal.db
USER app
EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
