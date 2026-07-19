// Operational record store: namespace isolation, immutability, traversal and
// symlink refusal, validate-before-write, and failure-safe writes (DEC-0010,
// INV-OBS-001, INV-DATA-001).
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, readdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FileRunRecordStore } from "../src/gateway/record-store.js";
import { NOW, WS, BRAND, registry, tempDir } from "./helpers.js";

function store(root = tempDir("records")): { store: FileRunRecordStore; root: string } {
  return { store: new FileRunRecordStore(root, registry()), root };
}

export function validRunRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.9.0",
    run_id: "run_t_0001",
    session_id: "sess_t",
    project_id: "proj_t",
    workspace_id: WS,
    brand_id: BRAND,
    workflow_id: "wf_t",
    skill_id: "gateway-selftest",
    attribution_confidence: "confirmed",
    artifact_ids_in: [],
    artifact_ids_out: [],
    context_manifest_ref: null,
    provider: "offline",
    model: "deterministic-fake-adapter-v1",
    model_tier: 0,
    prompt_version: null,
    started_at: NOW,
    latency_ms: null,
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    cache_creation_tokens: 0,
    reasoning_tokens: null,
    cost: { mode: "free-tier", usd: 0, allocation: "none" },
    tool_calls: 1,
    retry_count: 0,
    failure_type: null,
    media: null,
    human_review: "none",
    accepted: null,
    rejected_reason: null,
    superseded_by: null,
    ...overrides,
  };
}

export function validManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.9.0",
    manifest_id: "cm_run_t_0001",
    run_ref: "run_t_0001",
    skill_id: "gateway-selftest",
    artifacts_loaded: [{ artifact_id: "src_t_0001", reason: "synthetic source under test", tokens_estimate: null }],
    learnings_classes_consulted: [],
    decisions_consulted: [],
    fresh_context_size: null,
    cached_context_size: null,
    context_selector_version: "gateway-offline-kernel-0.1.0",
    retrieval_failures: [],
    ...overrides,
  };
}

test("valid run records and manifests persist, re-validate on read, and are immutable (no overwrite)", () => {
  const { store: s } = store();
  const putRun = s.put(WS, BRAND, "model-run", validRunRecord());
  assert.ok(putRun.ok);
  const putManifest = s.put(WS, BRAND, "context-manifest", validManifest());
  assert.ok(putManifest.ok);

  const readRun = s.get(WS, BRAND, "model-run", "run_t_0001");
  assert.ok(readRun.ok);
  if (readRun.ok) assert.equal(readRun.value["provider"], "offline");
  const readManifest = s.get(WS, BRAND, "context-manifest", "cm_run_t_0001");
  assert.ok(readManifest.ok);

  // Immutability: a second put with the same identity fails; content is unchanged.
  const again = s.put(WS, BRAND, "model-run", validRunRecord({ skill_id: "tampered" }));
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.error.kind, "artifact-exists");
  const reread = s.get(WS, BRAND, "model-run", "run_t_0001");
  assert.ok(reread.ok);
  if (reread.ok) assert.equal(reread.value["skill_id"], "gateway-selftest");
});

test("schema-invalid records are rejected before persistence", () => {
  const { store: s, root } = store();
  const invalid = s.put(WS, BRAND, "model-run", validRunRecord({ input_tokens: -1 }));
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.kind, "validation-failed");
  const missing = s.put(WS, BRAND, "context-manifest", { schema_version: "1.9.0" });
  assert.equal(missing.ok, false);
  // Nothing — canonical or partial — may exist after rejected writes.
  assert.deepEqual(readdirSync(root), []);
});

test("workspace and brand namespaces cannot cross-read records", () => {
  const { store: s } = store();
  assert.ok(s.put(WS, BRAND, "model-run", validRunRecord()).ok);
  assert.ok(s.put(WS, BRAND, "context-manifest", validManifest()).ok);

  // Path isolation: a foreign namespace simply has no such record.
  const otherBrand = s.get(WS, "brand_other", "model-run", "run_t_0001");
  assert.equal(otherBrand.ok, false);
  if (!otherBrand.ok) assert.equal(otherBrand.error.kind, "artifact-not-found");
  const otherWs = s.get("ws_other", BRAND, "context-manifest", "cm_run_t_0001");
  assert.equal(otherWs.ok, false);
  if (!otherWs.ok) assert.equal(otherWs.error.kind, "artifact-not-found");

  // Content truth: a model-run record cannot be planted into a namespace its
  // own workspace_id/brand_id does not name.
  const planted = s.put(WS, "brand_other", "model-run", validRunRecord({ run_id: "run_t_0002" }));
  assert.equal(planted.ok, false);
  if (!planted.ok) assert.equal(planted.error.kind, "namespace-violation");
});

test("path traversal and symlinked namespace components fail closed", () => {
  const { store: s, root } = store();
  for (const bad of ["../escape", "a/b", ".hidden", ""]) {
    const put = s.put(bad, BRAND, "model-run", validRunRecord());
    assert.equal(put.ok, false);
    const get = s.get(WS, BRAND, "model-run", bad);
    assert.equal(get.ok, false);
  }
  // A symlinked brand directory pointing outside the root must be unusable.
  const outside = tempDir("records-outside");
  mkdirSync(join(root, WS), { recursive: true });
  symlinkSync(outside, join(root, WS, "brand_link"));
  const throughLink = s.put(WS, "brand_link", "model-run", validRunRecord({ brand_id: "brand_link" }));
  assert.equal(throughLink.ok, false);
  if (!throughLink.ok) assert.equal(throughLink.error.kind, "namespace-violation");
  assert.equal(readdirSync(outside).length, 0, "nothing may be written through the symlink");
});

test("failed writes leave no partial or temporary files", () => {
  const { store: s, root } = store();
  // Force the write step itself to fail after validation: the record-type
  // directory exists but is read-only, so the temporary file cannot be created.
  const dir = join(root, WS, BRAND, "model-run");
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o555);
  try {
    const put = s.put(WS, BRAND, "model-run", validRunRecord({ run_id: "run_t_0009" }));
    assert.equal(put.ok, false);
    if (!put.ok) assert.equal(put.error.kind, "io-error");
  } finally {
    chmodSync(dir, 0o755);
  }
  assert.deepEqual(readdirSync(dir), [], "no canonical, partial, or temporary file may survive a failed write");
});
