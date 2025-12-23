# Troubleshooting Guide: Family Weather Wardrobe

## Common Issues

### 1. Build or Install Fails
- Ensure Node.js 20.x is installed (`node -v`).
- Run `npm ci` in repo root.
- Delete `node_modules` and `package-lock.json` if issues persist, then retry.

### 2. Frontend Not Connecting to Backend
- Check that `VITE_FUNCTION_URL` (build-time) or `FUNCTION_URL` (runtime) points to the Cloud Function URL.
- For local dev, set `VITE_USE_MOCK_GEMINI=true` to use mock data.
- Confirm the Cloud Function allows your origin via `ALLOWED_ORIGINS`.

### 3. Cloud Build or Deploy Fails
- Verify GCP project, IAM roles, and service account permissions for Cloud Functions and Vertex AI.
- Ensure secrets/env vars are provided via `FUNCTION_ENV_VARS` or GitHub secrets as needed.
- Check GitHub Actions logs for auth (Workload Identity Federation) errors.

### 4. Tests Fail
- Run `npm test` in repo root.
- Ensure all dependencies are installed.
- Check for missing or outdated devDependencies.

### 5. Docker Build Issues
- Docker builds are no longer required (Cloud Functions). If you do containerize, pin to `node:20-slim` and keep images minimal.

### 6. Secrets Not Injected
- For Cloud Functions, use `--set-env-vars` or the GitHub Actions variable `FUNCTION_ENV_VARS` to provide secrets/keys.
- Locally, set env vars manually or use a `.env` file (never commit).

### 7. SBOM or Cosign Signing Fails
- Confirm KMS key URI and permissions.
- Ensure `cosign` and `syft` images are available in Cloud Build.
- Check Cloud Build logs for error details.

## Debugging Tips
- Use verbose logging via Cloud Function logs.
- Check logs in GCP Cloud Logging for the `wardrobe-suggestions` function.
- Use `gcloud functions describe/read` to inspect function status and IAM bindings.

## Getting Help
- Review `CONTRIBUTING.md` for setup steps.
- Check open issues on GitHub.
- Ask questions via GitHub Discussions or contact maintainers.

---
If you encounter a new issue, please open a GitHub issue with details and logs.
