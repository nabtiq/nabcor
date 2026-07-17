// Operational record store for gateway observability records (DEC-0010,
// INV-OBS-001, INV-DATA-001). `model-run` and `context-manifest` records are
// execution-layer records with their own identity fields — they are not brand
// artifacts and are not forced through the canonical artifact store's envelope
// assumptions (contracts/README.md). Enforcement idioms match the Phase 1A
// stores: conservative identifier pattern, path-relative containment, symlink
// refusal, validate-before-write, no overwrite, and tmp-plus-hard-link writes
// so a canonical record is only ever born complete.
// Records never contain raw prompts, captured content, credentials, or fixture
// bodies — only identifiers, reasons, and accounting values.
import { existsSync, linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { firstSymlinkWithin } from "../kernel/content-store.js";
import { type KernelFailure, type Result, err, ok } from "../kernel/result.js";

export const OPERATIONAL_RECORD_TYPES = ["model-run", "context-manifest"] as const;
export type OperationalRecordType = (typeof OPERATIONAL_RECORD_TYPES)[number];

// Each record type names its own identity field (execution-layer records carry
// no artifact envelope).
const ID_FIELD: Record<OperationalRecordType, string> = {
  "model-run": "run_id",
  "context-manifest": "manifest_id",
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export interface RunRecordStore {
  put(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    record: unknown
  ): Result<{ path: string; recordId: string }>;
  get(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    recordId: string
  ): Result<Record<string, unknown>>;
}

export class FileRunRecordStore implements RunRecordStore {
  constructor(
    private readonly root: string,
    private readonly registry: ContractRegistry
  ) {}

  #checkSegment(field: string, value: string): KernelFailure | null {
    if (!SAFE_ID.test(value) || value.includes("..")) {
      return {
        kind: "unsafe-identifier",
        field,
        value,
        message: `unsafe ${field} identifier '${value}' (must match ${SAFE_ID})`,
      };
    }
    return null;
  }

  #resolvePath(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    recordId: string
  ): Result<string> {
    for (const [field, value] of [
      ["workspace", workspace],
      ["brand", brand],
      ["record_id", recordId],
    ] as const) {
      const failure = this.#checkSegment(field, value);
      if (failure) return err(failure);
    }
    const path = resolve(this.root, workspace, brand, type, `${recordId}.json`);
    const rel = relative(resolve(this.root), path);
    if (rel.startsWith("..") || rel.startsWith(sep)) {
      return err({
        kind: "namespace-violation",
        message: `resolved path escapes the record store root for record '${recordId}'`,
      });
    }
    if (firstSymlinkWithin(resolve(this.root), path)) {
      return err({
        kind: "namespace-violation",
        message: `record path for '${recordId}' contains a symlink and is refused`,
      });
    }
    return ok(path);
  }

  /**
   * Namespace truth check: a model-run record's own workspace_id/brand_id must
   * name the namespace it is stored under, so records can never be planted in
   * (or read from) a foreign brand. Context manifests carry no namespace fields
   * by contract; their isolation is purely path-based — the namespace is chosen
   * by the gateway from the validated request, never by record content.
   */
  #namespaceViolation(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    data: Record<string, unknown>
  ): KernelFailure | null {
    if (type !== "model-run") return null;
    if (data["workspace_id"] !== workspace || data["brand_id"] !== brand) {
      return {
        kind: "namespace-violation",
        message: `model-run record names namespace '${String(data["workspace_id"])}/${String(
          data["brand_id"]
        )}' but the target namespace is '${workspace}/${brand}'`,
      };
    }
    return null;
  }

  put(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    record: unknown
  ): Result<{ path: string; recordId: string }> {
    if (!OPERATIONAL_RECORD_TYPES.includes(type)) {
      return err({
        kind: "unknown-artifact-type",
        artifactType: type,
        message: `'${String(type)}' is not an operational record type`,
      });
    }
    const validated = this.registry.validate(type, record);
    if (!validated.ok) return validated;
    const data = validated.value;
    const recordId = data[ID_FIELD[type]];
    if (typeof recordId !== "string") {
      return err({
        kind: "invalid-input",
        message: `${type} record has no string ${ID_FIELD[type]}`,
      });
    }
    const nsFailure = this.#namespaceViolation(workspace, brand, type, data);
    if (nsFailure) return err(nsFailure);
    const addressed = this.#resolvePath(workspace, brand, type, recordId);
    if (!addressed.ok) return addressed;
    const path = addressed.value;
    if (existsSync(path)) {
      return err({
        kind: "artifact-exists",
        artifactId: recordId,
        message: `operational record '${recordId}' already exists in ${workspace}/${brand}/${type}; records are immutable`,
      });
    }
    const tmp = `${path}.tmp-${randomUUID()}`;
    try {
      mkdirSync(join(this.root, workspace, brand, type), { recursive: true });
      writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
      // linkSync fails with EEXIST if the canonical path appeared meanwhile, so
      // a record is only ever born complete and is never overwritten.
      linkSync(tmp, path);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        return err({
          kind: "artifact-exists",
          artifactId: recordId,
          message: `operational record '${recordId}' already exists in ${workspace}/${brand}/${type}`,
        });
      }
      return err({ kind: "io-error", message: `record write failed for '${recordId}': ${String(e)}` });
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // tmp already gone — nothing to clean up
      }
    }
    return ok({ path, recordId });
  }

  get(
    workspace: string,
    brand: string,
    type: OperationalRecordType,
    recordId: string
  ): Result<Record<string, unknown>> {
    if (!OPERATIONAL_RECORD_TYPES.includes(type)) {
      return err({
        kind: "unknown-artifact-type",
        artifactType: type,
        message: `'${String(type)}' is not an operational record type`,
      });
    }
    const addressed = this.#resolvePath(workspace, brand, type, recordId);
    if (!addressed.ok) return addressed;
    if (!existsSync(addressed.value)) {
      return err({
        kind: "artifact-not-found",
        artifactId: recordId,
        message: `operational record '${recordId}' not found in ${workspace}/${brand}/${type}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(addressed.value, "utf8"));
    } catch (e) {
      return err({ kind: "io-error", message: `record read failed for '${recordId}': ${String(e)}` });
    }
    const validated = this.registry.validate(type, parsed);
    if (!validated.ok) return validated;
    const nsFailure = this.#namespaceViolation(workspace, brand, type, validated.value);
    if (nsFailure) return err(nsFailure);
    return validated;
  }
}
