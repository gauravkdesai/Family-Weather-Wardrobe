#!/usr/bin/env bash
set -euo pipefail

# Cleanup script for GCP resources
# This removes ALL Cloud Run services, Artifact Registry repos, and GCS buckets
# related to Family-Weather-Wardrobe project

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: No GCP project configured. Run 'gcloud config set project <PROJECT_ID>'"
  exit 1
fi

echo "🧹 Cleaning up GCP project: ${PROJECT_ID}"
echo ""

# Confirmation prompt
read -p "⚠️  This will DELETE all Cloud Run services, Artifact Registry repos, and GCS buckets. Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo ""
echo "=== Deleting Cloud Run Services ==="

# Delete all Cloud Run services
SERVICES=$(gcloud run services list --platform=managed --format="value(metadata.name,metadata.namespace)" 2>/dev/null || true)
if [[ -n "$SERVICES" ]]; then
  while IFS=$'\t' read -r service region; do
    echo "Deleting service: ${service} in ${region}..."
    gcloud run services delete "${service}" --region="${region}" --platform=managed --quiet || echo "  ⚠️  Failed to delete ${service}"
  done <<< "$SERVICES"
else
  echo "No Cloud Run services found."
fi

echo ""
echo "=== Deleting Artifact Registry Repositories ==="

# Delete all Artifact Registry repos
REPOS=$(gcloud artifacts repositories list --format="value(name,location)" 2>/dev/null || true)
if [[ -n "$REPOS" ]]; then
  while IFS=$'\t' read -r repo location; do
    repo_name=$(basename "$repo")
    echo "Deleting repository: ${repo_name} in ${location}..."
    gcloud artifacts repositories delete "${repo_name}" --location="${location}" --quiet || echo "  ⚠️  Failed to delete ${repo_name}"
  done <<< "$REPOS"
else
  echo "No Artifact Registry repositories found."
fi

echo ""
echo "=== Deleting GCS Buckets ==="

# Delete GCS buckets (filter for project-related names)
BUCKETS=$(gcloud storage buckets list --format="value(name)" 2>/dev/null | grep -E "wardrobe|family-weather" || true)
if [[ -n "$BUCKETS" ]]; then
  while read -r bucket; do
    echo "Deleting bucket: ${bucket}..."
    gcloud storage rm -r "gs://${bucket}" --quiet || echo "  ⚠️  Failed to delete ${bucket}"
  done <<< "$BUCKETS"
else
  echo "No related GCS buckets found."
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: bash scripts/deploy-static.sh"
echo "  2. This will deploy fresh resources to us-central1"
