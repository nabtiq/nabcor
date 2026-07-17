#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL ${message}`);
};

const required = [
  "README.md",
  "AGENTS.md",
  "FOUNDATION_BASELINE.md",
  "MIGRATION_MANIFEST.md",
  "constitution/PRODUCT_CONSTITUTION.md",
  "constitution/INVARIANTS.md",
  "docs/DOMAIN_MODEL.md",
  "docs/PROVENANCE_AND_CONFIDENCE.md",
  "docs/EVALUATION_FRAMEWORK.md",
  "docs/FIRST_VERTICAL_SLICE.md",
  "contracts/validate.mjs",
  ".github/workflows/validate-foundation.yml",
];

const forbiddenLegacy = [
  "apps/demo",
  "packages/core",
  "packages/theme-novalt",
  "packages/theme-plain",
  "prompts/01-intake-triage.md",
  "docs/install-a-site.md",
  "docs/build-a-theme.md",
  "docs/architecture-decisions/001-nextjs-app-router-standalone.md",
];

for (const file of required) if (!existsSync(join(root, file))) fail(`missing ${file}`);
for (const file of forbiddenLegacy) if (existsSync(join(root, file))) fail(`legacy artifact present: ${file}`);

const readme = readFileSync(join(root, "README.md"), "utf8");
if (!/AI Creative Operating System/.test(readme)) fail("README lacks the new product category");
if (/shared foundation for building client websites/i.test(readme)) fail("README still defines the legacy product");

const oversized = [];
const markdownFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      if (statSync(full).size > 1_000_000) oversized.push(relative(root, full));
      if (entry.name.endsWith(".md")) markdownFiles.push(full);
    }
  }
}
walk(root);
if (oversized.length) fail(`unexpected files larger than 1 MB: ${oversized.join(", ")}`);

let linksChecked = 0;
for (const file of markdownFiles) {
  const body = readFileSync(file, "utf8");
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^(https?:|mailto:)/i.test(raw)) continue;
    const target = decodeURIComponent(raw.split("#")[0].split("?")[0]);
    if (!target) continue;
    linksChecked += 1;
    if (!existsSync(join(file, "..", target))) {
      fail(`${relative(root, file)}: broken relative link '${raw}'`);
    }
  }
}

console.log(`Required baseline files: ${required.length}`);
console.log(`Legacy exclusions checked: ${forbiddenLegacy.length}`);
console.log("Large-file check: clear");
console.log(`Relative Markdown links checked: ${linksChecked}`);

if (failures) {
  console.error(`\n${failures} repository-baseline failure(s).`);
  process.exit(1);
}
console.log("Repository baseline valid.");
