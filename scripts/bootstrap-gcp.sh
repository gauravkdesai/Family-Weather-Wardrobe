#!/usr/bin/env bash
set -euo pipefail

# Bootstrap GCP resources for Family-Weather-Wardrobe
# Creates Artifact Registry, enables APIs, creates service accounts, binds IAM, creates a secret,
# and optionally submits the cloudbuild to build & deploy services.

PROJECT_ID=${PROJECT_ID:-""}
REGION=${REGION:-"us-central1"}
AR_REPO=${AR_REPO:-"family-weather-wardrobe-repo"}
BACKEND_SA=${BACKEND_SA:-"wardrobe-backend-sa"}
GEMINI_SECRET_NAME=${GEMINI_SECRET_NAME:-"GEMINI_API_KEY"}

usage() {
  cat <<EOF
Usage: PROJECT_ID=your-project-id ./scripts/bootstrap-gcp.sh [--no-deploy]

Environment variables (can be exported or passed inline):
  PROJECT_ID           (required) your GCP project id
  REGION               (optional) default: us-central1
  AR_REPO              (optional) Artifact Registry repo name (default: ${AR_REPO})
  BACKEND_SA           (optional) backend service account id (default: ${BACKEND_SA})
  GEMINI_SECRET_NAME   (optional) Secret Manager secret name for Gemini API key (default: ${GEMINI_SECRET_NAME})

Flags:
  --no-deploy  create resources but do not submit cloudbuild for deployment

EOF
  exit 1
}

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: PROJECT_ID must be provided. Example: PROJECT_ID=my-project ./scripts/bootstrap-gcp.sh"
  usage
fi

NO_DEPLOY=0
if [[ "${1:-}" == "--no-deploy" ]]; then
  NO_DEPLOY=1
fi

echo "Bootstrapping project: $PROJECT_ID (region: $REGION)"

echo "1) Enabling required APIs..."
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com iam.googleapis.com --project=$PROJECT_ID

echo "2) Creating Artifact Registry repo (if not exists): $AR_REPO"
if gcloud artifacts repositories describe $AR_REPO --location=$REGION --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Artifact Registry repo $AR_REPO already exists"
else
  gcloud artifacts repositories create $AR_REPO --repository-format=docker --location=$REGION --description="Artifact Registry for Family-Weather-Wardrobe" --project=$PROJECT_ID
fi

# Create backend service account
BACKEND_SA_EMAIL="${BACKEND_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "3) Creating backend service account: $BACKEND_SA_EMAIL"
if gcloud iam service-accounts describe $BACKEND_SA_EMAIL --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Service account $BACKEND_SA_EMAIL already exists"
else
  gcloud iam service-accounts create $BACKEND_SA --display-name="Backend service account" --project=$PROJECT_ID
fi


PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "4) Creating a dedicated deployer service account and tightening IAM"
# Create a deployer service account that will hold Cloud Run deploy permissions.
DEPLOYER_SA_ID="cloud-run-deployer-sa"
DEPLOYER_SA_EMAIL="${DEPLOYER_SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe ${DEPLOYER_SA_EMAIL} --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Deployer SA ${DEPLOYER_SA_EMAIL} already exists"
else
  gcloud iam service-accounts create ${DEPLOYER_SA_ID} --display-name="Cloud Run deployer" --project=$PROJECT_ID
fi

echo "- Granting deployer SA minimal Cloud Run admin permissions (resource-level where possible)"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/run.admin" --project=$PROJECT_ID || true
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" --project=$PROJECT_ID || true

echo "- Grant Cloud Build service account permission to impersonate the deployer SA (iam.serviceAccountUser on the deployer)"
gcloud iam service-accounts add-iam-policy-binding ${DEPLOYER_SA_EMAIL} \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" --project=$PROJECT_ID || true

echo "5) Granting resource-level access to Cloud Build service account"
# Artifact Registry: grant writer on the specific repository instead of project-wide
gcloud artifacts repositories add-iam-policy-binding $AR_REPO --location=$REGION \
  --member="serviceAccount:${CB_SA}" --role="roles/artifactregistry.writer" --project=$PROJECT_ID || true

# Secret Manager: grant secretAccessor to Cloud Build SA for the specific secret
if gcloud secrets describe $GEMINI_SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
  gcloud secrets add-iam-policy-binding $GEMINI_SECRET_NAME \
    --member="serviceAccount:${CB_SA}" \
    --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID || true
else
  echo "Note: Secret $GEMINI_SECRET_NAME does not yet exist. When you create it, grant the Cloud Build SA secretAccessor on the secret."
fi

echo "6) Granting Secret Manager access to backend service account"
gcloud secrets add-iam-policy-binding $GEMINI_SECRET_NAME \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID 2>/dev/null || true

echo "7) Create Workload Identity Pool and Provider for GitHub Actions (optional but recommended)"
WIP_POOL_ID="github-pool"
WIP_PROVIDER_ID="github-provider"

if gcloud iam workload-identity-pools describe $WIP_POOL_ID --location="global" --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Workload Identity Pool $WIP_POOL_ID already exists"
else
  gcloud iam workload-identity-pools create $WIP_POOL_ID --location="global" --description="Pool for GitHub Actions OIDC" --project=$PROJECT_ID
fi

if gcloud iam workload-identity-pools providers describe $WIP_PROVIDER_ID --workload-identity-pool=$WIP_POOL_ID --location="global" --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Provider $WIP_PROVIDER_ID already exists in pool $WIP_POOL_ID"
else
  # Create an OIDC provider for GitHub Actions tokens. You should later restrict the allowed repository via attribute conditions.
  gcloud iam workload-identity-pools providers create-oidc $WIP_PROVIDER_ID \
    --workload-identity-pool=$WIP_POOL_ID --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.aud=assertion.aud" \
    --display-name="GitHub Actions provider" --project=$PROJECT_ID
fi

# Allow the provider to impersonate the deployer SA (restrict via provider in member)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
WIP_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIP_POOL_ID}/providers/${WIP_PROVIDER_ID}"

echo "Binding workload identity principal to deployer SA (allows GitHub Actions from configured repo to impersonate the deployer SA)"
gcloud iam service-accounts add-iam-policy-binding ${DEPLOYER_SA_EMAIL} \
  --member="${WIP_PRINCIPAL}" --role="roles/iam.workloadIdentityUser" --project=$PROJECT_ID || true

echo "NOTE: The provider is permissive by default for all repos. After creating the provider, restrict access by adding an IAM condition that matches your GitHub repository (see SECURITY_AUDIT.md and README_SECRETS.md)."

echo "6) Create Secret Manager secret if it does not already exist: $GEMINI_SECRET_NAME"
if gcloud secrets describe $GEMINI_SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Secret $GEMINI_SECRET_NAME already exists. You can add a version with: gcloud secrets versions add $GEMINI_SECRET_NAME --data-file=-"
else
  echo "Creating secret $GEMINI_SECRET_NAME (replication=automatic)"
  gcloud secrets create $GEMINI_SECRET_NAME --replication-policy="automatic" --project=$PROJECT_ID
  echo "Add a secret version now (will prompt). Use: echo -n \"SECRET_VALUE\" | gcloud secrets versions add $GEMINI_SECRET_NAME --data-file=- --project=$PROJECT_ID"
fi

echo "7) Ensure backend SA has secret access binding (please verify)"
gcloud secrets add-iam-policy-binding $GEMINI_SECRET_NAME \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID || true

echo "8) If you want Cloud Build to deploy and build now, submitting Cloud Build (this will build and deploy images via cloudbuild.yaml)."
if [[ $NO_DEPLOY -eq 0 ]]; then
  echo "Submitting Cloud Build..."
  gcloud builds submit --config=cloudbuild.yaml --substitutions=_AR_REPO=${AR_REPO},_REGION=${REGION} --project=$PROJECT_ID
else
  echo "Skipping Cloud Build submission (use --no-deploy to avoid this)"
fi

echo "Bootstrap complete. Next steps:"
echo " - Add at least one version to Secret Manager:"
echo "   echo -n \"YOUR_GEMINI_KEY\" | gcloud secrets versions add ${GEMINI_SECRET_NAME} --data-file=- --project=${PROJECT_ID}"
echo " - Confirm the Cloud Build service account and backend SA have proper roles."
echo " - Use 'gcloud run services list --region=${REGION} --project=${PROJECT_ID}' to view deployed services."
