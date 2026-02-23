# x402-devex-gateway Architecture

## Config-Driven Typed Model

All payment configuration is loaded once at startup via `loadGatewayConfig()` and passed through the stack as a typed `GatewayConfig` object — no scattered `process.env` reads at request time.

```text
┌─ Startup ──────────────────────────────────────────────────┐
│                                                            │
│  loadGatewayConfig(env)                                    │
│       │                                                    │
│       ▼                                                    │
│  GatewayConfig { provider, resourceId, priceUsd,           │
│                  receiver, simulateInvalid,                 │
│                  simulateUnsettled }                        │
│       │                                                    │
│       ▼                                                    │
│  createPaymentProvider(config.provider, opts)               │
│       │                                                    │
│       ▼                                                    │
│  createX402Middleware(config, provider) → middleware fn     │
└────────────────────────────────────────────────────────────┘
```

Environment variables: `PAYMENT_PROVIDER`, `X402_RESOURCE_ID`, `X402_PRICE_USD`, `X402_RECEIVER`, `PAYMENT_SIMULATE_INVALID`, `PAYMENT_SIMULATE_UNSETTLED`.

## Provider Adapter Boundary

Payment verification is decoupled from the gateway via a `PaymentProvider` interface:

```text
┌──────────────────────────────────────────────────────────────┐
│  x402Middleware                                              │
│                                                              │
│  raw proof string                                            │
│       │                                                      │
│       ▼                                                      │
│  resolvePaymentState(rawProof, requiredUsd, provider)        │
│       │                                                      │
│       ├── state: "required"   → 402 PAYMENT_REQUIRED         │
│       ├── state: "malformed"  → 402 PAYMENT_PROOF_INVALID    │
│       ├── state: "invalid"    → 402 PAYMENT_INVALID          │
│       ├── state: "underpaid"  → 402 PAYMENT_UNDERPAID        │
│       ├── state: "unsettled"  → 402 PAYMENT_UNSETTLED        │
│       └── state: "settled"    → next() (paid)                │
└──────────────────────────────────────────────────────────────┘
```

### Payment State Lifecycle

Every request resolves to one of six `PaymentState` variants (discriminated union in `src/payments/states.ts`):

| State       | Meaning                                             | HTTP | Error code              |
|-------------|-----------------------------------------------------|------|-------------------------|
| `required`  | No proof attached                                   | 402  | `PAYMENT_REQUIRED`      |
| `malformed` | Proof string unparseable                            | 402  | `PAYMENT_PROOF_INVALID` |
| `invalid`   | Proof parsed but provider rejected (e.g. bad sig)   | 402  | `PAYMENT_INVALID`       |
| `underpaid` | Valid proof but amount < required                   | 402  | `PAYMENT_UNDERPAID`     |
| `unsettled` | Valid + sufficient but not yet settled on-chain      | 402  | `PAYMENT_UNSETTLED`     |
| `settled`   | Fully verified and confirmed                        | —    | *(passes to handler)*   |

### Provider Implementations

| Name              | Config value             | Behaviour                                        |
|-------------------|--------------------------|--------------------------------------------------|
| Stub              | `stub`                   | Accepts any non-empty proof, always settles       |
| Strict-format     | `strict-format` / `strict` | Parses `v1:<amount>:<id>`, simulates settlement |
| *(future)*        | `onchain`                | Real RPC verification + settlement polling        |

### Configuration

Provider is selected via `PAYMENT_PROVIDER` (preferred) or the legacy `PAYMENT_VERIFIER_MODE` env var. Simulation flags for testing:

- `PAYMENT_SIMULATE_INVALID=true` — forces `parse()` to reject with `reason: "invalid"`
- `PAYMENT_SIMULATE_UNSETTLED=true` — forces `checkSettlement()` to return unsettled

## Sequence flow: `402 → pay → retry → success`

```text
Client
  |
  | POST /agent/task (without payment proof)
  v
Gateway
  |- idempotencyKeyMiddleware (captures Idempotency-Key header)
  |- x402Middleware: resolvePaymentState() → "required" → 402 PAYMENT_REQUIRED
  v
Client
  |
  | Pays off-chain/on-chain using instructions
  | Adds payment proof header: X-Payment: v1:<amount>:<proof-id>
  | Retries same POST /agent/task (same Idempotency-Key)
  v
Gateway
  |- idempotencyKeyMiddleware
  |- idempotencyReplayMiddleware (replays cached response if found)
  |- x402Middleware: resolvePaymentState() → "settled" → next()
  |- handler: policy check → wallet → 200 with receipt
  v
Client receives HTTP 200 + receipt { txHash, network, paidAt, ... }
```

## Production Gaps

The following are known gaps before full production readiness:

1. **Onchain verification**: No real RPC/blockchain verification yet. The `onchain` provider is a placeholder — implement with viem/ethers for Base Sepolia then Mainnet.
2. **Session spend tracking**: `sessionCapUsd` in wallet policy is scaffolded but not enforced (requires persistent spend accounting).
3. **Payer extraction**: `receipt.payer` is hardcoded to `"0xpayerstub"` — real proofs need to extract the sender address from the transaction.
4. **Settlement polling**: `checkSettlement()` is synchronous. Onchain provider will need async with timeout/retry for confirmation polling.
5. **Proof replay protection**: No deduplication of proof IDs — the same proof could be reused across requests. Requires a proof-seen store.

## Notes

- `402` response shapes are deterministic for reliable client integration tests.
- Receipt fields are populated from provider settlement data (txHash, confirmedAt, network).
- Legacy `X-Paid: true` header still accepted by stub provider for backward compatibility.
- The `x402Middleware` convenience export reads env per-request for test ergonomics; use `createX402Middleware()` in production.
