import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot, tempDir } from "./helpers.js";

const CLI = join(repoRoot, "dist", "src", "cli", "run-example.js");

test("the synthetic CLI example completes successfully and writes validated artifacts", () => {
  const out = tempDir("cli");
  const run = spawnSync(process.execPath, [CLI, "--out", out], { encoding: "utf8" });
  assert.equal(run.status, 0, `CLI failed:\n${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /INJECTION FLAGGED/);
  assert.ok(
    existsSync(join(out, "nabtiq_internal", "brand_synthetic_prompt", "brand-context", "bctx_po_0001.json"))
  );
  assert.ok(
    existsSync(join(out, "nabtiq_internal", "brand_synthetic_evidence", "brand-context", "bctx_ev_0001.json"))
  );

  // Re-running against the same directory must refuse to overwrite (INV-VER-001).
  const rerun = spawnSync(process.execPath, [CLI, "--out", out], { encoding: "utf8" });
  assert.equal(rerun.status, 1, "second run must fail rather than overwrite");
  assert.match(rerun.stderr + rerun.stdout, /already exists/);
});

test("the CLI requires an explicit output directory", () => {
  const run = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /usage:/);
});
