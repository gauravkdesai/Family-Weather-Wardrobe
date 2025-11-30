#!/usr/bin/env bash
set -euo pipefail

# Deploy backend to Cloud Run only (frontend uses GitHub Pages)

echo "Getting project ID..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
  echo "Error: No active project. Run 'gcloud config set project YOUR_PROJECT_ID'"
  exit 1
fi

REGION="us-central1"

echo "Project: $PROJECT_ID | Region: $REGION"
echo "Deploying backend (Cloud Run, source build)..."

gcloud run deploy backend-service \
  --source=./backend \
  --region="$REGION" \
  --allow-unauthenticated \
  --platform=managed \
  --memory=512Mi \
  --timeout=60s

# Get backend URL
BACKEND_URL=$(gcloud run services describe backend-service --region="$REGION" --format='value(status.url)')
echo ""
echo "Backend URL: $BACKEND_URL"
echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "To deploy frontend to GitHub Pages, run:"
echo "  npm run deploy"
