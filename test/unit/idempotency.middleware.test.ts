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
  assert.equal(res.headers["idempotency-replayed"], "false");
});

test("replay with same idempotency key and same payload returns cached response", async () => {
  const key = "idem-replay-001";
  const payload = { task: "hello-replay" };

  const first = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send(payload);

  const replay = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .send(payload);

  assert.equal(first.status, 200);
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, first.body);
  assert.equal(replay.headers["idempotency-replayed"], "true");
});

test("same idempotency key with different payload returns 409 conflict", async () => {
  const key = "idem-conflict-001";

  const first = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send({ task: "task-one" });

  const conflict = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send({ task: "task-two" });

  assert.equal(first.status, 200);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body?.error?.code, "IDEMPOTENCY_CONFLICT");
});
