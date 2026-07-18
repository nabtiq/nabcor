// Canonical signing format (DEC-0014): deterministic serialization, domain
// separation, digest stability, and raw Ed25519 sign/verify behavior.
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  APPROVAL_DOMAIN,
  approvalPayloadBytes,
  approvalPayloadDigest,
  ed25519PublicKeyFromSpkiB64,
  keyIdForSpkiDer,
  receiptIdFor,
  signApprovalPayload,
  verifyApprovalSignature,
} from "../src/authority/approval-payload.js";
import { canonicalJson } from "../src/kernel/canonical-json.js";
import { ephemeralAuthority } from "./authority-helpers.js";

test("canonical serialization is byte-equivalent across repeated runs and key insertion orders", () => {
  const a = { z: 1, m: [3, 1, 2], a: { y: "x", b: true } };
  const b = { a: { b: true, y: "x" }, m: [3, 1, 2], z: 1 };
  assert.equal(canonicalJson(a), canonicalJson(b), "insertion order must not affect the bytes");
  const first = approvalPayloadDigest(a);
  for (let i = 0; i < 50; i++) {
    assert.equal(approvalPayloadDigest(b), first, "repeated digesting must be byte-stable");
  }
  // Arrays keep their order — they are data, not sets.
  assert.notEqual(canonicalJson({ m: [1, 2, 3] }), canonicalJson({ m: [3, 2, 1] }));
});

test("object keys sort by code unit, never locale collation", () => {
  // Non-ASCII keys generated from code points (repository stays English-only):
  // code-unit order is "B" (U+0042) < "a" (U+0061) < U+00E9 < U+4E00; a
  // locale-aware sort would interleave these differently.
  const eAcute = String.fromCodePoint(0xe9);
  const cjk = String.fromCodePoint(0x4e00);
  const value = { [eAcute]: 1, a: 2, B: 3, [cjk]: 4 };
  assert.equal(canonicalJson(value), `{"B":3,"a":2,"${eAcute}":1,"${cjk}":4}`);
});

test("equivalent-looking but byte-different Unicode stays byte-distinct (no implicit normalization)", () => {
  // Composed U+00E9 versus decomposed "e" + combining U+0301 — visually
  // identical, byte-different; canonicalization must never normalize.
  const composed = { name: `caf${String.fromCodePoint(0xe9)}` };
  const decomposed = { name: `cafe${String.fromCodePoint(0x301)}` };
  assert.notEqual(canonicalJson(composed), canonicalJson(decomposed));
  assert.notEqual(approvalPayloadDigest(composed), approvalPayloadDigest(decomposed));
});

test("the signed bytes are domain-separated and versioned", () => {
  const payload = { x: 1 };
  const bytes = approvalPayloadBytes(payload);
  assert.ok(
    bytes.toString("utf8").startsWith(`${APPROVAL_DOMAIN}\n`),
    "signed bytes must begin with the versioned NABCor approval domain"
  );
  // A digest over the bare canonical JSON (no domain) must differ.
  const undomained = `sha256:${createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex")}`;
  assert.notEqual(approvalPayloadDigest(payload), undomained);
});

test("Ed25519 sign/verify roundtrip; modified payload and modified signature both fail", () => {
  const auth = ephemeralAuthority();
  const publicKey = ed25519PublicKeyFromSpkiB64(auth.spkiB64);
  assert.ok(publicKey, "test key must decode");
  const payload = { approval: "yes", n: 7 };
  const sig = signApprovalPayload(payload, auth.privateKeyPem);
  assert.ok(verifyApprovalSignature(payload, sig, publicKey!));
  assert.equal(
    verifyApprovalSignature({ approval: "yes", n: 8 }, sig, publicKey!),
    false,
    "any payload change must break the signature"
  );
  const tampered = Buffer.from(sig, "base64");
  tampered[0] = tampered[0]! ^ 0xff;
  assert.equal(verifyApprovalSignature(payload, tampered.toString("base64"), publicKey!), false);
});

test("a signature from a different key never verifies", () => {
  const signer = ephemeralAuthority();
  const other = ephemeralAuthority();
  const payload = { approval: "yes" };
  const sig = signApprovalPayload(payload, signer.privateKeyPem);
  const otherKey = ed25519PublicKeyFromSpkiB64(other.spkiB64);
  assert.equal(verifyApprovalSignature(payload, sig, otherKey!), false);
});

test("malformed signature encodings are rejected without throwing", () => {
  const auth = ephemeralAuthority();
  const publicKey = ed25519PublicKeyFromSpkiB64(auth.spkiB64);
  for (const bad of ["", "!!!", "AAAA", "A".repeat(87), "A".repeat(200)]) {
    assert.equal(verifyApprovalSignature({ x: 1 }, bad, publicKey!), false, `'${bad.slice(0, 8)}…' must fail`);
  }
});

test("SPKI decoding fails closed on malformed input and non-Ed25519 keys", () => {
  assert.equal(ed25519PublicKeyFromSpkiB64("not base64!!"), null);
  assert.equal(ed25519PublicKeyFromSpkiB64(Buffer.from("junk bytes").toString("base64")), null);
  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const ecB64 = ec.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  assert.equal(ed25519PublicKeyFromSpkiB64(ecB64), null, "an EC key must be refused");
});

test("key and receipt identities are deterministic digests", () => {
  const auth = ephemeralAuthority();
  const der = Buffer.from(auth.spkiB64, "base64");
  assert.equal(keyIdForSpkiDer(der), auth.keyId);
  assert.match(auth.keyId, /^k[0-9a-f]{64}$/);
  const r1 = receiptIdFor(auth.keyId, "0".repeat(32), "hgp-test-1");
  assert.equal(receiptIdFor(auth.keyId, "0".repeat(32), "hgp-test-1"), r1);
  assert.notEqual(receiptIdFor(auth.keyId, "1".repeat(32), "hgp-test-1"), r1, "nonce changes the identity");
  assert.notEqual(receiptIdFor(auth.keyId, "0".repeat(32), "hgp-other"), r1, "policy changes the identity");
});
