#!/usr/bin/env bash
set -euo pipefail

# Basic smoke test for x402 gateway deployments.
# Verifies that an unpaid request receives HTTP 402 and expected response shape.
#
# Required env:
#   SMOKE_URL - Full endpoint URL to probe (e.g. https://gateway.example.com/protected)
#
# Optional env:
#   SMOKE_METHOD  - HTTP method (default: GET)
#   SMOKE_TIMEOUT - curl max time in seconds (default: 15)
#   SMOKE_BODY    - request body to send (for POST-like requests)

: "${SMOKE_URL:?SMOKE_URL is required}"
SMOKE_METHOD="${SMOKE_METHOD:-GET}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-15}"
SMOKE_BODY="${SMOKE_BODY:-}"

TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT

CURL_ARGS=(
  -sS
  -X "$SMOKE_METHOD"
  --max-time "$SMOKE_TIMEOUT"
  -H "Accept: application/json"
  -H "Content-Type: application/json"
  -w "%{http_code}"
  -o "$TMP_BODY"
  "$SMOKE_URL"
)

if [[ -n "$SMOKE_BODY" ]]; then
  CURL_ARGS+=(--data "$SMOKE_BODY")
fi

HTTP_CODE="$(curl "${CURL_ARGS[@]}")"

if [[ "$HTTP_CODE" != "402" ]]; then
  echo "FAIL: Expected HTTP 402 but got $HTTP_CODE"
  echo "Body:"
  cat "$TMP_BODY"
  exit 1
fi

python3 - "$TMP_BODY" <<'PY'
import json,sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    raw = f.read().strip()
if not raw:
    print('FAIL: Empty JSON body for 402 response')
    sys.exit(1)
try:
    payload = json.loads(raw)
except Exception as exc:
    print(f'FAIL: Response is not valid JSON: {exc}')
    sys.exit(1)

# MVP 402 shape checks (intentionally lightweight and provider-agnostic)
if not isinstance(payload, dict):
    print('FAIL: 402 payload is not a JSON object')
    sys.exit(1)
if 'error' not in payload:
    print('FAIL: 402 payload missing top-level "error" object')
    sys.exit(1)
err = payload['error']
if not isinstance(err, dict):
    print('FAIL: "error" field is not an object')
    sys.exit(1)
missing = [k for k in ('code','message') if k not in err]
if missing:
    print(f'FAIL: "error" missing keys: {", ".join(missing)}')
    sys.exit(1)
print('PASS: unpaid request returned expected 402 shape')
PY
