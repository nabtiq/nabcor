import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { BRAND, WS, registry, tempDir, validClaim, validSource } from "./helpers.js";

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

test("an artifact is stored, read back, and listed within its own brand namespace", () => {
  const store = new FileArtifactStore(tempDir("store"), registry());
  const put = store.put(WS, BRAND, "claim", validClaim());
  assert.ok(put.ok, JSON.stringify(put));
  const got = store.get(WS, BRAND, "claim", "claim_t_0001");
  assert.ok(got.ok);
  if (got.ok) assert.equal(got.value["statement"], "The company operates in Dubai");
  const listed = store.list(WS, BRAND, "claim");
  assert.ok(listed.ok);
  if (listed.ok) assert.deepEqual(listed.value, [{ type: "claim", artifactId: "claim_t_0001" }]);
});

test("cross-brand access is rejected", () => {
  const root = tempDir("store");
  const store = new FileArtifactStore(root, registry());
  assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok);

  // Reading from another brand namespace cannot reach the artifact.
  const other = store.get(WS, "brand_other", "claim", "claim_t_0001");
  assert.equal(other.ok, false);
  if (!other.ok) assert.equal(other.error.kind, "artifact-not-found");

  // Writing an artifact whose brand_ref names another brand is a namespace violation.
  const wrongBrand = store.put(WS, "brand_other", "claim", validClaim({ artifact_id: "claim_t_0002" }));
  assert.equal(wrongBrand.ok, false);
  if (!wrongBrand.ok) assert.equal(wrongBrand.error.kind, "namespace-violation");

  // A stored file whose brand_ref disagrees with its namespace is refused on read.
  const dir = join(root, WS, "brand_other", "claim");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "claim_t_0003.json"), JSON.stringify(validClaim({ artifact_id: "claim_t_0003" })));
  const mismatched = store.get(WS, "brand_other", "claim", "claim_t_0003");
  assert.equal(mismatched.ok, false);
  if (!mismatched.ok) assert.equal(mismatched.error.kind, "namespace-violation");
});

test("path traversal identifiers are rejected", () => {
  const store = new FileArtifactStore(tempDir("store"), registry());
  const cases: [string, string, string, Record<string, unknown>][] = [
    ["../escape", BRAND, "claim", validClaim()],
    [WS, "../other", "claim", validClaim()],
    [WS, BRAND, "../source", validClaim()],
    [WS, BRAND, "claim", validClaim({ artifact_id: "../../evil" })],
    [WS, BRAND, "claim", validClaim({ artifact_id: ".." })],
    [WS, BRAND, "claim", validClaim({ artifact_id: "a/b" })],
  ];
  for (const [ws, brand, type, artifact] of cases) {
    const result = store.put(ws, brand, type, artifact);
    assert.equal(result.ok, false, `expected rejection for ${ws}/${brand}/${type}`);
    if (!result.ok) assert.equal(result.error.kind, "unsafe-identifier");
  }
});

test("overwriting an existing artifact ID is rejected and the original is untouched", () => {
  const root = tempDir("store");
  const store = new FileArtifactStore(root, registry());
  assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok);
  const path = join(root, WS, BRAND, "claim", "claim_t_0001.json");
  const original = readFileSync(path, "utf8");
  const overwrite = store.put(WS, BRAND, "claim", validClaim({ statement: "Rewritten history" }));
  assert.equal(overwrite.ok, false);
  if (!overwrite.ok) assert.equal(overwrite.error.kind, "artifact-exists");
  assert.equal(readFileSync(path, "utf8"), original);
});

test("revisions require a new artifact ID with valid lineage", () => {
  const store = new FileArtifactStore(tempDir("store"), registry());
  assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok);
  const danglingLineage = store.put(
    WS,
    BRAND,
    "claim",
    validClaim({ artifact_id: "claim_t_0002", supersedes: "claim_missing" })
  );
  assert.equal(danglingLineage.ok, false);
  if (!danglingLineage.ok) assert.equal(danglingLineage.error.kind, "lineage-violation");

  const selfSupersede = store.put(
    WS,
    BRAND,
    "claim",
    validClaim({ artifact_id: "claim_t_0003", supersedes: "claim_t_0003" })
  );
  assert.equal(selfSupersede.ok, false);
  if (!selfSupersede.ok) assert.equal(selfSupersede.error.kind, "lineage-violation");

  const revision = store.put(
    WS,
    BRAND,
    "claim",
    validClaim({ artifact_id: "claim_t_0004", supersedes: "claim_t_0001", lifecycle_status: "revised" })
  );
  assert.ok(revision.ok, JSON.stringify(revision));
});

test("listing exposes only supported canonical types, deterministically sorted, skipping unexpected entries", () => {
  const root = tempDir("store");
  const store = new FileArtifactStore(root, registry());
  assert.ok(store.put(WS, BRAND, "claim", validClaim({ artifact_id: "claim_t_0002" })).ok);
  assert.ok(store.put(WS, BRAND, "claim", validClaim({ artifact_id: "claim_t_0001" })).ok);
  assert.ok(store.put(WS, BRAND, "source", validSource()).ok);
  // Plant entries the store must not follow or expose: an unsupported type
  // directory, a content namespace, a stray non-JSON file, and a symlinked file.
  mkdirSync(join(root, WS, BRAND, "decision"), { recursive: true });
  writeFileSync(join(root, WS, BRAND, "decision", "dec_t_0001.json"), "{}");
  mkdirSync(join(root, WS, BRAND, "content", "clear"), { recursive: true });
  writeFileSync(join(root, WS, BRAND, "content", "clear", "aaaa"), "blob");
  writeFileSync(join(root, WS, BRAND, "claim", "README.txt"), "not an artifact");
  symlinkSync(join(root, WS, BRAND, "claim", "claim_t_0001.json"), join(root, WS, BRAND, "claim", "claim_link.json"));

  const listed = store.list(WS, BRAND);
  assert.ok(listed.ok);
  if (listed.ok) {
    assert.deepEqual(listed.value, [
      { type: "claim", artifactId: "claim_t_0001" },
      { type: "claim", artifactId: "claim_t_0002" },
      { type: "source", artifactId: "src_t_0001" },
    ]);
  }
  // An explicitly supplied list type is validated exactly as get() validates it.
  const unsupported = store.list(WS, BRAND, "decision");
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) assert.equal(unsupported.error.kind, "unknown-artifact-type");
  const unsafe = store.list(WS, BRAND, "../claim");
  assert.equal(unsafe.ok, false);
  if (!unsafe.ok) assert.equal(unsafe.error.kind, "unsafe-identifier");
});

test("symlinked namespace components are refused for reads and writes (no symlink escape)", () => {
  const root = tempDir("store");
  const outside = tempDir("store-outside");
  const store = new FileArtifactStore(root, registry());
  // A symlinked brand directory pointing outside the root must be unusable.
  mkdirSync(join(root, WS), { recursive: true });
  symlinkSync(outside, join(root, WS, "brand_link"));
  const write = store.put(WS, "brand_link", "claim", validClaim({ brand_ref: "brand_link" }));
  assert.equal(write.ok, false);
  if (!write.ok) assert.equal(write.error.kind, "namespace-violation");
  const read = store.get(WS, "brand_link", "claim", "claim_t_0001");
  assert.equal(read.ok, false);
  if (!read.ok) assert.equal(read.error.kind, "namespace-violation");
  assert.equal(readdirSync(outside).length, 0, "nothing may be written through the symlink");
  // A symlinked artifact file is likewise refused on read.
  assert.ok(store.put(WS, BRAND, "claim", validClaim()).ok);
  symlinkSync(
    join(root, WS, BRAND, "claim", "claim_t_0001.json"),
    join(root, WS, BRAND, "claim", "claim_t_0009.json")
  );
  const linkedRead = store.get(WS, BRAND, "claim", "claim_t_0009");
  assert.equal(linkedRead.ok, false);
  if (!linkedRead.ok) assert.equal(linkedRead.error.kind, "namespace-violation");
});

test("a failed validation leaves no partial canonical artifact", () => {
  const root = tempDir("store");
  const store = new FileArtifactStore(root, registry());
  const invalid = validClaim({ classification: "factual", source_ref: null });
  const result = store.put(WS, BRAND, "claim", invalid);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "validation-failed");
  assert.equal(countFiles(root), 0, "store root must contain no files after a rejected write");
});
