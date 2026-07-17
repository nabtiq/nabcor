#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const path = (relative) => new URL(relative, root);
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL ${message}`);
};

const required = [
  "brain/README.md",
  "brain/current/NOW.md",
  "brain/current/ROADMAP.md",
  "brain/current/RISKS.md",
  "brain/current/OPEN_QUESTIONS.md",
  "brain/learnings/README.md",
  "brain/archive/README.md",
];

let requiredFileFailures = 0;
for (const file of required) {
  if (!existsSync(path(file))) { requiredFileFailures += 1; fail(`missing ${file}`); }
  else if (!readFileSync(path(file), "utf8").trim()) { requiredFileFailures += 1; fail(`empty ${file}`); }
}

const now = readFileSync(path("brain/current/NOW.md"), "utf8");
if (!/^\*\*Updated:\*\* \d{4}-\d{2}-\d{2}/m.test(now)) {
  fail("brain/current/NOW.md must contain **Updated:** YYYY-MM-DD");
}

const decisionsDir = path("brain/decisions/");
const decisionFiles = readdirSync(decisionsDir).filter((file) => file.endsWith(".md")).sort();
const ids = new Set();
const allowedStatuses = new Set(["proposed", "ratified", "rejected", "superseded"]);

for (const file of decisionFiles) {
  const body = readFileSync(new URL(file, decisionsDir), "utf8");
  const id = body.match(/^decision_id:\s*(DEC-\d{4})\s*$/m)?.[1];
  const title = body.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1];
  const status = body.match(/^status:\s*([a-z-]+)\s*$/m)?.[1];
  if (!id) fail(`${file}: missing decision_id`);
  else if (ids.has(id)) fail(`${file}: duplicate ${id}`);
  else ids.add(id);
  if (!title) fail(`${file}: missing title`);
  if (!status || !allowedStatuses.has(status)) fail(`${file}: invalid or missing status`);
  if (status === "ratified") {
    if (!/^approved_by:\s*.+$/m.test(body)) fail(`${file}: ratified without approved_by`);
    if (!/^approved_at:\s*\d{4}-\d{2}-\d{2}/m.test(body)) fail(`${file}: ratified without approved_at`);
  }
}

console.log(`Second Brain required files: ${required.length - requiredFileFailures}/${required.length}`);
console.log(`Decision records checked: ${decisionFiles.length}; unique IDs: ${ids.size}`);

if (failures) {
  console.error(`\n${failures} Second Brain failure(s).`);
  process.exit(1);
}
console.log("Second Brain structure valid.");
