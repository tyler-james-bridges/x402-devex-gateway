#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
N="${2:-50}"

ok=0
fail=0
sum_ms=0

for i in $(seq 1 "$N"); do
  key="soak-$i"
  started=$(python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
)

  code=$(curl -s -o /tmp/soak_body.json -w "%{http_code}" \
    -X POST "$BASE_URL/agent/task" \
    -H 'Content-Type: application/json' \
    -H "Idempotency-Key: $key" \
    -H 'X-Payment: v1:0.01:proof123' \
    -d '{"task":"soak test","payment":{"token":"USDC"}}')

  ended=$(python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
)
  ms=$((ended - started))
  sum_ms=$((sum_ms + ms))

  if [[ "$code" == "200" ]]; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
  fi

done

avg_ms=0
if [[ "$N" -gt 0 ]]; then
  avg_ms=$((sum_ms / N))
fi

echo "{\"requests\":$N,\"ok\":$ok,\"fail\":$fail,\"avgLatencyMs\":$avg_ms}" > tests/reliability-report.json
cat tests/reliability-report.json
