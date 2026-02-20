import express from "express";
import { idempotencyKeyMiddleware } from "./middleware/idempotencyKey";
import { x402Middleware } from "./middleware/x402";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/agent/task", idempotencyKeyMiddleware, x402Middleware, (req, res) => {
  const now = new Date().toISOString();

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
