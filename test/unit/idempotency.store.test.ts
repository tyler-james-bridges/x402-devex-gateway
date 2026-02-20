import assert from "node:assert/strict";
import test from "node:test";
import {
  getIdempotencyStore,
  resetIdempotencyStoreForTests,
  sqliteBackendAvailable
} from "../../src/idempotency/store";

test("sqlite idempotency store persists and reads records", { skip: !sqliteBackendAvailable() }, () => {
  process.env.IDEMPOTENCY_STORE = "sqlite";
  process.env.IDEMPOTENCY_SQLITE_PATH = ":memory:";
  resetIdempotencyStoreForTests();

  const store = getIdempotencyStore();
  store.set({
    key: "store-key-001",
    requestHash: "abc123",
    statusCode: 200,
    responseBody: { ok: true },
    createdAt: "2026-01-01T00:00:00.000Z"
  });

  const record = store.get("store-key-001");
  assert.ok(record);
  assert.equal(record.requestHash, "abc123");
  assert.deepEqual(record.responseBody, { ok: true });

  delete process.env.IDEMPOTENCY_STORE;
  delete process.env.IDEMPOTENCY_SQLITE_PATH;
  resetIdempotencyStoreForTests();
});
