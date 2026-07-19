// Provider-enablement approval chain and live-call authorization semantics
// (DEC-0019; DEC-0014 mechanics). All keys are ephemeral in-memory pairs;
// the real Product Owner key never appears anywhere near these tests.
import assert from "node:assert/strict";
import test from "node:test";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { ApprovalLiveCallAuthorization } from "../src/gateway/adapters/live-authorization.js";
import { candidateSelfDigest } from "../src/kernel/contract-registry.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import {
  approvalScenario,
  ephemeralAuthority,
  signedEvidence,
  testNonce,
} from "./authority-helpers.js";
import { BRAND, NOW, WS, contractsDir, registry } from "./helpers.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Gate additions for the provider era: the ephemeral policy mirrors the
// committed v3 policy's two new product-owner gates.
const PROVIDER_GATES = {
  policy: {
    allowed_gates: [
      "fact-resolution-approval",
      "quarantine-release",
      "client-facing-publishing",
      "blocking-evaluation-gate-change",
      "real-client-data-provider-approval",
      "provider-enablement-approval",
      "live-provider-call-approval",
    ],
    gate_requirements: {
      "fact-resolution-approval": { required_role: "product-owner", independent_review_required: false },
      "quarantine-release": { required_role: "reviewer", independent_review_required: true },
      "client-facing-publishing": { required_role: "reviewer", independent_review_required: true },
      "blocking-evaluation-gate-change": { required_role: "evaluation-owner", independent_review_required: true },
      "real-client-data-provider-approval": { required_role: "product-owner", independent_review_required: true },
      "provider-enablement-approval": { required_role: "product-owner", independent_review_required: false },
      "live-provider-call-approval": { required_role: "product-owner", independent_review_required: false },
    },
  },
};

/** A stored fixture candidate (fresh ids per scenario) plus its content digest. */
function storedCandidate(scenario: ReturnType<typeof approvalScenario>): {
  ref: string;
  digest: string;
} {
  const active = JSON.parse(
    readFileSync(join(contractsDir, "provider-policy-candidate.active.json"), "utf8")
  ) as Record<string, unknown>;
  active["artifact_id"] = "ppc-chain-0001";
  active["workspace"] = WS;
  active["brand_ref"] = BRAND;
  active["candidate_digest"] = candidateSelfDigest(active);
  const put = scenario.store.put(WS, BRAND, "provider-policy-candidate", active);
  assert.ok(put.ok, `candidate must store: ${JSON.stringify(put)}`);
  const stored = scenario.store.get(WS, BRAND, "provider-policy-candidate", "ppc-chain-0001");
  assert.ok(stored.ok);
  return { ref: "ppc-chain-0001", digest: contentDigest(stored.ok ? stored.value : {}) };
}

function candidateApproval(
  scenario: ReturnType<typeof approvalScenario>,
  candidate: { ref: string; digest: string },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return signedEvidence(scenario, {
    target_artifact_type: "provider-policy-candidate",
    target_artifact_ref: candidate.ref,
    target_artifact_digest: candidate.digest,
    gate: "provider-enablement-approval",
    nonce: testNonce(),
    ...overrides,
  });
}

test("a signed provider-policy candidate verifies and consumes exactly once; the second consumption is a replay", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);
  const evidence = candidateApproval(scenario, candidate);
  const first = verifyAndConsumeApproval(evidence, scenario.deps);
  assert.ok(first.ok, JSON.stringify(first));
  if (first.ok) {
    assert.equal(first.value.gate, "provider-enablement-approval");
    assert.equal(first.value.targetArtifactDigest, candidate.digest);
    assert.equal(first.value.selfReview, true);
  }
  const replay = verifyAndConsumeApproval(evidence, scenario.deps);
  assert.equal(replay.ok, false, "replay protection: one approval authorizes exactly one consumption");
  if (!replay.ok) assert.equal(replay.error.kind, "approval-replay");
});

test("a tampered candidate fails the signed digest binding (stale approvals of changed candidates fail closed)", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);
  // Sign a DIFFERENT digest than the stored candidate's canonical content.
  const evidence = candidateApproval(scenario, { ref: candidate.ref, digest: `sha256:${"0".repeat(64)}` });
  const result = verifyAndConsumeApproval(evidence, scenario.deps);
  assert.equal(result.ok, false);
  if (!result.ok && result.error.kind === "approval-unauthorized") {
    assert.equal(result.error.reason, "target-digest-mismatch");
  } else {
    assert.fail(`expected target-digest-mismatch, got ${JSON.stringify(result)}`);
  }
});

test("wrong gate, wrong role, unenrolled key, and expired evidence all fail closed and consume nothing", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);

  // An approval signed at a DIFFERENT gate is still an authentic human
  // decision at THAT gate (DEC-0014 semantics) — but it can never satisfy a
  // provider-enablement consumer: the chain validator, the live-call
  // authorization, and the ceremony verification all require the exact gate.
  const wrongGate = verifyAndConsumeApproval(
    candidateApproval(scenario, candidate, { gate: "fact-resolution-approval" }),
    scenario.deps
  );
  assert.ok(wrongGate.ok, "the evidence is authentic at its own gate");
  if (wrongGate.ok) {
    assert.notEqual(wrongGate.value.gate, "provider-enablement-approval");
  }

  const wrongRole = verifyAndConsumeApproval(
    candidateApproval(scenario, candidate, { role: "operator" }),
    scenario.deps
  );
  assert.equal(wrongRole.ok, false, "only the product-owner role satisfies the provider gate");

  const impostor = ephemeralAuthority();
  const impostorEvidence = signedEvidence(
    scenario,
    {
      target_artifact_type: "provider-policy-candidate",
      target_artifact_ref: candidate.ref,
      target_artifact_digest: candidate.digest,
      gate: "provider-enablement-approval",
      key_id: impostor.keyId,
      nonce: testNonce(),
    },
    impostor
  );
  const unenrolled = verifyAndConsumeApproval(impostorEvidence, scenario.deps);
  assert.equal(unenrolled.ok, false, "an unenrolled key grants nothing");

  const expired = verifyAndConsumeApproval(
    candidateApproval(scenario, candidate, {
      issued_at: "2026-07-17T09:00:00Z",
      expires_at: "2026-07-17T10:00:00Z",
    }),
    scenario.deps
  );
  assert.equal(expired.ok, false, "expired evidence grants nothing");
});

test("a model-fabricated approval evidence (no enrolled signature) authorizes nothing even when contract-valid in shape", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);
  // Shape-valid evidence whose signature bytes are fabricated: the exact
  // artifact a compromised model output could produce. It must die at
  // signature verification, consuming nothing.
  const evidence = candidateApproval(scenario, candidate);
  (evidence["signature"] as Record<string, unknown>)["signature_b64"] = "B".repeat(86) + "==";
  const result = verifyAndConsumeApproval(evidence, scenario.deps);
  assert.equal(result.ok, false);
  if (!result.ok && result.error.kind === "approval-unauthorized") {
    assert.equal(result.error.reason, "signature-invalid");
  } else {
    assert.fail(`expected signature-invalid, got ${JSON.stringify(result)}`);
  }
});

// ---------------------------------------------------------------------------
// Live-call authorization (the future smoke-call gate, testable today)
// ---------------------------------------------------------------------------

function liveEvidence(
  scenario: ReturnType<typeof approvalScenario>,
  candidate: { ref: string; digest: string },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return signedEvidence(scenario, {
    target_artifact_type: "provider-policy-candidate",
    target_artifact_ref: candidate.ref,
    target_artifact_digest: candidate.digest,
    gate: "live-provider-call-approval",
    nonce: testNonce(),
    ...overrides,
  });
}

test("a valid live-call authorization checks without consuming, then consumes exactly once", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);
  const auth = new ApprovalLiveCallAuthorization(liveEvidence(scenario, candidate), scenario.deps, candidate.digest);
  assert.ok(auth.check().ok, "check validates without consuming");
  assert.ok(auth.check().ok, "check is repeatable — it consumes nothing");
  const consumed = auth.consume();
  assert.ok(consumed.ok, JSON.stringify(consumed));
  const replay = auth.consume();
  assert.equal(replay.ok, false, "a consumed authorization can never authorize a second call");
  if (!replay.ok) assert.equal(replay.error.kind, "live-call-authorization-invalid");
});

test("expired, wrong-gate, wrong-candidate, and rejected live-call evidence fail at check() before any consumption", () => {
  const scenario = approvalScenario(PROVIDER_GATES);
  const candidate = storedCandidate(scenario);

  const expired = new ApprovalLiveCallAuthorization(
    liveEvidence(scenario, candidate, { issued_at: "2026-07-17T09:00:00Z", expires_at: "2026-07-17T10:00:00Z" }),
    scenario.deps,
    candidate.digest
  );
  assert.equal(expired.check().ok, false);

  const wrongGate = new ApprovalLiveCallAuthorization(
    liveEvidence(scenario, candidate, { gate: "provider-enablement-approval" }),
    scenario.deps,
    candidate.digest
  );
  assert.equal(wrongGate.check().ok, false, "an enablement approval is not a live-call approval");

  const wrongCandidate = new ApprovalLiveCallAuthorization(
    liveEvidence(scenario, candidate),
    scenario.deps,
    `sha256:${"1".repeat(64)}`
  );
  assert.equal(wrongCandidate.check().ok, false, "the authorization must bind the active candidate digest");

  const rejected = new ApprovalLiveCallAuthorization(
    liveEvidence(scenario, candidate, { verdict: "rejected" }),
    scenario.deps,
    candidate.digest
  );
  assert.equal(rejected.check().ok, false, "a rejection authorizes nothing");
});

// ---------------------------------------------------------------------------
// Truth boundaries: provider output cannot acquire authority
// ---------------------------------------------------------------------------

test("model output cannot mark an inference as verified fact (contract layer rejects it)", () => {
  const fabricated = {
    schema_version: "1.10.0",
    artifact_id: "claim_fab_01",
    brand_ref: BRAND,
    created_at: NOW,
    creator_type: "agent",
    lifecycle_status: "generated",
    statement: "A fabricated verified fact",
    classification: "inference",
    source_type: "model_inference",
    source_ref: "source:src_t_0001#codepoints=0-10",
    confidence: 0.5,
    confidence_basis: "model output",
    verification_status: "verified",
  };
  const result = registry().validate("claim", fabricated);
  assert.equal(result.ok, false, "an inference marked verified without human confirmation is contract-invalid");
});

test("cross-brand model output fails the record-store namespace boundary", async () => {
  const { FileRunRecordStore } = await import("../src/gateway/record-store.js");
  const { tempDir } = await import("./helpers.js");
  const store = new FileRunRecordStore(tempDir("cross-brand"), registry());
  const record = {
    schema_version: "1.10.0",
    run_id: "run_x",
    session_id: "s",
    project_id: "p",
    workspace_id: WS,
    brand_id: "brand_other",
    workflow_id: "w",
    skill_id: "k",
    attribution_confidence: "confirmed",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    started_at: NOW,
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    cache_creation_tokens: 0,
    cost: { mode: "api", usd: 0, allocation: "measured" },
  };
  const put = store.put(WS, BRAND, "model-run", record);
  assert.equal(put.ok, false, "a record naming a foreign brand cannot be planted in this namespace");
});
