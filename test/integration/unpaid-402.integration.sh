#!/usr/bin/env bash
set -euo pipefail

PORT="${TEST_PORT:-3100}"
BASE_URL="http://127.0.0.1:${PORT}"

PORT="$PORT" node dist/server.js >/tmp/x402-integration.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID >/dev/null 2>&1 || true' EXIT

for _ in {1..30}; do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"; kill $SERVER_PID >/dev/null 2>&1 || true' EXIT

HTTP_CODE=$(curl -sS -o "$BODY_FILE" -w "%{http_code}" \
  -X POST "${BASE_URL}/agent/task" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: integration-key" \
  -d '{"task":"integration"}')

if [[ "$HTTP_CODE" != "402" ]]; then
  echo "Expected 402, got $HTTP_CODE"
  cat "$BODY_FILE"
  exit 1
fi

python3 - "$BODY_FILE" <<'PY'
import json,sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    payload = json.load(f)
assert isinstance(payload, dict)
assert isinstance(payload.get('error'), dict)
assert payload['error'].get('code') == 'PAYMENT_REQUIRED'
assert isinstance(payload['error'].get('message'), str)
print('integration OK')
PY
