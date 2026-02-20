import { NextFunction, Request, Response } from "express";

function isPaid(req: Request): boolean {
  return req.header("X-Paid") === "true";
}

export function x402Middleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isPaid(req)) {
    req.x402Paid = true;
    next();
    return;
  }

  const resourceId = process.env.X402_RESOURCE_ID ?? "agent-task";
  const priceUsd = process.env.X402_PRICE_USD ?? "0.01";
  const receiver = process.env.X402_RECEIVER ?? "demo-receiver-address";

  res.status(402).json({
    error: {
      code: "PAYMENT_REQUIRED",
      message: "Payment required for this resource.",
      x402: {
        resourceId,
        amount: {
          currency: "USD",
          value: priceUsd
        },
        receiver,
        paymentHeader: "X-Paid: true",
        retryHint: "Pay, then retry the same request with proof of payment."
      }
    }
  });
}
