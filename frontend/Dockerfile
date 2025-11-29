# Frontend multi-stage Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (fail-fast if lockfile missing to ensure deterministic builds)
COPY package.json package-lock.json ./
RUN if [ -f package-lock.json ]; then \
			npm ci --no-audit --prefer-offline; \
		else \
			echo "ERROR: package-lock.json is missing. Commit your lockfile to ensure deterministic builds." >&2; \
			exit 1; \
		fi

# Copy sources and build
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
