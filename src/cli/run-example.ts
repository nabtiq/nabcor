// Minimal executable Phase 1A/1B example over synthetic, English-only fixture data:
//   input descriptors -> source artifacts -> supplied claims/assumptions
//   -> deterministic structured-truth analysis (truth profile -> contradictions/gaps)
//   -> Brand Context Package -> validated artifact-store writes
//
//   node dist/src/cli/run-example.js --out <directory>
//
// Requires an explicit output directory, refuses to overwrite existing artifacts
// (INV-VER-001), performs no network or provider calls, and uses synthetic data
// only. Exit codes: 0 success, 1 failure, 2 usage error.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileArtifactStore } from "../kernel/artifact-store.js";
import { FileContentStore } from "../kernel/content-store.js";
import { ContractRegistry } from "../kernel/contract-registry.js";
import { describeFailure } from "../kernel/result.js";
import { buildBrandContext } from "../compile/build-brand-context.js";
import { analyzeStructuredTruth } from "../understand/analyze-structured-truth.js";
import { classifyInput, type InputDescriptor } from "../understand/classify-input.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORKSPACE = "nabtiq_internal";

interface SyntheticCase {
  brand_ref: string;
  id_prefix: string;
  mode: "prompt-only" | "evidence-rich" | "mixed";
  analysis_id: string;
  snapshot_id: string;
  descriptors: InputDescriptor[];
  truth_profile: unknown;
  claims: unknown[];
  assumptions: unknown[];
  identity: {
    names: { value: string; lang?: string; claim_ref: string }[];
    contacts?: { kind: "email" | "phone" | "whatsapp" | "address" | "domain" | "social"; value: string; claim_ref: string }[];
  };
  audience?: { claim_ref: string }[];
  market?: { locales?: string[] };
}

function usage(): never {
  console.error("usage: node dist/src/cli/run-example.js --out <directory>");
  process.exit(2);
}

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
if (outIndex === -1 || !args[outIndex + 1]) usage();
const outDir = resolve(args[outIndex + 1]!);

const registry = ContractRegistry.load(join(repoRoot, "contracts"));
const store = new FileArtifactStore(outDir, registry);
const contentStore = new FileContentStore(outDir);
const createdAt = new Date().toISOString();

function runCase(fixtureFile: string, contextId: string): void {
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, "fixtures", "synthetic", fixtureFile), "utf8")
  ) as SyntheticCase;
  const brand = fixture.brand_ref;
  console.log(`\ncase ${fixtureFile} (${fixture.mode}, brand ${brand})`);

  const classified = classifyInput(fixture.descriptors, {
    workspace: WORKSPACE,
    brandRef: brand,
    createdAt,
    artifactIdPrefix: fixture.id_prefix,
  }, registry, contentStore);
  if (!classified.ok) {
    console.error(`FAIL classify-input: ${describeFailure(classified.error)}`);
    process.exit(1);
  }
  for (const source of classified.value) {
    const put = store.put(WORKSPACE, brand, "source", source);
    if (!put.ok) {
      console.error(`FAIL store source: ${describeFailure(put.error)}`);
      process.exit(1);
    }
    const capture = source["capture"] as Record<string, unknown>;
    const flag =
      source["injection_flag"] === true
        ? capture["safety"] === "quarantined"
          ? "  [INJECTION FLAGGED — captured into quarantine, treated as data]"
          : "  [INJECTION FLAGGED — treated as data]"
        : "";
    console.log(`  source ${String(source["artifact_id"])} <- ${String(source["filename_or_locator"])}${flag}`);
  }
  for (const [type, artifacts] of [
    ["claim", fixture.claims],
    ["assumption", fixture.assumptions],
    ["truth-profile", [fixture.truth_profile]],
  ] as const) {
    for (const artifact of artifacts) {
      const put = store.put(WORKSPACE, brand, type, artifact);
      if (!put.ok) {
        console.error(`FAIL store ${type}: ${describeFailure(put.error)}`);
        process.exit(1);
      }
      console.log(`  ${type} ${String((artifact as Record<string, unknown>)["artifact_id"])}`);
    }
  }

  // Deterministic Tier-0 structured-truth analysis: claim membership comes
  // from the Artifact Store snapshot of the namespace the claims were just
  // persisted into — never from a caller array (DEC-0013) — and
  // contradictions and gaps are computed from explicit fact slots against
  // the truth profile (DEC-0011). No gateway or adapter is involved.
  const analyzed = analyzeStructuredTruth({
    artifactId: fixture.analysis_id,
    snapshotArtifactId: fixture.snapshot_id,
    workspace: WORKSPACE,
    brandRef: brand,
    createdAt,
    truthProfile: fixture.truth_profile,
  }, store, registry);
  if (!analyzed.ok) {
    console.error(`FAIL analyze-structured-truth: ${describeFailure(analyzed.error)}`);
    process.exit(1);
  }
  const snapshotPut = store.put(WORKSPACE, brand, "claim-snapshot", analyzed.value.snapshot);
  if (!snapshotPut.ok) {
    console.error(`FAIL store claim-snapshot: ${describeFailure(snapshotPut.error)}`);
    process.exit(1);
  }
  const analysisPut = store.put(WORKSPACE, brand, "truth-analysis", analyzed.value.analysis);
  if (!analysisPut.ok) {
    console.error(`FAIL store truth-analysis: ${describeFailure(analysisPut.error)}`);
    process.exit(1);
  }
  const analysis = analyzed.value.analysis;
  const unstructured = (analysis["unstructured_claim_refs"] as unknown[]).length;
  console.log(
    `  claim-snapshot ${fixture.snapshot_id} (canonical_claims=${(analyzed.value.snapshot["claims"] as unknown[]).length})`
  );
  console.log(
    `  truth-analysis ${fixture.analysis_id} (contradictions=${(analysis["open_contradictions"] as unknown[]).length}, ` +
      `gaps=${(analysis["gaps"] as unknown[]).length}, unstructured_claims=${unstructured})`
  );

  const marks = classified.value
    .filter((s) => s["kind"] === "logo")
    .map((s) => String(s["artifact_id"]));
  const compiled = buildBrandContext({
    artifactId: contextId,
    workspace: WORKSPACE,
    brandRef: brand,
    mode: fixture.mode,
    createdAt,
    sources: classified.value,
    assumptions: fixture.assumptions,
    truthAnalysisRef: fixture.analysis_id,
    identity: { ...fixture.identity, ...(marks.length > 0 ? { marks } : {}) },
    ...(fixture.audience ? { audience: fixture.audience } : {}),
    ...(fixture.market ? { market: fixture.market } : {}),
  }, store, registry, contentStore);
  if (!compiled.ok) {
    console.error(`FAIL build-brand-context: ${describeFailure(compiled.error)}`);
    process.exit(1);
  }
  const put = store.put(WORKSPACE, brand, "brand-context", compiled.value);
  if (!put.ok) {
    console.error(`FAIL store brand-context: ${describeFailure(put.error)}`);
    process.exit(1);
  }
  const contradictions = (compiled.value["open_contradictions"] as unknown[]).length;
  const gaps = (compiled.value["gaps"] as unknown[]).length;
  console.log(
    `  brand-context ${contextId} (provisional=${String(compiled.value["provisional"])}, ` +
      `truth_analysis_ref=${String(compiled.value["truth_analysis_ref"])}, ` +
      `open_contradictions=${contradictions}, gaps=${gaps}) -> ${put.value.path}`
  );
}

console.log(`Phase 1A/1B deterministic example -> ${outDir} (no network, no model calls, synthetic data only)`);
runCase("prompt-only.json", "bctx_po_0001");
runCase("evidence-rich.json", "bctx_ev_0001");
const listed = store.list(WORKSPACE, "brand_synthetic_prompt");
if (listed.ok) console.log(`\nbrand_synthetic_prompt namespace now holds ${listed.value.length} artifact(s).`);
console.log("done: all artifacts validated before write; nothing overwritten.");
