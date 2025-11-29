#!/usr/bin/env bash
set -euo pipefail

# Stop the development stack (non-interactive).
# Usage: ./scripts/dev-stop.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not on PATH"
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: compose file not found: $COMPOSE_FILE"
  exit 1
fi

echo "Stopping dev stack and removing volumes..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans --volumes || true

echo "Dev stack stopped."
