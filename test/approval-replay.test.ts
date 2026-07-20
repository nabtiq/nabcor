// Replay protection and consumption atomicity (DEC-0014): one approval
// authorizes exactly one consumption; concurrent attempts produce exactly one
// success; failures consume nothing and leave no partial receipt.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { approvalPayloadDigest, receiptIdFor } from "../src/authority/approval-payload.js";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import { approvalScenario, signedEvidence, testNonce, POLICY_ID } from "./authority-helpers.js";
import { BRAND, WS, repoRoot, validClaim } from "./helpers.js";

const execFileAsync = promisify(execFile);

function receiptDir(receiptRoot: string): string {
  return join(receiptRoot, WS, BRAND, "approval-receipt");
}

function receiptFiles(receiptRoot: string): string[] {
  try {
    return readdirSync(receiptDir(receiptRoot));
  } catch {
    return [];
  }
}

test("first consumption succeeds; the second consumption of the same nonce fails as approval-replay", () => {
  const s = approvalScenario();
  const evidence = signedEvidence(s);
  const first = verifyAndConsumeApproval(evidence, s.deps);
  assert.ok(first.ok, `first consumption must authorize: ${JSON.stringify(first)}`);
  const second = verifyAndConsumeApproval(evidence, s.deps);
  assert.equal(second.ok, false, "a consumed approval must not be reusable");
  if (!second.ok) assert.equal(second.error.kind, "approval-replay");
  assert.equal(receiptFiles(s.receiptRoot).length, 1, "exactly one receipt exists");
});

test("a failed signature does not consume the nonce: the genuine approval still authorizes afterwards", () => {
  const s = approvalScenario();
  const evidence = signedEvidence(s);
  const forged = JSON.parse(JSON.stringify(evidence)) as Record<string, unknown>;
  (forged["signature"] as Record<string, unknown>)["signature_b64"] = `${"B".repeat(86)}==`;
  const forgedResult = verifyAndConsumeApproval(forged, s.deps);
  assert.equal(forgedResult.ok, false);
  assert.equal(receiptFiles(s.receiptRoot).length, 0, "the failed attempt left no receipt");
  const genuine = verifyAndConsumeApproval(evidence, s.deps);
  assert.ok(genuine.ok, "the nonce was not consumed by the failed attempt");
});

test("failed authorization creates no receipt for every denial class", () => {
  const s = approvalScenario();
  const denials = [
    signedEvidence(s, { role: "operator" }), // wrong role for gate
    signedEvidence(s, { policy_version: 2 }), // policy mismatch
    signedEvidence(s, { gate: "quarantine-release", role: "reviewer" }), // frozen gate
    signedEvidence(s, { expires_at: "2026-07-17T11:40:00Z", issued_at: "2026-07-17T11:35:00Z" }), // expired
  ];
  for (const evidence of denials) {
    const result = verifyAndConsumeApproval(evidence, s.deps);
    assert.equal(result.ok, false);
  }
  assert.equal(receiptFiles(s.receiptRoot).length, 0, "denials must never touch the receipt store");
});

test("receipt write failure returns no authorization and leaves no partial receipt", () => {
  const s = approvalScenario();
  // Make the namespace directory unwritable so the receipt cannot persist.
  const brandDir = join(s.receiptRoot, WS, BRAND);
  const wsDir = join(s.receiptRoot, WS);
  const evidence = signedEvidence(s);
  mkdirSync(brandDir, { recursive: true });
  chmodSync(brandDir, 0o500);
  try {
    const result = verifyAndConsumeApproval(evidence, s.deps);
    assert.equal(result.ok, false, "signature validity without receipt persistence must not authorize");
    if (!result.ok) assert.equal(result.error.kind, "io-error");
    assert.equal(receiptFiles(s.receiptRoot).length, 0, "no partial receipt remains");
  } finally {
    chmodSync(brandDir, 0o755);
    chmodSync(wsDir, 0o755);
  }
  // After the store recovers, the SAME approval still authorizes: nothing was consumed.
  const retry = verifyAndConsumeApproval(evidence, s.deps);
  assert.ok(retry.ok, "a persistence failure must not burn the nonce");
});

test("receipts are immutable and namespace-isolated", () => {
  const s = approvalScenario();
  const result = verifyAndConsumeApproval(signedEvidence(s), s.deps);
  assert.ok(result.ok);
  if (!result.ok) return;
  const receiptId = result.value.receiptId;
  // Re-consuming the identical receipt content is a replay, not an overwrite.
  const stored = JSON.parse(
    readFileSync(join(receiptDir(s.receiptRoot), `${receiptId}.json`), "utf8")
  ) as Record<string, unknown>;
  const again = s.deps.receiptStore.consume(WS, BRAND, stored);
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.error.kind, "approval-replay");
  // A foreign namespace cannot read it, and a receipt naming one namespace
  // cannot be planted into another.
  const foreignRead = s.deps.receiptStore.get(WS, "brand_other", receiptId);
  assert.equal(foreignRead.ok, false);
  const planted = s.deps.receiptStore.consume(WS, "brand_other", stored);
  assert.equal(planted.ok, false);
  if (!planted.ok) assert.equal(planted.error.kind, "namespace-violation");
});

test("nonce single-use is scoped per signed namespace, and receipt IDs stay globally unique across namespaces", () => {
  // Two approvals signed by the same key with the SAME nonce, each binding its
  // own signed workspace/brand and target: each consumes once in its own
  // namespace (the namespace is signature-covered, so neither can be replayed
  // into the other), and their receipt IDs differ because the namespace
  // participates in the receipt identity (Phase 1B.3A review finding).
  const s = approvalScenario();
  const sharedNonce = testNonce();
  const first = verifyAndConsumeApproval(signedEvidence(s, { nonce: sharedNonce }), s.deps);
  assert.ok(first.ok, "first namespace consumption authorizes");

  const otherClaim = validClaim({ artifact_id: "claim_ns_0001", brand_ref: "brand_other" });
  assert.ok(s.store.put(WS, "brand_other", "claim", otherClaim).ok);
  const otherStored = s.store.get(WS, "brand_other", "claim", "claim_ns_0001");
  assert.ok(otherStored.ok);
  if (!otherStored.ok || !first.ok) return;
  const second = verifyAndConsumeApproval(
    signedEvidence(s, {
      nonce: sharedNonce,
      brand_ref: "brand_other",
      target_artifact_ref: "claim_ns_0001",
      target_artifact_digest: contentDigest(otherStored.value),
    }),
    s.deps
  );
  assert.ok(second.ok, "a separately signed approval for another namespace is its own consumption");
  if (second.ok) {
    assert.notEqual(second.value.receiptId, first.value.receiptId, "receipt IDs are namespace-distinct");
  }
  // Within one namespace the shared nonce is spent: a THIRD approval reusing
  // it against the first namespace fails as replay even for a new target.
  const third = verifyAndConsumeApproval(signedEvidence(s, { nonce: sharedNonce }), s.deps);
  assert.equal(third.ok, false);
  if (!third.ok) assert.equal(third.error.kind, "approval-replay");
});

test("an oversized payload is refused before contract validation", () => {
  const s = approvalScenario();
  const evidence = signedEvidence(s);
  // Inflate the payload past MAX_PAYLOAD_BYTES; the signature and digest are
  // irrelevant because the size gate runs first.
  (evidence["payload"] as Record<string, unknown>)["reason"] = "x".repeat(20000);
  const result = verifyAndConsumeApproval(evidence, s.deps);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "approval-unauthorized");
    if (result.error.kind === "approval-unauthorized") {
      assert.equal(result.error.reason, "payload-oversized");
    }
  }
});

test("concurrent consumption of one nonce across processes produces exactly one success", async () => {
  // True cross-process atomicity: N child processes race to consume the SAME
  // receipt through FileApprovalReceiptStore; linkSync's EEXIST guarantee
  // must let exactly one win regardless of interleaving.
  const s = approvalScenario();
  const nonce = testNonce();
  const receipt = {
    schema_version: "1.10.0",
    receipt_id: receiptIdFor(s.auth.keyId, nonce, POLICY_ID, WS, BRAND),
    receipt_algorithm: "approval-receipt-id-sha256-1.0.0",
    evidence_ref: "apev_race_0001",
    payload_digest: approvalPayloadDigest({ race: true }),
    key_id: s.auth.keyId,
    nonce,
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_ref: "claim_t_0001",
    target_artifact_type: "claim",
    target_artifact_digest: s.targetDigest,
    gate: "fact-resolution-approval",
    verdict: "approved",
    verification_result: "authorized",
    consumed_at: "2026-07-17T12:00:00Z",
    policy_ref: POLICY_ID,
    policy_version: 1,
    registry_ref: "areg-test",
    registry_version: 1,
  };
  const receiptJson = JSON.stringify(receipt);
  const script = `
    import { FileApprovalReceiptStore } from "${join(repoRoot, "dist", "src", "authority", "receipt-store.js").replaceAll("\\\\", "/")}";
    import { ContractRegistry } from "${join(repoRoot, "dist", "src", "kernel", "contract-registry.js").replaceAll("\\\\", "/")}";
    const registry = ContractRegistry.load("${join(repoRoot, "contracts").replaceAll("\\\\", "/")}");
    const store = new FileApprovalReceiptStore(process.argv[1], registry);
    const receipt = JSON.parse(process.argv[2]);
    const result = store.consume("${WS}", "${BRAND}", receipt);
    console.log(result.ok ? "WIN" : result.error.kind);
  `;
  const attempts = await Promise.all(
    Array.from({ length: 8 }, () =>
      execFileAsync(process.execPath, ["--input-type=module", "-e", script, s.receiptRoot, receiptJson])
    )
  );
  const outcomes = attempts.map((a) => a.stdout.trim());
  const wins = outcomes.filter((o) => o === "WIN").length;
  const replays = outcomes.filter((o) => o === "approval-replay").length;
  assert.equal(wins, 1, `exactly one concurrent consumption may win (got ${JSON.stringify(outcomes)})`);
  assert.equal(replays, 7, "every other attempt fails as approval-replay");
  assert.equal(receiptFiles(s.receiptRoot).length, 1, "exactly one canonical receipt exists");
});
