#!/usr/bin/env node
// Deterministic provider-decision-packet validation (Phase 1C.0, DEC-0018).
//
// Guards the governance state this phase must not disturb:
//   1. DEC-0018 stays `proposed` with no approval evidence until the
//      Product Owner ratifies it — a proposed decision described as
//      ratified anywhere canonical is a defect.
//   2. The active gateway policy stays byte-identical to the DEC-0009
//      posture (fake adapter, synthetic only, zero spend) and references
//      a RATIFIED decision, never a proposed one.
//   3. EXP-0001's Result section stays empty.
//   4. The packet documents estimates only, carries sourced pricing, and
//      contains no credential-shaped values.
//   5. Model IDs named in the recommended option also appear in the
//      comparison matrix (no recommendation-only model strings).
//
// No network access. Runs in `npm run validate` and CI.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error("FAIL " + msg);
};
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ---- 1. DEC-0018 must be proposed, unapproved, and honest about it ----
const dec18 = read("brain/decisions/DEC-0018-provider-enablement.md");
if (!/^status: proposed$/m.test(dec18)) fail("DEC-0018 must carry `status: proposed`");
if (/^status: ratified$/m.test(dec18)) fail("DEC-0018 must not be ratified in this phase");
if (!/^approved_by: null$/m.test(dec18)) fail("DEC-0018 must carry `approved_by: null`");
if (!/^approved_at: null$/m.test(dec18)) fail("DEC-0018 must carry `approved_at: null`");
if (!dec18.includes("grants no authority")) {
  fail("DEC-0018 must state explicitly that it grants no authority while proposed");
}

// The decision index must list DEC-0018 as proposed, never ratified.
const index = read("docs/DECISION_SYSTEM.md");
const dec18Row = index
  .split("\n")
  .find((line) => line.startsWith("| DEC-0018"));
if (!dec18Row) fail("docs/DECISION_SYSTEM.md must index DEC-0018");
else if (!dec18Row.includes("proposed") || dec18Row.includes("ratified")) {
  fail("the DEC-0018 index row must say proposed and never ratified");
}

// ---- 2. Active gateway policy is frozen at the DEC-0009 posture ----
// Byte-level guard: the Phase 1C.0 starting bytes of the active policy.
// Changing the active policy is EXACTLY what a future ratified enablement
// phase does consciously — it must update this hash in the same reviewed
// change, never drift silently.
const EXPECTED_POLICY_SHA256 =
  "b6974706e0e708d60d95240ad33f93bf3b3594beecc81b5989e4891b00d8ea87";
const policyRaw = read("contracts/gateway-policy.active.json");
const policySha = createHash("sha256").update(policyRaw, "utf8").digest("hex");
if (policySha !== EXPECTED_POLICY_SHA256) {
  fail(
    `contracts/gateway-policy.active.json changed (sha256 ${policySha}); the active policy may only change in a ratified provider-enablement implementation phase that updates this guard consciously`
  );
}
const policy = JSON.parse(policyRaw);
if (policy.decision_ref !== "DEC-0009") {
  fail("the active gateway policy must reference DEC-0009 until an enablement decision is ratified");
}
const referencedDecision = read(
  "brain/decisions/DEC-0009-zero-provider-offline-policy.md"
);
if (!/^status: ratified$/m.test(referencedDecision)) {
  fail("the active policy's decision_ref must point at a RATIFIED decision");
}

// ---- 3. EXP-0001 must remain unexecuted ----
const exp1 = read("brain/experiments/EXP-0001-prompt-to-brand-context.md");
if (!exp1.includes("*(empty — filled from runs; no fictitious results)*")) {
  fail("EXP-0001's Result section must remain the empty marker in this phase");
}

// ---- 4. Packet hygiene ----
const packet = read("docs/PROVIDER_ENABLEMENT_DECISION_PACKET.md");
const threatModel = read("docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md");
for (const [name, body] of [
  ["PROVIDER_ENABLEMENT_DECISION_PACKET.md", packet],
  ["PROVIDER_ENABLEMENT_THREAT_MODEL.md", threatModel],
]) {
  // Credential-shaped content: armor needles composed at runtime (this
  // scanner never contains them literally), plus common API-key shapes.
  const armor = ["PRIVATE", "KEY"].join(" ");
  if (body.includes(`BEGIN ${armor}`)) fail(`${name} contains key armor`);
  for (const pattern of [
    /sk-[A-Za-z0-9_-]{20,}/,
    /sk-ant-[A-Za-z0-9_-]{10,}/,
    /AIza[0-9A-Za-z_-]{30,}/,
    /Bearer [A-Za-z0-9._-]{20,}/,
  ]) {
    if (pattern.test(body)) fail(`${name} contains a credential-shaped value (${pattern})`);
  }
  if (/\bmeasured cost\b/i.test(body)) {
    fail(`${name} must not label any cost as measured in this phase`);
  }
}
if (!packet.includes("No provider is enabled")) {
  fail("the packet must state that no provider is enabled");
}
if (!packet.includes("All monetary values in this packet are ESTIMATES")) {
  fail("the packet must carry the estimates-only disclaimer sentinel");
}
if (!/Accessed 2026-07-19/.test(packet)) {
  fail("packet pricing/sources must carry access dates (Accessed 2026-07-19)");
}
if (!/^## (\d+\. )?Sources$/m.test(packet)) fail("the packet must carry a Sources section");

// Every pricing table row (matrix rows containing a USD-per-token figure)
// must sit in a document that ties prices to sources with access dates —
// enforced coarsely by requiring at least as many source entries as
// providers evaluated.
const sourceCount = (packet.match(/Accessed 2026-07-19/g) ?? []).length;
if (sourceCount < 10) {
  fail(`the packet carries only ${sourceCount} dated source references; expected at least 10`);
}

// ---- 5. Recommended model IDs must appear in the comparison matrix ----
const recommendation = packet.split("## Option A")[1]?.split("## Option B")[0] ?? "";
const modelIds = [...recommendation.matchAll(/`([a-z0-9][a-z0-9.\-]+[0-9])`/g)]
  .map((m) => m[1])
  .filter((id) => /-/.test(id));
if (modelIds.length === 0) {
  fail("Option A must name at least one exact model ID in backticks");
}
for (const id of new Set(modelIds)) {
  const occurrences = packet.split(id).length - 1;
  if (occurrences < 2) {
    fail(
      `model ID '${id}' appears only in the recommendation; it must also appear in the comparison matrix with its evidence`
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} provider-packet failure(s).`);
  process.exit(1);
}
console.log("Provider decision packet: governance guards green.");
