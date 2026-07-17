#!/usr/bin/env node
// Foundation contract validation: schema layer + deterministic semantic layer.
//
//   node contracts/validate.mjs
//
// Schema layer   — draft-07 (Ajv + ajv-formats, explicit dev dependencies):
//   every *.schema.json compiles · $ids unique · every examples[] entry and every
//   positive fixture validates · every negative fixture with expect_fail_at:"schema"
//   is rejected.
// Semantic layer — cross-field invariants draft-07 cannot express cleanly; each check
//   names the invariant it enforces. Runs on all schema-valid instances; negative
//   fixtures with expect_fail_at:"semantic" must pass schema and fail semantics.
// Exit: 0 only when every layer is fully green.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let Ajv, addFormats;
try {
  const ajvModule = require("ajv");
  const formatsModule = require("ajv-formats");
  Ajv = ajvModule.default ?? ajvModule;
  addFormats = formatsModule.default ?? formatsModule;
} catch {
  console.error("FAIL: ajv/ajv-formats not resolvable. Run `npm ci` first.");
  process.exit(2);
}

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL " + msg); };

// ---- semantic layer -------------------------------------------------------
// checker: (data) => array of violation strings (empty = pass)
const SEMANTIC = {
  "decision.schema.json": [
    {
      invariant: "INV-HUM-001/INV-DEC-001 ratification-approval",
      check: (d) =>
        d.status === "ratified" &&
        !(d.approvals ?? []).some((a) => a.gate === "ratification" && a.verdict === "approved")
          ? ["status=ratified requires an approvals entry {gate:'ratification', verdict:'approved'}"]
          : [],
    },
  ],
  "evaluation-report.schema.json": [
    {
      invariant: "INV-EVAL-001 score-requires-rubric",
      check: (d) =>
        (d.evaluations ?? [])
          .filter((e) => e.score !== null && e.score !== undefined && !e.rubric_ref)
          .map((e) => `evaluation '${e.dimension}' has a numeric score without rubric_ref`),
    },
    {
      invariant: "INV-EVAL-001 blocking-consistency",
      check: (d) => {
        const out = [];
        const blockingFails = (d.evaluations ?? []).filter(
          (e) => e.authority === "blocking" && e.verdict === "fail"
        );
        if (d.overall_verdict === "pass" && blockingFails.length > 0)
          out.push("overall_verdict=pass while blocking evaluations failed");
        for (const e of blockingFails)
          if (!(d.blocking_failures ?? []).includes(e.dimension))
            out.push(`blocking failure '${e.dimension}' missing from blocking_failures`);
        return out;
      },
    },
  ],
  "claim.schema.json": [
    {
      invariant: "INV-FACT-002 inference-verification-needs-human",
      check: (d) =>
        d.classification === "inference" && d.verification_status === "verified" && !d.verified_by
          ? ["inference claim marked verified without verified_by (human confirmation)"]
          : [],
    },
    {
      invariant: "INV-FACT-001 codepoints-fragment-ordered",
      check: (d) => {
        if (typeof d.source_ref !== "string") return [];
        const m = /#codepoints=([0-9]+)-([0-9]+)$/.exec(d.source_ref);
        if (m && Number(m[1]) >= Number(m[2]))
          return [`source_ref code-point fragment ${m[1]}-${m[2]} is invalid: start must be less than end`];
        return [];
      },
    },
  ],
  "source.schema.json": [
    {
      invariant: "INV-SEC-002 flagged-captured-content-must-be-quarantined",
      check: (d) =>
        d.injection_flag === true &&
        d.capture?.status === "captured" &&
        d.capture?.safety !== "quarantined"
          ? ["captured content is injection-flagged but not in the quarantine namespace (a flag is not a quarantine)"]
          : [],
    },
  ],
  "model-run.schema.json": [
    {
      invariant: "INV-OBS-001 cost-mode-consistency",
      check: (d) => {
        const out = [];
        const c = d.cost ?? {};
        if (c.mode === "api" && (typeof c.usd !== "number" || c.allocation !== "measured"))
          out.push("cost.mode=api requires numeric usd and allocation=measured");
        if (c.mode === "subscription" && (c.usd !== null || c.allocation !== "none"))
          out.push("cost.mode=subscription requires usd=null and allocation=none (never conflated)");
        return out;
      },
    },
  ],
  "validation-matrix.schema.json": [
    {
      invariant: "INV-AR-001/INV-PE-001 combination-membership",
      check: (d) => {
        const out = [];
        const dims = d.dimensions ?? {};
        (d.required_combinations ?? []).forEach((c, i) => {
          for (const [k, v] of Object.entries(c))
            if (dims[k] && !dims[k].includes(v))
              out.push(`required_combinations[${i}].${k}='${v}' not in declared dimensions.${k}`);
        });
        return out;
      },
    },
    {
      invariant: "INV-PE-001 js-disabled-combination-present",
      check: (d) =>
        (d.required_combinations ?? []).some((c) => c.js_state === "disabled")
          ? []
          : ["no required combination with js_state=disabled (F03 mandate)"],
    },
  ],
  "website-spec.schema.json": [
    {
      invariant: "INV-FACT-001 factual-slots-claim-backed",
      check: (d) => {
        const out = [];
        for (const s of d.sections ?? [])
          for (const slot of s.copy_slots ?? [])
            if (
              slot.role === "factual" &&
              !(slot.claim_refs ?? []).length &&
              !(typeof slot.unresolved_fact_note === "string" && slot.unresolved_fact_note.length)
            )
              out.push(`section '${s.section_id}' slot '${slot.slot_id}': factual role without claim_refs or unresolved_fact_note`);
        return out;
      },
    },
  ],
  "social-asset-spec.schema.json": [
    {
      invariant: "INV-FACT-001 factual-slots-claim-backed",
      check: (d) =>
        (d.copy ?? [])
          .filter((slot) => slot.role === "factual" && !(slot.claim_refs ?? []).length)
          .map((slot) => `copy slot '${slot.slot_id}': factual role without claim_refs`),
    },
  ],
};

function runSemantic(schemaFile, data) {
  const violations = [];
  for (const { invariant, check } of SEMANTIC[schemaFile] ?? [])
    for (const v of check(data)) violations.push(`[${invariant}] ${v}`);
  return violations;
}

// ---- load + compile schemas ----------------------------------------------
const ids = new Map();
const schemas = [];
for (const f of files) {
  let schema;
  try {
    schema = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (e) { fail(`parse ${f}: ${e.message}`); continue; }
  if (!schema.$id) { fail(`${f}: missing $id`); continue; }
  if (ids.has(schema.$id)) { fail(`${f}: duplicate $id also in ${ids.get(schema.$id)}`); continue; }
  ids.set(schema.$id, f);
  schemas.push({ f, schema });
}
for (const { f, schema } of schemas) {
  try { ajv.addSchema(schema); } catch (e) { fail(`addSchema ${f}: ${e.message}`); }
}
const validators = new Map();
for (const { f, schema } of schemas) {
  try { validators.set(f, ajv.getSchema(schema.$id) ?? ajv.compile(schema)); }
  catch (e) { fail(`compile ${f}: ${e.message}`); }
}
console.log(`schemas compiled: ${validators.size}/${files.length}`);

// ---- positive cases: examples + positive fixtures ------------------------
let positivePassed = 0, positiveTotal = 0, semanticChecksRun = 0;
function runPositive(schemaFile, data, label) {
  positiveTotal++;
  const validate = validators.get(schemaFile);
  if (!validate) { fail(`${label}: no validator for ${schemaFile}`); return; }
  if (!validate(data)) {
    fail(`${label}: SCHEMA rejected a positive case`);
    for (const err of validate.errors ?? [])
      console.error(`    ${err.instancePath || "/"} ${err.message}`);
    return;
  }
  const violations = runSemantic(schemaFile, data);
  if (violations.length) {
    fail(`${label}: SEMANTIC rejected a positive case`);
    for (const v of violations) console.error(`    ${v}`);
    return;
  }
  positivePassed++;
  semanticChecksRun += (SEMANTIC[schemaFile] ?? []).length;
}

for (const { f, schema } of schemas)
  (schema.examples ?? []).forEach((ex, i) => runPositive(f, ex, `${f} examples[${i}]`));

const positiveFixtures = JSON.parse(readFileSync(join(dir, "fixtures/positive.json"), "utf8"));
for (const fx of positiveFixtures) runPositive(fx.schema, fx.data, `positive ${fx.id}`);
console.log(`positive cases passed: ${positivePassed}/${positiveTotal}`);

// ---- negative fixtures ----------------------------------------------------
const negativeFixtures = JSON.parse(readFileSync(join(dir, "fixtures/negative.json"), "utf8"));
let negSchema = 0, negSemantic = 0;
for (const fx of negativeFixtures) {
  const validate = validators.get(fx.schema);
  if (!validate) { fail(`negative ${fx.id}: no validator for ${fx.schema}`); continue; }
  const schemaOk = validate(fx.data);
  if (fx.expect_fail_at === "schema") {
    if (schemaOk) fail(`negative ${fx.id}: SCHEMA accepted an invalid artifact (${fx.description})`);
    else negSchema++;
  } else if (fx.expect_fail_at === "semantic") {
    if (!schemaOk) {
      fail(`negative ${fx.id}: expected schema-valid input for a semantic case, but schema rejected it (fixture bug)`);
      for (const err of validate.errors ?? []) console.error(`    ${err.instancePath || "/"} ${err.message}`);
    } else if (runSemantic(fx.schema, fx.data).length === 0) {
      fail(`negative ${fx.id}: SEMANTIC accepted an invalid artifact (${fx.description})`);
    } else negSemantic++;
  } else {
    fail(`negative ${fx.id}: unknown expect_fail_at '${fx.expect_fail_at}'`);
  }
}
console.log(`negative cases correctly rejected: ${negSchema + negSemantic}/${negativeFixtures.length} (schema: ${negSchema}, semantic: ${negSemantic})`);
console.log(`semantic checks passed on positive cases: ${semanticChecksRun}`);
console.log(`$id uniqueness: ${ids.size === schemas.length ? "unique" : "DUPLICATES"}`);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll layers green.");
