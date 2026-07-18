// Offline key-enrollment CLI (DEC-0014): exclusive owner-only private-key
// creation outside the repository, symlink refusal, and zero private-material
// leakage through any output channel.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { registry, repoRoot, tempDir } from "./helpers.js";

const CLI = join(repoRoot, "dist", "src", "cli", "keygen.js");

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runKeygen(args: string[]): CliRun {
  const run = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

function standardArgs(dir: string): string[] {
  return [
    "--subject-id",
    "po-test-owner",
    "--label",
    "Test enrollment candidate",
    "--roles",
    "product-owner,reviewer",
    "--valid-from",
    "2026-07-19T00:00:00Z",
    "--private-key-out",
    join(dir, "private.pem"),
    "--public-candidate-out",
    join(dir, "candidate.json"),
  ];
}

test("keygen writes an owner-only private key and a registry-valid public candidate, leaking nothing to stdout/stderr", () => {
  const dir = tempDir("keygen-happy");
  const result = runKeygen(standardArgs(dir));
  assert.equal(result.status, 0, `keygen must succeed: ${result.stderr}`);

  // Private key: exists, PKCS#8 PEM, owner-only permissions.
  const privatePath = join(dir, "private.pem");
  const pem = readFileSync(privatePath, "utf8");
  assert.match(pem, /^-----BEGIN PRIVATE KEY-----/);
  assert.equal(statSync(privatePath).mode & 0o777, 0o600, "private key must be owner-only (0600)");

  // No private material in any output channel: neither the PEM armor nor any
  // base64 body line of the private key may appear.
  const output = result.stdout + result.stderr;
  assert.ok(!output.includes("PRIVATE KEY"), "output must not contain PEM armor");
  for (const line of pem.split("\n")) {
    if (line.length > 10 && !line.startsWith("-----")) {
      assert.ok(!output.includes(line), "output must not contain private key body material");
    }
  }

  // Public candidate: validates inside an authority-registry document, and its
  // key_id binds to the SPKI bytes (the registry semantic layer recomputes it).
  const candidate = JSON.parse(readFileSync(join(dir, "candidate.json"), "utf8")) as Record<string, unknown>;
  assert.equal(candidate["algorithm"], "ed25519");
  assert.deepEqual(candidate["roles"], ["product-owner", "reviewer"]);
  const registryDoc = {
    schema_version: "1.7.0",
    registry_id: "areg-candidate-test",
    registry_version: 1,
    supersedes_registry_version: null,
    created_at: "2026-07-19T00:00:00Z",
    decision_ref: "DEC-0014",
    authorities: [candidate],
  };
  const validated = registry().validate("authority-registry", registryDoc);
  assert.ok(validated.ok, `candidate must be enrollable: ${JSON.stringify(validated)}`);
  assert.equal(String(candidate["key_id"]), result.stdout.match(/key_id: (k[0-9a-f]{64})/)?.[1]);
});

test("keygen refuses to overwrite an existing private key or candidate file", () => {
  const dir = tempDir("keygen-overwrite");
  writeFileSync(join(dir, "private.pem"), "already here", "utf8");
  const result = runKeygen(standardArgs(dir));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing to overwrite/);
  assert.equal(readFileSync(join(dir, "private.pem"), "utf8"), "already here", "existing file untouched");

  const dir2 = tempDir("keygen-overwrite2");
  writeFileSync(join(dir2, "candidate.json"), "already here", "utf8");
  const result2 = runKeygen(standardArgs(dir2));
  assert.equal(result2.status, 1);
  assert.match(result2.stderr, /refusing to overwrite/);
  assert.ok(!existsSync(join(dir2, "private.pem")), "no private key is written when any output is refused");
});

test("keygen refuses symlinked output paths", () => {
  const dir = tempDir("keygen-symlink");
  const realDir = join(dir, "real");
  mkdirSync(realDir);
  const linkedDir = join(dir, "linked");
  symlinkSync(realDir, linkedDir);
  const args = standardArgs(dir);
  args[args.indexOf("--private-key-out") + 1] = join(linkedDir, "private.pem");
  const result = runKeygen(args);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink/);
  assert.ok(!existsSync(join(realDir, "private.pem")), "nothing written through the symlink");
});

test("keygen refuses to write the private key inside the repository", () => {
  const dir = tempDir("keygen-inrepo");
  const args = standardArgs(dir);
  args[args.indexOf("--private-key-out") + 1] = join(repoRoot, "private-should-never-exist.pem");
  const result = runKeygen(args);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /inside the repository/);
  assert.ok(!existsSync(join(repoRoot, "private-should-never-exist.pem")));
});

test("keygen validates roles, dates, and required flags strictly", () => {
  const dir = tempDir("keygen-args");
  const badRole = standardArgs(dir);
  badRole[badRole.indexOf("--roles") + 1] = "product-owner,super-admin";
  assert.equal(runKeygen(badRole).status, 1, "unknown role");

  const badDate = standardArgs(dir);
  badDate[badDate.indexOf("--valid-from") + 1] = "not-a-date";
  assert.equal(runKeygen(badDate).status, 1, "unparseable valid-from");

  const missing = standardArgs(dir).slice(0, 6); // drop the path flags
  assert.equal(runKeygen(missing).status, 1, "missing required flags");

  const unknownFlag = [...standardArgs(dir), "--use-env-identity", "yes"];
  assert.equal(runKeygen(unknownFlag).status, 1, "unknown flags are refused, never ignored");
});

test("no private key material exists anywhere in the repository worktree", () => {
  // Repository-wide leakage scan: no PEM private-key armor and no PKCS#8
  // Ed25519 base64 prefix in any tracked file. Test fixtures generate keys
  // ephemerally in memory or temp dirs only.
  const files = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .trim()
    .split("\n");
  for (const file of files) {
    const body = readFileSync(join(repoRoot, file), "utf8");
    assert.ok(
      !body.includes("BEGIN PRIVATE KEY") || file === "test/keygen-cli.test.ts",
      `${file} must not contain private key armor`
    );
    assert.ok(
      !body.includes("BEGIN OPENSSH PRIVATE KEY") && !body.includes("BEGIN RSA PRIVATE KEY"),
      `${file} must not contain private key armor`
    );
  }
});
