# Backend Dockerfile
FROM node:20-slim AS build
WORKDIR /usr/src/app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --production --no-audit --prefer-offline
COPY backend/ .

FROM node:20-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=build /usr/src/app /usr/src/app
# drop privileges
RUN groupadd -r app && useradd -r -g app app \
	&& chown -R app:app /usr/src/app
USER app
EXPOSE 8080
CMD ["node", "server.js"]
