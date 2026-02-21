import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/server";

test("sets X-Request-Id header when missing", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.ok(res.headers["x-request-id"]);
});

test("honors client-provided X-Request-Id", async () => {
  const res = await request(app).get("/health").set("X-Request-Id", "req-demo-123");
  assert.equal(res.status, 200);
  assert.equal(res.headers["x-request-id"], "req-demo-123");
});
