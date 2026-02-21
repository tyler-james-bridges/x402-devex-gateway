# SECURITY.md

## Principles
- Never commit secrets (`.env`, keys, private certs).
- Keep payment verification strict in non-local environments.
- Fail closed on policy errors (deny > allow).

## Required Runtime Defaults
- `PAYMENT_VERIFIER_MODE=strict` outside local dev.
- `AUDIT_LOG_ENABLED=true` in staging/prod.
- Set explicit wallet policy caps and allowlists.

## Secret Handling
- Use environment variables from a secret manager.
- Do not print raw payment proofs in logs.
- Rotate credentials immediately if exposed.

## Network / Outbound
- Prefer deny-by-default egress where possible.
- Only allow required destinations for payment/wallet providers.

## Audit Events
Current app emits structured JSON logs for request completion with:
- `requestId`
- `method`, `path`, `status`
- `latencyMs`
- `paid`
- `idempotencyKey` (if supplied)

## Quick Security Checklist
- [ ] `PAYMENT_VERIFIER_MODE=strict`
- [ ] Wallet caps configured
- [ ] Token/contract allowlists configured
- [ ] Secrets injected at runtime (not in git)
- [ ] Audit logs enabled and retained
