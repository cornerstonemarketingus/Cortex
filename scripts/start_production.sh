#!/usr/bin/env sh
set -eu

echo "Building production image..."
docker build -t bidbuild-web:latest .

echo "Starting stack with docker compose..."
docker compose up --build -d

echo "Checking readiness endpoint..."
sleep 3
if curl -fsS http://localhost:3000/api/readyz >/dev/null; then
  echo "Production stack is running."
else
  echo "Ready check failed. Inspect logs with: docker compose logs -f web"
  exit 1
fi
