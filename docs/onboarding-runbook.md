# External Onboarding Runbook

Target: working x402 payment flow in **≤ 15 minutes**.

Prerequisites: Node.js 18+, npm, curl, a terminal.

---

## Step 1 — Clone and install (3 min)

```bash
git clone <repo-url> x402-devex-gateway
cd x402-devex-gateway
npm install
```

## Step 2 — Configure environment (1 min)

```bash
cp .env.example .env
```

Defaults work out of the box. Key settings in `.env`:

| Variable | Default | What it does |
|----------|---------|-------------|
| `PORT` | 3000 | Server listen port |
| `X402_PRICE_USD` | 0.01 | Price per API call |
| `PAYMENT_VERIFIER_MODE` | strict | Validates `X-Payment: v1:<amount>:<proof-id>` format |

## Step 3 — Start the server (1 min)

```bash
npm run dev
```

You should see: `x402-devex-gateway listening on :3000`

## Step 4 — Try the unpaid flow (2 min)

Send a request without payment:

```bash
curl -s -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: onboard-001' \
  -d '{"task":"summarize this"}' | jq .
```

Expected: HTTP 402 with `error.code = "PAYMENT_REQUIRED"` and payment instructions in `error.x402`.

## Step 5 — Pay and retry (2 min)

Retry the same request with a valid payment proof:

```bash
curl -s -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: onboard-001' \
  -H 'X-Payment: v1:0.01:proof-onboard-001' \
  -d '{"task":"summarize this"}' | jq .
```

Expected: HTTP 200 with `status: "accepted"`, a `result` object, and `receipt.paid: true`.

## Step 6 — Verify idempotency replay (2 min)

Send the exact same paid request again:

```bash
curl -si -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: onboard-001' \
  -H 'X-Payment: v1:0.01:proof-onboard-001' \
  -d '{"task":"summarize this"}'
```

Expected: same 200 response body + header `Idempotency-Replayed: true`.

Now try reusing the key with a **different** body:

```bash
curl -s -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: onboard-001' \
  -H 'X-Payment: v1:0.01:proof-onboard-001' \
  -d '{"task":"different task"}' | jq .
```

Expected: HTTP 409 with `error.code = "IDEMPOTENCY_CONFLICT"`.

## Step 7 — Check metrics and playground (2 min)

```bash
curl -s http://localhost:3000/metrics/summary | jq .
```

Expected: JSON with `callsTotal`, `paidCalls`, `failureRate`, `p95LatencyMs`.

Open in browser: [http://localhost:3000/playground](http://localhost:3000/playground) — interactive UI for testing flows visually.

## Step 8 — Run the automated verify (1 min)

```bash
npm run quickstart:verify -- http://localhost:3000
```

All checks should pass.

---

## You're done

You've completed the core x402 payment flow:

1. Unpaid request → 402 with payment instructions
2. Paid retry → 200 with receipt
3. Idempotent replay → cached response, no double charge
4. Conflict detection → 409 on key reuse with different payload

## Next steps

- Read `docs/error-catalog.md` for all error codes and client guidance
- See `examples/js-client.ts` for automatic 402-retry in TypeScript
- See `docs/policy.md` for wallet caps and allowlists
- See `docs/observability.md` for metrics and log queries

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `EADDRINUSE` on startup | Port 3000 in use | Set `PORT=3001` in `.env` |
| 402 on paid request | Wrong header format | Use `X-Payment: v1:0.01:proof123` (strict mode) |
| `MODULE_NOT_FOUND` | Missing install | Run `npm install` |
| Playground not loading | Cache issue | Hard-refresh or clear browser cache |
