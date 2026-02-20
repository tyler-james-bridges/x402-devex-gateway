#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

echo "Running safety checks..."

# 1) Block obvious secret patterns in staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM || true)
if [[ -n "${staged_files}" ]]; then
  if grep -nE "BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|xox[baprs]-|sk_(live|test)_[A-Za-z0-9]+|api[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=]" $staged_files; then
    echo "❌ Potential secret detected in staged changes. Remove/redact before commit."
    exit 1
  fi
fi

# 2) Block accidental local/private planning files
if git diff --cached --name-only --diff-filter=ACM | grep -E "(^notes/|^memory/|\.private\.md$|\.local\.md$)"; then
  echo "❌ Private/planning files are staged. Keep them out of this repo."
  exit 1
fi

echo "✅ Safety checks passed"
