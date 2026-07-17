#!/usr/bin/env node
// Contract validation: schemas compile (draft-07), $ids unique, examples validate.
// Uses ajv from node_modules (transitive dep) — no new dependencies in Phase 0.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let Ajv;
try {
  Ajv = require("ajv");
} catch {
  console.error("FAIL: ajv not resolvable from node_modules. Run `npm install` first.");
  process.exit(2);
}

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();

const ajv = new Ajv({ schemaId: "auto", allErrors: true, strict: false });
let failures = 0;
const ids = new Map();
const schemas = [];

for (const f of files) {
  let schema;
  try {
    schema = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (e) {
    failures++;
    console.error(`PARSE FAIL ${f}: ${e.message}`);
    continue;
  }
  if (!schema.$id) {
    failures++;
    console.error(`ID FAIL ${f}: missing $id`);
    continue;
  }
  if (ids.has(schema.$id)) {
    failures++;
    console.error(`ID FAIL ${f}: duplicate $id also in ${ids.get(schema.$id)}`);
    continue;
  }
  ids.set(schema.$id, f);
  schemas.push({ f, schema });
}

// Register all schemas first so cross-file $refs resolve, then compile.
for (const { f, schema } of schemas) {
  try {
    // ajv keys schemas by $id; relative $refs like "artifact-envelope.schema.json#/..."
    // resolve against the $id base URI.
    ajv.addSchema(schema);
  } catch (e) {
    failures++;
    console.error(`ADD FAIL ${f}: ${e.message}`);
  }
}

for (const { f, schema } of schemas) {
  let validate;
  try {
    validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  } catch (e) {
    failures++;
    console.error(`COMPILE FAIL ${f}: ${e.message}`);
    continue;
  }
  const examples = schema.examples ?? [];
  if (examples.length === 0 && !f.startsWith("artifact-envelope")) {
    console.warn(`WARN ${f}: no examples[]`);
  }
  examples.forEach((ex, i) => {
    if (!validate(ex)) {
      failures++;
      console.error(`EXAMPLE FAIL ${f}[${i}]:`);
      for (const err of validate.errors ?? []) {
        console.error(`  ${err.dataPath || err.instancePath || "/"} ${err.message}`);
      }
    }
  });
  console.log(`ok ${f} (${examples.length} example${examples.length === 1 ? "" : "s"})`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log(`\nAll ${schemas.length} schemas valid; all examples pass; $ids unique.`);
