#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json not found. CI install cannot continue." >&2
  exit 1
fi

if [[ -f package-lock.json ]]; then
  npm ci
else
  echo "WARN: package-lock.json not found; falling back to npm install for MVP." >&2
  npm install
fi
