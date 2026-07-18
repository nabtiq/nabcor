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
import { claimSetDigest } from "./canonical-json.js";
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
const receiptIdOf = (keyId: unknown, nonce: unknown, policyRef: unknown): string =>
  receiptIdFor(String(keyId), String(nonce), String(policyRef));
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

// Deterministic cross-field checks the schemas cannot express, mirrored from
// contracts/validate.mjs for the types this kernel exchanges at runtime.
const SEMANTIC_CHECKS: Record<string, SemanticCheck[]> = {
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
        const recomputed = receiptIdOf(d["key_id"], d["nonce"], d["policy_ref"]);
        return d["receipt_id"] === recomputed
          ? []
          : [
              `receipt_id '${String(d["receipt_id"])}' does not match the recomputation '${recomputed}' over {key_id, nonce, policy_ref}`,
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
