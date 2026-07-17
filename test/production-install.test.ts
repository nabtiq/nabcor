// Isolated production-install smoke test (DEC-0006, finding A of the Phase 1A.1
// review): the compiled deterministic runtime must work in an install that
// contains ONLY runtime dependencies. Build output, contract schemas, synthetic
// fixtures, and the lockfile are staged into a temporary directory;
// `npm ci --omit=dev` runs there; then the contract registry and the synthetic
// CLI execute against that install. The primary worktree's node_modules is never
// touched — everything happens in the staging directory.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot, tempDir } from "./helpers.js";

test(
  "the compiled runtime works in an isolated production-only install (no TypeScript, no dev dependencies)",
  { timeout: 300_000 },
  () => {
    const staging = tempDir("prod-install");
    cpSync(join(repoRoot, "dist", "src"), join(staging, "dist", "src"), { recursive: true });
    mkdirSync(join(staging, "contracts"), { recursive: true });
    for (const f of readdirSync(join(repoRoot, "contracts"))) {
      if (f.endsWith(".schema.json")) cpSync(join(repoRoot, "contracts", f), join(staging, "contracts", f));
    }
    cpSync(join(repoRoot, "fixtures", "synthetic"), join(staging, "fixtures", "synthetic"), {
      recursive: true,
    });
    cpSync(join(repoRoot, "package.json"), join(staging, "package.json"));
    cpSync(join(repoRoot, "package-lock.json"), join(staging, "package-lock.json"));

    const ci = spawnSync(
      "npm",
      ["ci", "--omit=dev", "--no-audit", "--no-fund", "--ignore-scripts"],
      { cwd: staging, encoding: "utf8", timeout: 240_000 }
    );
    assert.equal(ci.status, 0, `npm ci --omit=dev failed:\n${ci.stdout}\n${ci.stderr}`);

    // Runtime dependencies are present; dev-only tooling is absent.
    assert.ok(existsSync(join(staging, "node_modules", "ajv")), "ajv must be installed in production");
    assert.ok(
      existsSync(join(staging, "node_modules", "ajv-formats")),
      "ajv-formats must be installed in production"
    );
    assert.ok(
      !existsSync(join(staging, "node_modules", "typescript")),
      "typescript must be absent from a production-only install"
    );
    assert.ok(
      !existsSync(join(staging, "node_modules", "@types", "node")),
      "@types/node must be absent from a production-only install"
    );
    if (existsSync(join(staging, "node_modules", "@types"))) {
      // npm may leave an empty scope placeholder; no typed package may exist in it.
      assert.deepEqual(readdirSync(join(staging, "node_modules", "@types")), []);
    }

    // The compiled contract registry loads and validates in the staged install.
    const probe = [
      'const { ContractRegistry } = await import("./dist/src/kernel/contract-registry.js");',
      'const registry = ContractRegistry.load("./contracts");',
      'const bad = registry.validate("claim", {});',
      'if (bad.ok) throw new Error("empty artifact must fail validation");',
      'console.log("registry ok:", registry.knownTypes.length, "contracts");',
    ].join("\n");
    const load = spawnSync(process.execPath, ["--input-type=module", "-e", probe], {
      cwd: staging,
      encoding: "utf8",
    });
    assert.equal(load.status, 0, `registry smoke failed:\n${load.stdout}\n${load.stderr}`);
    assert.match(load.stdout, /registry ok: \d+ contracts/);

    // The full synthetic CLI path runs on the production-only runtime.
    const cli = spawnSync(
      process.execPath,
      ["dist/src/cli/run-example.js", "--out", join(staging, "out")],
      { cwd: staging, encoding: "utf8" }
    );
    assert.equal(cli.status, 0, `CLI smoke failed:\n${cli.stdout}\n${cli.stderr}`);
    assert.match(cli.stdout, /done: all artifacts validated before write/);
  }
);
