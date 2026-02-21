# Observability Playbook

## Correlation IDs
Every response includes `X-Request-Id`.
- Client can pass one in `X-Request-Id`.
- If missing, server generates one.

## Metrics Endpoint
`GET /metrics/summary`

Returns recent-window metrics:
- `callsTotal`
- `paidCalls`
- `failureRate`
- `p95LatencyMs`

## Basic Triage
1. High `failureRate` + many 402s: payment flow friction.
2. High `failureRate` + 409s: idempotency-key misuse.
3. Rising `p95LatencyMs`: inspect execution and wallet policy checks.

## Log Query Starter
Filter JSON logs where:
- `event=http.request.completed`
- `path=/agent/task`
- group by `status` and `paid`.
