# Error Catalog

Canonical payment-path errors for the x402 gateway.

> Note: scaffold now emits `PAYMENT_REQUIRED`, `POLICY_CAP_EXCEEDED`, and `WALLET_FUNDING_FAILED`. Other codes below remain recommended defaults.

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

## Retry Guidance

- `PAYMENT_REQUIRED`: retry **after** payment attached
- `PAYMENT_UNDERPAID`: retry **after** top-up
- `POLICY_CAP_EXCEEDED`: retry only after policy/budget change
- `WALLET_FUNDING_FAILED`: retry based on `retryable`
