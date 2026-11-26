#!/usr/bin/env bash
# Stop the Prelegal stack and remove its containers (and the temporary database).
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose --profile test down --remove-orphans
