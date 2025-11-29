#!/usr/bin/env bash
set -euo pipefail

# Collect useful Docker compose logs and diagnostics for the dev stack
# Usage: ./scripts/collect-logs.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yml"
OUT_DIR="$REPO_ROOT/logs"

mkdir -p "$OUT_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT_BASE="$OUT_DIR/dev-logs-$TS"

echo "Collecting docker compose ps..."
docker compose -f "$COMPOSE_FILE" ps > "$OUT_BASE.ps.txt" 2>&1 || true

echo "Collecting backend logs (last 1000 lines)..."
docker compose -f "$COMPOSE_FILE" logs --tail=1000 backend > "$OUT_BASE.backend.log" 2>&1 || true

echo "Collecting frontend logs (last 1000 lines)..."
docker compose -f "$COMPOSE_FILE" logs --tail=1000 frontend-dev > "$OUT_BASE.frontend.log" 2>&1 || true

echo "Collecting docker container list and inspect data..."
docker ps --filter "name=family-weather" --no-trunc -a > "$OUT_BASE.ps.full.txt" 2>&1 || true

for cid in $(docker ps --filter "name=family-weather" -q); do
  echo "Inspecting $cid"
  docker inspect "$cid" > "$OUT_BASE.inspect.$cid.json" 2>&1 || true
done

echo "Archiving logs to $OUT_BASE.tar.gz"
tar -czf "$OUT_BASE.tar.gz" -C "$OUT_DIR" "$(basename "$OUT_BASE.ps.txt")" "$(basename "$OUT_BASE.backend.log")" "$(basename "$OUT_BASE.frontend.log")" || true

echo "Logs collected in $OUT_BASE.tar.gz"
echo "If you'd like, paste the contents of the backend log file: $OUT_BASE.backend.log"
