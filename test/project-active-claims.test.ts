// Deterministic active-claim lineage projection (DEC-0012): current truth is
// derived from validated lineage heads over the COMPLETE claim revision set —
// never from caller omission. Cycles, self-supersession, dangling references,
// ambiguous forks, conflicting superseded_by metadata, and hidden successors
// all fail closed; historical revisions stay auditable; inactive heads carry
// closed-enum reasons; output is deterministic and disjoint.
import assert from "node:assert/strict";
import test from "node:test";
import {
  projectActiveClaims,
  type ActiveClaimProjection,
} from "../src/understand/project-active-claims.js";
import { BRAND, WS, registry, validClaim } from "./helpers.js";

function project(claims: unknown[]) {
  return projectActiveClaims({ workspace: WS, brandRef: BRAND, claims }, registry());
}

function claimRevision(
  id: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return validClaim({ artifact_id: id, ...overrides });
}

// ---- projection semantics ---------------------------------------------------

test("a three-version lineage projects only the final head as effective; history stays auditable", () => {
  const result = project([
    claimRevision("claim_v1"),
    claimRevision("claim_v2", { supersedes: "claim_v1", lifecycle_status: "revised" }),
    claimRevision("claim_v3", { supersedes: "claim_v2", lifecycle_status: "revised" }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const p: ActiveClaimProjection = result.value;
  assert.deepEqual(p.inputClaimRefs, ["claim_v1", "claim_v2", "claim_v3"]);
  assert.deepEqual(p.effectiveClaimRefs, ["claim_v3"], "only the lineage head is current truth");
  assert.deepEqual(p.supersededClaimRefs, ["claim_v1", "claim_v2"], "history is retained, never deleted");
  assert.deepEqual(p.inactiveHeadClaims, []);
  assert.deepEqual(p.lineage, [
    { predecessor: "claim_v1", successor: "claim_v2" },
    { predecessor: "claim_v2", successor: "claim_v3" },
  ]);
});

test("contradicted, rejected, and expired heads are inactive with closed-enum reasons; lifecycle-rejected too", () => {
  const result = project([
    claimRevision("claim_a", { verification_status: "contradicted" }),
    claimRevision("claim_b", { verification_status: "rejected" }),
    claimRevision("claim_c", { verification_status: "expired" }),
    claimRevision("claim_d", { lifecycle_status: "rejected" }),
    claimRevision("claim_e"),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const p = result.value;
  assert.deepEqual(p.effectiveClaimRefs, ["claim_e"]);
  assert.deepEqual(p.inactiveHeadClaims, [
    { claim_ref: "claim_a", reason: "verification-contradicted" },
    { claim_ref: "claim_b", reason: "verification-rejected" },
    { claim_ref: "claim_c", reason: "verification-expired" },
    { claim_ref: "claim_d", reason: "lifecycle-rejected" },
  ]);
  assert.deepEqual(p.supersededClaimRefs, []);
});

test("effective, superseded, and inactive collections are deterministic, disjoint, and cover every input", () => {
  const claims = () => [
    claimRevision("claim_z", { verification_status: "contradicted" }),
    claimRevision("claim_m", { supersedes: "claim_a", lifecycle_status: "revised" }),
    claimRevision("claim_a"),
    claimRevision("claim_q"),
  ];
  const first = project(claims());
  const second = project(claims());
  assert.ok(first.ok && second.ok, JSON.stringify(first));
  if (!first.ok || !second.ok) return;
  const p = first.value;
  assert.equal(
    JSON.stringify({ ...p, claimById: undefined }),
    JSON.stringify({ ...second.value, claimById: undefined }),
    "identical input must produce byte-equivalent projection output"
  );
  const partitions = [
    ...p.effectiveClaimRefs,
    ...p.supersededClaimRefs,
    ...p.inactiveHeadClaims.map((c) => c.claim_ref),
  ];
  assert.equal(new Set(partitions).size, partitions.length, "partitions must be disjoint");
  assert.deepEqual([...partitions].sort(), p.inputClaimRefs, "partitions must cover every input claim");
  assert.deepEqual(p.effectiveClaimRefs, ["claim_m", "claim_q"]);
});

// ---- fail-closed lineage validation ----------------------------------------

test("self-supersession is rejected", () => {
  const result = project([claimRevision("claim_a", { supersedes: "claim_a" })]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /supersedes itself/);
  }
});

test("a lineage cycle is rejected", () => {
  const result = project([
    claimRevision("claim_a", { supersedes: "claim_b" }),
    claimRevision("claim_b", { supersedes: "claim_a" }),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /cycle/);
  }
});

test("a dangling predecessor is rejected for a declared complete set — omission is not resolution", () => {
  const result = project([
    claimRevision("claim_b", { supersedes: "claim_missing" }),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /absent from the declared complete claim set/);
  }
});

test("two successors superseding the same predecessor are rejected as an ambiguous fork", () => {
  const result = project([
    claimRevision("claim_a"),
    claimRevision("claim_b", { supersedes: "claim_a", lifecycle_status: "revised" }),
    claimRevision("claim_c", { supersedes: "claim_a", lifecycle_status: "revised" }),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /ambiguous fork/);
  }
});

test("cross-brand lineage is rejected", () => {
  const result = project([
    claimRevision("claim_a"),
    claimRevision("claim_b", { brand_ref: "brand_other", supersedes: "claim_a" }),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "reference-violation");
});

test("duplicate claim artifact IDs are rejected", () => {
  const result = project([claimRevision("claim_a"), claimRevision("claim_a")]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "invalid-input");
    assert.match(result.error.message, /duplicate claim artifact_id/);
  }
});

test("conflicting superseded_by metadata is rejected; agreeing or absent metadata is permitted", () => {
  // Conflicting: claim_a says claim_c superseded it, but claim_c does not supersede it.
  const conflicting = project([
    claimRevision("claim_a", { superseded_by: "claim_c" }),
    claimRevision("claim_b", { supersedes: "claim_a", lifecycle_status: "revised" }),
    claimRevision("claim_c"),
  ]);
  assert.equal(conflicting.ok, false);
  if (!conflicting.ok) {
    assert.equal(conflicting.error.kind, "lineage-violation");
    assert.match(conflicting.error.message, /must agree with the actual successor relationship/);
  }

  // Agreeing metadata projects normally.
  const agreeing = project([
    claimRevision("claim_a", { superseded_by: "claim_b", lifecycle_status: "superseded" }),
    claimRevision("claim_b", { supersedes: "claim_a", lifecycle_status: "revised" }),
  ]);
  assert.ok(agreeing.ok, JSON.stringify(agreeing));
  if (agreeing.ok) assert.deepEqual(agreeing.value.effectiveClaimRefs, ["claim_b"]);

  // Absent superseded_by on the immutable historical artifact is permitted:
  // the successor relationship alone establishes the lineage.
  const absent = project([
    claimRevision("claim_a"),
    claimRevision("claim_b", { supersedes: "claim_a", lifecycle_status: "revised" }),
  ]);
  assert.ok(absent.ok, JSON.stringify(absent));
  if (absent.ok) {
    assert.deepEqual(absent.value.supersededClaimRefs, ["claim_a"]);
    assert.deepEqual(absent.value.effectiveClaimRefs, ["claim_b"]);
  }
});

test("superseded_by naming a claim outside the declared complete set is rejected", () => {
  const result = project([claimRevision("claim_a", { superseded_by: "claim_ghost" })]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /absent from the declared complete claim set/);
  }
});

test("lifecycle superseded without the successor in the complete set fails closed", () => {
  const result = project([claimRevision("claim_a", { lifecycle_status: "superseded" })]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /successor is missing/);
  }
});

test("a contract-invalid claim is rejected before any lineage rule runs", () => {
  const result = project([claimRevision("claim_a", { classification: "factual", source_ref: null })]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "validation-failed");
});
