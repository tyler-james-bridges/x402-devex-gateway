import assert from "node:assert/strict";
import test from "node:test";
import { loadGatewayConfig } from "../../src/payments/config";

test("config: loads defaults when env is empty", () => {
  const config = loadGatewayConfig({});
  assert.equal(config.provider, "stub");
  assert.equal(config.resourceId, "agent-task");
  assert.equal(config.priceUsd, 0.01);
  assert.equal(config.receiver, "demo-receiver-address");
  assert.equal(config.simulateInvalid, false);
  assert.equal(config.simulateUnsettled, false);
});

test("config: respects PAYMENT_PROVIDER over PAYMENT_VERIFIER_MODE", () => {
  const config = loadGatewayConfig({
    PAYMENT_PROVIDER: "strict-format",
    PAYMENT_VERIFIER_MODE: "stub"
  });
  assert.equal(config.provider, "strict-format");
});

test("config: falls back to PAYMENT_VERIFIER_MODE when PAYMENT_PROVIDER is unset", () => {
  const config = loadGatewayConfig({
    PAYMENT_VERIFIER_MODE: "strict"
  });
  assert.equal(config.provider, "strict");
});

test("config: parses numeric X402_PRICE_USD", () => {
  const config = loadGatewayConfig({ X402_PRICE_USD: "0.05" });
  assert.equal(config.priceUsd, 0.05);
});

test("config: falls back to 0.01 for non-numeric X402_PRICE_USD", () => {
  const config = loadGatewayConfig({ X402_PRICE_USD: "not-a-number" });
  assert.equal(config.priceUsd, 0.01);
});

test("config: parses simulation flags", () => {
  const config = loadGatewayConfig({
    PAYMENT_SIMULATE_INVALID: "true",
    PAYMENT_SIMULATE_UNSETTLED: "true"
  });
  assert.equal(config.simulateInvalid, true);
  assert.equal(config.simulateUnsettled, true);
});

test("config: simulation flags default to false for any non-true value", () => {
  const config = loadGatewayConfig({
    PAYMENT_SIMULATE_INVALID: "false",
    PAYMENT_SIMULATE_UNSETTLED: "yes"
  });
  assert.equal(config.simulateInvalid, false);
  assert.equal(config.simulateUnsettled, false);
});

test("config: unknown provider name falls back to stub", () => {
  const config = loadGatewayConfig({ PAYMENT_PROVIDER: "unknown" });
  assert.equal(config.provider, "stub");
});

test("config: reads resourceId and receiver from env", () => {
  const config = loadGatewayConfig({
    X402_RESOURCE_ID: "my-resource",
    X402_RECEIVER: "0xabc"
  });
  assert.equal(config.resourceId, "my-resource");
  assert.equal(config.receiver, "0xabc");
});
