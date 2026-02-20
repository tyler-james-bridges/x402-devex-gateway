#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <npm-script-name>" >&2
  exit 2
fi

SCRIPT_NAME="$1"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json not found in $(pwd). Cannot run npm script '${SCRIPT_NAME}'." >&2
  exit 1
fi

HAS_SCRIPT=$(node -e "const p=require('./package.json'); process.stdout.write(String(!!(p.scripts && p.scripts['${SCRIPT_NAME}'])));")

if [[ "${HAS_SCRIPT}" != "true" ]]; then
  echo "ERROR: npm script '${SCRIPT_NAME}' is required by CI but is not defined in package.json." >&2
  exit 1
fi

echo "Running npm script: ${SCRIPT_NAME}"
npm run "${SCRIPT_NAME}"
