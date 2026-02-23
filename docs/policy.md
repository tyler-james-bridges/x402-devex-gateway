# Wallet Policy Guardrails

This gateway includes a lightweight, provider-agnostic wallet policy check in the paid execution path (`POST /agent/task`).

## What is enforced

- **Per-request USD cap** (`WALLET_POLICY_PER_REQUEST_CAP_USD`)
- **Session/budget cap** (`WALLET_POLICY_SESSION_CAP_USD`) — persistent aggregate spend tracking per policy, backed by a configurable spend store (memory or SQLite)
- **Allowlisted token symbols** (`WALLET_POLICY_ALLOWED_TOKENS`)
- **Allowlisted contract addresses** (`WALLET_POLICY_ALLOWED_CONTRACTS`)

If policy denies a request, API returns:

- Per-request cap: `HTTP 403` + `error.code = POLICY_CAP_EXCEEDED`
- Session cap: `HTTP 403` + `error.code = SESSION_CAP_EXCEEDED`

## Environment configuration

```bash
# Required by existing x402 scaffold
X402_PRICE_USD=0.01

# Policy identity + caps
WALLET_POLICY_ID=default
WALLET_POLICY_PER_REQUEST_CAP_USD=0.05
WALLET_POLICY_SESSION_CAP_USD=5.00

# Spend store backend (memory or sqlite, default memory)
SPEND_STORE=memory
SPEND_STORE_SQLITE_PATH=:memory:

# Optional comma-separated allowlists (case-insensitive)
WALLET_POLICY_ALLOWED_TOKENS=usdc,usdt
WALLET_POLICY_ALLOWED_CONTRACTS=0xabc...,0xdef...
```

### Example deny response (per-request cap)

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

### Example deny response (session cap)

```json
{
  "error": {
    "code": "SESSION_CAP_EXCEEDED",
    "message": "This request would exceed the session spending cap.",
    "x402": {
      "policyId": "default",
      "sessionCapUsd": "5.00",
      "sessionSpentUsd": "4.95",
      "requestAmountUsd": "0.10",
      "currency": "USD"
    }
  }
}
```

### Session cap details

- Spend is tracked per `policyId` across all requests for the gateway lifetime (or SQLite persistence)
- The spend store uses `BEGIN IMMEDIATE` transactions in SQLite for MVP race-safety
- Idempotent replays (same `Idempotency-Key` + payload) do not double-count spend
- The exact cap boundary is allowed (i.e. spending exactly `sessionCapUsd` succeeds)
- If no `WALLET_POLICY_SESSION_CAP_USD` is set, session tracking is disabled

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
