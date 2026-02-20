import { NextFunction, Request, Response } from "express";
import { hashRequest } from "../idempotency/hash";
import { getIdempotencyStore } from "../idempotency/store";

export function idempotencyReplayMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.idempotencyKey;

  if (!key) {
    next();
    return;
  }

  const requestHash = hashRequest(req);
  const store = getIdempotencyStore();
  const existing = store.get(key);

  if (!existing) {
    next();
    return;
  }

  if (existing.requestHash !== requestHash) {
    res.status(409).json({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
        message:
          "Idempotency-Key has already been used with a different request payload.",
        idempotencyKey: key
      }
    });
    return;
  }

  res.setHeader("Idempotency-Replayed", "true");
  res.status(existing.statusCode).json(existing.responseBody);
}
