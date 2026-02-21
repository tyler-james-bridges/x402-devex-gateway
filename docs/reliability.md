# Reliability Snapshot (Beta)

Date: 2026-02-21

## Latest benchmark snapshot

- Soak test: `500/500` successful requests
- Average latency: `~21ms`
- Endpoint under test: `POST /agent/task`

## Quickstart verification

Command:

```bash
npm run quickstart:verify -- http://localhost:3000
```

Expected + observed:
1. Unpaid request → `402 Payment Required`
2. Paid retry → `200 OK`
3. Metrics summary reachable (`GET /metrics/summary`)

## How to reproduce

```bash
# start service
npm run dev

# verify flow
npm run quickstart:verify -- http://localhost:3000

# optional soak
npm run test:soak -- http://localhost:3000 500
```

`test:soak` writes a report artifact to `tests/reliability-report.json`.
