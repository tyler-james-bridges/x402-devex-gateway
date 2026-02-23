import express from "express";
import { sendPolicyCapExceeded, sendTaskFailed, sendTaskTimeout, sendWalletFundingFailed } from "./errors";
import { idempotencyKeyMiddleware } from "./middleware/idempotencyKey";
import { idempotencyRecordMiddleware } from "./middleware/idempotencyRecord";
import { idempotencyReplayMiddleware } from "./middleware/idempotencyReplay";
import { x402Middleware } from "./middleware/x402";
import { evaluateWalletPolicy, loadWalletPolicyConfig } from "./policy";
import { playgroundHtml } from "./playgroundHtml";
import { metricsSummary, observabilityMiddleware } from "./observability";
import { createRuntime, type TaskRuntime } from "./runtime";

export const app = express();
app.use(express.json());
app.use(observabilityMiddleware);

/* ------------------------------------------------------------------ */
/*  Runtime – replaceable for testing                                  */
/* ------------------------------------------------------------------ */

let _taskRuntime: TaskRuntime | undefined;

export function getTaskRuntime(): TaskRuntime {
  if (!_taskRuntime) _taskRuntime = createRuntime();
  return _taskRuntime;
}

/** @internal Reset to default runtime (test-only). */
export function _setTaskRuntime(runtime: TaskRuntime | undefined): void {
  _taskRuntime = runtime;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/playground", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.type("html").send(playgroundHtml);
});

app.get("/metrics/summary", (_req, res) => {
  res.json(metricsSummary());
});

app.post(
  "/agent/task",
  idempotencyKeyMiddleware,
  idempotencyReplayMiddleware,
  idempotencyRecordMiddleware,
  x402Middleware,
  async (req, res) => {
  const now = new Date().toISOString();
  const policyConfig = loadWalletPolicyConfig();
  const amountUsd = Number(process.env.X402_PRICE_USD ?? "0.01");

  const body = (req.body ?? {}) as { task?: string; payment?: { token?: string; contract?: string } };
  const policyResult = evaluateWalletPolicy(
    {
      amountUsd,
      token: body.payment?.token,
      contract: body.payment?.contract
    },
    policyConfig
  );

  if (!policyResult.ok) {
    sendPolicyCapExceeded(res, policyResult.message, policyResult.details);
    return;
  }

  if (process.env.WALLET_FUNDING_SIMULATE_FAIL === "true") {
    sendWalletFundingFailed(res, {
      provider: process.env.WALLET_FUNDING_PROVIDER,
      reason: process.env.WALLET_FUNDING_REASON,
      retryable: process.env.WALLET_FUNDING_RETRYABLE === "true"
    });
    return;
  }

  const taskId = req.requestId ? `task_${req.requestId.slice(0, 8)}` : `task_${Date.now()}`;
  const runtime = getTaskRuntime();
  const taskResult = await runtime.execute({ task: body.task ?? "", requestId: taskId });

  if (taskResult.status === "timeout") {
    sendTaskTimeout(res, taskId, taskResult.timeoutMs);
    return;
  }

  if (taskResult.status === "failed") {
    sendTaskFailed(res, taskId, taskResult.error);
    return;
  }

  res.status(200).json({
    status: "completed",
    result: {
      taskId,
      output: taskResult.output,
      durationMs: taskResult.durationMs,
    },
    receipt: {
      paid: req.x402Paid === true,
      receiptId: `rcpt_${taskId.replace("task_", "")}`,
      network: "base-sepolia",
      txHash: "0xstub",
      payer: "0xpayerstub",
      receiver: process.env.X402_RECEIVER ?? "demo-receiver-address",
      amount: {
        currency: "USD",
        value: process.env.X402_PRICE_USD ?? "0.01"
      },
      paidAt: now
    },
    idempotencyKey: req.idempotencyKey ?? null
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`x402-devex-gateway listening on :${port}`);
  });
}
