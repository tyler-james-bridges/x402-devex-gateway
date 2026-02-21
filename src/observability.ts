import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

type RequestMetric = { ts: number; ms: number; status: number; paid: boolean };

const recent: RequestMetric[] = [];
const maxRecent = 500;

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx] ?? 0;
}

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestId = req.header("X-Request-Id") ?? randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    const paid = req.x402Paid === true;

    recent.push({ ts: Date.now(), ms, status: res.statusCode, paid });
    if (recent.length > maxRecent) recent.shift();

    if (process.env.AUDIT_LOG_ENABLED !== "false") {
      console.log(JSON.stringify({
        event: "http.request.completed",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs: ms,
        paid,
        idempotencyKey: req.idempotencyKey ?? null
      }));
    }
  });

  next();
}

export function metricsSummary() {
  const latencies = recent.map((m) => m.ms);
  const total = recent.length;
  const paid = recent.filter((m) => m.paid).length;
  const failures = recent.filter((m) => m.status >= 400).length;

  return {
    windowSize: total,
    callsTotal: total,
    paidCalls: paid,
    failureRate: total === 0 ? 0 : Number((failures / total).toFixed(4)),
    p95LatencyMs: p95(latencies)
  };
}
