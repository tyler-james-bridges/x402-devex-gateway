/**
 * Payment provider adapter boundary.
 *
 * Each provider encapsulates the specifics of a verification backend
 * (stub, strict-format parse, or future onchain RPC). The gateway
 * never reaches past this interface — all blockchain/settlement
 * details stay behind it.
 */

/** Parsed proof returned by a provider when the proof is structurally valid. */
export interface ParsedPaymentProof {
  /** Raw proof string as received. */
  raw: string;
  /** USD amount encoded in the proof. */
  amountUsd: number;
  /** Proof identifier (tx hash, stub id, etc.). */
  proofId: string;
  /** Network the proof targets (e.g. "base-sepolia", "base-mainnet"). */
  network: string;
}

/** Settlement status returned by a provider's settlement check. */
export type SettlementStatus =
  | { settled: true; txHash: string; confirmedAt: string }
  | { settled: false; reason: string; retryable: boolean };

/**
 * Provider adapter interface. Implementations live behind this
 * boundary — the gateway only calls parse() and optionally
 * checkSettlement().
 */
export interface PaymentProvider {
  /** Unique identifier for this provider (used in config and logs). */
  readonly name: string;

  /**
   * Parse and validate a raw payment proof string.
   * Returns a ParsedPaymentProof on success, or a failure reason.
   */
  parse(raw: string): PaymentProviderParseResult;

  /**
   * Check whether a parsed proof has settled on-chain.
   * Returns a SettlementStatus. Providers that don't support
   * settlement checks (e.g. stub) should return settled: true.
   */
  checkSettlement(proof: ParsedPaymentProof): SettlementStatus;
}

export type PaymentProviderParseResult =
  | { ok: true; proof: ParsedPaymentProof }
  | { ok: false; reason: "malformed"; message: string }
  | { ok: false; reason: "invalid"; message: string };

// ── Stub provider ──────────────────────────────────────────────

export class StubPaymentProvider implements PaymentProvider {
  readonly name = "stub";

  parse(raw: string): PaymentProviderParseResult {
    if (!raw || raw.trim() === "") {
      return { ok: false, reason: "malformed", message: "Empty payment proof." };
    }

    return {
      ok: true,
      proof: {
        raw: raw.trim(),
        amountUsd: Infinity, // stub always meets any amount
        proofId: "stub",
        network: "stub"
      }
    };
  }

  checkSettlement(): SettlementStatus {
    return { settled: true, txHash: "0xstub", confirmedAt: new Date().toISOString() };
  }
}

// ── Strict-format provider ─────────────────────────────────────

const PROOF_RE = /^v1:(\d+(?:\.\d{1,6})?):([A-Za-z0-9_-]{6,})$/;

export class StrictFormatPaymentProvider implements PaymentProvider {
  readonly name = "strict-format";

  private readonly simulateInvalid: boolean;
  private readonly simulateUnsettled: boolean;

  constructor(opts: { simulateInvalid?: boolean; simulateUnsettled?: boolean } = {}) {
    this.simulateInvalid = opts.simulateInvalid ?? false;
    this.simulateUnsettled = opts.simulateUnsettled ?? false;
  }

  parse(raw: string): PaymentProviderParseResult {
    if (!raw || raw.trim() === "") {
      return { ok: false, reason: "malformed", message: "Empty payment proof." };
    }

    const proof = raw.trim();
    const match = PROOF_RE.exec(proof);

    if (!match) {
      return {
        ok: false,
        reason: "malformed",
        message: "Malformed payment proof. Expected format: X-Payment: v1:<amount-usd>:<proof-id>"
      };
    }

    const amountUsd = Number(match[1]);
    if (!Number.isFinite(amountUsd)) {
      return {
        ok: false,
        reason: "malformed",
        message: "Malformed payment proof. Expected format: X-Payment: v1:<amount-usd>:<proof-id>"
      };
    }

    if (this.simulateInvalid) {
      return {
        ok: false,
        reason: "invalid",
        message: "Payment proof rejected by provider: signature verification failed."
      };
    }

    return {
      ok: true,
      proof: {
        raw: proof,
        amountUsd,
        proofId: match[2],
        network: "base-sepolia"
      }
    };
  }

  checkSettlement(proof: ParsedPaymentProof): SettlementStatus {
    if (this.simulateUnsettled) {
      return {
        settled: false,
        reason: "Transaction pending confirmation.",
        retryable: true
      };
    }

    return {
      settled: true,
      txHash: `0x${proof.proofId}`,
      confirmedAt: new Date().toISOString()
    };
  }
}

// ── Factory ────────────────────────────────────────────────────

/** Accepted provider names. "strict" is a legacy alias for "strict-format". */
export type PaymentProviderName = "stub" | "strict-format" | "strict";

export function createPaymentProvider(
  name: PaymentProviderName,
  opts: { simulateInvalid?: boolean; simulateUnsettled?: boolean } = {}
): PaymentProvider {
  switch (name) {
    case "strict-format":
    case "strict":
      return new StrictFormatPaymentProvider(opts);
    case "stub":
    default:
      return new StubPaymentProvider();
  }
}
