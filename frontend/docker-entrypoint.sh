#!/bin/sh
set -euo pipefail

# Write runtime env for the frontend app into a small JS file that the app can read.
# This allows configuring the backend URL at container start without rebuilding the image.
# Use an unquoted heredoc so shell variables are expanded into the file.
cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV = {
  FUNCTION_URL: "${FUNCTION_URL:-}",
  USE_MOCK_GEMINI: "${USE_MOCK_GEMINI:-false}"
};
EOF

# If any command provided, exec it (nginx will be the default CMD)
exec "$@"
