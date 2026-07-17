import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { registry, repoRoot, validClaim } from "./helpers.js";

test("all current contracts compile and map artifact types to schema IDs", () => {
  const r = registry();
  assert.ok(r.knownTypes.length >= 20, `expected >=20 contracts, got ${r.knownTypes.length}`);
  for (const type of ["source", "claim", "assumption", "brand-context"]) {
    assert.ok(r.isSupported(type), `${type} must be a supported runtime type`);
    assert.equal(r.schemaIdFor(type), `https://nabcor.nabtiq.com/contracts/${type}.schema.json`);
  }
});

test("existing positive and negative contract fixtures still behave correctly", () => {
  const run = spawnSync(process.execPath, [join(repoRoot, "contracts", "validate.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `validate.mjs failed:\n${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /All layers green/);
});

test("unknown artifact fields are rejected with structured errors", () => {
  const artifact = {
    schema_version: "1.1.0",
    artifact_id: "bctx_t_0001",
    brand_ref: "brand_test",
    created_at: "2026-07-17T12:00:00Z",
    creator_type: "deterministic",
    lifecycle_status: "generated",
    mode: "prompt-only",
    modee: "prompt-only",
    identity: { names: [{ value: "X", claim_ref: "c1" }] },
    claim_refs: [],
    assumption_refs: [],
    gaps: [],
  };
  const result = registry().validate("brand-context", artifact);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "validation-failed");
    if (result.error.kind === "validation-failed") {
      assert.equal(result.error.artifactType, "brand-context");
      assert.ok(result.error.issues.length > 0);
      for (const issue of result.error.issues) {
        assert.equal(typeof issue.instancePath, "string");
        assert.equal(typeof issue.keyword, "string");
        assert.equal(typeof issue.message, "string");
      }
    }
  }
});

test("unknown artifact types are typed failures", () => {
  const result = registry().validate("no-such-type", {});
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "unknown-artifact-type");
});

test("semantic layer: inference marked verified without a human is rejected (INV-FACT-002)", () => {
  const claim = validClaim({
    classification: "inference",
    source_type: "operator_input",
    source_ref: null,
    verification_status: "verified",
  });
  const result = registry().validate("claim", claim);
  assert.equal(result.ok, false);
  if (!result.ok && result.error.kind === "validation-failed") {
    assert.match(result.error.issues[0]!.keyword, /INV-FACT-002/);
  } else {
    assert.fail("expected validation-failed");
  }
});
