import assert from "node:assert/strict";
import test from "node:test";
import { resolvePaymentState } from "../../src/payments/states";
import {
  StubPaymentProvider,
  StrictFormatPaymentProvider
} from "../../src/payments/provider";

// ── resolvePaymentState with StubPaymentProvider ─────────────

test("states: no proof → required", () => {
  const provider = new StubPaymentProvider();
  const state = resolvePaymentState(undefined, 0.01, provider);
  assert.equal(state.state, "required");
});

test("states: empty string proof → required (falsy before reaching provider)", () => {
  const provider = new StubPaymentProvider();
  // Empty string is falsy — resolvePaymentState returns "required" before
  // the proof reaches the provider's parse().
  const state = resolvePaymentState("", 0.01, provider);
  assert.equal(state.state, "required");
});

test("states: valid stub proof → settled", () => {
  const provider = new StubPaymentProvider();
  const state = resolvePaymentState("any-payment", 0.01, provider);
  assert.equal(state.state, "settled");
  if (state.state === "settled") {
    assert.equal(state.proof.proofId, "stub");
    assert.equal(state.settlement.settled, true);
  }
});

// ── resolvePaymentState with StrictFormatPaymentProvider ─────

test("states: malformed strict proof → malformed", () => {
  const provider = new StrictFormatPaymentProvider();
  const state = resolvePaymentState("garbage", 0.01, provider);
  assert.equal(state.state, "malformed");
  if (state.state === "malformed") {
    assert.match(state.message, /Malformed/i);
  }
});

test("states: valid strict proof with sufficient amount → settled", () => {
  const provider = new StrictFormatPaymentProvider();
  const state = resolvePaymentState("v1:0.01:proof123", 0.01, provider);
  assert.equal(state.state, "settled");
  if (state.state === "settled") {
    assert.equal(state.proof.amountUsd, 0.01);
    assert.equal(state.proof.proofId, "proof123");
    assert.equal(state.settlement.txHash, "0xproof123");
  }
});

test("states: underpaid strict proof → underpaid", () => {
  const provider = new StrictFormatPaymentProvider();
  const state = resolvePaymentState("v1:0.001:proof123", 0.01, provider);
  assert.equal(state.state, "underpaid");
  if (state.state === "underpaid") {
    assert.equal(state.proof.amountUsd, 0.001);
    assert.equal(state.requiredUsd, 0.01);
  }
});

test("states: simulateInvalid → invalid", () => {
  const provider = new StrictFormatPaymentProvider({ simulateInvalid: true });
  const state = resolvePaymentState("v1:0.01:proof123", 0.01, provider);
  assert.equal(state.state, "invalid");
  if (state.state === "invalid") {
    assert.match(state.message, /rejected by provider/i);
  }
});

test("states: simulateUnsettled → unsettled", () => {
  const provider = new StrictFormatPaymentProvider({ simulateUnsettled: true });
  const state = resolvePaymentState("v1:0.01:proof123", 0.01, provider);
  assert.equal(state.state, "unsettled");
  if (state.state === "unsettled") {
    assert.equal(state.retryable, true);
    assert.match(state.reason, /pending/i);
  }
});

test("states: overpaid strict proof still settles", () => {
  const provider = new StrictFormatPaymentProvider();
  const state = resolvePaymentState("v1:1.00:proof123", 0.01, provider);
  assert.equal(state.state, "settled");
  if (state.state === "settled") {
    assert.equal(state.proof.amountUsd, 1.0);
  }
});

test("states: exactly required amount settles", () => {
  const provider = new StrictFormatPaymentProvider();
  const state = resolvePaymentState("v1:0.05:proof123", 0.05, provider);
  assert.equal(state.state, "settled");
});
