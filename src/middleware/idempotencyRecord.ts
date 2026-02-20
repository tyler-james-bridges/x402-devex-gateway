import { NextFunction, Request, Response } from "express";
import { hashRequest } from "../idempotency/hash";
import { getIdempotencyStore } from "../idempotency/store";

export function idempotencyRecordMiddleware(
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
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      getIdempotencyStore().set({
        key,
        requestHash,
        statusCode: res.statusCode,
        responseBody: body,
        createdAt: new Date().toISOString()
      });

      res.setHeader("Idempotency-Replayed", "false");
    }

    return originalJson(body);
  }) as typeof res.json;

  next();
}
