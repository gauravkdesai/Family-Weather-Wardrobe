# Contributing to Family Weather Wardrobe

Welcome! This guide will help you get started as a contributor.

## Local Development

### Prerequisites
- Node.js 20.x
- npm
- (Optional) Docker, gcloud CLI for cloud builds/deploys

### Setup
```bash
# Clone the repo
git clone https://github.com/gauravkdesai/Family-Weather-Wardrobe.git
cd Family-Weather-Wardrobe

# Install dependencies
npm ci
cd backend && npm ci
```

### Running Locally
- **Frontend:**
  ```bash
  export USE_MOCK_GEMINI=true
  npm run dev
  ```
- **Backend:**
  ```bash
  cd backend
  npm start
  ```
- **Cloud Function (if applicable):**
  ```bash
  cd functions
  npm start
  ```

### Testing
```bash
npm test
```

### Linting
No linter is configured yet. Add ESLint for TypeScript if desired.

### Secrets
- Never commit `.env` files or secrets.
- Use GCP Secret Manager for production secrets.
- For local dev, set env vars manually or use a local `.env` (add to `.gitignore`).

## Making Changes
- Fork and branch from `main`.
- Submit PRs; all PRs run CI checks (build, audit, tests).
- Write tests for new features or bugfixes.

## Deployment
- Cloud Build is used for GCP-native deploys.
- Images are signed with cosign and SBOMs are generated.
- See `README_SECRETS.md` for secret and KMS setup.

## Code of Conduct
Be respectful and inclusive. 

## Security
- Report vulnerabilities via GitHub Security tab or email.
- See `SECURITY_AUDIT.md` for current security posture.

---
Happy contributing!
