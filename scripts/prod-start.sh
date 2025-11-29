#!/usr/bin/env bash
set -euo pipefail

# Start the production-style stack (nginx frontend + backend) in detached mode.
# If $GOOGLE_CREDENTIALS_PATH is set, the compose override will be used to mount it.
# Usage: ./scripts/prod-start.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_COMPOSE="$REPO_ROOT/docker-compose.prod.yml"
OVERRIDE="$REPO_ROOT/docker-compose.prod.override.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not on PATH"
  exit 1
fi

if [ ! -f "$BASE_COMPOSE" ]; then
  echo "ERROR: compose file not found: $BASE_COMPOSE"
  exit 1
fi

if [ -n "${GOOGLE_CREDENTIALS_PATH-}" ] && [ -f "$OVERRIDE" ]; then
  echo "Using override compose to mount credentials: $GOOGLE_CREDENTIALS_PATH"
  docker compose -f "$BASE_COMPOSE" -f "$OVERRIDE" up -d --build
else
  # If the stack is expected to use real GenAI (USE_MOCK_GEMINI=false), require credentials.
  if [ "${USE_MOCK_GEMINI:-true}" = "false" ]; then
    # Check for possible credential sources: explicit GOOGLE_CREDENTIALS_PATH, GOOGLE_API_KEY, or GOOGLE_APPLICATION_CREDENTIALS
    if [ -n "${GOOGLE_CREDENTIALS_PATH-}" ] && [ -f "${GOOGLE_CREDENTIALS_PATH}" ]; then
      echo "Using provided GOOGLE_CREDENTIALS_PATH: $GOOGLE_CREDENTIALS_PATH"
      docker compose -f "$BASE_COMPOSE" -f "$OVERRIDE" up -d --build
    elif [ -n "${GOOGLE_API_KEY-}" ]; then
      echo "Using GOOGLE_API_KEY from environment to start prod stack"
      docker compose -f "$BASE_COMPOSE" up -d --build
    elif [ -n "${GOOGLE_APPLICATION_CREDENTIALS-}" ] && [ -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]; then
      echo "Using GOOGLE_APPLICATION_CREDENTIALS from environment: $GOOGLE_APPLICATION_CREDENTIALS"
      docker compose -f "$BASE_COMPOSE" up -d --build
    else
      echo "ERROR: USE_MOCK_GEMINI=false but no credentials detected. Provide GOOGLE_CREDENTIALS_PATH, GOOGLE_API_KEY, or set GOOGLE_APPLICATION_CREDENTIALS pointing to a file." >&2
      exit 1
    fi
  else
    echo "Starting prod compose without mounted credentials (mock mode or not required)"
    docker compose -f "$BASE_COMPOSE" up -d --build
  fi
fi

echo "Prod stack started. Tail logs with:" 
echo "  docker compose -f $BASE_COMPOSE logs -f --tail=200"
