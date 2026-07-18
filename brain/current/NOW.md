# NOW

> Current state only. Git contains history; `brain/archive/` contains retired context.

**Updated:** 2026-07-18

## Current phase

Phase 1B.2.1 — resolution-safe claim lifecycle correction (DEC-0012) on top
of the Phase 1B.2 deterministic structured-truth analysis, the Phase 1B.1
offline gateway kernel, and the Phase 1A truth kernel. The clean foundation
baseline (`0.1.0`) remains the historical boundary (`FOUNDATION_BASELINE.md`).
Phase 1 is not complete.

## Current objective

Deliver Phase 1B.2.1: contradicted claims retained but inactive, current
truth derived from a validated lineage projection over immutable claim
revisions (never caller omission), Brand Context compiled from effective
claims only — then obtain the Product Owner's ratification of the
authenticated human-gate mechanism (Q-009) so fact resolution can safely
apply claim revisions. Model-backed work stays prohibited by the
zero-provider policy (DEC-0009) — a policy boundary, not an open question.

## Ratified decisions

- DEC-0001 — NABCor is an AI Creative Operating System.
- DEC-0002 — the Second Brain is file-based from day one; no vector database yet.
- DEC-0003 — legacy website code is archived evidence, not the new product core.
- DEC-0004 — first vertical slice, ratified with its proposed boundary unchanged.
- DEC-0005 — Node.js 20 + strict TypeScript ESM, no application or agent framework
  (dependency statement corrected by an append-only note; see DEC-0006).
- DEC-0006 — Ajv/ajv-formats as declared runtime dependencies; immutable
  content-addressed capture; canonical `source:` claim references (its
  quarantine-release and `#chars=` fragment statements are corrected by an
  append-only note; see DEC-0007).
- DEC-0007 — quarantine is fail-closed pending an authenticated human-gate
  mechanism; provenance fragments use zero-based half-open Unicode
  code-point offsets (`#codepoints=`).
- DEC-0008 — human gate roles: Ibrahim Mohamed (@ibra2000sd) holds all four
  roles effective 2026-07-18 with `self_review: true` required on every
  approval; four gates require an independent reviewer (not yet named);
  quarantine release remains fail-closed (its "Q-002 remains open" statements
  are corrected by an append-only status note; see DEC-0009).
- DEC-0009 — zero-provider offline execution policy: no external provider
  approved, Fake Adapter only, synthetic data only, zero external/model spend;
  Q-002 closed as "no provider approved".
- DEC-0010 — offline provider-neutral gateway kernel: fail-closed policy
  contract, deterministic Fake Adapter, structured-output validation,
  manifest/run-record observability, pre-invocation budget enforcement.
- DEC-0011 — deterministic structured-truth analysis boundary: explicit fact
  slots and exact type-sensitive comparison only; profile-relative gaps; open
  contradictions with no automatic resolution; no prose interpretation; no
  gateway or Fake Adapter involvement (its contradicted-claims-stay-active
  judgment is corrected by an append-only note; see DEC-0012).
- DEC-0012 — resolution-safe claim lifecycle: contradicted claims are
  retained but inactive as current truth; current truth is a validated
  lineage projection over immutable claim revisions, never caller omission;
  cycles, self-supersession, dangling lineage, and ambiguous forks fail
  closed; Brand Context compiles effective claims only; a shape-valid
  Decision artifact is not evidence a human acted, and authoritative human
  contradiction resolution stays unimplemented pending an authenticated
  human-gate mechanism (Q-009).

## Implemented (Phase 1A, corrected by Phase 1A.1 / DEC-0006 and Phase 1A.2 / DEC-0007)

- English-only repository policy with a deterministic language gate
  (`scripts/validate-language.mjs`, in `npm run validate` and CI).
- Contract registry over the existing Ajv schemas (`src/kernel/contract-registry.ts`);
  `ajv`/`ajv-formats` are the kernel's two declared runtime dependencies, proven
  by an isolated production-only install smoke test.
- File artifact store with workspace/brand namespaces, validate-before-write,
  no-overwrite, lineage checks, symlink rejection, and sorted supported-type
  listing (`src/kernel/artifact-store.ts`).
- Immutable SHA-256-addressed content store with clear/quarantine namespaces
  (`src/kernel/content-store.ts`); the quarantine namespace is fail-closed —
  no runtime read path exists pending an independent reviewer and an
  authenticated gate mechanism (DEC-0007, DEC-0008).
- Tier-0 `classify-input` with conservative rights defaults, honest capture
  states, quarantine-only capture of flagged inline content, explicit-null
  visual classification, and a bounded injection-warning scanner
  (`src/understand/classify-input.ts`).
- Tier-0 `build-brand-context` deterministic compiler with canonical
  `source:<artifact_id>` claim references, code-point fragment bounds checks
  against captured content, and fail-closed rejection of every claim citing a
  quarantined source (`src/compile/build-brand-context.ts`).
- Synthetic CLI example (`src/cli/run-example.ts`) and runtime tests (`test/`).

## Implemented (Phase 1B.1, DEC-0009/DEC-0010)

- Offline provider-neutral gateway kernel (`src/gateway/`): strict
  `gateway-policy` and `gateway-request` contracts, the CI-validated committed
  active policy pinning the zero-provider posture, fail-closed policy
  enforcement before invocation, pre-invocation token-budget checks, context
  manifests persisted before every adapter call, structured-output validation,
  truthful zero-token/zero-cost `model-run` records, and an immutable
  namespaced operational record store.
- Deterministic Fake Adapter (`fake` / `offline` /
  `deterministic-fake-adapter-v1`, tier 0) with an invocation counter proving
  rejected requests never reach it. Infrastructure validation only — no
  model-quality evidence; EXP-0001 remains unstarted and empty.

## Implemented (Phase 1B.2, DEC-0011)

- Claim contract extension: optional structured fact metadata (`fact_key`,
  scalar `normalized_value`, disclosed `normalization_basis`) on factual and
  inference claims only; a normalized value never upgrades verification
  status. Contracts moved 1.3.0 → 1.4.0 (synchronized; see
  `contracts/README.md`).
- Strict `truth-profile` contract (workflow-scoped fact-slot expectations
  with profile-owned blocking flags) and derived `truth-analysis` contract
  (open contradictions, profile-relative gaps, explicit
  unstructured/unprofiled listings, deterministic ordering).
- Tier-0 `analyze-structured-truth`
  (`src/understand/analyze-structured-truth.ts`): exact type-sensitive
  comparison over explicit fact slots; byte-equivalent deterministic output;
  no gateway, adapter, model, or network involvement.
- Brand Context compiler integration: contradictions and gaps compile only
  from a validated truth-analysis artifact with exact claim coverage;
  `truth_analysis_ref` recorded; the caller-supplied bypass is rejected.
- Artifact-store support for `truth-profile` and `truth-analysis` with the
  existing brand-isolation, validate-before-write, and no-overwrite rules.
- This is deterministic structured analysis only: no natural-language
  extraction, no semantic paraphrase detection, no model-quality evidence.

## Implemented (Phase 1B.2.1, DEC-0012)

- Deterministic active-claim lineage projection
  (`src/understand/project-active-claims.ts`): the complete claim revision
  set is validated and partitioned into effective heads, superseded
  history, and inactive heads (contradicted/rejected/expired/
  lifecycle-rejected) with a closed reason enum. Self-supersession,
  cycles, dangling predecessors, ambiguous forks, conflicting
  `superseded_by` metadata, and lifecycle-superseded claims with hidden
  successors all fail closed. Omission is not resolution; claim artifacts
  stay immutable — no claim was mutated or deleted.
- Analyzer correction: `analyze-structured-truth` (1.1.0) analyzes
  effective claims only. Contradicted claims are retained but inactive —
  they create no active contradictions and satisfy no required slots, so a
  human resolution stays closed on re-analysis. Excluded claims remain
  explicitly visible in the analysis for audit.
- Truth-analysis contract 1.5.0 (contracts synchronized 1.4.0 → 1.5.0):
  required `effective_claim_refs`, `superseded_claim_refs`, and
  `inactive_head_claims` collections with exact-partition and
  effective-only-participation semantic checks.
- Brand Context compiler: packages compile effective current claims only;
  identity/audience/market references to superseded or inactive claims
  fail closed; `provisional` derives from effective claims and open
  assumptions only.
- Shape-valid approvals remain unauthenticated evidence: no resolver,
  authentication, signing, key handling, or quarantine release was built
  (Q-009 records the human-gate decision packet).

## Blocked / not implemented

- Authoritative human contradiction resolution: the resolution-safe
  lifecycle exists (DEC-0012), but applying a resolution — creating the
  losing claim's `contradicted` revision with `resolution_decision_ref` —
  is BLOCKED on the authenticated human-gate mechanism (Q-009). A
  schema-valid Decision or Approval artifact proves shape, not that a
  human acted, and the approval contract has no machine-readable
  `self_review` field (DEC-0008 requires `self_review: true`).
- Provider adapters, real model calls, provider-backed extraction, and
  semantic contradiction detection: prohibited by the ratified zero-provider
  policy (DEC-0009, zero spend); enabling any provider requires a new
  ratified decision meeting DEC-0009's nine requirements.
- Natural-language fact extraction (prose → structured claims) does not
  exist in any form; the deterministic analyzer only consumes fact metadata
  made explicit upstream.
- Quarantine release: gate roles are named (DEC-0008), but release requires
  both an independent reviewer (none formally named) and an authenticated gate
  mechanism (not designed) — DEC-0007's fail-closed rule stands, and flagged
  content stays fenced. The same independent-reviewer gap freezes client-facing
  publishing, BLOCKING evaluation-gate changes, and real-client-data provider
  approval.
- Territories, direction, channel specs, evaluation skills: later phases.
- EXP-0001 has not run; its Result section is empty.

## Immediate next actions

1. Product Owner ratifies an option for Q-009 (authenticated human-gate
   mechanism; Option A — offline Ed25519 approval evidence — is
   recommended). Fact resolution cannot apply claim revisions before that.
2. Keep `npm run validate` green on every change.

## Definition of done for the current objective

Phase 1B.2.1 merged with validation green; NOW, ROADMAP, RISKS, and
OPEN_QUESTIONS consistent with DEC-0008..DEC-0012; contradicted claims
retained but inactive with lineage-projected current truth; no claim of
implemented human resolution, authentication, or semantic detection
anywhere; EXP-0001 still unexecuted and empty.
