// File-based content-addressed capture store (DEC-0006, INV-DATA-001, INV-VER-001,
// INV-SEC-002). Captured source material (prompt/text/markdown bytes) is persisted
// immutably under workspace/brand isolation, addressed by its SHA-256 digest:
//   <root>/<workspace>/<brand>/content/<clear|quarantine>/<sha256-hex>
// Flagged content lives only in the quarantine namespace; normal retrieval reads
// the clear namespace exclusively, and quarantined content is readable only when
// the caller supplies a human release record the runtime itself never fabricates.
// Error messages and results never echo captured content (no content in logs).
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import { type KernelFailure, type Result, err, ok } from "./result.js";

// Same conservative identifier rule as the artifact store.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const CONTENT_DIR = "content";
const CONTENT_REF = /^sha256:([0-9a-f]{64})$/;

export type ContentSafety = "clear" | "quarantine";

export interface CapturedContent {
  /** Canonical content reference: `sha256:<hex digest>`. */
  contentRef: string;
  sha256: string;
  bytes: number;
  safety: ContentSafety;
  /** True when an identical blob already existed in the same namespace. */
  deduplicated: boolean;
}

export interface QuarantineRelease {
  /** Human user id from a recorded quarantine-release approval (INV-HUM-001). */
  releasedBy: string;
  at: string;
  reason: string;
}

function sha256Hex(content: string): { digest: string; bytes: number } {
  const buf = Buffer.from(content, "utf8");
  return { digest: createHash("sha256").update(buf).digest("hex"), bytes: buf.byteLength };
}

export class FileContentStore {
  constructor(private readonly root: string) {}

  private checkSegment(field: string, value: string): KernelFailure | null {
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

  private resolveBlobPath(
    workspace: string,
    brand: string,
    safety: ContentSafety,
    digest: string
  ): Result<string> {
    for (const [field, value] of [
      ["workspace", workspace],
      ["brand", brand],
    ] as const) {
      const failure = this.checkSegment(field, value);
      if (failure) return err(failure);
    }
    if (!/^[0-9a-f]{64}$/.test(digest)) {
      return err({
        kind: "invalid-input",
        message: `content digest must be 64 lowercase hex characters`,
      });
    }
    const path = resolve(this.root, workspace, brand, CONTENT_DIR, safety, digest);
    const rel = relative(resolve(this.root), path);
    if (rel.startsWith("..") || rel.startsWith(sep)) {
      return err({
        kind: "namespace-violation",
        message: "resolved content path escapes the store root",
      });
    }
    const symlink = firstSymlinkWithin(resolve(this.root), path);
    if (symlink) {
      return err({
        kind: "namespace-violation",
        message: `content namespace path contains a symlink and is refused`,
      });
    }
    return ok(path);
  }

  /**
   * Persist content immutably under the given namespace and safety class.
   * Identical content in the same namespace deduplicates by digest; a digest
   * collision with different bytes is impossible to store (the blob is the digest).
   */
  put(
    workspace: string,
    brand: string,
    safety: ContentSafety,
    content: string
  ): Result<CapturedContent> {
    const { digest, bytes } = sha256Hex(content);
    const addressed = this.resolveBlobPath(workspace, brand, safety, digest);
    if (!addressed.ok) return addressed;
    const path = addressed.value;
    if (existsSync(path)) {
      // Deterministic dedup: the existing blob must still match its digest.
      const verified = this.verifyBlob(path, digest);
      if (!verified.ok) return verified;
      return ok({ contentRef: `sha256:${digest}`, sha256: digest, bytes, safety, deduplicated: true });
    }
    const tmp = `${path}.tmp-${randomUUID()}`;
    try {
      mkdirSync(join(this.root, workspace, brand, CONTENT_DIR, safety), { recursive: true });
      writeFileSync(tmp, content, "utf8");
      // linkSync fails with EEXIST if the blob appeared meanwhile; either way the
      // canonical blob is only ever born complete (same protection as artifacts).
      linkSync(tmp, path);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        return err({ kind: "io-error", message: `content write failed: ${code ?? "unknown error"}` });
      }
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // tmp already gone — nothing to clean up
      }
    }
    return ok({ contentRef: `sha256:${digest}`, sha256: digest, bytes, safety, deduplicated: false });
  }

  private verifyBlob(path: string, digest: string): Result<string> {
    let body: string;
    try {
      body = readFileSync(path, "utf8");
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      return err({ kind: "io-error", message: `content read failed: ${code ?? "unknown error"}` });
    }
    const actual = sha256Hex(body).digest;
    if (actual !== digest) {
      return err({
        kind: "namespace-violation",
        message: `content blob failed digest verification (expected sha256:${digest}); the blob was altered or corrupted`,
      });
    }
    return ok(body);
  }

  private getFrom(
    workspace: string,
    brand: string,
    safety: ContentSafety,
    contentRef: string
  ): Result<string> {
    const match = CONTENT_REF.exec(contentRef);
    if (!match) {
      return err({
        kind: "invalid-input",
        message: `content reference must have the form sha256:<64 hex chars>`,
      });
    }
    const digest = match[1]!;
    const addressed = this.resolveBlobPath(workspace, brand, safety, digest);
    if (!addressed.ok) return addressed;
    if (!existsSync(addressed.value)) {
      return err({
        kind: "artifact-not-found",
        artifactId: contentRef,
        message: `no ${safety} content for '${contentRef}' in ${workspace}/${brand}`,
      });
    }
    return this.verifyBlob(addressed.value, digest);
  }

  /**
   * Normal retrieval: clear namespace only. Quarantined content is structurally
   * unreachable through this method regardless of the digest supplied.
   */
  get(workspace: string, brand: string, contentRef: string): Result<string> {
    return this.getFrom(workspace, brand, "clear", contentRef);
  }

  /**
   * Quarantined retrieval requires an explicit human release record. The store
   * cannot authenticate the human (Q-001 is open); it enforces that the caller
   * carries a recorded release and that the runtime never reads quarantine
   * silently. Fabricating a release outside a recorded human approval violates
   * INV-HUM-001 and is rejected at the compile boundary, which requires a
   * quarantine-release approval on the source artifact itself.
   */
  getQuarantined(
    workspace: string,
    brand: string,
    contentRef: string,
    release: QuarantineRelease
  ): Result<string> {
    if (!release.releasedBy || !release.at || !release.reason) {
      return err({
        kind: "invalid-input",
        message:
          "quarantined content requires a human release record (releasedBy, at, reason); none may be fabricated by the runtime",
      });
    }
    return this.getFrom(workspace, brand, "quarantine", contentRef);
  }
}

/** Returns the first symlink found on the path from root (exclusive) to target (inclusive), or null. */
export function firstSymlinkWithin(root: string, target: string): string | null {
  const rel = relative(root, target);
  if (!rel || rel.startsWith("..")) return null;
  let current = root;
  for (const segment of rel.split(sep)) {
    current = join(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) return current;
    } catch {
      // Path component does not exist yet — nothing to follow.
      return null;
    }
  }
  return null;
}
