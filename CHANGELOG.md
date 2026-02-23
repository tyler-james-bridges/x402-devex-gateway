# Changelog

All notable changes to this project are tracked here.

## [0.2.0-beta] - 2026-02-22

### Added
- Pluggable `TaskRuntime` interface with `StubRuntime` default backend (`src/runtime.ts`).
- `withTimeout` wrapper using `Promise.race` for reliable timeout handling of non-cooperative runtimes.
- `createRuntime` factory with configurable timeout via `TASK_TIMEOUT_MS` env var (default 30s).
- `sendTaskTimeout` (504) and `sendTaskFailed` (502) structured error responses.
- `POST /agent/task` now executes tasks through the runtime pipeline and maps results to HTTP 200/502/504.
- Unit tests for StubRuntime, withTimeout (pass-through, timeout, failure), and HTTP response mapping.

### Changed
- Response `status` field changed from `"accepted"` to `"completed"` to reflect actual task execution.
- Response `result` field now includes `output: { summary }` and `durationMs` instead of `message`.
- Updated OpenAPI spec, JS client example, error catalog, and docs to match new response shape.

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
