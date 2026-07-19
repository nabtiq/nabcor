// Shared setup for the Anthropic adapter test suites (DEC-0019). Everything
// here is synthetic: generated credential-shaped fake keys, injected mock
// transports, ephemeral policies, and deterministic clocks. No real
// credential, network path, or provider call exists anywhere in these tests.
import { randomBytes } from "node:crypto";
import {
  ATTEMPT_TIMEOUT_MS,
  AnthropicAdapter,
  type AnthropicAdapterDeps,
} from "../src/gateway/adapters/anthropic.js";
import { FileBudgetLedger } from "../src/gateway/adapters/budget-ledger.js";
import {
  type LiveCallAuthorization,
  noLiveCallAuthorization,
} from "../src/gateway/adapters/live-authorization.js";
import { type ProviderPolicy, loadProviderPolicy } from "../src/gateway/adapters/provider-policy.js";
import type { ProviderSecretResolver } from "../src/gateway/adapters/secret.js";
import type {
  AnthropicTransport,
  TransportRequest,
  TransportResult,
} from "../src/gateway/adapters/transport.js";
import type { AdapterInvocation } from "../src/gateway/adapter.js";
import { err, ok } from "../src/kernel/result.js";
import { contractsDir, registry, tempDir, validAssumption } from "./helpers.js";

export const TEST_CLOCK = "2026-07-19T12:00:00Z";

/** The committed CONFIGURED_BUT_LIVE_DISABLED policy trio. */
export function committedProviderPolicy(): ProviderPolicy {
  const loaded = loadProviderPolicy(contractsDir, registry());
  if (!loaded.ok) throw new Error(`test setup: committed provider policy must load: ${JSON.stringify(loaded)}`);
  return loaded.value;
}

/**
 * A TEST-ONLY in-memory mock policy with live invocation forced on. This
 * object can only be constructed by test code holding the ProviderPolicy
 * type: the committed documents are schema-pinned live-disabled, so no
 * production wiring can produce it (proven by the live-disabled suite).
 */
export function mockLivePolicy(): ProviderPolicy {
  return { ...committedProviderPolicy(), liveInvocationEnabled: true };
}

/** Generated credential-shaped fake value; never a real key. */
export function fakeApiKey(): string {
  return `sk-ant-synthetic-${randomBytes(24).toString("hex")}`;
}

export class MockTransport implements AnthropicTransport {
  readonly requests: TransportRequest[] = [];
  readonly #queue: TransportResult[];

  constructor(queue: TransportResult[]) {
    this.#queue = [...queue];
  }

  post(request: TransportRequest): Promise<TransportResult> {
    this.requests.push(request);
    const next = this.#queue.shift();
    if (!next) throw new Error("mock transport exhausted: unexpected extra attempt");
    return Promise.resolve(next);
  }
}

export function okSecret(apiKey: string): ProviderSecretResolver {
  return { resolve: () => Promise.resolve({ ok: true, value: { apiKey } }) };
}

export const missingSecret: ProviderSecretResolver = {
  resolve: () => Promise.resolve({ ok: false, message: "no credential is resolvable; failing closed" }),
};

export const allowLiveAuthorization = (ref = "receipt-test-live-0001"): LiveCallAuthorization => ({
  check: () => ok(undefined),
  consume: () => ok({ authorizationRef: ref }),
});

export const invalidLiveAuthorization: LiveCallAuthorization = {
  check: () =>
    err({ kind: "live-call-authorization-invalid", message: "presented live-call evidence is invalid" }),
  consume: () => err({ kind: "live-call-authorization-invalid", message: "invalid" }),
};

export const replayedLiveAuthorization: LiveCallAuthorization = {
  check: () => ok(undefined),
  consume: () =>
    err({
      kind: "live-call-authorization-invalid",
      message: "live-call authorization failed verification/consumption (approval-replay)",
    }),
};

export { noLiveCallAuthorization };

/** A provider-success transport response carrying a contract-valid assumption. */
export function successResponse(
  overrides: Partial<{
    model: string;
    stopReason: string;
    inputTokens: number;
    outputTokens: number;
    artifact: unknown;
    contentType: string;
    usageExtra: Record<string, unknown>;
    content: unknown[];
    requestId: string;
    bodyText: string;
  }> = {}
): TransportResult {
  const artifact = overrides.artifact ?? validAssumption();
  const body = {
    id: "msg_synthetic_0001",
    type: "message",
    role: "assistant",
    model: overrides.model ?? "claude-haiku-4-5-20251001",
    stop_reason: overrides.stopReason ?? "end_turn",
    content: overrides.content ?? [{ type: "text", text: JSON.stringify(artifact) }],
    usage: {
      input_tokens: overrides.inputTokens ?? 1200,
      output_tokens: overrides.outputTokens ?? 800,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      ...(overrides.usageExtra ?? {}),
    },
  };
  return {
    ok: true,
    response: {
      status: 200,
      contentType: overrides.contentType ?? "application/json",
      retryAfterSeconds: null,
      requestId: overrides.requestId ?? "req_synthetic_0001",
      bodyText: overrides.bodyText ?? JSON.stringify(body),
    },
  };
}

export function httpError(
  status: number,
  overrides: Partial<{ retryAfterSeconds: number | null; requestId: string }> = {}
): TransportResult {
  return {
    ok: true,
    response: {
      status,
      contentType: "application/json",
      retryAfterSeconds: overrides.retryAfterSeconds ?? null,
      requestId: overrides.requestId ?? "req_synthetic_err",
      bodyText: JSON.stringify({ type: "error", error: { type: "synthetic", message: "synthetic error body" } }),
    },
  };
}

export const timeoutResult: TransportResult = {
  ok: false,
  failure: { kind: "transport-timeout", message: `request aborted after ${ATTEMPT_TIMEOUT_MS} ms` },
};

export interface AdapterEnv {
  adapter: AnthropicAdapter;
  transport: MockTransport;
  ledger: FileBudgetLedger;
  apiKey: string;
  deps: AnthropicAdapterDeps;
}

export function adapterEnv(
  overrides: Partial<AnthropicAdapterDeps> & { responses?: TransportResult[] } = {}
): AdapterEnv {
  const policy = overrides.policy ?? mockLivePolicy();
  const transport =
    (overrides.transport as MockTransport | undefined) ?? new MockTransport(overrides.responses ?? [successResponse()]);
  const ledger =
    (overrides.ledger as FileBudgetLedger | undefined) ??
    new FileBudgetLedger(tempDir("anthropic-ledger"), {
      perRequestCents: policy.maxUsdPerRequestCents,
      perRunCents: policy.maxUsdPerRunCents,
      perDayCents: policy.maxUsdPerDayCents,
      perMonthCents: policy.maxUsdPerMonthCents,
    });
  const apiKey = fakeApiKey();
  const deps: AnthropicAdapterDeps = {
    policy,
    transport,
    secretResolver: overrides.secretResolver ?? okSecret(apiKey),
    ledger,
    liveAuthorization: overrides.liveAuthorization ?? allowLiveAuthorization(),
    clock: overrides.clock ?? (() => TEST_CLOCK),
    sleep: overrides.sleep ?? (() => Promise.resolve()),
    scenarioPrompts:
      overrides.scenarioPrompts ??
      new Map([["assumption-basic", "Synthetic benchmark prompt: extract the assumption from this synthetic fixture text."]]),
    outputSchemaFor:
      overrides.outputSchemaFor ??
      ((contract) => (registry().schemaIdFor(contract) === undefined ? undefined : { type: "object" })),
    validateOutput: overrides.validateOutput ?? ((contract, artifact) => registry().validate(contract, artifact)),
  };
  return { adapter: new AnthropicAdapter(deps), transport, ledger, apiKey, deps };
}

export function invocation(overrides: Partial<AdapterInvocation> = {}): AdapterInvocation {
  return {
    scenarioId: "assumption-basic",
    outputContract: "assumption",
    requestedTier: 1,
    maxOutputTokens: 2000,
    maxInputTokens: 10000,
    dataClassification: "synthetic",
    runId: "run_anth_0001",
    requestId: "req_anth_0001",
    ...overrides,
  };
}
