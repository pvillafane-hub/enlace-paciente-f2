#!/usr/bin/env bash
# Generate a candidate baseline SQL for a BRAND-NEW, EMPTY V2 database.
# This script NEVER connects to or mutates an existing database.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -x node_modules/.bin/prisma ]]; then
  echo "Install dependencies with npm ci first." >&2
  exit 1
fi
export DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public'
mkdir -p .v2-baseline-review
node_modules/.bin/prisma validate --schema prisma/schema.prisma
node_modules/.bin/prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > .v2-baseline-review/initial-schema.sql
echo "Generated .v2-baseline-review/initial-schema.sql for REVIEW ONLY."
echo "Do not apply this SQL or mark migrations resolved until a clean-database rehearsal is approved."
