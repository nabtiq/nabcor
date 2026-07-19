// Signature-binding and authorization tests (DEC-0016): the ONLY thing the
// Product Owner can authorize is the exact immutable decision artifact, and
// every substitution, tamper, gate, role, key, policy, and reuse path denies
// with zero claim mutations.
import assert from "node:assert/strict";
import test from "node:test";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { applyFactResolution } from "../src/resolve/apply-resolution.js";
import { ephemeralAuthority } from "./authority-helpers.js";
import { BRAND, WS, registry } from "./helpers.js";
import {
  DECISION_ID,
  contentDigest,
  decisionEvidence,
  prepareDecision,
  resolutionScenario,
  tamperStoredArtifact,
} from "./resolution-helpers.js";

function expectFailure(result: { ok: boolean }, kind: string, pattern?: RegExp): void {
  assert.equal(result.ok, false, `expected ${kind} failure, got success`);
  const error = (result as { ok: false; error: { kind: string; message?: string; reason?: string } }).error;
  assert.equal(error.kind, kind, `expected ${kind}, got ${error.kind}: ${error.message}`);
  if (pattern) assert.match(String(error.message), pattern);
}

function denialReason(result: { ok: boolean }): string {
  const error = (result as { ok: false; error: { kind: string; reason?: string } }).error;
  assert.equal(error.kind, "approval-unauthorized");
  return String(error.reason);
}

/** The complete claim state of the scenario namespace, for zero-mutation proofs. */
function claimStateOf(scenario: ReturnType<typeof resolutionScenario>): string {
  const listed = scenario.store.list(WS, BRAND, "claim");
  assert.ok(listed.ok);
  return JSON.stringify(
    listed.value.map((e) => {
      const got = scenario.store.get(WS, BRAND, "claim", e.artifactId);
      assert.ok(got.ok);
      return [e.artifactId, contentDigest(got.value)];
    })
  );
}

test("approval over the exact stored decision verifies, consumes once, and applies", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value);
  const applied = applyFactResolution(evidence, scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));
  assert.equal(applied.value.replayed, false);
  assert.equal(applied.value.application["decision_ref"], DECISION_ID);
  // The application result itself is contract-valid.
  const validated = registry().validate("fact-resolution-application", applied.value.application);
  assert.ok(validated.ok, JSON.stringify(validated));
});

test("signing a truth analysis instead of the decision authorizes no application", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const before = claimStateOf(scenario);
  // Evidence targeting the ANALYSIS verifies as generic approval evidence
  // (truth-analysis is a legal verify target), but the application boundary
  // refuses it: the analysis does not carry the requested action.
  const analysisDigest = contentDigest(scenario.analysis);
  const evidence = decisionEvidence(scenario, prepared.value, {
    target_artifact_type: "truth-analysis",
    target_artifact_ref: String(scenario.analysis["artifact_id"]),
    target_artifact_digest: analysisDigest,
  });
  const applied = applyFactResolution(evidence, scenario.deps);
  expectFailure(applied, "invalid-input", /complete requested action/);
  assert.equal(claimStateOf(scenario), before);
  // Nothing was consumed either: the same nonce would still verify.
});

test("target digest substitution fails closed", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const before = claimStateOf(scenario);
  const evidence = decisionEvidence(scenario, prepared.value, {
    target_artifact_digest: "sha256:" + "0".repeat(64),
  });
  const applied = applyFactResolution(evidence, scenario.deps);
  expectFailure(applied, "approval-unauthorized", /decision changed after signing|different decision/);
  assert.equal(claimStateOf(scenario), before);
});

test("a decision whose stored bytes changed after signing fails the digest binding", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value);
  // Tamper the stored decision file directly (still contract-valid content:
  // only the rationale changes) — the recomputed digest no longer matches
  // the signed one.
  const tampered = { ...prepared.value.decision, rationale: "post-signing edit of the rationale" };
  tamperStoredArtifact(scenario.artifactsRoot, "fact-resolution-decision", DECISION_ID, tampered);
  const before = claimStateOf(scenario);
  const applied = applyFactResolution(evidence, scenario.deps);
  expectFailure(applied, "approval-unauthorized");
  assert.equal(claimStateOf(scenario), before);
});

test("a wrong gate cannot authorize a fact resolution", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const before = claimStateOf(scenario);
  const evidence = decisionEvidence(scenario, prepared.value, {
    gate: "quarantine-release",
    role: "reviewer",
  });
  const applied = applyFactResolution(evidence, scenario.deps);
  expectFailure(applied, "invalid-input", /requires gate 'fact-resolution-approval'/);
  assert.equal(claimStateOf(scenario), before);
});

test("independent-review gates stay frozen even for a decision target", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value, {
    gate: "quarantine-release",
    role: "reviewer",
  });
  const verified = verifyAndConsumeApproval(evidence, scenario.deps);
  expectFailure(verified, "independent-review-frozen", /independent reviewer/);
});

test("an unknown key, wrong subject, wrong role, expired key, and revoked key all deny with zero mutations", () => {
  // Unknown key: signed by a keypair that is not enrolled.
  {
    const scenario = resolutionScenario();
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const before = claimStateOf(scenario);
    const impostor = ephemeralAuthority();
    const evidence = decisionEvidence(scenario, prepared.value, { key_id: impostor.keyId }, impostor);
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "unknown-key");
    assert.equal(claimStateOf(scenario), before);
  }
  // Impostor signature under the enrolled key_id.
  {
    const scenario = resolutionScenario();
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const impostor = ephemeralAuthority();
    const evidence = decisionEvidence(scenario, prepared.value, {}, impostor);
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "signature-invalid");
  }
  // Wrong subject: signed approver differs from the registry subject.
  {
    const scenario = resolutionScenario();
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const evidence = decisionEvidence(scenario, prepared.value, {
      approver_id: "someone-else",
      requester_id: "someone-else",
    });
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "subject-mismatch");
  }
  // Wrong role for the gate.
  {
    const scenario = resolutionScenario();
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const evidence = decisionEvidence(scenario, prepared.value, { role: "operator" });
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "role-not-authorized-for-gate");
  }
  // Expired authority.
  {
    const scenario = resolutionScenario({
      configOverrides: { entry: { valid_until: "2026-07-10T00:00:00Z" } },
    });
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const evidence = decisionEvidence(scenario, prepared.value);
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "key-expired");
  }
  // Revoked authority.
  {
    const scenario = resolutionScenario({
      configOverrides: {
        entry: {
          status: "revoked",
          revoked_at: "2026-07-10T00:00:00Z",
          revocation_reason: "synthetic test revocation",
        },
      },
    });
    const prepared = prepareDecision(scenario);
    assert.ok(prepared.ok);
    const evidence = decisionEvidence(scenario, prepared.value);
    const applied = applyFactResolution(evidence, scenario.deps);
    assert.equal(denialReason(applied), "key-revoked");
  }
});

test("a policy-binding mismatch denies", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value, { policy_version: 7 });
  const applied = applyFactResolution(evidence, scenario.deps);
  assert.equal(denialReason(applied), "policy-mismatch");
});

test("a rejected verdict consumes the approval but mutates no claim", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const before = claimStateOf(scenario);
  const evidence = decisionEvidence(scenario, prepared.value, { verdict: "rejected" });
  const applied = applyFactResolution(evidence, scenario.deps);
  expectFailure(applied, "resolution-rejected", /rejected/);
  assert.equal(claimStateOf(scenario), before);
  // The rejection consumed the nonce: replaying the same evidence resolves
  // idempotently to the same recorded rejection, still mutating nothing.
  const replayed = applyFactResolution(evidence, scenario.deps);
  expectFailure(replayed, "resolution-rejected");
  assert.equal(claimStateOf(scenario), before);
});

test("a consumed approval cannot be reused for a different decision", () => {
  const scenario = resolutionScenario();
  const prepared = prepareDecision(scenario);
  assert.ok(prepared.ok);
  const evidence = decisionEvidence(scenario, prepared.value);
  const applied = applyFactResolution(evidence, scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));

  // A second decision artifact for a hypothetical later operation: reusing
  // the SAME nonce/key/policy (same receipt identity) against it must fail —
  // the receipt binds the consumed approval to the first decision.
  const payload = (evidence as { payload: Record<string, unknown> }).payload;
  const secondDecision = {
    ...prepared.value.decision,
    artifact_id: "frd_r_0002",
    rationale: "a different decision the owner never signed with this nonce",
  };
  const put = scenario.store.put(WS, BRAND, "fact-resolution-decision", secondDecision);
  assert.ok(put.ok, JSON.stringify(put));
  const reused = decisionEvidence(
    scenario,
    { decision: secondDecision, decisionDigest: contentDigest(secondDecision) },
    { nonce: payload["nonce"] }
  );
  const reapplied = applyFactResolution(reused, scenario.deps);
  expectFailure(reapplied, "resolution-conflict", /different signed payload|different operation|different decision/);
});
