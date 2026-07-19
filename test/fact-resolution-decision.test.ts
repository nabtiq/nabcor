// Decision-preparation boundary tests (DEC-0016): the immutable signed
// target is derived from store references only, and every substitution,
// omission, staleness, fork, and tamper path fails closed before anything
// can be signed.
import assert from "node:assert/strict";
import test from "node:test";
import { prepareFactResolutionDecision } from "../src/resolve/prepare-decision.js";
import { contradictionFingerprint, successorIdFor } from "../src/resolve/resolution-ids.js";
import { BRAND, NOW, WS, registry, snapshotFor, validSlot, validTruthProfile } from "./helpers.js";
import {
  ANALYSIS_ID,
  DECISION_ID,
  FACT_KEY,
  contentDigest,
  factClaim,
  fingerprintOf,
  prepareDecision,
  resolutionScenario,
} from "./resolution-helpers.js";

function expectFailure(result: { ok: boolean }, kind: string, pattern?: RegExp): void {
  assert.equal(result.ok, false, `expected ${kind} failure, got success`);
  const error = (result as { ok: false; error: { kind: string; message?: string } }).error;
  assert.equal(error.kind, kind, `expected ${kind}, got ${error.kind}: ${error.message}`);
  if (pattern) assert.match(String(error.message), pattern);
}

test("a valid two-claim contradiction prepares a stored, digest-pinned decision with derived losers", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok, JSON.stringify(prepared));
  const decision = prepared.value.decision;
  assert.equal(decision["artifact_id"], DECISION_ID);
  assert.equal(decision["winning_claim_ref"], "claim_r_win");
  assert.deepEqual(
    (decision["losing_claims"] as { claim_ref: string }[]).map((l) => l.claim_ref),
    ["claim_r_lose"]
  );
  assert.equal(decision["fact_key"], FACT_KEY);
  assert.equal(decision["contradiction_fingerprint"], scenario.fingerprint);
  // Digests pin the exact artifacts the human will sign against.
  assert.equal(decision["truth_analysis_digest"], contentDigest(scenario.analysis));
  assert.equal(decision["claim_snapshot_digest"], contentDigest(scenario.snapshot));
  assert.equal(decision["claim_set_digest"], scenario.analysis["claim_set_digest"]);
  const winner = scenario.store.get(WS, BRAND, "claim", "claim_r_win");
  assert.ok(winner.ok);
  assert.equal(decision["winning_claim_digest"], contentDigest(winner.value));
  // The stored artifact is what the digest covers.
  const stored = scenario.store.get(WS, BRAND, "fact-resolution-decision", DECISION_ID);
  assert.ok(stored.ok);
  assert.equal(contentDigest(stored.value), prepared.value.decisionDigest);
});

test("a contradiction with more than two claims derives every non-winner as a loser", () => {
  const scenario = resolutionScenario({
    claims: [
      factClaim("claim_r_a", "Alpha Brand"),
      factClaim("claim_r_b", "Beta Brand"),
      factClaim("claim_r_c", "Gamma Brand"),
    ],
  });
  const prepared = prepareDecision(scenario, { winningClaimRef: "claim_r_b" });
  assert.ok(prepared.ok, JSON.stringify(prepared));
  assert.deepEqual(
    (prepared.value.decision["losing_claims"] as { claim_ref: string }[]).map((l) => l.claim_ref),
    ["claim_r_a", "claim_r_c"]
  );
});

test("a winner outside the contradiction is rejected", () => {
  const scenario = resolutionScenario({
    claims: [
      factClaim("claim_r_win", "Alpha Brand"),
      factClaim("claim_r_lose", "Beta Brand"),
      // An unrelated unstructured claim is canonical but not a participant.
      factClaim("claim_r_other", "Other", {
        artifact_id: "claim_r_other",
        fact_key: undefined,
        normalized_value: undefined,
        normalization_basis: undefined,
      }),
    ],
  });
  const prepared = prepareDecision(scenario, { winningClaimRef: "claim_r_other" });
  expectFailure(prepared, "reference-violation", /not a participant/);
});

test("a wrong fact key finds no open contradiction", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario, { factKey: "identity.legal_name" });
  expectFailure(prepared, "reference-violation", /no open contradiction/);
});

test("a namespace without contradictions has nothing to resolve", () => {
  const scenario = resolutionScenario({
    claims: [factClaim("claim_r_only", "Alpha Brand")],
  });
  assert.throws(() => fingerprintOf(scenario.analysis, FACT_KEY));
  const prepared = prepareFactResolutionDecision(
    {
      decisionArtifactId: DECISION_ID,
      workspace: WS,
      brandRef: BRAND,
      truthAnalysisRef: ANALYSIS_ID,
      factKey: FACT_KEY,
      contradictionFingerprint: "c" + "0".repeat(64),
      winningClaimRef: "claim_r_only",
      rationale: "nothing is actually open",
      requesterId: "po-test-owner",
      createdAt: NOW,
    },
    scenario.store,
    registry()
  );
  expectFailure(prepared, "reference-violation", /no open contradiction/);
});

test("a tampered or stale contradiction fingerprint is rejected", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario, {
    contradictionFingerprint: "c" + "0".repeat(64),
  });
  expectFailure(prepared, "reference-violation", /fingerprint/);
});

test("caller-supplied contradiction, losers, or digests are rejected at runtime", () => {
  const scenario = resolutionScenario();
  for (const field of ["contradiction", "losingClaimRefs", "losing_claims", "claims", "digests"]) {
    const prepared = prepareDecision(scenario, {
      [field]: [{ claim_ref: "claim_r_lose" }],
    } as never);
    expectFailure(prepared, "invalid-input", /rejected/);
  }
});

test("a multi-cardinality fact slot is not resolvable even if an analysis asserts a contradiction", () => {
  // The analyzer never produces a contradiction for a multi slot, so this
  // fabricates one: the preparation boundary must still refuse it.
  const claims = [factClaim("claim_r_win", "Alpha Brand"), factClaim("claim_r_lose", "Beta Brand")];
  const scenario = resolutionScenario({
    claims,
    profile: validTruthProfile({
      artifact_id: "tp_t_0001",
      slots: [validSlot({ cardinality: "multi" })],
    }),
  });
  // The genuine analysis has no contradiction (multi slots accumulate).
  assert.deepEqual(scenario.analysis["open_contradictions"], []);
  const fabricated = {
    ...scenario.analysis,
    artifact_id: "ta_r_forged",
    open_contradictions: [
      {
        fact_key: FACT_KEY,
        claim_refs: ["claim_r_lose", "claim_r_win"],
        distinct_values: ["Alpha Brand", "Beta Brand"],
        description: "fabricated multi-slot contradiction",
        blocking_publication: true,
        status: "open",
      },
    ],
  };
  const put = scenario.store.put(WS, BRAND, "truth-analysis", fabricated);
  assert.ok(put.ok, JSON.stringify(put));
  const prepared = prepareDecision(scenario, {
    truthAnalysisRef: "ta_r_forged",
    contradictionFingerprint: contradictionFingerprint(WS, BRAND, FACT_KEY, ["claim_r_lose", "claim_r_win"], ["Alpha Brand", "Beta Brand"]),
  });
  expectFailure(prepared, "reference-violation", /cardinality 'multi'/);
});

test("cross-brand and cross-workspace artifacts cannot participate", () => {
  const scenario = resolutionScenario();
  // The analysis lives in brand_test; asking for it under another brand
  // namespace fails at the store boundary (no cross-brand reads).
  const foreignBrand = prepareFactResolutionDecision(
    {
      decisionArtifactId: DECISION_ID,
      workspace: WS,
      brandRef: "brand_other",
      truthAnalysisRef: ANALYSIS_ID,
      factKey: FACT_KEY,
      contradictionFingerprint: scenario.fingerprint,
      winningClaimRef: "claim_r_win",
      rationale: "cross-brand attempt",
      requesterId: "po-test-owner",
      createdAt: NOW,
    },
    scenario.store,
    registry()
  );
  assert.equal(foreignBrand.ok, false);
  const foreignWorkspace = prepareFactResolutionDecision(
    {
      decisionArtifactId: DECISION_ID,
      workspace: "ws_other",
      brandRef: BRAND,
      truthAnalysisRef: ANALYSIS_ID,
      factKey: FACT_KEY,
      contradictionFingerprint: scenario.fingerprint,
      winningClaimRef: "claim_r_win",
      rationale: "cross-workspace attempt",
      requesterId: "po-test-owner",
      createdAt: NOW,
    },
    scenario.store,
    registry()
  );
  assert.equal(foreignWorkspace.ok, false);
});

test("a claim-set change after analysis makes preparation fail closed as stale", () => {
  const scenario = resolutionScenario();
  const added = scenario.store.put(
    WS,
    BRAND,
    "claim",
    factClaim("claim_r_new", "Delta Brand")
  );
  assert.ok(added.ok);
  const prepared = prepareDecision(scenario);
  expectFailure(prepared, "stale-analysis", /changed after truth analysis/);
});

test("an analysis not bound to its snapshot digest is rejected", () => {
  const scenario = resolutionScenario();
  const fabricated = {
    ...scenario.analysis,
    artifact_id: "ta_r_unbound",
    claim_set_digest: "sha256:" + "0".repeat(64),
  };
  const put = scenario.store.put(WS, BRAND, "truth-analysis", fabricated);
  assert.ok(put.ok, JSON.stringify(put));
  const prepared = prepareDecision(scenario, { truthAnalysisRef: "ta_r_unbound" });
  expectFailure(prepared, "stale-analysis", /not bound to the snapshot/);
});

test("a fabricated analysis promoting a superseded claim as effective is rejected against the derived projection", () => {
  const predecessor = factClaim("claim_r_old", "Alpha Brand");
  const successor = factClaim("claim_r_win", "Alpha Brand", {
    supersedes: "claim_r_old",
  });
  const rival = factClaim("claim_r_lose", "Beta Brand");
  const scenario = resolutionScenario({ claims: [predecessor, successor, rival] });
  // Fabricate an analysis that declares the superseded predecessor effective
  // and a participant, with an internally consistent partition.
  const refs = ["claim_r_lose", "claim_r_old", "claim_r_win"];
  const fabricated = {
    ...scenario.analysis,
    artifact_id: "ta_r_promoted",
    analyzed_claim_refs: refs,
    effective_claim_refs: refs,
    superseded_claim_refs: [],
    inactive_head_claims: [],
    open_contradictions: [
      {
        fact_key: FACT_KEY,
        claim_refs: ["claim_r_lose", "claim_r_old"],
        distinct_values: ["Alpha Brand", "Beta Brand"],
        description: "fabricated contradiction over a superseded claim",
        blocking_publication: true,
        status: "open",
      },
    ],
    unprofiled_fact_claim_refs: [],
    unstructured_claim_refs: [],
    gaps: [],
  };
  const put = scenario.store.put(WS, BRAND, "truth-analysis", fabricated);
  assert.ok(put.ok, JSON.stringify(put));
  const prepared = prepareDecision(scenario, {
    truthAnalysisRef: "ta_r_promoted",
    factKey: FACT_KEY,
    winningClaimRef: "claim_r_old",
    contradictionFingerprint: contradictionFingerprint(WS, BRAND, FACT_KEY, ["claim_r_lose", "claim_r_old"], ["Alpha Brand", "Beta Brand"]),
  });
  expectFailure(prepared, "reference-violation", /does not match the lineage projection/);
});

test("an unresolved lineage fork in the namespace fails closed during preparation", () => {
  // The genuine analyzer refuses forked namespaces outright, so a decision
  // can never be prepared from a real analysis of one. This fabricates a
  // partition-consistent analysis AND a digest-consistent snapshot over the
  // forked namespace to prove the preparation boundary itself still fails
  // closed at the lineage projection.
  const scenario = resolutionScenario();
  const base = factClaim("claim_r_base", "Alpha Brand");
  const forkA = factClaim("claim_r_forka", "Alpha Brand", { supersedes: "claim_r_base" });
  const forkB = factClaim("claim_r_forkb", "Alpha Prime", { supersedes: "claim_r_base" });
  for (const c of [base, forkA, forkB]) {
    const put = scenario.store.put(WS, BRAND, "claim", c);
    assert.ok(put.ok, JSON.stringify(put));
  }
  const allClaims = [
    base,
    forkA,
    forkB,
    factClaim("claim_r_lose", "Beta Brand"),
    factClaim("claim_r_win", "Alpha Brand"),
  ];
  const forkedSnapshot = snapshotFor(allClaims, { artifact_id: "snap_r_forked" });
  const snapPut = scenario.store.put(WS, BRAND, "claim-snapshot", forkedSnapshot);
  assert.ok(snapPut.ok, JSON.stringify(snapPut));
  const refs = ["claim_r_base", "claim_r_forka", "claim_r_forkb", "claim_r_lose", "claim_r_win"];
  const contradictionRefs = ["claim_r_forka", "claim_r_lose"];
  const fabricated = {
    ...scenario.analysis,
    artifact_id: "ta_r_forked",
    claim_snapshot_ref: "snap_r_forked",
    claim_set_digest: String(forkedSnapshot["claim_set_digest"]),
    analyzed_claim_refs: refs,
    effective_claim_refs: ["claim_r_forka", "claim_r_forkb", "claim_r_lose", "claim_r_win"],
    superseded_claim_refs: ["claim_r_base"],
    inactive_head_claims: [],
    open_contradictions: [
      {
        fact_key: FACT_KEY,
        claim_refs: contradictionRefs,
        distinct_values: ["Alpha Brand", "Beta Brand"],
        description: "fabricated contradiction in a forked namespace",
        blocking_publication: true,
        status: "open",
      },
    ],
    unprofiled_fact_claim_refs: [],
    unstructured_claim_refs: [],
    gaps: [],
  };
  const put = scenario.store.put(WS, BRAND, "truth-analysis", fabricated);
  assert.ok(put.ok, JSON.stringify(put));
  const prepared = prepareDecision(scenario, {
    truthAnalysisRef: "ta_r_forked",
    winningClaimRef: "claim_r_forka",
    contradictionFingerprint: contradictionFingerprint(
      WS,
      BRAND,
      FACT_KEY,
      contradictionRefs,
      ["Alpha Brand", "Beta Brand"]
    ),
  });
  expectFailure(prepared, "lineage-violation", /both supersede/);
});

test("the runtime contract mirror rejects loser omission, injection, duplication, and winner-as-loser", () => {
  const scenario = resolutionScenario({
    claims: [
      factClaim("claim_r_a", "Alpha Brand"),
      factClaim("claim_r_b", "Beta Brand"),
      factClaim("claim_r_c", "Gamma Brand"),
    ],
  });
  const prepared = prepareDecision(scenario, { winningClaimRef: "claim_r_a" });
  assert.ok(prepared.ok);
  const good = prepared.value.decision;
  const losers = good["losing_claims"] as { claim_ref: string; content_digest: string }[];

  const cases: [string, Record<string, unknown>][] = [
    ["loser omitted", { ...good, losing_claims: losers.slice(0, 1) }],
    [
      "extra loser injected",
      {
        ...good,
        losing_claims: [...losers, { claim_ref: "claim_r_z", content_digest: losers[0]!.content_digest }],
      },
    ],
    [
      "winner listed as loser",
      {
        ...good,
        losing_claims: [
          { claim_ref: "claim_r_a", content_digest: String(good["winning_claim_digest"]) },
          ...losers,
        ],
      },
    ],
    [
      "duplicate loser",
      { ...good, losing_claims: [losers[0]!, losers[0]!, losers[1]!] },
    ],
  ];
  for (const [label, tampered] of cases) {
    const validated = registry().validate("fact-resolution-decision", tampered);
    assert.equal(validated.ok, false, `${label} must fail validation`);
  }
});

test("preparing the same decision ID twice hits the immutable no-overwrite rule", () => {
  const scenario = resolutionScenario();
  const first = prepareDecision(scenario);
  assert.ok(first.ok);
  const second = prepareDecision(scenario);
  expectFailure(second, "artifact-exists");
});

test("unsafe workspace identifiers cannot traverse the store namespace", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario, { workspace: "../escape" } as never);
  expectFailure(prepared, "unsafe-identifier");
});

test("successor identity derivation is stable and collision-scoped by losing claim", () => {
  assert.equal(
    successorIdFor("fraX", "claim_a"),
    successorIdFor("fraX", "claim_a")
  );
  assert.notEqual(successorIdFor("fraX", "claim_a"), successorIdFor("fraX", "claim_b"));
  assert.notEqual(successorIdFor("fraX", "claim_a"), successorIdFor("fraY", "claim_a"));
});
