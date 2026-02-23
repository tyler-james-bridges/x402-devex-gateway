import { NextFunction, Request, Response } from "express";
import { GatewayConfig, loadGatewayConfig } from "../payments/config";
import { createPaymentProvider, PaymentProvider } from "../payments/provider";
import { resolvePaymentState } from "../payments/states";

/**
 * Build an x402 middleware bound to a pre-loaded config and provider.
 *
 * The factory captures config + provider once at startup so no env reads
 * happen at request time. The middleware maps each PaymentState to a
 * deterministic 402 response or calls next() on settlement success.
 */
export function createX402Middleware(
  config: GatewayConfig,
  provider: PaymentProvider
): (req: Request, res: Response, next: NextFunction) => void {
  const { resourceId, priceUsd, receiver } = config;
  const priceUsdStr = priceUsd.toString();

  const x402Base = {
    resourceId,
    amount: { currency: "USD", value: priceUsdStr },
    receiver,
    paymentHeader: "X-Payment: v1:<amount-usd>:<proof-id>",
  };

  return function x402Middleware(req: Request, res: Response, next: NextFunction): void {
    // Extract raw proof from headers
    const paymentHeader = req.header("X-Payment") ?? undefined;
    const legacyPaidHeader = req.header("X-Paid") ?? undefined;

    let rawProof: string | undefined;
    if (paymentHeader && paymentHeader.trim() !== "") {
      rawProof = paymentHeader;
    } else if (legacyPaidHeader === "true") {
      rawProof = "legacy-x-paid:true";
    }

    // Resolve through provider adapter boundary → deterministic state
    const paymentState = resolvePaymentState(rawProof, priceUsd, provider);

    switch (paymentState.state) {
      case "required":
        res.status(402).json({
          error: {
            code: "PAYMENT_REQUIRED",
            message: "Payment required for this resource.",
            x402: {
              ...x402Base,
              retryHint: "Pay, then retry the same request with proof of payment.",
            },
          },
        });
        return;

      case "malformed":
        res.status(402).json({
          error: {
            code: "PAYMENT_PROOF_INVALID",
            message: paymentState.message,
            x402: {
              ...x402Base,
              retryHint: "Submit a valid payment proof in X-Payment and retry with the same Idempotency-Key.",
            },
          },
        });
        return;

      case "invalid":
        res.status(402).json({
          error: {
            code: "PAYMENT_INVALID",
            message: paymentState.message,
            x402: {
              ...x402Base,
              retryHint: "Submit a new, valid payment proof and retry.",
            },
          },
        });
        return;

      case "underpaid":
        res.status(402).json({
          error: {
            code: "PAYMENT_UNDERPAID",
            message: "Payment proof was valid but the amount was below the required price.",
            x402: {
              ...x402Base,
              providedAmount: { currency: "USD", value: paymentState.proof.amountUsd.toString() },
              retryHint: "Pay the remaining amount and retry the same request with updated proof.",
            },
          },
        });
        return;

      case "unsettled":
        res.status(402).json({
          error: {
            code: "PAYMENT_UNSETTLED",
            message: paymentState.reason,
            x402: {
              ...x402Base,
              network: paymentState.proof.network,
              proofId: paymentState.proof.proofId,
              retryable: paymentState.retryable,
              retryHint: paymentState.retryable
                ? "Transaction is pending confirmation. Retry with the same Idempotency-Key after a short delay."
                : "Transaction could not be settled. Submit a new payment proof.",
            },
          },
        });
        return;

      case "settled":
        req.x402Paid = true;
        req.x402Proof = paymentState.proof;
        req.x402Settlement = paymentState.settlement;
        next();
        return;
    }
  };
}

/**
 * Convenience: env-driven middleware for backward compatibility.
 *
 * Reads config from process.env on every call. Prefer createX402Middleware()
 * with a pre-loaded GatewayConfig in production setups.
 */
export function x402Middleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = loadGatewayConfig();
  const provider = createPaymentProvider(config.provider, {
    simulateInvalid: config.simulateInvalid,
    simulateUnsettled: config.simulateUnsettled,
  });
  createX402Middleware(config, provider)(req, res, next);
}
