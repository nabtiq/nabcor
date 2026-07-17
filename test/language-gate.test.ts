import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot, tempDir } from "./helpers.js";

const VALIDATOR = join(repoRoot, "scripts", "validate-language.mjs");

test("the language validator rejects a generated Arabic code point", () => {
  // The code point is generated at runtime so no Arabic character is ever
  // committed in this test's source.
  const probe = join(tempDir("lang"), "probe.txt");
  writeFileSync(probe, `seeded ${String.fromCodePoint(0x0645)} character\n`, "utf8");
  const run = spawnSync(process.execPath, [VALIDATOR, probe], { encoding: "utf8" });
  assert.equal(run.status, 1, `expected exit 1, got ${run.status}:\n${run.stdout}${run.stderr}`);
  assert.match(run.stderr, /U\+0645/);
  assert.match(run.stderr, new RegExp("probe\\.txt:1:8"));
});

test("the language validator passes clean English files", () => {
  const probe = join(tempDir("lang"), "clean.txt");
  writeFileSync(probe, "plain English content only\n", "utf8");
  const run = spawnSync(process.execPath, [VALIDATOR, probe], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("the complete tracked repository contains zero Arabic-script characters", () => {
  const run = spawnSync(process.execPath, [VALIDATOR], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, `repository language scan failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /0 violation\(s\)/);
});
