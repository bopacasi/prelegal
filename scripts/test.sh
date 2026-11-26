#!/usr/bin/env bash
# Run all tests in Docker: backend and frontend unit tests, then integration
# tests against a freshly started stack, and finally with the backend stopped.
# The stack is stopped afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Backend unit tests"
docker build --quiet --target test --tag prelegal-backend-test backend >/dev/null
docker run --rm prelegal-backend-test

echo "== Frontend type check and unit tests"
docker build --quiet --file frontend/Dockerfile --target test --tag prelegal-frontend-test . >/dev/null
docker run --rm prelegal-frontend-test

echo "== Integration tests"
trap scripts/stop.sh EXIT
scripts/start.sh
docker compose --profile test run --rm --build integration

echo "== Integration tests with the backend stopped"
docker compose stop backend
docker compose --profile test run --rm --no-deps integration pytest -q test_backend_down.py
