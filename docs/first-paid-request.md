# First Paid Request (5-minute Quickstart)

Fast path for current scaffold (`POST /agent/task`).

## 1) Unpaid request (expect 402)

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: quickstart-001' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 402 Payment Required`

Example response:

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "Payment required for this resource.",
    "x402": {
      "resourceId": "agent-task",
      "amount": { "currency": "USD", "value": "0.01" },
      "receiver": "demo-receiver-address",
      "paymentHeader": "X-Paid: true",
      "retryHint": "Pay, then retry the same request with proof of payment."
    }
  }
}
```

## 2) Retry as paid (same idempotency key)

```bash
curl -i -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: quickstart-001' \
  -H 'X-Paid: true' \
  -d '{"task":"summarize this"}'
```

Expected: `HTTP/1.1 200 OK`

Example success:

```json
{
  "status": "completed",
  "result": {
    "taskId": "task_a1b2c3d4",
    "output": { "summary": "Processed task: summarize this" },
    "durationMs": 1
  },
  "receipt": {
    "paid": true,
    "receiptId": "rcpt_a1b2c3d4",
    "network": "base-sepolia",
    "txHash": "0xstub",
    "payer": "0xpayerstub",
    "receiver": "demo-receiver-address",
    "amount": { "currency": "USD", "value": "0.01" },
    "paidAt": "2026-02-20T23:00:00.000Z"
  },
  "idempotencyKey": "quickstart-001"
}
```

## 3) Rules

- Reuse `Idempotency-Key` across retries for the same logical task.
- Treat 402 as expected flow for unpaid calls.
- In this scaffold, payment proof is stubbed as `X-Paid: true`.

## 4) Next

- See `docs/error-catalog.md` for production-oriented error semantics.
- See `examples/js-client.ts` for automatic 402 handling.
- See `tests/e2e-flow.md` for end-to-end verification scenarios.
