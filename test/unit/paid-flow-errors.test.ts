import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("paid flow returns POLICY_CAP_EXCEEDED when policy blocks request", async () => {
  process.env.WALLET_POLICY_PER_REQUEST_CAP_USD = "0.005";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "policy-deny-1")
    .set("X-Paid", "true")
    .send({ task: "hello" });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, "POLICY_CAP_EXCEEDED");

  delete process.env.WALLET_POLICY_PER_REQUEST_CAP_USD;
});

test("paid flow returns WALLET_FUNDING_FAILED when funding simulation is enabled", async () => {
  process.env.WALLET_FUNDING_SIMULATE_FAIL = "true";
  process.env.WALLET_FUNDING_PROVIDER = "x402-wallet";
  process.env.WALLET_FUNDING_REASON = "insufficient_funds";
  process.env.WALLET_FUNDING_RETRYABLE = "false";

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", "funding-fail-1")
    .set("X-Paid", "true")
    .send({ task: "hello" });

  assert.equal(res.status, 402);
  assert.equal(res.body?.error?.code, "WALLET_FUNDING_FAILED");
  assert.equal(res.body?.error?.x402?.provider, "x402-wallet");

  process.env.WALLET_FUNDING_SIMULATE_FAIL = "false";
  delete process.env.WALLET_FUNDING_PROVIDER;
  delete process.env.WALLET_FUNDING_REASON;
  delete process.env.WALLET_FUNDING_RETRYABLE;
});
