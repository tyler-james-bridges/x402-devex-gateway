import { NextFunction, Request, Response } from "express";
import { createPaymentVerifier } from "../payments/verifier";

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function x402Middleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const resourceId = process.env.X402_RESOURCE_ID ?? "agent-task";
  const priceUsdRaw = process.env.X402_PRICE_USD ?? "0.01";
  const receiver = process.env.X402_RECEIVER ?? "demo-receiver-address";
  const requiredAmountUsd = toNumber(priceUsdRaw, 0.01);

  const verifier = createPaymentVerifier();
  const verification = verifier.verify({
    paymentHeader: req.header("X-Payment") ?? undefined,
    legacyPaidHeader: req.header("X-Paid") ?? undefined,
    requiredAmountUsd
  });

  if (verification.ok) {
    req.x402Paid = true;
    next();
    return;
  }

  if (verification.reason === "malformed") {
    res.status(402).json({
      error: {
        code: "PAYMENT_PROOF_INVALID",
        message: verification.message,
        x402: {
          resourceId,
          amount: {
            currency: "USD",
            value: priceUsdRaw
          },
          receiver,
          paymentHeader: "X-Payment: v1:<amount-usd>:<proof-id>",
          retryHint: "Submit a valid payment proof in X-Payment and retry with the same Idempotency-Key."
        }
      }
    });
    return;
  }

  if (verification.reason === "underpaid") {
    res.status(402).json({
      error: {
        code: "PAYMENT_UNDERPAID",
        message: "Payment proof was valid but the amount was below the required price.",
        x402: {
          resourceId,
          amount: {
            currency: "USD",
            value: priceUsdRaw
          },
          receiver,
          paymentHeader: "X-Payment: v1:<amount-usd>:<proof-id>",
          providedAmount: {
            currency: "USD",
            value: verification.amountUsd.toString()
          },
          retryHint: "Pay the remaining amount and retry the same request with updated proof."
        }
      }
    });
    return;
  }

  res.status(402).json({
    error: {
      code: "PAYMENT_REQUIRED",
      message: "Payment required for this resource.",
      x402: {
        resourceId,
        amount: {
          currency: "USD",
          value: priceUsdRaw
        },
        receiver,
        paymentHeader: "X-Payment: v1:<amount-usd>:<proof-id>",
        retryHint: "Pay, then retry the same request with proof of payment."
      }
    }
  });
}
