#!/usr/bin/env node
// Deterministic provider-policy chain validation (DEC-0019, Phase 1C.1).
//
// Verifies the COMPLETE cryptographic chain that authorizes the configured
// (live-disabled) Anthropic implementation:
//
//   committed provider-policy candidate
//     -> canonical content digest (recomputed here, plus the candidate's own
//        self-integrity digest)
//     -> committed public provider-enablement approval evidence (schema shape,
//        payload digest recomputation, gate, verdict, target binding, key)
//     -> Ed25519 signature verified against the committed authority registry
//     -> committed public consumption receipt (receipt-id recomputation,
//        payload-digest match — replay protection consumed exactly once)
//     -> ratified DEC-0018 / DEC-0019 decision records
//     -> active gateway policy embedding the exact candidate digest and the
//        evidence/receipt references
//     -> provider operational state pinning live invocation OFF.
//
// A proposed or unsigned candidate grants nothing: if any link is missing or
// inconsistent, this gate fails. No network access. Runs in `npm run validate`
// and CI.
import { createHash, createPublicKey, verify as edVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("FAIL " + msg);
};
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));

// Canonical JSON — mirrored from src/kernel/canonical-json.ts (the two must
// change together).
const canonicalJson = (v) =>
  Array.isArray(v)
    ? `[${v.map(canonicalJson).join(",")}]`
    : v !== null && typeof v === "object"
      ? `{${Object.keys(v)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
          .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
const sha = (text) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
const APPROVAL_DOMAIN = "nabcor-human-gate-approval-v1";

const candidate = readJson("contracts/provider-policy-candidate.active.json");
const gatewayPolicy = readJson("contracts/gateway-policy.active.json");
const operationalState = readJson("contracts/provider-operational-state.active.json");
const humanGatePolicy = readJson("contracts/human-gate-policy.active.json");
const registry = readJson("contracts/authority-registry.active.json");

// ---- 1. Candidate self-integrity and canonical content digest ----
const { candidate_digest, ...candidateRest } = candidate;
const selfDigest = sha(canonicalJson(candidateRest));
if (candidate_digest !== selfDigest) {
  fail(`candidate_digest '${candidate_digest}' does not match the recomputation '${selfDigest}'`);
}
const candidateContentDigest = sha(canonicalJson(candidate));

// ---- 2. Active policy and operational state bind the exact candidate ----
for (const [label, doc] of [
  ["gateway-policy.active.json", gatewayPolicy],
  ["provider-operational-state.active.json", operationalState],
]) {
  if (doc.provider_policy_candidate_digest !== candidateContentDigest) {
    fail(
      `${label} embeds candidate digest '${doc.provider_policy_candidate_digest}' but the committed candidate's canonical content digest is '${candidateContentDigest}'`
    );
  }
  if (doc.provider_policy_candidate_ref !== candidate.artifact_id) {
    fail(`${label} references candidate '${doc.provider_policy_candidate_ref}', not '${candidate.artifact_id}'`);
  }
}

// ---- 3. Committed public approval evidence ----
let evidence;
try {
  evidence = readJson("contracts/provider-enablement-approval.evidence.json");
} catch (e) {
  fail(
    `the committed public provider-enablement approval evidence is missing or unreadable (${String(e.message)}); an unsigned candidate grants nothing — the policy chain is not ratified`
  );
}
let receipt;
try {
  receipt = readJson("contracts/provider-enablement-approval.receipt.json");
} catch (e) {
  fail(
    `the committed public consumption receipt is missing or unreadable (${String(e.message)}); an unconsumed approval proves no replay protection`
  );
}

if (evidence && receipt) {
  const payload = evidence.payload ?? {};
  const payloadBytes = `${APPROVAL_DOMAIN}\n${canonicalJson(payload)}`;
  const payloadDigest = sha(payloadBytes);
  if (evidence.payload_digest !== payloadDigest) {
    fail(`evidence payload_digest '${evidence.payload_digest}' does not match the recomputation '${payloadDigest}'`);
  }
  if (payload.gate !== "provider-enablement-approval") {
    fail(`evidence gate '${payload.gate}' is not provider-enablement-approval`);
  }
  if (payload.verdict !== "approved") {
    fail(`evidence verdict '${payload.verdict}' is not approved`);
  }
  if (payload.target_artifact_type !== "provider-policy-candidate") {
    fail(`evidence target type '${payload.target_artifact_type}' is not provider-policy-candidate`);
  }
  if (payload.target_artifact_ref !== candidate.artifact_id) {
    fail(`evidence targets '${payload.target_artifact_ref}', not the committed candidate '${candidate.artifact_id}'`);
  }
  if (payload.target_artifact_digest !== candidateContentDigest) {
    fail(
      `evidence signs candidate digest '${payload.target_artifact_digest}' but the committed candidate's canonical digest is '${candidateContentDigest}' — the signed and committed candidates differ`
    );
  }
  if (payload.role !== "product-owner" || payload.self_review !== true) {
    fail("evidence must carry the product-owner role with the truthful self_review declaration (DEC-0008)");
  }
  if (payload.policy_ref !== humanGatePolicy.policy_id || payload.policy_version !== humanGatePolicy.policy_version) {
    fail(
      `evidence binds policy '${payload.policy_ref}' v${payload.policy_version}, not the active human-gate policy '${humanGatePolicy.policy_id}' v${humanGatePolicy.policy_version}`
    );
  }

  // Signature against the committed registry key (public material only).
  const authority = (registry.authorities ?? []).find((a) => a.key_id === payload.key_id);
  if (!authority) {
    fail(`evidence key '${payload.key_id}' is not enrolled in the committed authority registry`);
  } else {
    if (authority.subject_id !== payload.approver_id) {
      fail(`evidence approver '${payload.approver_id}' does not match the registry subject '${authority.subject_id}'`);
    }
    if (!(authority.roles ?? []).includes("product-owner") || authority.status !== "active") {
      fail("the signing authority must hold the active product-owner role");
    }
    try {
      const publicKey = createPublicKey({
        key: Buffer.from(authority.public_key_spki_b64, "base64"),
        format: "der",
        type: "spki",
      });
      const valid = edVerify(
        null,
        Buffer.from(payloadBytes, "utf8"),
        publicKey,
        Buffer.from(evidence.signature?.signature_b64 ?? "", "base64")
      );
      if (!valid) fail("the Ed25519 signature over the canonical payload bytes does not verify against the enrolled Product Owner public key");
    } catch (e) {
      fail(`signature verification errored: ${String(e.message)}`);
    }
  }

  // ---- 4. Consumption receipt (replay protection, consumed exactly once) ----
  const receiptScope = {
    brand_ref: payload.brand_ref,
    key_id: payload.key_id,
    nonce: payload.nonce,
    policy_ref: payload.policy_ref,
    workspace: payload.workspace,
  };
  const expectedReceiptId = `r${createHash("sha256").update(canonicalJson(receiptScope), "utf8").digest("hex")}`;
  if (receipt.receipt_id !== expectedReceiptId) {
    fail(`receipt_id '${receipt.receipt_id}' does not match the recomputation '${expectedReceiptId}' over the evidence's consumption scope`);
  }
  if (receipt.payload_digest !== payloadDigest) {
    fail("the receipt's payload_digest does not match the evidence — the receipt consumed a different approval");
  }
  if (receipt.gate !== "provider-enablement-approval" || receipt.verdict !== "approved" || receipt.verification_result !== "authorized") {
    fail("the receipt must record an authorized approved provider-enablement consumption");
  }
  if (receipt.target_artifact_digest !== candidateContentDigest) {
    fail("the receipt's target digest does not match the committed candidate");
  }

  // ---- 5. Active policy references the exact public evidence ----
  if (gatewayPolicy.provider_enablement_evidence_ref !== evidence.evidence_id) {
    fail(
      `gateway policy references evidence '${gatewayPolicy.provider_enablement_evidence_ref}' but the committed evidence is '${evidence.evidence_id}'`
    );
  }
  if (gatewayPolicy.provider_enablement_receipt_ref !== receipt.receipt_id) {
    fail(
      `gateway policy references receipt '${gatewayPolicy.provider_enablement_receipt_ref}' but the committed receipt is '${receipt.receipt_id}'`
    );
  }

  // ---- 6. No private material in the committed public evidence ----
  const evidenceText = readFileSync(join(root, "contracts/provider-enablement-approval.evidence.json"), "utf8");
  const armor = ["PRIVATE", "KEY"].join(" ");
  if (evidenceText.includes(`BEGIN ${armor}`)) fail("the committed evidence contains key armor");
  for (const pattern of [/sk-ant-[A-Za-z0-9_-]{10,}/, /sk-[A-Za-z0-9_-]{20,}/]) {
    if (pattern.test(evidenceText)) fail(`the committed evidence contains a credential-shaped value (${pattern})`);
  }
}

// ---- 7. Decisions ratified; live invocation and EXP-0001 disabled ----
const dec18 = readFileSync(join(root, "brain/decisions/DEC-0018-provider-enablement.md"), "utf8");
const dec19 = readFileSync(join(root, "brain/decisions/DEC-0019-anthropic-provider-implementation.md"), "utf8");
if (!/^status: ratified$/m.test(dec18)) fail("DEC-0018 must be ratified");
if (!/^status: ratified$/m.test(dec19)) fail("DEC-0019 must be ratified");
if (candidate.live_invocation_enabled !== false || operationalState.live_invocation_enabled !== false) {
  fail("live invocation must remain disabled in both the signed candidate and the operational state");
}
if (candidate.exp_0001_execution_enabled !== false || operationalState.exp_0001_executed !== false) {
  fail("EXP-0001 execution must remain disabled and unexecuted");
}

if (failures > 0) {
  console.error(`\n${failures} provider-chain failure(s).`);
  process.exit(1);
}
console.log("Provider policy chain: candidate -> evidence -> authority -> decisions -> active policy all verified; live invocation disabled.");
