import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("unpaid request returns 402 with x402 error shape", async () => {
  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "test-key-1")
    .send({ task: "hello" });

  assert.equal(res.status, 402);
  assert.equal(res.body?.error?.code, "PAYMENT_REQUIRED");
  assert.equal(typeof res.body?.error?.message, "string");
  assert.ok(res.body?.error?.x402);
});
