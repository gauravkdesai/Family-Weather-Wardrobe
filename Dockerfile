# Multi-stage Dockerfile for building and serving the app
FROM node:25-alpine AS builder
WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --prefer-offline || npm install
COPY . .

# Build the app (build.mjs creates ./dist)
RUN npm run build

### Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Use a custom nginx config to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
