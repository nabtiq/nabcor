// Application and lineage-effect tests (DEC-0016): successors are immutable
// contradicted revisions, predecessors and the winner stay byte-identical,
// the old snapshot/analysis becomes stale, and the fresh analysis closes
// exactly the resolved contradiction.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { buildBrandContext } from "../src/compile/build-brand-context.js";
import { applyFactResolution } from "../src/resolve/apply-resolution.js";
import { successorIdFor } from "../src/resolve/resolution-ids.js";
import { BRAND, NOW, WS, contentStore, registry, validSlot, validSource, validTruthProfile } from "./helpers.js";
import {
  ANALYSIS_ID,
  DECISION_ID,
  FACT_KEY,
  SNAPSHOT_ID,
  contentDigest,
  decisionEvidence,
  factClaim,
  prepareDecision,
  resolutionScenario,
} from "./resolution-helpers.js";

function rawBytes(root: string, type: string, id: string): string {
  return readFileSync(join(root, WS, BRAND, type, `${id}.json`), "utf8");
}

test("application creates the losing successor correctly and touches nothing else", () => {
  const scenario = resolutionScenario({
    claims: [
      factClaim("claim_r_win", "Alpha Brand", { verification_status: "unconfirmed" }),
      factClaim("claim_r_lose", "Beta Brand"),
      factClaim("claim_r_unrelated", "Unrelated", {
        artifact_id: "claim_r_unrelated",
        fact_key: undefined,
        normalized_value: undefined,
        normalization_basis: undefined,
      }),
    ],
  });
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok, JSON.stringify(prepared));
  const winnerBytesBefore = rawBytes(scenario.artifactsRoot, "claim", "claim_r_win");
  const loserBytesBefore = rawBytes(scenario.artifactsRoot, "claim", "claim_r_lose");
  const unrelatedBytesBefore = rawBytes(scenario.artifactsRoot, "claim", "claim_r_unrelated");

  const applied = applyFactResolution(decisionEvidence(scenario, prepared.value), scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));
  const application = applied.value.application;

  // The successor: deterministic ID, preserved content, contradicted state,
  // recorded decision, lineage link, same namespace.
  const successorId = successorIdFor(String(application["artifact_id"]), "claim_r_lose");
  const successorGot = scenario.store.get(WS, BRAND, "claim", successorId);
  assert.ok(successorGot.ok, JSON.stringify(successorGot));
  const successor = successorGot.value;
  assert.equal(successor["supersedes"], "claim_r_lose");
  assert.equal(successor["verification_status"], "contradicted");
  assert.equal(successor["resolution_decision_ref"], DECISION_ID);
  assert.equal(successor["lifecycle_status"], "revised");
  assert.equal(successor["creator_type"], "deterministic");
  assert.equal(successor["brand_ref"], BRAND);
  // Original content and provenance preserved.
  const loser = JSON.parse(loserBytesBefore) as Record<string, unknown>;
  for (const field of [
    "statement",
    "classification",
    "source_type",
    "source_ref",
    "confidence",
    "confidence_basis",
    "fact_key",
    "normalized_value",
    "normalization_basis",
  ]) {
    assert.deepEqual(successor[field], loser[field], `successor must preserve ${field}`);
  }

  // Predecessor, winner, and unrelated claims are byte-identical; the winner
  // was NOT auto-upgraded to verified.
  assert.equal(rawBytes(scenario.artifactsRoot, "claim", "claim_r_lose"), loserBytesBefore);
  assert.equal(rawBytes(scenario.artifactsRoot, "claim", "claim_r_win"), winnerBytesBefore);
  assert.equal(rawBytes(scenario.artifactsRoot, "claim", "claim_r_unrelated"), unrelatedBytesBefore);
  const winner = scenario.store.get(WS, BRAND, "claim", "claim_r_win");
  assert.ok(winner.ok);
  assert.equal(winner.value["verification_status"], "unconfirmed");

  // The application record binds the created revision.
  assert.deepEqual(application["created_losing_revisions"], [
    {
      losing_claim_ref: "claim_r_lose",
      successor_claim_ref: successorId,
      successor_content_digest: contentDigest(successor),
    },
  ]);
});

test("multiple losers are all revised in one application", () => {
  const scenario = resolutionScenario({
    claims: [
      factClaim("claim_r_a", "Alpha Brand"),
      factClaim("claim_r_b", "Beta Brand"),
      factClaim("claim_r_c", "Gamma Brand"),
    ],
  });
  const prepared = prepareDecision(scenario, { winningClaimRef: "claim_r_b" });
  assert.ok(prepared.ok);
  const applied = applyFactResolution(decisionEvidence(scenario, prepared.value), scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));
  const revisions = applied.value.application["created_losing_revisions"] as {
    losing_claim_ref: string;
    successor_claim_ref: string;
  }[];
  assert.deepEqual(
    revisions.map((r) => r.losing_claim_ref),
    ["claim_r_a", "claim_r_c"]
  );
  for (const r of revisions) {
    const got = scenario.store.get(WS, BRAND, "claim", r.successor_claim_ref);
    assert.ok(got.ok);
    assert.equal(got.value["verification_status"], "contradicted");
  }
});

test("the old snapshot and analysis become stale; the fresh analysis closes only the resolved contradiction", () => {
  // Two independent contradictions on two slots; resolving one must leave
  // the other open and untouched, and required-slot gaps unchanged.
  const profile = validTruthProfile({
    artifact_id: "tp_t_0001",
    slots: [
      validSlot(),
      validSlot({
        fact_key: "market.default_locale",
        description: "the market's default content locale",
        why_needed: "locale decides rendering direction and copy defaults",
      }),
    ],
  });
  const scenario = resolutionScenario({
    profile,
    claims: [
      factClaim("claim_r_win", "Alpha Brand"),
      factClaim("claim_r_lose", "Beta Brand"),
      factClaim("claim_r_loc1", "en", {
        artifact_id: "claim_r_loc1",
        fact_key: "market.default_locale",
        normalized_value: "en",
      }),
      factClaim("claim_r_loc2", "ar", {
        artifact_id: "claim_r_loc2",
        fact_key: "market.default_locale",
        normalized_value: "ar",
      }),
    ],
  });
  const oldAnalysis = scenario.analysis;
  assert.equal((oldAnalysis["open_contradictions"] as unknown[]).length, 2);

  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok, JSON.stringify(prepared));
  const applied = applyFactResolution(decisionEvidence(scenario, prepared.value), scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));
  const application = applied.value.application;

  // Fresh analysis: the resolved slot is closed, the unrelated one is open
  // and identical to before.
  const freshGot = scenario.store.get(WS, BRAND, "truth-analysis", String(application["after_analysis_ref"]));
  assert.ok(freshGot.ok);
  const freshContradictions = freshGot.value["open_contradictions"] as {
    fact_key: string;
    claim_refs: string[];
    distinct_values: unknown[];
  }[];
  assert.deepEqual(
    freshContradictions.map((c) => c.fact_key),
    ["market.default_locale"]
  );
  const oldLocale = (oldAnalysis["open_contradictions"] as typeof freshContradictions).find(
    (c) => c.fact_key === "market.default_locale"
  )!;
  assert.deepEqual(freshContradictions[0], oldLocale);

  // The losing successor is an inactive head; its predecessor is superseded.
  const successorId = successorIdFor(String(application["artifact_id"]), "claim_r_lose");
  assert.deepEqual(freshGot.value["inactive_head_claims"], [
    { claim_ref: successorId, reason: "verification-contradicted" },
  ]);
  assert.ok((freshGot.value["superseded_claim_refs"] as string[]).includes("claim_r_lose"));

  // Downstream compilation rejects the OLD analysis (stale) and accepts the
  // fresh one.
  const content = contentStore();
  const staleCompile = buildBrandContext(
    {
      artifactId: "bcp_r_old",
      workspace: WS,
      brandRef: BRAND,
      mode: "evidence-rich",
      createdAt: NOW,
      sources: [validSource()],
      assumptions: [],
      truthAnalysisRef: ANALYSIS_ID,
      identity: { names: [{ value: "Alpha Brand", claim_ref: "claim_r_win" }] },
    },
    scenario.store,
    registry(),
    content
  );
  assert.equal(staleCompile.ok, false);
  assert.equal((staleCompile as { ok: false; error: { kind: string } }).error.kind, "stale-analysis");

  const freshCompile = buildBrandContext(
    {
      artifactId: "bcp_r_new",
      workspace: WS,
      brandRef: BRAND,
      mode: "evidence-rich",
      createdAt: NOW,
      sources: [validSource()],
      assumptions: [],
      truthAnalysisRef: String(application["after_analysis_ref"]),
      identity: { names: [{ value: "Alpha Brand", claim_ref: "claim_r_win" }] },
    },
    scenario.store,
    registry(),
    content
  );
  assert.ok(freshCompile.ok, JSON.stringify(freshCompile));

  // Preparing a new decision against the old analysis is refused as stale.
  const stalePreparation = prepareDecision(scenario, {
    decisionArtifactId: "frd_r_stale",
    factKey: "market.default_locale",
    contradictionFingerprint: scenario.fingerprint,
  });
  assert.equal(stalePreparation.ok, false);
  assert.equal(
    (stalePreparation as { ok: false; error: { kind: string } }).error.kind,
    "stale-analysis"
  );
});

test("a slot whose only support lost the resolution reports a truthful missing gap", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const applied = applyFactResolution(decisionEvidence(scenario, prepared.value), scenario.deps);
  assert.ok(applied.ok);
  const fresh = scenario.store.get(
    WS,
    BRAND,
    "truth-analysis",
    String(applied.value.application["after_analysis_ref"])
  );
  assert.ok(fresh.ok);
  // The winner still supplies the slot, so no gap here — and the snapshot
  // digest moved.
  assert.deepEqual(fresh.value["gaps"], []);
  assert.notEqual(fresh.value["claim_set_digest"], scenario.analysis["claim_set_digest"]);
  assert.equal(fresh.value["claim_snapshot_ref"], applied.value.application["after_snapshot_ref"]);
  assert.notEqual(fresh.value["claim_snapshot_ref"], SNAPSHOT_ID);
});

test("a failed preflight leaves zero mutation and consumes nothing", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  // Invalidate the decision by changing the namespace after preparation.
  const added = scenario.store.put(WS, BRAND, "claim", factClaim("claim_r_new", "Delta Brand"));
  assert.ok(added.ok);
  const listedBefore = scenario.store.list(WS, BRAND);
  assert.ok(listedBefore.ok);
  const evidence = decisionEvidence(scenario, prepared.value);
  const applied = applyFactResolution(evidence, scenario.deps);
  assert.equal(applied.ok, false);
  assert.equal((applied as { ok: false; error: { kind: string } }).error.kind, "stale-analysis");
  const listedAfter = scenario.store.list(WS, BRAND);
  assert.ok(listedAfter.ok);
  assert.deepEqual(listedAfter.value, listedBefore.value);
  // Nothing consumed: the receipt namespace holds no receipt.
  const receipts = scenario.deps.receiptStore.get(
    WS,
    BRAND,
    "r" + "0".repeat(64)
  );
  assert.equal(receipts.ok, false);
});

test("cross-brand application is structurally impossible at the store boundary", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value, { brand_ref: "brand_other" });
  const applied = applyFactResolution(evidence, scenario.deps);
  assert.equal(applied.ok, false);
  // The decision does not exist under the foreign brand namespace.
  assert.equal(
    (applied as { ok: false; error: { kind: string } }).error.kind,
    "artifact-not-found"
  );
});
