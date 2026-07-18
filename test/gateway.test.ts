// Offline gateway kernel: fail-closed policy enforcement, budget preflight,
// manifest-before-invocation, deterministic Fake Adapter, structured-output
// validation, and truthful run records (DEC-0009, DEC-0010; INV-PROV-001,
// INV-TOK-001/002, INV-OBS-001). The Fake Adapter invocation counter is the
// proof that rejected requests never reach it.
import assert from "node:assert/strict";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FakeAdapter, type GatewayAdapter } from "../src/gateway/adapter.js";
import { OfflineGateway } from "../src/gateway/gateway.js";
import { FileRunRecordStore } from "../src/gateway/record-store.js";
import { BRAND, NOW, WS, contractsDir, registry, tempDir, validAssumption } from "./helpers.js";

const ACTIVE_POLICY_PATH = join(contractsDir, "gateway-policy.active.json");
// Distinctive synthetic values that must never leak from fixture content into
// operational records (raw outputs stay out of observability records).
const FIXTURE_MARKER = "SYNTHETIC-FIXTURE-MARKER-93412";
const CREDENTIAL_SHAPED = "synthetic-credential-shaped-value-0000";

function defaultFixtures(): Map<string, unknown> {
  return new Map<string, unknown>([
    [
      "assumption-basic",
      validAssumption({
        statement: `Synthetic assumption carrying ${FIXTURE_MARKER} and ${CREDENTIAL_SHAPED}`,
      }),
    ],
    ["assumption-broken", { schema_version: "1.5.0", artifact_id: "asm_broken" }],
  ]);
}

interface Env {
  gw: OfflineGateway;
  adapter: FakeAdapter;
  records: FileRunRecordStore;
  root: string;
}

function env(
  overrides: Partial<{ policyPath: string; available: Set<string>; adapters: GatewayAdapter[] }> = {}
): Env {
  const root = tempDir("gateway");
  const records = new FileRunRecordStore(root, registry());
  const adapter = new FakeAdapter(defaultFixtures());
  const available = overrides.available ?? new Set(["src_t_0001"]);
  const created = OfflineGateway.create({
    registry: registry(),
    recordStore: records,
    adapters: overrides.adapters ?? [adapter],
    policyPath: overrides.policyPath ?? ACTIVE_POLICY_PATH,
    clock: () => NOW,
    contextResolver: (_workspace, _brand, artifactId) => available.has(artifactId),
  });
  assert.ok(created.ok, "gateway must construct from the committed active policy");
  if (!created.ok) throw new Error("unreachable");
  return { gw: created.value, adapter, records, root };
}

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    request_id: "req_t_0001",
    run_id: "run_t_0001",
    session_id: "sess_t",
    project_id: "proj_t",
    workspace_id: WS,
    brand_id: BRAND,
    workflow_id: "wf_t",
    skill_id: "gateway-selftest",
    adapter_id: "fake",
    requested_tier: 0,
    data_classification: "synthetic",
    output_contract: "assumption",
    scenario_id: "assumption-basic",
    context_items: [{ artifact_id: "src_t_0001", reason: "synthetic source under test", required: true }],
    token_budget: {
      schema_version: "1.5.0",
      budget_id: "budget_t_0001",
      scope: "skill",
      scope_ref: "gateway-selftest",
      fresh_input_budget: 0,
      cached_input_budget: null,
      cache_write_budget: null,
      output_budget: 1000,
      max_tool_calls: 1,
      max_iterations: 1,
      escalation_budget: null,
      hard_stop_output: 1000,
      basis: "offline deterministic fixture run - zero model tokens by construction (DEC-0009)",
    },
    max_output_tokens: 0,
    ...overrides,
  };
}

function budgetWith(overrides: Record<string, unknown>): Record<string, unknown> {
  const base = validRequest()["token_budget"] as Record<string, unknown>;
  return { ...base, ...overrides };
}

test("the committed active gateway policy validates and constructs a gateway", () => {
  const { gw } = env();
  assert.ok(gw instanceof OfflineGateway);
});

test("missing, malformed, and out-of-policy policy documents fail closed at construction", () => {
  const records = new FileRunRecordStore(tempDir("gateway-policy"), registry());
  const baseDeps = {
    registry: registry(),
    recordStore: records,
    adapters: [new FakeAdapter(defaultFixtures())],
    clock: () => NOW,
    contextResolver: () => true,
  };
  const gone = OfflineGateway.create({ ...baseDeps, policyPath: join(tempDir("noexist"), "missing.json") });
  assert.equal(gone.ok, false);
  if (!gone.ok) assert.equal(gone.error.kind, "invalid-policy");

  const dir = tempDir("policies");
  const active = activePolicyContent();
  const unknownField = join(dir, "unknown-field.json");
  writeFileSync(unknownField, JSON.stringify({ ...active, provider_api_base_url: "x" }), "utf8");
  const rejectedUnknown = OfflineGateway.create({ ...baseDeps, policyPath: unknownField });
  assert.equal(rejectedUnknown.ok, false);
  if (!rejectedUnknown.ok) assert.equal(rejectedUnknown.error.kind, "invalid-policy");

  const nonzero = join(dir, "nonzero-spend.json");
  writeFileSync(nonzero, JSON.stringify({ ...active, max_external_spend_usd_per_run: 5 }), "utf8");
  const rejectedSpend = OfflineGateway.create({ ...baseDeps, policyPath: nonzero });
  assert.equal(rejectedSpend.ok, false);
  if (!rejectedSpend.ok) assert.equal(rejectedSpend.error.kind, "invalid-policy");

  const invalidJson = join(dir, "broken.json");
  writeFileSync(invalidJson, "{ not json", "utf8");
  const rejectedJson = OfflineGateway.create({ ...baseDeps, policyPath: invalidJson });
  assert.equal(rejectedJson.ok, false);
  if (!rejectedJson.ok) assert.equal(rejectedJson.error.kind, "invalid-policy");
});

function activePolicyContent(): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    policy_id: "gateway-policy-0001",
    decision_ref: "DEC-0009",
    allowed_adapters: ["fake"],
    allowed_data_classes: ["synthetic"],
    external_network_allowed: false,
    real_client_data_allowed: false,
    api_credentials_permitted: false,
    max_external_spend_usd_per_run: 0,
    max_external_spend_usd_per_month: 0,
    required_execution_tier: 0,
  };
}

test("construction refuses adapters the policy does not allow", () => {
  const rogue: GatewayAdapter = {
    adapterId: "anthropic",
    provider: "anthropic",
    modelLabel: "some-model",
    executionTier: 0,
    invoke: () => ({ ok: true, value: {} }),
  };
  const records = new FileRunRecordStore(tempDir("gateway-rogue"), registry());
  const created = OfflineGateway.create({
    registry: registry(),
    recordStore: records,
    adapters: [rogue],
    policyPath: ACTIVE_POLICY_PATH,
    clock: () => NOW,
    contextResolver: () => true,
  });
  assert.equal(created.ok, false);
  if (!created.ok) assert.equal(created.error.kind, "adapter-not-approved");
});

test("requests naming real-provider adapter identifiers are rejected before invocation", () => {
  const { gw, adapter, records } = env();
  let n = 0;
  for (const adapterId of ["anthropic", "openai", "google-vertex", "aws-bedrock"]) {
    const result = gw.invoke(validRequest({ adapter_id: adapterId, run_id: `run_prov_${++n}` }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "adapter-not-approved");
  }
  assert.equal(adapter.invocationCount, 0, "no rejected request may reach the adapter");
  // The rejection is recorded truthfully: a refusal with zero tool calls.
  const record = records.get(WS, BRAND, "model-run", "run_prov_1");
  assert.ok(record.ok);
  if (record.ok) {
    assert.equal(record.value["failure_type"], "refusal");
    assert.equal(record.value["tool_calls"], 0);
  }
});

test("non-synthetic data classifications are rejected before invocation", () => {
  const { gw, adapter } = env();
  let n = 0;
  for (const dataClass of ["real-client", "mixed", "unknown"]) {
    const result = gw.invoke(validRequest({ data_classification: dataClass, run_id: `run_dc_${++n}` }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "data-class-not-permitted");
  }
  assert.equal(adapter.invocationCount, 0);
});

test("tiers other than the policy-required tier are rejected before invocation", () => {
  const { gw, adapter } = env();
  const result = gw.invoke(validRequest({ requested_tier: 2, run_id: "run_tier_1" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "tier-not-permitted");
  assert.equal(adapter.invocationCount, 0);
});

test("budget breaches occur before invocation: hard stop, fallback stop, and tool-call floor", () => {
  const { gw, adapter, records } = env();
  const overHardStop = gw.invoke(validRequest({ max_output_tokens: 2000, run_id: "run_bud_1" }));
  assert.equal(overHardStop.ok, false);
  if (!overHardStop.ok) assert.equal(overHardStop.error.kind, "budget-exceeded");

  // With hard_stop_output null, output_budget is the applicable stop.
  const overFallback = gw.invoke(
    validRequest({
      run_id: "run_bud_2",
      max_output_tokens: 1500,
      token_budget: budgetWith({ hard_stop_output: null }),
    })
  );
  assert.equal(overFallback.ok, false);
  if (!overFallback.ok) assert.equal(overFallback.error.kind, "budget-exceeded");

  const zeroCalls = gw.invoke(
    validRequest({ run_id: "run_bud_3", token_budget: budgetWith({ max_tool_calls: 0 }) })
  );
  assert.equal(zeroCalls.ok, false);
  if (!zeroCalls.ok) assert.equal(zeroCalls.error.kind, "budget-exceeded");

  assert.equal(adapter.invocationCount, 0, "budget breaches must precede the adapter");
  const record = records.get(WS, BRAND, "model-run", "run_bud_1");
  assert.ok(record.ok);
  if (record.ok) assert.equal(record.value["failure_type"], "loop_budget");
});

test("missing required context prevents invocation and the manifest records the retrieval failure", () => {
  const { gw, adapter, records } = env({ available: new Set<string>() });
  const result = gw.invoke(validRequest({ run_id: "run_ctx_1" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "missing-context");
  assert.equal(adapter.invocationCount, 0);

  const manifest = records.get(WS, BRAND, "context-manifest", "cm_run_ctx_1");
  assert.ok(manifest.ok);
  if (manifest.ok) {
    assert.deepEqual(manifest.value["artifacts_loaded"], []);
    const failures = manifest.value["retrieval_failures"] as { wanted: string }[];
    assert.equal(failures.length, 1);
    assert.equal(failures[0]?.wanted, "src_t_0001");
  }
  const record = records.get(WS, BRAND, "model-run", "run_ctx_1");
  assert.ok(record.ok);
  if (record.ok) {
    assert.equal(record.value["failure_type"], "validation_failure");
    assert.equal(record.value["context_manifest_ref"], "cm_run_ctx_1");
  }
});

test("missing optional context is recorded as a retrieval failure without blocking", () => {
  const { gw, records } = env({ available: new Set<string>() });
  const result = gw.invoke(
    validRequest({
      run_id: "run_ctx_2",
      context_items: [{ artifact_id: "src_t_0001", reason: "optional enrichment", required: false }],
    })
  );
  assert.ok(result.ok);
  const manifest = records.get(WS, BRAND, "context-manifest", "cm_run_ctx_2");
  assert.ok(manifest.ok);
  if (manifest.ok) {
    assert.deepEqual(manifest.value["artifacts_loaded"], []);
    assert.equal((manifest.value["retrieval_failures"] as unknown[]).length, 1);
  }
});

test("a known scenario returns the exact validated artifact, deterministically across runs and stores", () => {
  const expected = defaultFixtures().get("assumption-basic");
  const first = env();
  const a = first.gw.invoke(validRequest({ run_id: "run_det_1" }));
  assert.ok(a.ok);
  if (a.ok) {
    assert.deepEqual(a.value.artifact, expected);
    assert.equal(a.value.manifestId, "cm_run_det_1");
  }
  // Same gateway, second run: identical output.
  const b = first.gw.invoke(validRequest({ run_id: "run_det_2" }));
  assert.ok(b.ok);
  if (a.ok && b.ok) assert.deepEqual(b.value.artifact, a.value.artifact);

  // Fresh gateway + fresh store, injected clock: records are byte-identical.
  const second = env();
  const c = second.gw.invoke(validRequest({ run_id: "run_det_1" }));
  assert.ok(c.ok);
  const r1 = first.records.get(WS, BRAND, "model-run", "run_det_1");
  const r2 = second.records.get(WS, BRAND, "model-run", "run_det_1");
  assert.ok(r1.ok && r2.ok);
  if (r1.ok && r2.ok) assert.deepEqual(r1.value, r2.value);
  const m1 = first.records.get(WS, BRAND, "context-manifest", "cm_run_det_1");
  const m2 = second.records.get(WS, BRAND, "context-manifest", "cm_run_det_1");
  assert.ok(m1.ok && m2.ok);
  if (m1.ok && m2.ok) assert.deepEqual(m1.value, m2.value);
});

test("unknown scenarios are rejected by the adapter and recorded as tool errors", () => {
  const { gw, adapter, records } = env();
  const result = gw.invoke(validRequest({ scenario_id: "no-such-scenario", run_id: "run_scn_1" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "scenario-not-found");
  assert.equal(adapter.invocationCount, 1, "the adapter was reached exactly once and refused");
  const record = records.get(WS, BRAND, "model-run", "run_scn_1");
  assert.ok(record.ok);
  if (record.ok) assert.equal(record.value["failure_type"], "tool_error");
});

test("schema-invalid adapter output is rejected, never returned, and never retried", () => {
  const { gw, adapter, records } = env();
  const result = gw.invoke(validRequest({ scenario_id: "assumption-broken", run_id: "run_bad_1" }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "output-validation-failed");
    assert.ok(!("artifact" in result), "no artifact escapes a failed validation");
  }
  assert.equal(adapter.invocationCount, 1, "deterministic validation failures are not retried");
  const record = records.get(WS, BRAND, "model-run", "run_bad_1");
  assert.ok(record.ok);
  if (record.ok) {
    assert.equal(record.value["failure_type"], "validation_failure");
    assert.equal(record.value["retry_count"], 0);
  }
});

test("unknown output contracts are rejected before invocation", () => {
  const { gw, adapter } = env();
  const result = gw.invoke(validRequest({ output_contract: "no-such-contract", run_id: "run_oc_1" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "output-validation-failed");
  assert.equal(adapter.invocationCount, 0);
});

test("success run records are truthful: zero tokens, zero cost, tier 0, offline identity", () => {
  const { gw, records } = env();
  const result = gw.invoke(validRequest({ run_id: "run_ok_1" }));
  assert.ok(result.ok);
  const record = records.get(WS, BRAND, "model-run", "run_ok_1");
  assert.ok(record.ok, "the success record must validate against the model-run contract on read");
  if (!record.ok) return;
  const r = record.value;
  assert.equal(r["provider"], "offline");
  assert.equal(r["model"], "deterministic-fake-adapter-v1");
  assert.equal(r["model_tier"], 0);
  assert.equal(r["input_tokens"], 0);
  assert.equal(r["output_tokens"], 0);
  assert.equal(r["cached_tokens"], 0);
  assert.equal(r["cache_creation_tokens"], 0);
  assert.deepEqual(r["cost"], { mode: "free-tier", usd: 0, allocation: "none" });
  assert.equal(r["tool_calls"], 1);
  assert.equal(r["retry_count"], 0);
  assert.equal(r["failure_type"], null);
  assert.equal(r["started_at"], NOW);
  assert.equal(r["latency_ms"], null);
  assert.equal(r["context_manifest_ref"], "cm_run_ok_1");
  assert.deepEqual(r["artifact_ids_in"], ["src_t_0001"]);
  assert.deepEqual(r["artifact_ids_out"], ["asm_t_0001"]);
});

test("the context manifest records exactly what was loaded and why", () => {
  const { gw, records } = env();
  assert.ok(gw.invoke(validRequest({ run_id: "run_mf_1" })).ok);
  const manifest = records.get(WS, BRAND, "context-manifest", "cm_run_mf_1");
  assert.ok(manifest.ok);
  if (!manifest.ok) return;
  assert.equal(manifest.value["run_ref"], "run_mf_1");
  assert.equal(manifest.value["skill_id"], "gateway-selftest");
  assert.equal(manifest.value["context_selector_version"], "gateway-offline-kernel-0.1.0");
  assert.deepEqual(manifest.value["artifacts_loaded"], [
    { artifact_id: "src_t_0001", reason: "synthetic source under test", tokens_estimate: null },
  ]);
  assert.deepEqual(manifest.value["retrieval_failures"], []);
});

test("fixture content and credential-shaped values never leak into operational records", () => {
  const { gw, records } = env();
  assert.ok(gw.invoke(validRequest({ run_id: "run_leak_1" })).ok);
  const record = records.get(WS, BRAND, "model-run", "run_leak_1");
  const manifest = records.get(WS, BRAND, "context-manifest", "cm_run_leak_1");
  assert.ok(record.ok && manifest.ok);
  if (record.ok && manifest.ok) {
    const persisted = JSON.stringify(record.value) + JSON.stringify(manifest.value);
    assert.ok(!persisted.includes(FIXTURE_MARKER), "fixture body must not appear in records");
    assert.ok(!persisted.includes(CREDENTIAL_SHAPED), "credential-shaped values must not appear in records");
  }
});

test("requests failing boundary validation produce no records at all (documented record boundary)", () => {
  const { gw, adapter, root } = env();
  for (const bad of [
    {},
    null,
    validRequest({ api_key: "x" }),
    validRequest({ data_classification: "confidential" }),
    validRequest({ token_budget: budgetWith({ output_budget: undefined }) }),
  ]) {
    const result = gw.invoke(bad);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "invalid-request");
  }
  assert.equal(adapter.invocationCount, 0);
  assert.deepEqual(readdirSync(root), [], "no record may exist for an unvalidated identity");
});
