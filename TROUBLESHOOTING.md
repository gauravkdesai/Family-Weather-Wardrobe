# Troubleshooting Guide: Family Weather Wardrobe

## Common Issues

### 1. Build or Install Fails
- Ensure Node.js 20.x is installed (`node -v`).
- Run `npm ci` in both root and `backend/`.
- Delete `node_modules` and `package-lock.json` if issues persist, then retry.

### 2. Frontend Not Connecting to Backend
- Check that `FUNCTION_URL` is set correctly in your environment.
- For local dev, set `USE_MOCK_GEMINI=true` to use mock data.
- Ensure backend is running and accessible (default port 8080).

### 3. Cloud Build or Deploy Fails
- Verify GCP project, IAM roles, and service account permissions.
- Ensure Secret Manager secrets exist and are accessible.
- Confirm KMS key setup for cosign signing (see `README_SECRETS.md`).
- Check Artifact Registry permissions.

### 4. Tests Fail
- Run `npm test` in root and backend.
- Ensure all dependencies are installed.
- Check for missing or outdated devDependencies.

### 5. Docker Build Issues
- Ensure `.dockerignore` is present and excludes large/unwanted files.
- Use `node:20-slim` for backend and pin base images.
- Run `docker build` from repo root for frontend/backend.

### 6. Secrets Not Injected
- For Cloud Run, use `--set-secrets` to inject secrets from Secret Manager.
- Locally, set env vars manually or use a `.env` file (never commit).

### 7. SBOM or Cosign Signing Fails
- Confirm KMS key URI and permissions.
- Ensure `cosign` and `syft` images are available in Cloud Build.
- Check Cloud Build logs for error details.

## Debugging Tips
- Use verbose logging (`LOG_LEVEL=debug`) for backend.
- Check logs in GCP Cloud Logging for deployed services.
- Use `gcloud` CLI to inspect service status and IAM bindings.

## Getting Help
- Review `CONTRIBUTING.md` for setup steps.
- Check open issues on GitHub.
- Ask questions via GitHub Discussions or contact maintainers.

---
If you encounter a new issue, please open a GitHub issue with details and logs.
