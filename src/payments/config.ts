/**
 * Config-driven typed model for the payment gateway.
 *
 * All environment-driven payment configuration is loaded once at startup
 * and passed through the middleware stack via typed objects — no scattered
 * process.env reads at request time.
 */

import { PaymentProviderName } from "./provider";

/** Full gateway configuration loaded from environment at startup. */
export interface GatewayConfig {
  /** Provider to use for proof verification. */
  provider: PaymentProviderName;

  /** Resource identifier returned in 402 responses. */
  resourceId: string;

  /** Required USD amount per request. */
  priceUsd: number;

  /** Receiver address (wallet/contract) for payments. */
  receiver: string;

  /** Force parse() to reject with reason "invalid" (testing). */
  simulateInvalid: boolean;

  /** Force checkSettlement() to return unsettled (testing). */
  simulateUnsettled: boolean;
}

function toFiniteNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toProviderName(raw: string | undefined): PaymentProviderName {
  if (raw === "strict-format" || raw === "strict" || raw === "stub") return raw;
  return "stub";
}

/**
 * Load gateway configuration from environment variables.
 * Call once at startup and pass the resulting object through the stack.
 */
export function loadGatewayConfig(
  env: Record<string, string | undefined> = process.env
): GatewayConfig {
  return {
    provider: toProviderName(env.PAYMENT_PROVIDER ?? env.PAYMENT_VERIFIER_MODE),
    resourceId: env.X402_RESOURCE_ID ?? "agent-task",
    priceUsd: toFiniteNumber(env.X402_PRICE_USD, 0.01),
    receiver: env.X402_RECEIVER ?? "demo-receiver-address",
    simulateInvalid: env.PAYMENT_SIMULATE_INVALID === "true",
    simulateUnsettled: env.PAYMENT_SIMULATE_UNSETTLED === "true",
  };
}
