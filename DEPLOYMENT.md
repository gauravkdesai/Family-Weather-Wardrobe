**Google Cloud Run Deployment — Setup & Notes**

This document explains how to build, deploy, and run the Family-Weather-Wardrobe app on Google Cloud Run using either GitHub Actions (recommended for GitHub-hosted repos) or Cloud Build. The CI/CD pipelines use Workload Identity Federation — no long-lived service account keys are stored in the repository or build artifacts.

**High-level architecture**
- Frontend: static SPA served from Cloud Run (NGINX container). Service name: `frontend-service`.
- Backend: Node.js API proxy that calls Gemini LLM via `@google/genai`. Service name: `backend-service`.
- Container images are stored in Artifact Registry.

---

Requirements
- A Google Cloud project with billing enabled.
- Artifact Registry (Docker) repository created.
- Cloud Run API enabled.
- A Google service account which Cloud Run services will run as (grant APIs: Logging, Secret Manager if used, and genAI access as needed).
- A Workload Identity Pool and Provider configured for GitHub Actions (or for your CI system) so CI can authenticate without service account keys.

Recommended GitHub secrets (Repository Settings → Secrets → Actions):
- `GCP_PROJECT` - your GCP project id
- `GCP_REGION` - e.g. `us-central1`
- `ARTIFACT_REGISTRY_REPO` - the Artifact Registry repo name
- `WORKLOAD_IDENTITY_PROVIDER` - full provider resource, e.g. `projects/123456789/locations/global/workloadIdentityPools/pool/providers/provider`
- `GCP_SA` - service account email the GitHub Action will impersonate (e.g. `ci-deployer@PROJECT.iam.gserviceaccount.com`)
- `CLOUD_RUN_SA` - service account email that Cloud Run services will use at runtime (this SA must have permissions to call genAI if needed)

Important notes about credentials and Gemini (genAI)
- The backend uses `@google/genai` and prefers Application Default Credentials (ADC). When running in Cloud Run, ADC will use the Cloud Run service account (the `CLOUD_RUN_SA`).
- Do NOT place API keys or service account JSON in the repo. For local development you may set `GOOGLE_API_KEY` or run `gcloud auth application-default login` (development only).
- For GitHub Actions, the workflow uses Workload Identity Federation (see `.github/workflows/gcp-deploy.yml`) so CI actions can call `gcloud` and deploy without storing JSON keys.

Domain mapping (optional)
- To map `frontend-service` to a custom domain, verify the domain in Google Search Console and then:
  - Run: `gcloud run domain-mappings create --service=frontend-service --domain=www.example.com --region=${GCP_REGION}`
  - Follow DNS instructions to add the CNAME/A records provided by gcloud.

Local development
- Backend: `cd backend && npm install && npm run dev` (use `USE_MOCK_GEMINI=true` to run without GCP credentials)
- Frontend: from repo root use `npm install` and `npm run dev` (Vite dev server)

Testing locally with ADC
- Install and authenticate gcloud: `gcloud auth login` and then `gcloud auth application-default login`.
- This allows the `@google/genai` library to use your user credentials for local testing (not for production).

CI/CD choices
- GitHub Actions: recommended. See `.github/workflows/gcp-deploy.yml` which builds frontend and backend using `gcloud builds submit` and deploys to Cloud Run.
- Cloud Build: If you'd rather build & deploy purely on GCP, use `cloudbuild.yaml` at the repo root. Cloud Build will run with its Cloud Build service account.

Automatic deploys
- Commits pushed to `main` trigger the `gcp-deploy.yml` workflow which builds images and deploys both services.
- Pull requests run `pr-check.yml` which builds, lints, and runs tests. Only when PRs are merged into `main` will deployment occur.
- The Cloud Run deployments are configured to be publicly accessible (`--allow-unauthenticated`) so the frontend is reachable by anyone.

Security / Permissions checklist
- The service account specified by `CLOUD_RUN_SA` (Cloud Run runtime) should have the minimal roles required:
  - `roles/logging.logWriter` (Cloud Logging)
  - `roles/iam.serviceAccountUser` (if needed for impersonation)
  - API-specific roles required by `@google/genai` or other Google APIs
- The GitHub Actions impersonation account (`GCP_SA`) should have permissions to `roles/run.admin`, `roles/iam.serviceAccountUser` (to set runtime SA), and `roles/artifactregistry.writer`.

Helpful commands (examples)
  # Build & push locally with gcloud
  gcloud auth login
  gcloud config set project YOUR_PROJECT
  REGION=us-central1
  REPO=my-artifacts
  SHORT_SHA=$(git rev-parse --short HEAD)
  gcloud builds submit --tag ${REGION}-docker.pkg.dev/$PROJECT/${REPO}/backend:${SHORT_SHA} -f backend/Dockerfile .

  # Deploy backend
  gcloud run deploy backend-service --image ${REGION}-docker.pkg.dev/$PROJECT/${REPO}/backend:${SHORT_SHA} --region ${REGION} --platform managed --service-account YOUR_CLOUD_RUN_SA

Troubleshooting
- If builds fail because a `package-lock.json` is missing, either generate and commit a lockfile or modify the Dockerfile to allow npm install in CI. Committing a lockfile is recommended.

If you'd like, I can:
- Create example IAM commands to create the Workload Identity Pool/provider and bind the GitHub OIDC provider.
- Update the backend to add an explicit health check and readiness probe config for Cloud Run.
