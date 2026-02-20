import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("paid request echoes idempotency key in success payload", async () => {
  const key = "idem-ci-test-001";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send({ task: "hello" });

  assert.equal(res.status, 200);
  assert.equal(res.body?.idempotencyKey, key);
  assert.equal(res.body?.receipt?.paid, true);
});
