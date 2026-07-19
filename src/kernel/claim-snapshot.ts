// Store-authoritative claim snapshot capture (DEC-0013).
//
// Canonical claim membership comes from Artifact Store enumeration of one
// exact workspace/brand namespace — a caller-supplied claims array is never
// evidence of completeness, because the Phase 1B.2.1 lineage rules could only
// prove internal consistency of what was supplied: omitting an entire
// independent lineage left nothing dangling and silently hid its
// contradiction. Capture is deterministic and fail-closed:
//
//   1. Strict enumeration (FileArtifactStore.listStrict): symlinked,
//      non-file, non-canonical, or unsafely named entries in the claim
//      namespace fail the capture instead of being skipped.
//   2. Every enumerated claim is loaded through store.get — schema + semantic
//      contract validation and brand-namespace verification included; an
//      unreadable or invalid entry fails the capture.
//   3. A second strict enumeration must observe identical membership
//      (enumerate → load → enumerate); a namespace that changed mid-capture
//      is rejected with a typed `snapshot-unstable` failure.
//   4. The snapshot binds membership and contents with per-claim content
//      digests and an aggregate claim-set digest (claim-set-sha256-1.0.0,
//      src/kernel/canonical-json.ts) and validates against
//      contracts/claim-snapshot.schema.json before it is returned.
//
// A zero-claim namespace is a valid snapshot. The capture timestamp is
// injected by the caller (createdAt) — capture itself never reads a clock, so
// identical store state plus an identical injected clock produces
// byte-equivalent snapshots. No network, provider, model, or environment
// involvement exists here (DEC-0009).
import type { FileArtifactStore } from "./artifact-store.js";
import { SNAPSHOT_ALGORITHM, claimSetDigest, contentDigest } from "./canonical-json.js";
import type { ContractRegistry } from "./contract-registry.js";
import { type Result, err } from "./result.js";

export interface ClaimSnapshotInput {
  /** artifact_id for the produced claim-snapshot artifact. */
  artifactId: string;
  workspace: string;
  brandRef: string;
  /** Injected capture timestamp — determinism requires the caller's clock. */
  createdAt: string;
}

export interface CapturedClaimSet {
  /** Contract-valid claim-snapshot artifact (not yet persisted). */
  snapshot: Record<string, unknown>;
  /** The validated canonical claims, in snapshot (code-unit) order. */
  claims: Record<string, unknown>[];
}

export function captureClaimSnapshot(
  input: ClaimSnapshotInput,
  store: FileArtifactStore,
  registry: ContractRegistry
): Result<CapturedClaimSet> {
  const first = store.listStrict(input.workspace, input.brandRef, "claim");
  if (!first.ok) return first;

  const claims: Record<string, unknown>[] = [];
  const pairs: { claim_ref: string; content_digest: string }[] = [];
  for (const id of first.value) {
    const got = store.get(input.workspace, input.brandRef, "claim", id);
    if (!got.ok) return got;
    claims.push(got.value);
    pairs.push({ claim_ref: id, content_digest: contentDigest(got.value) });
  }

  const second = store.listStrict(input.workspace, input.brandRef, "claim");
  if (!second.ok) return second;
  if (JSON.stringify(second.value) !== JSON.stringify(first.value)) {
    return err({
      kind: "snapshot-unstable",
      message: `canonical claim namespace ${input.workspace}/${input.brandRef} changed during snapshot capture (membership before: ${first.value.length}, after: ${second.value.length} entries); re-capture against a stable namespace`,
    });
  }

  const snapshot: Record<string, unknown> = {
    schema_version: "1.7.1",
    artifact_id: input.artifactId,
    brand_ref: input.brandRef,
    workspace: input.workspace,
    created_at: input.createdAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    snapshot_algorithm: SNAPSHOT_ALGORITHM,
    claims: pairs,
    claim_set_digest: claimSetDigest(pairs),
  };
  const validated = registry.validate("claim-snapshot", snapshot);
  if (!validated.ok) return validated;
  return { ok: true, value: { snapshot: validated.value, claims } };
}
