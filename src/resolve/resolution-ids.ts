// Deterministic identities for authenticated fact resolution (DEC-0016).
//
// Two versioned algorithms, both mirrored in contracts/validate.mjs (the two
// implementations must change together):
//
//   contradiction-fingerprint-sha256-1.0.0
//     'c' + sha256 hex over the canonical JSON of
//     {brand_ref, claim_refs, distinct_values, fact_key, workspace} — the
//     deterministic identity of one open contradiction in one namespace. The
//     namespace participates so a fingerprint can never match a cross-brand
//     or cross-workspace contradiction with identical values.
//
//   fact-resolution-id-sha256-1.0.0
//     application  = 'fra' + sha256 over {decision_digest, receipt_ref}
//     successor    = 'crs' + sha256 over {application_ref, losing_claim_ref}
//     after-state  = 'fsn'/'fan' + sha256 over {application_ref, role}
//     Every post-consumption artifact identity derives from the authorized
//     decision digest and the approval's deterministic receipt identity, so a
//     crash-recovery retry of the same operation recomputes the same IDs and
//     a different approval or decision can never collide into them.
//
// Node.js built-in crypto only (DEC-0014 dependency boundary).
import { createHash } from "node:crypto";
import { canonicalJson } from "../kernel/canonical-json.js";

export const FINGERPRINT_ALGORITHM = "contradiction-fingerprint-sha256-1.0.0";
export const RESOLUTION_ID_ALGORITHM = "fact-resolution-id-sha256-1.0.0";

const hashOf = (value: Record<string, unknown>): string =>
  createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");

/** Deterministic identity of one open contradiction in one workspace/brand namespace. */
export function contradictionFingerprint(
  workspace: string,
  brandRef: string,
  factKey: string,
  claimRefs: string[],
  distinctValues: (string | number | boolean)[]
): string {
  return `c${hashOf({
    brand_ref: brandRef,
    claim_refs: claimRefs,
    distinct_values: distinctValues,
    fact_key: factKey,
    workspace,
  })}`;
}

/** Deterministic application identity over the authorized decision and consumed receipt. */
export function applicationIdFor(decisionDigest: string, receiptRef: string): string {
  return `fra${hashOf({ decision_digest: decisionDigest, receipt_ref: receiptRef })}`;
}

/** Deterministic successor-revision identity for one losing claim of one application. */
export function successorIdFor(applicationRef: string, losingClaimRef: string): string {
  return `crs${hashOf({ application_ref: applicationRef, losing_claim_ref: losingClaimRef })}`;
}

/** Deterministic identity of the fresh post-resolution snapshot. */
export function afterSnapshotIdFor(applicationRef: string): string {
  return `fsn${hashOf({ application_ref: applicationRef, role: "after-snapshot" })}`;
}

/** Deterministic identity of the fresh post-resolution analysis. */
export function afterAnalysisIdFor(applicationRef: string): string {
  return `fan${hashOf({ application_ref: applicationRef, role: "after-analysis" })}`;
}
