#!/usr/bin/env node
// Deterministic provider-governance validation (Phase 1C.0/1C.0.1; updated
// consciously by the Phase 1C.1 implementation merge under DEC-0018/DEC-0019).
//
// Guards the CONFIGURED_BUT_LIVE_DISABLED governance state:
//   1. DEC-0018 is RATIFIED (Option A) with recorded verbatim Product
//      Owner approval evidence — regressing it to proposed, dropping the
//      evidence, or mislabeling the index is a defect.
//   2. The active gateway policy stays byte-identical to its Phase 1C.1
//      DEC-0018/DEC-0019 posture, DEC-0019 is ratified, and the committed
//      provider operational state pins live invocation, credential
//      provisioning, the console cap, the smoke call, and EXP-0001
//      execution all OFF — enabling any of them is a new ratified phase
//      that updates this guard consciously, never a drift.
//   3. EXP-0001's Result section stays empty (its execution additionally
//      requires a separate authenticated approval per the ratification).
//   4. The packet documents estimates only, carries sourced pricing, and
//      contains no credential-shaped values.
//   5. Model IDs named in the recommended option also appear in the
//      comparison matrix (no recommendation-only model strings).
//
// The cryptographic candidate -> evidence -> authority -> decision ->
// active-policy chain is verified by scripts/validate-provider-chain.mjs.
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

// ---- 1. DEC-0018 is ratified (Option A) with recorded evidence ----
const dec18 = read("brain/decisions/DEC-0018-provider-enablement.md");
if (!/^status: ratified$/m.test(dec18)) {
  fail("DEC-0018 must carry `status: ratified` (Option A was ratified 2026-07-19)");
}
if (/^approved_by: null$/m.test(dec18) || /^approved_at: null$/m.test(dec18)) {
  fail("ratified DEC-0018 must carry non-null approval evidence fields");
}
if (!dec18.includes("Ibrahim Mohamed") || !dec18.includes("self_review: true")) {
  fail("DEC-0018 approval evidence must name the Product Owner with self_review: true (DEC-0008)");
}
if (!dec18.includes("ratify\n> DEC-0018 Option A") && !dec18.includes("ratify DEC-0018 Option A")) {
  fail("DEC-0018 must record the verbatim Option A ratification statement");
}
if (!dec18.includes("bbca93a4ca0b9dbc7df8de5c9d799721b467e3c9")) {
  fail("the ratification statement must stay pinned to the packet commit it named");
}
if (!dec18.includes("authorizes only the Phase 1C.1")) {
  fail("DEC-0018 must record that ratification authorizes the Phase 1C.1 implementation phase only");
}

// The decision index must list DEC-0018 as ratified (Option A).
const index = read("docs/DECISION_SYSTEM.md");
const dec18Row = index
  .split("\n")
  .find((line) => line.startsWith("| DEC-0018"));
if (!dec18Row) fail("docs/DECISION_SYSTEM.md must index DEC-0018");
else if (!dec18Row.includes("ratified") || !dec18Row.includes("Option A")) {
  fail("the DEC-0018 index row must say ratified with Option A");
}

// ---- 2. Active gateway policy is pinned at the DEC-0018/DEC-0019 posture ----
// Byte-level guard, consciously updated by the Phase 1C.1 implementation
// merge (the exact conscious update the Phase 1C.0 guard demanded): the
// active policy now encodes the ratified DEC-0018 Option A enablement with
// the signed provider-policy-candidate binding. Any later change — including
// enabling live invocation — is a new ratified phase that updates this hash
// in the same reviewed change, never a silent drift. The candidate/evidence/
// receipt/decision chain itself is verified by scripts/validate-provider-chain.mjs.
const EXPECTED_POLICY_SHA256 =
  "02b4ed937f327982ccaa9751757f012a3d5d81704045277c45f6df373898629e";
const policyRaw = read("contracts/gateway-policy.active.json");
const policySha = createHash("sha256").update(policyRaw, "utf8").digest("hex");
if (policySha !== EXPECTED_POLICY_SHA256) {
  fail(
    `contracts/gateway-policy.active.json changed (sha256 ${policySha}); the active policy may only change in a ratified provider-enablement phase that updates this guard consciously`
  );
}
const policy = JSON.parse(policyRaw);
if (policy.decision_ref !== "DEC-0018") {
  fail("the active gateway policy must reference the ratified enablement decision DEC-0018");
}
if (!/^status: ratified$/m.test(dec18)) {
  fail("the active policy's decision_ref must point at a RATIFIED decision");
}
const dec19 = read("brain/decisions/DEC-0019-anthropic-provider-implementation.md");
if (!/^status: ratified$/m.test(dec19)) {
  fail("DEC-0019 (the implementation decision) must be ratified");
}
// State-INDEPENDENT invariants that hold in every provider operational state
// (DEC-0019/DEC-0020): general live invocation is never enabled, and EXP-0001
// is never executed. The per-state flag rules (which flags/refs are permitted
// in CONFIGURED_BUT_LIVE_DISABLED vs SMOKE_CALL_AUTHORIZED vs
// SMOKE_VERIFIED_EXP_DISABLED) are enforced by the contract semantic layer and
// its fixtures; this guard re-asserts the two invariants that must hold no
// matter which state the smoke ceremony has reached.
const operationalState = JSON.parse(read("contracts/provider-operational-state.active.json"));
const VALID_STATES = ["CONFIGURED_BUT_LIVE_DISABLED", "SMOKE_CALL_AUTHORIZED", "SMOKE_VERIFIED_EXP_DISABLED"];
if (!VALID_STATES.includes(operationalState.operational_state)) {
  fail(`provider-operational-state.operational_state '${operationalState.operational_state}' is not a valid state`);
}
if (operationalState.live_invocation_enabled !== false) {
  fail("provider-operational-state.live_invocation_enabled must be false in every state (general live invocation is never enabled)");
}
if (operationalState.exp_0001_executed !== false) {
  fail("provider-operational-state.exp_0001_executed must be false (EXP-0001 requires its own separate later signed approval)");
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
// They deliberately do NOT freeze market facts (prices, model lists, and
// provider capabilities drift, and CI cannot verify internet truth — every
// external fact requires human re-verification at ratification time, see
// RISK-DECAY-01); they only prevent the specific prohibited claim classes
// from re-entering canonical documents. They are TRIPWIRES over normalized
// text, not proofs: matching runs on whitespace-collapsed bodies (so
// hard-wrapped prose cannot evade by line breaks), and a match is exempt
// only when an explicit correction/negation PHRASE (never a bare keyword)
// appears within a 160-character window around it.
const packetDocs = [
  ["docs/PROVIDER_ENABLEMENT_DECISION_PACKET.md", packet],
  ["docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md", threatModel],
  [
    "docs/PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md",
    read("docs/PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md"),
  ],
  ["brain/decisions/DEC-0018-provider-enablement.md", dec18],
  ["brain/current/NOW.md", read("brain/current/NOW.md")],
  ["brain/current/ROADMAP.md", read("brain/current/ROADMAP.md")],
  ["brain/current/OPEN_QUESTIONS.md", read("brain/current/OPEN_QUESTIONS.md")],
];
// Exemption PHRASES (targeted, multi-word — bare keywords like "false",
// "never", "error", or "guard" deliberately do NOT exempt):
const EXEMPT_WINDOW =
  /corrected|CONFIRMED_ERROR|falsif|was FALSE|is false|original claim|Original:|prohibited claim|regression guard|must not|must never|never (again|surface|be (read|claimed|treated))|not sufficient|is not a|alone (does not|is not|removes|only)|fails? (on|if)|validator now|claim class|fixed the false/i;
const prohibited = [
  {
    pattern:
      /\b(Gemini|Google|Developer API)\b[^.]{0,120}\bno (zero[- ](data[- ])?retention|ZDR)( offering| option| availability| path| capability)?\b/i,
    reason:
      "claiming the Gemini Developer API has no ZDR offering (falsified by ai.google.dev/gemini-api/docs/zdr)",
  },
  {
    pattern: /\bZDR\b[^.]{0,80}\b(is )?(unavailable|not (available|offered|possible))\b[^.]{0,60}\b(Gemini|Developer API|Google)\b/i,
    reason: "claiming ZDR is unavailable on the Gemini Developer API",
  },
  {
    pattern:
      /\bstore\s*(=|to)?\s*false\b[^.]{0,100}\b(is|provides|proves|achieves|equals|yields|sufficient for|gives)\b[^.]{0,60}\b(ZDR|zero[- ]data[- ]retention|zero[- ]data footprint)\b/i,
    reason: "claiming store=false alone provides/proves ZDR",
  },
  {
    pattern:
      /\bstateless\b[^.]{0,100}\b((zero|no) (backend )?retention|nothing is retained|retains? nothing)\b/i,
    reason: "equating stateless transport with zero retention",
  },
  {
    pattern:
      /\b((zero|no) (backend )?retention|retains? nothing|does not retain anything)\b[^.]{0,100}\bstateless\b/i,
    reason: "equating zero retention with stateless transport",
  },
  {
    pattern:
      /\b(Anthropic|Messages API|standard Messages)\b[^.]{0,100}\b(zero retention by default|retains? nothing|does not retain anything)\b/i,
    reason:
      "claiming standard Anthropic Messages calls have zero retention by default (official default: backend deletion within 30 days with listed exceptions)",
  },
  {
    pattern:
      /\bno[- ]training\b[^.]{0,60}\b(equals|means|implies|is the same as)\b[^.]{0,60}\b(no[- ]retention|not retained)\b/i,
    reason: "equating no-training with no-retention",
  },
  {
    // Post-ratification form of the authority guard: DEC-0018 authorizes
    // the implementation PHASE, never a live provider/spend state — no
    // document may claim a provider is enabled or EXP-0001 ran until the
    // Phase 1C.1 revision and its own gates land.
    pattern:
      /\b(provider|Anthropic( API)?)\b[^.]{0,60}\b(is|are|now|has been) (now )?(enabled|live|active|connected)\b/i,
    reason:
      "claiming a provider is enabled before the Phase 1C.1 policy revision merges",
    negation: /no provider is enabled|not (yet )?(enabled|live|active)|until|remains (operationally )?active|stays/i,
  },
];
for (const [name, body] of packetDocs) {
  // Normalize: collapse whitespace so wrapped prose is one searchable text.
  const normalized = body.replace(/\s+/g, " ");
  for (const { pattern, reason, negation } of prohibited) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let match;
    while ((match = global.exec(normalized)) !== null) {
      const windowStart = Math.max(0, match.index - 160);
      const window = normalized.slice(windowStart, match.index + match[0].length + 160);
      if (EXEMPT_WINDOW.test(window)) continue;
      if (negation && negation.test(window)) continue;
      fail(`${name}: prohibited claim class — ${reason}: "...${match[0].slice(0, 120)}..."`);
    }
  }
}
// Required distinctions, bound to the exact matrix rows (not satisfied by
// stray occurrences of the words elsewhere in the document):
const row18 = packet.split("\n").find((line) => line.startsWith("| 18 |")) ?? "";
if (!/conditional/i.test(row18) || !/approval/i.test(row18)) {
  fail("matrix row 18 must describe Gemini ZDR as CONDITIONAL and approval-gated (ledger C1)");
}
const row17 = packet.split("\n").find((line) => line.startsWith("| 17 |")) ?? "";
if (!/within 30 days/.test(row17)) {
  fail("matrix row 17 must carry the conservative Anthropic 30-day deletion default (ledger C4)");
}
if (!threatModel.includes("ZDR_NOT_VERIFIED")) {
  fail("the threat model must specify the ZDR_NOT_VERIFIED reporting rule (T07a)");
}
if (!/store\s*=?\s*false/.test(packet) || !packet.includes("abuse-log")) {
  fail("the packet must keep the store=false vs abuse-log-sanitization distinction (ledger C2)");
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
