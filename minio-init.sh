#!/bin/bash
# Run ONCE after first deploy to create the MinIO bucket and set it to public.
# Requires: minio service running, .env file present.
# Usage: ./minio-init.sh
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Error: .env file not found. Copy .env.production.example to .env first."
  exit 1
fi

BUCKET=$(grep '^S3_BUCKET=' .env | cut -d= -f2- | tr -d '"' || echo "ridder")
MINIO_USER=$(grep '^MINIO_ROOT_USER=' .env | cut -d= -f2- | tr -d '"' || echo "ridder")
MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' .env | cut -d= -f2- | tr -d '"')

BUCKET=${BUCKET:-ridder}

echo "Initializing MinIO bucket '$BUCKET'..."

docker run --rm \
  --network "$(basename "$(pwd)")_default" \
  minio/mc \
  sh -c "
    mc alias set minio http://minio:9000 '${MINIO_USER}' '${MINIO_PASS}' &&
    mc mb --ignore-existing minio/${BUCKET} &&
    mc anonymous set download minio/${BUCKET} &&
    echo 'Bucket ${BUCKET} is ready (public read)'
  "
