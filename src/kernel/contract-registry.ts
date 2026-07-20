// Contract registry: the existing JSON Schemas in contracts/ are the canonical
// runtime authority (INV-DET-001). This module compiles them once, maps artifact
// types to schema IDs, and validates artifacts before they cross a runtime
// boundary. It deliberately does NOT re-declare the schemas as TypeScript
// interfaces — artifacts stay `unknown` until validated, so there is one source
// of truth.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import AjvModule from "ajv";
import type { ValidateFunction } from "ajv";
import addFormatsModule from "ajv-formats";

// ajv/ajv-formats ship CJS whose module.exports also carries `.default`; under
// NodeNext the `.default` property is the correctly typed constructor/plugin at
// both compile time and runtime.
const Ajv = AjvModule.default;
const addFormats = addFormatsModule.default;
import { createHash, createPublicKey } from "node:crypto";
import { approvalPayloadDigest, receiptIdFor } from "../authority/approval-payload.js";
import {
  afterAnalysisIdFor,
  afterSnapshotIdFor,
  applicationIdFor,
  contradictionFingerprint,
  successorIdFor,
} from "../resolve/resolution-ids.js";
import { claimSetDigest, contentDigest } from "./canonical-json.js";
import { type Result, type ValidationIssue, err, ok } from "./result.js";
import { parseSourceRef } from "./source-ref.js";

// Artifact types the Phase 1A/1B kernel stores and exchanges. Other contracts
// (decision, evaluation-report, ...) compile too, but only these cross the
// kernel's runtime boundaries in this phase.
export const SUPPORTED_ARTIFACT_TYPES = [
  "source",
  "claim",
  "assumption",
  "brand-context",
  "claim-snapshot",
  "truth-profile",
  "truth-analysis",
  "fact-resolution-decision",
  "fact-resolution-application",
  "provider-policy-candidate",
  "live-provider-call-request",
  "provider-smoke-echo",
] as const;
export type SupportedArtifactType = (typeof SUPPORTED_ARTIFACT_TYPES)[number];

interface SemanticCheck {
  invariant: string;
  check: (data: Record<string, unknown>) => string[];
}

// Authenticated human-gate evidence (DEC-0014) — the digest and receipt-id
// algorithms live in src/authority/approval-payload.ts and are mirrored in
// contracts/validate.mjs (those two must change together; this module imports
// the canonical implementation instead of holding a third copy).
const approvalPayloadDigestOf = (payload: unknown): string =>
  approvalPayloadDigest(payload as Record<string, unknown>);
const receiptIdOf = (d: Record<string, unknown>): string =>
  receiptIdFor(
    String(d["key_id"]),
    String(d["nonce"]),
    String(d["policy_ref"]),
    String(d["workspace"]),
    String(d["brand_ref"])
  );
const INDEPENDENT_REVIEW_GATES = [
  "quarantine-release",
  "client-facing-publishing",
  "blocking-evaluation-gate-change",
  "real-client-data-provider-approval",
];

interface AuthorityRecord {
  key_id: string;
  public_key_spki_b64: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  revoked_at?: string;
  revocation_reason?: string;
}

// Provider-policy candidate self-integrity (DEC-0019) — mirrored in
// contracts/validate.mjs (the two must change together): candidate_digest is
// sha256 over the canonical JSON of the candidate WITHOUT the digest field.
export function candidateSelfDigest(candidate: Record<string, unknown>): string {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (k !== "candidate_digest") rest[k] = v;
  }
  return contentDigest(rest);
}

/** sha256 over the canonical JSON of a live-provider-call-request WITHOUT its digest field (DEC-0020). */
export function requestSelfDigest(request: Record<string, unknown>): string {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(request)) {
    if (k !== "request_digest") rest[k] = v;
  }
  return contentDigest(rest);
}

// Deterministic cross-field checks the schemas cannot express, mirrored from
// contracts/validate.mjs for the types this kernel exchanges at runtime.
const SEMANTIC_CHECKS: Record<string, SemanticCheck[]> = {
  "live-provider-call-request": [
    {
      invariant: "DEC-0020 request-digest-consistency",
      check: (d) => {
        const recomputed = requestSelfDigest(d);
        return d["request_digest"] === recomputed
          ? []
          : [
              `request_digest '${String(d["request_digest"])}' does not match the recomputed canonical digest '${recomputed}'`,
            ];
      },
    },
    {
      invariant: "DEC-0020 validity-window-ordered",
      check: (d) =>
        Date.parse(String(d["valid_until"])) > Date.parse(String(d["valid_from"]))
          ? []
          : [`valid_until '${String(d["valid_until"])}' must be after valid_from '${String(d["valid_from"])}'`],
    },
    {
      invariant: "DEC-0020 sorted-unique-fixtures",
      check: (d) => {
        const out: string[] = [];
        const ids = ((d["synthetic_fixture_refs"] ?? []) as { fixture_id: string }[]).map((f) => f.fixture_id);
        for (let i = 1; i < ids.length; i++)
          if (!(ids[i]! > ids[i - 1]!))
            out.push(`synthetic_fixture_refs not strictly sorted by fixture_id: '${ids[i]}' follows '${ids[i - 1]}'`);
        return out;
      },
    },
  ],
  "provider-operational-state": [
    {
      invariant: "DEC-0020 operational-state-machine",
      check: (d) => {
        const out: string[] = [];
        const s = d["operational_state"];
        const expect = (field: string, want: unknown): void => {
          if (d[field] !== want)
            out.push(`state ${String(s)} requires ${field}=${JSON.stringify(want)}, found ${JSON.stringify(d[field])}`);
        };
        if (s === "CONFIGURED_BUT_LIVE_DISABLED") {
          expect("credential_provisioned", false);
          expect("console_spend_cap_configured", false);
          expect("smoke_call_completed", false);
          expect("live_call_request_ref", null);
          expect("live_call_receipt_ref", null);
          expect("reconciliation_ref", null);
        } else if (s === "SMOKE_CALL_AUTHORIZED") {
          expect("credential_provisioned", true);
          expect("console_spend_cap_configured", true);
          expect("smoke_call_completed", false);
          if (d["live_call_request_ref"] === null)
            out.push("state SMOKE_CALL_AUTHORIZED requires a non-null live_call_request_ref");
          expect("live_call_receipt_ref", null);
          expect("reconciliation_ref", null);
        } else if (s === "SMOKE_VERIFIED_EXP_DISABLED") {
          expect("credential_provisioned", true);
          expect("console_spend_cap_configured", true);
          expect("smoke_call_completed", true);
          if (d["live_call_request_ref"] === null)
            out.push("state SMOKE_VERIFIED_EXP_DISABLED requires a non-null live_call_request_ref");
          if (d["live_call_receipt_ref"] === null)
            out.push("state SMOKE_VERIFIED_EXP_DISABLED requires a consumed live_call_receipt_ref");
          if (d["reconciliation_ref"] === null)
            out.push("state SMOKE_VERIFIED_EXP_DISABLED requires a reconciliation_ref");
        }
        return out;
      },
    },
  ],
  "provider-smoke-result": [
    {
      invariant: "DEC-0020 status-failure-consistency",
      check: (d) => {
        const out: string[] = [];
        if (d["status"] === "succeeded") {
          if (d["failure_reason"] !== null) out.push("a succeeded smoke result must carry failure_reason null");
          if (d["returned_model"] !== d["requested_model"])
            out.push("a succeeded smoke result must have returned_model equal to requested_model");
          if (d["output_artifact_digest"] === null)
            out.push("a succeeded smoke result must carry the validated output_artifact_digest");
          if (d["live_call_receipt_ref"] === null)
            out.push("a succeeded smoke result must carry the consumed live_call_receipt_ref");
        } else if (d["status"] === "failed") {
          if (d["failure_reason"] === null) out.push("a failed smoke result must carry a typed failure_reason");
          if (d["output_artifact_digest"] !== null)
            out.push("a failed smoke result must not carry an output artifact digest (no partial artifact)");
        }
        if ((d["settled_usd"] as number) > (d["reserved_usd"] as number))
          out.push("settled_usd must never exceed reserved_usd");
        return out;
      },
    },
  ],
  "provider-reconciliation-record": [
    {
      invariant: "DEC-0020 reconciled-consistency",
      check: (d) => {
        const out: string[] = [];
        if (d["reconciled"] === true) {
          if (d["requests_observed"] !== 1) out.push("reconciled requires exactly one observed request");
          if (d["returned_model_matches"] !== true) out.push("reconciled requires the returned model to match");
          if (d["hard_cap_active"] !== true) out.push("reconciled requires the USD 60 hard cap to remain active");
          if ((d["local_settled_usd"] as number) > 0.25)
            out.push("reconciled requires the charge to be no greater than USD 0.25");
          if (d["usd_within_tolerance"] !== true) out.push("reconciled requires usd_within_tolerance");
          if (d["provider_usd"] === null && d["precision_limitation"] !== true)
            out.push("reconciled with no provider_usd requires precision_limitation=true (never a silent match)");
          if (
            d["provider_usd"] !== null &&
            Math.abs((d["local_settled_usd"] as number) - (d["provider_usd"] as number)) > 0.01
          )
            out.push("reconciled requires the local cost within USD 0.01 of the provider-visible cost");
        }
        return out;
      },
    },
  ],
  "provider-policy-candidate": [
    {
      invariant: "DEC-0019 candidate-digest-consistency",
      check: (d) => {
        const recomputed = candidateSelfDigest(d);
        return d["candidate_digest"] === recomputed
          ? []
          : [
              `candidate_digest '${String(d["candidate_digest"])}' does not match the recomputed canonical digest '${recomputed}' over the candidate without its digest field`,
            ];
      },
    },
    {
      invariant: "DEC-0019 validity-window-ordered",
      check: (d) =>
        Date.parse(String(d["valid_until"])) > Date.parse(String(d["valid_from"]))
          ? []
          : [
              `valid_until '${String(d["valid_until"])}' must be after valid_from '${String(d["valid_from"])}'`,
            ],
    },
    {
      invariant: "DEC-0019 sorted-unique-model-allowlist",
      check: (d) => {
        const out: string[] = [];
        const ids = ((d["allowed_models"] ?? []) as { model_id: string }[]).map((m) => m.model_id);
        for (let i = 1; i < ids.length; i++) {
          if (!(ids[i]! > ids[i - 1]!))
            out.push(
              `allowed_models not strictly sorted by model_id: '${ids[i]}' follows '${ids[i - 1]}'`
            );
        }
        return out;
      },
    },
  ],
  "human-gate-policy": [
    {
      invariant: "DEC-0014 gate-requirements-cover-allowed-gates",
      check: (d) => {
        const out: string[] = [];
        const allowed = (d["allowed_gates"] ?? []) as string[];
        const keys = Object.keys((d["gate_requirements"] ?? {}) as Record<string, unknown>);
        for (const g of allowed)
          if (!keys.includes(g)) out.push(`allowed gate '${g}' has no gate_requirements entry`);
        for (const k of keys)
          if (!allowed.includes(k)) out.push(`gate_requirements entry '${k}' is not in allowed_gates`);
        return out;
      },
    },
    {
      invariant: "DEC-0008/DEC-0014 independent-review-gates-pinned",
      check: (d) => {
        const out: string[] = [];
        const requirements = (d["gate_requirements"] ?? {}) as Record<
          string,
          { independent_review_required?: boolean }
        >;
        for (const g of INDEPENDENT_REVIEW_GATES) {
          const req = requirements[g];
          if (req && req.independent_review_required !== true)
            out.push(
              `gate '${g}' must carry independent_review_required=true (DEC-0008 independent-review gate)`
            );
        }
        return out;
      },
    },
  ],
  "authority-registry": [
    {
      invariant: "DEC-0014 unique-key-ids",
      check: (d) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const a of (d["authorities"] ?? []) as AuthorityRecord[]) {
          if (seen.has(a.key_id)) out.push(`duplicate key_id '${a.key_id}' in authorities`);
          seen.add(a.key_id);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0014 key-id-binds-spki-ed25519",
      check: (d) => {
        const out: string[] = [];
        for (const a of (d["authorities"] ?? []) as AuthorityRecord[]) {
          const der = Buffer.from(a.public_key_spki_b64, "base64");
          if (der.toString("base64") !== a.public_key_spki_b64) {
            out.push(`authority '${a.key_id}': public_key_spki_b64 is not canonical base64`);
            continue;
          }
          let keyType: string | undefined;
          try {
            keyType = createPublicKey({ key: der, format: "der", type: "spki" }).asymmetricKeyType;
          } catch {
            out.push(
              `authority '${a.key_id}': public_key_spki_b64 does not decode as a valid SPKI public key`
            );
            continue;
          }
          if (keyType !== "ed25519") {
            out.push(`authority '${a.key_id}': key type '${String(keyType)}' is not ed25519`);
            continue;
          }
          const recomputed = `k${createHash("sha256").update(der).digest("hex")}`;
          if (a.key_id !== recomputed)
            out.push(
              `authority key_id '${a.key_id}' does not match the sha256 of its SPKI bytes ('${recomputed}')`
            );
        }
        return out;
      },
    },
    {
      invariant: "DEC-0014 validity-window-ordered",
      check: (d) =>
        ((d["authorities"] ?? []) as AuthorityRecord[])
          .filter(
            (a) => a.valid_until !== null && Date.parse(a.valid_until) <= Date.parse(a.valid_from)
          )
          .map((a) => `authority '${a.key_id}': valid_until must be after valid_from`),
    },
    {
      invariant: "DEC-0014 revocation-metadata-consistency",
      check: (d) => {
        const out: string[] = [];
        for (const a of (d["authorities"] ?? []) as AuthorityRecord[]) {
          if (a.status === "revoked" && (!a.revoked_at || !a.revocation_reason))
            out.push(`revoked authority '${a.key_id}' must carry revoked_at and revocation_reason`);
          if (a.status === "active" && (a.revoked_at || a.revocation_reason))
            out.push(`active authority '${a.key_id}' must not carry revocation metadata`);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0014 registry-lineage",
      check: (d) => {
        const version = d["registry_version"] as number;
        const supersedes = d["supersedes_registry_version"] as number | null;
        if (supersedes === null)
          return version === 1
            ? []
            : [
                `registry_version ${version} with null supersedes_registry_version (only version 1 may have no predecessor)`,
              ];
        return supersedes === version - 1
          ? []
          : [
              `supersedes_registry_version ${supersedes} must be exactly registry_version - 1 (${version - 1})`,
            ];
      },
    },
  ],
  "approval-evidence": [
    {
      invariant: "DEC-0014 payload-digest-consistency",
      check: (d) => {
        const recomputed = approvalPayloadDigestOf(d["payload"] ?? {});
        return d["payload_digest"] === recomputed
          ? []
          : [
              `payload_digest '${String(d["payload_digest"])}' does not match the recomputed domain-separated canonical digest '${recomputed}'`,
            ];
      },
    },
    {
      invariant: "DEC-0014 expires-after-issued",
      check: (d) => {
        const p = (d["payload"] ?? {}) as Record<string, unknown>;
        return Date.parse(String(p["expires_at"])) > Date.parse(String(p["issued_at"]))
          ? []
          : [`expires_at '${String(p["expires_at"])}' must be after issued_at '${String(p["issued_at"])}'`];
      },
    },
    {
      invariant: "DEC-0008/DEC-0014 self-review-consistency",
      check: (d) => {
        const p = (d["payload"] ?? {}) as Record<string, unknown>;
        const computed = p["requester_id"] === p["approver_id"];
        return p["self_review"] === computed
          ? []
          : [
              `self_review=${String(p["self_review"])} does not match the computed value ${String(computed)} (requester_id ${computed ? "equals" : "differs from"} approver_id)`,
            ];
      },
    },
  ],
  "approval-receipt": [
    {
      invariant: "DEC-0014 receipt-id-consistency",
      check: (d) => {
        const recomputed = receiptIdOf(d);
        return d["receipt_id"] === recomputed
          ? []
          : [
              `receipt_id '${String(d["receipt_id"])}' does not match the recomputation '${recomputed}' over {brand_ref, key_id, nonce, policy_ref, workspace}`,
            ];
      },
    },
  ],
  claim: [
    {
      invariant: "INV-FACT-002 inference-verification-needs-human",
      check: (d) =>
        d["classification"] === "inference" &&
        d["verification_status"] === "verified" &&
        !d["verified_by"]
          ? ["inference claim marked verified without verified_by (human confirmation)"]
          : [],
    },
    {
      invariant: "INV-FACT-001 codepoints-fragment-ordered",
      check: (d) => {
        const ref = d["source_ref"];
        if (typeof ref !== "string") return [];
        const parsed = parseSourceRef(ref);
        if (parsed?.fragment?.kind === "codepoints" && parsed.fragment.start >= parsed.fragment.end) {
          return [
            `source_ref code-point fragment ${parsed.fragment.start}-${parsed.fragment.end} is invalid: start must be less than end`,
          ];
        }
        return [];
      },
    },
  ],
  source: [
    {
      invariant: "INV-SEC-002 flagged-captured-content-must-be-quarantined",
      check: (d) => {
        const capture = d["capture"] as Record<string, unknown> | undefined;
        if (
          d["injection_flag"] === true &&
          capture?.["status"] === "captured" &&
          capture["safety"] !== "quarantined"
        ) {
          return [
            "captured content is injection-flagged but not in the quarantine namespace (a flag is not a quarantine)",
          ];
        }
        return [];
      },
    },
  ],
  "truth-profile": [
    {
      invariant: "DEC-0011 unique-sorted-fact-keys",
      check: (d) => {
        // Code-unit comparison, never locale-dependent collation, so ordering
        // is byte-stable across environments (DEC-0011 determinism).
        const out: string[] = [];
        const slots = (d["slots"] ?? []) as { fact_key: string }[];
        for (let i = 1; i < slots.length; i++) {
          const prev = slots[i - 1]!.fact_key;
          const cur = slots[i]!.fact_key;
          if (cur === prev) out.push(`duplicate fact_key '${cur}' in slots`);
          else if (cur < prev) out.push(`slots not deterministically sorted: '${cur}' follows '${prev}'`);
        }
        return out;
      },
    },
  ],
  "model-run": [
    {
      invariant: "INV-OBS-001 cost-mode-consistency",
      check: (d) => {
        const out: string[] = [];
        const c = (d["cost"] ?? {}) as Record<string, unknown>;
        if (c["mode"] === "api" && (typeof c["usd"] !== "number" || c["allocation"] !== "measured"))
          out.push("cost.mode=api requires numeric usd and allocation=measured");
        if (c["mode"] === "subscription" && (c["usd"] !== null || c["allocation"] !== "none"))
          out.push("cost.mode=subscription requires usd=null and allocation=none (never conflated)");
        return out;
      },
    },
  ],
  "claim-snapshot": [
    {
      invariant: "DEC-0013 sorted-unique-claim-refs",
      check: (d) => {
        const out: string[] = [];
        const pairs = (d["claims"] ?? []) as { claim_ref: string }[];
        for (let i = 1; i < pairs.length; i++) {
          const prev = pairs[i - 1]!.claim_ref;
          const cur = pairs[i]!.claim_ref;
          if (cur === prev) out.push(`duplicate claim_ref '${cur}' in snapshot claims`);
          else if (cur < prev) out.push(`snapshot claims not deterministically sorted: '${cur}' follows '${prev}'`);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0013 aggregate-digest-consistency",
      check: (d) => {
        // The aggregate digest must equal the recomputation over the listed
        // per-claim pairs (algorithm claim-set-sha256-1.0.0): a fabricated
        // aggregate cannot claim to bind contents it does not bind.
        const pairs = (d["claims"] ?? []) as { claim_ref: string; content_digest: string }[];
        const recomputed = claimSetDigest(
          pairs.map((p) => ({ claim_ref: p.claim_ref, content_digest: p.content_digest }))
        );
        return d["claim_set_digest"] === recomputed
          ? []
          : [
              `claim_set_digest '${String(d["claim_set_digest"])}' does not match the recomputed aggregate '${recomputed}' over the listed claim digests`,
            ];
      },
    },
  ],
  "fact-resolution-decision": [
    {
      invariant: "DEC-0016 fingerprint-consistency",
      check: (d) => {
        const c = (d["contradiction"] ?? {}) as Record<string, unknown>;
        const recomputed = contradictionFingerprint(
          String(d["workspace"]),
          String(d["brand_ref"]),
          String(d["fact_key"]),
          (c["claim_refs"] ?? []) as string[],
          (c["distinct_values"] ?? []) as (string | number | boolean)[]
        );
        return d["contradiction_fingerprint"] === recomputed
          ? []
          : [
              `contradiction_fingerprint '${String(d["contradiction_fingerprint"])}' does not match the recomputation '${recomputed}' over {brand_ref, claim_refs, distinct_values, fact_key, workspace}`,
            ];
      },
    },
    {
      invariant: "DEC-0016 exact-partition",
      check: (d) => {
        const out: string[] = [];
        const participants = (((d["contradiction"] ?? {}) as Record<string, unknown>)["claim_refs"] ??
          []) as string[];
        const losers = ((d["losing_claims"] ?? []) as { claim_ref: string }[]).map((l) => l.claim_ref);
        const winner = String(d["winning_claim_ref"]);
        if (!participants.includes(winner))
          out.push(`winning_claim_ref '${winner}' is not a participant of the recorded contradiction`);
        if (losers.includes(winner))
          out.push(
            `winning_claim_ref '${winner}' also appears as a losing claim; winner and losers must be disjoint`
          );
        const loserSet = new Set(losers);
        if (loserSet.size !== losers.length) out.push("losing_claims contains duplicate claim references");
        for (const l of losers)
          if (!participants.includes(l))
            out.push(`losing claim '${l}' is not a participant of the recorded contradiction`);
        for (const p of participants)
          if (p !== winner && !loserSet.has(p))
            out.push(
              `participant '${p}' is neither the winner nor a losing claim; partial resolution is prohibited`
            );
        return out;
      },
    },
    {
      invariant: "DEC-0016 sorted-unique-references",
      check: (d) => {
        const out: string[] = [];
        const sortedAsc = (arr: string[], label: string): void => {
          for (let i = 1; i < arr.length; i++) {
            if (!(arr[i]! > arr[i - 1]!))
              out.push(`${label} not strictly sorted: '${arr[i]}' follows '${arr[i - 1]}'`);
          }
        };
        sortedAsc(
          (((d["contradiction"] ?? {}) as Record<string, unknown>)["claim_refs"] ?? []) as string[],
          "contradiction.claim_refs"
        );
        sortedAsc(
          ((d["losing_claims"] ?? []) as { claim_ref: string }[]).map((l) => l.claim_ref),
          "losing_claims claim_refs"
        );
        return out;
      },
    },
  ],
  "fact-resolution-application": [
    {
      invariant: "DEC-0016 application-id-consistency",
      check: (d) => {
        const recomputed = applicationIdFor(String(d["decision_digest"]), String(d["receipt_ref"]));
        return d["artifact_id"] === recomputed
          ? []
          : [
              `artifact_id '${String(d["artifact_id"])}' does not match the recomputation '${recomputed}' over {decision_digest, receipt_ref}`,
            ];
      },
    },
    {
      invariant: "DEC-0016 derived-id-consistency",
      check: (d) => {
        const out: string[] = [];
        const applicationRef = String(d["artifact_id"]);
        for (const r of (d["created_losing_revisions"] ?? []) as {
          losing_claim_ref: string;
          successor_claim_ref: string;
        }[]) {
          const recomputed = successorIdFor(applicationRef, r.losing_claim_ref);
          if (r.successor_claim_ref !== recomputed)
            out.push(
              `successor_claim_ref '${r.successor_claim_ref}' for losing claim '${r.losing_claim_ref}' does not match the recomputation '${recomputed}'`
            );
        }
        const fsn = afterSnapshotIdFor(applicationRef);
        if (d["after_snapshot_ref"] !== fsn)
          out.push(`after_snapshot_ref '${String(d["after_snapshot_ref"])}' does not match the recomputation '${fsn}'`);
        const fan = afterAnalysisIdFor(applicationRef);
        if (d["after_analysis_ref"] !== fan)
          out.push(`after_analysis_ref '${String(d["after_analysis_ref"])}' does not match the recomputation '${fan}'`);
        return out;
      },
    },
    {
      invariant: "DEC-0016 sorted-unique-losing-revisions",
      check: (d) => {
        const out: string[] = [];
        const refs = ((d["created_losing_revisions"] ?? []) as { losing_claim_ref: string }[]).map(
          (r) => r.losing_claim_ref
        );
        for (let i = 1; i < refs.length; i++) {
          if (!(refs[i]! > refs[i - 1]!))
            out.push(
              `created_losing_revisions not strictly sorted by losing_claim_ref: '${refs[i]}' follows '${refs[i - 1]}'`
            );
        }
        return out;
      },
    },
  ],
  "truth-analysis": [
    {
      invariant: "DEC-0011 deterministic-ordering",
      check: (d) => {
        const out: string[] = [];
        const sortedAsc = (arr: string[], label: string): void => {
          for (let i = 1; i < arr.length; i++) {
            if (!(arr[i]! > arr[i - 1]!))
              out.push(`${label} not strictly sorted: '${arr[i]}' follows '${arr[i - 1]}'`);
          }
        };
        sortedAsc((d["analyzed_claim_refs"] ?? []) as string[], "analyzed_claim_refs");
        sortedAsc((d["effective_claim_refs"] ?? []) as string[], "effective_claim_refs");
        sortedAsc((d["superseded_claim_refs"] ?? []) as string[], "superseded_claim_refs");
        const inactive = (d["inactive_head_claims"] ?? []) as { claim_ref: string }[];
        sortedAsc(inactive.map((c) => c.claim_ref), "inactive_head_claims claim_refs");
        sortedAsc((d["unstructured_claim_refs"] ?? []) as string[], "unstructured_claim_refs");
        sortedAsc((d["unprofiled_fact_claim_refs"] ?? []) as string[], "unprofiled_fact_claim_refs");
        const contradictions = (d["open_contradictions"] ?? []) as { fact_key: string }[];
        sortedAsc(contradictions.map((c) => c.fact_key), "open_contradictions fact_keys");
        const gaps = (d["gaps"] ?? []) as { fact_key: string }[];
        sortedAsc(gaps.map((g) => g.fact_key), "gaps fact_keys");
        return out;
      },
    },
    {
      invariant: "DEC-0012 lineage-partition",
      check: (d) => {
        // effective + superseded + inactive heads must partition the complete
        // analyzed set exactly: no overlap, no omission, no extras.
        const out: string[] = [];
        const analyzed = new Set((d["analyzed_claim_refs"] ?? []) as string[]);
        const inactive = (d["inactive_head_claims"] ?? []) as { claim_ref: string }[];
        const partitions: [string, string[]][] = [
          ["effective_claim_refs", (d["effective_claim_refs"] ?? []) as string[]],
          ["superseded_claim_refs", (d["superseded_claim_refs"] ?? []) as string[]],
          ["inactive_head_claims", inactive.map((c) => c.claim_ref)],
        ];
        const seen = new Map<string, string>();
        for (const [label, refs] of partitions) {
          for (const r of refs) {
            if (!analyzed.has(r)) out.push(`${label} references '${r}', which is not in analyzed_claim_refs`);
            const prior = seen.get(r);
            if (prior) out.push(`'${r}' appears in both ${prior} and ${label}; the partitions must be disjoint`);
            else seen.set(r, label);
          }
        }
        for (const r of analyzed) {
          if (!seen.has(r))
            out.push(`analyzed claim '${r}' is in none of effective/superseded/inactive; the partition must be complete`);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0011/DEC-0012 refs-within-effective",
      check: (d) => {
        // Contradictions, gaps, and the unstructured/unprofiled listings see
        // effective current truth only — an inactive or superseded claim can
        // appear in none of them (DEC-0012).
        const out: string[] = [];
        const effective = new Set((d["effective_claim_refs"] ?? []) as string[]);
        const requireIn = (refs: string[], label: string): void => {
          for (const r of refs) {
            if (!effective.has(r)) out.push(`${label} references '${r}', which is not in effective_claim_refs`);
          }
        };
        for (const c of (d["open_contradictions"] ?? []) as { fact_key: string; claim_refs?: string[] }[]) {
          requireIn(c.claim_refs ?? [], `contradiction '${c.fact_key}'`);
        }
        for (const g of (d["gaps"] ?? []) as { fact_key: string; claim_refs?: string[] }[]) {
          requireIn(g.claim_refs ?? [], `gap '${g.fact_key}'`);
        }
        requireIn((d["unstructured_claim_refs"] ?? []) as string[], "unstructured_claim_refs");
        requireIn((d["unprofiled_fact_claim_refs"] ?? []) as string[], "unprofiled_fact_claim_refs");
        return out;
      },
    },
  ],
};

export class ContractRegistry {
  private constructor(
    private readonly validators: Map<string, ValidateFunction>,
    private readonly schemaIds: Map<string, string>
  ) {}

  static load(contractsDir: string): ContractRegistry {
    const files = readdirSync(contractsDir)
      .filter((f) => f.endsWith(".schema.json"))
      .sort();
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const parsed: { type: string; schema: { $id?: string } }[] = [];
    for (const file of files) {
      const schema = JSON.parse(readFileSync(join(contractsDir, file), "utf8")) as {
        $id?: string;
      };
      if (!schema.$id) throw new Error(`${file}: missing $id`);
      ajv.addSchema(schema);
      parsed.push({ type: file.replace(/\.schema\.json$/, ""), schema });
    }
    const validators = new Map<string, ValidateFunction>();
    const schemaIds = new Map<string, string>();
    for (const { type, schema } of parsed) {
      const validate = ajv.getSchema(schema.$id as string);
      if (!validate) throw new Error(`${type}: schema failed to compile`);
      validators.set(type, validate);
      schemaIds.set(type, schema.$id as string);
    }
    return new ContractRegistry(validators, schemaIds);
  }

  get knownTypes(): string[] {
    return [...this.validators.keys()];
  }

  schemaIdFor(artifactType: string): string | undefined {
    return this.schemaIds.get(artifactType);
  }

  isSupported(artifactType: string): artifactType is SupportedArtifactType {
    return (SUPPORTED_ARTIFACT_TYPES as readonly string[]).includes(artifactType);
  }

  /** Validate an artifact against its contract: schema layer + deterministic semantic layer. */
  validate(artifactType: string, artifact: unknown): Result<Record<string, unknown>> {
    const validator = this.validators.get(artifactType);
    if (!validator) {
      return err({
        kind: "unknown-artifact-type",
        artifactType,
        message: `no contract registered for artifact type '${artifactType}'`,
      });
    }
    if (!validator(artifact)) {
      const issues: ValidationIssue[] = (validator.errors ?? []).map((e) => ({
        artifactType,
        instancePath: e.instancePath || "/",
        keyword: e.keyword,
        message: e.message ?? "invalid",
      }));
      return err({
        kind: "validation-failed",
        artifactType,
        issues,
        message: `artifact failed ${artifactType} schema validation`,
      });
    }
    const data = artifact as Record<string, unknown>;
    const semanticIssues: ValidationIssue[] = [];
    for (const { invariant, check } of SEMANTIC_CHECKS[artifactType] ?? []) {
      for (const violation of check(data)) {
        semanticIssues.push({
          artifactType,
          instancePath: "/",
          keyword: invariant,
          message: violation,
        });
      }
    }
    if (semanticIssues.length > 0) {
      return err({
        kind: "validation-failed",
        artifactType,
        issues: semanticIssues,
        message: `artifact failed ${artifactType} semantic validation`,
      });
    }
    return ok(data);
  }
}
