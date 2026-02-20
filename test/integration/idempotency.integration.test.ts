import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("integration: replay returns previously stored successful response", async () => {
  const key = `integration-replay-${Date.now()}`;
  const payload = { task: "integration-replay" };

  const first = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send(payload);

  const second = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .send(payload);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.headers["idempotency-replayed"], "true");
  assert.deepEqual(second.body, first.body);
});

test("integration: conflict returns 409 for same key and different payload", async () => {
  const key = `integration-conflict-${Date.now()}`;

  const first = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send({ task: "integration-one" });

  const second = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send({ task: "integration-two" });

  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.equal(second.body?.error?.code, "IDEMPOTENCY_CONFLICT");
});
