// Tier-0 analyze-structured-truth: deterministic contradiction and gap analysis
// over EXPLICITLY structured fact slots (DEC-0011; skills/analyze-structured-truth.skill.yaml).
//
// This is analysis of structured truth, not extraction: only claims carrying
// explicit fact metadata (fact_key + normalized_value + normalization_basis)
// participate; normalized scalar values are compared exactly and
// type-sensitively (string "1" differs from number 1; no case folding, no
// Unicode normalization, no unit conversion, no fuzzy matching — any
// normalization happened upstream and is disclosed in normalization_basis).
// Gaps exist only relative to the supplied versioned truth profile; blocking
// status comes only from the profile. Contradictions stay open — deterministic
// code never selects which conflicting claim is true (INV-HUM-001(3)).
//
// Claims WITHOUT structured fact metadata are listed under
// unstructured_claim_refs. They are never keyword-parsed, text-compared,
// silently ignored, or converted into assumptions: detecting semantic
// contradictions in unrestricted prose is out of this capability's scope and
// remains prohibited pending a provider-enablement decision (DEC-0009).
//
// No gateway, adapter, model, provider, or network involvement exists here —
// the Fake Adapter is gateway test infrastructure and is never used to
// simulate intelligence (DEC-0011).
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";

export const ANALYZER_VERSION = "analyze-structured-truth-1.0.0";

export interface TruthAnalysisInput {
  artifactId: string;
  workspace: string;
  brandRef: string;
  createdAt: string;
  /** Contract-valid truth-profile artifact; stays unknown until validated. */
  truthProfile: unknown;
  /** Contract-valid claim artifacts; stay unknown until validated. */
  claims: unknown[];
}

interface ProfileSlot {
  fact_key: string;
  description: string;
  cardinality: "single" | "multi";
  requirement: "required" | "optional";
  why_needed: string;
  blocking_if_missing: boolean;
  blocking_if_conflicting: boolean;
}

// Deterministic code-unit string comparison — never locale-dependent collation.
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// A claim whose verification or lifecycle state retired it must not create
// active contradictions or satisfy required slots (DEC-0011). Claims marked
// `contradicted` still participate: surfacing an unresolved-looking conflict is
// conservative, and hiding it would be an undisclosed filtering heuristic.
const INACTIVE_VERIFICATION = new Set(["rejected", "expired"]);
const INACTIVE_LIFECYCLE = new Set(["rejected", "superseded"]);

export function analyzeStructuredTruth(
  input: TruthAnalysisInput,
  registry: ContractRegistry
): Result<Record<string, unknown>> {
  // 1. Boundary validation: profile and every claim are contract-validated
  //    (schema + semantic) before anything is read from them (INV-DET-001).
  const profileResult = registry.validate("truth-profile", input.truthProfile);
  if (!profileResult.ok) return profileResult;
  const profile = profileResult.value;
  const claims: Record<string, unknown>[] = [];
  for (const c of input.claims) {
    const v = registry.validate("claim", c);
    if (!v.ok) return v;
    claims.push(v.value);
  }

  // 2. Brand isolation (INV-DATA-001): the profile and every claim must belong
  //    to the analysis brand.
  if (profile["brand_ref"] !== input.brandRef) {
    return err({
      kind: "reference-violation",
      message: `truth profile '${String(profile["artifact_id"])}' carries brand_ref '${String(profile["brand_ref"])}', expected '${input.brandRef}' (workspace '${input.workspace}'); cross-brand profiles are rejected`,
    });
  }
  for (const c of claims) {
    if (c["brand_ref"] !== input.brandRef) {
      return err({
        kind: "reference-violation",
        message: `claim '${String(c["artifact_id"])}' carries brand_ref '${String(c["brand_ref"])}', expected '${input.brandRef}' (workspace '${input.workspace}'); cross-brand claims are rejected`,
      });
    }
  }

  // 3. Duplicate claim artifacts are rejected — one claim, one reference.
  const seenIds = new Set<string>();
  for (const c of claims) {
    const id = String(c["artifact_id"]);
    if (seenIds.has(id)) {
      return err({
        kind: "invalid-input",
        message: `duplicate claim artifact_id '${id}' in the analysis input; each claim participates exactly once`,
      });
    }
    seenIds.add(id);
  }

  const slots = profile["slots"] as unknown as ProfileSlot[];
  const slotByKey = new Map(slots.map((s) => [s.fact_key, s]));

  // 4. Partition claims: structured (explicit fact metadata) vs unstructured;
  //    structured claims split into profiled and unprofiled fact keys.
  const unstructuredRefs: string[] = [];
  const unprofiledRefs: string[] = [];
  const byFactKey = new Map<string, Record<string, unknown>[]>();
  for (const c of claims) {
    const id = String(c["artifact_id"]);
    if (typeof c["fact_key"] !== "string") {
      unstructuredRefs.push(id);
      continue;
    }
    const key = c["fact_key"];
    if (!slotByKey.has(key)) {
      unprofiledRefs.push(id);
      continue;
    }
    const group = byFactKey.get(key);
    if (group) group.push(c);
    else byFactKey.set(key, [c]);
  }

  // 5. Per-slot deterministic analysis. Eligibility excludes retired claims;
  //    a conflict between verified and unconfirmed claims is still surfaced —
  //    the analyzer never selects a winner.
  const contradictions: Record<string, unknown>[] = [];
  const gaps: Record<string, unknown>[] = [];
  for (const slot of slots) {
    const group = byFactKey.get(slot.fact_key) ?? [];
    const eligible = group.filter(
      (c) =>
        !INACTIVE_VERIFICATION.has(String(c["verification_status"])) &&
        !INACTIVE_LIFECYCLE.has(String(c["lifecycle_status"]))
    );

    // Exact, type-sensitive distinctness: string "1" and number 1 are two
    // values; identical duplicates collapse to one and are not contradictions.
    const distinct = new Map<string, string | number | boolean>();
    for (const c of eligible) {
      const value = c["normalized_value"] as string | number | boolean;
      distinct.set(`${typeof value}:${JSON.stringify(value)}`, value);
    }

    let contradicted = false;
    if (slot.cardinality === "single" && distinct.size >= 2) {
      // Multi slots accumulate distinct values without conflict — no invented
      // closed-world semantics (DEC-0011).
      contradicted = true;
      const values = [...distinct.entries()]
        .sort(([a], [b]) => byCodeUnit(a, b))
        .map(([, v]) => v);
      contradictions.push({
        fact_key: slot.fact_key,
        claim_refs: eligible.map((c) => String(c["artifact_id"])).sort(byCodeUnit),
        distinct_values: values,
        description: `single-cardinality fact slot '${slot.fact_key}' carries ${distinct.size} distinct normalized values across ${eligible.length} eligible claims; resolution requires a human decision`,
        blocking_publication: slot.blocking_if_conflicting,
        status: "open",
      });
    }

    // Gap logic applies to required slots only: absence from an optional slot
    // is not a gap, and absence from the profile is not evidence of universal
    // requirement. An open contradiction is surfaced as a contradiction, never
    // silently converted into a missing fact.
    if (slot.requirement !== "required" || contradicted) continue;
    if (eligible.length === 0) {
      gaps.push({
        fact_key: slot.fact_key,
        kind: "missing",
        what: `no eligible structured claim supplies required fact slot '${slot.fact_key}'`,
        why_needed: slot.why_needed,
        blocking: slot.blocking_if_missing,
        claim_refs: [],
      });
    } else if (!eligible.some((c) => c["verification_status"] === "verified")) {
      gaps.push({
        fact_key: slot.fact_key,
        kind: "unverified",
        what: `required fact slot '${slot.fact_key}' has only unconfirmed or inference support where verified truth is required`,
        why_needed: slot.why_needed,
        blocking: slot.blocking_if_missing,
        claim_refs: eligible.map((c) => String(c["artifact_id"])).sort(byCodeUnit),
      });
    }
  }

  // 6. Stable, deterministically sorted output. Slots are already sorted by
  //    fact_key (truth-profile semantic layer), so contradictions and gaps
  //    emerged sorted; claim-reference lists are sorted explicitly.
  const artifact: Record<string, unknown> = {
    schema_version: "1.4.0",
    artifact_id: input.artifactId,
    brand_ref: input.brandRef,
    created_at: input.createdAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    truth_profile_ref: String(profile["artifact_id"]),
    analyzer_version: ANALYZER_VERSION,
    analyzed_claim_refs: claims.map((c) => String(c["artifact_id"])).sort(byCodeUnit),
    open_contradictions: contradictions,
    gaps,
    unstructured_claim_refs: unstructuredRefs.sort(byCodeUnit),
    unprofiled_fact_claim_refs: unprofiledRefs.sort(byCodeUnit),
  };

  // 7. The analysis itself is validated before it can be stored or returned.
  return registry.validate("truth-analysis", artifact);
}
