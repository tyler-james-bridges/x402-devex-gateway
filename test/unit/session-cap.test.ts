import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";
import { resetSpendStoreForTests } from "../../src/spend/store";

// Each test sets its own env and resets the store afterward.

test("session cap: requests accumulate spend and succeed within cap", async () => {
  process.env.WALLET_POLICY_SESSION_CAP_USD = "0.05";
  resetSpendStoreForTests();

  const r1 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-accum-${Date.now()}-1`)
    .set("X-Paid", "true")
    .send({ task: "a" });

  assert.equal(r1.status, 200);

  const r2 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-accum-${Date.now()}-2`)
    .set("X-Paid", "true")
    .send({ task: "b" });

  assert.equal(r2.status, 200);

  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();
});

test("session cap: request denied when spend would exceed cap", async () => {
  // Price is $0.01 by default; set cap to $0.015 so first succeeds, second is denied.
  process.env.WALLET_POLICY_SESSION_CAP_USD = "0.015";
  resetSpendStoreForTests();

  const r1 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-exceed-${Date.now()}-1`)
    .set("X-Paid", "true")
    .send({ task: "first" });

  assert.equal(r1.status, 200);

  const r2 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-exceed-${Date.now()}-2`)
    .set("X-Paid", "true")
    .send({ task: "second" });

  assert.equal(r2.status, 403);
  assert.equal(r2.body?.error?.code, "SESSION_CAP_EXCEEDED");
  assert.ok(r2.body?.error?.x402?.sessionCapUsd);
  assert.ok(r2.body?.error?.x402?.sessionSpentUsd);

  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();
});

test("session cap: idempotent replay does not double-count spend", async () => {
  // Cap allows exactly one request ($0.01 price, $0.015 cap).
  process.env.WALLET_POLICY_SESSION_CAP_USD = "0.015";
  resetSpendStoreForTests();

  const key = `sc-idem-${Date.now()}`;
  const payload = { task: "idempotent-replay" };

  // First request succeeds and records spend.
  const r1 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .set("X-Paid", "true")
    .send(payload);

  assert.equal(r1.status, 200);

  // Replay with same key + payload: returned from idempotency store,
  // handler never runs, spend not counted again.
  const r2 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", key)
    .send(payload);

  assert.equal(r2.status, 200);
  assert.equal(r2.headers["idempotency-replayed"], "true");

  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();
});

test("session cap: per-request cap still enforced alongside session cap", async () => {
  // Per-request cap is lower than price → per-request check blocks first.
  process.env.WALLET_POLICY_PER_REQUEST_CAP_USD = "0.005";
  process.env.WALLET_POLICY_SESSION_CAP_USD = "5.00";
  resetSpendStoreForTests();

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-perreq-${Date.now()}`)
    .set("X-Paid", "true")
    .send({ task: "blocked-by-per-request" });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, "POLICY_CAP_EXCEEDED");

  delete process.env.WALLET_POLICY_PER_REQUEST_CAP_USD;
  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();
});

test("session cap: exact cap boundary is allowed", async () => {
  // Price is $0.01; cap is exactly $0.01 → first request should succeed.
  process.env.WALLET_POLICY_SESSION_CAP_USD = "0.01";
  resetSpendStoreForTests();

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-boundary-${Date.now()}`)
    .set("X-Paid", "true")
    .send({ task: "boundary" });

  assert.equal(res.status, 200);

  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();
});

test("session cap: no session cap configured allows unlimited requests", async () => {
  delete process.env.WALLET_POLICY_SESSION_CAP_USD;
  resetSpendStoreForTests();

  const r1 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-nocap-${Date.now()}-1`)
    .set("X-Paid", "true")
    .send({ task: "unlimited-a" });

  const r2 = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `sc-nocap-${Date.now()}-2`)
    .set("X-Paid", "true")
    .send({ task: "unlimited-b" });

  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);

  resetSpendStoreForTests();
});
