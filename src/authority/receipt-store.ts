// Immutable approval-consumption receipt store (DEC-0014).
//
// Replay protection is an authorization requirement, not logging: an approval
// authorizes only if its deterministic receipt (identity derived from policy,
// key ID, and nonce — approval-receipt-id-sha256-1.0.0) can be persisted
// atomically with no overwrite. The write idiom matches the Phase 1A stores:
// validate-before-write, tmp file + hard link, so exactly one concurrent
// consumption attempt can ever succeed (linkSync fails with EEXIST for every
// other) and no partial receipt can exist under the canonical path. An
// existing receipt is a typed `approval-replay` failure. Receipts are
// workspace/brand isolated and carry identifiers and digests only.
import { existsSync, linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { firstSymlinkWithin } from "../kernel/content-store.js";
import { type KernelFailure, type Result, err, ok } from "../kernel/result.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const RECEIPT_TYPE = "approval-receipt";

export class FileApprovalReceiptStore {
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

  #resolvePath(workspace: string, brand: string, receiptId: string): Result<string> {
    for (const [field, value] of [
      ["workspace", workspace],
      ["brand", brand],
      ["receipt_id", receiptId],
    ] as const) {
      const failure = this.#checkSegment(field, value);
      if (failure) return err(failure);
    }
    const path = resolve(this.root, workspace, brand, RECEIPT_TYPE, `${receiptId}.json`);
    const rel = relative(resolve(this.root), path);
    if (rel.startsWith("..") || rel.startsWith(sep)) {
      return err({
        kind: "namespace-violation",
        message: `resolved path escapes the receipt store root for receipt '${receiptId}'`,
      });
    }
    if (firstSymlinkWithin(resolve(this.root), path)) {
      return err({
        kind: "namespace-violation",
        message: `receipt path for '${receiptId}' contains a symlink and is refused`,
      });
    }
    return ok(path);
  }

  /**
   * Atomically consume one nonce by persisting its receipt. Exactly the first
   * attempt for a receipt_id succeeds; every later or concurrent attempt
   * returns a typed `approval-replay` failure. Any other persistence failure
   * returns without authorization and leaves no canonical receipt behind.
   */
  consume(workspace: string, brand: string, receipt: unknown): Result<{ path: string; receiptId: string }> {
    const validated = this.registry.validate(RECEIPT_TYPE, receipt);
    if (!validated.ok) return validated;
    const data = validated.value;
    const receiptId = data["receipt_id"];
    if (typeof receiptId !== "string") {
      return err({ kind: "invalid-input", message: "receipt has no string receipt_id" });
    }
    if (data["workspace"] !== workspace || data["brand_ref"] !== brand) {
      return err({
        kind: "namespace-violation",
        message: `receipt names namespace '${String(data["workspace"])}/${String(data["brand_ref"])}' but the target namespace is '${workspace}/${brand}'`,
      });
    }
    const addressed = this.#resolvePath(workspace, brand, receiptId);
    if (!addressed.ok) return addressed;
    const path = addressed.value;
    if (existsSync(path)) {
      return err({
        kind: "approval-replay",
        receiptId,
        message: `nonce already consumed: receipt '${receiptId}' exists in ${workspace}/${brand}; one approval authorizes exactly one consumption`,
      });
    }
    const tmp = `${path}.tmp-${randomUUID()}`;
    try {
      mkdirSync(join(this.root, workspace, brand, RECEIPT_TYPE), { recursive: true });
      writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
      // linkSync fails with EEXIST if the canonical receipt appeared meanwhile:
      // under concurrent consumption exactly one attempt wins, and a receipt is
      // only ever born complete.
      linkSync(tmp, path);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        return err({
          kind: "approval-replay",
          receiptId,
          message: `nonce already consumed concurrently: receipt '${receiptId}' exists in ${workspace}/${brand}`,
        });
      }
      return err({ kind: "io-error", message: `receipt write failed for '${receiptId}': ${String(e)}` });
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // tmp already gone — nothing to clean up
      }
    }
    return ok({ path, receiptId });
  }

  /** Read one receipt from its own namespace (audit); receipts are immutable. */
  get(workspace: string, brand: string, receiptId: string): Result<Record<string, unknown>> {
    const addressed = this.#resolvePath(workspace, brand, receiptId);
    if (!addressed.ok) return addressed;
    if (!existsSync(addressed.value)) {
      return err({
        kind: "artifact-not-found",
        artifactId: receiptId,
        message: `receipt '${receiptId}' not found in ${workspace}/${brand}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(addressed.value, "utf8"));
    } catch (e) {
      return err({ kind: "io-error", message: `receipt read failed for '${receiptId}': ${String(e)}` });
    }
    const validated = this.registry.validate(RECEIPT_TYPE, parsed);
    if (!validated.ok) return validated;
    if (validated.value["workspace"] !== workspace || validated.value["brand_ref"] !== brand) {
      return err({
        kind: "namespace-violation",
        message: `stored receipt '${receiptId}' names namespace '${String(validated.value["workspace"])}/${String(validated.value["brand_ref"])}' but was read from '${workspace}/${brand}'`,
      });
    }
    // Same read-boundary invariant as FileArtifactStore.get (Phase 1B.3A).
    if (validated.value["receipt_id"] !== receiptId) {
      return err({
        kind: "artifact-address-mismatch",
        artifactId: receiptId,
        storedArtifactId: String(validated.value["receipt_id"]),
        message: `receipt stored at canonical address '${receiptId}' carries internal receipt_id '${String(validated.value["receipt_id"])}'; filename and internal identity must agree`,
      });
    }
    return validated;
  }
}
