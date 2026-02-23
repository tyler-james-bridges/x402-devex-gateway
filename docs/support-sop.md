# Support SOP — x402-devex-gateway

Standard operating procedures for triage, response, and escalation during beta.

---

## Severity levels

| Level | Definition | Response target | Examples |
|-------|-----------|----------------|----------|
| **P0** | Service down or data loss | 1 hour | Server won't start, payments accepted but not recorded, silent data corruption |
| **P1** | Core flow broken | 4 hours | 402→200 flow fails, idempotency replay broken, metrics return wrong data |
| **P2** | Non-blocking issue | 1 business day | Playground UI glitch, doc typo, confusing error message |
| **P3** | Enhancement request | Backlog | New error code request, additional metrics, UX suggestions |

---

## Triage flowchart

```
Incoming report
  │
  ├─ Can user start the server?
  │   NO → Check: node version, npm install, .env exists → P0 if env is correct
  │
  ├─ Is the 402→200 flow working?
  │   NO → Check: PAYMENT_VERIFIER_MODE, X-Payment header format → P1
  │
  ├─ Is idempotency working?
  │   NO → Check: Idempotency-Key header present, same body on retry → P1
  │
  ├─ Are metrics returning data?
  │   NO → Check: GET /metrics/summary, server logs → P2
  │
  └─ Other → P2 or P3 based on impact
```

---

## Diagnostic commands

Run these to gather context before responding or escalating:

```bash
# 1. Check server is running
curl -s http://localhost:3000/health | jq .

# 2. Reproduce the 402 flow
curl -si -X POST http://localhost:3000/agent/task \
  -H 'Content-Type: application/json' \
  -d '{"task":"test"}'

# 3. Check metrics for anomalies
curl -s http://localhost:3000/metrics/summary | jq .

# 4. Check recent logs (structured JSON)
# Look for event=http.request.completed lines in server output

# 5. Verify environment
cat .env | grep -v '#' | grep -v '^$'

# 6. Run automated verification
npm run quickstart:verify -- http://localhost:3000
```

---

## Response templates

### Template: Onboarding issue (can't complete setup)

```
Thanks for reporting this.

Please confirm:
1. Node version: `node --version` (need 18+)
2. Did `npm install` complete without errors?
3. Does `.env` exist? (`ls -la .env`)
4. What does `npm run dev` output?

If all look fine, run `npm run quickstart:verify -- http://localhost:3000`
and share the output.
```

### Template: Payment flow issue (402 on paid request)

```
This usually means the payment header format doesn't match the verifier mode.

The default mode is `strict`, which requires:
  X-Payment: v1:<amount-usd>:<proof-id>

Example:
  X-Payment: v1:0.01:proof123

Please check:
1. Your .env has `PAYMENT_VERIFIER_MODE=strict` (or unset, which defaults to strict)
2. Your request includes the `X-Payment` header (not `X-Paid`)
3. The amount matches or exceeds `X402_PRICE_USD` in your .env

See docs/error-catalog.md for error code details.
```

### Template: Idempotency conflict (unexpected 409)

```
A 409 means the same Idempotency-Key was used with a different request body.

This is by design — idempotency keys are bound to a specific payload hash.

To fix:
- Use a new unique Idempotency-Key for each distinct request
- Reuse the same key only when retrying the exact same request

See the replay section in docs/onboarding-runbook.md for examples.
```

### Template: Enhancement / feature request

```
Thanks for the suggestion — noted for the backlog.

For now this is a beta scaffold, so we're focused on core flow stability.
We'll track this as a P3 enhancement.
```

---

## Escalation path

| Condition | Action |
|-----------|--------|
| P0: service won't start or data issue | Escalate immediately to on-call engineer |
| P1: core flow regression | File issue, tag `priority:high`, notify team channel |
| P2: non-blocking | File issue, tag `priority:medium`, handle in next work cycle |
| P3: enhancement | File issue, tag `enhancement`, triage in weekly review |
| Security concern (secrets exposed, auth bypass) | Follow `SECURITY.md`, escalate to security contact immediately |
| User blocked >30 min on onboarding | Pair with them live; update runbook with whatever was missing |

---

## Known issues (beta)

| Issue | Workaround | Tracking |
|-------|-----------|----------|
| Session spend cap not persisted | Per-request cap works; session cap is structural placeholder | Backlog |
| Receipt metadata is stubbed | Expected — real settlement integration is post-beta | By design |
| Memory idempotency store resets on restart | Use `IDEMPOTENCY_STORE=sqlite` for persistence | Documented in .env.example |
| No rate limiting | Beta is internal/controlled; add before public access | Backlog |
