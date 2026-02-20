# x402-devex-gateway

Minimal Node + TypeScript scaffold for an x402-style paid API flow.

## Local run

```bash
npm install
cp .env.example .env
npm run dev
```

Service starts on `http://localhost:3000` by default.

## API

### `POST /agent/task`

Implements MVP flow:
1. If unpaid, returns deterministic `402 Payment Required` JSON.
2. If paid, returns success payload with receipt metadata stubs.

### Unpaid request example

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 402 Payment Required` with x402 instructions.

### Paid request example (stub)

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -H 'X-Paid: true' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 200 OK` with structured `receipt` metadata.

## Environment variables

See `.env.example`:
- `PORT`
- `X402_RESOURCE_ID`
- `X402_PRICE_USD`
- `X402_RECEIVER`
