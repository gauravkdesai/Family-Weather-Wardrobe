# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install dependencies (production)
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --production --no-audit --prefer-offline || npm install --production

# Copy source
COPY backend/ .

EXPOSE 8080
CMD ["node", "server.js"]
