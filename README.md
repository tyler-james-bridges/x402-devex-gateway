# x402-devex-gateway

Minimal Node + TypeScript scaffold for an x402-style paid API flow.

## Local run

```bash
npm install
cp .env.example .env
npm run dev
```

Service starts on `http://localhost:3000` by default.

Visual tester: open `http://localhost:3000/playground` for a simple UI to run unpaid/paid/replay flows.

Observability: `GET /metrics/summary` returns calls, paid calls, failure rate, and p95 latency over recent requests.

## API

### `POST /agent/task`

Implements MVP flow:
1. If unpaid, returns deterministic `402 Payment Required` JSON.
2. If paid, returns success payload with receipt metadata stubs.
3. If `Idempotency-Key` is provided and a prior successful response exists for the same request payload, returns the stored response with `Idempotency-Replayed: true`.
4. If `Idempotency-Key` is reused with a different payload, returns `409 IDEMPOTENCY_CONFLICT`.

### Unpaid request example

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 402 Payment Required` with x402 instructions.

### Paid request example (stub/default)

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -H 'X-Payment: local-proof-123' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 200 OK` with structured `receipt` metadata.

If the same request is retried with the same `Idempotency-Key`, response is replayed from store and includes header `Idempotency-Replayed: true`.

If the key is reused with a different body, expected: `HTTP/1.1 409 Conflict`.

### Paid request example (strict verifier)

```bash
PAYMENT_VERIFIER_MODE=strict npm run dev

curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -H 'X-Payment: v1:0.01:proof123' \
  -d '{"task":"summarize this"}'
```

Strict mode requires `X-Payment` to match:
- `v1:<amount-usd>:<proof-id>`
- Example malformed proof returns `402` + `PAYMENT_PROOF_INVALID`
- Example underpaid proof (e.g. `v1:0.001:proof123`) returns `402` + `PAYMENT_UNDERPAID`

## Environment variables

See `.env.example`:
- `PORT`
- `X402_RESOURCE_ID`
- `X402_PRICE_USD`
- `X402_RECEIVER`
- `IDEMPOTENCY_STORE` (`memory` or `sqlite`, default `memory`)
- `IDEMPOTENCY_SQLITE_PATH` (sqlite database file path, default `:memory:`)
- `WALLET_POLICY_*` guardrails (caps + allowlists)
- `WALLET_FUNDING_*` scaffold controls for standardized funding errors

## Additional docs

- `SECURITY.md`
- `docs/error-catalog.md`
- `docs/policy.md`
- `docs/observability.md`
- `PAYMENT_VERIFIER_MODE` (`stub` default, `strict` for format/amount enforcement)
