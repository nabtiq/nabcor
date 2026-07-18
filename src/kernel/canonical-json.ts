// Canonical JSON serialization and content digests for store-authoritative
// claim snapshots (DEC-0013).
//
// Algorithm "claim-set-sha256-1.0.0", versioned so a future change cannot
// silently reinterpret stored digests:
//   - Objects serialize with keys in code-unit-sorted order (never
//     locale-dependent collation); arrays keep their order; scalars use
//     JSON.stringify. No whitespace is emitted.
//   - A claim content digest is `sha256:<hex>` over the UTF-8 bytes of the
//     canonical serialization of the validated claim artifact.
//   - The aggregate claim-set digest is `sha256:<hex>` over the canonical
//     serialization of the full `claims` pair array
//     ([{ claim_ref, content_digest }, ...] sorted by claim_ref), binding the
//     snapshot to its exact membership AND per-claim contents.
//
// The same algorithm is mirrored in contracts/validate.mjs so fixture
// validation can recompute aggregates offline; the two implementations must
// change together.
import { createHash } from "node:crypto";

export const SNAPSHOT_ALGORITHM = "claim-set-sha256-1.0.0";

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort(byCodeUnit);
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Digest(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/** Content digest of one validated artifact (canonical serialization). */
export function contentDigest(artifact: Record<string, unknown>): string {
  return sha256Digest(canonicalJson(artifact));
}

/** Aggregate digest over the sorted { claim_ref, content_digest } pair array. */
export function claimSetDigest(pairs: { claim_ref: string; content_digest: string }[]): string {
  return sha256Digest(canonicalJson(pairs));
}
