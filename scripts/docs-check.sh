#!/usr/bin/env bash
set -euo pipefail

README_FILE="README.md"

[[ -f "$README_FILE" ]] || { echo "README.md is missing"; exit 1; }

grep -q "Unpaid request example" "$README_FILE" || {
  echo "README.md must include an unpaid request example section"; exit 1;
}

grep -q "curl -i -X POST http://localhost:3000/agent/task" "$README_FILE" || {
  echo "README.md missing required curl example for /agent/task"; exit 1;
}

echo "docs:check passed"
