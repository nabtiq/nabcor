// Offline operator CLI that builds and persists the immutable
// live-provider-call-request that the Product Owner then signs (DEC-0020,
// Phase 1C.2). It is the preparation step BEFORE signing and BEFORE any
// provider call: it assembles the one-shot request from the trusted active
// provider policy and a synthetic fixture, binds the exact candidate and
// gateway-policy digests, computes the self-consistent request_digest, stores
// the artifact at its canonical address, and prints the content digest that
// becomes the signing target.
//
// Boundary rules, all fail-closed:
//   - Every ratified/disabled value is fixed by buildLiveCallRequest; the
//     operator supplies only identifiers, the validity window, the token
//     ceilings (bounded by the contract), and free-text purpose. No operator
//     input can widen the authorization: the model, provider, data class,
//     USD ceiling, attempt count, disabled surfaces, endpoint, and API version
//     are constants bound by the contract's semantic layer.
//   - The request is validated against the live-provider-call-request contract
//     (schema + semantic layers, including request-digest consistency) before
//     it is ever written; an invalid construction is a bug, not an output.
//   - This CLI touches no credential, opens no network connection, and applies
//     no business action. It only writes a synthetic, public authorization
//     artifact to the operational store.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FileArtifactStore } from "../kernel/artifact-store.js";
import { contentDigest } from "../kernel/canonical-json.js";
import { ContractRegistry } from "../kernel/contract-registry.js";
import { loadProviderPolicy } from "../gateway/adapters/provider-policy.js";
import { buildLiveCallRequest } from "../smoke/live-call-request.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fail(message: string): never {
  console.error(`prepare-smoke-request: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Map<string, string> {
  const known = new Set([
    "--contracts-dir",
    "--artifacts-root",
    "--workspace",
    "--brand-ref",
    "--artifact-id",
    "--fixture",
    "--created-at",
    "--valid-from",
    "--valid-until",
    "--max-input-tokens",
    "--max-output-tokens",
    "--purpose",
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

function isoOrFail(label: string, value: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail(`${label} '${value}' is not a valid ISO-8601 timestamp`);
  return value;
}

const args = parseArgs(process.argv.slice(2));
for (const required of [
  "--artifacts-root",
  "--workspace",
  "--brand-ref",
  "--artifact-id",
  "--created-at",
  "--valid-from",
  "--valid-until",
]) {
  if (!args.has(required)) fail(`missing required flag ${required}`);
}

const contractsDir = args.has("--contracts-dir") ? resolve(args.get("--contracts-dir")!) : join(REPO_ROOT, "contracts");
const artifactsRoot = resolve(args.get("--artifacts-root")!);
if (!existsSync(artifactsRoot)) fail(`artifacts root '${artifactsRoot}' does not exist (create it explicitly first)`);
const workspace = args.get("--workspace")!;
const brandRef = args.get("--brand-ref")!;
const artifactId = args.get("--artifact-id")!;
const createdAt = isoOrFail("--created-at", args.get("--created-at")!);
const validFrom = isoOrFail("--valid-from", args.get("--valid-from")!);
const validUntil = isoOrFail("--valid-until", args.get("--valid-until")!);
if (Date.parse(validUntil) <= Date.parse(validFrom)) fail("--valid-until must be strictly after --valid-from");

const maxInputTokens = args.has("--max-input-tokens") ? Number(args.get("--max-input-tokens")) : 512;
const maxOutputTokens = args.has("--max-output-tokens") ? Number(args.get("--max-output-tokens")) : 64;
if (!Number.isInteger(maxInputTokens) || maxInputTokens < 1) fail("--max-input-tokens must be a positive integer");
if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1) fail("--max-output-tokens must be a positive integer");

const fixturePath = args.has("--fixture")
  ? resolve(args.get("--fixture")!)
  : join(REPO_ROOT, "fixtures", "synthetic", "smoke-prompt.json");
if (!existsSync(fixturePath)) fail(`fixture '${fixturePath}' does not exist`);
let fixture: Record<string, unknown>;
try {
  fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
} catch {
  fail(`fixture '${fixturePath}' is not valid JSON`);
}
if (fixture["data_classification"] !== "synthetic") fail("the fixture must be data_classification 'synthetic'");
const fixtureId = String(fixture["fixture_id"]);
if (!fixtureId) fail("the fixture must carry a fixture_id");
const fixtureDigest = contentDigest(fixture);

const purpose = args.has("--purpose")
  ? args.get("--purpose")!
  : "One synthetic Anthropic connectivity smoke request (DEC-0020).";

const registry = ContractRegistry.load(contractsDir);
const policy = loadProviderPolicy(contractsDir, registry, () => createdAt);
if (!policy.ok) fail(`provider policy did not load: ${policy.error.message ?? JSON.stringify(policy.error)}`);

const request = buildLiveCallRequest({
  artifactId,
  workspace,
  brandRef,
  createdAt,
  policy: policy.value,
  fixtures: [{ fixtureId, contentDigest: fixtureDigest }],
  expectedOutputContract: "provider-smoke-echo",
  maxInputTokens,
  maxOutputTokens,
  validFrom,
  validUntil,
  purpose,
});

// The request must be contract-valid (schema + semantic layers, including
// request-digest consistency) before it is written.
const validated = registry.validate("live-provider-call-request", request);
if (!validated.ok) {
  const detail = "issues" in validated.error ? validated.error.issues : validated.error.message;
  fail(`constructed request failed contract validation: ${JSON.stringify(detail)}`);
}

const store = new FileArtifactStore(artifactsRoot, registry);
const put = store.put(workspace, brandRef, "live-provider-call-request", request);
if (!put.ok) fail(`request could not be stored: ${put.error.message ?? JSON.stringify(put.error)}`);
const readBack = store.get(workspace, brandRef, "live-provider-call-request", artifactId);
if (!readBack.ok) fail(`stored request could not be read back: ${readBack.error.message ?? JSON.stringify(readBack.error)}`);
const targetDigest = contentDigest(readBack.value);

console.log(`artifact_id:      ${artifactId}`);
console.log(`store address:    ${workspace}/${brandRef}/live-provider-call-request/${artifactId}`);
console.log(`artifacts-root:   ${artifactsRoot}`);
console.log(`provider/model:   anthropic / claude-haiku-4-5-20251001`);
console.log(`data class:       synthetic`);
console.log(`fixture:          ${fixtureId} (${fixtureDigest})`);
console.log(`token ceilings:   max_input ${maxInputTokens}, max_output ${maxOutputTokens}`);
console.log(`USD ceiling:      0.25 (ceremony) under the standing 1.00 per-request ceiling`);
console.log(`validity window:  ${validFrom} -> ${validUntil}`);
console.log(`candidate digest: ${policy.value.candidateContentDigest}`);
console.log(`request_digest:   ${String(request["request_digest"])}`);
console.log(`content digest:   ${targetDigest}   <-- the signing target`);
console.log("");
console.log("This artifact authorizes nothing by itself. It must be signed under the");
console.log("live-provider-call-approval gate, and the resulting evidence must verify");
console.log("and be consumed exactly once before any provider request is made.");
