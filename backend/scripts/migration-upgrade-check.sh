#!/usr/bin/env bash
# Validasi upgrade migration: deploy pre-hardening → deploy hardening migrations
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$BACKEND_DIR/prisma/migrations"
STAGING_DIR="$(mktemp -d)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL wajib diset"
  exit 1
fi

cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

echo "Staging pre-hardening migrations..."
cp -r "$MIGRATIONS_DIR/"* "$STAGING_DIR/"
rm -rf "$STAGING_DIR"/20260607*

mv "$MIGRATIONS_DIR" "${MIGRATIONS_DIR}.full"
mkdir -p "$MIGRATIONS_DIR"
cp -r "$STAGING_DIR/"* "$MIGRATIONS_DIR/"
cp "${MIGRATIONS_DIR}.full/migration_lock.toml" "$MIGRATIONS_DIR/"

echo "Deploying pre-hardening migrations..."
cd "$BACKEND_DIR"
npx prisma migrate deploy

echo "Restoring full migration history..."
rm -rf "$MIGRATIONS_DIR"
mv "${MIGRATIONS_DIR}.full" "$MIGRATIONS_DIR"

echo "Deploying hardening migrations..."
npx prisma migrate deploy

echo "Migration upgrade check passed."
