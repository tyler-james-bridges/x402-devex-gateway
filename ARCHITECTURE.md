# x402-devex-gateway Architecture (MVP Scaffold)

## Sequence flow: `402 -> pay -> retry -> success`

```text
Client
  |
  | POST /agent/task (without payment proof)
  v
Gateway
  |- idempotencyKeyMiddleware (captures Idempotency-Key header)
  |- x402Middleware checks payment
  |- unpaid => HTTP 402 + deterministic payment instructions JSON
  v
Client
  |
  | Pays off-chain/on-chain using instructions
  | Adds payment proof header (stub: X-Paid: true)
  | Retries same POST /agent/task (same Idempotency-Key optional)
  v
Gateway
  |- idempotencyKeyMiddleware
  |- x402Middleware passes paid request
  |- paid handler returns success payload + receipt metadata stub
  v
Client receives HTTP 200
```

## Notes

- Current payment verification is a placeholder (`X-Paid: true`).
- `402` response shape is deterministic for reliable client integration tests.
- Receipt fields are stubs to define the contract before real settlement integration.
