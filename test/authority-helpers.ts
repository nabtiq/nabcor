// Shared setup for the authenticated human-gate tests (DEC-0014).
// Every keypair is ephemeral: generated in-memory per test process, never
// persisted inside the repository, never printed. Policies and registries are
// written to temp directories and loaded through the same trusted boundary
// the runtime uses.
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  keyIdForSpkiDer,
  signApprovalPayload,
} from "../src/authority/approval-payload.js";
import { type TrustedAuthorityConfig, loadTrustedAuthorityConfig } from "../src/authority/authority.js";
import { FileApprovalReceiptStore } from "../src/authority/receipt-store.js";
import type { HumanGateVerifierDeps } from "../src/authority/verify-approval.js";
import { BRAND, NOW, WS, registry, tempDir, validClaim } from "./helpers.js";

export const SUBJECT = "po-test-owner";
export const POLICY_ID = "hgp-test-1";
export const REGISTRY_ID = "areg-test";

export interface EphemeralAuthority {
  privateKeyPem: string;
  spkiB64: string;
  keyId: string;
}

/** Fresh in-memory Ed25519 keypair; the private half lives only in this object. */
export function ephemeralAuthority(): EphemeralAuthority {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    spkiB64: der.toString("base64"),
    keyId: keyIdForSpkiDer(der),
  };
}

export function authorityEntry(
  auth: EphemeralAuthority,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    key_id: auth.keyId,
    subject_id: SUBJECT,
    label: "Ephemeral test authority",
    algorithm: "ed25519",
    public_key_spki_b64: auth.spkiB64,
    roles: ["product-owner", "operator", "reviewer", "evaluation-owner"],
    valid_from: "2026-07-01T00:00:00Z",
    valid_until: null,
    status: "active",
    ...overrides,
  };
}

export function registryDoc(
  entries: Record<string, unknown>[],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schema_version: "1.10.0",
    registry_id: REGISTRY_ID,
    registry_version: 1,
    supersedes_registry_version: null,
    created_at: "2026-07-01T00:00:00Z",
    decision_ref: "DEC-0014",
    authorities: entries,
    ...overrides,
  };
}

export function policyDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.10.0",
    policy_id: POLICY_ID,
    policy_version: 1,
    decision_ref: "DEC-0014",
    signature_algorithm: "ed25519",
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    canonicalization_algorithm: "approval-payload-sha256-1.0.0",
    domain_separator: APPROVAL_DOMAIN,
    authority_registry_ref: REGISTRY_ID,
    authority_registry_version: 1,
    independent_reviewer_named: false,
    allowed_gates: [
      "fact-resolution-approval",
      "quarantine-release",
      "client-facing-publishing",
      "blocking-evaluation-gate-change",
      "real-client-data-provider-approval",
    ],
    gate_requirements: {
      "fact-resolution-approval": {
        required_role: "product-owner",
        independent_review_required: false,
      },
      "quarantine-release": { required_role: "reviewer", independent_review_required: true },
      "client-facing-publishing": { required_role: "reviewer", independent_review_required: true },
      "blocking-evaluation-gate-change": {
        required_role: "evaluation-owner",
        independent_review_required: true,
      },
      "real-client-data-provider-approval": {
        required_role: "product-owner",
        independent_review_required: true,
      },
    },
    max_approval_ttl_seconds: 86400,
    clock_skew_seconds: 300,
    replay_policy: "single-use-nonce",
    default_deny: true,
    ...overrides,
  };
}

/** Write policy + registry to a temp dir and load them through the trusted boundary. */
export function trustedConfig(
  policy: Record<string, unknown>,
  registryDocument: Record<string, unknown>
): ReturnType<typeof loadTrustedAuthorityConfig> {
  const dir = tempDir("authority-config");
  const policyPath = join(dir, "human-gate-policy.active.json");
  const registryPath = join(dir, "authority-registry.active.json");
  writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n", "utf8");
  writeFileSync(registryPath, JSON.stringify(registryDocument, null, 2) + "\n", "utf8");
  return loadTrustedAuthorityConfig(policyPath, registryPath, registry());
}

export interface ApprovalScenario {
  deps: HumanGateVerifierDeps;
  auth: EphemeralAuthority;
  store: FileArtifactStore;
  artifactsRoot: string;
  receiptRoot: string;
  targetDigest: string;
}

/**
 * The standard happy-path scenario: one enrolled ephemeral authority, one
 * canonical claim target, a deterministic injected clock at test NOW.
 */
export function approvalScenario(
  configOverrides: {
    policy?: Record<string, unknown>;
    registryDocument?: Record<string, unknown>;
    entry?: Record<string, unknown>;
  } = {}
): ApprovalScenario {
  const auth = ephemeralAuthority();
  const entry = authorityEntry(auth, configOverrides.entry ?? {});
  const policy = policyDoc(configOverrides.policy ?? {});
  const registryDocument = registryDoc([entry], configOverrides.registryDocument ?? {});
  const loaded = trustedConfig(policy, registryDocument);
  if (!loaded.ok) throw new Error(`test setup: trusted config load failed: ${JSON.stringify(loaded)}`);
  const artifactsRoot = tempDir("approval-artifacts");
  const store = new FileArtifactStore(artifactsRoot, registry());
  const put = store.put(WS, BRAND, "claim", validClaim());
  if (!put.ok) throw new Error(`test setup: claim put failed: ${JSON.stringify(put)}`);
  const stored = store.get(WS, BRAND, "claim", "claim_t_0001");
  if (!stored.ok) throw new Error("test setup: claim read-back failed");
  const receiptRoot = tempDir("approval-receipts");
  return {
    deps: {
      contracts: registry(),
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(receiptRoot, registry()),
      config: loaded.value as TrustedAuthorityConfig,
      clock: () => NOW,
    },
    auth,
    store,
    artifactsRoot,
    receiptRoot,
    targetDigest: contentDigest(stored.value),
  };
}

let nonceCounter = 0;

/** Deterministic per-call test nonce (unique within a test process). */
export function testNonce(): string {
  nonceCounter += 1;
  return nonceCounter.toString(16).padStart(32, "0");
}

export function approvalPayload(
  scenario: ApprovalScenario,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    domain: APPROVAL_DOMAIN,
    approval_id: "appr_t_0001",
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_type: "claim",
    target_artifact_ref: "claim_t_0001",
    target_artifact_digest: scenario.targetDigest,
    gate: "fact-resolution-approval",
    verdict: "approved",
    reason: "synthetic test approval",
    requester_id: SUBJECT,
    approver_id: SUBJECT,
    role: "product-owner",
    self_review: true,
    key_id: scenario.auth.keyId,
    policy_ref: POLICY_ID,
    policy_version: 1,
    nonce: testNonce(),
    issued_at: "2026-07-17T11:30:00Z",
    expires_at: "2026-07-17T12:30:00Z",
    ...overrides,
  };
}

/** Contract-valid signed evidence over the given payload, signed by `signer` (default: the enrolled authority). */
export function signedEvidence(
  scenario: ApprovalScenario,
  payloadOverrides: Record<string, unknown> = {},
  signer?: EphemeralAuthority,
  evidenceOverrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const payload = approvalPayload(scenario, payloadOverrides);
  const signatureB64 = signApprovalPayload(payload, (signer ?? scenario.auth).privateKeyPem);
  return {
    schema_version: "1.10.0",
    evidence_id: "apev_t_0001",
    payload,
    payload_digest: approvalPayloadDigest(payload),
    signature: { algorithm: "ed25519", signature_b64: signatureB64 },
    ...evidenceOverrides,
  };
}
