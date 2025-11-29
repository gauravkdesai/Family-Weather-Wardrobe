#!/usr/bin/env bash
set -euo pipefail

# Deprecated wrapper kept for compatibility. Use the new consolidated scripts:
#   ./scripts/dev-start.sh  - start dev stack
#   ./scripts/dev-stop.sh   - stop dev stack

echo "This script is deprecated. Running ./scripts/dev-start.sh instead..."
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dev-start.sh" "$@"
