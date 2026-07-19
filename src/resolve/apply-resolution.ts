// Deterministic, crash-recoverable fact-resolution application (DEC-0016).
//
// Composes the DEC-0014/DEC-0015 authorization mechanism with the DEC-0012
// claim lifecycle and DEC-0013 snapshot staleness to execute one signed
// fact-resolution decision exactly once:
//
//   verified open contradiction → signed immutable decision → verified and
//   consumed approval → deterministic contradicted successor for every
//   losing claim → fresh authoritative snapshot → fresh deterministic
//   analysis → immutable application result.
//
// Exactly-once and crash recovery rest on three mechanisms:
//   1. Atomic single-use nonce consumption (the DEC-0014 receipt store):
//      exactly one process can ever consume one approval.
//   2. Deterministic identities (fact-resolution-id-sha256-1.0.0): every
//      post-consumption artifact ID derives from the authorized decision
//      digest and the receipt identity, and every post-consumption timestamp
//      is the receipt's consumed_at — so a retry of the SAME operation
//      recomputes byte-identical artifacts.
//   3. No-overwrite persistence with byte-exact resume: an existing derived
//      artifact must equal its recomputed expected content (canonical
//      content digest); a conflicting artifact fails closed, a matching one
//      is a completed step to skip, and a missing one is written. A replay
//      after full completion returns the stored application result without
//      creating anything.
//
// Fail-closed ordering: every safe deterministic preflight check runs BEFORE
// the approval is consumed — a denial, stale decision, forked lineage, or
// planted artifact consumes nothing and writes nothing. After consumption,
// failures leave a resumable partial state, never a wrong result.
//
// Single-host/single-writer boundary (DEC-0016 rule 13): atomicity is
// file-level linkSync EEXIST semantics on one host. Between preflight and
// the successor writes there is no cross-process lock; a concurrent writer
// in the same claim namespace can force a fail-closed state (stale snapshot,
// ambiguous fork), never a wrong result. No distributed-transaction claim is
// made.
//
// No provider, model, network, or Fake Adapter involvement exists here
// (DEC-0009). The winner is never mutated or auto-verified; no stored claim
// is overwritten, edited, or deleted.
import { contentDigest } from "../kernel/canonical-json.js";
import { captureClaimSnapshot } from "../kernel/claim-snapshot.js";
import { type Result, err, ok } from "../kernel/result.js";
import { analyzeStructuredTruth } from "../understand/analyze-structured-truth.js";
import {
  approvalPayloadDigest,
  ed25519PublicKeyFromSpkiB64,
  receiptIdFor,
  verifyApprovalSignature,
} from "../authority/approval-payload.js";
import { type HumanGateVerifierDeps, verifyAndConsumeApproval } from "../authority/verify-approval.js";
import {
  RESOLUTION_ID_ALGORITHM,
  afterAnalysisIdFor,
  afterSnapshotIdFor,
  applicationIdFor,
  successorIdFor,
} from "./resolution-ids.js";

/** The application service uses exactly the verifier's dependency surface. */
export type FactResolutionDeps = HumanGateVerifierDeps;

export interface AppliedResolution {
  /** The stored, contract-valid fact-resolution-application artifact. */
  application: Record<string, unknown>;
  /** True when this call found the completed result and created nothing. */
  replayed: boolean;
}

const DECISION_TYPE = "fact-resolution-decision";
const APPLICATION_TYPE = "fact-resolution-application";
const GATE = "fact-resolution-approval";

interface DecisionView {
  artifactId: string;
  workspace: string;
  brandRef: string;
  digest: string;
  analysisRef: string;
  analysisDigest: string;
  snapshotRef: string;
  snapshotDigest: string;
  profileRef: string;
  profileDigest: string;
  claimSetDigest: string;
  factKey: string;
  fingerprint: string;
  winningClaimRef: string;
  winningClaimDigest: string;
  losingClaims: { claim_ref: string; content_digest: string }[];
}

/**
 * Persist a derived artifact, or resume over an existing byte-identical one.
 * A stored artifact whose canonical content differs from the recomputed
 * expected content is a conflict, never something to overwrite.
 */
function putOrResume(
  deps: FactResolutionDeps,
  workspace: string,
  brand: string,
  type: string,
  artifact: Record<string, unknown>
): Result<{ resumed: boolean }> {
  const artifactId = String(artifact["artifact_id"]);
  const existing = deps.artifactStore.get(workspace, brand, type, artifactId);
  if (existing.ok) {
    if (contentDigest(existing.value) !== contentDigest(artifact)) {
      return err({
        kind: "resolution-conflict",
        message: `stored ${type} '${artifactId}' does not match the deterministic expected content of this application; refusing to resume over a conflicting artifact`,
      });
    }
    return ok({ resumed: true });
  }
  if (existing.error.kind !== "artifact-not-found") return existing;
  const put = deps.artifactStore.put(workspace, brand, type, artifact);
  if (!put.ok) {
    // A concurrent identical write racing us is a resume, not a failure.
    if (put.error.kind === "artifact-exists") {
      return putOrResume(deps, workspace, brand, type, artifact);
    }
    return put;
  }
  return ok({ resumed: false });
}

function decisionViewOf(decision: Record<string, unknown>): DecisionView {
  return {
    artifactId: String(decision["artifact_id"]),
    workspace: String(decision["workspace"]),
    brandRef: String(decision["brand_ref"]),
    digest: contentDigest(decision),
    analysisRef: String(decision["truth_analysis_ref"]),
    analysisDigest: String(decision["truth_analysis_digest"]),
    snapshotRef: String(decision["claim_snapshot_ref"]),
    snapshotDigest: String(decision["claim_snapshot_digest"]),
    profileRef: String(decision["truth_profile_ref"]),
    profileDigest: String(decision["truth_profile_digest"]),
    claimSetDigest: String(decision["claim_set_digest"]),
    factKey: String(decision["fact_key"]),
    fingerprint: String(decision["contradiction_fingerprint"]),
    winningClaimRef: String(decision["winning_claim_ref"]),
    winningClaimDigest: String(decision["winning_claim_digest"]),
    losingClaims: decision["losing_claims"] as { claim_ref: string; content_digest: string }[],
  };
}

/**
 * Apply one signed fact-resolution decision from its approval evidence.
 * Fresh runs consume the approval; retries resume the identical operation;
 * replays after completion return the stored result.
 */
export function applyFactResolution(
  evidence: unknown,
  deps: FactResolutionDeps
): Result<AppliedResolution> {
  // 1. Boundary validation of the evidence; the payload names the operation.
  const validated = deps.contracts.validate("approval-evidence", evidence);
  if (!validated.ok) return validated;
  const payload = validated.value["payload"] as Record<string, unknown>;
  const evidenceId = String(validated.value["evidence_id"]);
  if (payload["gate"] !== GATE) {
    return err({
      kind: "invalid-input",
      message: `fact-resolution application requires gate '${GATE}', got '${String(payload["gate"])}'`,
    });
  }
  if (payload["target_artifact_type"] !== DECISION_TYPE) {
    return err({
      kind: "invalid-input",
      message: `the approval target must be a ${DECISION_TYPE} artifact carrying the complete requested action; signing a '${String(payload["target_artifact_type"])}' is not a fact-resolution authorization (DEC-0016)`,
    });
  }
  const workspace = String(payload["workspace"]);
  const brandRef = String(payload["brand_ref"]);
  const decisionRef = String(payload["target_artifact_ref"]);
  const payloadDigest = approvalPayloadDigest(payload);

  // 2. The stored decision is the authorization target; its recomputed
  //    canonical digest must equal the signed digest.
  const decisionGot = deps.artifactStore.get(workspace, brandRef, DECISION_TYPE, decisionRef);
  if (!decisionGot.ok) return decisionGot;
  const decision = decisionGot.value;
  const view = decisionViewOf(decision);
  if (view.digest !== String(payload["target_artifact_digest"])) {
    return err({
      kind: "approval-unauthorized",
      reason: "target-digest-mismatch",
      message: `signed target digest does not match the stored decision '${decisionRef}'; the decision changed after signing or the evidence targets a different decision`,
    });
  }

  // 3. Deterministic operation identity.
  const receiptId = receiptIdFor(
    String(payload["key_id"]),
    String(payload["nonce"]),
    String(payload["policy_ref"]),
    workspace,
    brandRef
  );
  const applicationId = applicationIdFor(view.digest, receiptId);

  // 4. Completed replay: the stored application result is returned as-is
  //    once it provably belongs to this same evidence.
  const completed = deps.artifactStore.get(workspace, brandRef, APPLICATION_TYPE, applicationId);
  if (completed.ok) {
    if (completed.value["payload_digest"] !== payloadDigest) {
      return err({
        kind: "resolution-conflict",
        message: `application '${applicationId}' exists but records a different signed payload; the presented evidence does not belong to this operation`,
      });
    }
    return ok({ application: completed.value, replayed: true });
  }
  if (completed.error.kind !== "artifact-not-found") return completed;

  // 5. Fresh consumption or recovery of an already-consumed approval.
  const existingReceipt = deps.receiptStore.get(workspace, brandRef, receiptId);
  let consumedAt: string;
  let receipt: Record<string, unknown>;
  if (!existingReceipt.ok) {
    if (existingReceipt.error.kind !== "artifact-not-found") return existingReceipt;

    // 5a. FRESH RUN. Every safe deterministic preflight check runs before
    //     consumption: the decision must still describe the live store
    //     exactly (currency), and its referenced artifacts must be the
    //     exact digest-pinned ones the human saw.
    const preflight = revalidateDecisionFresh(deps, view);
    if (!preflight.ok) return preflight;

    // 5b. Verify and atomically consume the approval (DEC-0014: policy
    //     authorization, registry key resolution, signature, validity
    //     window, target digest recomputation, single-use receipt).
    const authorized = verifyAndConsumeApproval(evidence, deps);
    if (!authorized.ok) return authorized;

    const persisted = deps.receiptStore.get(workspace, brandRef, authorized.value.receiptId);
    if (!persisted.ok) return persisted;
    receipt = persisted.value;
    consumedAt = String(receipt["consumed_at"]);

    // 5c. An authentic rejection is a consumed human decision that applies
    //     nothing: zero claim mutations, no successors, no new analysis.
    if (authorized.value.verdict !== "approved") {
      return err({
        kind: "resolution-rejected",
        decisionRef,
        message: `the Product Owner rejected decision '${decisionRef}'; the rejection is recorded (receipt '${authorized.value.receiptId}') and no claim was mutated`,
      });
    }
  } else {
    // 5d. RECOVERY. The consumed approval resumes ONLY the identical
    //     operation: the receipt must bind to this evidence, this decision,
    //     this namespace, and the active trust configuration.
    receipt = existingReceipt.value;
    const signatureB64 = String(
      (validated.value["signature"] as Record<string, unknown>)["signature_b64"]
    );
    const bound = verifyReceiptBinding(
      deps,
      receipt,
      payload,
      payloadDigest,
      signatureB64,
      view,
      evidenceId
    );
    if (!bound.ok) return bound;
    if (receipt["verdict"] !== "approved") {
      return err({
        kind: "resolution-rejected",
        decisionRef,
        message: `the consumed approval for decision '${decisionRef}' carries verdict '${String(receipt["verdict"])}'; a rejection applies nothing`,
      });
    }
    consumedAt = String(receipt["consumed_at"]);
  }

  // 6. Post-consumption deterministic writes. All IDs derive from
  //    (decision digest, receipt); all timestamps are consumed_at; each
  //    write resumes byte-exactly or fails closed on conflict.
  const winnerBefore = deps.artifactStore.get(workspace, brandRef, "claim", view.winningClaimRef);
  if (!winnerBefore.ok) return winnerBefore;
  if (contentDigest(winnerBefore.value) !== view.winningClaimDigest) {
    return err({
      kind: "resolution-conflict",
      message: `winning claim '${view.winningClaimRef}' no longer matches the digest the decision pinned; refusing to apply over changed state`,
    });
  }

  // 6a. Lineage guard: every losing claim must match its pinned digest and
  //     be superseded by nothing, or by exactly this operation's expected
  //     successor (a partial prior attempt). Any foreign successor is a
  //     fork this application refuses to deepen.
  const captured = captureClaimSnapshot(
    { artifactId: "guard", workspace, brandRef, createdAt: consumedAt },
    deps.artifactStore,
    deps.contracts
  );
  if (!captured.ok) return captured;
  const supersededBy = new Map<string, string[]>();
  for (const c of captured.value.claims) {
    const predecessor = c["supersedes"];
    if (typeof predecessor === "string") {
      const list = supersededBy.get(predecessor) ?? [];
      list.push(String(c["artifact_id"]));
      supersededBy.set(predecessor, list);
    }
  }
  const expectedSuccessors = new Map(
    view.losingClaims.map((l) => [l.claim_ref, successorIdFor(applicationId, l.claim_ref)])
  );
  for (const loser of view.losingClaims) {
    const stored = deps.artifactStore.get(workspace, brandRef, "claim", loser.claim_ref);
    if (!stored.ok) return stored;
    if (contentDigest(stored.value) !== loser.content_digest) {
      return err({
        kind: "resolution-conflict",
        message: `losing claim '${loser.claim_ref}' no longer matches the digest the decision pinned; refusing to apply over changed state`,
      });
    }
    for (const successor of supersededBy.get(loser.claim_ref) ?? []) {
      if (successor !== expectedSuccessors.get(loser.claim_ref)) {
        return err({
          kind: "resolution-conflict",
          message: `losing claim '${loser.claim_ref}' is already superseded by '${successor}', which does not belong to this application; forked or concurrent lineage fails closed`,
        });
      }
    }
  }

  // 6b. Write (or byte-exactly resume) every losing successor, in sorted
  //     order: content is preserved, verification_status becomes
  //     contradicted, and the signed decision is recorded. The predecessor
  //     is never touched.
  const createdRevisions: {
    losing_claim_ref: string;
    successor_claim_ref: string;
    successor_content_digest: string;
  }[] = [];
  for (const loser of view.losingClaims) {
    const predecessor = deps.artifactStore.get(workspace, brandRef, "claim", loser.claim_ref);
    if (!predecessor.ok) return predecessor;
    const successorId = expectedSuccessors.get(loser.claim_ref)!;
    const successor: Record<string, unknown> = { ...predecessor.value };
    delete successor["superseded_by"];
    successor["schema_version"] = "1.8.0";
    successor["artifact_id"] = successorId;
    successor["supersedes"] = loser.claim_ref;
    successor["verification_status"] = "contradicted";
    successor["resolution_decision_ref"] = view.artifactId;
    successor["created_at"] = consumedAt;
    successor["creator_type"] = "deterministic";
    successor["lifecycle_status"] = "revised";
    const validatedSuccessor = deps.contracts.validate("claim", successor);
    if (!validatedSuccessor.ok) return validatedSuccessor;
    const wrote = putOrResume(deps, workspace, brandRef, "claim", validatedSuccessor.value);
    if (!wrote.ok) return wrote;
    createdRevisions.push({
      losing_claim_ref: loser.claim_ref,
      successor_claim_ref: successorId,
      successor_content_digest: contentDigest(validatedSuccessor.value),
    });
  }

  // 7. Fresh authoritative snapshot + fresh deterministic analysis over the
  //    post-resolution namespace, using the decision's pinned profile.
  const profile = deps.artifactStore.get(workspace, brandRef, "truth-profile", view.profileRef);
  if (!profile.ok) return profile;
  if (contentDigest(profile.value) !== view.profileDigest) {
    return err({
      kind: "resolution-conflict",
      message: `truth profile '${view.profileRef}' no longer matches the digest the decision pinned`,
    });
  }
  const afterSnapshotId = afterSnapshotIdFor(applicationId);
  const afterAnalysisId = afterAnalysisIdFor(applicationId);
  const analyzed = analyzeStructuredTruth(
    {
      artifactId: afterAnalysisId,
      snapshotArtifactId: afterSnapshotId,
      workspace,
      brandRef,
      createdAt: consumedAt,
      truthProfile: profile.value,
    },
    deps.artifactStore,
    deps.contracts
  );
  if (!analyzed.ok) return analyzed;
  const { analysis: afterAnalysis, snapshot: afterSnapshot } = analyzed.value;

  // 7a. The resolved contradiction must be closed in the fresh analysis
  //     (the losing successors are inactive heads). Unrelated
  //     contradictions and gaps are untouched by construction.
  const stillOpen = ((afterAnalysis["open_contradictions"] ?? []) as { fact_key: string }[]).some(
    (c) => c.fact_key === view.factKey
  );
  if (stillOpen) {
    return err({
      kind: "resolution-conflict",
      message: `fact slot '${view.factKey}' still holds an open contradiction after applying decision '${decisionRef}'; the namespace changed concurrently — the partial state is resumable but a fresh decision is required for the remaining conflict`,
    });
  }
  const wroteSnapshot = putOrResume(deps, workspace, brandRef, "claim-snapshot", afterSnapshot);
  if (!wroteSnapshot.ok) return wroteSnapshot;
  const wroteAnalysis = putOrResume(deps, workspace, brandRef, "truth-analysis", afterAnalysis);
  if (!wroteAnalysis.ok) return wroteAnalysis;

  // 8. Immutable application result — the exactly-once record.
  const application: Record<string, unknown> = {
    schema_version: "1.8.0",
    artifact_id: applicationId,
    brand_ref: brandRef,
    workspace,
    created_at: consumedAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    application_algorithm: RESOLUTION_ID_ALGORITHM,
    decision_ref: decisionRef,
    decision_digest: view.digest,
    evidence_ref: evidenceId,
    payload_digest: payloadDigest,
    receipt_ref: receiptId,
    key_id: String(receipt["key_id"]),
    policy_ref: String(receipt["policy_ref"]),
    policy_version: receipt["policy_version"],
    registry_ref: String(receipt["registry_ref"]),
    registry_version: receipt["registry_version"],
    fact_key: view.factKey,
    contradiction_fingerprint: view.fingerprint,
    before_snapshot_ref: view.snapshotRef,
    before_analysis_ref: view.analysisRef,
    created_losing_revisions: createdRevisions,
    after_snapshot_ref: afterSnapshotId,
    after_analysis_ref: afterAnalysisId,
    after_claim_set_digest: String(afterSnapshot["claim_set_digest"]),
    status: "applied",
    consumed_at: consumedAt,
  };
  const validatedApplication = deps.contracts.validate(APPLICATION_TYPE, application);
  if (!validatedApplication.ok) return validatedApplication;
  const wroteApplication = putOrResume(deps, workspace, brandRef, APPLICATION_TYPE, validatedApplication.value);
  if (!wroteApplication.ok) return wroteApplication;

  const stored = deps.artifactStore.get(workspace, brandRef, APPLICATION_TYPE, applicationId);
  if (!stored.ok) return stored;
  return ok({ application: stored.value, replayed: false });
}

/**
 * Fresh-run preflight: the decision must still describe the live store
 * exactly. The aggregate claim-set digest binds the COMPLETE namespace
 * contents, so one comparison proves membership, content, and lineage-head
 * currency at once; the pinned analysis/snapshot/profile digests prove the
 * human signed against the exact artifacts still stored.
 */
function revalidateDecisionFresh(deps: FactResolutionDeps, view: DecisionView): Result<null> {
  const analysis = deps.artifactStore.get(view.workspace, view.brandRef, "truth-analysis", view.analysisRef);
  if (!analysis.ok) return analysis;
  if (contentDigest(analysis.value) !== view.analysisDigest) {
    return err({
      kind: "resolution-conflict",
      message: `truth analysis '${view.analysisRef}' does not match the digest decision '${view.artifactId}' pinned`,
    });
  }
  const snapshot = deps.artifactStore.get(view.workspace, view.brandRef, "claim-snapshot", view.snapshotRef);
  if (!snapshot.ok) return snapshot;
  if (contentDigest(snapshot.value) !== view.snapshotDigest) {
    return err({
      kind: "resolution-conflict",
      message: `claim snapshot '${view.snapshotRef}' does not match the digest decision '${view.artifactId}' pinned`,
    });
  }
  const profile = deps.artifactStore.get(view.workspace, view.brandRef, "truth-profile", view.profileRef);
  if (!profile.ok) return profile;
  if (contentDigest(profile.value) !== view.profileDigest) {
    return err({
      kind: "resolution-conflict",
      message: `truth profile '${view.profileRef}' does not match the digest decision '${view.artifactId}' pinned`,
    });
  }
  if (String(analysis.value["claim_set_digest"]) !== view.claimSetDigest) {
    return err({
      kind: "stale-analysis",
      message: `truth analysis '${view.analysisRef}' is not the analysis decision '${view.artifactId}' was prepared from`,
    });
  }
  const captured = captureClaimSnapshot(
    { artifactId: view.snapshotRef, workspace: view.workspace, brandRef: view.brandRef, createdAt: "1970-01-01T00:00:00Z" },
    deps.artifactStore,
    deps.contracts
  );
  if (!captured.ok) return captured;
  if (String(captured.value.snapshot["claim_set_digest"]) !== view.claimSetDigest) {
    return err({
      kind: "stale-analysis",
      message: `the canonical claim namespace ${view.workspace}/${view.brandRef} changed after decision '${view.artifactId}' was prepared (decision claim-set digest ${view.claimSetDigest}, current ${String(captured.value.snapshot["claim_set_digest"])}); the decision is stale — re-analyze, re-prepare, and re-sign`,
    });
  }
  const contradiction = ((analysis.value["open_contradictions"] ?? []) as {
    fact_key: string;
    claim_refs: string[];
  }[]).find((c) => c.fact_key === view.factKey);
  if (!contradiction) {
    return err({
      kind: "reference-violation",
      message: `truth analysis '${view.analysisRef}' holds no open contradiction for fact slot '${view.factKey}'; the decision does not describe a currently open contradiction`,
    });
  }
  const participants = new Set(contradiction.claim_refs);
  if (!participants.has(view.winningClaimRef)) {
    return err({
      kind: "resolution-conflict",
      message: `winning claim '${view.winningClaimRef}' is not a participant of the current '${view.factKey}' contradiction`,
    });
  }
  return ok(null);
}

/**
 * Recovery binding: the immutable receipt must belong to exactly this
 * operation — same signed payload, same decision at the same digest, same
 * namespace, same key, and the active policy/registry configuration — and
 * the presented evidence must carry a signature the enrolled key verifies.
 * A revoked key refuses recovery (revocation is the emergency brake); an
 * expired validity window does not (authorization happened at consumption).
 */
function verifyReceiptBinding(
  deps: FactResolutionDeps,
  receipt: Record<string, unknown>,
  payload: Record<string, unknown>,
  payloadDigest: string,
  signatureB64: string,
  view: DecisionView,
  evidenceId: string
): Result<null> {
  const conflict = (message: string): Result<null> => err({ kind: "resolution-conflict", message });
  if (receipt["payload_digest"] !== payloadDigest) {
    return conflict(
      `the consumed approval receipt records a different signed payload than the presented evidence '${evidenceId}'; a consumed approval resumes only its own operation`
    );
  }
  if (
    receipt["target_artifact_type"] !== DECISION_TYPE ||
    receipt["target_artifact_ref"] !== view.artifactId ||
    receipt["target_artifact_digest"] !== view.digest
  ) {
    return conflict(
      `the consumed approval receipt does not bind to decision '${view.artifactId}' at its stored digest; a replayed approval never authorizes a different decision`
    );
  }
  if (receipt["gate"] !== GATE) {
    return conflict(`the consumed approval receipt records gate '${String(receipt["gate"])}', not '${GATE}'`);
  }
  const { policy, registry, authorities } = deps.config;
  if (
    receipt["policy_ref"] !== policy["policy_id"] ||
    receipt["policy_version"] !== policy["policy_version"] ||
    receipt["registry_ref"] !== registry["registry_id"] ||
    receipt["registry_version"] !== registry["registry_version"]
  ) {
    return conflict(
      `the consumed approval receipt was issued under a different policy/registry configuration than the active one; recovery requires the same trust configuration`
    );
  }
  if (receipt["key_id"] !== payload["key_id"]) {
    return conflict("the consumed approval receipt records a different signing key than the presented evidence");
  }
  const authority = authorities.get(String(receipt["key_id"]));
  if (!authority) {
    return conflict(
      `the signing key of the consumed approval is no longer enrolled in the active registry; recovery is refused`
    );
  }
  if (authority.status !== "active") {
    return conflict(`the signing key of the consumed approval is revoked; recovery is refused`);
  }
  if (authority.subject_id !== String(payload["approver_id"])) {
    return conflict("the consumed approval's signing key does not belong to the signed approver identity");
  }
  const publicKey = ed25519PublicKeyFromSpkiB64(authority.public_key_spki_b64);
  if (!publicKey) {
    return err({
      kind: "authority-config-invalid",
      message: `registry entry for key '${authority.key_id}' does not decode as a valid Ed25519 SPKI public key`,
    });
  }
  if (!verifyApprovalSignature(payload, signatureB64, publicKey)) {
    return conflict(
      `the presented evidence's Ed25519 signature does not verify against the enrolled key; recovery is refused`
    );
  }
  return ok(null);
}
