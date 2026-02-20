export type PaymentVerifierMode = "stub" | "strict";

export type VerifyPaymentInput = {
  paymentHeader?: string;
  legacyPaidHeader?: string;
  requiredAmountUsd: number;
};

export type PaymentVerificationResult =
  | { ok: true; proof: string; amountUsd: number }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "malformed"; message: string }
  | { ok: false; reason: "underpaid"; amountUsd: number; requiredAmountUsd: number };

export interface PaymentVerifier {
  verify(input: VerifyPaymentInput): PaymentVerificationResult;
}

class StubPaymentVerifier implements PaymentVerifier {
  verify(input: VerifyPaymentInput): PaymentVerificationResult {
    if (input.paymentHeader && input.paymentHeader.trim() !== "") {
      return { ok: true, proof: input.paymentHeader.trim(), amountUsd: input.requiredAmountUsd };
    }

    if (input.legacyPaidHeader === "true") {
      return { ok: true, proof: "legacy-x-paid:true", amountUsd: input.requiredAmountUsd };
    }

    return { ok: false, reason: "missing" };
  }
}

class StrictPaymentVerifier implements PaymentVerifier {
  verify(input: VerifyPaymentInput): PaymentVerificationResult {
    if (!input.paymentHeader || input.paymentHeader.trim() === "") {
      return { ok: false, reason: "missing" };
    }

    const proof = input.paymentHeader.trim();
    const match = /^v1:(\d+(?:\.\d{1,6})?):([A-Za-z0-9_-]{6,})$/.exec(proof);

    if (!match) {
      return {
        ok: false,
        reason: "malformed",
        message:
          "Malformed payment proof. Expected format: X-Payment: v1:<amount-usd>:<proof-id>"
      };
    }

    const amountUsd = Number(match[1]);
    if (!Number.isFinite(amountUsd)) {
      return {
        ok: false,
        reason: "malformed",
        message:
          "Malformed payment proof. Expected format: X-Payment: v1:<amount-usd>:<proof-id>"
      };
    }

    if (amountUsd < input.requiredAmountUsd) {
      return {
        ok: false,
        reason: "underpaid",
        amountUsd,
        requiredAmountUsd: input.requiredAmountUsd
      };
    }

    return { ok: true, proof, amountUsd };
  }
}

export function getPaymentVerifierMode(rawMode = process.env.PAYMENT_VERIFIER_MODE): PaymentVerifierMode {
  return rawMode === "strict" ? "strict" : "stub";
}

export function createPaymentVerifier(mode = getPaymentVerifierMode()): PaymentVerifier {
  return mode === "strict" ? new StrictPaymentVerifier() : new StubPaymentVerifier();
}
