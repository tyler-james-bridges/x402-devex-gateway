# Wallet Policy Guardrails (Scaffold)

This gateway includes a lightweight, provider-agnostic wallet policy check in the paid execution path (`POST /agent/task`).

## What is enforced

- **Per-request USD cap** (`WALLET_POLICY_PER_REQUEST_CAP_USD`)
- **Allowlisted token symbols** (`WALLET_POLICY_ALLOWED_TOKENS`)
- **Allowlisted contract addresses** (`WALLET_POLICY_ALLOWED_CONTRACTS`)
- **Session cap placeholder** (`WALLET_POLICY_SESSION_CAP_USD`) for future aggregate accounting

If policy denies a request, API returns:

- `HTTP 403`
- `error.code = POLICY_CAP_EXCEEDED`

## Environment configuration

```bash
# Required by existing x402 scaffold
X402_PRICE_USD=0.01

# Policy identity + caps
WALLET_POLICY_ID=default
WALLET_POLICY_PER_REQUEST_CAP_USD=0.05
WALLET_POLICY_SESSION_CAP_USD=1.00

# Optional comma-separated allowlists (case-insensitive)
WALLET_POLICY_ALLOWED_TOKENS=usdc,usdt
WALLET_POLICY_ALLOWED_CONTRACTS=0xabc...,0xdef...
```

### Example deny response (cap)

```json
{
  "error": {
    "code": "POLICY_CAP_EXCEEDED",
    "message": "Request amount exceeds wallet policy per-request cap.",
    "x402": {
      "policyId": "default",
      "policyMax": "0.005",
      "requiredAmount": "0.01",
      "currency": "USD"
    }
  }
}
```

## Funding failure scaffold

For integration testing and error handling in clients, you can force a standardized wallet funding error:

```bash
WALLET_FUNDING_SIMULATE_FAIL=true
WALLET_FUNDING_PROVIDER=x402-wallet
WALLET_FUNDING_REASON=insufficient_funds
WALLET_FUNDING_RETRYABLE=false
```

When enabled, paid calls return:

- `HTTP 402`
- `error.code = WALLET_FUNDING_FAILED`
- `error.x402 = { provider, reason, retryable }`

## Notes

- This is intentionally scaffold-level; no live wallet transaction logic is required.
- Keep policy checks decoupled from wallet vendors to avoid lock-in.
