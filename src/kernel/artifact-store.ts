// File-based artifact store (DEC-0002, INV-VER-001, INV-DATA-001).
// Layout: <root>/<workspace>/<brand>/<type>/<artifact_id>.json
// Every artifact is validated before writing; artifacts are immutable per version
// (no overwrite — revisions need a new artifact_id plus lineage fields); writes are
// tmp-file + hard-link so a failed write can never leave a partial canonical file.
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import { SUPPORTED_ARTIFACT_TYPES, type ContractRegistry } from "./contract-registry.js";
import { firstSymlinkWithin } from "./content-store.js";
import { type KernelFailure, type Result, err, ok } from "./result.js";

// One conservative pattern for workspace, brand, type, and artifact identifiers:
// must start alphanumeric, then alphanumerics, dot, underscore, hyphen. This
// excludes path separators, "..", hidden files, and empty segments by construction.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

// Deterministic code-unit string comparison — never locale-dependent collation
// (DEC-0013: enumeration order must be byte-stable across environments).
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface StoreAddress {
  workspace: string;
  brand: string;
  type: string;
  artifactId: string;
}

export class FileArtifactStore {
  constructor(
    private readonly root: string,
    private readonly registry: ContractRegistry
  ) {}

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

  private resolveAddress(addr: StoreAddress): Result<string> {
    for (const [field, value] of [
      ["workspace", addr.workspace],
      ["brand", addr.brand],
      ["type", addr.type],
      ["artifact_id", addr.artifactId],
    ] as const) {
      const failure = this.checkSegment(field, value);
      if (failure) return err(failure);
    }
    if (!this.registry.isSupported(addr.type)) {
      return err({
        kind: "unknown-artifact-type",
        artifactType: addr.type,
        message: `artifact type '${addr.type}' is not a supported store type`,
      });
    }
    const path = resolve(this.root, addr.workspace, addr.brand, addr.type, `${addr.artifactId}.json`);
    // Defense in depth: path-relative containment (no string-prefix assumptions)
    // and no symlinked component anywhere inside the canonical namespace.
    const rel = relative(resolve(this.root), path);
    if (rel.startsWith("..") || rel.startsWith(sep)) {
      return err({
        kind: "namespace-violation",
        message: `resolved path escapes the store root for artifact '${addr.artifactId}'`,
      });
    }
    if (firstSymlinkWithin(resolve(this.root), path)) {
      return err({
        kind: "namespace-violation",
        message: `canonical namespace path for artifact '${addr.artifactId}' contains a symlink and is refused`,
      });
    }
    return ok(path);
  }

  /** Validate and persist a new artifact. Never overwrites an existing artifact ID. */
  put(workspace: string, brand: string, type: string, artifact: unknown): Result<{ path: string }> {
    const typeFailure = this.checkSegment("type", type);
    if (typeFailure) return err(typeFailure);
    const validated = this.registry.validate(type, artifact);
    if (!validated.ok) return validated;
    const data = validated.value;
    const artifactId = data["artifact_id"];
    if (typeof artifactId !== "string") {
      return err({ kind: "invalid-input", message: "artifact has no string artifact_id" });
    }
    const addressed = this.resolveAddress({ workspace, brand, type, artifactId });
    if (!addressed.ok) return addressed;
    const path = addressed.value;
    // Cross-brand writes are namespace violations (INV-DATA-001): the artifact's
    // own brand_ref must name the namespace it is written into.
    if (data["brand_ref"] !== brand) {
      return err({
        kind: "namespace-violation",
        message: `artifact brand_ref '${String(data["brand_ref"])}' does not match target brand namespace '${brand}'`,
      });
    }

    // Revisions: a new version is a new artifact ID linked by lineage (INV-VER-001).
    const supersedes = data["supersedes"];
    if (supersedes !== undefined && supersedes !== null) {
      if (typeof supersedes !== "string" || supersedes === artifactId) {
        return err({
          kind: "lineage-violation",
          message: `supersedes must name a different existing artifact (got '${String(supersedes)}')`,
        });
      }
      const prior = this.resolveAddress({ workspace, brand, type, artifactId: supersedes });
      if (!prior.ok) return prior;
      if (!existsSync(prior.value)) {
        return err({
          kind: "lineage-violation",
          message: `supersedes references '${supersedes}', which does not exist in ${workspace}/${brand}/${type}`,
        });
      }
    }

    if (existsSync(path)) {
      return err({
        kind: "artifact-exists",
        artifactId,
        message: `artifact '${artifactId}' already exists in ${workspace}/${brand}/${type}; revisions require a new artifact_id with lineage fields (INV-VER-001)`,
      });
    }
    const tmp = `${path}.tmp-${randomUUID()}`;
    try {
      mkdirSync(join(this.root, workspace, brand, type), { recursive: true });
      writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
      // linkSync fails with EEXIST if the canonical path appeared meanwhile, so a
      // canonical artifact is only ever born complete.
      linkSync(tmp, path);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        return err({
          kind: "artifact-exists",
          artifactId,
          message: `artifact '${artifactId}' already exists in ${workspace}/${brand}/${type}`,
        });
      }
      return err({ kind: "io-error", message: `write failed for '${artifactId}': ${String(e)}` });
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // tmp already gone — nothing to clean up
      }
    }
    return ok({ path });
  }

  /** Read one artifact from its own namespace; cross-brand reads are structurally impossible. */
  get(workspace: string, brand: string, type: string, artifactId: string): Result<Record<string, unknown>> {
    const addressed = this.resolveAddress({ workspace, brand, type, artifactId });
    if (!addressed.ok) return addressed;
    if (!existsSync(addressed.value)) {
      return err({
        kind: "artifact-not-found",
        artifactId,
        message: `artifact '${artifactId}' not found in ${workspace}/${brand}/${type}`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(addressed.value, "utf8"));
    } catch (e) {
      return err({ kind: "io-error", message: `read failed for '${artifactId}': ${String(e)}` });
    }
    const validated = this.registry.validate(type, parsed);
    if (!validated.ok) return validated;
    if (validated.value["brand_ref"] !== brand) {
      return err({
        kind: "namespace-violation",
        message: `stored artifact '${artifactId}' carries brand_ref '${String(validated.value["brand_ref"])}' but was read from brand namespace '${brand}'`,
      });
    }
    // Address integrity (DEC-0013 clarification, Phase 1B.3A): the canonical
    // filename IS the artifact's address, so the stored file's internal
    // artifact_id must equal the requested one for every supported type. A
    // mismatch means the file was tampered with or planted under a foreign
    // address; it is refused before any consumer can act on it.
    if (validated.value["artifact_id"] !== artifactId) {
      return err({
        kind: "artifact-address-mismatch",
        artifactId,
        storedArtifactId: String(validated.value["artifact_id"]),
        message: `artifact stored at canonical address '${artifactId}' in ${workspace}/${brand}/${type} carries internal artifact_id '${String(
          validated.value["artifact_id"]
        )}'; filename and internal identity must agree`,
      });
    }
    return validated;
  }

  /**
   * List artifact IDs in one workspace/brand namespace, optionally scoped to a type.
   * Only supported canonical artifact types are exposed (never content blobs or
   * unexpected directories); an explicit type is validated exactly as get() does;
   * results are deterministically sorted; symlinked or non-file entries are skipped.
   */
  list(workspace: string, brand: string, type?: string): Result<{ type: string; artifactId: string }[]> {
    for (const [field, value] of [
      ["workspace", workspace],
      ["brand", brand],
    ] as const) {
      const failure = this.checkSegment(field, value);
      if (failure) return err(failure);
    }
    if (type !== undefined) {
      const failure = this.checkSegment("type", type);
      if (failure) return err(failure);
      if (!this.registry.isSupported(type)) {
        return err({
          kind: "unknown-artifact-type",
          artifactType: type,
          message: `artifact type '${type}' is not a supported store type`,
        });
      }
    }
    const types = type ? [type] : [...SUPPORTED_ARTIFACT_TYPES];
    const out: { type: string; artifactId: string }[] = [];
    for (const t of types) {
      const dir = join(this.root, workspace, brand, t);
      if (!existsSync(dir)) continue;
      if (firstSymlinkWithin(resolve(this.root), resolve(dir))) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        out.push({ type: t, artifactId: entry.name.replace(/\.json$/, "") });
      }
    }
    out.sort((a, b) => (a.type === b.type ? byCodeUnit(a.artifactId, b.artifactId) : byCodeUnit(a.type, b.type)));
    return ok(out);
  }

  /**
   * Strict canonical enumeration of one type in one workspace/brand namespace
   * (DEC-0013 snapshot capture). Unlike list() — a browsing view that skips
   * irregular entries — every symlinked, non-file, non-.json, or unsafely
   * named entry in the namespace FAILS CLOSED: an entry that a snapshot would
   * silently omit could hide a canonical claim from analysis. A missing
   * namespace directory is a valid empty enumeration. Results are code-unit
   * sorted.
   */
  listStrict(workspace: string, brand: string, type: string): Result<string[]> {
    for (const [field, value] of [
      ["workspace", workspace],
      ["brand", brand],
      ["type", type],
    ] as const) {
      const failure = this.checkSegment(field, value);
      if (failure) return err(failure);
    }
    if (!this.registry.isSupported(type)) {
      return err({
        kind: "unknown-artifact-type",
        artifactType: type,
        message: `artifact type '${type}' is not a supported store type`,
      });
    }
    const dir = join(this.root, workspace, brand, type);
    if (!existsSync(dir)) return ok([]);
    if (firstSymlinkWithin(resolve(this.root), resolve(dir))) {
      return err({
        kind: "namespace-violation",
        message: `canonical namespace ${workspace}/${brand}/${type} contains a symlinked path component and is refused`,
      });
    }
    const ids: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || !entry.isFile() || !entry.name.endsWith(".json")) {
        return err({
          kind: "namespace-violation",
          message: `canonical namespace ${workspace}/${brand}/${type} contains irregular entry '${entry.name}' (symlinked, non-file, or non-canonical name); strict enumeration fails closed rather than hiding it`,
        });
      }
      const artifactId = entry.name.replace(/\.json$/, "");
      const failure = this.checkSegment("artifact_id", artifactId);
      if (failure) return err(failure);
      ids.push(artifactId);
    }
    ids.sort(byCodeUnit);
    return ok(ids);
  }
}
