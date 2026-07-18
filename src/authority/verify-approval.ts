// Offline authenticated human-gate verification (DEC-0014).
//
// Turns signed approval evidence into machine-verifiable, replay-protected
// proof that an authorized human approved or rejected one exact artifact
// action — and nothing more: an authorized result applies no business action,
// mutates no claim, releases no quarantine, publishes nothing.
//
// Trust model (DEC-0014): the verifier trusts only the trusted-boundary
// policy/registry config it was constructed with, canonical artifacts loaded
// from their exact Artifact Store addresses, the signed canonical payload,
// the injected clock, and the immutable receipt store. It never trusts
// approved_by strings, caller-provided roles, caller-selected keys or
// registries, environment variables, boolean flags, unsigned Decision
// artifacts, GitHub usernames, filenames whose internal identity differs,
// signature validity without policy authorization, or approval validity
// without replay consumption. Every denial is a typed failure carrying
// identifiers only — never key material or signed payload bodies.
import type { FileArtifactStore } from "../kernel/artifact-store.js";
import { contentDigest } from "../kernel/canonical-json.js";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type ApprovalDenialReason, type Result, err, ok } from "../kernel/result.js";
import {
  MAX_PAYLOAD_BYTES,
  RECEIPT_ALGORITHM,
  approvalPayloadBytes,
  approvalPayloadDigest,
  ed25519PublicKeyFromSpkiB64,
  receiptIdFor,
  verifyApprovalSignature,
} from "./approval-payload.js";
import type { TrustedAuthorityConfig } from "./authority.js";
import type { FileApprovalReceiptStore } from "./receipt-store.js";

export interface HumanGateVerifierDeps {
  contracts: ContractRegistry;
  /** Store the approval's target artifact must exist in at its exact address. */
  artifactStore: FileArtifactStore;
  /** Immutable replay-receipt store; consumption happens here atomically. */
  receiptStore: FileApprovalReceiptStore;
  /** Trusted policy + registry loaded through the fixed boundary (authority.ts). */
  config: TrustedAuthorityConfig;
  /** Injected trusted clock returning an ISO 8601 date-time string. */
  clock: () => string;
}

export interface AuthorizedApproval {
  evidenceId: string;
  approvalId: string;
  gate: string;
  verdict: string;
  workspace: string;
  brandRef: string;
  targetArtifactType: string;
  targetArtifactRef: string;
  targetArtifactDigest: string;
  approverId: string;
  role: string;
  selfReview: boolean;
  keyId: string;
  payloadDigest: string;
  receiptId: string;
  receiptPath: string;
}

const deny = (reason: ApprovalDenialReason, message: string) =>
  err<AuthorizedApproval>({ kind: "approval-unauthorized", reason, message });

/**
 * Verify one piece of signed approval evidence against the trusted policy,
 * registry, artifact store, and clock, and atomically consume its nonce.
 * Returns an authorized result ONLY after every check passed AND the receipt
 * persisted; any earlier failure consumes nothing and persists nothing.
 */
export function verifyAndConsumeApproval(
  evidence: unknown,
  deps: HumanGateVerifierDeps
): Result<AuthorizedApproval> {
  // 1–2. Boundary data is unknown until contract-validated (schema + semantic
  // layers: closed payload, digest consistency, self-review consistency).
  const validated = deps.contracts.validate("approval-evidence", evidence);
  if (!validated.ok) return validated;
  const evidenceId = String(validated.value["evidence_id"]);
  const payload = validated.value["payload"] as Record<string, unknown>;
  const signature = validated.value["signature"] as Record<string, unknown>;
  if (approvalPayloadBytes(payload).length > MAX_PAYLOAD_BYTES) {
    return deny(
      "payload-oversized",
      `canonical payload for evidence '${evidenceId}' exceeds ${MAX_PAYLOAD_BYTES} bytes`
    );
  }

  // 3–4. The active policy and registry come from the trusted fixed boundary
  // only (loaded at construction); the evidence cannot choose them.
  const { policy, registry, authorities, gateRequirements } = deps.config;

  // 5. key_id resolves only from the trusted registry.
  const keyId = String(payload["key_id"]);
  const authority = authorities.get(keyId);
  if (!authority) {
    return deny("unknown-key", `key '${keyId}' is not enrolled in the active authority registry`);
  }

  // 6–7. Key status and validity window against the injected clock.
  const nowMs = Date.parse(deps.clock());
  if (Number.isNaN(nowMs)) {
    return err({ kind: "authority-config-invalid", message: "injected clock returned an unparseable date-time" });
  }
  if (authority.status !== "active") {
    return deny("key-revoked", `key '${keyId}' is revoked and cannot authorize any new consumption`);
  }
  if (Date.parse(authority.valid_from) > nowMs) {
    return deny("key-not-yet-valid", `key '${keyId}' is not yet valid`);
  }
  if (authority.valid_until !== null && Date.parse(authority.valid_until) <= nowMs) {
    return deny("key-expired", `key '${keyId}' is past its validity window`);
  }

  // 8. The registry subject and the signed approver identity must agree.
  const approverId = String(payload["approver_id"]);
  if (authority.subject_id !== approverId) {
    return deny(
      "subject-mismatch",
      `signed approver_id '${approverId}' does not match the registry subject for key '${keyId}'`
    );
  }

  // 9–10. The asserted role must belong to that authority and be authorized
  // for the requested gate by the active policy; DEC-0008 independent-review
  // gates stay frozen (no independent reviewer is named or enrolled), and a
  // self-signature could never satisfy one regardless.
  const role = String(payload["role"]);
  const gate = String(payload["gate"]);
  if (!authority.roles.includes(role)) {
    return deny("role-not-held", `role '${role}' is not held by the authority behind key '${keyId}'`);
  }
  const allowedGates = (policy["allowed_gates"] ?? []) as string[];
  const requirement = gateRequirements.get(gate);
  if (!allowedGates.includes(gate) || !requirement) {
    return deny("gate-not-allowed", `gate '${gate}' is not allowed by the active policy`);
  }
  if (requirement.required_role !== role) {
    return deny(
      "role-not-authorized-for-gate",
      `gate '${gate}' requires role '${requirement.required_role}', not '${role}'`
    );
  }
  if (requirement.independent_review_required) {
    return err({
      kind: "independent-review-frozen",
      gate,
      message: `gate '${gate}' requires a formally named independent reviewer; none is named or enrolled (DEC-0008), and a self-signature can never satisfy an independent-review gate`,
    });
  }

  // 11–13. The target artifact must exist at its exact canonical address
  // (store.get enforces address integrity) and its digest, recomputed from
  // canonical stored content, must equal the signed digest — stale approvals
  // of changed artifacts fail closed. This precedes any signature authority.
  const workspace = String(payload["workspace"]);
  const brandRef = String(payload["brand_ref"]);
  const targetType = String(payload["target_artifact_type"]);
  const targetRef = String(payload["target_artifact_ref"]);
  const target = deps.artifactStore.get(workspace, brandRef, targetType, targetRef);
  if (!target.ok) return target;
  const recomputedDigest = contentDigest(target.value);
  const signedDigest = String(payload["target_artifact_digest"]);
  if (recomputedDigest !== signedDigest) {
    return deny(
      "target-digest-mismatch",
      `signed target digest for '${targetRef}' does not match the canonical stored content; the artifact changed after the approval was signed — re-approval is required`
    );
  }

  // 14. Policy binding: the signed payload must name the active policy.
  if (
    payload["policy_ref"] !== policy["policy_id"] ||
    payload["policy_version"] !== policy["policy_version"]
  ) {
    return deny(
      "policy-mismatch",
      `signed policy binding '${String(payload["policy_ref"])}' v${String(payload["policy_version"])} does not match the active policy '${String(policy["policy_id"])}' v${String(policy["policy_version"])}`
    );
  }

  // 15–17. self_review is recomputed from identities; the signed value must
  // match, and DEC-0008's self-review disclosure is enforced (the contract's
  // semantic layer already rejects inconsistent evidence — this recomputation
  // guards the boundary even if validation semantics ever drift).
  const requesterId = String(payload["requester_id"]);
  const computedSelfReview = requesterId === approverId;
  if (payload["self_review"] !== computedSelfReview) {
    return deny(
      "self-review-mismatch",
      `signed self_review=${String(payload["self_review"])} does not match the computed value ${String(computedSelfReview)} (DEC-0008 requires the truthful declaration)`
    );
  }

  // 18. Validity window and TTL against the injected clock only.
  const issuedMs = Date.parse(String(payload["issued_at"]));
  const expiresMs = Date.parse(String(payload["expires_at"]));
  const skewMs = Number(policy["clock_skew_seconds"]) * 1000;
  const maxTtlMs = Number(policy["max_approval_ttl_seconds"]) * 1000;
  if (Number.isNaN(issuedMs) || Number.isNaN(expiresMs)) {
    return deny("approval-expired", `evidence '${evidenceId}' carries unparseable issued_at/expires_at`);
  }
  if (expiresMs - issuedMs > maxTtlMs) {
    return deny(
      "ttl-exceeded",
      `approval lifetime exceeds the policy maximum of ${String(policy["max_approval_ttl_seconds"])} seconds`
    );
  }
  if (issuedMs > nowMs + skewMs) {
    return deny("approval-not-yet-valid", `approval issued_at is in the future beyond the permitted clock skew`);
  }
  if (expiresMs <= nowMs) {
    return deny("approval-expired", `approval expired at ${String(payload["expires_at"])}`);
  }

  // 19. Ed25519 signature over the domain-separated canonical payload bytes,
  // with the registry-resolved public key only.
  const publicKey = ed25519PublicKeyFromSpkiB64(authority.public_key_spki_b64);
  if (!publicKey) {
    return err({
      kind: "authority-config-invalid",
      message: `registry entry for key '${keyId}' does not decode as a valid Ed25519 SPKI public key`,
    });
  }
  if (!verifyApprovalSignature(payload, String(signature["signature_b64"]), publicKey)) {
    return deny("signature-invalid", `Ed25519 signature verification failed for evidence '${evidenceId}'`);
  }

  // 20–21. Atomic nonce consumption: the receipt IS the consumption. Exactly
  // one attempt can persist it; without a persisted receipt there is no
  // authorization, and nothing before this point touched the receipt store.
  const nonce = String(payload["nonce"]);
  const payloadDigest = approvalPayloadDigest(payload);
  const receipt: Record<string, unknown> = {
    schema_version: String(policy["schema_version"]),
    receipt_id: receiptIdFor(keyId, nonce, String(policy["policy_id"])),
    receipt_algorithm: RECEIPT_ALGORITHM,
    evidence_ref: evidenceId,
    payload_digest: payloadDigest,
    key_id: keyId,
    nonce,
    workspace,
    brand_ref: brandRef,
    target_artifact_ref: targetRef,
    target_artifact_type: targetType,
    target_artifact_digest: signedDigest,
    gate,
    verdict: String(payload["verdict"]),
    verification_result: "authorized",
    consumed_at: deps.clock(),
    policy_ref: String(policy["policy_id"]),
    policy_version: policy["policy_version"],
    registry_ref: String(registry["registry_id"]),
    registry_version: registry["registry_version"],
  };
  const consumed = deps.receiptStore.consume(workspace, brandRef, receipt);
  if (!consumed.ok) return consumed;

  // 22. Authorized. This result is evidence, not an action: applying any
  // business effect remains a separate, still-unimplemented step.
  return ok({
    evidenceId,
    approvalId: String(payload["approval_id"]),
    gate,
    verdict: String(payload["verdict"]),
    workspace,
    brandRef,
    targetArtifactType: targetType,
    targetArtifactRef: targetRef,
    targetArtifactDigest: signedDigest,
    approverId,
    role,
    selfReview: computedSelfReview,
    keyId,
    payloadDigest,
    receiptId: consumed.value.receiptId,
    receiptPath: consumed.value.path,
  });
}
