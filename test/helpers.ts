// Shared fixtures/utilities for the runtime tests. Compiled to dist/test/helpers.js.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractRegistry } from "../src/kernel/contract-registry.js";
import { FileContentStore } from "../src/kernel/content-store.js";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const contractsDir = join(repoRoot, "contracts");
export const WS = "ws_test";
export const BRAND = "brand_test";

let cached: ContractRegistry | null = null;
export function registry(): ContractRegistry {
  if (!cached) cached = ContractRegistry.load(contractsDir);
  return cached;
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `nabcor-${prefix}-`));
}

export function contentStore(prefix = "content"): FileContentStore {
  return new FileContentStore(tempDir(prefix));
}

export function loadSyntheticCase(name: "prompt-only" | "evidence-rich"): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(repoRoot, "fixtures", "synthetic", `${name}.json`), "utf8")
  ) as Record<string, unknown>;
}

export const NOW = "2026-07-17T12:00:00Z";

export function validClaim(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    artifact_id: "claim_t_0001",
    brand_ref: "brand_test",
    created_at: NOW,
    creator_type: "human",
    lifecycle_status: "accepted",
    statement: "The company operates in Dubai",
    classification: "factual",
    source_type: "uploaded_document",
    source_ref: "source:src_t_0001#page=3",
    confidence: 0.95,
    confidence_basis: "explicit statement in the client's own profile document",
    verification_status: "verified",
    ...overrides,
  };
}

export function validSource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    artifact_id: "src_t_0001",
    brand_ref: "brand_test",
    created_at: NOW,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    kind: "document",
    origin: "client",
    filename_or_locator: "company-profile.pdf",
    rights: {
      commercial_use: "allowed",
      advertising_use: "unknown",
      benchmark_use: "forbidden",
      training_use: "forbidden",
    },
    capture: { status: "descriptor-only" },
    injection_flag: false,
    ...overrides,
  };
}

export function validAssumption(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    artifact_id: "asm_t_0001",
    brand_ref: "brand_test",
    created_at: NOW,
    creator_type: "human",
    lifecycle_status: "accepted",
    statement: "English-first is acceptable for this market",
    risk: "medium",
    status: "open",
    owner: "operator",
    revisit_trigger: "client confirms language priorities",
    ...overrides,
  };
}

export function validSlot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    fact_key: "identity.primary_name",
    description: "the brand's primary trading name",
    cardinality: "single",
    requirement: "required",
    why_needed: "every output renders the name",
    blocking_if_missing: true,
    blocking_if_conflicting: true,
    ...overrides,
  };
}

export function validTruthProfile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: "1.5.0",
    artifact_id: "tp_t_0001",
    brand_ref: "brand_test",
    created_at: NOW,
    creator_type: "human",
    lifecycle_status: "accepted",
    description: "synthetic test truth profile",
    slots: [validSlot()],
    ...overrides,
  };
}

/**
 * A contract-valid truth-analysis artifact covering exactly the given claims,
 * with no contradictions or gaps — the minimal analysis compiler tests need.
 * Every claim is treated as an effective lineage head (DEC-0012); claims
 * carrying fact metadata land in unprofiled refs (the default test profile is
 * unrelated), the rest in unstructured refs. Override the partition
 * collections to fabricate lineage states.
 */
export function truthAnalysisFor(
  claims: unknown[],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const records = claims as Record<string, unknown>[];
  const ids = records.map((c) => String(c["artifact_id"])).sort(byCodeUnit);
  const structured = records
    .filter((c) => typeof c["fact_key"] === "string")
    .map((c) => String(c["artifact_id"]))
    .sort(byCodeUnit);
  const unstructured = records
    .filter((c) => typeof c["fact_key"] !== "string")
    .map((c) => String(c["artifact_id"]))
    .sort(byCodeUnit);
  return {
    schema_version: "1.5.0",
    artifact_id: "ta_t_0001",
    brand_ref: "brand_test",
    created_at: NOW,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    truth_profile_ref: "tp_t_0001",
    analyzer_version: "analyze-structured-truth-1.1.0",
    analyzed_claim_refs: ids,
    effective_claim_refs: ids,
    superseded_claim_refs: [],
    inactive_head_claims: [],
    open_contradictions: [],
    gaps: [],
    unstructured_claim_refs: unstructured,
    unprofiled_fact_claim_refs: structured,
    ...overrides,
  };
}
