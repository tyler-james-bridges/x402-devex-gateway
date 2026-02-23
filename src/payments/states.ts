/**
 * Payment verification lifecycle states.
 *
 * Every request entering the x402 middleware resolves to exactly one of
 * these states. The discriminated union makes exhaustive matching trivial
 * and keeps 402 response shapes deterministic.
 */

import { ParsedPaymentProof, SettlementStatus } from "./provider";

/** No payment proof attached to the request. */
export interface PaymentRequired {
  readonly state: "required";
}

/** Proof string is structurally malformed — provider could not parse it. */
export interface PaymentMalformed {
  readonly state: "malformed";
  readonly message: string;
}

/** Proof parsed but provider rejected it (e.g. signature check failed). */
export interface PaymentInvalid {
  readonly state: "invalid";
  readonly message: string;
}

/** Proof valid but amount is below the required price. */
export interface PaymentUnderpaid {
  readonly state: "underpaid";
  readonly proof: ParsedPaymentProof;
  readonly requiredUsd: number;
}

/** Proof valid and amount sufficient, but not yet settled on-chain. */
export interface PaymentUnsettled {
  readonly state: "unsettled";
  readonly proof: ParsedPaymentProof;
  readonly reason: string;
  readonly retryable: boolean;
}

/** Proof valid, amount sufficient, and settlement confirmed. */
export interface PaymentSettled {
  readonly state: "settled";
  readonly proof: ParsedPaymentProof;
  readonly settlement: SettlementStatus & { settled: true };
}

/**
 * Discriminated union of all payment verification outcomes.
 * The `state` field drives exhaustive matching in the middleware.
 */
export type PaymentState =
  | PaymentRequired
  | PaymentMalformed
  | PaymentInvalid
  | PaymentUnderpaid
  | PaymentUnsettled
  | PaymentSettled;

/**
 * Resolve a raw proof string through the provider adapter boundary
 * into a concrete PaymentState.
 *
 * This is a pure function — no side effects, no env reads. The
 * middleware calls this and then maps the result to an HTTP response.
 */
export function resolvePaymentState(
  rawProof: string | undefined,
  requiredUsd: number,
  provider: { parse(raw: string): import("./provider").PaymentProviderParseResult; checkSettlement(proof: ParsedPaymentProof): SettlementStatus }
): PaymentState {
  if (!rawProof) {
    return { state: "required" };
  }

  const parseResult = provider.parse(rawProof);

  if (!parseResult.ok) {
    if (parseResult.reason === "invalid") {
      return { state: "invalid", message: parseResult.message };
    }
    return { state: "malformed", message: parseResult.message };
  }

  const proof = parseResult.proof;

  if (proof.amountUsd < requiredUsd) {
    return { state: "underpaid", proof, requiredUsd };
  }

  const settlement = provider.checkSettlement(proof);

  if (!settlement.settled) {
    return {
      state: "unsettled",
      proof,
      reason: settlement.reason,
      retryable: settlement.retryable,
    };
  }

  return { state: "settled", proof, settlement };
}
