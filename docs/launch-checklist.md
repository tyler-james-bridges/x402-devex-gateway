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

| Signal | Metric | Threshold | How to measure |
|--------|--------|-----------|----------------|
| Onboarding completes | Wall-clock time | ≤ 15 minutes | Observer starts timer when user begins Step 1; stops when Step 8 passes |
| Unpaid → paid flow works | HTTP status codes | 402 then 200 on retry | User runs Step 4 + Step 5 curl commands from runbook |
| Idempotency replay works | Replayed header present | `Idempotency-Replayed: true` | User runs Step 6 curl with `-si` flag |
| Error codes are actionable | User can self-diagnose | No support ticket for documented errors | Observer notes if user needed help beyond runbook |
| Metrics are observable | `/metrics/summary` | Returns valid data after ≥1 call | User runs Step 7 curl command |
| Quickstart verify passes | Script exit code | `npm run quickstart:verify` exits 0 | Automated — user runs Step 8 |
| Zero P0 bugs in first 24h | Bug count by severity | 0 critical / 0 data-loss bugs | Monitor issue tracker for 24h post-onboarding |

### Measurement protocol

1. **Observer** sits with the external user (screen-share or in-person) but does not help unless asked.
2. Start a visible timer when the user opens the runbook.
3. Note any point where the user is confused, stuck, or asks a question — these are **friction points**.
4. Stop the timer when `npm run quickstart:verify` passes (or user explicitly gives up).
5. Record: total time, friction points, support questions asked, and pass/fail for each signal above.
6. If time > 15 min or any signal fails: fix before external handoff and re-run with a different person.

---

## Open risks (known at launch)

| # | Risk | Severity | Mitigation | Status |
|---|------|----------|------------|--------|
| R1 | Session spend cap is structural placeholder — no persistent aggregate tracking | Low | Per-request cap enforced; session cap documented as not-yet-implemented | Accepted |
| R2 | Receipt metadata is stubbed (no real settlement) | Low | Expected for beta scaffold; real settlement is post-beta milestone | Accepted |
| R3 | Memory idempotency store resets on server restart | Medium | Documented; SQLite store available via `IDEMPOTENCY_STORE=sqlite` | Mitigated |
| R4 | No rate limiting | Medium | Beta is internal/controlled audience; add before any public access | Accepted for beta |
| R5 | No concurrent request locking for idempotency (Scenario 4 in e2e-flow) | Low | Documented as target behavior; single-user beta unlikely to trigger | Accepted |
| R6 | Soak test uses local hardware only — no cloud environment benchmark | Low | Local p95 <100ms; re-validate on deploy target before scaling | Accepted |

---

## Go / No-Go decision

- **Go** = all 6 gates checked + dry-run passed + open risks reviewed
- **No-Go** = any must-pass gate has unchecked items → fix before proceeding
- **Conditional Go** = all must-pass gates green, but open risk severity elevated → document mitigations and proceed with monitoring

| Field | Value |
|-------|-------|
| Decision | Go / No-Go / Conditional Go |
| Recorded by | _______________ |
| Date | _______________ |
| Open risks accepted | R1–R6 reviewed: Yes / No |
| Notes | _______________ |
