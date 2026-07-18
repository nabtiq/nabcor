// Tier-0 project-active-claims: deterministic derivation of current effective
// truth from a complete Claim revision set (DEC-0012).
//
// Claims are immutable per version (INV-VER-001): a resolution or correction
// never mutates a stored claim — it creates a new revision with a new
// artifact_id whose `supersedes` names the previous version. Current truth is
// therefore a PROJECTION over lineage heads, never the result of a caller
// omitting inconvenient claims: the input declares itself a complete lineage
// set, every lineage is validated before projection, and omission-shaped
// inputs (dangling predecessors, missing successors) fail closed rather than
// silently imitating resolution.
//
// A lineage head with verification_status `contradicted`, `rejected`, or
// `expired`, or lifecycle_status `rejected`, is retained for audit but is
// INACTIVE as current truth (DEC-0012): it does not create active
// contradictions and does not satisfy required truth-profile slots. A head
// with lifecycle_status `superseded` whose successor is absent from the
// declared complete set is a lineage violation, not an inactive head.
//
// No gateway, adapter, model, provider, network, or environment involvement
// exists here (DEC-0009, DEC-0011).
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";

export interface ActiveClaimProjectionInput {
  workspace: string;
  brandRef: string;
  /**
   * The COMPLETE Claim revision set for the projection scope — every stored
   * revision of every lineage, not a caller-chosen subset. Values stay
   * unknown until contract validation.
   */
  claims: unknown[];
}

/**
 * Closed reason enum for inactive lineage heads. `lifecycle_status:
 * "superseded"` is deliberately not a reason: a superseded head whose
 * successor is missing from the declared complete set fails closed as a
 * lineage violation instead of projecting.
 */
export type InactiveReason =
  | "verification-contradicted"
  | "verification-rejected"
  | "verification-expired"
  | "lifecycle-rejected";

export interface InactiveHeadClaim {
  claim_ref: string;
  reason: InactiveReason;
}

export interface LineageEdge {
  predecessor: string;
  successor: string;
}

export interface ActiveClaimProjection {
  /** Every validated input claim reference, code-unit sorted. */
  inputClaimRefs: string[];
  /** Lineage heads active as current truth, code-unit sorted. */
  effectiveClaimRefs: string[];
  /** Historical revisions superseded by another supplied claim, code-unit sorted. */
  supersededClaimRefs: string[];
  /** Lineage heads retained for audit but inactive as current truth, sorted by claim_ref. */
  inactiveHeadClaims: InactiveHeadClaim[];
  /** Validated claim records keyed by artifact_id. */
  claimById: ReadonlyMap<string, Record<string, unknown>>;
  /** Verified supersession edges, sorted by predecessor (lineage diagnostics). */
  lineage: LineageEdge[];
}

// Deterministic code-unit string comparison — never locale-dependent collation.
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function inactiveReasonFor(claim: Record<string, unknown>): InactiveReason | null {
  switch (claim["verification_status"]) {
    case "contradicted":
      return "verification-contradicted";
    case "rejected":
      return "verification-rejected";
    case "expired":
      return "verification-expired";
    default:
      return claim["lifecycle_status"] === "rejected" ? "lifecycle-rejected" : null;
  }
}

export function projectActiveClaims(
  input: ActiveClaimProjectionInput,
  registry: ContractRegistry
): Result<ActiveClaimProjection> {
  // 1. Boundary validation: every claim is contract-validated (schema +
  //    semantic) before anything is read from it (INV-DET-001).
  const validated: Record<string, unknown>[] = [];
  for (const c of input.claims) {
    const v = registry.validate("claim", c);
    if (!v.ok) return v;
    validated.push(v.value);
  }

  // 2. Brand isolation (INV-DATA-001): every claim belongs to the projection
  //    brand; cross-brand lineage cannot exist.
  for (const c of validated) {
    if (c["brand_ref"] !== input.brandRef) {
      return err({
        kind: "reference-violation",
        message: `claim '${String(c["artifact_id"])}' carries brand_ref '${String(c["brand_ref"])}', expected '${input.brandRef}' (workspace '${input.workspace}'); cross-brand claims are rejected`,
      });
    }
  }

  // 3. Unique artifact IDs — one revision, one reference.
  const claimById = new Map<string, Record<string, unknown>>();
  for (const c of validated) {
    const id = String(c["artifact_id"]);
    if (claimById.has(id)) {
      return err({
        kind: "invalid-input",
        message: `duplicate claim artifact_id '${id}' in the analysis input; each claim participates exactly once`,
      });
    }
    claimById.set(id, c);
  }
  const sortedIds = [...claimById.keys()].sort(byCodeUnit);

  // 4. Supersession edges. The input is a declared COMPLETE lineage set, so a
  //    `supersedes` reference outside it is a dangling predecessor, two
  //    successors of one predecessor are an ambiguous fork (no explicit
  //    resolution mechanism selects a branch yet), and self-supersession is
  //    structurally invalid — all fail closed (DEC-0012).
  const successorOf = new Map<string, string>();
  for (const id of sortedIds) {
    const supersedes = claimById.get(id)!["supersedes"];
    if (supersedes === undefined || supersedes === null) continue;
    const predecessor = String(supersedes);
    if (predecessor === id) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' supersedes itself; a revision must name a different prior claim`,
      });
    }
    if (!claimById.has(predecessor)) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' supersedes '${predecessor}', which is absent from the declared complete claim set; omission is not resolution — supply every revision of every lineage`,
      });
    }
    const existing = successorOf.get(predecessor);
    if (existing !== undefined) {
      return err({
        kind: "lineage-violation",
        message: `claims '${existing}' and '${id}' both supersede '${predecessor}'; ambiguous forks are rejected until an explicit resolution mechanism selects a branch`,
      });
    }
    successorOf.set(predecessor, id);
  }

  // 5. `superseded_by` metadata is optional on immutable historical artifacts
  //    (they cannot be mutated to add it), but when present it must agree with
  //    the actual supersession relationship — it is never sufficient alone.
  for (const id of sortedIds) {
    const supersededBy = claimById.get(id)!["superseded_by"];
    if (supersededBy === undefined || supersededBy === null) continue;
    const successor = String(supersededBy);
    if (successor === id) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' declares itself as its own superseded_by successor`,
      });
    }
    if (!claimById.has(successor)) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' declares superseded_by '${successor}', which is absent from the declared complete claim set`,
      });
    }
    if (successorOf.get(id) !== successor) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' declares superseded_by '${successor}', but '${successor}' does not supersede it; superseded_by metadata must agree with the actual successor relationship`,
      });
    }
  }

  // 6. A claim that says it was superseded must have its successor in the
  //    declared complete set — otherwise the input hides a revision.
  for (const id of sortedIds) {
    if (claimById.get(id)!["lifecycle_status"] === "superseded" && !successorOf.has(id)) {
      return err({
        kind: "lineage-violation",
        message: `claim '${id}' has lifecycle_status 'superseded' but no supplied claim supersedes it; the successor is missing from the declared complete claim set`,
      });
    }
  }

  // 7. Lineage cycles fail closed: walk each predecessor chain once.
  const acyclic = new Set<string>();
  for (const id of sortedIds) {
    const walk = new Set<string>();
    let current = id;
    for (;;) {
      if (acyclic.has(current)) break;
      if (walk.has(current)) {
        return err({
          kind: "lineage-violation",
          message: `claim lineage contains a supersession cycle involving '${current}'`,
        });
      }
      walk.add(current);
      const predecessor = claimById.get(current)!["supersedes"];
      if (predecessor === undefined || predecessor === null) break;
      current = String(predecessor);
    }
    for (const visited of walk) acyclic.add(visited);
  }

  // 8. Projection: a head is a claim no validated supplied claim supersedes;
  //    heads split into effective current truth and inactive audit-only heads.
  const effectiveClaimRefs: string[] = [];
  const supersededClaimRefs: string[] = [];
  const inactiveHeadClaims: InactiveHeadClaim[] = [];
  for (const id of sortedIds) {
    if (successorOf.has(id)) {
      supersededClaimRefs.push(id);
      continue;
    }
    const reason = inactiveReasonFor(claimById.get(id)!);
    if (reason) inactiveHeadClaims.push({ claim_ref: id, reason });
    else effectiveClaimRefs.push(id);
  }

  const lineage = [...successorOf.entries()]
    .map(([predecessor, successor]) => ({ predecessor, successor }))
    .sort((a, b) => byCodeUnit(a.predecessor, b.predecessor));

  return ok({
    inputClaimRefs: sortedIds,
    effectiveClaimRefs,
    supersededClaimRefs,
    inactiveHeadClaims,
    claimById,
    lineage,
  });
}
