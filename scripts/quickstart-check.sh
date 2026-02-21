#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
KEY="quickstart-$(date +%s)"

echo "1) Unpaid request (expect 402)"
code_unpaid=$(curl -s -o /tmp/x402_unpaid.json -w "%{http_code}" \
  -X POST "$BASE_URL/agent/task" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -d '{"task":"demo task","payment":{"token":"USDC"}}')

if [[ "$code_unpaid" != "402" ]]; then
  echo "Expected 402, got $code_unpaid"
  cat /tmp/x402_unpaid.json
  exit 1
fi

echo "2) Paid retry (expect 200)"
code_paid=$(curl -s -o /tmp/x402_paid.json -w "%{http_code}" \
  -X POST "$BASE_URL/agent/task" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -H 'X-Payment: v1:0.01:proof123' \
  -d '{"task":"demo task","payment":{"token":"USDC"}}')

if [[ "$code_paid" != "200" ]]; then
  echo "Expected 200, got $code_paid"
  cat /tmp/x402_paid.json
  exit 1
fi

echo "3) Metrics summary"
curl -s "$BASE_URL/metrics/summary"

echo "\nQuickstart check passed ✅"
