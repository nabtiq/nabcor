// Safe operator CLI for the deterministic truth and fact-resolution
// workflow (DEC-0017).
//
//   node dist/src/cli/nabcor.js <command> [options]
//
// This is an ORCHESTRATION boundary over the canonical services — it
// implements no truth analysis, lineage, signing, verification, or
// resolution logic of its own, and every artifact it touches passes
// through the contract registry and the existing store boundaries.
//
// Safety rules (DEC-0017), all fail-closed:
//   - status / inspect / help / --dry-run mutate NOTHING.
//   - Every mutating command requires an explicit --artifacts-root (no
//     environment-variable or hidden default root), explicit namespace,
//     and a --confirm-digest bound to the exact state being acted on. The
//     confirmation digest is an operator-error guard, not authentication:
//     authentication remains the signed approval evidence (DEC-0014).
//   - No command reads a private key. Signing is exclusively the separate
//     sign-approval CLI, personally invoked by the key owner (DEC-0015);
//     `resolution prepare` prints a command template with a placeholder.
//   - `resolution apply` accepts PUBLIC approval evidence only.
//   - Losers are always re-derived by the preparation service; the CLI
//     never accepts contradiction membership from the operator (DEC-0016).
//   - Expected failures are typed, stack-trace-free, and exit under the
//     documented code map below. --json output is one stable object with
//     no ANSI codes and no claim/source content.
//
// Exit codes (documented, stable):
//   0 success (including idempotent completed replay)
//   2 usage error (unknown command, missing/duplicate/invalid options,
//     malformed input file)
//   3 reference or validation failure (not-found, contract-invalid,
//     cross-namespace, lineage, unsafe identifier)
//   4 stale state (stale-analysis, snapshot-unstable)
//   5 authorization denial (unauthorized, frozen gate, bad trust config)
//   6 authentic human rejection (resolution-rejected)
//   7 conflict (replay, immutable-overwrite, resolution-conflict)
//   8 confirmation-digest mismatch (operator-error guard)
//   9 I/O or unexpected internal error
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileApprovalReceiptStore } from "../authority/receipt-store.js";
import { loadTrustedAuthorityConfig } from "../authority/authority.js";
import {
  approvalPayloadDigest,
  ed25519PublicKeyFromSpkiB64,
  receiptIdFor,
  verifyApprovalSignature,
} from "../authority/approval-payload.js";
import { FileArtifactStore } from "../kernel/artifact-store.js";
import { captureClaimSnapshot } from "../kernel/claim-snapshot.js";
import { contentDigest } from "../kernel/canonical-json.js";
import { ContractRegistry } from "../kernel/contract-registry.js";
import { type KernelFailure, type Result } from "../kernel/result.js";
import { applyFactResolution } from "../resolve/apply-resolution.js";
import { prepareFactResolutionDecision } from "../resolve/prepare-decision.js";
import { applicationIdFor, contradictionFingerprint } from "../resolve/resolution-ids.js";
import { analyzeStructuredTruth } from "../understand/analyze-structured-truth.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI_VERSION = "nabcor-cli-1.0.0";

// ---------------------------------------------------------------------------
// Exit-code map: every expected typed failure lands in exactly one bucket.
// ---------------------------------------------------------------------------
const EXIT = {
  ok: 0,
  usage: 2,
  reference: 3,
  stale: 4,
  unauthorized: 5,
  rejected: 6,
  conflict: 7,
  confirmation: 8,
  internal: 9,
} as const;

function exitCodeFor(kind: KernelFailure["kind"]): number {
  switch (kind) {
    case "stale-analysis":
    case "snapshot-unstable":
      return EXIT.stale;
    case "approval-unauthorized":
    case "authority-config-invalid":
    case "independent-review-frozen":
      return EXIT.unauthorized;
    case "resolution-rejected":
      return EXIT.rejected;
    case "resolution-conflict":
    case "approval-replay":
    case "artifact-exists":
      return EXIT.conflict;
    case "io-error":
      return EXIT.internal;
    default:
      return EXIT.reference;
  }
}

// Credential-shaped redaction for anything that reaches an output channel:
// PEM blocks and PEM armor lines never leave the process, whatever produced
// them. Digest strings (sha256:<hex>) are identifiers, not credentials, and
// pass through untouched.
function redact(text: string): string {
  return text
    .replace(/-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g, "[redacted]")
    .replace(/^.*(PRIVATE KEY|BEGIN OPENSSH).*$/gm, "[redacted]");
}

interface Output {
  json: boolean;
  command: string;
}

/** Recursive redaction over every string value, keeping JSON structure valid. */
function deepRedact(value: unknown): unknown {
  if (typeof value === "string") {
    const clean = redact(value);
    return clean === value ? value : clean;
  }
  if (Array.isArray(value)) return value.map(deepRedact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepRedact(v)])
    );
  }
  return value;
}

function emit(output: Output, human: string[], data: Record<string, unknown>): void {
  if (output.json) {
    console.log(
      JSON.stringify(deepRedact({ ok: true, command: output.command, ...data }), null, 2)
    );
  } else {
    for (const line of human) console.log(redact(line));
  }
}

class CliFailure extends Error {
  constructor(
    readonly exitCode: number,
    readonly kind: string,
    message: string
  ) {
    super(message);
  }
}

function fail(exitCode: number, kind: string, message: string): never {
  throw new CliFailure(exitCode, kind, message);
}

/** Unwrap a service result or convert its typed failure into a CLI failure. */
function must<T>(result: Result<T>): T {
  if (!result.ok) {
    fail(exitCodeFor(result.error.kind), result.error.kind, result.error.message);
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// Argument parsing: explicit flags only. No environment variables, no
// defaults for roots or namespaces, no interactive prompts.
// ---------------------------------------------------------------------------
const BOOLEAN_FLAGS = new Set(["--json", "--dry-run"]);

interface ParsedArgs {
  flags: Map<string, string>;
  booleans: Set<string>;
}

function parseFlags(argv: string[], known: Set<string>): ParsedArgs {
  const flags = new Map<string, string>();
  const booleans = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (!flag.startsWith("--")) fail(EXIT.usage, "usage", `unexpected argument '${flag}'`);
    if (!known.has(flag)) fail(EXIT.usage, "usage", `unknown option '${flag}' (see 'nabcor help')`);
    if (BOOLEAN_FLAGS.has(flag)) {
      if (booleans.has(flag)) fail(EXIT.usage, "usage", `option '${flag}' given twice`);
      booleans.add(flag);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(EXIT.usage, "usage", `option '${flag}' requires a value`);
    }
    if (flags.has(flag)) fail(EXIT.usage, "usage", `option '${flag}' given twice`);
    flags.set(flag, value);
    i++;
  }
  return { flags, booleans };
}

function required(args: ParsedArgs, flag: string): string {
  const value = args.flags.get(flag);
  if (value === undefined) fail(EXIT.usage, "usage", `missing required option ${flag}`);
  return value;
}

function requireConfirmDigest(args: ParsedArgs, expected: string, boundTo: string): void {
  const supplied = required(args, "--confirm-digest");
  if (supplied !== expected) {
    fail(
      EXIT.confirmation,
      "confirmation-mismatch",
      `--confirm-digest does not match the ${boundTo} (expected ${expected}); inspect the current state and confirm the exact operation you reviewed`
    );
  }
}

function contractsRegistry(): ContractRegistry {
  return ContractRegistry.load(join(REPO_ROOT, "contracts"));
}

function storeFor(args: ParsedArgs, registry: ContractRegistry): FileArtifactStore {
  return new FileArtifactStore(resolve(required(args, "--artifacts-root")), registry);
}

function readJsonFile(path: string, label: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(resolve(path), "utf8");
  } catch {
    fail(EXIT.usage, "usage", `${label} '${path}' does not exist or is unreadable`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    fail(EXIT.usage, "usage", `${label} '${path}' is not valid JSON`);
  }
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
function sectionOf(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const rest = markdown.slice(start + heading.length + 3);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

function cmdStatus(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "status" };
  const gateway = readJsonFile(join(REPO_ROOT, "contracts", "gateway-policy.active.json"), "active gateway policy") as Record<string, unknown>;
  const operationalState = readJsonFile(
    join(REPO_ROOT, "contracts", "provider-operational-state.active.json"),
    "provider operational state"
  ) as Record<string, unknown>;
  const policy = readJsonFile(join(REPO_ROOT, "contracts", "human-gate-policy.active.json"), "active human-gate policy") as Record<string, unknown>;
  const authorityRegistry = readJsonFile(join(REPO_ROOT, "contracts", "authority-registry.active.json"), "active authority registry") as Record<string, unknown>;
  const nowMd = readFileSync(join(REPO_ROOT, "brain", "current", "NOW.md"), "utf8");

  const phase = sectionOf(nowMd, "Current phase").split("\n\n")[0]?.replace(/\s+/g, " ") ?? "";
  const blockers = sectionOf(nowMd, "Blocked / not implemented")
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());

  // Public authority metadata only: never the SPKI bytes, never key material.
  const authorities = ((authorityRegistry["authorities"] ?? []) as Record<string, unknown>[]).map(
    (a) => ({
      key_id: String(a["key_id"]),
      subject_id: String(a["subject_id"]),
      roles: a["roles"],
      status: String(a["status"]),
      valid_from: String(a["valid_from"]),
      valid_until: a["valid_until"] === null ? null : String(a["valid_until"]),
    })
  );
  const gateRequirements = (policy["gate_requirements"] ?? {}) as Record<
    string,
    { required_role: string; independent_review_required: boolean }
  >;
  const gates = Object.entries(gateRequirements).map(([gate, req]) => ({
    gate,
    required_role: req.required_role,
    independent_review_required: req.independent_review_required,
    state: req.independent_review_required
      ? "frozen (no independent reviewer is named or enrolled; a self-signature can never satisfy it)"
      : "available",
  }));

  const data = {
    cli_version: CLI_VERSION,
    schema_version: String(policy["schema_version"]),
    gateway_policy: {
      policy_id: String(gateway["policy_id"]),
      decision_ref: String(gateway["decision_ref"]),
      allowed_adapters: gateway["allowed_adapters"],
      allowed_data_classes: gateway["allowed_data_classes"],
      model_allowlist: gateway["model_allowlist"],
      external_network_allowed: gateway["external_network_allowed"],
      real_client_data_allowed: gateway["real_client_data_allowed"],
      api_credentials_permitted: gateway["api_credentials_permitted"],
      max_external_spend_usd_per_request: gateway["max_external_spend_usd_per_request"],
      max_external_spend_usd_per_run: gateway["max_external_spend_usd_per_run"],
      max_external_spend_usd_per_day: gateway["max_external_spend_usd_per_day"],
      max_external_spend_usd_per_month: gateway["max_external_spend_usd_per_month"],
      provider_policy_candidate_ref: gateway["provider_policy_candidate_ref"],
      provider_policy_candidate_digest: gateway["provider_policy_candidate_digest"],
    },
    provider_operational_state: {
      operational_state: String(operationalState["operational_state"]),
      live_invocation_enabled: operationalState["live_invocation_enabled"],
      credential_provisioned: operationalState["credential_provisioned"],
      console_spend_cap_configured: operationalState["console_spend_cap_configured"],
      smoke_call_completed: operationalState["smoke_call_completed"],
      exp_0001_executed: operationalState["exp_0001_executed"],
    },
    // Derived from the committed operational-state document so this line can
    // never drift from the machine-enforced state (RISK-LIVE-01).
    provider_state: `Anthropic implementation configured (${String(operationalState["decision_ref"])}); state ${String(operationalState["operational_state"])} — live invocation ${operationalState["live_invocation_enabled"] === true ? "ENABLED" : "DISABLED"}, credential ${operationalState["credential_provisioned"] === true ? "provisioned" : "not provisioned (no credential exists in NABCor)"}, console cap ${operationalState["console_spend_cap_configured"] === true ? "configured" : "not configured by this repository"}, smoke call ${operationalState["smoke_call_completed"] === true ? "completed" : "not completed"}, EXP-0001 ${operationalState["exp_0001_executed"] === true ? "executed" : "unexecuted"}; synthetic data only, no provider call or spend has occurred`,
    human_gate_policy: {
      policy_id: String(policy["policy_id"]),
      policy_version: policy["policy_version"],
      decision_ref: String(policy["decision_ref"]),
      registry_ref: String(policy["authority_registry_ref"]),
      registry_version: policy["authority_registry_version"],
      independent_reviewer_named: policy["independent_reviewer_named"],
    },
    enrolled_authorities: authorities,
    gates,
    current_phase: phase,
    documented_blockers: blockers,
  };

  const human = [
    `nabcor operator CLI ${CLI_VERSION}`,
    ``,
    `Contracts schema version: ${data.schema_version}`,
    `Provider state: ${data.provider_state}`,
    `Gateway policy: ${String(gateway["policy_id"])} (${String(gateway["decision_ref"])}) — adapters ${JSON.stringify(gateway["allowed_adapters"])}, data classes ${JSON.stringify(gateway["allowed_data_classes"])}, network ${String(gateway["external_network_allowed"])} (adapter transport only), credentials ${String(gateway["api_credentials_permitted"])} (secret boundary only; none provisioned), spend ceilings ${String(gateway["max_external_spend_usd_per_request"])}/${String(gateway["max_external_spend_usd_per_run"])}/${String(gateway["max_external_spend_usd_per_day"])}/${String(gateway["max_external_spend_usd_per_month"])} USD (request/run/day/month)`,
    `Provider operational state: ${String(operationalState["operational_state"])} — live invocation ${operationalState["live_invocation_enabled"] === true ? "ENABLED" : "disabled"}, credential provisioned ${String(operationalState["credential_provisioned"])}, console cap configured ${String(operationalState["console_spend_cap_configured"])}, smoke call completed ${String(operationalState["smoke_call_completed"])}, EXP-0001 executed ${String(operationalState["exp_0001_executed"])}`,
    `Human-gate policy: ${String(policy["policy_id"])} v${String(policy["policy_version"])} pins registry ${String(policy["authority_registry_ref"])} v${String(policy["authority_registry_version"])} (${String(policy["decision_ref"])})`,
    `Enrolled authorities (public metadata only):`,
    ...authorities.map(
      (a) =>
        `  - ${a.key_id} subject=${a.subject_id} roles=${JSON.stringify(a.roles)} status=${a.status} valid ${a.valid_from} -> ${a.valid_until ?? "open"}`
    ),
    `Gates:`,
    ...gates.map((g) => `  - ${g.gate} (role ${g.required_role}): ${g.state}`),
    ``,
    `Current phase: ${phase}`,
    `Documented blockers:`,
    ...blockers.map((b) => `  - ${b}`),
  ];
  emit(output, human, data);
}

// ---------------------------------------------------------------------------
// truth snapshot / analyze / inspect
// ---------------------------------------------------------------------------
function cmdTruthSnapshot(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "truth snapshot" };
  const dryRun = args.booleans.has("--dry-run");
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const snapshotId = dryRun ? (args.flags.get("--snapshot-id") ?? "dry-run-preview") : required(args, "--snapshot-id");

  const captured = must(
    captureClaimSnapshot(
      { artifactId: snapshotId, workspace, brandRef, createdAt: nowIso() },
      store,
      registry
    )
  );
  const claimSetDigest = String(captured.snapshot["claim_set_digest"]);
  if (dryRun) {
    emit(
      output,
      [
        `DRY RUN — nothing was persisted.`,
        `Namespace ${workspace}/${brandRef}: ${captured.claims.length} canonical claim(s).`,
        `Current claim-set digest: ${claimSetDigest}`,
        `To persist: re-run without --dry-run, with --snapshot-id <id> and --confirm-digest ${claimSetDigest}`,
      ],
      { dry_run: true, workspace, brand_ref: brandRef, claim_count: captured.claims.length, claim_set_digest: claimSetDigest }
    );
    return;
  }
  requireConfirmDigest(args, claimSetDigest, "current namespace claim-set digest");
  must(store.put(workspace, brandRef, "claim-snapshot", captured.snapshot));
  const stored = must(store.get(workspace, brandRef, "claim-snapshot", snapshotId));
  emit(
    output,
    [
      `Snapshot persisted: claim-snapshot/${snapshotId} (${workspace}/${brandRef})`,
      `Claims: ${captured.claims.length}`,
      `Claim-set digest: ${claimSetDigest}`,
      `Snapshot content digest: ${contentDigest(stored)}`,
    ],
    {
      dry_run: false,
      workspace,
      brand_ref: brandRef,
      snapshot_ref: snapshotId,
      claim_count: captured.claims.length,
      claim_set_digest: claimSetDigest,
      snapshot_digest: contentDigest(stored),
    }
  );
}

function cmdTruthAnalyze(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "truth analyze" };
  const dryRun = args.booleans.has("--dry-run");
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const profileRef = required(args, "--profile-ref");
  const snapshotId = dryRun ? (args.flags.get("--snapshot-id") ?? "dry-run-snapshot") : required(args, "--snapshot-id");
  const analysisId = dryRun ? (args.flags.get("--analysis-id") ?? "dry-run-analysis") : required(args, "--analysis-id");

  const profile = must(store.get(workspace, brandRef, "truth-profile", profileRef));
  // Clear guidance instead of a kernel lineage message: snapshots and
  // analyses are immutable, and analyze always captures a FRESH snapshot,
  // so an already-used id needs a new one, not reuse.
  if (!dryRun) {
    for (const [type, id] of [
      ["claim-snapshot", snapshotId],
      ["truth-analysis", analysisId],
    ] as const) {
      if (store.get(workspace, brandRef, type, id).ok) {
        fail(
          EXIT.conflict,
          "artifact-exists",
          `${type} '${id}' already exists in ${workspace}/${brandRef}; artifacts are immutable and 'truth analyze' always captures a fresh snapshot — choose new --snapshot-id/--analysis-id values`
        );
      }
    }
  }
  const analyzed = must(
    analyzeStructuredTruth(
      {
        artifactId: analysisId,
        snapshotArtifactId: snapshotId,
        workspace,
        brandRef,
        createdAt: nowIso(),
        truthProfile: profile,
      },
      store,
      registry
    )
  );
  const claimSetDigest = String(analyzed.snapshot["claim_set_digest"]);
  const contradictions = (analyzed.analysis["open_contradictions"] ?? []) as {
    fact_key: string;
    claim_refs: string[];
    distinct_values: (string | number | boolean)[];
    blocking_publication: boolean;
  }[];
  const gaps = (analyzed.analysis["gaps"] ?? []) as { fact_key: string; kind: string; blocking: boolean }[];
  const summary = {
    workspace,
    brand_ref: brandRef,
    profile_ref: profileRef,
    claim_set_digest: claimSetDigest,
    analyzed_claims: (analyzed.analysis["analyzed_claim_refs"] as string[]).length,
    effective_claims: (analyzed.analysis["effective_claim_refs"] as string[]).length,
    open_contradictions: contradictions.map((c) => ({
      fact_key: c.fact_key,
      claim_refs: c.claim_refs,
      distinct_values: c.distinct_values,
      blocking_publication: c.blocking_publication,
      contradiction_fingerprint: contradictionFingerprint(
        workspace,
        brandRef,
        c.fact_key,
        c.claim_refs,
        c.distinct_values
      ),
    })),
    gaps: gaps.map((g) => ({ fact_key: g.fact_key, kind: g.kind, blocking: g.blocking })),
    unstructured_claim_refs: analyzed.analysis["unstructured_claim_refs"],
    unprofiled_fact_claim_refs: analyzed.analysis["unprofiled_fact_claim_refs"],
  };
  const humanSummary = [
    `Namespace ${workspace}/${brandRef} — ${summary.analyzed_claims} claim(s), ${summary.effective_claims} effective.`,
    `Claim-set digest: ${claimSetDigest}`,
    `Open contradictions: ${contradictions.length}`,
    ...summary.open_contradictions.map(
      (c) =>
        `  - ${c.fact_key}: claims ${c.claim_refs.join(", ")} — values ${JSON.stringify(c.distinct_values)} — blocking=${String(c.blocking_publication)}\n    fingerprint: ${c.contradiction_fingerprint}`
    ),
    `Gaps: ${gaps.length}`,
    ...gaps.map((g) => `  - ${g.fact_key}: ${g.kind} (blocking=${String(g.blocking)})`),
    `Unstructured claims (not analyzed, never interpreted): ${(summary.unstructured_claim_refs as string[]).length}`,
    `Unprofiled fact claims: ${(summary.unprofiled_fact_claim_refs as string[]).length}`,
  ];

  if (dryRun) {
    emit(
      output,
      [
        `DRY RUN — nothing was persisted.`,
        ...humanSummary,
        `To persist: re-run without --dry-run, with --snapshot-id <id> --analysis-id <id> --confirm-digest ${claimSetDigest}`,
      ],
      { dry_run: true, ...summary }
    );
    return;
  }
  requireConfirmDigest(args, claimSetDigest, "current namespace claim-set digest");
  must(store.put(workspace, brandRef, "claim-snapshot", analyzed.snapshot));
  must(store.put(workspace, brandRef, "truth-analysis", analyzed.analysis));
  const storedAnalysis = must(store.get(workspace, brandRef, "truth-analysis", analysisId));
  const analysisDigest = contentDigest(storedAnalysis);
  emit(
    output,
    [
      `Analysis persisted: truth-analysis/${analysisId} (snapshot claim-snapshot/${snapshotId})`,
      ...humanSummary,
      `Analysis content digest: ${analysisDigest}`,
      `Use this digest as --confirm-digest for 'resolution prepare'.`,
    ],
    { dry_run: false, analysis_ref: analysisId, snapshot_ref: snapshotId, analysis_digest: analysisDigest, ...summary }
  );
}

function cmdTruthInspect(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "truth inspect" };
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const analysisRef = required(args, "--analysis-ref");

  const analysis = must(store.get(workspace, brandRef, "truth-analysis", analysisRef));
  const analysisDigest = contentDigest(analysis);
  const snapshotRef = String(analysis["claim_snapshot_ref"]);
  const snapshot = must(store.get(workspace, brandRef, "claim-snapshot", snapshotRef));
  const current = must(
    captureClaimSnapshot(
      { artifactId: snapshotRef, workspace, brandRef, createdAt: nowIso() },
      store,
      registry
    )
  );
  const currentDigest = String(current.snapshot["claim_set_digest"]);
  const stale = currentDigest !== String(analysis["claim_set_digest"]);

  const contradictions = (analysis["open_contradictions"] ?? []) as {
    fact_key: string;
    claim_refs: string[];
    distinct_values: (string | number | boolean)[];
    blocking_publication: boolean;
  }[];
  const gaps = (analysis["gaps"] ?? []) as { fact_key: string; kind: string; blocking: boolean }[];
  const data = {
    workspace,
    brand_ref: brandRef,
    analysis_ref: analysisRef,
    analysis_digest: analysisDigest,
    truth_profile_ref: String(analysis["truth_profile_ref"]),
    snapshot_ref: snapshotRef,
    snapshot_digest: contentDigest(snapshot),
    claim_set_digest: String(analysis["claim_set_digest"]),
    current_claim_set_digest: currentDigest,
    stale,
    analyzer_version: String(analysis["analyzer_version"]),
    effective_claims: (analysis["effective_claim_refs"] as string[]).length,
    superseded_claims: (analysis["superseded_claim_refs"] as string[]).length,
    inactive_heads: (analysis["inactive_head_claims"] as unknown[]).length,
    open_contradictions: contradictions.map((c) => ({
      fact_key: c.fact_key,
      claim_refs: c.claim_refs,
      distinct_values: c.distinct_values,
      blocking_publication: c.blocking_publication,
      contradiction_fingerprint: contradictionFingerprint(
        workspace,
        brandRef,
        c.fact_key,
        c.claim_refs,
        c.distinct_values
      ),
    })),
    gaps: gaps.map((g) => ({ fact_key: g.fact_key, kind: g.kind, blocking: g.blocking })),
    unstructured_claim_refs: analysis["unstructured_claim_refs"],
    unprofiled_fact_claim_refs: analysis["unprofiled_fact_claim_refs"],
  };
  emit(
    output,
    [
      `truth-analysis/${analysisRef} (${workspace}/${brandRef})`,
      `Analysis content digest: ${analysisDigest}`,
      `Bound snapshot: claim-snapshot/${snapshotRef} — claim-set digest ${data.claim_set_digest}`,
      `Currency: ${stale ? `STALE (current namespace digest ${currentDigest}; re-run 'truth analyze' before resolving)` : "current (matches the live namespace)"}`,
      `Partition: ${data.effective_claims} effective / ${data.superseded_claims} superseded / ${data.inactive_heads} inactive head(s)`,
      `Open contradictions: ${contradictions.length}`,
      ...data.open_contradictions.map(
        (c) =>
          `  - ${c.fact_key}: claims ${c.claim_refs.join(", ")} — values ${JSON.stringify(c.distinct_values)} — blocking=${String(c.blocking_publication)}\n    fingerprint: ${c.contradiction_fingerprint}`
      ),
      `Gaps: ${gaps.length}`,
      ...data.gaps.map((g) => `  - ${g.fact_key}: ${g.kind} (blocking=${String(g.blocking)})`),
      `Unstructured claim refs: ${(data.unstructured_claim_refs as string[]).join(", ") || "(none)"}`,
      `Unprofiled fact claim refs: ${(data.unprofiled_fact_claim_refs as string[]).join(", ") || "(none)"}`,
    ],
    data
  );
}

// ---------------------------------------------------------------------------
// resolution prepare / apply / inspect
// ---------------------------------------------------------------------------
function cmdResolutionPrepare(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "resolution prepare" };
  const dryRun = args.booleans.has("--dry-run");
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const analysisRef = required(args, "--analysis-ref");
  const factKey = required(args, "--fact-key");
  const fingerprint = required(args, "--contradiction-fingerprint");
  const winner = required(args, "--winner");
  const requesterId = required(args, "--requester-id");
  const rationale = required(args, "--rationale");
  const decisionId = dryRun ? (args.flags.get("--decision-id") ?? "dry-run-decision") : required(args, "--decision-id");

  // The confirmation digest binds this preparation to the exact analysis
  // the operator reviewed (its canonical content digest, as printed by
  // 'truth analyze' and 'truth inspect').
  const analysis = must(store.get(workspace, brandRef, "truth-analysis", analysisRef));
  const analysisDigest = contentDigest(analysis);
  if (!dryRun) requireConfirmDigest(args, analysisDigest, "reviewed truth-analysis content digest");

  const prepared = must(
    prepareFactResolutionDecision(
      {
        decisionArtifactId: decisionId,
        workspace,
        brandRef,
        truthAnalysisRef: analysisRef,
        factKey,
        contradictionFingerprint: fingerprint,
        winningClaimRef: winner,
        rationale,
        requesterId,
        createdAt: nowIso(),
      },
      store,
      registry,
      { persist: !dryRun }
    )
  );
  const losers = (prepared.decision["losing_claims"] as { claim_ref: string }[]).map((l) => l.claim_ref);
  const signTemplate = [
    `node dist/src/cli/sign-approval.js \\`,
    `  --private-key <PATH-TO-YOUR-PRIVATE-KEY> \\`,
    `  --artifacts-root ${resolve(required(args, "--artifacts-root"))} \\`,
    `  --workspace ${workspace} --brand-ref ${brandRef} \\`,
    `  --target-type fact-resolution-decision --target-ref ${decisionId} \\`,
    `  --gate fact-resolution-approval --verdict approved \\`,
    `  --reason "<YOUR-REASON>" --requester-id ${requesterId} \\`,
    `  --evidence-out <PATH-OUTSIDE-THE-REPOSITORY>/evidence-${decisionId}.json`,
  ];
  const data = {
    dry_run: dryRun,
    workspace,
    brand_ref: brandRef,
    target_artifact_type: "fact-resolution-decision",
    decision_ref: decisionId,
    decision_digest: prepared.decisionDigest,
    ...(dryRun
      ? {
          decision_digest_note:
            "preview only: a persisted decision's digest will differ through its creation timestamp",
        }
      : {}),
    fact_key: factKey,
    contradiction_fingerprint: String(prepared.decision["contradiction_fingerprint"]),
    winning_claim_ref: winner,
    derived_losing_claim_refs: losers,
    approval_gate: "fact-resolution-approval",
    analysis_ref: analysisRef,
    analysis_digest: analysisDigest,
    sign_command_template: signTemplate.join("\n"),
  };
  emit(
    output,
    [
      dryRun
        ? `DRY RUN — nothing was persisted. Preview of the decision that WOULD be prepared (a persisted decision's digest will differ through its creation timestamp):`
        : `Decision persisted: fact-resolution-decision/${decisionId} (${workspace}/${brandRef})`,
      `Decision digest: ${prepared.decisionDigest}${dryRun ? " (preview only)" : " — this is the digest the Product Owner signs"}`,
      `Fact slot: ${factKey}`,
      `Winner: ${winner}`,
      `Derived losers (re-derived by the preparation service, never operator-supplied): ${losers.join(", ")}`,
      `Approval gate: fact-resolution-approval`,
      dryRun
        ? `To persist: re-run without --dry-run, with --decision-id <id> and --confirm-digest ${analysisDigest}`
        : `Next step — the KEY OWNER personally signs the exact decision (this CLI never reads a private key):`,
      ...(dryRun ? [] : signTemplate),
    ],
    data
  );
}

function cmdResolutionApply(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "resolution apply" };
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const receiptsRoot = resolve(required(args, "--receipts-root"));
  const evidencePath = required(args, "--evidence");
  const configDir = args.flags.get("--trusted-config-dir")
    ? resolve(args.flags.get("--trusted-config-dir")!)
    : join(REPO_ROOT, "contracts");

  const evidence = readJsonFile(evidencePath, "approval evidence file");
  const validated = must(registry.validate("approval-evidence", evidence));
  const payload = validated["payload"] as Record<string, unknown>;
  if (payload["workspace"] !== workspace || payload["brand_ref"] !== brandRef) {
    fail(
      EXIT.reference,
      "namespace-mismatch",
      `the evidence is signed for namespace '${String(payload["workspace"])}/${String(payload["brand_ref"])}', not '${workspace}/${brandRef}'`
    );
  }
  const decisionRef = String(payload["target_artifact_ref"]);
  const decision = must(store.get(workspace, brandRef, "fact-resolution-decision", decisionRef));
  requireConfirmDigest(args, contentDigest(decision), "stored decision content digest");

  const config = loadTrustedAuthorityConfig(
    join(configDir, "human-gate-policy.active.json"),
    join(configDir, "authority-registry.active.json"),
    registry
  );
  const trusted = must(config);
  const trustOverride = args.flags.has("--trusted-config-dir");
  const trustLine = `Trust root: ${String(trusted.policy["policy_id"])} v${String(trusted.policy["policy_version"])} / ${String(trusted.registry["registry_id"])} v${String(trusted.registry["registry_version"])}${
    trustOverride
      ? " — NON-DEFAULT --trusted-config-dir in effect; verify this override is intentional"
      : " (repository default)"
  }`;
  const applied = must(
    applyFactResolution(evidence, {
      contracts: registry,
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(receiptsRoot, registry),
      config: trusted,
      clock: nowIso,
    })
  );
  const application = applied.application;
  const revisions = application["created_losing_revisions"] as {
    losing_claim_ref: string;
    successor_claim_ref: string;
  }[];
  const data = {
    workspace,
    brand_ref: brandRef,
    trusted_config: trustOverride ? "override" : "default",
    policy_ref: String(trusted.policy["policy_id"]),
    policy_version: trusted.policy["policy_version"],
    registry_ref: String(trusted.registry["registry_id"]),
    registry_version: trusted.registry["registry_version"],
    replayed: applied.replayed,
    application_ref: String(application["artifact_id"]),
    decision_ref: String(application["decision_ref"]),
    decision_digest: String(application["decision_digest"]),
    receipt_ref: String(application["receipt_ref"]),
    verdict: "approved",
    created_losing_revisions: revisions,
    before_snapshot_ref: String(application["before_snapshot_ref"]),
    before_analysis_ref: String(application["before_analysis_ref"]),
    after_snapshot_ref: String(application["after_snapshot_ref"]),
    after_analysis_ref: String(application["after_analysis_ref"]),
    after_claim_set_digest: String(application["after_claim_set_digest"]),
    status: String(application["status"]),
    consumed_at: String(application["consumed_at"]),
  };
  emit(
    output,
    [
      applied.replayed
        ? `Already applied — returning the stored immutable result (idempotent replay; nothing was created or consumed).`
        : `Resolution applied exactly once.`,
      trustLine,
      `Application: fact-resolution-application/${data.application_ref}`,
      `Decision: fact-resolution-decision/${data.decision_ref} (${data.decision_digest})`,
      `Approval receipt: ${data.receipt_ref}`,
      `Created losing successors:`,
      ...revisions.map((r) => `  - ${r.losing_claim_ref} -> ${r.successor_claim_ref} (verification_status contradicted)`),
      `Before: snapshot ${data.before_snapshot_ref}, analysis ${data.before_analysis_ref} (now stale by construction)`,
      `After:  snapshot ${data.after_snapshot_ref}, analysis ${data.after_analysis_ref}`,
      `Status: ${data.status} at ${data.consumed_at}`,
    ],
    data
  );
}

function cmdResolutionInspect(args: ParsedArgs): void {
  const output: Output = { json: args.booleans.has("--json"), command: "resolution inspect" };
  const registry = contractsRegistry();
  const store = storeFor(args, registry);
  const workspace = required(args, "--workspace");
  const brandRef = required(args, "--brand-ref");
  const decisionRef = required(args, "--decision-ref");

  const decision = must(store.get(workspace, brandRef, "fact-resolution-decision", decisionRef));
  const decisionDigest = contentDigest(decision);
  const current = must(
    captureClaimSnapshot(
      { artifactId: "inspect-preview", workspace, brandRef, createdAt: nowIso() },
      store,
      registry
    )
  );
  const decisionStale =
    String(current.snapshot["claim_set_digest"]) !== String(decision["claim_set_digest"]);

  // Completion is ALWAYS store-derived, independent of any evidence file:
  // an applied decision must never be reported as needing a fresh
  // signature just because the supplied evidence is absent, foreign, or
  // malformed. Unreadable application records are counted, never silently
  // skipped.
  let applicationRef: string | null = null;
  let unreadableApplications = 0;
  const listed = must(store.list(workspace, brandRef, "fact-resolution-application"));
  for (const entry of listed) {
    const application = store.get(workspace, brandRef, "fact-resolution-application", entry.artifactId);
    if (!application.ok) {
      unreadableApplications++;
      continue;
    }
    if (application.value["decision_ref"] === decisionRef) applicationRef = entry.artifactId;
  }

  // Evidence classification is receipt-, registry-, and store-derived ONLY.
  // Unsigned metadata (including the evidence file itself) never proves
  // anything: a consumed approval is proven by its immutable receipt AND a
  // signature that verifies against the enrolled key; a completed
  // application by its immutable record.
  let evidenceState = "no evidence supplied";
  const evidencePathArg = args.flags.get("--evidence");
  if (evidencePathArg) {
    const receiptsRootArg = args.flags.get("--receipts-root");
    if (!receiptsRootArg) fail(EXIT.usage, "usage", "--evidence requires --receipts-root to classify consumption");
    const receiptStore = new FileApprovalReceiptStore(resolve(receiptsRootArg), registry);
    const configDir = args.flags.get("--trusted-config-dir")
      ? resolve(args.flags.get("--trusted-config-dir")!)
      : join(REPO_ROOT, "contracts");
    const trusted = must(
      loadTrustedAuthorityConfig(
        join(configDir, "human-gate-policy.active.json"),
        join(configDir, "authority-registry.active.json"),
        registry
      )
    );
    const rawEvidence = readJsonFile(evidencePathArg, "approval evidence file");
    const validatedEvidence = registry.validate("approval-evidence", rawEvidence);
    if (!validatedEvidence.ok) {
      evidenceState = "malformed (contract-invalid; grants nothing)";
    } else {
      const payload = validatedEvidence.value["payload"] as Record<string, unknown>;
      const authority = trusted.authorities.get(String(payload["key_id"]));
      const publicKey = authority ? ed25519PublicKeyFromSpkiB64(authority.public_key_spki_b64) : null;
      const signatureB64 = String(
        (validatedEvidence.value["signature"] as Record<string, unknown>)["signature_b64"]
      );
      if (
        payload["target_artifact_ref"] !== decisionRef ||
        payload["target_artifact_type"] !== "fact-resolution-decision" ||
        payload["workspace"] !== workspace ||
        payload["brand_ref"] !== brandRef
      ) {
        evidenceState = "conflicted (evidence targets a different artifact or namespace)";
      } else if (payload["target_artifact_digest"] !== decisionDigest) {
        evidenceState = "conflicted (signed digest does not match the stored decision)";
      } else if (!authority) {
        evidenceState = "conflicted (signing key is not enrolled in the trusted registry)";
      } else if (!publicKey || !verifyApprovalSignature(payload, signatureB64, publicKey)) {
        evidenceState = "conflicted (signature does not verify against the enrolled key)";
      } else {
        const receiptId = receiptIdFor(
          String(payload["key_id"]),
          String(payload["nonce"]),
          String(payload["policy_ref"]),
          workspace,
          brandRef
        );
        const receipt = receiptStore.get(workspace, brandRef, receiptId);
        if (!receipt.ok) {
          evidenceState =
            "not consumed (no receipt exists; validity is decided only by verification at apply time — shape alone authorizes nothing)";
        } else if (receipt.value["payload_digest"] !== approvalPayloadDigest(payload)) {
          evidenceState = "conflicted (an approval with this nonce was consumed for a different operation)";
        } else if (receipt.value["verdict"] !== "approved") {
          evidenceState = "rejected (consumed; an authentic rejection applies nothing)";
        } else {
          const derivedRef = applicationIdFor(decisionDigest, receiptId);
          const application = store.get(workspace, brandRef, "fact-resolution-application", derivedRef);
          if (application.ok) {
            applicationRef = derivedRef;
            evidenceState = "completed (immutable application record exists)";
          } else {
            evidenceState = "recoverable (consumed but incomplete; retry 'resolution apply' with the same evidence)";
          }
        }
      }
    }
  } else if (applicationRef) {
    evidenceState = "completed (immutable application record exists)";
  }

  const losers = (decision["losing_claims"] as { claim_ref: string }[]).map((l) => l.claim_ref);
  const data = {
    workspace,
    brand_ref: brandRef,
    decision_ref: decisionRef,
    decision_digest: decisionDigest,
    fact_key: String(decision["fact_key"]),
    winning_claim_ref: String(decision["winning_claim_ref"]),
    losing_claim_refs: losers,
    decision_stale: decisionStale,
    evidence_state: evidenceState,
    application_ref: applicationRef,
  };
  emit(
    output,
    [
      `fact-resolution-decision/${decisionRef} (${workspace}/${brandRef})`,
      `Decision digest: ${decisionDigest}`,
      `Fact slot: ${data.fact_key} — winner ${data.winning_claim_ref}, losers ${losers.join(", ")}`,
      `Decision currency: ${
        !decisionStale
          ? "current"
          : applicationRef
            ? "stale (expected: the namespace moved forward when this decision was applied)"
            : "STALE (the claim namespace changed since preparation; a fresh analysis, decision, and signature are required)"
      }`,
      `Evidence state: ${evidenceState}`,
      applicationRef ? `Application: fact-resolution-application/${applicationRef}` : `Application: none found`,
    ],
    data
  );
}

// ---------------------------------------------------------------------------
// help
// ---------------------------------------------------------------------------
const HELP = `nabcor — safe operator CLI for the deterministic truth and fact-resolution workflow (DEC-0017)

USAGE
  node dist/src/cli/nabcor.js <command> [options]

COMMANDS
  status                       Show policy, provider, authority, gate, and phase state (read-only).
  truth snapshot               Capture the authoritative claim snapshot of one namespace.
  truth analyze                Run the deterministic structured-truth analyzer and persist its result.
  truth inspect                Display an existing analysis: contradictions, gaps, staleness (read-only).
  resolution prepare           Derive and persist the exact immutable fact-resolution decision.
  resolution apply             Verify, consume, and apply PUBLIC approval evidence.
  resolution inspect           Display decision/application/evidence state (read-only).
  help                         This text.

COMMON OPTIONS
  --artifacts-root <dir>       Explicit artifact-store root (required for store commands; no default).
  --workspace <id>             Workspace namespace.
  --brand-ref <id>             Brand namespace.
  --json                       One stable machine-readable JSON object, no ANSI.
  --dry-run                    Compute and display without persisting anything (snapshot/analyze/prepare).
  --confirm-digest sha256:...  Operator-error guard binding a mutation to the exact reviewed state.
                               It is NOT authentication — authentication is signed approval evidence.
  --trusted-config-dir <dir>   (resolution apply/inspect) Override the trusted policy/registry
                               directory. Default: this repository's committed contracts/ trust
                               root. Overriding changes WHICH registry verifies evidence — use it
                               only for isolated test/ceremony configurations you built yourself;
                               apply output always names the trust root it used.

OUTPUT CHANNELS
  Human mode: results to stdout, errors to stderr. --json mode: one JSON object to
  stdout for both success and failure (failure objects carry exit_code).

WORKFLOW (synthetic example — three strictly separated stages)
  1. Prepare (operator, no key):
     nabcor truth analyze --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \\
       --profile-ref tp-0001 --snapshot-id snap-0001 --analysis-id ta-0001 --confirm-digest sha256:<from --dry-run>
     nabcor truth inspect  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo --analysis-ref ta-0001
     nabcor resolution prepare --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \\
       --analysis-ref ta-0001 --fact-key identity.primary_name --contradiction-fingerprint <fingerprint from inspect> \\
       --winner claim-0001 --requester-id op-demo --rationale "matches the registration certificate" \\
       --decision-id frd-0001 --confirm-digest sha256:<analysis digest from inspect>
  2. Sign (KEY OWNER personally; this CLI never reads a private key):
     node dist/src/cli/sign-approval.js --private-key <PATH-TO-YOUR-PRIVATE-KEY> ... (exact template printed by prepare)
  3. Apply (operator, public evidence only):
     nabcor resolution apply --artifacts-root /ops/store --receipts-root /ops/receipts \\
       --workspace ws-demo --brand-ref brand-demo --evidence /ops/out/evidence-frd-0001.json \\
       --confirm-digest sha256:<decision digest from prepare>

EXIT CODES
  0 success (including idempotent completed replay)
  2 usage error          3 reference/validation failure   4 stale state
  5 authorization denial 6 authentic human rejection      7 conflict/replay
  8 confirmation-digest mismatch                          9 I/O or unexpected error

BOUNDARIES
  No natural-language extraction; no automatic winner selection; no provider, model,
  network, or credentials (DEC-0009); no quarantine release; no publishing; the four
  independent-review gates stay frozen. Claim/source contents are never printed by
  default — references, digests, and fact summaries only.`;

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------
// --dry-run is registered ONLY on the commands that implement it: a flag
// that is accepted but ignored on an irreversible command (apply consumes a
// single-use nonce) would be the exact operator trap DEC-0017 prohibits.
const COMMON = ["--json", "--artifacts-root", "--workspace", "--brand-ref"];
const COMMANDS: Record<string, { flags: string[]; run: (args: ParsedArgs) => void }> = {
  status: { flags: ["--json"], run: cmdStatus },
  "truth snapshot": {
    flags: [...COMMON, "--dry-run", "--snapshot-id", "--confirm-digest"],
    run: cmdTruthSnapshot,
  },
  "truth analyze": {
    flags: [...COMMON, "--dry-run", "--profile-ref", "--snapshot-id", "--analysis-id", "--confirm-digest"],
    run: cmdTruthAnalyze,
  },
  "truth inspect": { flags: [...COMMON, "--analysis-ref"], run: cmdTruthInspect },
  "resolution prepare": {
    flags: [
      ...COMMON,
      "--dry-run",
      "--analysis-ref",
      "--fact-key",
      "--contradiction-fingerprint",
      "--winner",
      "--requester-id",
      "--rationale",
      "--decision-id",
      "--confirm-digest",
    ],
    run: cmdResolutionPrepare,
  },
  "resolution apply": {
    flags: [...COMMON, "--receipts-root", "--evidence", "--confirm-digest", "--trusted-config-dir"],
    run: cmdResolutionApply,
  },
  "resolution inspect": {
    flags: [...COMMON, "--decision-ref", "--evidence", "--receipts-root", "--trusted-config-dir"],
    run: cmdResolutionInspect,
  },
};

function main(argv: string[]): void {
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help") {
    console.log(HELP);
    return;
  }
  const twoWord = argv.length >= 2 ? `${argv[0]} ${argv[1]}` : "";
  // Object.hasOwn: inherited object-prototype names (e.g. 'constructor')
  // must be unknown commands, not internal errors.
  const command = Object.hasOwn(COMMANDS, twoWord)
    ? twoWord
    : Object.hasOwn(COMMANDS, argv[0]!)
      ? argv[0]!
      : null;
  if (!command) {
    fail(EXIT.usage, "usage", `unknown command '${argv.join(" ")}' (see 'nabcor help')`);
  }
  const spec = COMMANDS[command]!;
  const rest = argv.slice(command.includes(" ") ? 2 : 1);
  const args = parseFlags(rest, new Set(spec.flags));
  spec.run(args);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  if (e instanceof CliFailure) {
    const wantsJson = process.argv.includes("--json");
    const body = { ok: false, error: { kind: e.kind, message: redact(e.message) }, exit_code: e.exitCode };
    if (wantsJson) console.log(JSON.stringify(body, null, 2));
    else console.error(`nabcor: [${e.kind}] ${redact(e.message)}`);
    process.exit(e.exitCode);
  }
  // Unexpected internal error: no stack trace by default, redacted message.
  const message = e instanceof Error ? e.message : String(e);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ ok: false, error: { kind: "internal", message: redact(message) }, exit_code: EXIT.internal }, null, 2));
  } else {
    console.error(`nabcor: internal error: ${redact(message)}`);
  }
  process.exit(EXIT.internal);
}
