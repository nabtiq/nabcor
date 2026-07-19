// Gateway adapters (DEC-0009, DEC-0010, DEC-0019; INV-PROV-001). Two adapters
// exist: the deterministic Fake Adapter (test infrastructure — no provider
// SDK, no network path, no credentials, exact predeclared synthetic fixtures)
// and the Anthropic raw-HTTPS adapter (src/gateway/adapters/anthropic.ts —
// configured but live-disabled: every live gate fails closed in this phase).
// Adapter invocation may be asynchronous because a real network adapter is;
// the Fake Adapter stays synchronous and deterministic.
import { type Result, err, ok } from "../kernel/result.js";

export interface AdapterInvocation {
  scenarioId: string;
  outputContract: string;
  /** Requested capability tier; a provider adapter resolves its exact model from this. */
  requestedTier: number;
  /** Declared maximum output tokens (already checked against the token budget). */
  maxOutputTokens: number;
  /** Declared maximum fresh input tokens from the request's token budget (null when undeclared). */
  maxInputTokens: number | null;
  /** Data classification of every input; adapters re-check it fail-closed. */
  dataClassification: string;
  runId: string;
  requestId: string;
}

/**
 * Truthful provider accounting for one adapter invocation (INV-OBS-001,
 * DEC-0019). Carries identifiers, token counts, and USD values only — never
 * request or response bodies, headers, or credentials.
 */
export interface ProviderAccounting {
  provider: string;
  requestedModel: string;
  returnedModel: string | null;
  modelTier: number;
  providerRequestId: string | null;
  attempt: number;
  retryCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  cacheCreationTokens: number | null;
  reservedUsd: number;
  actualUsd: number | null;
  pricingVersion: string;
  budgetRemainingUsd: { run: number; day: number; month: number } | null;
  retentionStatus: "STANDARD_UP_TO_30_DAYS";
  liveAuthorizationRef: string | null;
}

/** Adapter outcome plus optional provider accounting (null for offline adapters). */
export interface AdapterResult {
  outcome: Result<unknown>;
  accounting: ProviderAccounting | null;
}

export interface GatewayAdapter {
  /** Gateway allowlist identity (policy `allowed_adapters` entry). */
  readonly adapterId: string;
  /** Run-record `provider` namespace — `offline` for non-model adapters. */
  readonly provider: string;
  /** Run-record `model` label; a label, never a provider model id. */
  readonly modelLabel: string;
  /** Capability tiers this adapter serves (docs/MODEL_AND_TOKEN_STRATEGY.md). */
  readonly executionTiers: readonly (0 | 1 | 2 | 3 | 4)[];
  invoke(invocation: AdapterInvocation): AdapterResult | Promise<AdapterResult>;
}

export class FakeAdapter implements GatewayAdapter {
  readonly adapterId = "fake";
  readonly provider = "offline";
  readonly modelLabel = "deterministic-fake-adapter-v1";
  readonly executionTiers = [0] as const;

  readonly #fixtures: Map<string, unknown>;
  #invocations = 0;

  /** Fixtures are injected, synthetic, and returned exactly — no transformation. */
  constructor(fixtures: ReadonlyMap<string, unknown>) {
    this.#fixtures = new Map(fixtures);
  }

  /**
   * Test seam proving the fail-closed boundary: every call to invoke() counts,
   * so a rejected request that never incremented this counter provably never
   * reached the adapter.
   */
  get invocationCount(): number {
    return this.#invocations;
  }

  invoke(invocation: AdapterInvocation): AdapterResult {
    this.#invocations += 1;
    if (!this.#fixtures.has(invocation.scenarioId)) {
      return {
        outcome: err({
          kind: "scenario-not-found",
          scenarioId: invocation.scenarioId,
          message: `fake adapter has no fixture for scenario '${invocation.scenarioId}'; unknown scenarios are rejected, never improvised`,
        }),
        accounting: null,
      };
    }
    // structuredClone keeps repeated invocations byte-identical even if a
    // caller mutates a previously returned value.
    return { outcome: ok(structuredClone(this.#fixtures.get(invocation.scenarioId))), accounting: null };
  }
}
