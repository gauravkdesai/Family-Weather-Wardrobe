.PHONY: help build-frontend build-backend run dev deploy-front deploy-back clean

help:
	@echo "Usage: make <target>"
	@echo "Targets:"
	@echo "  build-frontend   Build frontend Docker image locally"
	@echo "  build-backend    Build backend Docker image locally"
	@echo "  run              Run both services with docker-compose"
	@echo "  dev              Run docker-compose in foreground (dev)"
	@echo "  deploy-front     Build, push, and deploy frontend to Cloud Run via gcloud"
	@echo "  deploy-back      Build, push, and deploy backend to Cloud Run via gcloud"

build-frontend:
	docker build -f frontend/Dockerfile -t ${DOCKER_REGISTRY}/frontend:latest .

build-backend:
	docker build -f backend/Dockerfile -t ${DOCKER_REGISTRY}/backend:latest .

run:
	docker-compose up -d

dev:
	docker-compose up

deploy-front:
	# Example: set PROJECT_ID and REPO first or export DOCKER_REGISTRY
	# Assumes gcloud is authenticated and configured
	gcloud builds submit --config cloudbuild.yaml --substitutions=_FRONTEND_SERVICE=${FRONTEND_SERVICE},_BACKEND_SERVICE=${BACKEND_SERVICE},_AR_REPO=${AR_REPO}

deploy-back:
	# deploy via cloudbuild.yaml as above
	gcloud builds submit --config cloudbuild.yaml --substitutions=_FRONTEND_SERVICE=${FRONTEND_SERVICE},_BACKEND_SERVICE=${BACKEND_SERVICE},_AR_REPO=${AR_REPO}

clean:
	docker-compose down --rmi local --volumes --remove-orphans || true

bootstrap-gcp:
	# Example: PROJECT_ID=my-project make bootstrap-gcp
	PROJECT_ID=${PROJECT_ID} REGION=${REGION} AR_REPO=${AR_REPO} ./scripts/bootstrap-gcp.sh
