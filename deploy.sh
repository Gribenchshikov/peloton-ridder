#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="$(dirname "$0")/ridder.pem"
SERVER="ec2-user@51.21.230.52"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
SHA=$(git rev-parse --short HEAD)
IMAGE="peloton-ridder:${SHA}"
TAR="/tmp/ridder-${SHA}.tar.gz"

echo "=== Ridder Deploy (${SHA}) ==="

# ── 1. Push latest code ───────────────────────────────────────────────────────
echo "[1/4] Pushing code..."
git push origin main

# ── 2. Build image locally for linux/amd64 ───────────────────────────────────
echo "[2/4] Building ${IMAGE} locally (linux/amd64)..."
_ENV_TMP=$(mktemp)
# shellcheck disable=SC2086
ssh ${SSH_OPTS} "${SERVER}" "grep 'NEXT_PUBLIC_' /home/ec2-user/ridder/.env" | sed 's/^/export /' > "${_ENV_TMP}"
# shellcheck disable=SC1090
source "${_ENV_TMP}"
rm -f "${_ENV_TMP}"

# Abort if keys are missing — deploying without them silently breaks the app
if [[ -z "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}" ]]; then
  echo "✗ NEXT_PUBLIC_TURNSTILE_SITE_KEY is empty — cannot build" >&2; exit 1
fi

docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}" \
  --build-arg NEXT_PUBLIC_MAPTILER_KEY="${NEXT_PUBLIC_MAPTILER_KEY:-}" \
  -t "${IMAGE}" \
  ./app

# Verify sitekey was actually baked into the image
SITEKEY_FRAGMENT="${NEXT_PUBLIC_TURNSTILE_SITE_KEY: -8}"  # last 8 chars
if ! docker run --rm --platform linux/amd64 --entrypoint grep "${IMAGE}" \
    -qrF -- "${SITEKEY_FRAGMENT}" /app/.next/ 2>/dev/null; then
  echo "✗ Sitekey not found in built image — aborting deploy" >&2; exit 1
fi
echo "✓ Sitekey verified in image"

# ── 3. Copy image to server ───────────────────────────────────────────────────
echo "[3/4] Saving and copying image to server..."
docker save "${IMAGE}" | gzip > "${TAR}"
# shellcheck disable=SC2086
scp ${SSH_OPTS} "${TAR}" "${SERVER}:/tmp/"
rm -f "${TAR}"

# ── 4. Load, migrate and deploy on server ────────────────────────────────────
echo "[4/4] Deploying on server..."
# shellcheck disable=SC2086
ssh ${SSH_OPTS} "${SERVER}" "
  set -euo pipefail
  docker load < /tmp/ridder-${SHA}.tar.gz
  rm -f /tmp/ridder-${SHA}.tar.gz
  cd /home/ec2-user/ridder
  git pull --ff-only
  docker compose build migrate
  docker compose run --rm migrate
  APP_TAG=${SHA} docker compose up -d --no-build --force-recreate app
  RUNNING=\$(docker inspect ridder-app-1 --format '{{.Config.Image}}')
  echo \"Running: \${RUNNING}\"
  docker image prune -f --filter 'label!=keep'
"

echo "✓ Deploy done — ${IMAGE}"
