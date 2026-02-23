import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("missing payment returns 402 with PAYMENT_REQUIRED", async () => {
  process.env.PAYMENT_VERIFIER_MODE = "stub";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "test-key-1")
    .send({ task: "hello" });

  assert.equal(res.status, 402);
  assert.equal(res.body?.error?.code, "PAYMENT_REQUIRED");
  assert.equal(typeof res.body?.error?.message, "string");
  assert.ok(res.body?.error?.x402);
});

test("malformed payment in strict mode returns 402 with PAYMENT_PROOF_INVALID", async () => {
  process.env.PAYMENT_VERIFIER_MODE = "strict";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "test-key-2")
    .set("X-Payment", "not-a-proof")
    .send({ task: "hello" });

  assert.equal(res.status, 402);
  assert.equal(res.body?.error?.code, "PAYMENT_PROOF_INVALID");
  assert.match(String(res.body?.error?.message ?? ""), /Malformed payment proof/i);
});

test("underpaid proof in strict mode returns 402 with PAYMENT_UNDERPAID", async () => {
  process.env.PAYMENT_VERIFIER_MODE = "strict";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "test-key-3")
    .set("X-Payment", "v1:0.001:proof123")
    .send({ task: "hello" });

  assert.equal(res.status, 402);
  assert.equal(res.body?.error?.code, "PAYMENT_UNDERPAID");
});

test("accepted payment proof in strict mode returns 200", async () => {
  process.env.PAYMENT_VERIFIER_MODE = "strict";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "test-key-4")
    .set("X-Payment", "v1:0.01:proof123")
    .send({ task: "hello" });

  assert.equal(res.status, 200);
  assert.equal(res.body?.status, "completed");
  assert.equal(res.body?.receipt?.paid, true);
});
