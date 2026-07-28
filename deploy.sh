#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="$(dirname "$0")/ridder.pem"
SERVER="ec2-user@51.21.230.52"
SHA=$(git rev-parse --short HEAD)
IMAGE="peloton-ridder:${SHA}"

echo "=== Ridder Deploy (${SHA}) ==="

# ── 1. Push latest code ───────────────────────────────────────────────────────
echo "[1/3] Pushing code..."
git push origin main

# ── 2. Build on server (build-args читаются из .env на сервере) ───────────────
echo "[2/3] Building ${IMAGE} on server..."
ssh -i "${SSH_KEY}" "${SERVER}" "
  cd /home/ec2-user/ridder
  git pull --ff-only
  export \$(grep -v '^#' .env | grep 'NEXT_PUBLIC_' | xargs)
  docker build \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=\"\${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}\" \
    --build-arg NEXT_PUBLIC_MAPTILER_KEY=\"\${NEXT_PUBLIC_MAPTILER_KEY:-}\" \
    -t ${IMAGE} \
    ./app
"

# ── 3. Deploy ─────────────────────────────────────────────────────────────────
echo "[3/3] Deploying..."
ssh -i "${SSH_KEY}" "${SERVER}" "
  cd /home/ec2-user/ridder
  APP_TAG=${SHA} docker compose up -d --no-build --force-recreate app
  RUNNING=\$(docker inspect ridder-app-1 --format '{{.Config.Image}}')
  echo \"Running: \${RUNNING}\"
"

echo "✓ Deploy done — ${IMAGE}"
