#!/usr/bin/env bash
set -euo pipefail

# Stop the production stack. If GOOGLE_CREDENTIALS_PATH was used to start,
# include the override compose file when bringing the stack down.
# Usage: ./scripts/prod-stop.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_COMPOSE="$REPO_ROOT/docker-compose.prod.yml"
OVERRIDE="$REPO_ROOT/docker-compose.prod.override.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not on PATH"
  exit 1
fi

if [ -n "${GOOGLE_CREDENTIALS_PATH-}" ] && [ -f "$OVERRIDE" ]; then
  echo "Stopping prod stack (with override)..."
  docker compose -f "$BASE_COMPOSE" -f "$OVERRIDE" down --remove-orphans --volumes || true
else
  echo "Stopping prod stack (base compose)..."
  docker compose -f "$BASE_COMPOSE" down --remove-orphans --volumes || true
fi

echo "Prod stack stopped."
