import express from "express";
import { sendPolicyCapExceeded, sendTaskFailed, sendTaskTimeout, sendWalletFundingFailed } from "./errors";
import { idempotencyKeyMiddleware } from "./middleware/idempotencyKey";
import { idempotencyRecordMiddleware } from "./middleware/idempotencyRecord";
import { idempotencyReplayMiddleware } from "./middleware/idempotencyReplay";
import { createX402Middleware, x402Middleware } from "./middleware/x402";
import { loadGatewayConfig } from "./payments/config";
import { createPaymentProvider } from "./payments/provider";
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
  // x402 middleware reads env per-request so tests can toggle provider/flags
  // between requests without restarting the server. In production, prefer
  // createX402Middleware() with a pre-loaded GatewayConfig.
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

// Export factory for production use (config loaded once at startup)
export function createConfiguredApp() {
  const prodApp = express();
  prodApp.use(express.json());
  prodApp.use(observabilityMiddleware);

  const gatewayConfig = loadGatewayConfig();
  const provider = createPaymentProvider(gatewayConfig.provider, {
    simulateInvalid: gatewayConfig.simulateInvalid,
    simulateUnsettled: gatewayConfig.simulateUnsettled,
  });

  prodApp.get("/health", (_req, res) => res.json({ ok: true }));
  prodApp.get("/playground", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.type("html").send(playgroundHtml);
  });
  prodApp.get("/metrics/summary", (_req, res) => res.json(metricsSummary()));

  prodApp.post(
    "/agent/task",
    idempotencyKeyMiddleware,
    idempotencyReplayMiddleware,
    idempotencyRecordMiddleware,
    createX402Middleware(gatewayConfig, provider),
    (req, res) => {
      const now = new Date().toISOString();
      const policyConfig = loadWalletPolicyConfig();

      const body = (req.body ?? {}) as { payment?: { token?: string; contract?: string } };
      const policyResult = evaluateWalletPolicy(
        { amountUsd: gatewayConfig.priceUsd, token: body.payment?.token, contract: body.payment?.contract },
        policyConfig
      );

      if (!policyResult.ok) {
        sendPolicyCapExceeded(res, policyResult.message, policyResult.details);
        return;
      }

      const proof = req.x402Proof;
      const settlement = req.x402Settlement;

      res.status(200).json({
        status: "accepted",
        result: {
          taskId: req.requestId ? `task_${req.requestId.slice(0, 8)}` : "task_stub",
          message: "Task accepted by gateway. Replace this stub with your agent runtime.",
          output: {
            summary: "Demo result payload from x402-devex-gateway.",
            nextAction: "Wire your real agent execution in src/server.ts handler."
          }
        },
        receipt: {
          paid: req.x402Paid === true,
          receiptId: proof ? `rcpt_${proof.proofId}` : "rcpt_stub_001",
          network: proof?.network ?? gatewayConfig.resourceId,
          txHash: settlement?.txHash ?? "0xstub",
          payer: "0xpayerstub",
          receiver: gatewayConfig.receiver,
          amount: {
            currency: "USD",
            value: proof ? proof.amountUsd.toString() : gatewayConfig.priceUsd.toString()
          },
          paidAt: settlement?.confirmedAt ?? now
        },
        idempotencyKey: req.idempotencyKey ?? null
      });
    }
  );

  return { app: prodApp, config: gatewayConfig, provider };
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`x402-devex-gateway listening on :${port}`);
  });
}
