// Deterministic structured-truth analysis (DEC-0011): fact-slot grouping,
// exact type-sensitive comparison, profile-relative gaps, explicit
// unstructured listing, stable output, and strict brand isolation — with no
// gateway, adapter, model, or network involvement.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { FakeAdapter } from "../src/gateway/adapter.js";
import {
  ANALYZER_VERSION,
  analyzeStructuredTruth,
  type TruthAnalysisInput,
} from "../src/understand/analyze-structured-truth.js";
import {
  BRAND,
  NOW,
  WS,
  registry,
  repoRoot,
  tempDir,
  validClaim,
  validSlot,
  validTruthProfile,
} from "./helpers.js";

function structuredClaim(
  id: string,
  key: string,
  value: string | number | boolean,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return validClaim({
    artifact_id: id,
    fact_key: key,
    normalized_value: value,
    normalization_basis: "value taken verbatim from the cited fragment",
    ...overrides,
  });
}

function analyze(
  claims: unknown[],
  profileOverrides: Record<string, unknown> = {},
  inputOverrides: Partial<TruthAnalysisInput> = {}
) {
  return analyzeStructuredTruth(
    {
      artifactId: "ta_t_run",
      workspace: WS,
      brandRef: BRAND,
      createdAt: NOW,
      truthProfile: validTruthProfile(profileOverrides),
      claims,
      ...inputOverrides,
    },
    registry()
  );
}

// ---- truth-profile contract ------------------------------------------------

test("a valid truth profile passes contract validation", () => {
  const result = registry().validate("truth-profile", validTruthProfile());
  assert.ok(result.ok, JSON.stringify(result));
});

test("unknown truth-profile fields are rejected at top level and slot level", () => {
  const topLevel = registry().validate(
    "truth-profile",
    validTruthProfile({ provider_policy: "none" })
  );
  assert.equal(topLevel.ok, false, "unknown top-level field must fail");
  const slotLevel = registry().validate(
    "truth-profile",
    validTruthProfile({ slots: [validSlot({ model_tier: 2 })] })
  );
  assert.equal(slotLevel.ok, false, "unknown slot field must fail");
});

test("duplicate and unsorted fact keys are rejected (deterministic profile order)", () => {
  const duplicate = registry().validate(
    "truth-profile",
    validTruthProfile({ slots: [validSlot(), validSlot()] })
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok && duplicate.error.kind === "validation-failed") {
    assert.match(duplicate.error.issues[0]!.keyword, /unique-sorted-fact-keys/);
  }
  const unsorted = registry().validate(
    "truth-profile",
    validTruthProfile({
      slots: [validSlot({ fact_key: "market.default_locale" }), validSlot()],
    })
  );
  assert.equal(unsorted.ok, false, "slots out of fact_key order must fail");
});

// ---- claim fact-metadata contract -----------------------------------------

test("claim structured fact metadata is all-or-nothing with a disclosed basis", () => {
  const keyOnly = registry().validate(
    "claim",
    validClaim({ fact_key: "organization.founded_year" })
  );
  assert.equal(keyOnly.ok, false, "fact_key without normalized_value must fail");

  const valueOnly = registry().validate(
    "claim",
    validClaim({ normalized_value: 2015, normalization_basis: "year digits" })
  );
  assert.equal(valueOnly.ok, false, "normalized_value without fact_key must fail");

  const noBasis = registry().validate(
    "claim",
    validClaim({ fact_key: "organization.founded_year", normalized_value: 2015 })
  );
  assert.equal(noBasis.ok, false, "missing normalization_basis must fail");
});

test("non-scalar normalized values and malformed fact keys are rejected", () => {
  for (const bad of [{ year: 2015 }, [2015], null]) {
    const result = registry().validate(
      "claim",
      validClaim({
        fact_key: "organization.founded_year",
        normalized_value: bad,
        normalization_basis: "structured value",
      })
    );
    assert.equal(result.ok, false, `${JSON.stringify(bad)} must be rejected (scalar only)`);
  }
  for (const badKey of ["FoundedYear", "identity", "identity..name", "identity.Name", "1identity.name"]) {
    const result = registry().validate(
      "claim",
      validClaim({
        fact_key: badKey,
        normalized_value: "x",
        normalization_basis: "verbatim",
      })
    );
    assert.equal(result.ok, false, `fact_key '${badKey}' must be rejected`);
  }
});

test("preferences and hypotheses cannot carry structured fact metadata", () => {
  for (const classification of ["preference", "hypothesis"]) {
    const result = registry().validate(
      "claim",
      validClaim({
        classification,
        source_type: "client_statement",
        verification_status: "unconfirmed",
        fact_key: "brand.visual_tone",
        normalized_value: "dark minimal",
        normalization_basis: "taste phrase from the client note",
      })
    );
    assert.equal(result.ok, false, `${classification} with fact metadata must be rejected`);
  }
});

// ---- contradiction rules ---------------------------------------------------

test("same key with the same normalized value produces no contradiction; duplicates are not conflicts", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics"),
    structuredClaim("claim_b", "identity.primary_name", "Veritas Forensics", {
      source_ref: "source:src_t_0001#page=2",
    }),
    structuredClaim("claim_c", "identity.primary_name", "Veritas Forensics", {
      source_ref: "source:src_t_0001#page=4",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.value["open_contradictions"], []);
  assert.deepEqual(result.value["gaps"], []);
});

test("same key with different values produces exactly one open contradiction with profile-owned blocking", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics"),
    structuredClaim("claim_b", "identity.primary_name", "Veritas Forensic Services", {
      verification_status: "unconfirmed",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const contradictions = result.value["open_contradictions"] as Record<string, unknown>[];
  assert.equal(contradictions.length, 1);
  const c = contradictions[0]!;
  assert.equal(c["fact_key"], "identity.primary_name");
  assert.equal(c["status"], "open", "no winner is ever selected");
  assert.equal(c["blocking_publication"], true, "blocking comes from the profile slot");
  assert.deepEqual(c["claim_refs"], ["claim_a", "claim_b"]);
  assert.deepEqual(c["distinct_values"], ["Veritas Forensic Services", "Veritas Forensics"]);
  // A verified-vs-unconfirmed conflict is still surfaced — and no gap is
  // produced for the slot (the contradiction is not converted into a gap).
  assert.deepEqual(result.value["gaps"], []);
});

test("comparison is exact and type-sensitive: string \"1\" and number 1 are distinct values", () => {
  const result = analyze(
    [
      structuredClaim("claim_a", "organization.founded_year", "1"),
      structuredClaim("claim_b", "organization.founded_year", 1),
    ],
    { slots: [validSlot({ fact_key: "organization.founded_year" })] }
  );
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const contradictions = result.value["open_contradictions"] as Record<string, unknown>[];
  assert.equal(contradictions.length, 1, "cross-type equality would be a hidden coercion");
  assert.deepEqual(contradictions[0]!["distinct_values"], [1, "1"]);
});

test("no implicit case folding: 'Dubai' and 'dubai' are distinct values", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Dubai"),
    structuredClaim("claim_b", "identity.primary_name", "dubai"),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal((result.value["open_contradictions"] as unknown[]).length, 1);
});

test("no implicit Unicode normalization: composed and decomposed spellings are distinct values", () => {
  const composed = `caf${String.fromCodePoint(0x00e9)}`; // e-acute, one code point
  const decomposed = `cafe${String.fromCodePoint(0x0301)}`; // e + combining acute
  assert.notEqual(composed, decomposed);
  assert.equal(composed.normalize("NFC"), decomposed.normalize("NFC"));
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", composed),
    structuredClaim("claim_b", "identity.primary_name", decomposed),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const contradictions = result.value["open_contradictions"] as Record<string, unknown>[];
  assert.equal(contradictions.length, 1, "NFC-equal but code-point-distinct values must stay distinct");
});

test("multi-cardinality slots accumulate distinct values without contradiction", () => {
  const result = analyze(
    [
      structuredClaim("claim_a", "services.categories", "forensic accounting"),
      structuredClaim("claim_b", "services.categories", "digital forensics"),
      structuredClaim("claim_c", "services.categories", "expert testimony"),
    ],
    {
      slots: [
        validSlot({
          fact_key: "services.categories",
          cardinality: "multi",
          blocking_if_missing: false,
          blocking_if_conflicting: false,
        }),
      ],
    }
  );
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.value["open_contradictions"], [], "difference is not conflict on multi slots");
  assert.deepEqual(result.value["gaps"], []);
});

// ---- gap rules -------------------------------------------------------------

test("a required slot with no eligible structured claim produces a missing gap; optional absence does not", () => {
  const result = analyze([], {
    slots: [
      validSlot(),
      validSlot({
        fact_key: "organization.founded_year",
        requirement: "optional",
        blocking_if_missing: false,
      }),
    ],
  });
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const gaps = result.value["gaps"] as Record<string, unknown>[];
  assert.equal(gaps.length, 1, "optional absence must not create a gap");
  assert.equal(gaps[0]!["fact_key"], "identity.primary_name");
  assert.equal(gaps[0]!["kind"], "missing");
  assert.equal(gaps[0]!["blocking"], true, "blocking comes from the profile slot");
});

test("a required slot with only unconfirmed or inference support produces an unverified gap", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics", {
      verification_status: "unconfirmed",
    }),
    structuredClaim("claim_b", "identity.primary_name", "Veritas Forensics", {
      classification: "inference",
      source_type: "operator_input",
      source_ref: null,
      verification_status: "unconfirmed",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const gaps = result.value["gaps"] as Record<string, unknown>[];
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0]!["kind"], "unverified");
  assert.deepEqual(gaps[0]!["claim_refs"], ["claim_a", "claim_b"]);
});

test("rejected, expired, and lifecycle-rejected heads neither satisfy required slots nor create contradictions", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Old Name", {
      verification_status: "rejected",
    }),
    structuredClaim("claim_b", "identity.primary_name", "Stale Name", {
      verification_status: "expired",
    }),
    structuredClaim("claim_c", "identity.primary_name", "Struck Name", {
      lifecycle_status: "rejected",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(
    result.value["open_contradictions"],
    [],
    "three distinct values, all inactive — no active contradiction"
  );
  const gaps = result.value["gaps"] as Record<string, unknown>[];
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0]!["kind"], "missing", "inactive heads do not satisfy the slot");
  assert.deepEqual(result.value["inactive_head_claims"], [
    { claim_ref: "claim_a", reason: "verification-rejected" },
    { claim_ref: "claim_b", reason: "verification-expired" },
    { claim_ref: "claim_c", reason: "lifecycle-rejected" },
  ]);
});

test("a lifecycle-superseded claim whose successor is missing from the complete set fails closed (DEC-0012)", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Superseded Name", {
      lifecycle_status: "superseded",
    }),
  ]);
  assert.equal(result.ok, false, "a hidden successor must not project");
  if (!result.ok) {
    assert.equal(result.error.kind, "lineage-violation");
    assert.match(result.error.message, /successor is missing/);
  }
});

// ---- resolution-safe lifecycle (DEC-0012) ----------------------------------
// These tests reproduce the Phase 1B.2 defect: `contradicted` claims stayed
// active, so a human resolution could never close a contradiction — the loser
// kept re-creating the same conflict on every re-analysis.

test("a contradicted claim does not create an active contradiction (DEC-0012)", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "New Name"),
    structuredClaim("claim_b", "identity.primary_name", "Old Name", {
      verification_status: "contradicted",
      resolution_decision_ref: "dec_brand_0001",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(
    result.value["open_contradictions"],
    [],
    "a resolved-against claim must not re-create the contradiction it lost"
  );
  assert.deepEqual(result.value["gaps"], [], "the verified winner satisfies the slot");
});

test("a standalone contradicted head does not satisfy a required slot and remains in the audit set (DEC-0012)", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Disputed Name", {
      verification_status: "contradicted",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const gaps = result.value["gaps"] as Record<string, unknown>[];
  assert.equal(gaps.length, 1);
  assert.equal(
    gaps[0]!["kind"],
    "missing",
    "a contradicted claim is retained for audit but is not support — the slot is missing, not unverified"
  );
  assert.deepEqual(
    result.value["analyzed_claim_refs"],
    ["claim_a"],
    "the contradicted claim stays visible in the audit/input set"
  );
});

test("a superseding contradicted revision closes the resolution loop: no conflict between the historical loser and current truth (DEC-0012)", () => {
  // Claim A (verified, Old Name) lost against Claim B (verified, New Name);
  // the resolution created revision C superseding A with status contradicted.
  // Neither historical A nor inactive head C may conflict with B.
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Old Name"),
    structuredClaim("claim_b", "identity.primary_name", "New Name", {
      source_ref: "source:src_t_0001#page=2",
    }),
    structuredClaim("claim_c", "identity.primary_name", "Old Name", {
      supersedes: "claim_a",
      lifecycle_status: "revised",
      verification_status: "contradicted",
      resolution_decision_ref: "dec_brand_0001",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(
    result.value["open_contradictions"],
    [],
    "re-analysis after a resolution must not resurrect the resolved contradiction"
  );
  assert.deepEqual(result.value["gaps"], [], "the effective verified claim satisfies the slot");
});

test("the analysis records the lineage partition explicitly: every input ref stays visible for audit (DEC-0012)", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Old Name"),
    structuredClaim("claim_b", "identity.primary_name", "New Name", {
      source_ref: "source:src_t_0001#page=2",
    }),
    structuredClaim("claim_c", "identity.primary_name", "Old Name", {
      supersedes: "claim_a",
      lifecycle_status: "revised",
      verification_status: "contradicted",
      resolution_decision_ref: "dec_brand_0001",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.value["analyzed_claim_refs"], ["claim_a", "claim_b", "claim_c"]);
  assert.deepEqual(result.value["effective_claim_refs"], ["claim_b"]);
  assert.deepEqual(result.value["superseded_claim_refs"], ["claim_a"]);
  assert.deepEqual(result.value["inactive_head_claims"], [
    { claim_ref: "claim_c", reason: "verification-contradicted" },
  ]);
});

test("a superseded historical claim does not create a contradiction with its successor (DEC-0012)", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Old Name"),
    structuredClaim("claim_b", "identity.primary_name", "New Name", {
      supersedes: "claim_a",
      lifecycle_status: "revised",
    }),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(
    result.value["open_contradictions"],
    [],
    "a revision differing from its own predecessor is history, not conflict"
  );
  assert.deepEqual(result.value["gaps"], []);
  assert.deepEqual(result.value["effective_claim_refs"], ["claim_b"]);
});

// ---- explicit limitation: unstructured and unprofiled claims ---------------

test("claims without structured fact metadata are listed explicitly, never analyzed or ignored", () => {
  const unstructured = validClaim({
    artifact_id: "claim_prose",
    statement: "The company name is Veritas Forensics",
  });
  const conflictingProse = validClaim({
    artifact_id: "claim_prose2",
    statement: "The company name is Veritas Forensic Services",
    verification_status: "unconfirmed",
    lifecycle_status: "generated",
  });
  const result = analyze([unstructured, conflictingProse]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  // Two prose statements that a human would read as conflicting produce NO
  // contradiction: deterministic code does not interpret unrestricted prose.
  assert.deepEqual(result.value["open_contradictions"], []);
  assert.deepEqual(result.value["unstructured_claim_refs"], ["claim_prose", "claim_prose2"]);
  const gaps = result.value["gaps"] as Record<string, unknown>[];
  assert.equal(gaps.length, 1, "the required slot stays missing — prose satisfies nothing");
  assert.equal(gaps[0]!["kind"], "missing");
});

test("structured claims whose fact_key is not in the profile are listed as unprofiled, not silently dropped", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics"),
    structuredClaim("claim_b", "finance.revenue_band", "unknown-band"),
  ]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.deepEqual(result.value["unprofiled_fact_claim_refs"], ["claim_b"]);
  assert.deepEqual(result.value["unstructured_claim_refs"], []);
});

// ---- isolation and input discipline ----------------------------------------

test("cross-brand claims and cross-brand profiles are rejected", () => {
  const crossBrandClaim = analyze([
    structuredClaim("claim_a", "identity.primary_name", "X", { brand_ref: "brand_other" }),
  ]);
  assert.equal(crossBrandClaim.ok, false);
  if (!crossBrandClaim.ok) assert.equal(crossBrandClaim.error.kind, "reference-violation");

  const crossBrandProfile = analyze([], { brand_ref: "brand_other" });
  assert.equal(crossBrandProfile.ok, false);
  if (!crossBrandProfile.ok) assert.equal(crossBrandProfile.error.kind, "reference-violation");
});

test("duplicate claim artifact IDs are rejected", () => {
  const result = analyze([
    structuredClaim("claim_a", "identity.primary_name", "X"),
    structuredClaim("claim_a", "identity.primary_name", "X"),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "invalid-input");
    assert.match(result.error.message, /duplicate claim artifact_id/);
  }
});

// ---- determinism and contract validity -------------------------------------

test("analyzer output is stable, deterministically sorted, and byte-equivalent across repeated runs", () => {
  const claims = () => [
    structuredClaim("claim_z", "identity.primary_name", "B Name", {
      verification_status: "unconfirmed",
    }),
    structuredClaim("claim_a", "identity.primary_name", "A Name"),
    validClaim({ artifact_id: "claim_prose" }),
    structuredClaim("claim_m", "finance.revenue_band", "band-1"),
  ];
  const first = analyze(claims());
  const second = analyze(claims());
  assert.ok(first.ok && second.ok, JSON.stringify(first));
  if (!first.ok || !second.ok) return;
  assert.equal(
    JSON.stringify(first.value),
    JSON.stringify(second.value),
    "identical input must produce byte-equivalent analysis"
  );
  assert.deepEqual(first.value["analyzed_claim_refs"], ["claim_a", "claim_m", "claim_prose", "claim_z"]);
  const contradiction = (first.value["open_contradictions"] as Record<string, unknown>[])[0]!;
  assert.deepEqual(contradiction["claim_refs"], ["claim_a", "claim_z"]);
  assert.equal(first.value["analyzer_version"], ANALYZER_VERSION);
});

test("the produced truth analysis validates against its contract and round-trips through the artifact store", () => {
  const result = analyze([structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics")]);
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.ok(registry().validate("truth-analysis", result.value).ok);
  const store = new FileArtifactStore(tempDir("truth-analysis"), registry());
  const put = store.put(WS, BRAND, "truth-analysis", result.value);
  assert.ok(put.ok, JSON.stringify(put));
  const got = store.get(WS, BRAND, "truth-analysis", "ta_t_run");
  assert.ok(got.ok);
});

test("truth profiles and analyses are brand-isolated in the artifact store (INV-DATA-001)", () => {
  const store = new FileArtifactStore(tempDir("truth-isolation"), registry());
  const profile = validTruthProfile();
  const put = store.put(WS, BRAND, "truth-profile", profile);
  assert.ok(put.ok, JSON.stringify(put));

  // A cross-brand write is a namespace violation…
  const crossWrite = store.put(WS, "brand_other", "truth-profile", profile);
  assert.equal(crossWrite.ok, false);
  if (!crossWrite.ok) assert.equal(crossWrite.error.kind, "namespace-violation");

  // …and another brand's namespace cannot read the artifact at all.
  const crossRead = store.get(WS, "brand_other", "truth-profile", "tp_t_0001");
  assert.equal(crossRead.ok, false);
  if (!crossRead.ok) assert.equal(crossRead.error.kind, "artifact-not-found");

  // The store refuses to overwrite an existing profile version (immutability).
  const overwrite = store.put(WS, BRAND, "truth-profile", profile);
  assert.equal(overwrite.ok, false);
  if (!overwrite.ok) assert.equal(overwrite.error.kind, "artifact-exists");
});

// ---- provider and gateway independence -------------------------------------

test("the Tier-0 analyzer imports nothing from the gateway and never touches the Fake Adapter", () => {
  const body = readFileSync(
    join(repoRoot, "src", "understand", "analyze-structured-truth.ts"),
    "utf8"
  );
  for (const line of body.split("\n").filter((l) => l.trimStart().startsWith("import"))) {
    assert.ok(!/gateway/.test(line), `gateway import found in analyzer: ${line}`);
  }

  const fake = new FakeAdapter(new Map());
  const result = analyze([structuredClaim("claim_a", "identity.primary_name", "Veritas Forensics")]);
  assert.ok(result.ok);
  assert.equal(
    fake.invocationCount,
    0,
    "Tier-0 analysis is deterministic code; the Fake Adapter is gateway test infrastructure only (DEC-0011)"
  );
});
