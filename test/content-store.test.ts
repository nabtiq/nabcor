import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FileContentStore } from "../src/kernel/content-store.js";
import { BRAND, NOW, WS, tempDir } from "./helpers.js";

const CONTENT = "The bakery opened in 2019 in Deira.";
const digestOf = (s: string) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const RELEASE = { releasedBy: "user_owner", at: NOW, reason: "human reviewed" };

test("content is captured immutably, addressed by SHA-256, and read back exactly", () => {
  const store = new FileContentStore(tempDir("content"));
  const put = store.put(WS, BRAND, "clear", CONTENT);
  assert.ok(put.ok, JSON.stringify(put));
  if (!put.ok) return;
  assert.equal(put.value.sha256, digestOf(CONTENT));
  assert.equal(put.value.contentRef, `sha256:${digestOf(CONTENT)}`);
  assert.equal(put.value.bytes, Buffer.byteLength(CONTENT, "utf8"));
  assert.equal(put.value.deduplicated, false);
  const back = store.get(WS, BRAND, put.value.contentRef);
  assert.ok(back.ok);
  if (back.ok) assert.equal(back.value, CONTENT);
});

test("identical content in the same namespace deduplicates deterministically by digest", () => {
  const store = new FileContentStore(tempDir("content"));
  const first = store.put(WS, BRAND, "clear", CONTENT);
  const second = store.put(WS, BRAND, "clear", CONTENT);
  assert.ok(first.ok && second.ok);
  if (!first.ok || !second.ok) return;
  assert.equal(second.value.deduplicated, true);
  assert.equal(second.value.contentRef, first.value.contentRef);
  assert.equal(second.value.sha256, first.value.sha256);
});

test("cross-brand content reads fail even when the digest is known (INV-DATA-001)", () => {
  const store = new FileContentStore(tempDir("content"));
  const put = store.put(WS, BRAND, "clear", CONTENT);
  assert.ok(put.ok);
  if (!put.ok) return;
  const other = store.get(WS, "brand_other", put.value.contentRef);
  assert.equal(other.ok, false);
  if (!other.ok) assert.equal(other.error.kind, "artifact-not-found");
});

test("a tampered blob fails digest verification and never leaks its content in the error", () => {
  const root = tempDir("content");
  const store = new FileContentStore(root);
  const put = store.put(WS, BRAND, "clear", CONTENT);
  assert.ok(put.ok);
  if (!put.ok) return;
  const blobPath = join(root, WS, BRAND, "content", "clear", put.value.sha256);
  writeFileSync(blobPath, "tampered replacement text", "utf8");
  const read = store.get(WS, BRAND, put.value.contentRef);
  assert.equal(read.ok, false);
  if (!read.ok) {
    assert.equal(read.error.kind, "namespace-violation");
    assert.match(read.error.message, /digest verification/);
    assert.ok(!read.error.message.includes("tampered replacement text"), "errors must not echo content");
  }
});

test("quarantined content is unreachable through normal retrieval and requires a human release record", () => {
  const store = new FileContentStore(tempDir("content"));
  const put = store.put(WS, BRAND, "quarantine", CONTENT);
  assert.ok(put.ok);
  if (!put.ok) return;
  // Normal clear-content retrieval cannot return quarantined content.
  const clearRead = store.get(WS, BRAND, put.value.contentRef);
  assert.equal(clearRead.ok, false);
  if (!clearRead.ok) assert.equal(clearRead.error.kind, "artifact-not-found");
  // A release record without a human identity is refused.
  const emptyRelease = store.getQuarantined(WS, BRAND, put.value.contentRef, {
    releasedBy: "",
    at: NOW,
    reason: "r",
  });
  assert.equal(emptyRelease.ok, false);
  if (!emptyRelease.ok) assert.equal(emptyRelease.error.kind, "invalid-input");
  // A complete release record reads the quarantined bytes exactly.
  const released = store.getQuarantined(WS, BRAND, put.value.contentRef, RELEASE);
  assert.ok(released.ok);
  if (released.ok) assert.equal(released.value, CONTENT);
});

test("unsafe namespace identifiers and malformed references are rejected", () => {
  const store = new FileContentStore(tempDir("content"));
  const badWorkspace = store.put("../escape", BRAND, "clear", CONTENT);
  assert.equal(badWorkspace.ok, false);
  if (!badWorkspace.ok) assert.equal(badWorkspace.error.kind, "unsafe-identifier");
  const badBrand = store.put(WS, "..", "clear", CONTENT);
  assert.equal(badBrand.ok, false);
  const badRef = store.get(WS, BRAND, "sha256:nothex");
  assert.equal(badRef.ok, false);
  if (!badRef.ok) assert.equal(badRef.error.kind, "invalid-input");
  const traversalRef = store.get(WS, BRAND, "../../etc/passwd");
  assert.equal(traversalRef.ok, false);
});

test("symlinked namespace components are refused (no escape via planted links)", () => {
  const root = tempDir("content");
  const outside = tempDir("content-outside");
  const store = new FileContentStore(root);
  // Plant a symlinked workspace directory pointing outside the store root.
  symlinkSync(outside, join(root, "ws_link"));
  const write = store.put("ws_link", BRAND, "clear", CONTENT);
  assert.equal(write.ok, false);
  if (!write.ok) assert.equal(write.error.kind, "namespace-violation");
  const read = store.get("ws_link", BRAND, `sha256:${digestOf(CONTENT)}`);
  assert.equal(read.ok, false);
  // Nothing may have been written through the link.
  assert.throws(() => readFileSync(join(outside, BRAND, "content", "clear", digestOf(CONTENT))));
});
