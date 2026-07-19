// Authorization verification (DEC-0014): a valid Ed25519 signature is
// necessary but never sufficient — policy authorization, registry key
// lifecycle, exact target address + digest, recomputed self_review, validity
// windows, and atomic nonce consumption all gate the authorized result.
import assert from "node:assert/strict";
import { copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { approvalPayloadDigest, signApprovalPayload } from "../src/authority/approval-payload.js";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import {
  approvalScenario,
  authorityEntry,
  ephemeralAuthority,
  policyDoc,
  registryDoc,
  signedEvidence,
  testNonce,
  trustedConfig,
} from "./authority-helpers.js";
import { BRAND, WS, validClaim } from "./helpers.js";

function expectDenied(
  result: ReturnType<typeof verifyAndConsumeApproval>,
  reason: string,
  label: string
): void {
  assert.equal(result.ok, false, `${label}: must not authorize`);
  if (!result.ok) {
    assert.equal(result.error.kind, "approval-unauthorized", `${label}: kind`);
    if (result.error.kind === "approval-unauthorized") {
      assert.equal(result.error.reason, reason, `${label}: reason`);
    }
  }
}

function receiptCount(receiptRoot: string): number {
  try {
    return readdirSync(join(receiptRoot, WS, BRAND, "approval-receipt")).length;
  } catch {
    return 0;
  }
}

test("a valid Ed25519 approval verifies and its first consumption succeeds", () => {
  const s = approvalScenario();
  const result = verifyAndConsumeApproval(signedEvidence(s), s.deps);
  assert.ok(result.ok, `expected authorization, got ${JSON.stringify(result)}`);
  if (result.ok) {
    assert.equal(result.value.gate, "fact-resolution-approval");
    assert.equal(result.value.verdict, "approved");
    assert.equal(result.value.selfReview, true);
    assert.equal(result.value.keyId, s.auth.keyId);
    assert.match(result.value.receiptId, /^r[0-9a-f]{64}$/);
    // The receipt exists, is immutable, and is readable from its namespace.
    const receipt = s.deps.receiptStore.get(WS, BRAND, result.value.receiptId);
    assert.ok(receipt.ok, "persisted receipt must read back");
    if (receipt.ok) {
      assert.equal(receipt.value["verification_result"], "authorized");
      assert.equal(receipt.value["key_id"], s.auth.keyId);
    }
  }
  assert.equal(receiptCount(s.receiptRoot), 1);
});

test("a payload modified after signing fails signature verification", () => {
  const s = approvalScenario();
  const evidence = signedEvidence(s);
  const payload = evidence["payload"] as Record<string, unknown>;
  payload["reason"] = "modified after signing";
  (evidence as Record<string, unknown>)["payload_digest"] = approvalPayloadDigest(payload);
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "signature-invalid", "modified payload");
  assert.equal(receiptCount(s.receiptRoot), 0, "failed signature must not consume the nonce");
});

test("a modified signature fails", () => {
  const s = approvalScenario();
  const evidence = signedEvidence(s);
  const signature = evidence["signature"] as Record<string, unknown>;
  const bytes = Buffer.from(String(signature["signature_b64"]), "base64");
  bytes[10] = bytes[10]! ^ 0x01;
  signature["signature_b64"] = bytes.toString("base64");
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "signature-invalid", "modified signature");
});

test("a signature from a key other than the enrolled registry key fails — the caller cannot select the public key", () => {
  const s = approvalScenario();
  // Signed by a DIFFERENT keypair while claiming the enrolled key_id: the
  // verifier resolves the key from the trusted registry only, so the
  // attacker-chosen key never participates.
  const attacker = ephemeralAuthority();
  const evidence = signedEvidence(s, {}, attacker);
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "signature-invalid", "foreign signer");
});

test("an unknown key_id fails closed", () => {
  const s = approvalScenario();
  const stranger = ephemeralAuthority();
  const evidence = signedEvidence(s, { key_id: stranger.keyId }, stranger);
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "unknown-key", "unenrolled key");
});

test("evidence with unknown fields, wrong algorithm, malformed signature encoding, or missing signature fails contract validation", () => {
  const s = approvalScenario();
  const base = signedEvidence(s);

  const smuggled = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  (smuggled["payload"] as Record<string, unknown>)["extra"] = true;
  const r1 = verifyAndConsumeApproval(smuggled, s.deps);
  assert.equal(r1.ok, false);
  if (!r1.ok) assert.equal(r1.error.kind, "validation-failed", "unknown payload field");

  const substituted = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  (substituted["signature"] as Record<string, unknown>)["algorithm"] = "rsa-pss";
  const r2 = verifyAndConsumeApproval(substituted, s.deps);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.error.kind, "validation-failed", "algorithm substitution");

  const malformed = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  (malformed["signature"] as Record<string, unknown>)["signature_b64"] = "%%%not-base64%%%";
  const r3 = verifyAndConsumeApproval(malformed, s.deps);
  assert.equal(r3.ok, false);
  if (!r3.ok) assert.equal(r3.error.kind, "validation-failed", "malformed signature encoding");

  const unsigned = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  delete unsigned["signature"];
  const r4 = verifyAndConsumeApproval(unsigned, s.deps);
  assert.equal(r4.ok, false);
  if (!r4.ok) assert.equal(r4.error.kind, "validation-failed", "shape-valid metadata without a signature");

  assert.equal(receiptCount(s.receiptRoot), 0, "no contract failure may create a receipt");
});

test("a caller-selected registry is impossible: the trusted boundary rejects a registry the policy does not pin", () => {
  const auth = ephemeralAuthority();
  const staleRegistry = registryDoc([authorityEntry(auth)], { registry_version: 1 });
  const policy = policyDoc({ authority_registry_version: 2 });
  const loaded = trustedConfig(policy, staleRegistry);
  assert.equal(loaded.ok, false, "a stale registry at the trusted path must fail closed");
  if (!loaded.ok) assert.equal(loaded.error.kind, "authority-config-invalid");

  const foreignRegistry = registryDoc([authorityEntry(auth)], { registry_id: "areg-evil" });
  const loaded2 = trustedConfig(policyDoc(), foreignRegistry);
  assert.equal(loaded2.ok, false, "a foreign registry id must fail closed");
});

test("a registry entry with a non-Ed25519 or malformed key fails closed at the trusted boundary", () => {
  const auth = ephemeralAuthority();
  const badSpki = Buffer.from("not a real SPKI").toString("base64");
  const entry = authorityEntry(auth, {
    public_key_spki_b64: badSpki,
    // key_id consistent with the junk bytes so only the SPKI check can object
    key_id: `k${"0".repeat(64)}`,
  });
  const loaded = trustedConfig(policyDoc(), registryDoc([entry]));
  assert.equal(loaded.ok, false, "malformed SPKI must fail registry validation");
  if (!loaded.ok) assert.equal(loaded.error.kind, "validation-failed");
});

test("wrong-role and wrong-gate authorization fails even with a valid signature", () => {
  const s = approvalScenario({ entry: { roles: ["operator"] } });
  // Role not held by the authority.
  const notHeld = signedEvidence(s, { role: "product-owner" });
  expectDenied(verifyAndConsumeApproval(notHeld, s.deps), "role-not-held", "role not held");
  // Role held but not the one the gate requires.
  const wrongForGate = signedEvidence(s, { role: "operator", self_review: true });
  expectDenied(
    verifyAndConsumeApproval(wrongForGate, s.deps),
    "role-not-authorized-for-gate",
    "role not authorized for gate"
  );
});

test("a gate outside the active policy's allowed set fails", () => {
  const s = approvalScenario({
    policy: {
      allowed_gates: ["fact-resolution-approval"],
      gate_requirements: {
        "fact-resolution-approval": {
          required_role: "product-owner",
          independent_review_required: false,
        },
      },
    },
  });
  const evidence = signedEvidence(s, { gate: "quarantine-release", role: "reviewer" });
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "gate-not-allowed", "gate not allowed");
});

test("every DEC-0008 independent-review gate stays frozen — a valid Product Owner self-signature can never satisfy one", () => {
  const s = approvalScenario();
  const frozen: [string, string][] = [
    ["quarantine-release", "reviewer"],
    ["client-facing-publishing", "reviewer"],
    ["blocking-evaluation-gate-change", "evaluation-owner"],
    ["real-client-data-provider-approval", "product-owner"],
  ];
  for (const [gate, role] of frozen) {
    const evidence = signedEvidence(s, { gate, role });
    const result = verifyAndConsumeApproval(evidence, s.deps);
    assert.equal(result.ok, false, `${gate} must not authorize`);
    if (!result.ok) {
      assert.equal(result.error.kind, "independent-review-frozen", gate);
    }
  }
  assert.equal(receiptCount(s.receiptRoot), 0, "no frozen gate may consume a nonce or create a receipt");
});

test("cross-brand, cross-workspace, and missing targets fail before any signature authority is used", () => {
  const s = approvalScenario();
  const crossBrand = signedEvidence(s, { brand_ref: "brand_other" });
  const r1 = verifyAndConsumeApproval(crossBrand, s.deps);
  assert.equal(r1.ok, false);
  if (!r1.ok) assert.equal(r1.error.kind, "artifact-not-found", "cross-brand target");

  const crossWorkspace = signedEvidence(s, { workspace: "ws_other" });
  const r2 = verifyAndConsumeApproval(crossWorkspace, s.deps);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.error.kind, "artifact-not-found", "cross-workspace target");

  const missing = signedEvidence(s, { target_artifact_ref: "claim_t_9999" });
  const r3 = verifyAndConsumeApproval(missing, s.deps);
  assert.equal(r3.ok, false);
  if (!r3.ok) assert.equal(r3.error.kind, "artifact-not-found", "missing target");
});

test("an approval whose target address hides a mismatched artifact fails at the address check, before signature authority", () => {
  const s = approvalScenario();
  // Plant the stored claim under a foreign canonical filename, then approve
  // that address — with a DELIBERATELY invalid signature. The failure must be
  // the address mismatch, proving target integrity precedes signature use.
  copyFileSync(
    join(s.artifactsRoot, WS, BRAND, "claim", "claim_t_0001.json"),
    join(s.artifactsRoot, WS, BRAND, "claim", "claim_t_0777.json")
  );
  const evidence = signedEvidence(s, { target_artifact_ref: "claim_t_0777" });
  (evidence["signature"] as Record<string, unknown>)["signature_b64"] = `${"A".repeat(86)}==`;
  const result = verifyAndConsumeApproval(evidence, s.deps);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.kind,
      "artifact-address-mismatch",
      "the address check must fire before the (invalid) signature is ever consulted"
    );
  }
});

test("a stale target digest fails: the artifact content the human saw is not what the store holds", () => {
  const s = approvalScenario();
  const otherClaim = validClaim({ artifact_id: "claim_t_0002", statement: "A different statement" });
  assert.ok(s.store.put(WS, BRAND, "claim", otherClaim).ok);
  // Digest of claim_t_0001 signed against target claim_t_0002.
  const evidence = signedEvidence(s, { target_artifact_ref: "claim_t_0002" });
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "target-digest-mismatch", "stale digest");
});

test("a policy binding mismatch fails: evidence signed under another policy id or version", () => {
  const s = approvalScenario();
  expectDenied(
    verifyAndConsumeApproval(signedEvidence(s, { policy_version: 2 }), s.deps),
    "policy-mismatch",
    "wrong policy version"
  );
  expectDenied(
    verifyAndConsumeApproval(signedEvidence(s, { policy_ref: "hgp-other" }), s.deps),
    "policy-mismatch",
    "wrong policy id"
  );
});

test("key lifecycle fails closed: not-yet-valid, expired, and revoked keys", () => {
  const notYet = approvalScenario({ entry: { valid_from: "2026-08-01T00:00:00Z" } });
  expectDenied(
    verifyAndConsumeApproval(signedEvidence(notYet), notYet.deps),
    "key-not-yet-valid",
    "not-yet-valid key"
  );

  const expired = approvalScenario({
    entry: { valid_from: "2026-06-01T00:00:00Z", valid_until: "2026-07-01T00:00:00Z" },
  });
  expectDenied(verifyAndConsumeApproval(signedEvidence(expired), expired.deps), "key-expired", "expired key");

  const revoked = approvalScenario({
    entry: {
      status: "revoked",
      revoked_at: "2026-07-10T00:00:00Z",
      revocation_reason: "synthetic test revocation",
    },
  });
  expectDenied(verifyAndConsumeApproval(signedEvidence(revoked), revoked.deps), "key-revoked", "revoked key");
});

test("a registry subject different from the signed approver_id fails", () => {
  const s = approvalScenario({ entry: { subject_id: "someone-else" } });
  const evidence = signedEvidence(s); // approver_id stays SUBJECT
  expectDenied(verifyAndConsumeApproval(evidence, s.deps), "subject-mismatch", "subject mismatch");
});

test("self-review semantics: inconsistent declarations fail at the contract layer and a truthful non-self review requires a distinct requester", () => {
  const s = approvalScenario();
  // Same person, self_review=false: contract semantic layer rejects.
  const sameFalse = signedEvidence(s, { self_review: false });
  const r1 = verifyAndConsumeApproval(sameFalse, s.deps);
  assert.equal(r1.ok, false);
  if (!r1.ok) assert.equal(r1.error.kind, "validation-failed", "self_review=false for the same person");

  // Different requester, self_review=true: contract semantic layer rejects.
  const diffTrue = signedEvidence(s, { requester_id: "someone-else", self_review: true });
  const r2 = verifyAndConsumeApproval(diffTrue, s.deps);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.error.kind, "validation-failed", "self_review=true for different people");

  // Different requester, self_review=false: consistent, and authorizes.
  const honest = signedEvidence(s, { requester_id: "someone-else", self_review: false });
  const r3 = verifyAndConsumeApproval(honest, s.deps);
  assert.ok(r3.ok, `an honest non-self-review approval must authorize: ${JSON.stringify(r3)}`);
});

test("time windows enforce the injected clock: future-issued, expired, and over-TTL approvals fail", () => {
  const s = approvalScenario();
  expectDenied(
    verifyAndConsumeApproval(
      signedEvidence(s, { issued_at: "2026-07-17T13:00:00Z", expires_at: "2026-07-17T14:00:00Z" }),
      s.deps
    ),
    "approval-not-yet-valid",
    "issued beyond clock skew"
  );
  expectDenied(
    verifyAndConsumeApproval(
      signedEvidence(s, { issued_at: "2026-07-17T09:00:00Z", expires_at: "2026-07-17T10:00:00Z" }),
      s.deps
    ),
    "approval-expired",
    "expired approval"
  );
  expectDenied(
    verifyAndConsumeApproval(
      signedEvidence(s, { issued_at: "2026-07-17T11:30:00Z", expires_at: "2026-07-20T11:30:00Z" }),
      s.deps
    ),
    "ttl-exceeded",
    "TTL beyond the policy maximum"
  );
  // A small skew inside the allowance is accepted.
  const skewed = signedEvidence(s, {
    issued_at: "2026-07-17T12:04:00Z",
    expires_at: "2026-07-17T13:00:00Z",
    nonce: testNonce(),
  });
  assert.ok(verifyAndConsumeApproval(skewed, s.deps).ok, "4 minutes of skew is inside the 300s allowance");
});

test("an unsigned Decision artifact and legacy envelope approvals grant no authority", () => {
  const s = approvalScenario();
  // A ratified, schema-valid decision artifact is not approval evidence.
  const decision = {
    schema_version: "1.8.0",
    artifact_id: "DEC-9999-test",
    brand_ref: null,
    created_at: "2026-07-17T12:00:00Z",
    creator_type: "human",
    lifecycle_status: "accepted",
    approvals: [
      { approved_by: "user_owner", gate: "ratification", verdict: "approved", at: "2026-07-17T12:00:00Z" },
    ],
    decision_id: "DEC-9999-test",
    title: "synthetic",
    status: "ratified",
    context: "c",
    problem: "p",
    options: [{ option_id: "a", summary: "s" }],
    selected_option: "a",
    reason: "r",
    decided_by: "user_owner",
    revisit_trigger: "never needed",
  };
  const r1 = verifyAndConsumeApproval(decision, s.deps);
  assert.equal(r1.ok, false, "a decision artifact is not signed approval evidence");
  if (!r1.ok) assert.equal(r1.error.kind, "validation-failed");

  // A source artifact carrying a legacy quarantine-release approvals entry is
  // audit metadata, not evidence.
  const legacySource = {
    ...validClaim({ artifact_id: "claim_legacy" }),
    approvals: [
      {
        approved_by: "user_owner",
        gate: "quarantine-release",
        verdict: "approved",
        at: "2026-07-17T12:00:00Z",
      },
    ],
  };
  const r2 = verifyAndConsumeApproval(legacySource, s.deps);
  assert.equal(r2.ok, false, "legacy envelope approvals grant no runtime authority");
  if (!r2.ok) assert.equal(r2.error.kind, "validation-failed");
  assert.equal(receiptCount(s.receiptRoot), 0);
});
