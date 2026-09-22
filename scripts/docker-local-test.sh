#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.local.yml)

echo "==> Building production-style images (smoke build)…"
docker build -f backend/Dockerfile -t wufud-backend:local "$ROOT"
docker build -f frontend/Dockerfile -t wufud-frontend:local "$ROOT"

echo "==> Starting local stack…"
fuser -k 3009/tcp 4005/tcp 2>/dev/null || true
sleep 1
"${COMPOSE[@]}" down --remove-orphans
"${COMPOSE[@]}" pull postgres redis mailpit
"${COMPOSE[@]}" up -d --force-recreate postgres redis mailpit

echo "==> Waiting for Postgres…"
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" ps postgres 2>/dev/null | grep -q "(healthy)"; then
    break
  fi
  sleep 2
done

echo "==> Installing workspace deps (one-shot install service)…"
"${COMPOSE[@]}" run --rm install

echo "==> Starting backend + frontend…"
"${COMPOSE[@]}" up -d --force-recreate backend frontend

echo "==> Waiting for API (migrations + seed on backend start)…"
for _ in $(seq 1 120); do
  if curl -sf "http://localhost:4005/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "==> Waiting for frontend…"
for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "http://localhost:3009/"; then
    break
  fi
  sleep 3
done

echo "==> Smoke checks"
curl -sf "http://localhost:4005/api/v1/health" | head -c 200
echo ""
curl -sf -H "X-Forwarded-Host: wufud.localhost" "http://localhost:4005/api/v1/public/context" | head -c 200
echo ""
curl -sf -o /dev/null -w "frontend HTTP %{http_code}\n" "http://localhost:3009/"

echo "==> Done. Platform: http://wufud.localhost:3009  API: http://localhost:4005/api/v1/health  Mailpit: http://localhost:8025"
