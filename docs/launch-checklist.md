# Launch Checklist — x402-devex-gateway v0.1.0-beta

Go/no-go gates for first external onboarding.

---

## Gate 1: Code & CI (must-pass)

- [ ] `npm run lint` — zero errors
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test:unit` — all passing
- [ ] `npm run test:integration` — all passing
- [ ] `npm run docs:check` — doc curl examples valid
- [ ] CI `quality-gate` green on `main` (or merge target)

## Gate 2: Runtime verification (must-pass)

- [ ] `npm run dev` starts without errors on clean `cp .env.example .env`
- [ ] `npm run quickstart:verify -- http://localhost:3000` — unpaid 402, paid 200, metrics reachable
- [ ] `GET /health` returns `{ "ok": true }`
- [ ] `GET /playground` renders interactive UI
- [ ] `GET /metrics/summary` returns valid JSON with `callsTotal`, `paidCalls`, `failureRate`, `p95LatencyMs`

## Gate 3: Reliability (must-pass)

- [ ] Soak test passes: `npm run test:soak -- http://localhost:3000 500` — 0 failures
- [ ] p95 latency < 100ms on local hardware
- [ ] No memory leaks observed during soak run (process RSS stable)

## Gate 4: Security (must-pass)

- [ ] `PAYMENT_VERIFIER_MODE=strict` is default in `.env.example`
- [ ] `AUDIT_LOG_ENABLED=true` is default in `.env.example`
- [ ] No secrets committed (`.env` in `.gitignore`)
- [ ] Wallet policy caps configured (per-request cap set)
- [ ] Pre-commit safety check script exists (`scripts/precommit-safety-check.sh`)

## Gate 5: Documentation (must-pass)

- [ ] README has working quickstart (install → run → verify)
- [ ] `docs/first-paid-request.md` matches current default verifier mode
- [ ] `docs/error-catalog.md` covers all emitted error codes
- [ ] `docs/onboarding-runbook.md` exists and is <15 min end-to-end
- [ ] `docs/support-sop.md` exists with triage + escalation paths
- [ ] OpenAPI spec (`openapi.yaml`) matches implemented endpoints

## Gate 6: Onboarding dry-run (must-pass)

- [ ] One team member completes `docs/onboarding-runbook.md` cold (no help) in ≤15 min
- [ ] They successfully see: 402 → paid 200 → replay → metrics
- [ ] Any confusion points are captured and fixed before external handoff

---

## Acceptance signals — first external onboarding

These are the measurable outcomes that confirm launch readiness:

| Signal | Metric | Threshold |
|--------|--------|-----------|
| Onboarding completes | Wall-clock time | ≤ 15 minutes |
| Unpaid → paid flow works | HTTP status codes | 402 then 200 on retry |
| Idempotency replay works | Replayed header present | `Idempotency-Replayed: true` |
| Error codes are actionable | User can self-diagnose | No support ticket for documented errors |
| Metrics are observable | `/metrics/summary` | Returns valid data after ≥1 call |
| Quickstart verify passes | Script exit code | `npm run quickstart:verify` exits 0 |
| Zero P0 bugs in first 24h | Bug count by severity | 0 critical / 0 data-loss bugs |

---

## Go / No-Go decision

- **Go** = all 6 gates checked + dry-run passed
- **No-Go** = any gate has unchecked items → fix before proceeding
- **Conditional Go** = gate 3 or gate 6 has minor items flagged as known risks with mitigations documented

Decision recorded by: _______________
Date: _______________
