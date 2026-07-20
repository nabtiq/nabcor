// Build and digest the immutable live-provider-call-request (DEC-0020).
//
// This is the preparation step the operator runs BEFORE the Product Owner
// signs: it assembles the complete one-shot request from the trusted active
// provider policy and the synthetic fixture, binds the exact candidate and
// gateway-policy digests, and computes the self-consistent request_digest. The
// resulting artifact is what gets persisted to the operational store and signed
// under the live-provider-call-approval gate — the operator supplies no free
// values that could widen the authorization.
import { contentDigest } from "../kernel/canonical-json.js";
import type { ProviderPolicy } from "../gateway/adapters/provider-policy.js";

export interface SyntheticFixtureRef {
  fixtureId: string;
  contentDigest: string;
}

export interface BuildLiveCallRequestInput {
  artifactId: string;
  workspace: string;
  brandRef: string;
  createdAt: string;
  policy: ProviderPolicy;
  fixtures: readonly SyntheticFixtureRef[];
  expectedOutputContract: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  validFrom: string;
  validUntil: string;
  purpose: string;
}

/**
 * Assemble the immutable request with every ratified/disabled value fixed and
 * the digest binding to the exact active candidate and gateway policy. The
 * request_digest is recomputed by the contract semantic layer, so an operator
 * cannot hand-edit any bound value without breaking validation.
 */
export function buildLiveCallRequest(input: BuildLiveCallRequestInput): Record<string, unknown> {
  const fixtures = [...input.fixtures]
    .map((f) => ({ fixture_id: f.fixtureId, content_digest: f.contentDigest }))
    .sort((a, b) => (a.fixture_id < b.fixture_id ? -1 : a.fixture_id > b.fixture_id ? 1 : 0));

  const request: Record<string, unknown> = {
    schema_version: "1.10.0",
    artifact_id: input.artifactId,
    workspace: input.workspace,
    brand_ref: input.brandRef,
    created_at: input.createdAt,
    provider: "anthropic",
    model_id: "claude-haiku-4-5-20251001",
    provider_policy_candidate_ref: String(input.policy.candidate["artifact_id"]),
    provider_policy_candidate_digest: input.policy.candidateContentDigest,
    gateway_policy_id: String(input.policy.gatewayPolicy["policy_id"]),
    gateway_policy_digest: contentDigest(input.policy.gatewayPolicy),
    data_classification: "synthetic",
    synthetic_fixture_refs: fixtures,
    expected_output_contract: input.expectedOutputContract,
    max_input_tokens: input.maxInputTokens,
    max_output_tokens: input.maxOutputTokens,
    max_usd: 0.25,
    max_attempts: 1,
    retry_enabled: false,
    max_escalations: 0,
    // Endpoint and version come from the signed candidate, never a re-hardcoded
    // literal — no provider-reachable URL literal exists outside the transport.
    api_endpoint: String(input.policy.candidate["api_endpoint"]),
    anthropic_api_version: input.policy.apiVersion,
    caching_enabled: false,
    batch_enabled: false,
    tools_enabled: false,
    provider_storage_enabled: false,
    provider_memory_enabled: false,
    files_api_enabled: false,
    fallback_providers_enabled: false,
    automatic_escalation_enabled: false,
    streaming_enabled: false,
    exp_0001_authorized: false,
    valid_from: input.validFrom,
    valid_until: input.validUntil,
    purpose: input.purpose,
    decision_refs: ["DEC-0018", "DEC-0019", "DEC-0020"],
  };
  request["request_digest"] = requestDigestOf(request);
  return request;
}

/** sha256 over the canonical JSON of the request WITHOUT the request_digest field. */
export function requestDigestOf(request: Record<string, unknown>): string {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(request)) {
    if (k !== "request_digest") rest[k] = v;
  }
  return contentDigest(rest);
}

/**
 * Derive the bare JSON Schema to send in output_config.format from a registered
 * NABCor output contract, stripping the meta fields ($id, $schema, title,
 * description, examples) that the provider's constrained-decoding surface does
 * not expect.
 */
export function providerOutputSchema(contractSchema: Record<string, unknown>): Record<string, unknown> {
  const strip = new Set(["$id", "$schema", "title", "description", "examples"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(contractSchema)) {
    if (!strip.has(k)) out[k] = v;
  }
  return out;
}
