// Offline operator CLI for human-gate key enrollment preparation (DEC-0014).
//
//   node dist/src/cli/keygen.js \
//     --subject-id <id> --label <text> --roles <csv> \
//     --valid-from <ISO date-time> [--valid-until <ISO date-time>] \
//     --private-key-out <path outside the repository> \
//     --public-candidate-out <path>
//
// Generates an Ed25519 keypair with Node.js built-in crypto and writes:
//   - the private key (PEM, PKCS#8) ONLY to the explicit operator-provided
//     path, created exclusively (never overwrites) with owner-only (0600)
//     permissions; symlinked path components are refused; paths inside the
//     repository are refused unconditionally;
//   - a separate public registry-entry candidate (JSON) for a later
//     authority-registry revision ratified by a decision record.
//
// The private key is never printed, logged, or echoed; stdout carries only
// the key ID, the candidate, and safe next steps. Enrollment itself — adding
// the candidate to the active registry — is a separate human-ratified change,
// never something this tool performs. No network access exists here.
import { generateKeyPairSync } from "node:crypto";
import { existsSync, lstatSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { keyIdForSpkiDer } from "../authority/approval-payload.js";

const ROLES = ["product-owner", "operator", "reviewer", "evaluation-owner"] as const;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fail(message: string): never {
  console.error(`keygen: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Map<string, string> {
  const known = new Set([
    "--subject-id",
    "--label",
    "--roles",
    "--valid-from",
    "--valid-until",
    "--private-key-out",
    "--public-candidate-out",
  ]);
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]!;
    if (!known.has(flag)) fail(`unknown flag '${flag}'`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`flag '${flag}' requires a value`);
    if (out.has(flag)) fail(`flag '${flag}' given twice`);
    out.set(flag, value);
  }
  return out;
}

/** Refuse any output path whose existing components include a symlink. */
function refuseSymlinkPath(path: string): void {
  let current = resolve(path);
  while (true) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      fail(`refusing '${path}': path component '${current}' is a symlink`);
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function refuseUnsafeOutput(path: string, kind: string, forbidInRepo: boolean): string {
  const abs = resolve(path);
  refuseSymlinkPath(abs);
  if (existsSync(abs)) fail(`refusing to overwrite existing ${kind} at '${abs}'`);
  const parent = dirname(abs);
  if (!existsSync(parent)) fail(`${kind} directory '${parent}' does not exist (create it explicitly first)`);
  if (forbidInRepo && (abs === REPO_ROOT || abs.startsWith(REPO_ROOT + sep))) {
    fail(`refusing to write private key material inside the repository ('${abs}')`);
  }
  return abs;
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["--subject-id", "--label", "--roles", "--valid-from", "--private-key-out", "--public-candidate-out"]) {
  if (!args.has(required)) fail(`missing required flag ${required}`);
}

const subjectId = args.get("--subject-id")!;
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(subjectId)) fail(`invalid --subject-id '${subjectId}'`);
const label = args.get("--label")!;
if (label.length < 1 || label.length > 200) fail("--label must be 1..200 characters");
const roles = args.get("--roles")!.split(",").map((r) => r.trim());
for (const role of roles) {
  if (!(ROLES as readonly string[]).includes(role)) {
    fail(`unknown role '${role}' (allowed: ${ROLES.join(", ")})`);
  }
}
const validFrom = args.get("--valid-from")!;
if (Number.isNaN(Date.parse(validFrom))) fail(`--valid-from '${validFrom}' is not a parseable date-time`);
const validUntil = args.get("--valid-until") ?? null;
if (validUntil !== null && Number.isNaN(Date.parse(validUntil))) {
  fail(`--valid-until '${validUntil}' is not a parseable date-time`);
}

const privateOut = refuseUnsafeOutput(args.get("--private-key-out")!, "private key", true);
const publicOut = refuseUnsafeOutput(args.get("--public-candidate-out")!, "public candidate", false);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const spkiDer = publicKey.export({ type: "spki", format: "der" });
const keyId = keyIdForSpkiDer(spkiDer);
const candidate = {
  key_id: keyId,
  subject_id: subjectId,
  label,
  algorithm: "ed25519",
  public_key_spki_b64: spkiDer.toString("base64"),
  roles: [...roles].sort(),
  valid_from: validFrom,
  valid_until: validUntil,
  status: "active",
};

// Exclusive create ('wx') + owner-only mode: an existing file, a race, or a
// symlink swapped in after the check all fail instead of overwriting.
writeFileSync(privateOut, privateKey.export({ type: "pkcs8", format: "pem" }), {
  flag: "wx",
  mode: 0o600,
});
writeFileSync(publicOut, JSON.stringify(candidate, null, 2) + "\n", { flag: "wx" });

console.log(`key_id: ${keyId}`);
console.log(`public registry-entry candidate written to: ${publicOut}`);
console.log(`private key written with owner-only permissions to: ${privateOut}`);
console.log("");
console.log("Next steps:");
console.log("  1. Keep the private key offline under your sole control; never commit,");
console.log("     upload, transmit, or paste it anywhere.");
console.log("  2. Propose a new authority-registry revision that adds the public");
console.log("     candidate (registry_version + 1, explicit lineage), referenced by a");
console.log("     ratified decision record.");
console.log("  3. Update the active human-gate policy's pinned registry version in the");
console.log("     same reviewed change.");
