<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Family Weather Wardrobe

Get personalized clothing suggestions for your family based on today's weather or an upcoming trip, powered by Google Gemini AI.

## Architecture

- **Frontend**: Static React SPA published to GitHub Pages (custom domain)
- **Backend**: Google Cloud Functions (gen2) HTTP function `wardrobe-suggestions`
- **AI**: Vertex AI Gemini 2.x Flash in `us-central1`

## Local Development

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run frontend dev server (uses mock data unless `VITE_FUNCTION_URL` is set):
   ```bash
   npm run dev
   ```
   The app opens at `http://localhost:5173`.

## Deployments

- **Frontend (GitHub Pages)**: `.github/workflows/deploy-pages.yml` builds with Vite and publishes `dist/` to Pages. Requires secret `FUNCTION_URL` set to the deployed Cloud Function URL. Manual deploy: `VITE_FUNCTION_URL="https://<function>.run.app" npm run build && npm run deploy`.
- **Backend (Cloud Functions gen2)**: `.github/workflows/deploy-backend.yml` builds `functions/dist` then deploys via gcloud with Workload Identity Federation. Requires secrets `GCP_PROJECT_ID`, `GCP_REGION` (optional, defaults `us-central1`), `GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_WORKLOAD_IDENTITY_PROVIDER`. Optional repo var `FUNCTION_ENV_VARS` to set env vars (e.g., `GEMINI_MODEL=gemini-2.5-flash,ALLOWED_ORIGINS=https://weather-appropriate-wardrobe.gaurav-desai.com`).

## Continuous Integration (GitHub Actions)

CI (`.github/workflows/ci.yml`) installs dependencies and runs tests/lint. Deploys are handled by the two dedicated workflows above.

## Project Structure

```
├── App.tsx                 # Main React component
├── components/             # React UI components
├── services/               # API client (geminiService.ts)
├── functions/              # Cloud Function source (suggestions.ts) + build config
├── public/                 # Static assets for Pages
├── dist/                   # Built frontend assets (generated)
```

## Configuration

### Backend Environment Variables
- `GEMINI_API_KEY`: Only needed locally if ADC unavailable
- `GEMINI_MODEL`: Required (e.g., `gemini-2.5-flash`)
- `GEMINI_MAX_RETRIES`: Default `3`
- `ALLOWED_ORIGINS`: Required comma-separated allowlist for CORS
- `USE_MOCK_GEMINI`: Set `true` to bypass Gemini calls

Production non-secrets are captured in `config/functions.prod.env` (backend) and `.env.production` (frontend). Do not put secrets (API keys) in these checked-in files.

### Frontend Environment (Vite)
- `VITE_FUNCTION_URL`: Cloud Function URL (required for live data)
- `VITE_FUNCTION_FETCH_TIMEOUT_MS`: Default `30000`
- `VITE_USE_MOCK_GEMINI`: Default `false`

## Security Features

- Hashed bundle names with SRI (Subresource Integrity)
- Immutable caching for JS bundles (1 year)
- No-store caching for `env.js`
- No-cache for `index.html`
- CORS allowlist for backend
- Minimal IAM permissions (service account scoped for Cloud Functions + Vertex AI)

## Troubleshooting

**Frontend shows mock SF weather:**
- Hard refresh the browser (Cmd+Shift+R)
- Check console for `FUNCTION_URL` value
- Verify `env.js` exists: `curl https://storage.googleapis.com/.../env.js`

**Backend timeout:**
- Cold starts can take a few seconds
- Frontend has 30s timeout with automatic retry
- Check backend logs: `gcloud functions logs read wardrobe-suggestions --region=us-central1`

**Deployment fails:**
- Ensure APIs are enabled: `gcloud services list --enabled`
- Verify service account exists: `gcloud iam service-accounts list`
- Check IAM roles: `gcloud projects get-iam-policy PROJECT_ID`

## Cost Optimization

- Cloud Functions: Pay per request (scale-to-zero)
- GitHub Pages: Free for public repos
- Vertex AI: Pay per token (Gemini 2.x Flash is cost-effective)
- Estimated cost for personal use: low single-digit USD/month

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
