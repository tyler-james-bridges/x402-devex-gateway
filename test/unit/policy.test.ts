import assert from "node:assert/strict";
import test from "node:test";
import { evaluateWalletPolicy, loadWalletPolicyConfig } from "../../src/policy";

test("policy allows request under per-request cap", () => {
  const config = loadWalletPolicyConfig({
    WALLET_POLICY_PER_REQUEST_CAP_USD: "0.05"
  });

  const result = evaluateWalletPolicy({ amountUsd: 0.01 }, config);
  assert.deepEqual(result, { ok: true });
});

test("policy denies request over per-request cap", () => {
  const config = loadWalletPolicyConfig({
    WALLET_POLICY_ID: "default",
    WALLET_POLICY_PER_REQUEST_CAP_USD: "0.005"
  });

  const result = evaluateWalletPolicy({ amountUsd: 0.01 }, config);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "POLICY_CAP_EXCEEDED");
    assert.equal(result.details.policyId, "default");
  }
});

test("policy denies token not on allowlist", () => {
  const config = loadWalletPolicyConfig({
    WALLET_POLICY_ALLOWED_TOKENS: "usdc"
  });

  const result = evaluateWalletPolicy(
    { amountUsd: 0.01, token: "dai" },
    config
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "POLICY_CAP_EXCEEDED");
    assert.equal(result.details.requestedToken, "dai");
  }
});

test("policy allows token and contract when allowlisted", () => {
  const config = loadWalletPolicyConfig({
    WALLET_POLICY_ALLOWED_TOKENS: "usdc,usdt",
    WALLET_POLICY_ALLOWED_CONTRACTS: "0xabc"
  });

  const result = evaluateWalletPolicy(
    { amountUsd: 0.01, token: "USDC", contract: "0xAbC" },
    config
  );

  assert.deepEqual(result, { ok: true });
});
