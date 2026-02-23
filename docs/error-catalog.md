# Error Catalog

Canonical payment-path errors for the x402 gateway.

> Payment verification maps to `PaymentState` variants in `src/payments/states.ts` via `resolvePaymentState(rawProof, requiredUsd, provider)`.
> Common emitted codes include `PAYMENT_REQUIRED`, `PAYMENT_PROOF_INVALID`, `PAYMENT_UNDERPAID`, `POLICY_CAP_EXCEEDED`, `SESSION_CAP_EXCEEDED`, `WALLET_FUNDING_FAILED`, `IDEMPOTENCY_CONFLICT`, `TASK_TIMEOUT`, and `TASK_FAILED`.

## Error Envelope

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "Payment required for this resource.",
    "x402": {}
  }
}
```

---

## PAYMENT_REQUIRED (payment missing)

**HTTP:** `402 Payment Required`  
**Meaning:** No valid payment proof/header is attached.

Triggers:
- No `X-Payment` header present (strict mode default)
- Request sent before payment is attached

Client action:
1. Read `error.x402` instructions and amount.
2. Pay/fund the request.
3. Retry with same `Idempotency-Key`.

---

## PAYMENT_PROOF_INVALID (malformed proof)

**HTTP:** `402 Payment Required`
**Meaning:** An `X-Payment` header was provided but its format does not match `v1:<amount-usd>:<proof-id>`.

Triggers:
- Header value doesn't match format `v1:<number>:<proof-id>` (strict mode)
- Proof ID shorter than 6 characters

Client action: fix the header format and retry. Example: `X-Payment: v1:0.01:proof123`.

---

## PAYMENT_UNDERPAID (underpaid)

**HTTP:** `402 Payment Required`  
**Meaning:** Payment proof exists but covers less than required amount.

Client action: top up to full amount, then retry with same idempotency key.

---

## POLICY_CAP_EXCEEDED (policy cap)

**HTTP:** `402 Payment Required` or `403 Forbidden`  
**Meaning:** Spend/policy guardrail blocks this request.

Client action: do not blind-retry; lower scope or raise budget/policy.

---

## SESSION_CAP_EXCEEDED (session budget cap)

**HTTP:** `403 Forbidden`
**Meaning:** Accepting this request would push the aggregate session spend past the configured cap.

Client action: do not blind-retry; wait for budget reset or raise session cap.

---

## WALLET_FUNDING_FAILED (wallet funding issues)

**HTTP:** `402 Payment Required`  
**Meaning:** Wallet/provider could not fund/settle payment.

Client action:
- If retryable: backoff and retry
- If not retryable: prompt funding/change payment method

---

## IDEMPOTENCY_CONFLICT (key reuse with different payload)

**HTTP:** `409 Conflict`
**Meaning:** The `Idempotency-Key` was already used with a different request body.

Client action:
- Use a new unique `Idempotency-Key` for each distinct request.
- Reuse the same key only when retrying the exact same request body.

---

## TASK_TIMEOUT (execution timeout)

**HTTP:** `504 Gateway Timeout`
**Meaning:** Task execution exceeded the configured timeout (`TASK_TIMEOUT_MS`).

Client action: retry with same `Idempotency-Key`; consider whether the task needs a longer timeout.

---

## TASK_FAILED (execution failure)

**HTTP:** `502 Bad Gateway`
**Meaning:** Task runtime encountered an unrecoverable error.

Client action: inspect `reason`; retry with a new `Idempotency-Key` if transient.

---

## Retry Guidance

- `PAYMENT_REQUIRED`: retry after payment attached
- `PAYMENT_PROOF_INVALID`: fix header format, then retry
- `PAYMENT_UNDERPAID`: retry after top-up
- `POLICY_CAP_EXCEEDED`: retry only after policy/budget change
- `SESSION_CAP_EXCEEDED`: retry only after budget reset or cap increase
- `WALLET_FUNDING_FAILED`: retry based on `retryable`
- `IDEMPOTENCY_CONFLICT`: do not retry with same key/payload mismatch
- `TASK_TIMEOUT`: retry same idempotency key; consider raising `TASK_TIMEOUT_MS`
- `TASK_FAILED`: retry with new idempotency key if error is transient
