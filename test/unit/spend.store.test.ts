import assert from "node:assert/strict";
import test from "node:test";
import {
  getSpendStore,
  resetSpendStoreForTests,
  sqliteSpendBackendAvailable
} from "../../src/spend/store";

test("memory spend store: trySpend allows within cap", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  const result = store.trySpend("p1", 0.01, 1.0);

  assert.equal(result.allowed, true);
  assert.equal(result.previousTotal, 0);
  assert.equal(result.newTotal, 0.01);
  assert.equal(result.capUsd, 1.0);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("memory spend store: trySpend denies over cap", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  store.trySpend("p1", 0.9, 1.0);
  const result = store.trySpend("p1", 0.2, 1.0);

  assert.equal(result.allowed, false);
  assert.equal(result.previousTotal, 0.9);
  assert.equal(result.capUsd, 1.0);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("memory spend store: trySpend accumulates across requests", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  store.trySpend("p1", 0.01, 1.0);
  store.trySpend("p1", 0.02, 1.0);
  const result = store.trySpend("p1", 0.03, 1.0);

  assert.equal(result.allowed, true);
  assert.equal(result.newTotal, 0.06);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("memory spend store: totalSpend returns accumulated value", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  assert.equal(store.totalSpend("p1"), 0);

  store.trySpend("p1", 0.25, 1.0);
  assert.equal(store.totalSpend("p1"), 0.25);

  store.trySpend("p1", 0.25, 1.0);
  assert.equal(store.totalSpend("p1"), 0.50);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("memory spend store: denied trySpend does not alter total", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  store.trySpend("p1", 0.9, 1.0);
  store.trySpend("p1", 0.2, 1.0); // denied

  assert.equal(store.totalSpend("p1"), 0.9);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("memory spend store: separate policies tracked independently", () => {
  process.env.SPEND_STORE = "memory";
  resetSpendStoreForTests();

  const store = getSpendStore();
  store.trySpend("alpha", 0.50, 1.0);
  store.trySpend("beta", 0.25, 1.0);

  assert.equal(store.totalSpend("alpha"), 0.50);
  assert.equal(store.totalSpend("beta"), 0.25);

  delete process.env.SPEND_STORE;
  resetSpendStoreForTests();
});

test("sqlite spend store: trySpend persists and reads", { skip: !sqliteSpendBackendAvailable() }, () => {
  process.env.SPEND_STORE = "sqlite";
  process.env.SPEND_STORE_SQLITE_PATH = ":memory:";
  resetSpendStoreForTests();

  const store = getSpendStore();

  const r1 = store.trySpend("p1", 0.25, 5.0);
  assert.equal(r1.allowed, true);
  assert.equal(r1.newTotal, 0.25);

  const r2 = store.trySpend("p1", 0.25, 5.0);
  assert.equal(r2.allowed, true);
  assert.equal(r2.previousTotal, 0.25);
  assert.equal(r2.newTotal, 0.50);

  assert.equal(store.totalSpend("p1"), 0.50);

  delete process.env.SPEND_STORE;
  delete process.env.SPEND_STORE_SQLITE_PATH;
  resetSpendStoreForTests();
});

test("sqlite spend store: trySpend denies over cap", { skip: !sqliteSpendBackendAvailable() }, () => {
  process.env.SPEND_STORE = "sqlite";
  process.env.SPEND_STORE_SQLITE_PATH = ":memory:";
  resetSpendStoreForTests();

  const store = getSpendStore();
  store.trySpend("p1", 4.90, 5.0);
  const result = store.trySpend("p1", 0.20, 5.0);

  assert.equal(result.allowed, false);
  assert.equal(result.previousTotal, 4.90);
  assert.equal(store.totalSpend("p1"), 4.90);

  delete process.env.SPEND_STORE;
  delete process.env.SPEND_STORE_SQLITE_PATH;
  resetSpendStoreForTests();
});
