#!/usr/bin/env bash
# Build and start the Prelegal stack (frontend, backend, temporary database).
# The database starts empty every time.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up --build --detach --wait
echo
echo "Prelegal is running:"
echo "  App:      http://localhost:3000"
echo "  API docs: http://localhost:8000/docs"
echo "Stop it with scripts/stop.sh"
