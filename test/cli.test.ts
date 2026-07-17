import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

  // The flagged evidence-rich text descriptor is captured ONLY into the
  // quarantine namespace; the clean prompt lands in the clear namespace; and
  // captured content is never printed to the CLI output.
  const evidenceContent = join(out, "nabtiq_internal", "brand_synthetic_evidence", "content");
  const quarantineBlobs = readdirSync(join(evidenceContent, "quarantine"));
  assert.equal(quarantineBlobs.length, 1, "exactly the seeded injection text is quarantined");
  assert.ok(!existsSync(join(evidenceContent, "clear")), "no clear-namespace capture exists for the flagged text");
  const quarantinedText = readFileSync(join(evidenceContent, "quarantine", quarantineBlobs[0]!), "utf8");
  assert.match(quarantinedText, /Ignore previous instructions/);
  assert.ok(!run.stdout.includes("Ignore previous instructions"), "captured content must not appear in CLI output");
  const promptContent = join(out, "nabtiq_internal", "brand_synthetic_prompt", "content");
  assert.equal(readdirSync(join(promptContent, "clear")).length, 1, "the clean prompt is captured in clear");

  // The quarantined source artifact records an enforceable quarantined state.
  const sourceDir = join(out, "nabtiq_internal", "brand_synthetic_evidence", "source");
  const quarantinedSource = readdirSync(sourceDir)
    .map((f) => JSON.parse(readFileSync(join(sourceDir, f), "utf8")) as Record<string, unknown>)
    .find((s) => s["injection_flag"] === true);
  assert.ok(quarantinedSource, "the flagged source artifact exists");
  assert.equal(
    (quarantinedSource!["capture"] as Record<string, unknown>)["safety"],
    "quarantined"
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
