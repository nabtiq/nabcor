// Phase 1B.3B (DEC-0015): the committed enrollment configuration is
// operational, exact, and least-privilege — registry v2 holds exactly the
// confirmed Product Owner public key, policy v2 pins registry v2, substitutes
// and impostors fail closed, and the four DEC-0008 independent-review gates
// stay structurally unsatisfiable. Tests that need a SIGNING key use an
// ephemeral in-memory equivalent of the enrolled configuration — the real
// private key never exists in tests, fixtures, or CI.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  signApprovalPayload,
} from "../src/authority/approval-payload.js";
import { type TrustedAuthorityConfig, loadTrustedAuthorityConfig } from "../src/authority/authority.js";
import { FileApprovalReceiptStore } from "../src/authority/receipt-store.js";
import type { HumanGateVerifierDeps } from "../src/authority/verify-approval.js";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import {
  type EphemeralAuthority,
  ephemeralAuthority,
  testNonce,
  trustedConfig,
} from "./authority-helpers.js";
import { BRAND, WS, contractsDir, registry, tempDir, validClaim } from "./helpers.js";

// The enrolled Product Owner authority (public, non-secret — DEC-0015).
const ENROLLED_KEY_ID = "k8cc9db703247760829dcb74819fbe07cd1dc24a2bf66ec7a02ed500391de8b1b";
const ENROLLED_SPKI_B64 = "MCowBQYDK2VwAyEAp0Y1G8pBZ+LiOanCJNKqG9SLXwRcME8G59qWJEZIjLM=";
const ENROLLED_SUBJECT = "ibrahim-mohamed";
const VALID_FROM = "2026-07-19T00:00:00Z";
const VALID_UNTIL = "2027-07-19T00:00:00Z";
// Injected verification clock inside the enrolled key's validity window.
const CLOCK = "2026-07-20T12:00:00Z";

const POLICY_PATH = join(contractsDir, "human-gate-policy.active.json");
const REGISTRY_PATH = join(contractsDir, "authority-registry.active.json");

function loadCommittedConfig(): TrustedAuthorityConfig {
  const loaded = loadTrustedAuthorityConfig(POLICY_PATH, REGISTRY_PATH, registry());
  assert.ok(loaded.ok, `committed trusted config must load: ${JSON.stringify(loaded)}`);
  return loaded.value;
}

/** Verifier deps over the committed active config with temp target/receipt stores. */
function committedDeps(): { deps: HumanGateVerifierDeps; targetDigest: string; receiptRoot: string } {
  const artifactsRoot = tempDir("enrollment-artifacts");
  const store = new FileArtifactStore(artifactsRoot, registry());
  const put = store.put(WS, BRAND, "claim", validClaim());
  assert.ok(put.ok, "test setup: claim put failed");
  const stored = store.get(WS, BRAND, "claim", "claim_t_0001");
  assert.ok(stored.ok, "test setup: claim read-back failed");
  const receiptRoot = tempDir("enrollment-receipts");
  return {
    deps: {
      contracts: registry(),
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(receiptRoot, registry()),
      config: loadCommittedConfig(),
      clock: () => CLOCK,
    },
    targetDigest: contentDigest(stored.ok ? stored.value : {}),
    receiptRoot,
  };
}

/** A payload bound to the committed active policy, inside the enrolled validity window. */
function v2Payload(targetDigest: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    domain: APPROVAL_DOMAIN,
    approval_id: "appr_e_0001",
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_type: "claim",
    target_artifact_ref: "claim_t_0001",
    target_artifact_digest: targetDigest,
    gate: "fact-resolution-approval",
    verdict: "approved",
    reason: "synthetic enrollment test approval",
    requester_id: ENROLLED_SUBJECT,
    approver_id: ENROLLED_SUBJECT,
    role: "product-owner",
    self_review: true,
    key_id: ENROLLED_KEY_ID,
    policy_ref: "hgp-nabcor-1",
    policy_version: 3,
    nonce: testNonce(),
    issued_at: "2026-07-20T11:30:00Z",
    expires_at: "2026-07-20T12:30:00Z",
    ...overrides,
  };
}

function evidenceFor(payload: Record<string, unknown>, signer: EphemeralAuthority): Record<string, unknown> {
  return {
    schema_version: "1.10.0",
    evidence_id: "apev_e_0001",
    payload,
    payload_digest: approvalPayloadDigest(payload),
    signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(payload, signer.privateKeyPem) },
  };
}

/**
 * The ephemeral EQUIVALENT of the enrolled configuration: identical registry
 * v2 / policy v2 shape, identical subject, roles, and validity — but the
 * enrolled key is a fresh in-memory keypair, so tests can sign without the
 * real private key ever existing anywhere near the repository or CI.
 */
function equivalentScenario(): {
  deps: HumanGateVerifierDeps;
  auth: EphemeralAuthority;
  targetDigest: string;
} {
  const auth = ephemeralAuthority();
  const registryDocument = {
    schema_version: "1.10.0",
    registry_id: "areg-nabcor",
    registry_version: 2,
    supersedes_registry_version: 1,
    created_at: "2026-07-19T00:08:51Z",
    decision_ref: "DEC-0015",
    authorities: [
      {
        key_id: auth.keyId,
        subject_id: ENROLLED_SUBJECT,
        label: "Ephemeral equivalent of the enrolled Product Owner authority",
        algorithm: "ed25519",
        public_key_spki_b64: auth.spkiB64,
        roles: ["product-owner"],
        valid_from: VALID_FROM,
        valid_until: VALID_UNTIL,
        status: "active",
      },
    ],
  };
  const policy = JSON.parse(
    JSON.stringify(
      loadCommittedConfig().policy
    )
  ) as Record<string, unknown>;
  const loaded = trustedConfig(policy, registryDocument);
  assert.ok(loaded.ok, `equivalent config must load: ${JSON.stringify(loaded)}`);
  const artifactsRoot = tempDir("equiv-artifacts");
  const store = new FileArtifactStore(artifactsRoot, registry());
  assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok, "test setup: claim put failed");
  const stored = store.get(WS, BRAND, "claim", "claim_t_0001");
  assert.ok(stored.ok, "test setup: claim read-back failed");
  return {
    deps: {
      contracts: registry(),
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(tempDir("equiv-receipts"), registry()),
      config: loaded.value as TrustedAuthorityConfig,
      clock: () => CLOCK,
    },
    auth,
    targetDigest: contentDigest(stored.ok ? stored.value : {}),
  };
}

test("committed registry v2 and policy v3 are contract-valid and pin each other exactly", () => {
  const config = loadCommittedConfig();
  assert.equal(config.registry["registry_id"], "areg-nabcor");
  assert.equal(config.registry["registry_version"], 2);
  assert.equal(config.registry["supersedes_registry_version"], 1);
  assert.equal(config.registry["decision_ref"], "DEC-0015");
  assert.equal(config.policy["policy_id"], "hgp-nabcor-1");
  assert.equal(config.policy["policy_version"], 3);
  assert.equal(config.policy["decision_ref"], "DEC-0019");
  assert.equal(config.policy["authority_registry_ref"], "areg-nabcor");
  assert.equal(config.policy["authority_registry_version"], 2);
  assert.equal(config.policy["independent_reviewer_named"], false);
});

test("registry v2 enrolls exactly one least-privilege Product Owner authority whose key_id recomputes from the committed SPKI", () => {
  const config = loadCommittedConfig();
  assert.equal(config.authorities.size, 1, "exactly one authority is enrolled");
  const entry = config.authorities.get(ENROLLED_KEY_ID);
  assert.ok(entry, "the confirmed key_id is enrolled");
  assert.equal(entry.subject_id, ENROLLED_SUBJECT);
  assert.deepEqual(entry.roles, ["product-owner"], "least privilege: the product-owner role only");
  assert.equal(entry.status, "active");
  assert.equal(entry.valid_from, VALID_FROM);
  assert.equal(entry.valid_until, VALID_UNTIL);
  const der = Buffer.from(entry.public_key_spki_b64, "base64");
  assert.equal(der.length, 44, "an Ed25519 SPKI is exactly 44 DER bytes — public material only");
  assert.equal(
    `k${createHash("sha256").update(der).digest("hex")}`,
    ENROLLED_KEY_ID,
    "key_id recomputes from the committed SPKI DER bytes"
  );
  assert.equal(entry.public_key_spki_b64, ENROLLED_SPKI_B64);
});

test("the empty v1 registry, an unknown v3 registry, and a foreign registry cannot satisfy policy v2 at the trusted boundary", () => {
  const enrolledEntry = {
    key_id: ENROLLED_KEY_ID,
    subject_id: ENROLLED_SUBJECT,
    label: "Ibrahim Mohamed (@ibra2000sd) — Product Owner",
    algorithm: "ed25519",
    public_key_spki_b64: ENROLLED_SPKI_B64,
    roles: ["product-owner"],
    valid_from: VALID_FROM,
    valid_until: VALID_UNTIL,
    status: "active",
  };
  const substitutes: [string, Record<string, unknown>][] = [
    [
      "the superseded empty v1 registry",
      {
        schema_version: "1.10.0",
        registry_id: "areg-nabcor",
        registry_version: 1,
        supersedes_registry_version: null,
        created_at: "2026-07-19T00:00:00Z",
        decision_ref: "DEC-0014",
        authorities: [],
      },
    ],
    [
      "an unknown v3 registry",
      {
        schema_version: "1.10.0",
        registry_id: "areg-nabcor",
        registry_version: 3,
        supersedes_registry_version: 2,
        created_at: "2026-07-21T00:00:00Z",
        decision_ref: "DEC-0016",
        authorities: [enrolledEntry],
      },
    ],
    [
      "a foreign registry id",
      {
        schema_version: "1.10.0",
        registry_id: "areg-other",
        registry_version: 2,
        supersedes_registry_version: 1,
        created_at: "2026-07-19T00:00:00Z",
        decision_ref: "DEC-0015",
        authorities: [enrolledEntry],
      },
    ],
  ];
  for (const [label, doc] of substitutes) {
    const dir = tempDir("substitute-registry");
    const substitutePath = join(dir, "authority-registry.active.json");
    writeFileSync(substitutePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    const loaded = loadTrustedAuthorityConfig(POLICY_PATH, substitutePath, registry());
    assert.ok(!loaded.ok, `${label} must be rejected`);
    assert.equal(loaded.ok ? "" : loaded.error.kind, "authority-config-invalid", label);
  }
});

test("unknown keys, impostor signatures, wrong subjects, and wrong roles fail closed against the enrolled registry — and consume nothing", () => {
  const { deps, targetDigest, receiptRoot } = committedDeps();
  const impostor = ephemeralAuthority();

  const cases: [string, Record<string, unknown>, string][] = [
    ["an unenrolled key_id fails", { key_id: impostor.keyId }, "unknown-key"],
    ["a different keypair cannot impersonate the enrolled key_id", {}, "signature-invalid"],
    [
      "a subject other than the registry subject fails before any signature authority",
      { approver_id: "someone-else", requester_id: "someone-else" },
      "subject-mismatch",
    ],
    ["a role the authority does not hold fails", { role: "operator" }, "role-not-held"],
  ];
  for (const [label, overrides, reason] of cases) {
    const payload = v2Payload(targetDigest, overrides);
    const result = verifyAndConsumeApproval(evidenceFor(payload, impostor), deps);
    assert.ok(!result.ok, label);
    const error = result.ok ? null : result.error;
    assert.equal(error?.kind, "approval-unauthorized", label);
    assert.equal(error && "reason" in error ? error.reason : null, reason, label);
  }
  const receipts = readdirSync(receiptRoot);
  assert.deepEqual(receipts, [], "no denial may persist a receipt");
});

test("an ephemeral equivalent of the enrolled configuration satisfies ordinary fact-resolution approval exactly once", () => {
  const s = equivalentScenario();
  const payload = v2Payload(s.targetDigest, { key_id: s.auth.keyId });
  const evidence = evidenceFor(payload, s.auth);
  const first = verifyAndConsumeApproval(evidence, s.deps);
  assert.ok(first.ok, `first consumption must authorize: ${JSON.stringify(first)}`);
  if (first.ok) {
    assert.equal(first.value.gate, "fact-resolution-approval");
    assert.equal(first.value.approverId, ENROLLED_SUBJECT);
    assert.equal(first.value.role, "product-owner");
    assert.equal(first.value.selfReview, true);
    assert.equal(first.value.keyId, s.auth.keyId);
  }
  const replay = verifyAndConsumeApproval(evidence, s.deps);
  assert.ok(!replay.ok, "replay must fail");
  assert.equal(replay.ok ? "" : replay.error.kind, "approval-replay");
});

test("the Product Owner key can satisfy no other gate: reviewer/evaluation-owner gates fail on role, and every independent-review gate stays frozen", () => {
  const s = equivalentScenario();
  const gates: [string, string, string][] = [
    ["quarantine-release", "reviewer", "role-not-held"],
    ["client-facing-publishing", "reviewer", "role-not-held"],
    ["blocking-evaluation-gate-change", "evaluation-owner", "role-not-held"],
    // The one independent-review gate whose required role the Product Owner
    // DOES hold: it must still fail — on the frozen independent-review gate.
    ["real-client-data-provider-approval", "product-owner", "independent-review-frozen"],
  ];
  for (const [gate, role, expected] of gates) {
    const payload = v2Payload(s.targetDigest, { key_id: s.auth.keyId, gate, role });
    const result = verifyAndConsumeApproval(evidenceFor(payload, s.auth), s.deps);
    assert.ok(!result.ok, `gate '${gate}' must be denied`);
    const error = result.ok ? null : result.error;
    if (expected === "independent-review-frozen") {
      assert.equal(error?.kind, "independent-review-frozen", gate);
    } else {
      assert.equal(error?.kind, "approval-unauthorized", gate);
      assert.equal(error && "reason" in error ? error.reason : null, expected, gate);
    }
  }
});

test("an expired and a revoked variant of the enrolled entry fail closed", () => {
  const auth = ephemeralAuthority();
  const base = {
    key_id: auth.keyId,
    subject_id: ENROLLED_SUBJECT,
    label: "Lifecycle-variant test authority",
    algorithm: "ed25519",
    public_key_spki_b64: auth.spkiB64,
    roles: ["product-owner"],
    valid_from: VALID_FROM,
    valid_until: VALID_UNTIL,
    status: "active",
  };
  const variants: [string, Record<string, unknown>, string][] = [
    [
      "expired",
      { ...base, valid_from: "2025-01-01T00:00:00Z", valid_until: "2025-06-01T00:00:00Z" },
      "key-expired",
    ],
    [
      "revoked",
      {
        ...base,
        status: "revoked",
        revoked_at: "2026-07-19T12:00:00Z",
        revocation_reason: "synthetic revocation for the lifecycle test",
      },
      "key-revoked",
    ],
  ];
  for (const [label, entry, reason] of variants) {
    const registryDocument = {
      schema_version: "1.10.0",
      registry_id: "areg-nabcor",
      registry_version: 2,
      supersedes_registry_version: 1,
      created_at: "2026-07-19T00:08:51Z",
      decision_ref: "DEC-0015",
      authorities: [entry],
    };
    const policy = JSON.parse(JSON.stringify(loadCommittedConfig().policy)) as Record<string, unknown>;
    const loaded = trustedConfig(policy, registryDocument);
    assert.ok(loaded.ok, `${label} config must load (the entry is contract-valid)`);
    const artifactsRoot = tempDir("lifecycle-artifacts");
    const store = new FileArtifactStore(artifactsRoot, registry());
    assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok);
    const stored = store.get(WS, BRAND, "claim", "claim_t_0001");
    assert.ok(stored.ok);
    const deps: HumanGateVerifierDeps = {
      contracts: registry(),
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(tempDir("lifecycle-receipts"), registry()),
      config: loaded.value as TrustedAuthorityConfig,
      clock: () => CLOCK,
    };
    const payload = v2Payload(contentDigest(stored.ok ? stored.value : {}), { key_id: auth.keyId });
    const result = verifyAndConsumeApproval(evidenceFor(payload, auth), deps);
    assert.ok(!result.ok, `${label} key must be denied`);
    const error = result.ok ? null : result.error;
    assert.equal(error?.kind, "approval-unauthorized", label);
    assert.equal(error && "reason" in error ? error.reason : null, reason, label);
  }
});
