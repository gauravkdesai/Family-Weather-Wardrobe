<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Family Weather Wardrobe

Get personalized clothing suggestions for your family based on today's weather or an upcoming trip, powered by Google Gemini AI.

## Architecture

- **Frontend**: Static React SPA hosted on Google Cloud Storage
- **Backend**: Node.js/Express API on Cloud Run (us-central1)
- **AI**: Vertex AI Gemini 2.0 Flash in us-central1

## Local Development

**Prerequisites:** Node.js 16+

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. Run backend locally (optional, uses mock data by default):
   ```bash
   cd backend
   GEMINI_API_KEY=your-api-key npm start
   ```

3. Run frontend dev server:
   ```bash
   npm run dev
   ```
   The app opens at `http://localhost:5173` and uses mock data unless you configure `VITE_FUNCTION_URL`.

## Deploy to Google Cloud

**Prerequisites:**
- GCP project with billing enabled
- `gcloud` CLI configured: `gcloud auth login && gcloud config set project YOUR_PROJECT_ID`

### Manual CLI Deployment (Recommended)

Run the deployment script locally to deploy backend (Cloud Run) and frontend (GCS):

```bash
bash scripts/deploy-static.sh
```

This script:
1. Enables required APIs (Cloud Run, IAM, Vertex AI, Storage)
2. Deploys backend to Cloud Run (source build from `./backend`)
3. Builds frontend bundle with hashed assets
4. Creates/configures GCS bucket for static hosting
5. Uploads frontend with proper cache headers
6. Injects backend URL into `env.js` at deploy time

**Outputs:**
- Backend URL: `https://backend-service-<hash>.us-central1.run.app`
- Frontend URL: `https://storage.googleapis.com/fw-wardrobe-frontend-<project-id>/index.html`

### Initial Setup (One-Time)

If deploying for the first time, run the bootstrap script to create the service account:

```bash
bash scripts/bootstrap-gcp.sh
```

This creates `wardrobe-backend-sa@<project>.iam.gserviceaccount.com` with minimal Vertex AI permissions.

## Continuous Integration (GitHub Actions)

GitHub Actions is configured for **tests only** (no auto-deploy). The single workflow file `.github/workflows/ci.yml`:

- Installs dependencies (root + backend)
- Runs tests (`npm test`) if present
- Runs lint (`npm run lint`) if present

There is intentionally **no deploy workflow** to avoid noisy failures. All deployment is done via the CLI using `scripts/deploy-static.sh`.

If you later want to add deploy automation, create a new workflow that:
1. Authenticates with Workload Identity Federation
2. Runs `bash scripts/deploy-static.sh`
3. Is gated behind a secret like `DEPLOY_ENABLED=true`

Until then, deployment remains manual, secure, and fully under your control.

## Project Structure

```
├── App.tsx                 # Main React component
├── components/             # React UI components
├── services/               # API client (geminiService.ts)
├── backend/                # Express backend
│   ├── server.js          # API endpoints (/healthz, /suggestions)
│   ├── geminiClient.js    # Vertex AI integration
│   └── Dockerfile         # Backend container config
├── build.mjs              # Frontend build script (hashing, SRI)
├── scripts/
│   ├── deploy-static.sh   # One-click deployment
│   └── bootstrap-gcp.sh   # Initial GCP setup
└── dist/                  # Built frontend assets (generated)
```

## Configuration

### Backend Environment Variables
- `GEMINI_API_KEY`: Vertex AI uses Application Default Credentials (not needed in Cloud Run)
- `PORT`: Server port (default 8080)
- `LOG_LEVEL`: Winston log level (default `info`)

### Frontend Environment
- Runtime config injected via `env.js` at deploy time
- `FUNCTION_URL`: Backend API URL (set automatically by deploy script)

## Security Features

- Hashed bundle names with SRI (Subresource Integrity)
- Immutable caching for JS bundles (1 year)
- No-store caching for `env.js`
- No-cache for `index.html`
- Rate limiting on backend (100 req/15min per IP)
- Minimal IAM permissions (service account with only `aiplatform.user`)

## Troubleshooting

**Frontend shows mock SF weather:**
- Hard refresh the browser (Cmd+Shift+R)
- Check console for `FUNCTION_URL` value
- Verify `env.js` exists: `curl https://storage.googleapis.com/.../env.js`

**Backend timeout:**
- Cold starts can take 10-15s
- Frontend has 30s timeout with automatic retry
- Check backend logs: `gcloud run logs read backend-service --region=us-central1`

**Deployment fails:**
- Ensure APIs are enabled: `gcloud services list --enabled`
- Verify service account exists: `gcloud iam service-accounts list`
- Check IAM roles: `gcloud projects get-iam-policy PROJECT_ID`

## Cost Optimization

- Cloud Run: Pay per request (free tier: 2M requests/month)
- GCS: Storage + bandwidth (free tier: 5GB storage, 1GB egress/month)
- Vertex AI: Pay per token (Gemini 2.0 Flash is cost-effective)
- Estimated cost for personal use: <$5/month

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
