// Gateway adapters (DEC-0009, DEC-0010, INV-PROV-001). Exactly one adapter
// exists in this phase: the deterministic Fake Adapter. It is test
// infrastructure, not a model — it holds no provider SDK, opens no network
// path, reads no credentials or environment, and returns only exact
// predeclared synthetic fixtures for known scenario identifiers. Its results
// are never model-quality evidence and never populate EXP-0001.
import { type Result, err, ok } from "../kernel/result.js";

export interface AdapterInvocation {
  scenarioId: string;
  outputContract: string;
}

export interface GatewayAdapter {
  /** Gateway allowlist identity (policy `allowed_adapters` entry). */
  readonly adapterId: string;
  /** Run-record `provider` namespace — `offline` for non-model adapters. */
  readonly provider: string;
  /** Run-record `model` label; a label, never a provider model id. */
  readonly modelLabel: string;
  /** Capability tier (docs/MODEL_AND_TOKEN_STRATEGY.md) — 0 means no model. */
  readonly executionTier: 0 | 1 | 2 | 3 | 4;
  invoke(invocation: AdapterInvocation): Result<unknown>;
}

export class FakeAdapter implements GatewayAdapter {
  readonly adapterId = "fake";
  readonly provider = "offline";
  readonly modelLabel = "deterministic-fake-adapter-v1";
  readonly executionTier = 0 as const;

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

  invoke(invocation: AdapterInvocation): Result<unknown> {
    this.#invocations += 1;
    if (!this.#fixtures.has(invocation.scenarioId)) {
      return err({
        kind: "scenario-not-found",
        scenarioId: invocation.scenarioId,
        message: `fake adapter has no fixture for scenario '${invocation.scenarioId}'; unknown scenarios are rejected, never improvised`,
      });
    }
    // structuredClone keeps repeated invocations byte-identical even if a
    // caller mutates a previously returned value.
    return ok(structuredClone(this.#fixtures.get(invocation.scenarioId)));
  }
}
