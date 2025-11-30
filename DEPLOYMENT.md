# Deployment Guide

## Architecture

- **Frontend**: GitHub Pages (https://weather-appropriate-wardrobe.gaurav-desai.com)
- **Backend**: Google Cloud Run (https://backend-service-gwxhmfeqoa-uc.a.run.app)

## Security

- **CORS**: Backend only accepts requests from authorized domains
- **Rate Limiting**: 100 requests per hour per IP address

## Deploy Backend

```bash
bash scripts/deploy-backend.sh
```

This deploys the Express.js backend to Cloud Run in `us-central1`.

## Deploy Frontend

```bash
npm run deploy
```

This builds and deploys to GitHub Pages. First-time setup requires:

### One-Time GitHub Pages Setup

1. Go to repo settings: https://github.com/gauravkdesai/Family-Weather-Wardrobe/settings/pages
2. Under "Source", select: **Deploy from a branch**
3. Branch: **gh-pages** (will be created automatically on first deploy)
4. Folder: **/ (root)**
5. Click Save

### Custom Domain Setup (weather-appropriate-wardrobe.gaurav-desai.com)

1. **Add DNS Record** in your domain registrar:
   - Type: `CNAME`
   - Name: `weather-appropriate-wardrobe`
   - Value: `gauravkdesai.github.io`
   - TTL: `3600` (or default)

2. **Configure in GitHub**:
   - Go to: https://github.com/gauravkdesai/Family-Weather-Wardrobe/settings/pages
   - Under "Custom domain", enter: `weather-appropriate-wardrobe.gaurav-desai.com`
   - Check "Enforce HTTPS" (wait for certificate to provision, ~15 minutes)

3. **Verify**: 
   ```bash
   dig weather-appropriate-wardrobe.gaurav-desai.com CNAME
   # Should show: weather-appropriate-wardrobe.gaurav-desai.com. 3600 IN CNAME gauravkdesai.github.io.
   ```

## Testing Locally

```bash
# Start frontend dev server
npm run dev

# In another terminal, test backend locally
cd backend
npm install
npm start
```

## Allowed Origins

Update `backend/server.js` if you need to add more allowed origins:

```javascript
const allowedOrigins = [
  'https://weather-appropriate-wardrobe.gaurav-desai.com',
  'https://gauravkdesai.github.io',
  'http://localhost:5173',
];
```

## Removing Old GCS Deployment

To clean up the old Google Cloud Storage deployment:

```bash
# List buckets
gsutil ls

# Delete the frontend bucket (if you want to remove it)
gsutil -m rm -r gs://fw-wardrobe-frontend-gen-lang-client-0325151027
```
