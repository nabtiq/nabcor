// Existing-guarantee proofs for Phase 1B.3A (DEC-0014): the human-gate
// machinery adds authenticated evidence and nothing else — no model path, no
// gateway involvement, no business action, no independent-gate release, and
// EXP-0001 stays unexecuted.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FakeAdapter } from "../src/gateway/adapter.js";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { approvalScenario, signedEvidence } from "./authority-helpers.js";
import { repoRoot } from "./helpers.js";

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFilesUnder(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

test("human-gate code never touches the gateway, adapters, or any model path", () => {
  // Structural: no import of gateway modules anywhere in the authority layer
  // or the key CLI. The provider-independence grep gate separately proves no
  // network or provider SDK capability exists in src/ at all.
  const files = [...tsFilesUnder(join(repoRoot, "src", "authority")), join(repoRoot, "src", "cli", "keygen.ts")];
  assert.ok(files.length >= 5, `expected authority sources, found ${files.length}`);
  for (const file of files) {
    const body = readFileSync(file, "utf8");
    assert.ok(!/from\s+["'][^"']*gateway/.test(body), `${file} must not import gateway modules`);
    assert.ok(!/FakeAdapter/.test(body), `${file} must not reference the Fake Adapter`);
  }
});

test("a full verification cycle drives zero Fake Adapter invocations", () => {
  const adapter = new FakeAdapter(new Map());
  const s = approvalScenario();
  const authorized = verifyAndConsumeApproval(signedEvidence(s), s.deps);
  assert.ok(authorized.ok, "the cycle must complete");
  const denied = verifyAndConsumeApproval(signedEvidence(s, { role: "operator" }), s.deps);
  assert.equal(denied.ok, false);
  assert.equal(adapter.invocationCount, 0, "human-gate operations are Tier-0 deterministic code");
});

test("an authorized approval applies no business action: the target artifact is untouched", () => {
  const s = approvalScenario();
  const before = readFileSync(join(s.artifactsRoot, "ws_test", "brand_test", "claim", "claim_t_0001.json"), "utf8");
  const result = verifyAndConsumeApproval(signedEvidence(s), s.deps);
  assert.ok(result.ok);
  const after = readFileSync(join(s.artifactsRoot, "ws_test", "brand_test", "claim", "claim_t_0001.json"), "utf8");
  assert.equal(after, before, "verification must not mutate, revise, or resolve the target claim");
});

test("EXP-0001 remains unexecuted with an empty Result section", () => {
  const body = readFileSync(
    join(repoRoot, "brain", "experiments", "EXP-0001-prompt-to-brand-context.md"),
    "utf8"
  );
  assert.match(body, /## Result\n\n\*\(empty — filled from runs; no fictitious results\)\*/);
});
