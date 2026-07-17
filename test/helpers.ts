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
    schema_version: "1.2.0",
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
    schema_version: "1.2.0",
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
    schema_version: "1.2.0",
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
