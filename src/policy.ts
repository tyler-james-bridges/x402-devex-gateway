export interface WalletPolicyConfig {
  policyId: string;
  perRequestCapUsd: number | null;
  sessionCapUsd: number | null;
  allowedTokens: string[];
  allowedContracts: string[];
}

export interface PolicyCheckInput {
  amountUsd: number;
  token?: string;
  contract?: string;
}

export interface PolicyDenyResult {
  ok: false;
  code: "POLICY_CAP_EXCEEDED";
  message: string;
  details: Record<string, unknown>;
}

export interface PolicyAllowResult {
  ok: true;
}

export type PolicyCheckResult = PolicyAllowResult | PolicyDenyResult;

function parseOptionalNumber(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw || raw.trim() === "") {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function loadWalletPolicyConfig(
  env: Record<string, string | undefined> = process.env
): WalletPolicyConfig {
  return {
    policyId: env.WALLET_POLICY_ID ?? "default",
    perRequestCapUsd: parseOptionalNumber(env.WALLET_POLICY_PER_REQUEST_CAP_USD),
    // Placeholder for future aggregate spend accounting.
    sessionCapUsd: parseOptionalNumber(env.WALLET_POLICY_SESSION_CAP_USD),
    allowedTokens: parseCsv(env.WALLET_POLICY_ALLOWED_TOKENS),
    allowedContracts: parseCsv(env.WALLET_POLICY_ALLOWED_CONTRACTS)
  };
}

function normalize(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

export function evaluateWalletPolicy(
  input: PolicyCheckInput,
  config: WalletPolicyConfig
): PolicyCheckResult {
  if (config.perRequestCapUsd !== null && input.amountUsd > config.perRequestCapUsd) {
    return {
      ok: false,
      code: "POLICY_CAP_EXCEEDED",
      message: "Request amount exceeds wallet policy per-request cap.",
      details: {
        policyId: config.policyId,
        policyMax: String(config.perRequestCapUsd),
        requiredAmount: String(input.amountUsd),
        currency: "USD"
      }
    };
  }

  // Session cap enforcement is handled by the spend store in the request handler
  // (see server.ts) after policy evaluation passes.

  const token = normalize(input.token);
  if (config.allowedTokens.length > 0 && token && !config.allowedTokens.includes(token)) {
    return {
      ok: false,
      code: "POLICY_CAP_EXCEEDED",
      message: "Requested token is not allowed by wallet policy.",
      details: {
        policyId: config.policyId,
        allowedTokens: config.allowedTokens,
        requestedToken: token
      }
    };
  }

  const contract = normalize(input.contract);
  if (
    config.allowedContracts.length > 0 &&
    contract &&
    !config.allowedContracts.includes(contract)
  ) {
    return {
      ok: false,
      code: "POLICY_CAP_EXCEEDED",
      message: "Requested contract is not allowed by wallet policy.",
      details: {
        policyId: config.policyId,
        allowedContracts: config.allowedContracts,
        requestedContract: contract
      }
    };
  }

  return { ok: true };
}
