// Offline operator CLI producing signed human-gate approval evidence
// (DEC-0014/DEC-0015).
//
//   node dist/src/cli/sign-approval.js \
//     --private-key <path outside the repository> \
//     --artifacts-root <artifact store root> \
//     --workspace <id> --brand-ref <id> \
//     --target-type <artifact type> --target-ref <id> \
//     --gate <gate> --verdict approved|rejected --reason <text> \
//     --requester-id <id> [--ttl-seconds <n>] \
//     --evidence-out <path> [--trusted-config-dir <dir>]
//
// Boundary rules, all fail-closed:
//   - The private key is read from an explicit operator-provided path only:
//     never an environment variable, never a default location. Symlinked
//     paths, keys inside the repository, and keys without owner-only
//     permissions are refused. Key material is held in memory for signing
//     only — never printed, logged, copied, or written anywhere.
//   - The approver identity is DERIVED: the public key is computed from the
//     private key, its key_id is recomputed from the SPKI DER bytes, and
//     that key_id must resolve to an active, currently valid authority in
//     the trusted registry. The operator cannot assert an identity.
//   - The active policy and registry load from the committed trusted paths
//     under contracts/ by default. --trusted-config-dir points at an
//     isolated copy for tests and smoke stores; it grants nothing, because
//     authorization always comes from the VERIFIER's trusted config, not
//     the signer's.
//   - Gates whose policy requirement carries independent_review_required
//     are refused outright: the self-signing flow can never produce
//     evidence for an independent-review gate (DEC-0008).
//   - The target artifact is loaded from its exact canonical store address
//     and its content digest is signed, so the evidence binds one exact
//     artifact state.
//   - The nonce is cryptographically random and single-use by construction
//     downstream (receipt consumption); the evidence file is created
//     exclusively (never overwrites) outside the repository.
//   - Producing evidence applies NO business action and consumes nothing.
import { randomBytes } from "node:crypto";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  keyIdForSpkiDer,
  signApprovalPayload,
} from "../authority/approval-payload.js";
import { loadTrustedAuthorityConfig } from "../authority/authority.js";
import { FileArtifactStore } from "../kernel/artifact-store.js";
import { contentDigest } from "../kernel/canonical-json.js";
import { ContractRegistry } from "../kernel/contract-registry.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fail(message: string): never {
  console.error(`sign-approval: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Map<string, string> {
  const known = new Set([
    "--private-key",
    "--artifacts-root",
    "--workspace",
    "--brand-ref",
    "--target-type",
    "--target-ref",
    "--gate",
    "--verdict",
    "--reason",
    "--requester-id",
    "--ttl-seconds",
    "--evidence-out",
    "--trusted-config-dir",
  ]);
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]!;
    if (!known.has(flag)) fail(`unknown flag '${flag}'`);
    const value = argv[i + 1];
    if (value === undefined) fail(`flag '${flag}' requires a value`);
    if (out.has(flag)) fail(`flag '${flag}' given twice`);
    out.set(flag, value);
  }
  return out;
}

/** The private key must be a regular file, not a symlink, outside the repository, owner-only. */
function checkPrivateKeyPath(path: string): string {
  const abs = resolve(path);
  let stat;
  try {
    stat = lstatSync(abs);
  } catch {
    fail(`private key '${abs}' does not exist or is unreadable`);
  }
  if (stat.isSymbolicLink()) fail(`refusing '${abs}': the private-key path is a symlink`);
  if (!stat.isFile()) fail(`refusing '${abs}': the private-key path is not a regular file`);
  const real = realpathSync(abs);
  const realRepo = realpathSync(REPO_ROOT);
  if (real === realRepo || real.startsWith(realRepo + sep)) {
    fail(`refusing to use a private key inside the repository ('${abs}')`);
  }
  const mode = statSync(abs).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail(
      `refusing '${abs}': permissions ${mode.toString(8).padStart(3, "0")} are not owner-only (chmod 600 the key first)`
    );
  }
  return abs;
}

/** Exclusive-create output target: no symlinks, no overwrite, not inside the repository. */
function checkEvidenceOut(path: string): string {
  const abs = resolve(path);
  let targetStat = null;
  try {
    targetStat = lstatSync(abs);
  } catch {
    // target does not exist — the required state
  }
  if (targetStat?.isSymbolicLink()) fail(`refusing '${abs}': the target is a symlink`);
  if (targetStat) fail(`refusing to overwrite existing evidence at '${abs}'`);
  const parent = dirname(abs);
  if (!existsSync(parent)) fail(`evidence directory '${parent}' does not exist (create it explicitly first)`);
  if (lstatSync(parent).isSymbolicLink()) fail(`refusing '${abs}': its directory '${parent}' is a symlink`);
  const realParent = realpathSync(parent);
  const realRepo = realpathSync(REPO_ROOT);
  if (realParent === realRepo || realParent.startsWith(realRepo + sep)) {
    fail(`refusing to write approval evidence inside the repository ('${abs}'); evidence belongs in operational stores`);
  }
  return abs;
}

const args = parseArgs(process.argv.slice(2));
for (const required of [
  "--private-key",
  "--artifacts-root",
  "--workspace",
  "--brand-ref",
  "--target-type",
  "--target-ref",
  "--gate",
  "--verdict",
  "--reason",
  "--requester-id",
  "--evidence-out",
]) {
  if (!args.has(required)) fail(`missing required flag ${required}`);
}

const verdict = args.get("--verdict")!;
if (verdict !== "approved" && verdict !== "rejected") fail(`--verdict must be 'approved' or 'rejected'`);
const reason = args.get("--reason")!;
if (reason.length < 1 || reason.length > 2000) fail("--reason must be 1..2000 characters");
const requesterId = args.get("--requester-id")!;
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(requesterId)) fail(`invalid --requester-id '${requesterId}'`);
const ttlSeconds = args.has("--ttl-seconds") ? Number(args.get("--ttl-seconds")) : 3600;
if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60) fail("--ttl-seconds must be an integer of at least 60");

const privateKeyPath = checkPrivateKeyPath(args.get("--private-key")!);
const evidenceOut = checkEvidenceOut(args.get("--evidence-out")!);

// Derive the signing identity from the key itself; the operator asserts nothing.
let privateKeyPem: string;
let keyId: string;
try {
  privateKeyPem = readFileSync(privateKeyPath, "utf8");
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") fail("the private key is not an Ed25519 key");
  const spkiDer = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  keyId = keyIdForSpkiDer(spkiDer);
} catch (e) {
  if (e instanceof Error && /^sign-approval:/.test(e.message)) throw e;
  fail("the private key could not be parsed as a PEM Ed25519 private key");
}

// Trusted config: committed active documents by default; schemas always come
// from the repository contracts directory.
const contracts = ContractRegistry.load(join(REPO_ROOT, "contracts"));
const configDir = args.has("--trusted-config-dir") ? resolve(args.get("--trusted-config-dir")!) : join(REPO_ROOT, "contracts");
const config = loadTrustedAuthorityConfig(
  join(configDir, "human-gate-policy.active.json"),
  join(configDir, "authority-registry.active.json"),
  contracts
);
if (!config.ok) fail(`trusted config rejected: ${config.error.message ?? JSON.stringify(config.error)}`);
const { policy, authorities, gateRequirements } = config.value;

const authority = authorities.get(keyId);
if (!authority) {
  fail(`the derived key_id '${keyId}' is not enrolled in the active authority registry; signing is refused`);
}
const nowMs = Date.now();
if (authority.status !== "active") fail(`key '${keyId}' is revoked`);
if (Date.parse(authority.valid_from) > nowMs) fail(`key '${keyId}' is not yet valid`);
if (authority.valid_until !== null && Date.parse(authority.valid_until) <= nowMs) {
  fail(`key '${keyId}' is past its validity window; rotate before signing`);
}

const gate = args.get("--gate")!;
const requirement = gateRequirements.get(gate);
const allowedGates = (policy["allowed_gates"] ?? []) as string[];
if (!allowedGates.includes(gate) || !requirement) fail(`gate '${gate}' is not allowed by the active policy`);
if (requirement.independent_review_required) {
  fail(
    `gate '${gate}' requires a formally named independent reviewer; the self-signing flow refuses independent-review gates (DEC-0008)`
  );
}
if (!authority.roles.includes(requirement.required_role)) {
  fail(`gate '${gate}' requires role '${requirement.required_role}', which the enrolled authority does not hold`);
}
const maxTtl = Number(policy["max_approval_ttl_seconds"]);
if (ttlSeconds > maxTtl) fail(`--ttl-seconds ${ttlSeconds} exceeds the policy maximum of ${maxTtl}`);

// The signed digest binds one exact artifact state, loaded from its exact
// canonical address (the store validates content and address integrity).
const workspace = args.get("--workspace")!;
const brandRef = args.get("--brand-ref")!;
const targetType = args.get("--target-type")!;
const targetRef = args.get("--target-ref")!;
const store = new FileArtifactStore(resolve(args.get("--artifacts-root")!), contracts);
const target = store.get(workspace, brandRef, targetType, targetRef);
if (!target.ok) {
  fail(`target artifact '${targetRef}' could not be loaded: ${target.error.message ?? JSON.stringify(target.error)}`);
}

const nonce = randomBytes(16).toString("hex");
const issuedAt = new Date(nowMs).toISOString().replace(/\.\d{3}Z$/, "Z");
const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
const payload: Record<string, unknown> = {
  payload_type: APPROVAL_PAYLOAD_TYPE,
  payload_version: APPROVAL_PAYLOAD_VERSION,
  domain: APPROVAL_DOMAIN,
  approval_id: `appr-${nonce.slice(0, 16)}`,
  workspace,
  brand_ref: brandRef,
  target_artifact_type: targetType,
  target_artifact_ref: targetRef,
  target_artifact_digest: contentDigest(target.value),
  gate,
  verdict,
  reason,
  requester_id: requesterId,
  approver_id: authority.subject_id,
  role: requirement.required_role,
  self_review: requesterId === authority.subject_id,
  key_id: keyId,
  policy_ref: String(policy["policy_id"]),
  policy_version: policy["policy_version"],
  nonce,
  issued_at: issuedAt,
  expires_at: expiresAt,
};

const evidence: Record<string, unknown> = {
  schema_version: String(policy["schema_version"]),
  evidence_id: `apev-${nonce.slice(16)}`,
  payload,
  payload_digest: approvalPayloadDigest(payload),
  signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(payload, privateKeyPem) },
};

// The evidence must be contract-valid (schema + semantic layers) before it is
// ever written; an invalid construction is a bug, not an output.
const validated = contracts.validate("approval-evidence", evidence);
if (!validated.ok) {
  const detail = "issues" in validated.error ? validated.error.issues : validated.error.message;
  fail(`constructed evidence failed contract validation: ${JSON.stringify(detail)}`);
}

writeFileSync(evidenceOut, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });

console.log(`evidence_id: ${String(evidence["evidence_id"])}`);
console.log(`key_id: ${keyId}`);
console.log(`approver (derived from registry): ${authority.subject_id}`);
console.log(`gate: ${gate} · verdict: ${verdict} · self_review: ${String(payload["self_review"])}`);
console.log(`target: ${workspace}/${brandRef}/${targetType}/${targetRef}`);
console.log(`target_digest: ${String(payload["target_artifact_digest"])}`);
console.log(`valid: ${issuedAt} -> ${expiresAt}`);
console.log(`evidence written to: ${evidenceOut}`);
console.log("");
console.log("This evidence authorizes nothing by itself: it must verify and consume");
console.log("against the verifier's trusted policy, registry, target store, and");
console.log("receipt store, and it applies no business action.");
