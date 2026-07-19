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
// Emptiness, not marker presence: the Result section must contain the
// empty marker and NOTHING else (results appended after a retained marker
// would otherwise pass).
const exp1 = read("brain/experiments/EXP-0001-prompt-to-brand-context.md");
const resultSection = exp1.split(/^## Result$/m)[1];
if (resultSection === undefined) {
  fail("EXP-0001 must carry a Result section");
} else if (resultSection.trim() !== "*(empty — filled from runs; no fictitious results)*") {
  fail(
    "EXP-0001's Result section must contain exactly the empty marker and nothing else in this phase"
  );
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

// ---- 4b. Evidence-discipline distinctions (Phase 1C.0.1 hardening) ----
// These guards enforce the DISTINCTIONS the 1C.0.1 correction restored.
// They deliberately do NOT freeze market facts (prices, model lists,
// provider capabilities drift and CI cannot verify internet truth — every
// external fact requires human re-verification at ratification time, see
// RISK-DECAY-01); they only prevent the specific prohibited claim classes
// from re-entering the canonical documents.
const packetDocs = [
  ["PROVIDER_ENABLEMENT_DECISION_PACKET.md", packet],
  ["PROVIDER_ENABLEMENT_THREAT_MODEL.md", threatModel],
  [
    "PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md",
    read("docs/PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md"),
  ],
];
// Prohibited claim classes. Quoting a prohibited claim as a CORRECTED
// error is legitimate, so lines that visibly mark the claim as corrected
// or falsified are exempted.
const isCorrectionContext = (line) =>
  /corrected|CORRECTED|falsif|\bfalse\b|error|ledger|was wrong|prohibited|must not|never|validator|guard|fails on|fails if|equates/i.test(
    line
  );
const prohibited = [
  {
    pattern: /Gemini[^.\n]{0,80}\bno (zero[- ]data[- ]retention|zero[- ]retention|ZDR)( offering| option| availability)?\b/i,
    reason: "claiming the Gemini Developer API has no ZDR offering (falsified by ai.google.dev/gemini-api/docs/zdr)",
  },
  {
    pattern: /store\s*=?\s*false[^.\n]{0,60}\b(is|provides|proves|achieves|equals|sufficient for)\b[^.\n]{0,40}\bZDR\b/i,
    reason: "claiming store=false alone provides/proves Gemini ZDR",
  },
  {
    pattern: /\bstateless\b[^.\n]{0,60}\b(zero|no)[- ](backend[- ])?retention\b/i,
    reason: "equating stateless transport with zero retention",
  },
  {
    pattern: /\b(zero|no)[- ]retention\b[^.\n]{0,60}\bstateless\b/i,
    reason: "equating zero retention with stateless transport",
  },
  {
    pattern: /Anthropic[^.\n]{0,80}\bzero retention by default\b/i,
    reason: "claiming standard Anthropic Messages calls have zero retention by default",
  },
  {
    pattern: /\b(not?[- ]train(ed|ing)?( on)?[^.\n]{0,40}\b(equals|means|implies|is the same as)\b[^.\n]{0,40}\b(not?[- ]retain|no retention))/i,
    reason: "equating no-training with no-retention",
  },
  {
    pattern: /DEC-0018[^.\n]{0,80}\b(grants|authorizes|enables)\b[^.\n]{0,60}\b(enablement|provider|authority)\b/i,
    reason: "describing proposed DEC-0018 as granting enablement authority",
    exemptNegation: true,
  },
];
for (const [name, body] of packetDocs) {
  const lines = body.split("\n");
  for (const { pattern, reason, exemptNegation } of prohibited) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!pattern.test(line)) continue;
      // Correction context may start on the previous line (wrapped prose):
      // a claim quoted as a corrected/prohibited error is legitimate.
      const window = `${lines[i - 1] ?? ""} ${line}`;
      if (isCorrectionContext(window)) continue;
      if (exemptNegation && /\bno\b|\bnot\b|\bnothing\b|grants no/i.test(window)) continue;
      fail(`${name}: prohibited claim class — ${reason}: "${line.trim().slice(0, 120)}"`);
    }
  }
}
// Required distinctions: the packet must keep the corrected taxonomy.
for (const sentinel of [
  "conditional", // Gemini ZDR is conditional
  "ZDR_NOT_VERIFIED", // in the threat model gate
  "within 30 days", // Anthropic conservative default
]) {
  const where = sentinel === "ZDR_NOT_VERIFIED" ? threatModel : packet;
  if (!where.includes(sentinel)) {
    fail(`required distinction sentinel missing: '${sentinel}'`);
  }
}
if (!/store\s*=?\s*false/.test(packet) || !packet.includes("abuse-log")) {
  fail("the packet must keep the store=false vs abuse-log-sanitization distinction (ledger C2)");
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
// Backticked identifiers in Option A that look like model IDs (contain a
// dash and a digit anywhere, any ending) must appear in the §5 matrix
// section itself — a recommendation-only model string has no evidence row.
const recommendation = packet.split("### Option A")[1]?.split("### Option B")[0] ?? "";
const matrixSection = packet.split("## 5. Comparison matrix")[1]?.split("## 6.")[0] ?? "";
if (matrixSection.length === 0) fail("the packet must carry the §5 comparison matrix");
const modelIds = [...recommendation.matchAll(/`([a-z][a-z0-9.\-]+)`/g)]
  .map((m) => m[1])
  .filter((id) => /-/.test(id) && /[0-9]/.test(id));
if (modelIds.length === 0) {
  fail("Option A must name at least one exact model ID in backticks");
}
for (const id of new Set(modelIds)) {
  if (!matrixSection.includes(id)) {
    fail(
      `model ID '${id}' appears in the recommendation but not in the §5 comparison matrix; every recommended ID needs its evidence row`
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} provider-packet failure(s).`);
  process.exit(1);
}
console.log("Provider decision packet: governance guards green.");
