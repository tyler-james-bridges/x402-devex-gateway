# E2E Flow Test Plan: unpaid -> pay -> retry -> success

## Objective

Verify the x402-gated happy path and idempotency behavior for `POST /agent/task`.

## Preconditions

- Service running on `http://localhost:3000`
- Known request body: `{"task":"summarize this"}`
- Fixed `Idempotency-Key` per scenario

## Scenario 1 — Unpaid request returns 402

1. Call `POST /agent/task` without `X-Paid`.
2. Assert status `402`.
3. Assert response includes:
   - `error.code = PAYMENT_REQUIRED`
   - `error.x402.resourceId`
   - `error.x402.amount.currency/value`
   - `error.x402.paymentHeader = "X-Paid: true"`

## Scenario 2 — Pay then retry succeeds

1. Reuse same JSON body and same `Idempotency-Key`.
2. Retry with header `X-Paid: true`.
3. Assert status `200`.
4. Assert body includes:
   - `status = accepted`
   - `result.taskId`
   - `receipt.paid = true`
   - `idempotencyKey` equals request key

## Scenario 3 — Duplicate replay is idempotent (expected behavior)

> Current scaffold records/echoes idempotency key but does not persist replay state yet.
> This scenario documents target behavior for Day 10 hardening.

1. After a successful paid call, send same paid request again with same `Idempotency-Key`.
2. Target assertion:
   - Same logical result returned (same `taskId`) OR explicit replay marker.
   - No second charge/receipt is produced.

## Scenario 4 — Concurrent duplicate retries (target behavior)

1. Fire two concurrent paid retries with identical `Idempotency-Key`.
2. Target assertion:
   - Exactly one task execution and one charge.
   - Both callers receive consistent response payload.

## Error cases to include (when implemented)

- `PAYMENT_UNDERPAID` (underfunded proof)
- `POLICY_CAP_EXCEEDED` (budget/policy guardrail)
- `WALLET_FUNDING_FAILED` (wallet/provider failure)

## Exit Criteria

- Scenario 1 and 2 pass against current scaffold.
- Scenario 3 and 4 are converted from “target behavior” to executable assertions once idempotency persistence/locking is implemented.
