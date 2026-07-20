// Operator CLI that executes the ONE authorized Anthropic smoke call (DEC-0020,
// Phase 1C.2). This is the only entry point in the repository that reaches the
// production fetch transport with a real credential, and it does so exactly
// once, only when a valid Product Owner signature over the exact stored request
// verifies and is consumed.
//
// The heavy lifting lives in tested units: verification/consumption in
// ApprovalLiveCallAuthorization, budgeting in FileBudgetLedger, the single
// bounded network call in FetchAnthropicTransport, the credential boundary in
// KeychainSecretResolver, and the fail-closed gate order in SmokeCallService.
// This CLI only wires them and enforces the operational invariants:
//   - the stored request is loaded from its canonical address and its content
//     digest is the exact target the signature must bind;
//   - the synthetic fixture supplied must match the content digest bound in the
//     request, so the prompt sent is the prompt that was signed;
//   - exactly one transport call may occur (asserted after the run);
//   - the sanitized provider-smoke-result is contract-validated and written to
//     an operator-provided path outside the repository (exclusive create);
//   - no prompt, response body, header, or credential is ever printed.
import { existsSync, lstatSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { FileArtifactStore } from "../kernel/artifact-store.js";
import { contentDigest } from "../kernel/canonical-json.js";
import { ContractRegistry } from "../kernel/contract-registry.js";
import { loadTrustedAuthorityConfig } from "../authority/authority.js";
import { FileApprovalReceiptStore } from "../authority/receipt-store.js";
import { FileBudgetLedger } from "../gateway/adapters/budget-ledger.js";
import { ApprovalLiveCallAuthorization } from "../gateway/adapters/live-authorization.js";
import { KeychainSecretResolver } from "../gateway/adapters/secret.js";
import { FetchAnthropicTransport } from "../gateway/adapters/fetch-transport.js";
import { loadProviderPolicy } from "../gateway/adapters/provider-policy.js";
import { providerOutputSchema } from "../smoke/live-call-request.js";
import { SmokeCallService } from "../smoke/smoke-call.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fail(message: string): never {
  console.error(`run-smoke-call: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Map<string, string> {
  const known = new Set([
    "--contracts-dir",
    "--artifacts-root",
    "--workspace",
    "--brand-ref",
    "--request-id",
    "--fixture",
    "--evidence",
    "--trusted-config-dir",
    "--receipts-root",
    "--ledger-root",
    "--result-out",
    "--now",
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

/** Exclusive-create output target outside the repository: no symlink, no overwrite. */
function checkResultOut(path: string): string {
  const abs = resolve(path);
  let targetStat = null;
  try {
    targetStat = lstatSync(abs);
  } catch {
    // absent — the required state
  }
  if (targetStat?.isSymbolicLink()) fail(`refusing '${abs}': the result target is a symlink`);
  if (targetStat) fail(`refusing to overwrite existing result at '${abs}'`);
  const parent = dirname(abs);
  if (!existsSync(parent)) fail(`result directory '${parent}' does not exist (create it explicitly first)`);
  const realParent = realpathSync(parent);
  const realRepo = realpathSync(REPO_ROOT);
  if (realParent === realRepo || realParent.startsWith(realRepo + sep)) {
    fail(`refusing to write the raw run result inside the repository ('${abs}'); it belongs in an operational store`);
  }
  return abs;
}

const args = parseArgs(process.argv.slice(2));
for (const required of [
  "--artifacts-root",
  "--workspace",
  "--brand-ref",
  "--request-id",
  "--evidence",
  "--receipts-root",
  "--ledger-root",
  "--result-out",
]) {
  if (!args.has(required)) fail(`missing required flag ${required}`);
}

const contractsDir = args.has("--contracts-dir") ? resolve(args.get("--contracts-dir")!) : join(REPO_ROOT, "contracts");
const configDir = args.has("--trusted-config-dir") ? resolve(args.get("--trusted-config-dir")!) : contractsDir;
const artifactsRoot = resolve(args.get("--artifacts-root")!);
const workspace = args.get("--workspace")!;
const brandRef = args.get("--brand-ref")!;
const requestId = args.get("--request-id")!;
const evidencePath = resolve(args.get("--evidence")!);
const receiptsRoot = resolve(args.get("--receipts-root")!);
const ledgerRoot = resolve(args.get("--ledger-root")!);
const resultOut = checkResultOut(args.get("--result-out")!);
const clock: () => string = args.has("--now") ? () => args.get("--now")! : () => new Date().toISOString();

const registry = ContractRegistry.load(contractsDir);
const policy = loadProviderPolicy(contractsDir, registry, clock);
if (!policy.ok) fail(`provider policy did not load: ${policy.error.message ?? JSON.stringify(policy.error)}`);

// The stored request is the exact signing target: load it and take its content
// digest — the signature evidence must bind precisely this digest.
const store = new FileArtifactStore(artifactsRoot, registry);
const stored = store.get(workspace, brandRef, "live-provider-call-request", requestId);
if (!stored.ok) fail(`stored request could not be loaded: ${stored.error.message ?? JSON.stringify(stored.error)}`);
const request = stored.value;
const expectedTargetDigest = contentDigest(request);

// The fixture supplied must match the content digest bound in the request, so
// the prompt actually sent equals the prompt that was authorized and signed.
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
const fixtureDigest = contentDigest(fixture);
const boundFixtures = (request["synthetic_fixture_refs"] ?? []) as Array<Record<string, unknown>>;
if (!boundFixtures.some((f) => f["content_digest"] === fixtureDigest)) {
  fail("the supplied fixture's content digest is not bound in the signed request; refusing to send an unauthorized prompt");
}
const scenarioPrompt = String(fixture["prompt"]);
if (!scenarioPrompt) fail("the fixture carries no prompt");

// Signed approval evidence (public; carries no secret).
let evidence: unknown;
try {
  evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
} catch {
  fail(`evidence '${evidencePath}' is not readable JSON`);
}

const config = loadTrustedAuthorityConfig(
  join(configDir, "human-gate-policy.active.json"),
  join(configDir, "authority-registry.active.json"),
  registry
);
if (!config.ok) fail(`trusted config rejected: ${config.error.message ?? JSON.stringify(config.error)}`);

const liveAuthorization = new ApprovalLiveCallAuthorization(
  evidence,
  {
    contracts: registry,
    artifactStore: store,
    receiptStore: new FileApprovalReceiptStore(receiptsRoot, registry),
    config: config.value,
    clock,
  },
  expectedTargetDigest
);

// Pre-flight the authorization so a bad signature stops here, before any
// network resolution, with a clear message (the service also re-checks).
const preCheck = liveAuthorization.check();
if (!preCheck.ok) {
  fail(`live-call authorization did not verify against the stored request digest: ${preCheck.error.message ?? JSON.stringify(preCheck.error)}`);
}

const ledger = new FileBudgetLedger(ledgerRoot, {
  perRequestCents: 25,
  perRunCents: 2500,
  perDayCents: 4000,
  perMonthCents: 6000,
});

const echoContract = JSON.parse(
  readFileSync(join(contractsDir, "provider-smoke-echo.schema.json"), "utf8")
) as Record<string, unknown>;

const service = new SmokeCallService();
const outcome = await service.run({
  request,
  policy: policy.value,
  liveAuthorization,
  ledger,
  secretResolver: new KeychainSecretResolver(policy.value.keychainService, policy.value.keychainAccount),
  transport: new FetchAnthropicTransport(),
  clock,
  scenarioPrompt,
  outputSchema: providerOutputSchema(echoContract),
  validateOutput: (a) => registry.validate("provider-smoke-echo", a),
});

// Structural invariant: never more than one transport call.
if (service.transportCallCount > 1) fail(`invariant violated: ${service.transportCallCount} transport calls occurred`);
if (!outcome.ok) fail(`smoke run returned no result artifact: ${outcome.error.message ?? JSON.stringify(outcome.error)}`);

const result = outcome.value.result;
const resultValid = registry.validate("provider-smoke-result", result);
if (!resultValid.ok) {
  const detail = "issues" in resultValid.error ? resultValid.error.issues : resultValid.error.message;
  fail(`the run produced a non-contract-valid result: ${JSON.stringify(detail)}`);
}

writeFileSync(resultOut, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });

// Sanitized console summary — identifiers, counts, and USD only.
console.log(`status:              ${String(result["status"])}`);
console.log(`transport calls:     ${service.transportCallCount}`);
console.log(`failure_reason:      ${String(result["failure_reason"])}`);
console.log(`requested_model:     ${String(result["requested_model"])}`);
console.log(`returned_model:      ${String(result["returned_model"])}`);
console.log(`provider_request_id: ${String(result["provider_request_id"])}`);
console.log(`input_tokens:        ${String(result["input_tokens"])}`);
console.log(`output_tokens:       ${String(result["output_tokens"])}`);
console.log(`reserved_usd:        ${String(result["reserved_usd"])}`);
console.log(`settled_usd:         ${String(result["settled_usd"])}`);
console.log(`output_artifact:     ${String(result["output_artifact_digest"])}`);
console.log(`receipt:             ${String(outcome.value.receiptId)}`);
console.log(`result written to:   ${resultOut}`);
