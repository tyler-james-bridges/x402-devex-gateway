import "express";
import type { ParsedPaymentProof, SettlementStatus } from "../payments/provider";

declare global {
  namespace Express {
    interface Request {
      x402Paid?: boolean;
      idempotencyKey?: string;
      requestId?: string;
      /** Parsed proof set by x402Middleware when provider.parse() succeeds. */
      x402Proof?: ParsedPaymentProof;
      /** Settlement status set by x402Middleware after provider.checkSettlement(). */
      x402Settlement?: SettlementStatus & { settled: true };
    }
  }
}

export {};
