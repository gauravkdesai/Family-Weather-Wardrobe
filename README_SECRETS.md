# Secret Manager (legacy Cloud Run notes)

> Note: The app now deploys its backend as a Cloud Function. This document is kept for reference only and describes the previous Cloud Run setup.

This guide shows recommended steps and `gcloud` commands to store secrets in **Secret Manager**, grant Cloud Run access using a dedicated service account (principle of least privilege), and inject secrets into Cloud Run as environment variables at deployment time. It also includes a small Cloud Build snippet showing how to access secrets during CI/CD without embedding them in images.

Important security notes
- Do NOT embed API keys or secrets in source or Docker images.
- Use Secret Manager for secrets and give Cloud Run service accounts only `roles/secretmanager.secretAccessor`.
- Prefer Workload Identity / service accounts over long-lived JSON keys.

Prerequisites
- `gcloud` CLI installed and authenticated
- `PROJECT_ID` set (e.g., `gcloud config set project PROJECT_ID`)

1) Create a secret and add a version

Replace `MY_SECRET` and the secret value as appropriate.

```bash
# Create the secret (first time only)
gcloud secrets create MY_SECRET --replication-policy="automatic" --project=$PROJECT_ID

# Add a version from stdin (recommended) - this avoids leaving value in shell history
echo -n "your-secret-value" | gcloud secrets versions add MY_SECRET --data-file=- --project=$PROJECT_ID
```

2) Create a dedicated service account for Cloud Run (least privilege)

```bash
gcloud iam service-accounts create wardrobe-backend-sa \
  --description="Service account for Family Weather Wardrobe backend" \
  --display-name="wardrobe-backend-sa" --project=$PROJECT_ID

# Optionally view the created service account email
SA_EMAIL=$(gcloud iam service-accounts list --filter="displayName:wardrobe-backend-sa" --format="value(email)")
echo $SA_EMAIL
```

3) Grant the service account access to the secret

Grant only `roles/secretmanager.secretAccessor` so Cloud Run can access secret versions.

```bash
gcloud secrets add-iam-policy-binding MY_SECRET \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

4) Deploy Cloud Run service with secret injected as an environment variable

Use `--service-account` to run Cloud Run with the dedicated SA and `--set-secrets` to bind the Secret Manager secret to an environment variable in the runtime. This injects the secret at runtime; it is not baked into the image.

```bash
gcloud run deploy family-weather-wardrobe-backend \
  --image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_AR_REPO}/backend:TAG \
  --region=${_REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=${SA_EMAIL} \
  --set-secrets=GOOGLE_API_KEY=projects/$PROJECT_ID/secrets/MY_SECRET:latest \
  --project=$PROJECT_ID
```

Notes:
- `GOOGLE_API_KEY` will appear in your process as `process.env.GOOGLE_API_KEY` in Node.js.
- You can add multiple `--set-secrets` flags for multiple secrets.

5) (Optional) Mount secret as a file

If you prefer to consume secrets from a file path rather than environment variable, Cloud Run supports file mounts via `--set-secrets` with a `:` suffix containing a path (example below). See `gcloud run deploy --help` for formatting options.

```bash
# Example (pseudo-syntax; check gcloud version help):
gcloud run deploy my-service \
  --image=... \
  --set-secrets=MY_FILE_SECRET=projects/$PROJECT_ID/secrets/MY_SECRET:latest=/secrets/my_secret.txt
```

6) Grant Cloud Build access to secrets during CI (recommended)

To allow Cloud Build builds to read secrets during the build (for deployment time only), bind the Cloud Build service account and use the `availableSecrets` feature in `cloudbuild.yaml`.

Example snippet for `cloudbuild.yaml`:

```yaml
availableSecrets:
  secretManager:
  - versionName: "projects/$PROJECT_ID/secrets/MY_SECRET/versions/latest"
    env: 'MY_SECRET'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        echo "Using secret inside build: $MY_SECRET" # avoid printing in real logs
        # Example: pass it to gcloud run deploy via substitution
        gcloud run deploy ... --set-secrets=GOOGLE_API_KEY=projects/$PROJECT_ID/secrets/MY_SECRET:latest

# Make sure Cloud Build service account has secretAccessor role on the secret.
```

Grant Cloud Build access to the secret:

```bash
CB_SA=$(gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" \
  --filter="bindings.role:roles/cloudbuild.builds.builder" --format="value(bindings.members)" | grep serviceAccount || true)

gcloud secrets add-iam-policy-binding MY_SECRET \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

7) Local development

- For local development, keep secrets out of source. Use a `.env` file stored locally and referenced by your dev environment (e.g., `export GOOGLE_API_KEY=...`), or configure your IDE's run configurations to set env vars.
- Do NOT commit `.env` files to git. Add `.env` to `.gitignore`.

8) Example in Node.js

Access the secret at runtime in your backend code like:

```js
// server.js
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn('GOOGLE_API_KEY not set');
Important security notes
 - Do NOT embed API keys or secrets in source or Docker images.
 - Use Secret Manager for secrets and give Cloud Run service accounts only `roles/secretmanager.secretAccessor`.
 - Prefer Workload Identity / service accounts over long-lived JSON keys.
}
   # Use Workload Identity Federation in GitHub Actions (preferred) by
   # providing `WORKLOAD_IDENTITY_PROVIDER` and `GCP_SA` repository secrets.
   # If you must use a service account key, provide it in `GCP_SA_KEY` (not recommended).
   project_id: ${{ secrets.GCP_PROJECT }}

9) Security best practices
- Prefer Workload Identity / ADC over API keys; when running on GCP, the Google GenAI client can use ADC and you may not need an API key.
- Rotate secrets regularly and use Secret Manager versions.
- Grant only `roles/secretmanager.secretAccessor` to runtime service accounts.
- Use VPC egress and private access for services that need to access sensitive backends.

If you'd like, I can add a small deployment script that automates creating the service account, binding the secret, and deploying the Cloud Run service with secrets bound. Would you like that? 
