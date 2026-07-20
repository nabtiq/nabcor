// Artifact-address integrity (DEC-0013 clarification, Phase 1B.3A / DEC-0014).
// The canonical filename IS the address: a stored file whose internal
// artifact_id disagrees with the address it occupies is refused at the read
// boundary (store.get) and at snapshot capture — never surfaced to analyzers,
// compilers, registries, or approval verification.
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { captureClaimSnapshot } from "../src/kernel/claim-snapshot.js";
import { FileRunRecordStore } from "../src/gateway/record-store.js";
import { BRAND, NOW, WS, registry, tempDir, validClaim } from "./helpers.js";

function storeWithPlantedClaim(prefix: string): { store: FileArtifactStore; root: string } {
  const root = tempDir(prefix);
  const store = new FileArtifactStore(root, registry());
  const put = store.put(WS, BRAND, "claim", validClaim());
  assert.ok(put.ok, "setup: canonical claim must persist");
  // Plant the SAME schema-valid content under a DIFFERENT canonical filename,
  // bypassing put() exactly as tampering or misplacement would.
  copyFileSync(
    join(root, WS, BRAND, "claim", "claim_t_0001.json"),
    join(root, WS, BRAND, "claim", "claim_t_0099.json")
  );
  return { store, root };
}

test("store.get refuses an artifact whose internal artifact_id differs from its canonical filename", () => {
  const { store } = storeWithPlantedClaim("addr-get");
  const got = store.get(WS, BRAND, "claim", "claim_t_0099");
  assert.equal(got.ok, false, "a filename/identity mismatch must not return an artifact");
  if (!got.ok) {
    assert.equal(got.error.kind, "artifact-address-mismatch");
    if (got.error.kind === "artifact-address-mismatch") {
      assert.equal(got.error.artifactId, "claim_t_0099");
      assert.equal(got.error.storedArtifactId, "claim_t_0001");
    }
  }
  // The genuine address still reads fine.
  const genuine = store.get(WS, BRAND, "claim", "claim_t_0001");
  assert.ok(genuine.ok, "the correctly addressed artifact stays readable");
});

test("the address check applies to every supported artifact type, not only claims", () => {
  const root = tempDir("addr-types");
  const store = new FileArtifactStore(root, registry());
  const profile = {
    schema_version: "1.10.0",
    artifact_id: "tp_t_0001",
    brand_ref: BRAND,
    created_at: NOW,
    creator_type: "human",
    lifecycle_status: "accepted",
    description: "synthetic profile",
    slots: [
      {
        fact_key: "identity.primary_name",
        description: "primary trading name",
        cardinality: "single",
        requirement: "required",
        why_needed: "every output renders the name",
        blocking_if_missing: true,
        blocking_if_conflicting: true,
      },
    ],
  };
  assert.ok(store.put(WS, BRAND, "truth-profile", profile).ok);
  copyFileSync(
    join(root, WS, BRAND, "truth-profile", "tp_t_0001.json"),
    join(root, WS, BRAND, "truth-profile", "tp_t_0777.json")
  );
  const got = store.get(WS, BRAND, "truth-profile", "tp_t_0777");
  assert.equal(got.ok, false);
  if (!got.ok) assert.equal(got.error.kind, "artifact-address-mismatch");
});

test("snapshot capture fails immediately when a claim file's filename and internal artifact_id disagree", () => {
  const { store } = storeWithPlantedClaim("addr-snapshot");
  const captured = captureClaimSnapshot(
    { artifactId: "snap_addr_0001", workspace: WS, brandRef: BRAND, createdAt: NOW },
    store,
    registry()
  );
  assert.equal(captured.ok, false, "capture must fail during store.get, not proceed to a snapshot");
  if (!captured.ok) {
    assert.equal(
      captured.error.kind,
      "artifact-address-mismatch",
      "the failure is the read-boundary address check itself, not a later digest reconciliation"
    );
  }
});

test("an artifact carrying an internal workspace field must name its workspace namespace at write AND read", () => {
  // claim-snapshot is the supported type with an internal workspace field
  // (Phase 1B.3A review finding: it was reconciled at neither boundary).
  const root = tempDir("addr-workspace");
  const store = new FileArtifactStore(root, registry());
  const snapshot = {
    schema_version: "1.10.0",
    artifact_id: "snap_ws_0001",
    brand_ref: BRAND,
    workspace: "ws_FOREIGN",
    created_at: NOW,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    snapshot_algorithm: "claim-set-sha256-1.0.0",
    claims: [],
    claim_set_digest: "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  };
  const put = store.put(WS, BRAND, "claim-snapshot", snapshot);
  assert.equal(put.ok, false, "a snapshot naming a foreign workspace must not enter this namespace");
  if (!put.ok) assert.equal(put.error.kind, "namespace-violation");

  // Plant it directly (bypassing put) and prove the read boundary refuses too.
  mkdirSync(join(root, WS, BRAND, "claim-snapshot"), { recursive: true });
  writeFileSync(
    join(root, WS, BRAND, "claim-snapshot", "snap_ws_0001.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf8"
  );
  const got = store.get(WS, BRAND, "claim-snapshot", "snap_ws_0001");
  assert.equal(got.ok, false);
  if (!got.ok) assert.equal(got.error.kind, "namespace-violation");

  // The honestly addressed snapshot (a different id — the planted file
  // occupies the first address) still writes and reads.
  const honest = { ...snapshot, artifact_id: "snap_ws_0002", workspace: WS };
  assert.ok(store.put(WS, BRAND, "claim-snapshot", honest).ok, "an honest workspace must persist");
  assert.ok(store.get(WS, BRAND, "claim-snapshot", "snap_ws_0002").ok, "and read back");
});

test("operational record reads refuse a record whose identity field differs from its canonical filename", () => {
  const root = tempDir("addr-record");
  const recordStore = new FileRunRecordStore(root, registry());
  const manifest = {
    schema_version: "1.10.0",
    manifest_id: "cm_t_0001",
    run_ref: "run_t_0001",
    skill_id: "address-integrity-test",
    artifacts_loaded: [
      {
        artifact_id: "claim_t_0001",
        reason: "synthetic address-integrity test load",
        tokens_estimate: 100,
      },
    ],
    context_selector_version: "0.1.0",
  };
  const put = recordStore.put(WS, BRAND, "context-manifest", manifest);
  assert.ok(put.ok, `setup: manifest must persist: ${JSON.stringify(put)}`);
  const dir = join(root, WS, BRAND, "context-manifest");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cm_t_0999.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const got = recordStore.get(WS, BRAND, "context-manifest", "cm_t_0999");
  assert.equal(got.ok, false);
  if (!got.ok) assert.equal(got.error.kind, "artifact-address-mismatch");
});
