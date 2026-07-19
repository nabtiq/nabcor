# NOW

> Current state only. Git contains history; `brain/archive/` contains retired context.

**Updated:** 2026-07-19

## Current phase

Phase 1B.4 — authenticated fact-resolution application (DEC-0016) on top
of the Phase 1B.3B real Product Owner key enrollment (DEC-0015), the
Phase 1B.3A authenticated human-gate foundation (DEC-0014), the Phase
1B.2.2 store-authoritative claim snapshots (DEC-0013), the Phase 1B.2.1
resolution-safe claim lifecycle (DEC-0012), the Phase 1B.2 deterministic
structured-truth analysis, the Phase 1B.1 offline gateway kernel, and the
Phase 1A truth kernel. The clean foundation baseline (`0.1.0`) remains
the historical boundary (`FOUNDATION_BASELINE.md`). Phase 1 is not
complete.

## Current objective

Deliver Phase 1B.4: close the deterministic contradiction-resolution loop
(DEC-0016). A deterministic preparation boundary derives an immutable
`fact-resolution-decision` artifact — the complete requested action, with
exact winner/loser partition and digest-pinned analysis/snapshot/profile/
participant state — from store references only; the Product Owner signs
that exact artifact under `fact-resolution-approval`; and the application
service verifies and consumes the approval once, creates deterministic
`contradicted` successor revisions for every losing claim, rolls the
namespace forward to a fresh snapshot and analysis, and persists an
immutable `fact-resolution-application` record. Application is idempotent
and crash-recoverable (deterministic identities, receipt-sourced
timestamps, byte-exact resume) under a documented single-host/
single-writer boundary. Contracts move 1.7.1 → 1.8.0. The four DEC-0008
independent-review gates stay frozen. Model-backed work stays prohibited
by the zero-provider policy (DEC-0009) — a policy boundary, not an open
question.

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
  human-gate mechanism (Q-009). (Its caller-asserted completeness gap is
  corrected by an append-only note; see DEC-0013.)
- DEC-0013 — store-authoritative claim snapshots: the Artifact Store is the
  authority for claim-set membership; truth analysis enumerates the
  canonical workspace/brand claim namespace into deterministic
  digest-bound snapshots (strict fail-closed enumeration, stable-capture
  check, sha256 content and aggregate digests, injectable clock); public
  analysis/compilation APIs reject caller-supplied claim arrays at
  runtime; compilation reconciles the snapshot against the live store and
  fails closed on stale analyses; DEC-0012 lineage semantics unchanged.
  (Its read-boundary address-integrity gap is corrected by an append-only
  note; see DEC-0014.)
- DEC-0014 — Q-009 Option A: offline Ed25519 authenticated human-gate
  evidence. Runtime human authority requires cryptographic evidence
  verified against the committed trusted policy and versioned public-key
  registry; the signed payload is canonical, domain-separated, and closed;
  a valid signature is never sufficient without policy authorization and
  atomic single-use nonce consumption; key lifecycle fails closed; legacy
  envelope approvals stay non-authoritative; authenticated approval applies
  no business action; the four DEC-0008 independent-review gates stay
  frozen; contracts 1.7.0.
- DEC-0015 — real Product Owner Ed25519 public-key enrollment: authority
  registry v2 enrolls exactly one least-privilege `product-owner` key
  (subject `ibrahim-mohamed`, key_id
  `k8cc9db703247760829dcb74819fbe07cd1dc24a2bf66ec7a02ed500391de8b1b`,
  valid 2026-07-19 → 2027-07-19, expiry fails closed); policy v2 pins
  registry v2; the private key never touched the repository, CI, or agent
  context; ordinary fact-resolution approval is operationally available;
  independent-review gates stay frozen; the policy-schema `decision_ref`
  const defect is corrected (contracts 1.7.0 → 1.7.1); the offline signing
  CLI (`src/cli/sign-approval.ts`) is the safe operator signing boundary.
- DEC-0016 — authenticated fact-resolution application: the signed target
  is an immutable fact-resolution-decision artifact carrying the complete
  requested action (exact winner/loser partition, digest-pinned
  analysis/snapshot/profile/participant state); application creates
  deterministic `contradicted` successor revisions, never mutates the
  winner or any stored claim, rolls forward to a fresh snapshot and
  analysis, and is idempotent and crash-recoverable from the immutable
  receipt under a single-host/single-writer boundary; contracts 1.8.0.

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

## Implemented (Phase 1B.2.2, DEC-0013)

- Store-authoritative claim snapshots (`src/kernel/claim-snapshot.ts`,
  `contracts/claim-snapshot.schema.json`, contracts 1.5.0 → 1.6.0):
  canonical claim membership is enumerated from the exact workspace/brand
  Artifact Store namespace — strict fail-closed enumeration
  (`FileArtifactStore.listStrict`; symlinked/non-canonical entries fail the
  capture instead of being skipped), per-claim contract validation, an
  enumerate → load → enumerate stability check (typed `snapshot-unstable`
  failure), per-claim and aggregate sha256 digests over versioned
  canonical JSON (`claim-set-sha256-1.0.0`), and an injectable clock.
  Zero-claim namespaces are valid snapshots.
- Analyzer boundary correction: `analyze-structured-truth` (2.0.0) loads
  claims from the store and records `claim_snapshot_ref` +
  `claim_set_digest`; legacy caller-supplied `claims`/`claim_refs` fields
  are rejected at runtime. A supplied array is not evidence of
  completeness — omitting an independent conflicting lineage no longer
  hides its contradiction (the Phase 1B.2.1 residual defect, reproduced
  with a failing test before correction).
- Compiler stale-analysis protection: `build-brand-context` loads the
  analysis and snapshot by reference, verifies their digest binding,
  re-captures the canonical namespace, and fails closed with a typed
  `stale-analysis` failure when any claim appeared, disappeared, or
  changed content since analysis; re-analysis recovers. Store list
  ordering is code-unit deterministic.
- No new runtime dependency (Node.js built-in crypto only); no provider,
  model, network, or Fake Adapter involvement.

## Implemented (Phase 1B.3A, DEC-0014)

- Artifact-address integrity at the read boundary: `FileArtifactStore.get`
  and `FileRunRecordStore.get` fail with a typed `artifact-address-mismatch`
  when a stored file's internal identity differs from its canonical
  filename address; snapshot capture inherits the check and fails
  immediately (DEC-0013 append-only clarification).
- Authenticated human-gate foundation (`src/authority/`, contracts
  1.6.0 → 1.7.0): trusted committed human-gate policy + versioned
  public-key authority registry (then empty — zero enrolled authorities;
  registry v2 enrolled the first real authority under DEC-0015),
  domain-separated canonical signed payload (`approval-payload-sha256-1.0.0`)
  covering identity/role/gate/target-digest/verdict/self_review/requester/
  nonce/validity/key/policy, offline Ed25519 verification with Node.js
  built-in crypto (no new dependency), fail-closed key lifecycle
  (unknown/not-yet-valid/expired/revoked), authenticated `self_review`
  recomputation (DEC-0008), target existence + recomputed content digest at
  the exact canonical address, and atomic single-use nonce consumption
  through immutable namespace-isolated receipts (exactly one concurrent
  consumption succeeds — proven with a multi-process race test).
- Offline key-enrollment CLI (`src/cli/keygen.ts`): exclusive-create
  owner-only private key refused inside the repository, symlink refusal,
  public registry-entry candidate output, zero private-material leakage.
- Verification is evidence only: no fact resolution applied, no quarantine
  read, no publishing, no provider enabled, no gateway/Fake Adapter
  involvement.

## Implemented (Phase 1B.3B, DEC-0015)

- Real Product Owner key enrollment: authority registry v2
  (`contracts/authority-registry.active.json`) enrolls exactly one
  authority — the ceremony-generated, fingerprint-confirmed public key of
  Ibrahim Mohamed (@ibra2000sd), subject `ibrahim-mohamed`, role
  `product-owner` only, valid 2026-07-19 → 2027-07-19. Human-gate policy
  v2 pins registry v2. The key ceremony ran personally in the Product
  Owner's own terminal; the implementation agent handled public material
  only, and the private key lives outside Git, CI, fixtures, logs, the
  Artifact Store, and agent context.
- Contract defect correction (1.7.0 → 1.7.1, synchronized re-issue): the
  human-gate-policy schema pinned `decision_ref` const `DEC-0014`, making
  the documented policy-revision procedure schema-invalid; it is now the
  same `^DEC-[0-9]{4,}$` pattern the registry contract uses. Regression
  fixture P18 fails under the old schema and passes under the new one; no
  other contract changed meaning.
- Offline signing CLI (`src/cli/sign-approval.ts`): derived-identity
  signing only (key_id recomputed from the private key and required to be
  enrolled); refuses symlinked, in-repository, and non-owner-only keys;
  refuses independent-review gates outright; cryptographically random
  single-use nonce; exclusive-create output outside the repository; zero
  private-material leakage; produced evidence applies no business action.
- Enrollment guarantees proven by tests: registry/policy v2 mutual pin;
  key_id recomputation from the committed SPKI; empty-v1/unknown-v3/
  foreign-registry substitution failures; unknown-key, impostor-signature,
  wrong-subject, wrong-role, expired, and revoked denials that consume
  nothing; exactly-once consumption via an ephemeral equivalent
  configuration; all four independent-review gates still structurally
  unsatisfiable.

## Implemented (Phase 1B.4, DEC-0016)

- Contracts 1.7.1 → 1.8.0 (synchronized): new `fact-resolution-decision`
  (the immutable signed authorization target: workspace/brand, digest-
  pinned analysis/snapshot/profile references, aggregate claim-set digest,
  fact_key, deterministic contradiction fingerprint
  `contradiction-fingerprint-sha256-1.0.0`, the recorded contradiction,
  exactly one winner + every other participant as a digest-pinned loser,
  rationale, requester) and `fact-resolution-application` (the immutable
  exactly-once record with deterministic identities under
  `fact-resolution-id-sha256-1.0.0`); the approval-evidence/receipt target
  enums gain `fact-resolution-decision`; semantic layers recompute the
  fingerprint, the exact partition, and every derived identity.
- Deterministic decision preparation (`src/resolve/prepare-decision.ts`):
  reference-only input (caller-supplied contradictions/losers/digests are
  rejected at runtime), store-authoritative revalidation (snapshot
  binding, namespace currency, projection agreement, open-contradiction
  and fingerprint match, single-cardinality slot, winner-participates),
  derived losers, immutable persistence, and the stored artifact's
  canonical content digest as the signing target.
- Crash-recoverable application (`src/resolve/apply-resolution.ts`):
  full preflight before consumption; DEC-0014 verification + atomic
  single-use consumption; contradicted successor revisions that preserve
  content and record `resolution_decision_ref` (predecessor and winner
  stay byte-identical; the winner is never auto-verified); fresh snapshot
  + analysis in which the resolved contradiction is closed and unrelated
  contradictions/gaps are untouched; deterministic post-consumption
  identities and receipt-sourced timestamps so retries resume byte-
  exactly from every crash boundary; conflicting successors, foreign
  forks, rotated trust configs, and cross-operation replays fail closed;
  completed replays return the stored result; a rejected verdict consumes
  its nonce and mutates nothing. Single-host/single-writer file atomicity
  only — no distributed-transaction claim.
- Test suites for preparation (partition/fingerprint/staleness/fork/
  cross-brand/tamper), signature binding (target confusion, digest
  substitution, post-signing tamper, gate/role/key/policy denials with
  zero mutations), application effects (successor correctness, byte-
  identity proofs, staleness rollover, downstream compilation), and
  recovery (retry at every write boundary, byte-exact resume, conflict
  refusal, idempotent completed replay).

## Blocked / not implemented

- Provider adapters, real model calls, provider-backed extraction, and
  semantic contradiction detection: prohibited by the ratified zero-provider
  policy (DEC-0009, zero spend); enabling any provider requires a new
  ratified decision meeting DEC-0009's nine requirements.
- Natural-language fact extraction (prose → structured claims) does not
  exist in any form; the deterministic analyzer only consumes fact metadata
  made explicit upstream.
- Quarantine release: the authenticated gate mechanism now exists
  (DEC-0014), but release is a DEC-0008 independent-review gate and no
  independent reviewer is formally named or enrolled — the gate is
  structurally unsatisfiable, DEC-0007's fail-closed rule stands, and
  flagged content stays fenced. The same independent-reviewer gap freezes
  client-facing publishing, BLOCKING evaluation-gate changes, and
  real-client-data provider approval.
- Territories, direction, channel specs, evaluation skills: later phases.
- EXP-0001 has not run; its Result section is empty.

## Immediate next actions

1. Propose the next phase (proposal only): a provider-enablement decision
   meeting DEC-0009's requirements, or the first model-backed extraction
   design gated on it — nothing begins without a ratified decision.
2. Rotate the enrolled key by a new reviewed registry revision + decision
   before its 2027-07-19 expiry (or immediately on suspected compromise
   or private-key loss — RISK-KEY-01).
3. Keep `npm run validate` green on every change.

## Definition of done for the current objective

Phase 1B.4 merged with validation green; NOW, ROADMAP, RISKS,
OPEN_QUESTIONS, and the decision index consistent with DEC-0008..DEC-0016;
the fact-resolution preparation/signature/application/recovery suites
green alongside the enrollment and adversarial human-gate suites; the
real-key proof-of-possession smoke test performed by the Product Owner on
synthetic data outside the repository; no private material anywhere in
the repository; no claim anywhere of released quarantine, unfrozen
independent-review gates, semantic detection, or applied REAL-client
resolution; EXP-0001 still unexecuted and empty.
