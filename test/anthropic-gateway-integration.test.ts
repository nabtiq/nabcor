// Gateway + Anthropic adapter integration under mocked transport (DEC-0019;
// INV-OBS-001, INV-TOK-002, threat T21). Proves the full path writes
// truthful provider run records and that no prompt content, response body,
// or credential ever reaches an operational record.
import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { AnthropicAdapter } from "../src/gateway/adapters/anthropic.js";
import { FileBudgetLedger } from "../src/gateway/adapters/budget-ledger.js";
import { noLiveCallAuthorization } from "../src/gateway/adapters/live-authorization.js";
import { FakeAdapter } from "../src/gateway/adapter.js";
import { OfflineGateway } from "../src/gateway/gateway.js";
import { FileRunRecordStore } from "../src/gateway/record-store.js";
import {
  MockTransport,
  TEST_CLOCK,
  adapterEnv,
  allowLiveAuthorization,
  committedProviderPolicy,
  fakeApiKey,
  okSecret,
  successResponse,
} from "./anthropic-helpers.js";
import { BRAND, NOW, WS, contractsDir, registry, tempDir, validAssumption } from "./helpers.js";

const PROMPT_MARKER = "SYNTHETIC-PROMPT-MARKER-55107";
const RESPONSE_MARKER = "SYNTHETIC-RESPONSE-MARKER-81440";

function gatewayRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.10.0",
    request_id: "req_gi_0001",
    run_id: "run_gi_0001",
    session_id: "sess_gi",
    project_id: "proj_gi",
    workspace_id: WS,
    brand_id: BRAND,
    workflow_id: "wf_gi",
    skill_id: "gateway-anthropic-test",
    adapter_id: "anthropic",
    requested_tier: 1,
    data_classification: "synthetic",
    output_contract: "assumption",
    scenario_id: "assumption-basic",
    context_items: [{ artifact_id: "src_t_0001", reason: "synthetic source under test", required: false }],
    token_budget: {
      schema_version: "1.10.0",
      budget_id: "budget_gi_0001",
      scope: "skill",
      scope_ref: "gateway-anthropic-test",
      fresh_input_budget: 10000,
      cached_input_budget: null,
      cache_write_budget: null,
      output_budget: 2000,
      max_tool_calls: 1,
      max_iterations: 1,
      escalation_budget: null,
      hard_stop_output: 2000,
      basis: "synthetic mocked-transport integration test (DEC-0019)",
    },
    max_output_tokens: 2000,
    ...overrides,
  };
}

function gatewayWith(adapter: AnthropicAdapter): { gw: OfflineGateway; records: FileRunRecordStore } {
  const records = new FileRunRecordStore(tempDir("gi-records"), registry());
  const created = OfflineGateway.create({
    registry: registry(),
    recordStore: records,
    adapters: [new FakeAdapter(new Map()), adapter],
    policyPath: join(contractsDir, "gateway-policy.active.json"),
    clock: () => NOW,
    contextResolver: () => true,
  });
  assert.ok(created.ok, `gateway must construct: ${JSON.stringify(created)}`);
  if (!created.ok) throw new Error("unreachable");
  return { gw: created.value, records };
}

test("a mock-live provider run writes a truthful provider record with no prompt, response, or credential content", async () => {
  const apiKey = fakeApiKey();
  const artifact = validAssumption({ statement: `Synthetic assumption carrying ${RESPONSE_MARKER}` });
  const env = adapterEnv({
    responses: [successResponse({ artifact })],
    secretResolver: okSecret(apiKey),
    scenarioPrompts: new Map([["assumption-basic", `Synthetic prompt carrying ${PROMPT_MARKER}`]]),
  });
  const { gw, records } = gatewayWith(env.adapter);
  const result = await gw.invoke(gatewayRequest());
  assert.ok(result.ok, JSON.stringify(result));
  const record = records.get(WS, BRAND, "model-run", "run_gi_0001");
  const manifest = records.get(WS, BRAND, "context-manifest", "cm_run_gi_0001");
  assert.ok(record.ok && manifest.ok);
  if (!record.ok || !manifest.ok) return;
  const r = record.value;
  assert.equal(r["provider"], "anthropic");
  assert.equal(r["requested_model"], "claude-haiku-4-5-20251001");
  assert.equal(r["returned_model"], "claude-haiku-4-5-20251001");
  assert.equal(r["model_tier"], 1);
  assert.equal(r["input_tokens"], 1200);
  assert.equal(r["output_tokens"], 800);
  assert.equal(r["cached_tokens"], 0, "cache token counts stay zero while caching is disabled");
  assert.equal(r["cache_creation_tokens"], 0);
  assert.deepEqual(r["cost"], { mode: "api", usd: 0.01, allocation: "measured" });
  assert.equal(r["pricing_version"], "anthropic-official-2026-07-19-post-intro");
  assert.equal(r["retention_status"], "STANDARD_UP_TO_30_DAYS");
  assert.equal(r["data_classification"], "synthetic");
  assert.equal(r["output_contract"], "assumption");
  assert.equal(r["provider_request_id"], "req_synthetic_0001");
  assert.equal(r["attempt"], 1);
  assert.ok(typeof r["reserved_usd"] === "number" && (r["reserved_usd"] as number) > 0);
  const remaining = r["budget_remaining_usd"] as { run: number; day: number; month: number };
  assert.ok(remaining.run < 25 && remaining.day < 40 && remaining.month < 60);

  const persisted = JSON.stringify(r) + JSON.stringify(manifest.value);
  assert.ok(!persisted.includes(PROMPT_MARKER), "prompt content never reaches records");
  assert.ok(!persisted.includes(RESPONSE_MARKER), "response content never reaches records");
  assert.ok(!persisted.includes(apiKey), "the credential never reaches records");
  assert.ok(!/sk-ant-/.test(persisted), "nothing credential-shaped reaches records");
});

test("under the committed live-disabled configuration the gateway records a truthful refusal with zero spend", async () => {
  const transport = new MockTransport([]);
  const adapter = new AnthropicAdapter({
    policy: committedProviderPolicy(),
    transport,
    secretResolver: okSecret(fakeApiKey()),
    ledger: new FileBudgetLedger(tempDir("gi-disabled-ledger"), {
      perRequestCents: 100,
      perRunCents: 2500,
      perDayCents: 4000,
      perMonthCents: 6000,
    }),
    liveAuthorization: noLiveCallAuthorization,
    clock: () => TEST_CLOCK,
    sleep: () => Promise.resolve(),
    scenarioPrompts: new Map([["assumption-basic", "synthetic prompt"]]),
    outputSchemaFor: () => ({ type: "object" }),
    validateOutput: (contract, a) => registry().validate(contract, a),
  });
  const { gw, records } = gatewayWith(adapter);
  const result = await gw.invoke(gatewayRequest({ run_id: "run_gi_disabled" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "live-invocation-disabled");
  assert.equal(transport.requests.length, 0);
  const record = records.get(WS, BRAND, "model-run", "run_gi_disabled");
  assert.ok(record.ok);
  if (record.ok) {
    assert.equal(record.value["failure_type"], "refusal");
    assert.deepEqual(record.value["cost"], { mode: "free-tier", usd: 0, allocation: "none" });
    assert.equal(record.value["input_tokens"], 0);
  }
});

test("a live-authorized mock run records the consumed authorization reference", async () => {
  const env = adapterEnv({ liveAuthorization: allowLiveAuthorization("receipt-live-ref-42") });
  const { gw, records } = gatewayWith(env.adapter);
  const result = await gw.invoke(gatewayRequest({ run_id: "run_gi_liveref" }));
  assert.ok(result.ok, JSON.stringify(result));
  const record = records.get(WS, BRAND, "model-run", "run_gi_liveref");
  assert.ok(record.ok);
  if (record.ok) assert.equal(record.value["live_authorization_ref"], "receipt-live-ref-42");
});
