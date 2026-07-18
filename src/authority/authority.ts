// Trusted human-gate authority configuration (DEC-0014).
//
// The verifier trusts ONLY what this module loads: the committed active
// human-gate policy and the exact authority registry that policy references.
// Both paths are fixed at construction time by the operator/runtime — an
// approval artifact can never select its own policy, registry, or public key.
// Every load is contract-validated (schema + semantic layer, including the
// key_id/SPKI binding and Ed25519-only checks) and the policy→registry
// binding is verified before any verification can use them. Every failure is
// typed and fail-closed.
import { readFileSync } from "node:fs";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";

export interface AuthorityEntry {
  key_id: string;
  subject_id: string;
  label: string;
  algorithm: string;
  public_key_spki_b64: string;
  roles: string[];
  valid_from: string;
  valid_until: string | null;
  status: string;
}

export interface GateRequirement {
  required_role: string;
  independent_review_required: boolean;
}

export interface TrustedAuthorityConfig {
  policy: Record<string, unknown>;
  registry: Record<string, unknown>;
  authorities: Map<string, AuthorityEntry>;
  gateRequirements: Map<string, GateRequirement>;
}

/**
 * Load and cross-verify the active policy and its registry from two fixed,
 * operator-chosen paths. Returns a typed failure (never a partial config)
 * when either document is unreadable, contract-invalid, or the registry is
 * not the exact one the policy pins.
 */
export function loadTrustedAuthorityConfig(
  policyPath: string,
  registryPath: string,
  contracts: ContractRegistry
): Result<TrustedAuthorityConfig> {
  let policyRaw: unknown;
  let registryRaw: unknown;
  try {
    policyRaw = JSON.parse(readFileSync(policyPath, "utf8"));
  } catch (e) {
    return err({
      kind: "authority-config-invalid",
      message: `active human-gate policy at '${policyPath}' is unreadable or not JSON: ${String(e)}`,
    });
  }
  try {
    registryRaw = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (e) {
    return err({
      kind: "authority-config-invalid",
      message: `authority registry at '${registryPath}' is unreadable or not JSON: ${String(e)}`,
    });
  }
  const policy = contracts.validate("human-gate-policy", policyRaw);
  if (!policy.ok) return policy;
  const registry = contracts.validate("authority-registry", registryRaw);
  if (!registry.ok) return registry;

  // The policy pins its registry by id AND version; a stale, superseded, or
  // foreign registry at the trusted path fails closed.
  if (policy.value["authority_registry_ref"] !== registry.value["registry_id"]) {
    return err({
      kind: "authority-config-invalid",
      message: `active policy references registry '${String(policy.value["authority_registry_ref"])}' but the loaded registry is '${String(registry.value["registry_id"])}'`,
    });
  }
  if (policy.value["authority_registry_version"] !== registry.value["registry_version"]) {
    return err({
      kind: "authority-config-invalid",
      message: `active policy pins registry version ${String(policy.value["authority_registry_version"])} but the loaded registry is version ${String(registry.value["registry_version"])}`,
    });
  }

  const authorities = new Map<string, AuthorityEntry>();
  for (const entry of (registry.value["authorities"] ?? []) as AuthorityEntry[]) {
    authorities.set(entry.key_id, entry);
  }
  const gateRequirements = new Map<string, GateRequirement>();
  const requirements = (policy.value["gate_requirements"] ?? {}) as Record<string, GateRequirement>;
  for (const [gate, requirement] of Object.entries(requirements)) {
    gateRequirements.set(gate, requirement);
  }
  return ok({ policy: policy.value, registry: registry.value, authorities, gateRequirements });
}
