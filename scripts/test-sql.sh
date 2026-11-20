#!/usr/bin/env bash
# Applies migrations to a throwaway database and runs supabase/tests. Needs psql and a
# Postgres you can create databases on: set PGHOST/PGPORT/PGUSER (CI uses a service container).
set -euo pipefail
DB="journal_test_$$"
psql -X -q -d postgres -c "create database $DB"
trap 'psql -X -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/00_auth_stub.sql
for f in supabase/migrations/*.sql; do psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
for f in supabase/tests/*.test.sql; do psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
echo "SQL tests passed"
