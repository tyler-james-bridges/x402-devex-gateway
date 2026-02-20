import "express";

declare global {
  namespace Express {
    interface Request {
      x402Paid?: boolean;
      idempotencyKey?: string;
    }
  }
}

export {};
