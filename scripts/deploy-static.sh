#!/usr/bin/env bash
set -euo pipefail

# One-click deploy: Backend to Cloud Run (us-central1) + Frontend to GCS+CDN
# Requirements:
# - gcloud auth login; config set project <PROJECT_ID>
# - APIs: run.googleapis.com, iam.googleapis.com, aiplatform.googleapis.com, storage.googleapis.com
# - Service accounts: wardrobe-backend-sa@<PROJECT_ID>.iam.gserviceaccount.com

get_project_id() {
  local pid
  pid=$(gcloud config list --format 'value(core.project)' 2>/dev/null || true)
  if [[ -z "$pid" ]]; then
    pid=$(gcloud config get-value project --quiet 2>/dev/null | tail -n1 || true)
  fi
  if [[ -z "$pid" ]]; then
    echo "ERROR: Could not determine GCP project ID. Run 'gcloud config set project <ID>'." >&2
    exit 1
  fi
  echo "$pid"
}

PROJECT_ID="$(get_project_id)"
REGION="us-central1"
BACKEND_SA="wardrobe-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"

BUCKET_NAME="fw-wardrobe-frontend-${PROJECT_ID}"
INDEX_FILE="index.html"

echo "Project: ${PROJECT_ID} | Region: ${REGION}"

echo "Enabling required APIs (idempotent)..."
gcloud services enable run.googleapis.com iam.googleapis.com aiplatform.googleapis.com storage.googleapis.com --project "${PROJECT_ID}"

echo "Deploying backend (Cloud Run, source build)..."
gcloud run deploy backend-service \
  --source=./backend \
  --region="${REGION}" \
  --allow-unauthenticated \
  --service-account="${BACKEND_SA}" \
  --platform=managed

BACKEND_URL="$(gcloud run services describe backend-service --platform=managed --region="${REGION}" --format='value(status.url)')"
echo "Backend URL: ${BACKEND_URL}"

echo "Building frontend..."
npm ci
npm run build

# Prepare env.js with backend URL injected and no-store caching
DIST_DIR="dist"
ENV_JS_PATH="${DIST_DIR}/env.js"
cat > "${ENV_JS_PATH}" <<EOF
// runtime env injected at deploy time
window.__ENV = {
  FUNCTION_URL: "${BACKEND_URL}",
};
EOF

echo "Creating bucket (if not exists) and configuring website & IAM..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://${BUCKET_NAME}"
fi

# Set public read for website content (optional: can front with Cloud CDN signed URLs)
gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"

# Upload files
echo "Uploading static site to gs://${BUCKET_NAME}..."
gsutil -m rsync -r "${DIST_DIR}" "gs://${BUCKET_NAME}"

# Cache control: hashed bundles immutable, env.js no-store, index.html no-cache
echo "Setting cache headers..."
# env.js: no-store
gsutil setmeta -h "Cache-Control:no-store" "gs://${BUCKET_NAME}/env.js" || true
# index.html: must-revalidate (or max-age=0)
gsutil setmeta -h "Cache-Control:no-cache, max-age=0" "gs://${BUCKET_NAME}/${INDEX_FILE}" || true
# Hashed assets: long-lived caching (assuming bundle.*.js, assets/*)
for obj in $(gsutil ls "gs://${BUCKET_NAME}/" | grep -E 'bundle\.[a-f0-9]{8,}\.js$' || true); do
  gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" "$obj" || true
done
for obj in $(gsutil ls "gs://${BUCKET_NAME}/assets/**" || true); do
  gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" "$obj" || true
done

SITE_URL="https://storage.googleapis.com/${BUCKET_NAME}/index.html"
echo "Frontend URL: ${SITE_URL}"
echo "Deployment complete. Open: ${SITE_URL}"
