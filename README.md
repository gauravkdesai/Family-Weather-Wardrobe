<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1z8zDGrSTeikWyc3LKocjdWxHkPGAXL5U

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local Docker development

You can run both frontend (Vite dev server) and backend inside Docker using the provided compose file and consolidated helper scripts.

- Start the dev stack (non-interactive):

```bash
chmod +x ./scripts/dev-start.sh
./scripts/dev-start.sh
```

- Stop the dev stack:

```bash
./scripts/dev-stop.sh
```

Notes:
- The compose file for dev is `docker-compose.dev.yml`.
- Host ports: frontend Vite dev server -> `3000`, backend -> `8081`.
- Environment variables for the frontend (create a `.env.local` in the repo root):

```env
# Use mocked Gemini responses (default true for local dev)
VITE_USE_MOCK_GEMINI=true

# If you want the frontend to call a running backend in Docker use the compose service URL
# (frontend inside Docker resolves `backend:8080` to the backend container)
# Example to point the frontend to the backend service in Docker:
VITE_USE_MOCK_GEMINI=false
VITE_FUNCTION_URL=http://backend:8080/suggestions

# Timeout for backend fetches
VITE_FUNCTION_FETCH_TIMEOUT_MS=8000
```

These scripts are non-interactive by default to make CI and automation easier.

Important: to ensure deterministic, fast Docker builds we require `package-lock.json` files to be committed for both frontend and backend. The production Dockerfiles will fail if a lockfile is missing — this prevents `npm install` from running during image builds and helps avoid unexpected dependency drift.

### Production (nginx) compose

You can run a production-style stack (static frontend served by nginx + backend) locally with `docker-compose.prod.yml`. This composes the built frontend image and the backend. The frontend image writes an `env.js` at container start from the `FUNCTION_URL` environment variable so you don't need to rebuild the image to point to a different backend.

Example:

```bash
# Build and start prod-style stack (serve static site with nginx)
docker compose -f docker-compose.prod.yml up --build -d

# Frontend (nginx) -> http://localhost:8080
# Backend -> http://localhost:8081
```

To control the runtime backend URL exposed to the static frontend, set env when running compose. Example:

```bash
FUNCTION_URL=http://localhost:8081 docker compose -f docker-compose.prod.yml up --build -d
```

