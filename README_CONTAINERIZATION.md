# Containerization & GCP deployment

This file explains how to run the app locally with Docker, use docker-compose for development, and deploy to Google Cloud Run using Cloud Build.

Local Docker (production image)
- Build image:
```
docker build -t family-weather-wardrobe:latest .
```
- Run container (port 80):
```
docker run --rm -p 8080:80 family-weather-wardrobe:latest
```
Then open http://localhost:8080

Local development (fast, with HMR)
- Start dev container using docker-compose:
```
docker-compose up
```
This maps the project into the container and runs `npm run dev`. Open http://localhost:3000

Deploy to Google Cloud Run (via Cloud Build)
Prerequisites:
- `gcloud` CLI installed and authenticated
- Billing enabled on your GCP project
- Cloud Run and Cloud Build APIs enabled
Deploy to Google Cloud Run (via Cloud Build)

Prerequisites:
- `gcloud` CLI installed and authenticated
- Billing enabled on your GCP project
- Cloud Run, Cloud Build and Artifact Registry APIs enabled

The repository includes `cloudbuild.yaml` which builds both frontend and backend images and pushes them to Artifact Registry, then deploys to Cloud Run.

Set project and submit Cloud Build (example):
```
gcloud config set project YOUR_PROJECT_ID
gcloud builds submit --config=cloudbuild.yaml \
	--substitutions=_AR_REPO=family-weather-wardrobe-repo,_REGION=us-central1
```

Notes:
- `cloudbuild.yaml` pushes to Artifact Registry in the format `${_REGION}-docker.pkg.dev/YOUR_PROJECT/${_AR_REPO}/{frontend,backend}:$SHORT_SHA`.
- For GitHub Actions you can provide a service account key in `secrets.GCP_SA_KEY` and the workflows will call `gcloud builds submit` using that key.

Manual Cloud Run deploy (optional)
```
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/family-weather-wardrobe:latest .
gcloud run deploy family-weather-wardrobe --image gcr.io/YOUR_PROJECT_ID/family-weather-wardrobe:latest --platform=managed --region=us-central1 --allow-unauthenticated
```

Notes
- The production image uses nginx to serve the static `dist` output created by `npm run build` (this project uses `node build.mjs`).
- The docker-compose setup runs the vite dev server and mounts the repository for fast feedback.
