import { Response } from "express";

export function sendPolicyCapExceeded(
  res: Response,
  message: string,
  details: Record<string, unknown>
): void {
  res.status(403).json({
    error: {
      code: "POLICY_CAP_EXCEEDED",
      message,
      x402: details
    }
  });
}

export function sendWalletFundingFailed(
  res: Response,
  options: {
    provider?: string;
    reason?: string;
    retryable?: boolean;
    message?: string;
  } = {}
): void {
  const provider = options.provider ?? "x402-wallet";
  const reason = options.reason ?? "insufficient_funds";
  const retryable = options.retryable ?? false;

  res.status(402).json({
    error: {
      code: "WALLET_FUNDING_FAILED",
      message: options.message ?? "Wallet provider could not fund payment.",
      x402: {
        provider,
        reason,
        retryable
      }
    }
  });
}
