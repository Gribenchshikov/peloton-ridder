#!/bin/bash
set -euo pipefail

echo "=== Ridder Deploy ==="
cd "$(dirname "$0")"

# ── 1. Pull latest code ────────────────────────────────────────────────────────
echo "[1/5] Pulling latest code..."
git pull --ff-only

# ── 2. Build images ────────────────────────────────────────────────────────────
echo "[2/5] Building Docker images..."
docker compose build app migrate

# ── 3. Start infrastructure (db, minio) if not running ────────────────────────
echo "[3/5] Starting infrastructure..."
docker compose up -d db minio
echo "Waiting for db and minio to be healthy..."
docker compose wait db minio 2>/dev/null || sleep 10

# ── 4. Run database migrations ────────────────────────────────────────────────
echo "[4/5] Running database migrations..."
docker compose run --rm migrate

# ── 5. Start / restart all services ───────────────────────────────────────────
echo "[5/5] Starting services..."
docker compose up -d --remove-orphans db minio nginx app

echo ""
echo "=== Deploy complete ==="
docker compose ps
