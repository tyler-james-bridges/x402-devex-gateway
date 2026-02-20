import { NextFunction, Request, Response } from "express";

export function idempotencyKeyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.idempotencyKey = req.header("Idempotency-Key") ?? undefined;
  next();
}
