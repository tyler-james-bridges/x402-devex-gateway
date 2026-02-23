# Error Catalog

Canonical payment-path errors for the x402 gateway.

> Note: scaffold now emits `PAYMENT_REQUIRED`, `POLICY_CAP_EXCEEDED`, `WALLET_FUNDING_FAILED`, `TASK_TIMEOUT`, and `TASK_FAILED`. Other codes below remain recommended defaults.

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
- Missing `X-Paid` (scaffold) or missing payment token (production)
- Malformed/expired payment proof

Client action:
1. Read `error.x402` instructions and amount.
2. Pay/fund the request.
3. Retry with same `Idempotency-Key`.

---

## PAYMENT_UNDERPAID (underpaid)

**HTTP:** `402 Payment Required`  
**Meaning:** Payment proof exists but covers less than required amount.

Suggested details:

```json
{
  "requiredAmount": "0.01",
  "paidAmount": "0.005",
  "currency": "USD",
  "shortfall": "0.005"
}
```

Client action: top up to full amount, then retry with same idempotency key.

---

## POLICY_CAP_EXCEEDED (policy cap)

**HTTP:** `402 Payment Required` or `403 Forbidden`  
**Meaning:** Spend/policy guardrail blocks this request.

Suggested details:

```json
{
  "policyId": "default",
  "policyMax": "0.005",
  "requiredAmount": "0.01",
  "currency": "USD"
}
```

Client action: do not blind-retry; lower scope or raise budget/policy.

---

## WALLET_FUNDING_FAILED (wallet funding issues)

**HTTP:** `402 Payment Required`  
**Meaning:** Wallet/provider could not fund/settle payment.

Suggested details:

```json
{
  "provider": "x402-wallet",
  "reason": "insufficient_funds",
  "retryable": false
}
```

Client action:
- If retryable: backoff and retry
- If not retryable: prompt funding/change payment method

---

## TASK_TIMEOUT (execution timeout)

**HTTP:** `504 Gateway Timeout`
**Meaning:** Task execution exceeded the configured timeout (`TASK_TIMEOUT_MS`).

Example response:

```json
{
  "error": {
    "code": "TASK_TIMEOUT",
    "message": "Task execution exceeded the configured timeout.",
    "taskId": "task_a1b2c3d4",
    "timeoutMs": 30000
  }
}
```

Client action: retry with same `Idempotency-Key`; consider whether the task needs a longer timeout.

---

## TASK_FAILED (execution failure)

**HTTP:** `502 Bad Gateway`
**Meaning:** Task runtime encountered an unrecoverable error.

Example response:

```json
{
  "error": {
    "code": "TASK_FAILED",
    "message": "Task execution failed.",
    "taskId": "task_a1b2c3d4",
    "reason": "agent crashed"
  }
}
```

Client action: inspect `reason`; retry with a new `Idempotency-Key` if transient.

---

## Retry Guidance

- `PAYMENT_REQUIRED`: retry **after** payment attached
- `PAYMENT_UNDERPAID`: retry **after** top-up
- `POLICY_CAP_EXCEEDED`: retry only after policy/budget change
- `WALLET_FUNDING_FAILED`: retry based on `retryable`
- `TASK_TIMEOUT`: retry same idempotency key; consider raising `TASK_TIMEOUT_MS`
- `TASK_FAILED`: retry with new idempotency key if error is transient
