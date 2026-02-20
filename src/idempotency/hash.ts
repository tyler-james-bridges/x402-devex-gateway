import { createHash } from "node:crypto";
import { Request } from "express";

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashRequest(req: Request): string {
  const payload = {
    method: req.method,
    path: req.path,
    body: req.body ?? null
  };

  return createHash("sha256").update(stableSerialize(payload)).digest("hex");
}
