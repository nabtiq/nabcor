// Anthropic adapter behavior under mocked transport (DEC-0018/DEC-0019;
// threat model T01/T02/T09/T13/T14/T15/T16/T21). No test here opens a
// network path: every transport is an injected mock, every credential is a
// generated fake, and the live-invocation gate is satisfied only by
// test-constructed mock policies that the committed documents provably
// cannot produce (see anthropic-live-disabled.test.ts).
import assert from "node:assert/strict";
import test from "node:test";
import { costCents } from "../src/gateway/adapters/anthropic.js";
import {
  MockTransport,
  adapterEnv,
  allowLiveAuthorization,
  fakeApiKey,
  httpError,
  invalidLiveAuthorization,
  invocation,
  missingSecret,
  mockLivePolicy,
  noLiveCallAuthorization,
  okSecret,
  replayedLiveAuthorization,
  successResponse,
  timeoutResult,
} from "./anthropic-helpers.js";
import { validAssumption } from "./helpers.js";

// ---------------------------------------------------------------------------
// Authorization ordering: every gate failure must leave later gates untouched
// ---------------------------------------------------------------------------

test("an invalid request (unknown scenario) causes zero secret lookups and zero transport attempts", async () => {
  const env = adapterEnv();
  const result = await env.adapter.invoke(invocation({ scenarioId: "no-such-scenario" }));
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "scenario-not-found");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.adapter.transportAttemptCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a disallowed data classification causes zero secret lookups and zero transport attempts", async () => {
  const env = adapterEnv();
  const result = await env.adapter.invoke(invocation({ dataClassification: "real-client" }));
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "data-class-not-permitted");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a tier with no allowed model fails closed before every other gate", async () => {
  const env = adapterEnv();
  const result = await env.adapter.invoke(invocation({ requestedTier: 3 }));
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "model-not-allowed");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a budget failure causes zero secret lookups and zero transport attempts", async () => {
  // 200k input + 32k output on Sonnet (tier 2) projects to $1.08 > $1.00:
  // the USD ceiling governs even though both token ceilings pass.
  const env = adapterEnv();
  const result = await env.adapter.invoke(
    invocation({ requestedTier: 2, maxInputTokens: 200000, maxOutputTokens: 32000 })
  );
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "budget-exceeded");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a missing live-call authorization fails before credential resolution and transport", async () => {
  const env = adapterEnv({ liveAuthorization: noLiveCallAuthorization });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "live-call-authorization-missing");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("an invalid live-call authorization fails before credential resolution and transport", async () => {
  const env = adapterEnv({ liveAuthorization: invalidLiveAuthorization });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "live-call-authorization-invalid");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a replayed (already-consumed) authorization fails at consumption, before secret and transport", async () => {
  const env = adapterEnv({ liveAuthorization: replayedLiveAuthorization });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "live-call-authorization-invalid");
  assert.equal(env.adapter.secretResolutionCount, 0);
  assert.equal(env.transport.requests.length, 0);
});

test("a missing credential fails closed with zero transport attempts, after budget reservation settles at zero", async () => {
  const env = adapterEnv({ secretResolver: missingSecret });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "credential-unavailable");
  assert.equal(env.adapter.secretResolutionCount, 1, "the secret boundary was consulted exactly once");
  assert.equal(env.transport.requests.length, 0, "no transport without a credential");
  // The reservation was released in full (nothing was sent).
  const remaining = env.ledger.remaining("run_anth_0001", "2026-07-19T12:00:00Z");
  assert.equal(remaining.runCents, env.deps.policy.maxUsdPerRunCents);
});

test("with every gate valid under the mock policy, exactly one mock invocation happens and succeeds", async () => {
  const env = adapterEnv();
  const result = await env.adapter.invoke(invocation());
  assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
  assert.equal(env.transport.requests.length, 1, "exactly one transport attempt");
  assert.equal(env.adapter.secretResolutionCount, 1);
  assert.ok(result.accounting);
  if (result.accounting) {
    assert.equal(result.accounting.provider, "anthropic");
    assert.equal(result.accounting.requestedModel, "claude-haiku-4-5-20251001");
    assert.equal(result.accounting.returnedModel, "claude-haiku-4-5-20251001");
    assert.equal(result.accounting.attempt, 1);
    assert.equal(result.accounting.retryCount, 0);
    assert.equal(result.accounting.cachedTokens, 0);
    assert.equal(result.accounting.cacheCreationTokens, 0);
    assert.equal(result.accounting.retentionStatus, "STANDARD_UP_TO_30_DAYS");
    assert.equal(result.accounting.liveAuthorizationRef, "receipt-test-live-0001");
    assert.equal(result.accounting.pricingVersion, "anthropic-official-2026-07-19-post-intro");
  }
});

// ---------------------------------------------------------------------------
// Transport request shape and injection resistance
// ---------------------------------------------------------------------------

test("the transport request carries the exact pinned protocol version, bounded body, and exact model — and no caller URL or headers exist", async () => {
  const env = adapterEnv();
  await env.adapter.invoke(invocation());
  const request = env.transport.requests[0]!;
  assert.equal(request.apiVersion, "2023-06-01");
  assert.equal(request.apiKey, env.apiKey);
  const body = JSON.parse(request.bodyJson) as Record<string, unknown>;
  assert.equal(body["model"], "claude-haiku-4-5-20251001");
  assert.equal(body["max_tokens"], 2000);
  assert.deepEqual(Object.keys(body).sort(), ["max_tokens", "messages", "model", "output_config"]);
  const outputConfig = body["output_config"] as { format: { type: string } };
  assert.equal(outputConfig.format.type, "json_schema");
  const messages = body["messages"] as { role: string; content: string }[];
  assert.equal(messages.length, 1);
  assert.equal(messages[0]!.role, "user");
  // No tools, metadata, caching, files, batch, streaming, or state fields.
  for (const forbidden of ["tools", "tool_choice", "metadata", "stream", "container", "mcp_servers", "cache_control"]) {
    assert.ok(!(forbidden in body), `request body must not carry '${forbidden}'`);
  }
  // The transport request type itself has no URL or header surface: the
  // caller provably cannot inject either.
  assert.deepEqual(Object.keys(request).sort(), ["apiKey", "apiVersion", "bodyJson", "timeoutMs"]);
});

test("tier 2 resolves exactly the ratified Sonnet model", async () => {
  const env = adapterEnv({ responses: [successResponse({ model: "claude-sonnet-5" })] });
  const result = await env.adapter.invoke(invocation({ requestedTier: 2 }));
  assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
  const body = JSON.parse(env.transport.requests[0]!.bodyJson) as Record<string, unknown>;
  assert.equal(body["model"], "claude-sonnet-5");
});

// ---------------------------------------------------------------------------
// Response handling: every response is untrusted until validated
// ---------------------------------------------------------------------------

test("a wrong content type is a typed protocol violation with no retry", async () => {
  const env = adapterEnv({ responses: [successResponse({ contentType: "text/html" })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
  assert.equal(env.transport.requests.length, 1, "protocol violations are never retried");
});

test("malformed JSON is rejected as a protocol violation", async () => {
  const env = adapterEnv({ responses: [successResponse({ bodyText: "{ not json" })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
});

test("a response model mismatch is rejected (threat T09) and never retried", async () => {
  const env = adapterEnv({ responses: [successResponse({ model: "claude-haiku-4-5" })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) {
    assert.equal(result.outcome.error.kind, "provider-protocol-violation");
    assert.match(result.outcome.error.message, /does not equal the requested allowed model/);
  }
  assert.equal(env.transport.requests.length, 1);
});

test("unexpected content blocks are rejected", async () => {
  const env = adapterEnv({
    responses: [
      successResponse({
        content: [
          { type: "text", text: "{}" },
          { type: "tool_use", id: "t1", name: "x", input: {} },
        ],
      }),
    ],
  });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
});

test("invalid usage fields are rejected", async () => {
  const env = adapterEnv({ responses: [successResponse({ usageExtra: { input_tokens: -5 } })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
});

test("nonzero cache token counts are rejected while caching is disabled", async () => {
  const env = adapterEnv({ responses: [successResponse({ usageExtra: { cache_read_input_tokens: 42 } })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) {
    assert.equal(result.outcome.error.kind, "provider-protocol-violation");
    assert.match(result.outcome.error.message, /caching is disabled/);
  }
});

test("a truncated (max_tokens) response is rejected rather than partially persisted", async () => {
  const env = adapterEnv({ responses: [successResponse({ stopReason: "max_tokens" })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
});

test("contract-invalid structured output gets exactly one bounded retry with a fresh reservation, then fails without any partial artifact", async () => {
  const env = adapterEnv({
    responses: [
      successResponse({ artifact: { schema_version: "1.9.0", artifact_id: "asm_broken" } }),
      successResponse({ artifact: { schema_version: "1.9.0", artifact_id: "asm_broken" } }),
    ],
  });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "validation-failed");
  assert.equal(env.transport.requests.length, 2, "exactly one bounded retry");
  assert.ok(result.accounting);
  if (result.accounting) {
    assert.equal(result.accounting.attempt, 2);
    assert.equal(result.accounting.retryCount, 1);
    // Both attempts consumed their own reservations and settled at actuals.
    assert.ok(result.accounting.reservedUsd > 0);
  }
});

test("a contract-invalid first attempt followed by a valid second attempt succeeds", async () => {
  const env = adapterEnv({
    responses: [
      successResponse({ artifact: { schema_version: "1.9.0", artifact_id: "asm_broken" } }),
      successResponse(),
    ],
  });
  const result = await env.adapter.invoke(invocation());
  assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
  assert.equal(env.transport.requests.length, 2);
});

// ---------------------------------------------------------------------------
// Transient failures, retry-after, and permanent failures
// ---------------------------------------------------------------------------

test("429 with a bounded retry-after waits and retries exactly once", async () => {
  const sleeps: number[] = [];
  const env = adapterEnv({
    responses: [httpError(429, { retryAfterSeconds: 7 }), successResponse()],
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  });
  const result = await env.adapter.invoke(invocation());
  assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
  assert.equal(env.transport.requests.length, 2);
  assert.deepEqual(sleeps, [7000], "the retry respected the provider's retry-after");
});

test("429 with an excessive retry-after fails without waiting past the bound", async () => {
  const env = adapterEnv({ responses: [httpError(429, { retryAfterSeconds: 3600 })] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-rate-limited");
  assert.equal(env.transport.requests.length, 1);
});

test("5xx failures retry once then fail typed; two attempts maximum, no third attempt ever", async () => {
  const env = adapterEnv({ responses: [httpError(529), httpError(529), httpError(529)] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-unavailable");
  assert.equal(env.transport.requests.length, 2, "hard two-attempt cap");
});

test("permanent failures (400/401/403/404) are never retried and never echo the response body", async () => {
  for (const [status, kind] of [
    [400, "provider-request-rejected"],
    [401, "provider-auth-failed"],
    [403, "provider-auth-failed"],
    [404, "provider-request-rejected"],
  ] as const) {
    const env = adapterEnv({ responses: [httpError(status)] });
    const result = await env.adapter.invoke(invocation());
    assert.equal(result.outcome.ok, false);
    if (!result.outcome.ok) {
      assert.equal(result.outcome.error.kind, kind);
      assert.ok(!result.outcome.error.message.includes("synthetic error body"), "error bodies never surface");
    }
    assert.equal(env.transport.requests.length, 1, `HTTP ${status} must not retry`);
  }
});

test("a timeout settles the full reservation conservatively (unknown usage is never released)", async () => {
  const env = adapterEnv({ responses: [timeoutResult, timeoutResult] });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-timeout");
  assert.equal(env.transport.requests.length, 2, "timeouts are transient and get the one bounded retry");
  assert.ok(result.accounting);
  if (result.accounting) {
    assert.equal(result.accounting.inputTokens, null, "unknown usage is recorded as null, never estimated");
    // Both attempts' full reservations stay charged.
    assert.equal(result.accounting.actualUsd, result.accounting.reservedUsd);
  }
});

// ---------------------------------------------------------------------------
// Budget arithmetic and ceilings
// ---------------------------------------------------------------------------

test("cost arithmetic: pinned prices, integer cents, always rounded up", () => {
  const haiku = { modelId: "claude-haiku-4-5-20251001", tier: 1, inputUsdPerMtok: 1, outputUsdPerMtok: 5 };
  const sonnet = { modelId: "claude-sonnet-5", tier: 2, inputUsdPerMtok: 3, outputUsdPerMtok: 15 };
  // 200k in + 32k out on Haiku: 20 + 16 = 36 cents.
  assert.equal(costCents(haiku, 200000, 32000), 36);
  // Same maxima on Sonnet: 60 + 48 = 108 cents > the $1.00 cap.
  assert.equal(costCents(sonnet, 200000, 32000), 108);
  // Sub-cent costs round UP to one cent.
  assert.equal(costCents(haiku, 100, 100), 1);
});

test("run, day, and month ceilings refuse a reservation that would breach them", async () => {
  // Ledger with an artificially small run ceiling relative to the request.
  const policy = mockLivePolicy();
  const { FileBudgetLedger } = await import("../src/gateway/adapters/budget-ledger.js");
  const { tempDir } = await import("./helpers.js");
  for (const [scope, ceilings] of [
    ["run", { perRequestCents: 100, perRunCents: 1, perDayCents: 4000, perMonthCents: 6000 }],
    ["day", { perRequestCents: 100, perRunCents: 2500, perDayCents: 1, perMonthCents: 6000 }],
    ["month", { perRequestCents: 100, perRunCents: 2500, perDayCents: 4000, perMonthCents: 1 }],
  ] as const) {
    const ledger = new FileBudgetLedger(tempDir(`ledger-${scope}`), ceilings);
    const env = adapterEnv({ policy, ledger });
    const result = await env.adapter.invoke(invocation());
    assert.equal(result.outcome.ok, false, `${scope} ceiling must refuse`);
    if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "budget-exceeded");
    assert.equal(env.transport.requests.length, 0);
  }
});

test("UTC day and month rollovers release day/month scope deterministically under the injected clock", async () => {
  const { FileBudgetLedger } = await import("../src/gateway/adapters/budget-ledger.js");
  const { tempDir } = await import("./helpers.js");
  const ledger = new FileBudgetLedger(tempDir("ledger-rollover"), {
    perRequestCents: 100,
    perRunCents: 10000,
    perDayCents: 40,
    perMonthCents: 6000,
  });
  // Day 1: a 36-cent reservation settles at full value, leaving 4 cents.
  const first = ledger.reserve({ runId: "run_a", requestId: "req_a", attempt: 1, maxCents: 36 }, "2026-07-19T23:00:00Z");
  assert.ok(first.ok);
  if (first.ok) assert.ok(ledger.settle(first.value.reservationId, 36).ok);
  const sameDay = ledger.reserve({ runId: "run_b", requestId: "req_b", attempt: 1, maxCents: 36 }, "2026-07-19T23:30:00Z");
  assert.equal(sameDay.ok, false, "the same UTC day refuses a second 36-cent reservation");
  const nextDay = ledger.reserve({ runId: "run_c", requestId: "req_c", attempt: 1, maxCents: 36 }, "2026-07-20T00:00:01Z");
  assert.ok(nextDay.ok, "the next UTC day releases the daily scope");
  // Month scope keeps accumulating across days.
  const remaining = ledger.remaining("run_c", "2026-07-20T00:00:02Z");
  assert.equal(remaining.monthCents, 6000 - 36 - 36);
});

test("concurrent reservation attempts are refused under the single-writer boundary", async () => {
  const { FileBudgetLedger } = await import("../src/gateway/adapters/budget-ledger.js");
  const { writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tempDir } = await import("./helpers.js");
  const root = tempDir("ledger-lock");
  const ledger = new FileBudgetLedger(root, {
    perRequestCents: 100,
    perRunCents: 2500,
    perDayCents: 4000,
    perMonthCents: 6000,
  });
  // Simulate an in-flight reservation holding the single-writer lock.
  writeFileSync(join(root, "ledger.lock"), "held", "utf8");
  const blocked = ledger.reserve({ runId: "run_l", requestId: "req_l", attempt: 1, maxCents: 10 }, "2026-07-19T12:00:00Z");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.kind, "budget-ledger-busy");
});

test("settlement is idempotent on identical retries and refuses conflicting double settlement", async () => {
  const { FileBudgetLedger } = await import("../src/gateway/adapters/budget-ledger.js");
  const { tempDir } = await import("./helpers.js");
  const ledger = new FileBudgetLedger(tempDir("ledger-idem"), {
    perRequestCents: 100,
    perRunCents: 2500,
    perDayCents: 4000,
    perMonthCents: 6000,
  });
  const reserved = ledger.reserve({ runId: "run_i", requestId: "req_i", attempt: 1, maxCents: 50 }, "2026-07-19T12:00:00Z");
  assert.ok(reserved.ok);
  if (!reserved.ok) return;
  const id = reserved.value.reservationId;
  assert.ok(ledger.settle(id, 20).ok);
  assert.ok(ledger.settle(id, 20).ok, "identical re-settlement succeeds (crash recovery)");
  const conflicting = ledger.settle(id, 30);
  assert.equal(conflicting.ok, false);
  if (!conflicting.ok) assert.equal(conflicting.kind, "budget-ledger-conflict");
  // Settlement never releases more than provably unused and never exceeds the reservation.
  const over = ledger.reserve({ runId: "run_i2", requestId: "req_i2", attempt: 1, maxCents: 50 }, "2026-07-19T12:00:00Z");
  assert.ok(over.ok);
  if (over.ok) {
    const clamped = ledger.settle(over.value.reservationId, 500);
    assert.ok(clamped.ok);
    if (clamped.ok) assert.equal(clamped.value.chargedCents, 50, "settlement clamps at the reservation");
  }
});

test("both allowed models price correctly through a successful settlement", async () => {
  for (const [tier, inputTokens, outputTokens, expectedUsd, model] of [
    [1, 100000, 20000, 0.2, "claude-haiku-4-5-20251001"],
    [2, 100000, 20000, 0.6, "claude-sonnet-5"],
  ] as const) {
    const env = adapterEnv({ responses: [successResponse({ model, inputTokens, outputTokens })] });
    const result = await env.adapter.invoke(
      invocation({ requestedTier: tier, maxInputTokens: 100000, maxOutputTokens: 20000 })
    );
    assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
    assert.ok(result.accounting);
    if (result.accounting) assert.equal(result.accounting.actualUsd, expectedUsd);
  }
});

test("provider-reported usage above the declared maxima is rejected and settles at the full reservation", async () => {
  const env = adapterEnv({ responses: [successResponse({ inputTokens: 50000 })] });
  const result = await env.adapter.invoke(invocation({ maxInputTokens: 10000 }));
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) assert.equal(result.outcome.error.kind, "provider-protocol-violation");
  assert.ok(result.accounting);
  if (result.accounting) {
    assert.equal(result.accounting.actualUsd, result.accounting.reservedUsd, "never a silent under-charge");
  }
});

// ---------------------------------------------------------------------------
// Secret redaction: the fake key never appears in any output surface
// ---------------------------------------------------------------------------

test("the credential never appears in failures, accounting, or any serialized adapter output", async () => {
  const scenarios = [
    adapterEnv({ responses: [httpError(400)] }),
    adapterEnv({ responses: [timeoutResult, timeoutResult] }),
    adapterEnv({ responses: [successResponse({ model: "wrong-model" })] }),
    adapterEnv({ responses: [successResponse()] }),
  ];
  for (const env of scenarios) {
    const result = await env.adapter.invoke(invocation());
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(env.apiKey), "the API key must never appear in any adapter output");
    assert.ok(!/sk-ant-/.test(serialized), "nothing credential-shaped may appear in adapter output");
  }
});

test("secret resolution failure messages carry no length, prefix, suffix, hash, or equality diagnostics", async () => {
  const env = adapterEnv({ secretResolver: missingSecret });
  const result = await env.adapter.invoke(invocation());
  assert.equal(result.outcome.ok, false);
  if (!result.outcome.ok) {
    assert.ok(!/\d+ (bytes|chars|characters)/.test(result.outcome.error.message));
    assert.ok(!/prefix|suffix|hash|sha256|equal/.test(result.outcome.error.message));
  }
});

// ---------------------------------------------------------------------------
// Escalation: zero, structurally
// ---------------------------------------------------------------------------

test("the retry after a transient failure re-sends the identical model — no automatic escalation exists", async () => {
  const env = adapterEnv({ responses: [httpError(529), successResponse()] });
  const result = await env.adapter.invoke(invocation());
  assert.ok(result.outcome.ok, JSON.stringify(result.outcome));
  const first = JSON.parse(env.transport.requests[0]!.bodyJson) as Record<string, unknown>;
  const second = JSON.parse(env.transport.requests[1]!.bodyJson) as Record<string, unknown>;
  assert.equal(first["model"], second["model"]);
  assert.equal(env.transport.requests[0]!.bodyJson, env.transport.requests[1]!.bodyJson);
});
