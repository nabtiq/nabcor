// Canonical signed approval payload (DEC-0014).
//
// Algorithm "approval-payload-sha256-1.0.0", versioned so a future change can
// never silently reinterpret stored digests or signatures:
//   - The signed bytes are strict UTF-8 of
//       "<domain separator>" + "\n" + canonicalJson(payload)
//     using the DEC-0013 canonical JSON serializer (code-unit-sorted object
//     keys, no whitespace, no locale-dependent collation, no implicit Unicode
//     normalization — byte-different strings stay byte-distinct).
//   - The payload digest is `sha256:<hex>` over exactly those bytes.
//   - Ed25519 signs exactly those bytes; verification operates on the same
//     bytes reconstructed from the validated payload, so a payload altered
//     after signing (or a duplicate JSON field collapsing differently) can
//     never verify.
//
// The same digest computation is mirrored in contracts/validate.mjs so fixture
// validation can recompute it offline; the two implementations must change
// together. Only Node.js built-in crypto is used (DEC-0014: no new
// cryptographic dependency).
import { createHash, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { canonicalJson } from "../kernel/canonical-json.js";

export const APPROVAL_DOMAIN = "nabcor-human-gate-approval-v1";
export const APPROVAL_PAYLOAD_TYPE = "nabcor-human-gate-approval";
export const APPROVAL_PAYLOAD_VERSION = "1.0.0";
export const APPROVAL_CANONICALIZATION = "approval-payload-sha256-1.0.0";
export const RECEIPT_ALGORITHM = "approval-receipt-id-sha256-1.0.0";
/** Upper bound on the canonical payload byte length; larger payloads are refused. */
export const MAX_PAYLOAD_BYTES = 16384;

/** The exact bytes that are signed and digested: domain separator + LF + canonical JSON. */
export function approvalPayloadBytes(payload: Record<string, unknown>): Buffer {
  return Buffer.from(`${APPROVAL_DOMAIN}\n${canonicalJson(payload)}`, "utf8");
}

/** `sha256:<hex>` digest over the domain-separated canonical payload bytes. */
export function approvalPayloadDigest(payload: Record<string, unknown>): string {
  return `sha256:${createHash("sha256").update(approvalPayloadBytes(payload)).digest("hex")}`;
}

/** Deterministic key identity: 'k' + sha256 hex over the SPKI DER bytes. */
export function keyIdForSpkiDer(spkiDer: Buffer): string {
  return `k${createHash("sha256").update(spkiDer).digest("hex")}`;
}

/**
 * Deterministic replay-receipt identity over the full consumption scope: the
 * trusted policy reference, the signing key, the nonce, and the signed
 * workspace/brand namespace. Nonce single-use is scoped per
 * (policy, key, workspace, brand) — workspace and brand are signature-covered
 * payload fields, so one signed approval maps to exactly one consumable
 * receipt identity, and the first persisted receipt blocks every later
 * consumption attempt of that approval. Receipt IDs are globally unique
 * across namespaces because the namespace participates in the digest.
 */
export function receiptIdFor(
  keyId: string,
  nonce: string,
  policyRef: string,
  workspace: string,
  brandRef: string
): string {
  return `r${createHash("sha256")
    .update(
      canonicalJson({
        brand_ref: brandRef,
        key_id: keyId,
        nonce,
        policy_ref: policyRef,
        workspace,
      }),
      "utf8"
    )
    .digest("hex")}`;
}

/**
 * Decode a registry SPKI base64 string into an Ed25519 public key object.
 * Returns null (never throws) on non-canonical base64, malformed SPKI, or any
 * key type other than Ed25519 — the caller fails closed.
 */
export function ed25519PublicKeyFromSpkiB64(spkiB64: string): KeyObject | null {
  const der = Buffer.from(spkiB64, "base64");
  if (der.toString("base64") !== spkiB64) return null;
  let key: KeyObject;
  try {
    key = createPublicKey({ key: der, format: "der", type: "spki" });
  } catch {
    return null;
  }
  return key.asymmetricKeyType === "ed25519" ? key : null;
}

/**
 * Verify an Ed25519 signature over the domain-separated canonical payload
 * bytes. Returns false (never throws) on any mismatch or malformed input.
 */
export function verifyApprovalSignature(
  payload: Record<string, unknown>,
  signatureB64: string,
  publicKey: KeyObject
): boolean {
  const signature = Buffer.from(signatureB64, "base64");
  if (signature.length !== 64 || signature.toString("base64") !== signatureB64) return false;
  try {
    return edVerify(null, approvalPayloadBytes(payload), publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Sign the domain-separated canonical payload bytes with an Ed25519 private
 * key (PEM PKCS#8). Operator tooling and tests only — the runtime verifier
 * never holds or receives private key material.
 */
export function signApprovalPayload(payload: Record<string, unknown>, privateKeyPem: string): string {
  return edSign(null, approvalPayloadBytes(payload), privateKeyPem).toString("base64");
}
