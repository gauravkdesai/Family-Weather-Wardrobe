# Deployment Guide

## Architecture

- **Frontend**: GitHub Pages (https://weather-appropriate-wardrobe.gaurav-desai.com)
- **Backend**: Google Cloud Functions (gen2) HTTP function `wardrobe-suggestions`

## What deploys and how

- `.github/workflows/deploy-pages.yml`: builds with Vite and publishes `dist/` to GitHub Pages using a custom domain. Requires the secret `FUNCTION_URL` set to the Cloud Function HTTPS URL.
- `.github/workflows/deploy-backend.yml`: builds the function bundle and deploys to Cloud Functions using Workload Identity Federation. Requires secrets `GCP_PROJECT_ID`, `GCP_REGION` (optional, defaults to us-central1), `GCP_SERVICE_ACCOUNT_EMAIL`, and `GCP_WORKLOAD_IDENTITY_PROVIDER`. Env vars for the function can come from repo variable `FUNCTION_ENV_VARS` or the checked-in `config/functions.prod.env` file (non-secret values only).

## Frontend deploy (manual)

```bash
npm install
VITE_FUNCTION_URL="https://<your-function>.run.app" npm run build
npm run deploy
```

GitHub Pages should already be configured with the custom domain. The Pages workflow handles publishing on pushes to `main` touching frontend files.

## Backend deploy (manual)

```bash
npm install
npm run build:functions
gcloud functions deploy wardrobe-suggestions \
  --gen2 --runtime nodejs20 --region=us-central1 \
  --source=functions/dist --entry-point=suggestions \
  --trigger-http --allow-unauthenticated \
  --set-env-vars "GEMINI_MODEL=gemini-2.5-flash,ALLOWED_ORIGINS=https://weather-appropriate-wardrobe.gaurav-desai.com,https://gauravkdesai.github.io,http://localhost:5173"
```

## Testing locally

```bash
# Start frontend dev server (uses mock data unless VITE_FUNCTION_URL is set)
npm run dev

# Dry-run function logic (unit tests) if present
npm test -- functions
```

## Environment variables (recommended defaults)

See `.env.example` for both frontend (Vite) and backend (Cloud Function) values. For production, non-secret defaults live in `.env.production` (frontend) and `config/functions.prod.env` (backend). Key ones:
- `GEMINI_MODEL`: required (e.g., `gemini-2.5-flash`)
- `GEMINI_MAX_RETRIES`: default `3`
- `ALLOWED_ORIGINS`: required comma-separated allowlist for CORS
