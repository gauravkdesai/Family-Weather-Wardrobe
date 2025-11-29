#!/usr/bin/env bash
set -euo pipefail

# Start the development stack (Vite frontend + backend) with a single command.
# Usage: ./scripts/dev-start.sh

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

echo "Bringing up dev stack..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Dev stack started. Tail logs with:" 
echo "  docker compose -f $COMPOSE_FILE logs -f --tail=200"
