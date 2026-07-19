#!/usr/bin/env node
// Foundation contract validation: schema layer + deterministic semantic layer.
//
//   node contracts/validate.mjs
//
// Schema layer   — draft-07 (Ajv + ajv-formats, explicit dev dependencies):
//   every *.schema.json compiles · $ids unique · every examples[] entry and every
//   positive fixture validates · every negative fixture with expect_fail_at:"schema"
//   is rejected.
// Semantic layer — cross-field invariants draft-07 cannot express cleanly; each check
//   names the invariant it enforces. Runs on all schema-valid instances; negative
//   fixtures with expect_fail_at:"semantic" must pass schema and fail semantics.
// Exit: 0 only when every layer is fully green.
import { createHash, createPublicKey } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let Ajv, addFormats;
try {
  const ajvModule = require("ajv");
  const formatsModule = require("ajv-formats");
  Ajv = ajvModule.default ?? ajvModule;
  addFormats = formatsModule.default ?? formatsModule;
} catch {
  console.error("FAIL: ajv/ajv-formats not resolvable. Run `npm ci` first.");
  process.exit(2);
}

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL " + msg); };

// ---- semantic layer -------------------------------------------------------
// checker: (data) => array of violation strings (empty = pass)

// Canonical JSON + aggregate digest, algorithm claim-set-sha256-1.0.0 —
// mirrored from src/kernel/canonical-json.ts (the two must change together).
const canonicalJson = (v) =>
  Array.isArray(v)
    ? `[${v.map(canonicalJson).join(",")}]`
    : v !== null && typeof v === "object"
      ? `{${Object.keys(v)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
          .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
const claimSetDigest = (pairs) =>
  `sha256:${createHash("sha256").update(canonicalJson(pairs), "utf8").digest("hex")}`;

// Authenticated human-gate evidence (DEC-0014) — mirrored from
// src/authority/approval-payload.ts (the two must change together).
// Signed/digested bytes: UTF-8 of domain_separator + "\n" + canonical JSON.
const APPROVAL_DOMAIN = "nabcor-human-gate-approval-v1";
const approvalPayloadDigest = (payload) =>
  `sha256:${createHash("sha256")
    .update(`${APPROVAL_DOMAIN}\n${canonicalJson(payload)}`, "utf8")
    .digest("hex")}`;
const receiptIdFor = (keyId, nonce, policyRef, workspace, brandRef) =>
  `r${createHash("sha256")
    .update(
      canonicalJson({ brand_ref: brandRef, key_id: keyId, nonce, policy_ref: policyRef, workspace }),
      "utf8"
    )
    .digest("hex")}`;
// Authenticated fact-resolution (DEC-0016) — mirrored from
// src/resolve/resolution-ids.ts (the two must change together).
const contradictionFingerprint = (workspace, brandRef, factKey, claimRefs, distinctValues) =>
  `c${createHash("sha256")
    .update(
      canonicalJson({
        brand_ref: brandRef,
        claim_refs: claimRefs,
        distinct_values: distinctValues,
        fact_key: factKey,
        workspace,
      }),
      "utf8"
    )
    .digest("hex")}`;
const resolutionHash = (o) => createHash("sha256").update(canonicalJson(o), "utf8").digest("hex");
const applicationIdFor = (decisionDigest, receiptRef) =>
  `fra${resolutionHash({ decision_digest: decisionDigest, receipt_ref: receiptRef })}`;
const successorIdFor = (applicationRef, losingClaimRef) =>
  `crs${resolutionHash({ application_ref: applicationRef, losing_claim_ref: losingClaimRef })}`;
const afterSnapshotIdFor = (applicationRef) =>
  `fsn${resolutionHash({ application_ref: applicationRef, role: "after-snapshot" })}`;
const afterAnalysisIdFor = (applicationRef) =>
  `fan${resolutionHash({ application_ref: applicationRef, role: "after-analysis" })}`;
// Provider-policy candidate self-integrity (DEC-0019) — mirrored from
// src/kernel/contract-registry.ts (the two must change together): the
// candidate_digest is sha256 over the canonical JSON of the candidate WITHOUT
// the candidate_digest field.
const candidateSelfDigest = (d) => {
  const { candidate_digest, ...rest } = d;
  return `sha256:${createHash("sha256").update(canonicalJson(rest), "utf8").digest("hex")}`;
};
const contentDigestOf = (d) =>
  `sha256:${createHash("sha256").update(canonicalJson(d), "utf8").digest("hex")}`;
// The four DEC-0008 gates that require a formally named independent reviewer.
const INDEPENDENT_REVIEW_GATES = [
  "quarantine-release",
  "client-facing-publishing",
  "blocking-evaluation-gate-change",
  "real-client-data-provider-approval",
];

const SEMANTIC = {
  "provider-policy-candidate.schema.json": [
    {
      invariant: "DEC-0019 candidate-digest-consistency",
      check: (d) => {
        const recomputed = candidateSelfDigest(d);
        return d.candidate_digest === recomputed
          ? []
          : [
              `candidate_digest '${d.candidate_digest}' does not match the recomputed canonical digest '${recomputed}' over the candidate without its digest field`,
            ];
      },
    },
    {
      invariant: "DEC-0019 validity-window-ordered",
      check: (d) =>
        Date.parse(d.valid_until) > Date.parse(d.valid_from)
          ? []
          : [`valid_until '${d.valid_until}' must be after valid_from '${d.valid_from}'`],
    },
    {
      invariant: "DEC-0019 sorted-unique-model-allowlist",
      check: (d) => {
        const out = [];
        const ids = (d.allowed_models ?? []).map((m) => m.model_id);
        for (let i = 1; i < ids.length; i++) {
          if (!(ids[i] > ids[i - 1]))
            out.push(`allowed_models not strictly sorted by model_id: '${ids[i]}' follows '${ids[i - 1]}'`);
        }
        return out;
      },
    },
  ],
  "human-gate-policy.schema.json": [
    {
      invariant: "DEC-0014 gate-requirements-cover-allowed-gates",
      check: (d) => {
        const out = [];
        const allowed = d.allowed_gates ?? [];
        const keys = Object.keys(d.gate_requirements ?? {});
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
        const out = [];
        for (const g of INDEPENDENT_REVIEW_GATES) {
          const req = (d.gate_requirements ?? {})[g];
          if (req && req.independent_review_required !== true)
            out.push(
              `gate '${g}' must carry independent_review_required=true (DEC-0008 independent-review gate)`
            );
        }
        return out;
      },
    },
  ],
  "authority-registry.schema.json": [
    {
      invariant: "DEC-0014 unique-key-ids",
      check: (d) => {
        const out = [];
        const seen = new Set();
        for (const a of d.authorities ?? []) {
          if (seen.has(a.key_id)) out.push(`duplicate key_id '${a.key_id}' in authorities`);
          seen.add(a.key_id);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0014 key-id-binds-spki-ed25519",
      check: (d) => {
        const out = [];
        for (const a of d.authorities ?? []) {
          const der = Buffer.from(a.public_key_spki_b64, "base64");
          if (der.toString("base64") !== a.public_key_spki_b64) {
            out.push(`authority '${a.key_id}': public_key_spki_b64 is not canonical base64`);
            continue;
          }
          let keyType = null;
          try {
            keyType = createPublicKey({ key: der, format: "der", type: "spki" }).asymmetricKeyType;
          } catch {
            out.push(`authority '${a.key_id}': public_key_spki_b64 does not decode as a valid SPKI public key`);
            continue;
          }
          if (keyType !== "ed25519") {
            out.push(`authority '${a.key_id}': key type '${keyType}' is not ed25519`);
            continue;
          }
          const recomputed = `k${createHash("sha256").update(der).digest("hex")}`;
          if (a.key_id !== recomputed)
            out.push(`authority key_id '${a.key_id}' does not match the sha256 of its SPKI bytes ('${recomputed}')`);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0014 validity-window-ordered",
      check: (d) =>
        (d.authorities ?? [])
          .filter(
            (a) => a.valid_until !== null && Date.parse(a.valid_until) <= Date.parse(a.valid_from)
          )
          .map((a) => `authority '${a.key_id}': valid_until must be after valid_from`),
    },
    {
      invariant: "DEC-0014 revocation-metadata-consistency",
      check: (d) => {
        const out = [];
        for (const a of d.authorities ?? []) {
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
        if (d.supersedes_registry_version === null)
          return d.registry_version === 1
            ? []
            : [`registry_version ${d.registry_version} with null supersedes_registry_version (only version 1 may have no predecessor)`];
        return d.supersedes_registry_version === d.registry_version - 1
          ? []
          : [
              `supersedes_registry_version ${d.supersedes_registry_version} must be exactly registry_version - 1 (${d.registry_version - 1})`,
            ];
      },
    },
  ],
  "approval-evidence.schema.json": [
    {
      invariant: "DEC-0014 payload-digest-consistency",
      check: (d) => {
        const recomputed = approvalPayloadDigest(d.payload ?? {});
        return d.payload_digest === recomputed
          ? []
          : [
              `payload_digest '${d.payload_digest}' does not match the recomputed domain-separated canonical digest '${recomputed}'`,
            ];
      },
    },
    {
      invariant: "DEC-0014 expires-after-issued",
      check: (d) => {
        const p = d.payload ?? {};
        return Date.parse(p.expires_at) > Date.parse(p.issued_at)
          ? []
          : [`expires_at '${p.expires_at}' must be after issued_at '${p.issued_at}'`];
      },
    },
    {
      invariant: "DEC-0008/DEC-0014 self-review-consistency",
      check: (d) => {
        const p = d.payload ?? {};
        const computed = p.requester_id === p.approver_id;
        return p.self_review === computed
          ? []
          : [
              `self_review=${p.self_review} does not match the computed value ${computed} (requester_id ${computed ? "equals" : "differs from"} approver_id)`,
            ];
      },
    },
  ],
  "approval-receipt.schema.json": [
    {
      invariant: "DEC-0014 receipt-id-consistency",
      check: (d) => {
        const recomputed = receiptIdFor(d.key_id, d.nonce, d.policy_ref, d.workspace, d.brand_ref);
        return d.receipt_id === recomputed
          ? []
          : [
              `receipt_id '${d.receipt_id}' does not match the recomputation '${recomputed}' over {brand_ref, key_id, nonce, policy_ref, workspace}`,
            ];
      },
    },
  ],
  "claim-snapshot.schema.json": [
    {
      invariant: "DEC-0013 sorted-unique-claim-refs",
      check: (d) => {
        const out = [];
        const pairs = d.claims ?? [];
        for (let i = 1; i < pairs.length; i++) {
          const prev = pairs[i - 1].claim_ref;
          const cur = pairs[i].claim_ref;
          if (cur === prev) out.push(`duplicate claim_ref '${cur}' in snapshot claims`);
          else if (cur < prev) out.push(`snapshot claims not deterministically sorted: '${cur}' follows '${prev}'`);
        }
        return out;
      },
    },
    {
      invariant: "DEC-0013 aggregate-digest-consistency",
      check: (d) => {
        const recomputed = claimSetDigest(
          (d.claims ?? []).map((p) => ({ claim_ref: p.claim_ref, content_digest: p.content_digest }))
        );
        return d.claim_set_digest === recomputed
          ? []
          : [
              `claim_set_digest '${d.claim_set_digest}' does not match the recomputed aggregate '${recomputed}' over the listed claim digests`,
            ];
      },
    },
  ],
  "fact-resolution-decision.schema.json": [
    {
      invariant: "DEC-0016 fingerprint-consistency",
      check: (d) => {
        const c = d.contradiction ?? {};
        const recomputed = contradictionFingerprint(
          d.workspace,
          d.brand_ref,
          d.fact_key,
          c.claim_refs ?? [],
          c.distinct_values ?? []
        );
        return d.contradiction_fingerprint === recomputed
          ? []
          : [
              `contradiction_fingerprint '${d.contradiction_fingerprint}' does not match the recomputation '${recomputed}' over {brand_ref, claim_refs, distinct_values, fact_key, workspace}`,
            ];
      },
    },
    {
      invariant: "DEC-0016 exact-partition",
      check: (d) => {
        const out = [];
        const participants = (d.contradiction ?? {}).claim_refs ?? [];
        const losers = (d.losing_claims ?? []).map((l) => l.claim_ref);
        const winner = d.winning_claim_ref;
        if (!participants.includes(winner))
          out.push(`winning_claim_ref '${winner}' is not a participant of the recorded contradiction`);
        if (losers.includes(winner))
          out.push(`winning_claim_ref '${winner}' also appears as a losing claim; winner and losers must be disjoint`);
        const loserSet = new Set(losers);
        if (loserSet.size !== losers.length) out.push("losing_claims contains duplicate claim references");
        for (const l of losers)
          if (!participants.includes(l))
            out.push(`losing claim '${l}' is not a participant of the recorded contradiction`);
        for (const p of participants)
          if (p !== winner && !loserSet.has(p))
            out.push(`participant '${p}' is neither the winner nor a losing claim; partial resolution is prohibited`);
        return out;
      },
    },
    {
      invariant: "DEC-0016 sorted-unique-references",
      check: (d) => {
        const out = [];
        const sortedAsc = (arr, label) => {
          for (let i = 1; i < arr.length; i++)
            if (!(arr[i] > arr[i - 1]))
              out.push(`${label} not strictly sorted: '${arr[i]}' follows '${arr[i - 1]}'`);
        };
        sortedAsc((d.contradiction ?? {}).claim_refs ?? [], "contradiction.claim_refs");
        sortedAsc((d.losing_claims ?? []).map((l) => l.claim_ref), "losing_claims claim_refs");
        return out;
      },
    },
  ],
  "fact-resolution-application.schema.json": [
    {
      invariant: "DEC-0016 application-id-consistency",
      check: (d) => {
        const recomputed = applicationIdFor(d.decision_digest, d.receipt_ref);
        return d.artifact_id === recomputed
          ? []
          : [
              `artifact_id '${d.artifact_id}' does not match the recomputation '${recomputed}' over {decision_digest, receipt_ref}`,
            ];
      },
    },
    {
      invariant: "DEC-0016 derived-id-consistency",
      check: (d) => {
        const out = [];
        for (const r of d.created_losing_revisions ?? []) {
          const recomputed = successorIdFor(d.artifact_id, r.losing_claim_ref);
          if (r.successor_claim_ref !== recomputed)
            out.push(
              `successor_claim_ref '${r.successor_claim_ref}' for losing claim '${r.losing_claim_ref}' does not match the recomputation '${recomputed}'`
            );
        }
        const fsn = afterSnapshotIdFor(d.artifact_id);
        if (d.after_snapshot_ref !== fsn)
          out.push(`after_snapshot_ref '${d.after_snapshot_ref}' does not match the recomputation '${fsn}'`);
        const fan = afterAnalysisIdFor(d.artifact_id);
        if (d.after_analysis_ref !== fan)
          out.push(`after_analysis_ref '${d.after_analysis_ref}' does not match the recomputation '${fan}'`);
        return out;
      },
    },
    {
      invariant: "DEC-0016 sorted-unique-losing-revisions",
      check: (d) => {
        const out = [];
        const refs = (d.created_losing_revisions ?? []).map((r) => r.losing_claim_ref);
        for (let i = 1; i < refs.length; i++)
          if (!(refs[i] > refs[i - 1]))
            out.push(`created_losing_revisions not strictly sorted by losing_claim_ref: '${refs[i]}' follows '${refs[i - 1]}'`);
        return out;
      },
    },
  ],
  "decision.schema.json": [
    {
      invariant: "INV-HUM-001/INV-DEC-001 ratification-approval",
      check: (d) =>
        d.status === "ratified" &&
        !(d.approvals ?? []).some((a) => a.gate === "ratification" && a.verdict === "approved")
          ? ["status=ratified requires an approvals entry {gate:'ratification', verdict:'approved'}"]
          : [],
    },
  ],
  "evaluation-report.schema.json": [
    {
      invariant: "INV-EVAL-001 score-requires-rubric",
      check: (d) =>
        (d.evaluations ?? [])
          .filter((e) => e.score !== null && e.score !== undefined && !e.rubric_ref)
          .map((e) => `evaluation '${e.dimension}' has a numeric score without rubric_ref`),
    },
    {
      invariant: "INV-EVAL-001 blocking-consistency",
      check: (d) => {
        const out = [];
        const blockingFails = (d.evaluations ?? []).filter(
          (e) => e.authority === "blocking" && e.verdict === "fail"
        );
        if (d.overall_verdict === "pass" && blockingFails.length > 0)
          out.push("overall_verdict=pass while blocking evaluations failed");
        for (const e of blockingFails)
          if (!(d.blocking_failures ?? []).includes(e.dimension))
            out.push(`blocking failure '${e.dimension}' missing from blocking_failures`);
        return out;
      },
    },
  ],
  "claim.schema.json": [
    {
      invariant: "INV-FACT-002 inference-verification-needs-human",
      check: (d) =>
        d.classification === "inference" && d.verification_status === "verified" && !d.verified_by
          ? ["inference claim marked verified without verified_by (human confirmation)"]
          : [],
    },
    {
      invariant: "INV-FACT-001 codepoints-fragment-ordered",
      check: (d) => {
        if (typeof d.source_ref !== "string") return [];
        const m = /#codepoints=([0-9]+)-([0-9]+)$/.exec(d.source_ref);
        if (m && Number(m[1]) >= Number(m[2]))
          return [`source_ref code-point fragment ${m[1]}-${m[2]} is invalid: start must be less than end`];
        return [];
      },
    },
  ],
  "source.schema.json": [
    {
      invariant: "INV-SEC-002 flagged-captured-content-must-be-quarantined",
      check: (d) =>
        d.injection_flag === true &&
        d.capture?.status === "captured" &&
        d.capture?.safety !== "quarantined"
          ? ["captured content is injection-flagged but not in the quarantine namespace (a flag is not a quarantine)"]
          : [],
    },
  ],
  "model-run.schema.json": [
    {
      invariant: "INV-OBS-001 cost-mode-consistency",
      check: (d) => {
        const out = [];
        const c = d.cost ?? {};
        if (c.mode === "api" && (typeof c.usd !== "number" || c.allocation !== "measured"))
          out.push("cost.mode=api requires numeric usd and allocation=measured");
        if (c.mode === "subscription" && (c.usd !== null || c.allocation !== "none"))
          out.push("cost.mode=subscription requires usd=null and allocation=none (never conflated)");
        return out;
      },
    },
  ],
  "validation-matrix.schema.json": [
    {
      invariant: "INV-AR-001/INV-PE-001 combination-membership",
      check: (d) => {
        const out = [];
        const dims = d.dimensions ?? {};
        (d.required_combinations ?? []).forEach((c, i) => {
          for (const [k, v] of Object.entries(c))
            if (dims[k] && !dims[k].includes(v))
              out.push(`required_combinations[${i}].${k}='${v}' not in declared dimensions.${k}`);
        });
        return out;
      },
    },
    {
      invariant: "INV-PE-001 js-disabled-combination-present",
      check: (d) =>
        (d.required_combinations ?? []).some((c) => c.js_state === "disabled")
          ? []
          : ["no required combination with js_state=disabled (F03 mandate)"],
    },
  ],
  "website-spec.schema.json": [
    {
      invariant: "INV-FACT-001 factual-slots-claim-backed",
      check: (d) => {
        const out = [];
        for (const s of d.sections ?? [])
          for (const slot of s.copy_slots ?? [])
            if (
              slot.role === "factual" &&
              !(slot.claim_refs ?? []).length &&
              !(typeof slot.unresolved_fact_note === "string" && slot.unresolved_fact_note.length)
            )
              out.push(`section '${s.section_id}' slot '${slot.slot_id}': factual role without claim_refs or unresolved_fact_note`);
        return out;
      },
    },
  ],
  "social-asset-spec.schema.json": [
    {
      invariant: "INV-FACT-001 factual-slots-claim-backed",
      check: (d) =>
        (d.copy ?? [])
          .filter((slot) => slot.role === "factual" && !(slot.claim_refs ?? []).length)
          .map((slot) => `copy slot '${slot.slot_id}': factual role without claim_refs`),
    },
  ],
  "truth-profile.schema.json": [
    {
      invariant: "DEC-0011 unique-sorted-fact-keys",
      check: (d) => {
        // Code-unit comparison, never locale-dependent collation: ordering must
        // be byte-stable across environments (DEC-0011 determinism).
        const out = [];
        const keys = (d.slots ?? []).map((s) => s.fact_key);
        for (let i = 1; i < keys.length; i++) {
          if (keys[i] === keys[i - 1]) out.push(`duplicate fact_key '${keys[i]}' in slots`);
          else if (keys[i] < keys[i - 1])
            out.push(`slots not deterministically sorted: '${keys[i]}' follows '${keys[i - 1]}'`);
        }
        return out;
      },
    },
  ],
  "truth-analysis.schema.json": [
    {
      invariant: "DEC-0011 deterministic-ordering",
      check: (d) => {
        const out = [];
        const sortedAsc = (arr, label) => {
          for (let i = 1; i < arr.length; i++)
            if (!(arr[i] > arr[i - 1]))
              out.push(`${label} not strictly sorted: '${arr[i]}' follows '${arr[i - 1]}'`);
        };
        sortedAsc(d.analyzed_claim_refs ?? [], "analyzed_claim_refs");
        sortedAsc(d.effective_claim_refs ?? [], "effective_claim_refs");
        sortedAsc(d.superseded_claim_refs ?? [], "superseded_claim_refs");
        sortedAsc((d.inactive_head_claims ?? []).map((c) => c.claim_ref), "inactive_head_claims claim_refs");
        sortedAsc(d.unstructured_claim_refs ?? [], "unstructured_claim_refs");
        sortedAsc(d.unprofiled_fact_claim_refs ?? [], "unprofiled_fact_claim_refs");
        sortedAsc((d.open_contradictions ?? []).map((c) => c.fact_key), "open_contradictions fact_keys");
        sortedAsc((d.gaps ?? []).map((g) => g.fact_key), "gaps fact_keys");
        return out;
      },
    },
    {
      invariant: "DEC-0012 lineage-partition",
      check: (d) => {
        // effective + superseded + inactive heads must partition the complete
        // analyzed set exactly: no overlap, no omission, no extras.
        const out = [];
        const analyzed = new Set(d.analyzed_claim_refs ?? []);
        const partitions = [
          ["effective_claim_refs", d.effective_claim_refs ?? []],
          ["superseded_claim_refs", d.superseded_claim_refs ?? []],
          ["inactive_head_claims", (d.inactive_head_claims ?? []).map((c) => c.claim_ref)],
        ];
        const seen = new Map();
        for (const [label, refs] of partitions) {
          for (const r of refs) {
            if (!analyzed.has(r)) out.push(`${label} references '${r}', which is not in analyzed_claim_refs`);
            const prior = seen.get(r);
            if (prior) out.push(`'${r}' appears in both ${prior} and ${label}; the partitions must be disjoint`);
            else seen.set(r, label);
          }
        }
        for (const r of analyzed)
          if (!seen.has(r))
            out.push(`analyzed claim '${r}' is in none of effective/superseded/inactive; the partition must be complete`);
        return out;
      },
    },
    {
      invariant: "DEC-0011/DEC-0012 refs-within-effective",
      check: (d) => {
        // Contradictions, gaps, and the unstructured/unprofiled listings see
        // effective current truth only — an inactive or superseded claim can
        // appear in none of them (DEC-0012).
        const out = [];
        const effective = new Set(d.effective_claim_refs ?? []);
        const requireIn = (refs, label) => {
          for (const r of refs)
            if (!effective.has(r)) out.push(`${label} references '${r}', which is not in effective_claim_refs`);
        };
        for (const c of d.open_contradictions ?? []) requireIn(c.claim_refs ?? [], `contradiction '${c.fact_key}'`);
        for (const g of d.gaps ?? []) requireIn(g.claim_refs ?? [], `gap '${g.fact_key}'`);
        requireIn(d.unstructured_claim_refs ?? [], "unstructured_claim_refs");
        requireIn(d.unprofiled_fact_claim_refs ?? [], "unprofiled_fact_claim_refs");
        return out;
      },
    },
  ],
};

function runSemantic(schemaFile, data) {
  const violations = [];
  for (const { invariant, check } of SEMANTIC[schemaFile] ?? [])
    for (const v of check(data)) violations.push(`[${invariant}] ${v}`);
  return violations;
}

// ---- load + compile schemas ----------------------------------------------
const ids = new Map();
const schemas = [];
for (const f of files) {
  let schema;
  try {
    schema = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (e) { fail(`parse ${f}: ${e.message}`); continue; }
  if (!schema.$id) { fail(`${f}: missing $id`); continue; }
  if (ids.has(schema.$id)) { fail(`${f}: duplicate $id also in ${ids.get(schema.$id)}`); continue; }
  ids.set(schema.$id, f);
  schemas.push({ f, schema });
}
for (const { f, schema } of schemas) {
  try { ajv.addSchema(schema); } catch (e) { fail(`addSchema ${f}: ${e.message}`); }
}
const validators = new Map();
for (const { f, schema } of schemas) {
  try { validators.set(f, ajv.getSchema(schema.$id) ?? ajv.compile(schema)); }
  catch (e) { fail(`compile ${f}: ${e.message}`); }
}
console.log(`schemas compiled: ${validators.size}/${files.length}`);

// ---- positive cases: examples + positive fixtures ------------------------
let positivePassed = 0, positiveTotal = 0, semanticChecksRun = 0;
function runPositive(schemaFile, data, label) {
  positiveTotal++;
  const validate = validators.get(schemaFile);
  if (!validate) { fail(`${label}: no validator for ${schemaFile}`); return; }
  if (!validate(data)) {
    fail(`${label}: SCHEMA rejected a positive case`);
    for (const err of validate.errors ?? [])
      console.error(`    ${err.instancePath || "/"} ${err.message}`);
    return;
  }
  const violations = runSemantic(schemaFile, data);
  if (violations.length) {
    fail(`${label}: SEMANTIC rejected a positive case`);
    for (const v of violations) console.error(`    ${v}`);
    return;
  }
  positivePassed++;
  semanticChecksRun += (SEMANTIC[schemaFile] ?? []).length;
}

for (const { f, schema } of schemas)
  (schema.examples ?? []).forEach((ex, i) => runPositive(f, ex, `${f} examples[${i}]`));

const positiveFixtures = JSON.parse(readFileSync(join(dir, "fixtures/positive.json"), "utf8"));
for (const fx of positiveFixtures) runPositive(fx.schema, fx.data, `positive ${fx.id}`);

// The committed active gateway policy document is a validated instance, not just
// an example: an invalid active policy must fail CI, because the runtime refuses
// to construct a gateway from it (DEC-0009/DEC-0010 fail-closed rule).
const activePolicy = JSON.parse(readFileSync(join(dir, "gateway-policy.active.json"), "utf8"));
runPositive("gateway-policy.schema.json", activePolicy, "active gateway policy document");

// The committed active human-gate policy and authority registry are the trusted
// verification roots (DEC-0014): an invalid active document must fail CI because
// the runtime refuses to construct a verifier from it. The active registry may
// legitimately contain zero authorities — that state means no runtime approval
// can verify until a real key is enrolled.
const activeHumanGatePolicy = JSON.parse(
  readFileSync(join(dir, "human-gate-policy.active.json"), "utf8")
);
runPositive("human-gate-policy.schema.json", activeHumanGatePolicy, "active human-gate policy document");
const activeAuthorityRegistry = JSON.parse(
  readFileSync(join(dir, "authority-registry.active.json"), "utf8")
);
runPositive("authority-registry.schema.json", activeAuthorityRegistry, "active authority registry document");
// The committed provider-policy candidate and provider operational state are
// validated instances (DEC-0019): the runtime adapter refuses to construct
// from invalid documents, so an invalid committed document must fail CI.
const activeCandidate = JSON.parse(
  readFileSync(join(dir, "provider-policy-candidate.active.json"), "utf8")
);
runPositive("provider-policy-candidate.schema.json", activeCandidate, "active provider-policy candidate document");
const activeOperationalState = JSON.parse(
  readFileSync(join(dir, "provider-operational-state.active.json"), "utf8")
);
runPositive(
  "provider-operational-state.schema.json",
  activeOperationalState,
  "active provider operational state document"
);
if (activeHumanGatePolicy.authority_registry_ref !== activeAuthorityRegistry.registry_id) {
  fail(
    `active human-gate policy references registry '${activeHumanGatePolicy.authority_registry_ref}' but the committed active registry is '${activeAuthorityRegistry.registry_id}'`
  );
}
if (activeHumanGatePolicy.authority_registry_version !== activeAuthorityRegistry.registry_version) {
  fail(
    `active human-gate policy pins registry version ${activeHumanGatePolicy.authority_registry_version} but the committed active registry is version ${activeAuthorityRegistry.registry_version}`
  );
}
console.log(`positive cases passed: ${positivePassed}/${positiveTotal}`);

// ---- negative fixtures ----------------------------------------------------
const negativeFixtures = JSON.parse(readFileSync(join(dir, "fixtures/negative.json"), "utf8"));
let negSchema = 0, negSemantic = 0;
for (const fx of negativeFixtures) {
  const validate = validators.get(fx.schema);
  if (!validate) { fail(`negative ${fx.id}: no validator for ${fx.schema}`); continue; }
  const schemaOk = validate(fx.data);
  if (fx.expect_fail_at === "schema") {
    if (schemaOk) fail(`negative ${fx.id}: SCHEMA accepted an invalid artifact (${fx.description})`);
    else negSchema++;
  } else if (fx.expect_fail_at === "semantic") {
    if (!schemaOk) {
      fail(`negative ${fx.id}: expected schema-valid input for a semantic case, but schema rejected it (fixture bug)`);
      for (const err of validate.errors ?? []) console.error(`    ${err.instancePath || "/"} ${err.message}`);
    } else if (runSemantic(fx.schema, fx.data).length === 0) {
      fail(`negative ${fx.id}: SEMANTIC accepted an invalid artifact (${fx.description})`);
    } else negSemantic++;
  } else {
    fail(`negative ${fx.id}: unknown expect_fail_at '${fx.expect_fail_at}'`);
  }
}
console.log(`negative cases correctly rejected: ${negSchema + negSemantic}/${negativeFixtures.length} (schema: ${negSchema}, semantic: ${negSemantic})`);
console.log(`semantic checks passed on positive cases: ${semanticChecksRun}`);
console.log(`$id uniqueness: ${ids.size === schemas.length ? "unique" : "DUPLICATES"}`);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll layers green.");
