#!/usr/bin/env node
// English-only repository language gate (README.md §Repository language policy).
//
//   node scripts/validate-language.mjs [file ...]
//
// With no arguments: scans every Git-tracked file in the repository.
// With arguments: scans exactly the given files (used by the runtime test to prove
// the gate catches a generated Arabic code point without committing a literal one).
//
// Fails (exit 1) when any scanned text file contains a character in the Arabic
// Unicode blocks: U+0600-U+06FF, U+0750-U+077F, U+08A0-U+08FF, U+FB50-U+FDFF,
// U+FE70-U+FEFF. Prints every offending path:line:column. Binary files (containing
// a NUL byte in the first 8 KiB) are skipped; .git, node_modules, and generated
// output are never scanned because only tracked files are enumerated.
//
// execFileSync with a fixed argv (no shell, no interpolated input) — not exec().
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Written as \u escapes so this file never contains a literal Arabic character.
const ARABIC_BLOCKS = new RegExp(
  "[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]",
  "u"
);

function listTrackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: root });
  return out.toString("utf8").split("\0").filter(Boolean).map((f) => resolve(root, f));
}

function isBinary(buffer) {
  const probe = buffer.subarray(0, 8192);
  return probe.includes(0);
}

const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => resolve(f)) : listTrackedFiles();

let violations = 0;
let scanned = 0;
for (const file of files) {
  let buffer;
  try {
    buffer = readFileSync(file);
  } catch (e) {
    console.error(`FAIL cannot read ${file}: ${e.message}`);
    violations++;
    continue;
  }
  if (isBinary(buffer)) continue;
  scanned++;
  const lines = buffer.toString("utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = ARABIC_BLOCKS.exec(lines[i]);
    if (match) {
      violations++;
      const codePoint = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
      console.error(`FAIL ${file}:${i + 1}:${match.index + 1} Arabic-script character U+${codePoint}`);
    }
  }
}

console.log(`language gate: ${scanned} text file(s) scanned, ${violations} violation(s)`);
if (violations > 0) {
  console.error("Arabic-script characters are prohibited in tracked repository files (see README.md language policy).");
  process.exit(1);
}
console.log("English-only language gate: clean.");
