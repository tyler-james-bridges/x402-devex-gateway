# E2E Flow Test Plan: unpaid -> pay -> retry -> success

## Objective

Verify the x402-gated happy path and idempotency behavior for `POST /agent/task`.

## Preconditions

- Service running on `http://localhost:3000`
- Known request body: `{"task":"summarize this"}`
- Fixed `Idempotency-Key` per scenario
- Default verifier mode: `strict` (`X-Payment: v1:<amount>:<proof-id>`)

## Scenario 1 — Unpaid request returns 402

1. Call `POST /agent/task` without `X-Payment`.
2. Assert status `402`.
3. Assert response includes:
   - `error.code = PAYMENT_REQUIRED`
   - `error.x402.resourceId`
   - `error.x402.amount.currency/value`
   - `error.x402.paymentHeader = "X-Payment: v1:<amount-usd>:<proof-id>"`

## Scenario 2 — Pay then retry succeeds

1. Reuse same JSON body and same `Idempotency-Key`.
2. Retry with header `X-Payment: v1:0.01:proof123`.
3. Assert status `200`.
4. Assert body includes:
   - `status = completed`
   - `result.taskId`
   - `receipt.paid = true`
   - `idempotencyKey` equals request key

## Scenario 3 — Duplicate replay is idempotent

1. After a successful paid call, send same paid request again with same `Idempotency-Key`.
2. Assertions:
   - Same response body returned (same `taskId`, same `receipt`).
   - Response includes `Idempotency-Replayed: true` header.
   - No second charge/receipt is produced.

## Scenario 4 — Concurrent duplicate retries (target behavior)

1. Fire two concurrent paid retries with identical `Idempotency-Key`.
2. Target assertion:
   - Exactly one task execution and one charge.
   - Both callers receive consistent response payload.

## Error cases (implemented)

- `PAYMENT_PROOF_INVALID` (malformed proof in strict mode)
- `PAYMENT_UNDERPAID` (underfunded proof in strict mode)
- `POLICY_CAP_EXCEEDED` (budget/policy guardrail)
- `WALLET_FUNDING_FAILED` (wallet/provider failure simulation)
- `IDEMPOTENCY_CONFLICT` (key reuse with different payload)

## Exit Criteria

- Scenarios 1, 2, and 3 pass against current scaffold.
- Scenario 4 is target behavior for concurrent locking (not yet implemented).
- All error cases above are covered by unit tests in `test/unit/`.
