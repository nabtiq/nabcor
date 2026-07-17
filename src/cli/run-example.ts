// Minimal executable Phase 1A example over synthetic, English-only fixture data:
//   input descriptors -> source artifacts -> supplied claims/assumptions
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
import { ContractRegistry } from "../kernel/contract-registry.js";
import { describeFailure } from "../kernel/result.js";
import { buildBrandContext } from "../compile/build-brand-context.js";
import { classifyInput, type InputDescriptor } from "../understand/classify-input.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORKSPACE = "nabtiq_internal";

interface SyntheticCase {
  brand_ref: string;
  mode: "prompt-only" | "evidence-rich" | "mixed";
  descriptors: InputDescriptor[];
  claims: unknown[];
  assumptions: unknown[];
  contradictions: { claim_refs: string[]; description: string; blocking_publication?: boolean }[];
  gaps: { what: string; why_needed: string; blocking?: boolean }[];
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
const createdAt = new Date().toISOString();

function runCase(fixtureFile: string, idPrefix: string, contextId: string): void {
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, "fixtures", "synthetic", fixtureFile), "utf8")
  ) as SyntheticCase;
  const brand = fixture.brand_ref;
  console.log(`\ncase ${fixtureFile} (${fixture.mode}, brand ${brand})`);

  const classified = classifyInput(fixture.descriptors, {
    brandRef: brand,
    createdAt,
    artifactIdPrefix: idPrefix,
  }, registry);
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
    const flag = source["injection_flag"] === true ? "  [INJECTION FLAGGED — treated as data]" : "";
    console.log(`  source ${String(source["artifact_id"])} <- ${String(source["filename_or_locator"])}${flag}`);
  }
  for (const [type, artifacts] of [
    ["claim", fixture.claims],
    ["assumption", fixture.assumptions],
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

  const marks = classified.value
    .filter((s) => s["kind"] === "logo")
    .map((s) => String(s["artifact_id"]));
  const compiled = buildBrandContext({
    artifactId: contextId,
    brandRef: brand,
    mode: fixture.mode,
    createdAt,
    sources: classified.value,
    claims: fixture.claims,
    assumptions: fixture.assumptions,
    contradictions: fixture.contradictions,
    gaps: fixture.gaps,
    identity: { ...fixture.identity, ...(marks.length > 0 ? { marks } : {}) },
    ...(fixture.audience ? { audience: fixture.audience } : {}),
    ...(fixture.market ? { market: fixture.market } : {}),
  }, registry);
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
      `open_contradictions=${contradictions}, gaps=${gaps}) -> ${put.value.path}`
  );
}

console.log(`Phase 1A deterministic example -> ${outDir} (no network, no model calls, synthetic data only)`);
runCase("prompt-only.json", "src_po", "bctx_po_0001");
runCase("evidence-rich.json", "src_ev", "bctx_ev_0001");
const listed = store.list(WORKSPACE, "brand_synthetic_prompt");
if (listed.ok) console.log(`\nbrand_synthetic_prompt namespace now holds ${listed.value.length} artifact(s).`);
console.log("done: all artifacts validated before write; nothing overwritten.");
