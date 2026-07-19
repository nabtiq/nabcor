// Crash-recovery and idempotency tests (DEC-0016): a consumed approval can
// resume the identical operation from every partial-write boundary, always
// converging on byte-identical artifacts; conflicting or foreign state fails
// closed; a completed application replays without creating anything.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { applyFactResolution } from "../src/resolve/apply-resolution.js";
import {
  afterAnalysisIdFor,
  afterSnapshotIdFor,
  applicationIdFor,
  successorIdFor,
} from "../src/resolve/resolution-ids.js";
import { receiptIdFor } from "../src/authority/approval-payload.js";
import { analyzeStructuredTruth } from "../src/understand/analyze-structured-truth.js";
import { BRAND, NOW, WS, registry } from "./helpers.js";
import type { PreparedDecision } from "../src/resolve/prepare-decision.js";
import {
  type ResolutionScenario,
  contentDigest,
  decisionEvidence,
  factClaim,
  prepareDecision,
  resolutionScenario,
} from "./resolution-helpers.js";

interface Operation {
  scenario: ResolutionScenario;
  prepared: PreparedDecision;
  evidence: Record<string, unknown>;
  payload: Record<string, unknown>;
  receiptId: string;
  applicationId: string;
}

function operation(
  claims?: Record<string, unknown>[],
  winner = "claim_r_win"
): Operation {
  const scenario = resolutionScenario(claims ? { claims } : {});
  const preparedResult = prepareDecision(scenario, { winningClaimRef: winner });
  assert.ok(preparedResult.ok, JSON.stringify(preparedResult));
  const prepared = preparedResult.value;
  const evidence = decisionEvidence(scenario, prepared);
  const payload = (evidence as { payload: Record<string, unknown> }).payload;
  const receiptId = receiptIdFor(
    String(payload["key_id"]),
    String(payload["nonce"]),
    String(payload["policy_ref"]),
    WS,
    BRAND
  );
  return {
    scenario,
    prepared,
    evidence,
    payload,
    receiptId,
    applicationId: applicationIdFor(prepared.decisionDigest, receiptId),
  };
}

/** Consume the approval exactly as a crashed first run would have. */
function consume(op: Operation): void {
  const authorized = verifyAndConsumeApproval(op.evidence, op.scenario.deps);
  assert.ok(authorized.ok, JSON.stringify(authorized));
}

/** Build the deterministic successor a completed run would create. */
function expectedSuccessor(op: Operation, losingRef: string): Record<string, unknown> {
  const predecessor = op.scenario.store.get(WS, BRAND, "claim", losingRef);
  assert.ok(predecessor.ok);
  const successor: Record<string, unknown> = { ...predecessor.value };
  delete successor["superseded_by"];
  successor["schema_version"] = "1.9.0";
  successor["artifact_id"] = successorIdFor(op.applicationId, losingRef);
  successor["supersedes"] = losingRef;
  successor["verification_status"] = "contradicted";
  successor["resolution_decision_ref"] = String(op.prepared.decision["artifact_id"]);
  successor["created_at"] = NOW; // the injected clock at consumption
  successor["creator_type"] = "deterministic";
  successor["lifecycle_status"] = "revised";
  return successor;
}

function namespaceInventory(scenario: ResolutionScenario): string[] {
  const listed = scenario.store.list(WS, BRAND);
  assert.ok(listed.ok);
  return listed.value.map((e) => `${e.type}/${e.artifactId}`);
}

function assertCompleted(op: Operation, applied: { ok: boolean }): Record<string, unknown> {
  assert.ok(applied.ok, JSON.stringify(applied));
  const application = (applied as { ok: true; value: { application: Record<string, unknown> } }).value
    .application;
  assert.equal(application["artifact_id"], op.applicationId);
  assert.equal(application["receipt_ref"], op.receiptId);
  assert.equal(application["decision_digest"], op.prepared.decisionDigest);
  const successorId = successorIdFor(op.applicationId, "claim_r_lose");
  const successor = op.scenario.store.get(WS, BRAND, "claim", successorId);
  assert.ok(successor.ok, "successor must exist after completion");
  const afterAnalysis = op.scenario.store.get(
    WS,
    BRAND,
    "truth-analysis",
    afterAnalysisIdFor(op.applicationId)
  );
  assert.ok(afterAnalysis.ok, "after-analysis must exist after completion");
  assert.deepEqual(afterAnalysis.value["open_contradictions"], []);
  return application;
}

test("retry after consumption but before any claim write completes the identical operation", () => {
  const op = operation();
  consume(op);
  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assertCompleted(op, applied);
});

test("retry after one of multiple losing revisions resumes only the missing writes", () => {
  const op = operation(
    [
      factClaim("claim_r_a", "Alpha Brand"),
      factClaim("claim_r_b", "Beta Brand"),
      factClaim("claim_r_c", "Gamma Brand"),
    ],
    "claim_r_b"
  );
  consume(op);
  // Crash state: exactly one of two successors written.
  const partial = expectedSuccessor(op, "claim_r_a");
  const put = op.scenario.store.put(WS, BRAND, "claim", partial);
  assert.ok(put.ok, JSON.stringify(put));
  const partialBytes = JSON.stringify(partial);

  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assert.ok(applied.ok, JSON.stringify(applied));
  const revisions = (applied as { ok: true; value: { application: Record<string, unknown> } }).value
    .application["created_losing_revisions"] as { losing_claim_ref: string; successor_claim_ref: string }[];
  assert.deepEqual(
    revisions.map((r) => r.losing_claim_ref),
    ["claim_r_a", "claim_r_c"]
  );
  // The pre-existing successor was resumed, not rewritten: identical content.
  const resumed = op.scenario.store.get(WS, BRAND, "claim", successorIdFor(op.applicationId, "claim_r_a"));
  assert.ok(resumed.ok);
  assert.equal(contentDigest(resumed.value), contentDigest(JSON.parse(partialBytes)));
});

test("retry after all revisions but before the new analysis completes it", () => {
  const op = operation();
  consume(op);
  const put = op.scenario.store.put(WS, BRAND, "claim", expectedSuccessor(op, "claim_r_lose"));
  assert.ok(put.ok);
  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assertCompleted(op, applied);
});

test("retry after the new analysis but before the completion record finishes with the same result", () => {
  const op = operation();
  consume(op);
  const put = op.scenario.store.put(WS, BRAND, "claim", expectedSuccessor(op, "claim_r_lose"));
  assert.ok(put.ok);
  // Crash state: fresh snapshot + analysis already persisted.
  const profile = op.scenario.store.get(WS, BRAND, "truth-profile", "tp_t_0001");
  assert.ok(profile.ok);
  const analyzed = analyzeStructuredTruth(
    {
      artifactId: afterAnalysisIdFor(op.applicationId),
      snapshotArtifactId: afterSnapshotIdFor(op.applicationId),
      workspace: WS,
      brandRef: BRAND,
      createdAt: NOW,
      truthProfile: profile.value,
    },
    op.scenario.store,
    registry()
  );
  assert.ok(analyzed.ok, JSON.stringify(analyzed));
  assert.ok(op.scenario.store.put(WS, BRAND, "claim-snapshot", analyzed.value.snapshot).ok);
  assert.ok(op.scenario.store.put(WS, BRAND, "truth-analysis", analyzed.value.analysis).ok);

  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assertCompleted(op, applied);
});

test("a replay after full completion returns the same result and creates nothing", () => {
  const op = operation();
  const first = applyFactResolution(op.evidence, op.scenario.deps);
  const firstApplication = assertCompleted(op, first);
  const inventory = namespaceInventory(op.scenario);
  const receiptFiles = readdirSync(join(op.scenario.receiptRoot, WS, BRAND, "approval-receipt"));

  const second = applyFactResolution(op.evidence, op.scenario.deps);
  assert.ok(second.ok, JSON.stringify(second));
  assert.equal(second.value.replayed, true);
  assert.equal(
    contentDigest(second.value.application),
    contentDigest(firstApplication),
    "replay must return the identical stored application"
  );
  assert.deepEqual(namespaceInventory(op.scenario), inventory, "replay must create no artifact");
  assert.deepEqual(
    readdirSync(join(op.scenario.receiptRoot, WS, BRAND, "approval-receipt")),
    receiptFiles,
    "replay must consume nothing further"
  );
});

test("an existing successor with conflicting content fails closed", () => {
  const op = operation();
  consume(op);
  const conflicting = expectedSuccessor(op, "claim_r_lose");
  conflicting["statement"] = "a tampered successor statement";
  const put = op.scenario.store.put(WS, BRAND, "claim", conflicting);
  assert.ok(put.ok);
  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assert.equal(applied.ok, false);
  assert.equal(
    (applied as { ok: false; error: { kind: string } }).error.kind,
    "resolution-conflict"
  );
});

test("a foreign successor superseding a losing claim is a rejected fork", () => {
  const op = operation();
  consume(op);
  // A concurrent writer superseded the losing claim with its own revision.
  const foreign = factClaim("claim_r_foreign", "Beta Brand", {
    artifact_id: "claim_r_foreign",
    supersedes: "claim_r_lose",
  });
  const put = op.scenario.store.put(WS, BRAND, "claim", foreign);
  assert.ok(put.ok);
  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assert.equal(applied.ok, false);
  assert.match(
    (applied as { ok: false; error: { message: string } }).error.message,
    /does not belong to this application|fork|not a participant of signed decision/
  );
});

test("a claim entering the resolved slot after consumption fails closed BEFORE any successor is written", () => {
  const op = operation();
  consume(op);
  // A concurrent writer supplies a new distinct value for the same slot in
  // the window after consumption: the slot guard must refuse before writing
  // any contradicted successor, leaving the partial state empty.
  const intruder = factClaim("claim_r_intruder", "Gamma Brand", {
    artifact_id: "claim_r_intruder",
  });
  const put = op.scenario.store.put(WS, BRAND, "claim", intruder);
  assert.ok(put.ok);
  const applied = applyFactResolution(op.evidence, op.scenario.deps);
  assert.equal(applied.ok, false);
  assert.match(
    (applied as { ok: false; error: { message: string } }).error.message,
    /not a participant of signed decision/
  );
  const successor = op.scenario.store.get(
    WS,
    BRAND,
    "claim",
    successorIdFor(op.applicationId, "claim_r_lose")
  );
  assert.equal(successor.ok, false, "no successor may be written under slot interference");
});

test("recovery refuses evidence whose receipt belongs to a different operation", () => {
  const op = operation();
  consume(op);
  // Same nonce (same receipt identity), different signed content.
  const foreignEvidence = decisionEvidence(op.scenario, op.prepared, {
    nonce: op.payload["nonce"],
    reason: "a different signed reason changes the payload digest",
  });
  const applied = applyFactResolution(foreignEvidence, op.scenario.deps);
  assert.equal(applied.ok, false);
  assert.equal(
    (applied as { ok: false; error: { kind: string } }).error.kind,
    "resolution-conflict"
  );
});

test("recovery under a rotated trust configuration fails closed", () => {
  const op = operation();
  consume(op);
  // The active policy moved to a new version after consumption.
  const rotatedConfig = {
    ...op.scenario.config,
    policy: { ...op.scenario.config.policy, policy_version: 2 },
  };
  const applied = applyFactResolution(op.evidence, {
    ...op.scenario.deps,
    config: rotatedConfig,
  });
  assert.equal(applied.ok, false);
  assert.match(
    (applied as { ok: false; error: { message: string } }).error.message,
    /different policy\/registry configuration/
  );
});

test("no duplicate successor or application artifact is ever created across retries", () => {
  const op = operation();
  consume(op);
  const first = applyFactResolution(op.evidence, op.scenario.deps);
  assertCompleted(op, first);
  const inventory = namespaceInventory(op.scenario);
  for (let i = 0; i < 3; i++) {
    const again = applyFactResolution(op.evidence, op.scenario.deps);
    assert.ok(again.ok);
    assert.equal(again.value.replayed, true);
  }
  assert.deepEqual(namespaceInventory(op.scenario), inventory);
  const claimEntries = inventory.filter((e) => e.startsWith("claim/"));
  // Winner + loser + exactly one successor.
  assert.equal(claimEntries.length, 3);
});
