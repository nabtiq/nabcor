// Trusted provider-policy boundary (DEC-0019; threat model T03/T09).
//
// The Anthropic adapter trusts ONLY the committed, contract-validated trio
// loaded through this fixed boundary: the active gateway policy, the signed
// provider-policy candidate, and the provider operational state. Every load
// is schema- and semantics-validated, and the cross-document digest binding
// is verified: the gateway policy and the operational state must both embed
// the candidate's exact canonical content digest (the digest the Product
// Owner approval evidence signs). Any drift — an edited ceiling, a swapped
// model list, a substituted candidate — breaks the binding and the adapter
// refuses to construct. No environment variable, caller argument, or request
// field can select alternative documents.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contentDigest } from "../../kernel/canonical-json.js";
import type { ContractRegistry } from "../../kernel/contract-registry.js";
import { type Result, describeFailure, err, ok } from "../../kernel/result.js";

export interface AllowedModel {
  modelId: string;
  tier: number;
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
}

export interface ProviderPolicy {
  candidate: Record<string, unknown>;
  candidateContentDigest: string;
  gatewayPolicy: Record<string, unknown>;
  operationalState: Record<string, unknown>;
  allowedModels: readonly AllowedModel[];
  allowedDataClasses: ReadonlySet<string>;
  pricingVersion: string;
  apiVersion: string;
  keychainService: string;
  keychainAccount: string;
  maxUsdPerRequestCents: number;
  maxUsdPerRunCents: number;
  maxUsdPerDayCents: number;
  maxUsdPerMonthCents: number;
  maxInputTokensPerRequest: number;
  maxOutputTokensPerRequest: number;
  maxAttemptsPerRequest: number;
  liveInvocationEnabled: boolean;
}

function loadJson(path: string, label: string): Result<unknown> {
  try {
    return ok(JSON.parse(readFileSync(path, "utf8")));
  } catch (e) {
    return err({
      kind: "provider-policy-invalid",
      message: `${label} unreadable at '${path}': ${String(e)}`,
    });
  }
}

/**
 * Load and cross-verify the committed provider-policy trio from the contracts
 * directory. Returns a typed failure (never a partial policy) on any invalid
 * document, broken digest binding, or a candidate outside its signed validity
 * window (the window is load-bearing — the schema pins it to Haiku 4.5's
 * retirement floor, and running past it requires a re-ratified candidate).
 * The clock is injected so the window check is deterministic under test.
 */
export function loadProviderPolicy(
  contractsDir: string,
  registry: ContractRegistry,
  clock: () => string = () => new Date().toISOString()
): Result<ProviderPolicy> {
  const candidateRaw = loadJson(join(contractsDir, "provider-policy-candidate.active.json"), "provider-policy candidate");
  if (!candidateRaw.ok) return candidateRaw as Result<ProviderPolicy>;
  const gatewayRaw = loadJson(join(contractsDir, "gateway-policy.active.json"), "active gateway policy");
  if (!gatewayRaw.ok) return gatewayRaw as Result<ProviderPolicy>;
  const stateRaw = loadJson(join(contractsDir, "provider-operational-state.active.json"), "provider operational state");
  if (!stateRaw.ok) return stateRaw as Result<ProviderPolicy>;

  const candidate = registry.validate("provider-policy-candidate", candidateRaw.value);
  if (!candidate.ok) {
    return err({
      kind: "provider-policy-invalid",
      message: `provider-policy candidate failed contract validation: ${describeFailure(candidate.error)}`,
    });
  }
  const gatewayPolicy = registry.validate("gateway-policy", gatewayRaw.value);
  if (!gatewayPolicy.ok) {
    return err({
      kind: "provider-policy-invalid",
      message: `active gateway policy failed contract validation: ${describeFailure(gatewayPolicy.error)}`,
    });
  }
  const operationalState = registry.validate("provider-operational-state", stateRaw.value);
  if (!operationalState.ok) {
    return err({
      kind: "provider-policy-invalid",
      message: `provider operational state failed contract validation: ${describeFailure(operationalState.error)}`,
    });
  }

  // The candidate's signed validity window is enforced fail-closed: a
  // candidate that has not yet begun, or has expired, cannot back a live call
  // even though its digest binding still verifies.
  const nowMs = Date.parse(clock());
  if (Number.isNaN(nowMs)) {
    return err({ kind: "provider-policy-invalid", message: "injected clock returned an unparseable date-time" });
  }
  const validFromMs = Date.parse(String(candidate.value["valid_from"]));
  const validUntilMs = Date.parse(String(candidate.value["valid_until"]));
  if (nowMs < validFromMs) {
    return err({
      kind: "provider-policy-invalid",
      message: `the signed provider-policy candidate is not yet valid (valid_from ${String(candidate.value["valid_from"])})`,
    });
  }
  if (nowMs >= validUntilMs) {
    return err({
      kind: "provider-policy-invalid",
      message: `the signed provider-policy candidate expired at ${String(candidate.value["valid_until"])}; a re-ratified candidate is required before any further provider work`,
    });
  }

  const digest = contentDigest(candidate.value);
  for (const [label, doc] of [
    ["active gateway policy", gatewayPolicy.value],
    ["provider operational state", operationalState.value],
  ] as const) {
    if (doc["provider_policy_candidate_digest"] !== digest) {
      return err({
        kind: "provider-policy-invalid",
        message: `${label} embeds candidate digest '${String(doc["provider_policy_candidate_digest"])}' but the committed candidate's canonical digest is '${digest}'; the signed-policy binding is broken and the adapter fails closed`,
      });
    }
    if (doc["provider_policy_candidate_ref"] !== candidate.value["artifact_id"]) {
      return err({
        kind: "provider-policy-invalid",
        message: `${label} references candidate '${String(doc["provider_policy_candidate_ref"])}' but the committed candidate is '${String(candidate.value["artifact_id"])}'`,
      });
    }
  }

  const allowedModels = (candidate.value["allowed_models"] as {
    model_id: string;
    tier: number;
    input_usd_per_mtok: number;
    output_usd_per_mtok: number;
  }[]).map((m) => ({
    modelId: m.model_id,
    tier: m.tier,
    inputUsdPerMtok: m.input_usd_per_mtok,
    outputUsdPerMtok: m.output_usd_per_mtok,
  }));

  return ok({
    candidate: candidate.value,
    candidateContentDigest: digest,
    gatewayPolicy: gatewayPolicy.value,
    operationalState: operationalState.value,
    allowedModels,
    allowedDataClasses: new Set(candidate.value["allowed_data_classes"] as string[]),
    pricingVersion: String(candidate.value["pricing_version"]),
    apiVersion: String(candidate.value["anthropic_api_version"]),
    keychainService: String(candidate.value["keychain_service"]),
    keychainAccount: String(candidate.value["keychain_account"]),
    maxUsdPerRequestCents: (candidate.value["max_usd_per_request"] as number) * 100,
    maxUsdPerRunCents: (candidate.value["max_usd_per_run"] as number) * 100,
    maxUsdPerDayCents: (candidate.value["max_usd_per_day"] as number) * 100,
    maxUsdPerMonthCents: (candidate.value["max_usd_per_month"] as number) * 100,
    maxInputTokensPerRequest: candidate.value["max_input_tokens_per_request"] as number,
    maxOutputTokensPerRequest: candidate.value["max_output_tokens_per_request"] as number,
    maxAttemptsPerRequest: candidate.value["max_attempts_per_request"] as number,
    liveInvocationEnabled: candidate.value["live_invocation_enabled"] === true &&
      operationalState.value["live_invocation_enabled"] === true,
  });
}
