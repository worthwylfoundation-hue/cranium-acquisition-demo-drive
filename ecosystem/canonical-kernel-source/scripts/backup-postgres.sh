#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
out="${1:-./runtime/backups}"
mkdir -p "$out"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$out/cranium-authority-$stamp.dump"
sha256sum "$out/cranium-authority-$stamp.dump" > "$out/cranium-authority-$stamp.sha256"
echo "$out/cranium-authority-$stamp.dump"
