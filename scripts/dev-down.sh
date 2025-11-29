#!/usr/bin/env bash
set -euo pipefail

# Deprecated wrapper kept for compatibility. Use the new consolidated script:
#   ./scripts/dev-stop.sh

echo "This script is deprecated. Running ./scripts/dev-stop.sh instead..."
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/dev-stop.sh" "$@"
