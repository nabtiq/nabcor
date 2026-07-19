// Deterministic fact-resolution decision preparation (DEC-0016).
//
// Turns a REFERENCE to one open contradiction into the immutable artifact
// the Product Owner signs: the complete requested action. The boundary
// accepts references only — never caller-supplied contradiction arrays,
// winners-with-losers lists, or precomputed digests — and re-derives and
// proves everything from the authoritative Artifact Store:
//
//   - the truth analysis, its claim snapshot, and the truth profile all load
//     from the exact workspace/brand namespace (store.get enforces contract
//     validity, brand isolation, and address integrity);
//   - the analysis must be bound to its snapshot (claim_set_digest match)
//     and CURRENT: the canonical namespace is re-captured and any membership
//     or content change fails closed as stale-analysis (DEC-0013);
//   - the analysis's declared lineage partition is re-derived from the
//     canonical claims (projectActiveClaims) and must agree — a fabricated
//     analysis cannot smuggle a non-head or resolved claim in as a
//     participant, and unresolved lineage forks fail closed inside the
//     projection;
//   - the selected contradiction must exist, be open, belong to the given
//     fact_key, match the caller's expected deterministic fingerprint, and
//     sit on a single-cardinality profile slot;
//   - the winner must be a participant; the losers are DERIVED as every
//     other participant, exactly once (exact partition — partial resolution
//     is unrepresentable).
//
// The produced artifact pins content digests of the analysis, snapshot,
// profile, winner, and every loser, plus the snapshot's aggregate claim-set
// digest, and is validated and persisted immutably; its canonical content
// digest is what the approval evidence must sign. Preparation applies no
// resolution and consumes no approval.
import type { FileArtifactStore } from "../kernel/artifact-store.js";
import { captureClaimSnapshot } from "../kernel/claim-snapshot.js";
import { contentDigest } from "../kernel/canonical-json.js";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";
import { projectActiveClaims } from "../understand/project-active-claims.js";
import { FINGERPRINT_ALGORITHM, contradictionFingerprint } from "./resolution-ids.js";

export interface DecisionPreparationInput {
  /** artifact_id for the produced fact-resolution-decision artifact. */
  decisionArtifactId: string;
  workspace: string;
  brandRef: string;
  /** artifact_id of the persisted truth analysis holding the contradiction. */
  truthAnalysisRef: string;
  /** fact slot of the contradiction being resolved. */
  factKey: string;
  /**
   * Expected deterministic contradiction fingerprint
   * (contradiction-fingerprint-sha256-1.0.0). Preparation re-derives the
   * fingerprint from the store-loaded analysis and refuses a mismatch, so a
   * caller can never be routed onto a different contradiction than the one
   * they inspected.
   */
  contradictionFingerprint: string;
  /** The participating claim the human intends to select as prevailing. */
  winningClaimRef: string;
  rationale: string;
  requesterId: string;
  /** Injected clock — preparation never reads system time. */
  createdAt: string;
}

export interface PreparedDecision {
  /** The stored, contract-valid decision artifact. */
  decision: Record<string, unknown>;
  /** Canonical content digest of the stored decision — the signing target digest. */
  decisionDigest: string;
}

interface AnalysisContradiction {
  fact_key: string;
  claim_refs: string[];
  distinct_values: (string | number | boolean)[];
  description: string;
  blocking_publication: boolean;
  status: string;
}

export function prepareFactResolutionDecision(
  input: DecisionPreparationInput,
  store: FileArtifactStore,
  registry: ContractRegistry
): Result<PreparedDecision> {
  // 0. Reference-only boundary: precomputed contradiction/loser/digest inputs
  //    are rejected at runtime, not merely absent from the type (DEC-0013
  //    lesson — JavaScript callers must not have a silent bypass).
  for (const rejected of ["contradiction", "losingClaimRefs", "losing_claims", "claims", "digests"]) {
    if (rejected in (input as unknown as Record<string, unknown>)) {
      return err({
        kind: "invalid-input",
        message: `caller-supplied '${rejected}' is rejected: decision preparation derives the contradiction, losers, and digests from the Artifact Store (DEC-0016)`,
      });
    }
  }

  // 1. Load the analysis, its snapshot, and the profile from the exact
  //    namespace. store.get enforces contract validity, brand isolation,
  //    workspace binding, and address integrity for each.
  const analysisGot = store.get(input.workspace, input.brandRef, "truth-analysis", input.truthAnalysisRef);
  if (!analysisGot.ok) return analysisGot;
  const analysis = analysisGot.value;

  const snapshotRef = String(analysis["claim_snapshot_ref"]);
  const snapshotGot = store.get(input.workspace, input.brandRef, "claim-snapshot", snapshotRef);
  if (!snapshotGot.ok) return snapshotGot;
  const snapshot = snapshotGot.value;

  const profileRef = String(analysis["truth_profile_ref"]);
  const profileGot = store.get(input.workspace, input.brandRef, "truth-profile", profileRef);
  if (!profileGot.ok) return profileGot;
  const profile = profileGot.value;

  // 2. The analysis must be bound to exactly this snapshot, and the snapshot
  //    must be authoritative for exactly this namespace.
  if (snapshot["workspace"] !== input.workspace) {
    return err({
      kind: "reference-violation",
      message: `claim snapshot '${snapshotRef}' was captured for workspace '${String(snapshot["workspace"])}', expected '${input.workspace}'`,
    });
  }
  if (analysis["claim_set_digest"] !== snapshot["claim_set_digest"]) {
    return err({
      kind: "stale-analysis",
      message: `truth analysis '${input.truthAnalysisRef}' carries claim_set_digest '${String(analysis["claim_set_digest"])}', but its referenced snapshot '${snapshotRef}' carries '${String(snapshot["claim_set_digest"])}'; the analysis is not bound to the snapshot it references`,
    });
  }

  // 3. Currency: re-capture the canonical namespace and require the exact
  //    aggregate digest the analysis is bound to (DEC-0013). Any claim that
  //    appeared, disappeared, or changed since analysis fails closed here.
  const fresh = captureClaimSnapshot(
    {
      artifactId: snapshotRef,
      workspace: input.workspace,
      brandRef: input.brandRef,
      createdAt: input.createdAt,
    },
    store,
    registry
  );
  if (!fresh.ok) return fresh;
  if (fresh.value.snapshot["claim_set_digest"] !== analysis["claim_set_digest"]) {
    return err({
      kind: "stale-analysis",
      message: `the canonical claim namespace ${input.workspace}/${input.brandRef} changed after truth analysis '${input.truthAnalysisRef}' (analysis digest ${String(analysis["claim_set_digest"])}, current ${String(fresh.value.snapshot["claim_set_digest"])}); re-run the analyzer before preparing a resolution decision`,
    });
  }
  const claims = fresh.value.claims;

  // 4. The analysis's declared coverage and lineage partition must agree
  //    with a projection re-derived from the canonical claims: a fabricated
  //    analysis cannot promote a superseded, inactive, or foreign claim into
  //    a resolvable participant. Unresolved forks fail closed inside the
  //    projection (defense in depth — DEC-0012).
  const canonicalIds = new Set(claims.map((c) => String(c["artifact_id"])));
  const analyzedRefs = (analysis["analyzed_claim_refs"] ?? []) as string[];
  if (
    analyzedRefs.length !== canonicalIds.size ||
    analyzedRefs.some((r) => !canonicalIds.has(r))
  ) {
    return err({
      kind: "reference-violation",
      message: `truth analysis '${input.truthAnalysisRef}' does not cover exactly the canonical claim set of ${input.workspace}/${input.brandRef}`,
    });
  }
  const projected = projectActiveClaims(
    { workspace: input.workspace, brandRef: input.brandRef, claims },
    registry
  );
  if (!projected.ok) return projected;
  const projection = projected.value;
  const declaredEffective = new Set((analysis["effective_claim_refs"] ?? []) as string[]);
  const derivedEffective = new Set(projection.effectiveClaimRefs);
  if (
    declaredEffective.size !== derivedEffective.size ||
    [...declaredEffective].some((r) => !derivedEffective.has(r))
  ) {
    return err({
      kind: "reference-violation",
      message: `truth analysis '${input.truthAnalysisRef}' declares an effective claim set that does not match the lineage projection over the canonical claims (DEC-0012); the analysis is rejected`,
    });
  }

  // 5. Select the contradiction by fact_key; it must exist and be open.
  const contradictions = (analysis["open_contradictions"] ?? []) as AnalysisContradiction[];
  const contradiction = contradictions.find((c) => c.fact_key === input.factKey);
  if (!contradiction) {
    return err({
      kind: "reference-violation",
      message: `truth analysis '${input.truthAnalysisRef}' holds no open contradiction for fact slot '${input.factKey}'; only a currently open contradiction can be resolved`,
    });
  }
  if (contradiction.status !== "open") {
    return err({
      kind: "reference-violation",
      message: `contradiction for fact slot '${input.factKey}' is not open (status '${contradiction.status}')`,
    });
  }

  // 6. The caller's expected fingerprint must equal the re-derivation over
  //    the store-loaded contradiction — the caller cannot be routed onto a
  //    contradiction other than the one they inspected, and a tampered
  //    fingerprint fails closed.
  const derivedFingerprint = contradictionFingerprint(
    input.workspace,
    input.brandRef,
    input.factKey,
    contradiction.claim_refs,
    contradiction.distinct_values
  );
  if (derivedFingerprint !== input.contradictionFingerprint) {
    return err({
      kind: "reference-violation",
      message: `expected contradiction fingerprint '${input.contradictionFingerprint}' does not match the fingerprint '${derivedFingerprint}' derived from truth analysis '${input.truthAnalysisRef}' for fact slot '${input.factKey}'; inspect the current analysis and retry with its fingerprint`,
    });
  }

  // 7. The profile slot must be single-cardinality: multi slots accumulate
  //    values without conflict, so "resolving" one is not a defined action.
  const slots = (profile["slots"] ?? []) as { fact_key: string; cardinality: string }[];
  const slot = slots.find((s) => s.fact_key === input.factKey);
  if (!slot) {
    return err({
      kind: "reference-violation",
      message: `truth profile '${profileRef}' has no slot for fact key '${input.factKey}'`,
    });
  }
  if (slot.cardinality !== "single") {
    return err({
      kind: "reference-violation",
      message: `fact slot '${input.factKey}' has cardinality '${slot.cardinality}'; only single-cardinality contradictions are resolvable`,
    });
  }

  // 8. Winner must participate; losers are DERIVED as every remaining
  //    participant exactly once. Every participant must be a current
  //    effective lineage head (the analysis semantic layer pins
  //    contradiction refs inside effective_claim_refs; the projection
  //    agreement above pins those to canonical heads — this re-check keeps
  //    the boundary fail-closed on its own terms).
  if (!contradiction.claim_refs.includes(input.winningClaimRef)) {
    return err({
      kind: "reference-violation",
      message: `winning claim '${input.winningClaimRef}' is not a participant of the '${input.factKey}' contradiction (participants: ${contradiction.claim_refs.join(", ")})`,
    });
  }
  for (const ref of contradiction.claim_refs) {
    if (!derivedEffective.has(ref)) {
      return err({
        kind: "reference-violation",
        message: `contradiction participant '${ref}' is not a current effective lineage head; the analysis is stale or fabricated`,
      });
    }
  }
  const claimById = new Map(claims.map((c) => [String(c["artifact_id"]), c]));
  const losers = contradiction.claim_refs.filter((r) => r !== input.winningClaimRef);

  // 9. Build, validate, and persist the immutable decision artifact. Its
  //    canonical content digest is the signing target.
  const artifact: Record<string, unknown> = {
    schema_version: "1.8.0",
    artifact_id: input.decisionArtifactId,
    brand_ref: input.brandRef,
    workspace: input.workspace,
    created_at: input.createdAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    fingerprint_algorithm: FINGERPRINT_ALGORITHM,
    truth_analysis_ref: input.truthAnalysisRef,
    truth_analysis_digest: contentDigest(analysis),
    claim_snapshot_ref: snapshotRef,
    claim_snapshot_digest: contentDigest(snapshot),
    claim_set_digest: String(analysis["claim_set_digest"]),
    truth_profile_ref: profileRef,
    truth_profile_digest: contentDigest(profile),
    fact_key: input.factKey,
    contradiction_fingerprint: derivedFingerprint,
    contradiction: {
      claim_refs: [...contradiction.claim_refs],
      distinct_values: [...contradiction.distinct_values],
      description: contradiction.description,
      blocking_publication: contradiction.blocking_publication,
    },
    winning_claim_ref: input.winningClaimRef,
    winning_claim_digest: contentDigest(claimById.get(input.winningClaimRef)!),
    losing_claims: losers.map((ref) => ({
      claim_ref: ref,
      content_digest: contentDigest(claimById.get(ref)!),
    })),
    rationale: input.rationale,
    requester_id: input.requesterId,
  };
  const validated = registry.validate("fact-resolution-decision", artifact);
  if (!validated.ok) return validated;
  const put = store.put(input.workspace, input.brandRef, "fact-resolution-decision", validated.value);
  if (!put.ok) return put;

  // Return the STORED artifact so the digest is provably the stored bytes'.
  const stored = store.get(
    input.workspace,
    input.brandRef,
    "fact-resolution-decision",
    input.decisionArtifactId
  );
  if (!stored.ok) return stored;
  return ok({ decision: stored.value, decisionDigest: contentDigest(stored.value) });
}
