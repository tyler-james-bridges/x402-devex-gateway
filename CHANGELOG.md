# Changelog

All notable changes to this project are tracked here.

## [0.1.0-beta] - 2026-02-21

### Added
- Beta payment-gated API rails on `POST /agent/task` with deterministic unpaid (`402`) and paid (`200`) flow.
- Idempotency support with replay header and conflict detection.
- Policy guardrails for wallet actions (caps + allowlists).
- Observability endpoint `GET /metrics/summary` and structured metrics plumbing.
- Playground UI at `GET /playground` for unpaid → paid → replay testing.
- CI/CD workflows with quality gate and deploy smoke coverage.
- Security hygiene: pre-commit safety checks, hardened `.gitignore`, and project `SECURITY.md`.

### Reliability snapshot
- Soak run result: **500/500 successful calls**
- Average latency: **~21ms**
- Quickstart verify: unpaid `402`, paid retry `200`, metrics reachable ✅

### Notes
- This release is marked **beta-ready** for controlled internal dogfooding.
- Next milestone: 24h dogfood validation + response-shape tuning on real internal workloads.
