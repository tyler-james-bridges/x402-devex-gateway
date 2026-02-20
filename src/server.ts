import express from "express";
import { sendPolicyCapExceeded, sendWalletFundingFailed } from "./errors";
import { idempotencyKeyMiddleware } from "./middleware/idempotencyKey";
import { idempotencyRecordMiddleware } from "./middleware/idempotencyRecord";
import { idempotencyReplayMiddleware } from "./middleware/idempotencyReplay";
import { x402Middleware } from "./middleware/x402";
import { evaluateWalletPolicy, loadWalletPolicyConfig } from "./policy";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/agent/task",
  idempotencyKeyMiddleware,
  idempotencyReplayMiddleware,
  idempotencyRecordMiddleware,
  x402Middleware,
  (req, res) => {
  const now = new Date().toISOString();
  const policyConfig = loadWalletPolicyConfig();
  const amountUsd = Number(process.env.X402_PRICE_USD ?? "0.01");

  const body = (req.body ?? {}) as { payment?: { token?: string; contract?: string } };
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

  res.status(200).json({
    status: "accepted",
    result: {
      taskId: "task_stub_001",
      message: "Paid path reached. Task processing stub executed."
    },
    receipt: {
      paid: req.x402Paid === true,
      receiptId: "rcpt_stub_001",
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
