#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$BACKUP_FILE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS authority_state_rows FROM cranium_authority_state;' -c 'SELECT count(*) AS journal_rows FROM cranium_authority_journal;'
