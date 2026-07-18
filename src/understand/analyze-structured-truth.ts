// Tier-0 analyze-structured-truth: deterministic contradiction and gap analysis
// over EXPLICITLY structured fact slots (DEC-0011, DEC-0012, DEC-0013;
// skills/analyze-structured-truth.skill.yaml).
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
// Claim membership is STORE-AUTHORITATIVE (DEC-0013): the analyzer captures a
// verified claim snapshot of the exact workspace/brand namespace from the
// Artifact Store and analyzes that complete canonical set. A caller-supplied
// claims array is never accepted — supplying a subset used to hide an entire
// independent lineage (and its contradiction) without any dangling reference,
// so the legacy `claims`/`claim_refs` fields are rejected at runtime, not
// merely removed from the type. The produced analysis records the snapshot
// reference and aggregate claim-set digest; compilation reconciles them
// against the live store and fails closed when the canonical set has changed.
//
// Current truth is a lineage projection over that canonical set (DEC-0012):
// superseded historical revisions and inactive heads (contradicted, rejected,
// expired, lifecycle-rejected) are recorded explicitly for audit but create no
// contradictions and satisfy no slots. Claims WITHOUT structured fact
// metadata are listed under unstructured_claim_refs (effective claims only) —
// never keyword-parsed, text-compared, silently ignored, or converted into
// assumptions (semantic prose interpretation stays prohibited, DEC-0009).
//
// No gateway, adapter, model, provider, or network involvement exists here —
// the Fake Adapter is gateway test infrastructure and is never used to
// simulate intelligence (DEC-0011).
import type { FileArtifactStore } from "../kernel/artifact-store.js";
import { captureClaimSnapshot } from "../kernel/claim-snapshot.js";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";
import { projectActiveClaims } from "./project-active-claims.js";

export const ANALYZER_VERSION = "analyze-structured-truth-2.0.0";

export interface TruthAnalysisInput {
  /** artifact_id for the produced truth-analysis artifact. */
  artifactId: string;
  /** artifact_id for the captured claim-snapshot artifact. */
  snapshotArtifactId: string;
  workspace: string;
  brandRef: string;
  /** Injected clock — capture and analysis never read the system time. */
  createdAt: string;
  /** Contract-valid truth-profile artifact; stays unknown until validated. */
  truthProfile: unknown;
}

export interface TruthAnalysisOutput {
  /** Contract-valid truth-analysis artifact (not yet persisted). */
  analysis: Record<string, unknown>;
  /** The claim-snapshot the analysis is bound to (not yet persisted). */
  snapshot: Record<string, unknown>;
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

export function analyzeStructuredTruth(
  input: TruthAnalysisInput,
  store: FileArtifactStore,
  registry: ContractRegistry
): Result<TruthAnalysisOutput> {
  // 0. The legacy caller-supplied claim set is rejected at runtime (DEC-0013):
  //    a subset with no dangling reference could silently omit an entire
  //    independent lineage — omission is not resolution. This guards
  //    JavaScript callers, not only the TypeScript surface.
  for (const legacyField of ["claims", "claim_refs"]) {
    if (legacyField in (input as unknown as Record<string, unknown>)) {
      return err({
        kind: "invalid-input",
        message: `caller-supplied '${legacyField}' is rejected: canonical claim membership comes from the Artifact Store snapshot of ${input.workspace}/${input.brandRef}, never from a caller-selected array (DEC-0013)`,
      });
    }
  }

  // 1. Boundary validation: the profile is contract-validated (schema +
  //    semantic) before anything is read from it (INV-DET-001), and it must
  //    belong to the analysis brand (INV-DATA-001).
  const profileResult = registry.validate("truth-profile", input.truthProfile);
  if (!profileResult.ok) return profileResult;
  const profile = profileResult.value;
  if (profile["brand_ref"] !== input.brandRef) {
    return err({
      kind: "reference-violation",
      message: `truth profile '${String(profile["artifact_id"])}' carries brand_ref '${String(profile["brand_ref"])}', expected '${input.brandRef}' (workspace '${input.workspace}'); cross-brand profiles are rejected`,
    });
  }

  // 2. Store-authoritative claim snapshot (DEC-0013): strict fail-closed
  //    enumeration, per-claim contract validation, stable-capture check, and
  //    digest binding all live in the capture — the analyzer holds no copy.
  const captured = captureClaimSnapshot(
    {
      artifactId: input.snapshotArtifactId,
      workspace: input.workspace,
      brandRef: input.brandRef,
      createdAt: input.createdAt,
    },
    store,
    registry
  );
  if (!captured.ok) return captured;
  const { snapshot, claims } = captured.value;

  // 3. Lineage projection (DEC-0012): derive effective current truth from
  //    lineage heads over the canonical set. Cycles, self-supersession,
  //    dangling references, ambiguous forks, and hidden successors fail
  //    closed inside the projection (defense in depth over store lineage
  //    rules — tampered namespaces must not project).
  const projected = projectActiveClaims(
    { workspace: input.workspace, brandRef: input.brandRef, claims },
    registry
  );
  if (!projected.ok) return projected;
  const projection = projected.value;
  const effectiveClaims = projection.effectiveClaimRefs.map(
    (id) => projection.claimById.get(id)!
  );

  const slots = profile["slots"] as unknown as ProfileSlot[];
  const slotByKey = new Map(slots.map((s) => [s.fact_key, s]));

  // 4. Partition EFFECTIVE claims: structured (explicit fact metadata) vs
  //    unstructured; structured claims split into profiled and unprofiled
  //    fact keys. Superseded and inactive claims are audit entries only.
  const unstructuredRefs: string[] = [];
  const unprofiledRefs: string[] = [];
  const byFactKey = new Map<string, Record<string, unknown>[]>();
  for (const c of effectiveClaims) {
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

  // 5. Per-slot deterministic analysis over effective claims. A conflict
  //    between verified and unconfirmed effective claims is still surfaced —
  //    the analyzer never selects a winner.
  const contradictions: Record<string, unknown>[] = [];
  const gaps: Record<string, unknown>[] = [];
  for (const slot of slots) {
    const eligible = byFactKey.get(slot.fact_key) ?? [];

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
    // silently converted into a missing fact. Inactive heads (including
    // contradicted claims) supply nothing here — a slot whose only support
    // lost a resolution is missing, not unverified (DEC-0012). A zero-claim
    // namespace deterministically yields missing gaps for required slots.
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
  //    emerged sorted; the projection's collections are already code-unit
  //    sorted. The complete canonical set stays recorded (audit); the
  //    snapshot reference and digest bind the analysis to the exact claims
  //    loaded (DEC-0013).
  const artifact: Record<string, unknown> = {
    schema_version: "1.7.0",
    artifact_id: input.artifactId,
    brand_ref: input.brandRef,
    created_at: input.createdAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    truth_profile_ref: String(profile["artifact_id"]),
    claim_snapshot_ref: input.snapshotArtifactId,
    claim_set_digest: String(snapshot["claim_set_digest"]),
    analyzer_version: ANALYZER_VERSION,
    analyzed_claim_refs: projection.inputClaimRefs,
    effective_claim_refs: projection.effectiveClaimRefs,
    superseded_claim_refs: projection.supersededClaimRefs,
    inactive_head_claims: projection.inactiveHeadClaims.map((c) => ({
      claim_ref: c.claim_ref,
      reason: c.reason,
    })),
    open_contradictions: contradictions,
    gaps,
    unstructured_claim_refs: unstructuredRefs.sort(byCodeUnit),
    unprofiled_fact_claim_refs: unprofiledRefs.sort(byCodeUnit),
  };

  // 7. The analysis itself is validated before it can be stored or returned.
  const validated = registry.validate("truth-analysis", artifact);
  if (!validated.ok) return validated;
  return ok({ analysis: validated.value, snapshot });
}
