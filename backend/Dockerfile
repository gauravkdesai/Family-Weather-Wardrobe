# Backend Dockerfile
FROM node:20-slim AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
# Require lockfile for production builds to keep installs deterministic and fast.
RUN if [ -f package-lock.json ]; then \
			npm ci --production --no-audit --prefer-offline; \
		else \
			echo "ERROR: backend/package-lock.json missing. Commit the lockfile to ensure deterministic builds." >&2; \
			exit 1; \
		fi
COPY . .

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
