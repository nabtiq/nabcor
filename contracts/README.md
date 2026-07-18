# Contracts

Versioned JSON Schemas (draft-07) for NABCor's canonical artifacts. These are **initial
contracts, not final database models** — semantic clarity first, storage later.
Authority rank 4 (below decisions, above current state) — see `AGENTS.md`.

## Layout

- `artifact-envelope.schema.json` — shared envelope + definitions (`envelope`,
  `approval`, `localized_text`, `rights`) referenced by artifact schemas via `allOf`.
- Truth layer: `source`, `claim`, `assumption`, `claim-snapshot`,
  `truth-profile`, `truth-analysis`.
- Decision layer: `decision`.
- Creative layer: `brand-context`, `creative-brief`, `creative-territory`,
  `creative-direction`, `brand-dna`, `visual-world`, `design-system`.
- Production layer: `website-spec`, `social-asset-spec`.
- Evaluation layer: `evaluation-report`.
- Execution layer: `model-run`, `token-budget`, `context-manifest`,
  `validation-matrix`, `deployment-readiness`, `gateway-policy`,
  `gateway-request`.
- Human-gate authority layer (DEC-0014): `human-gate-policy`,
  `authority-registry`, `approval-evidence`, `approval-receipt`.
- `gateway-policy.active.json` — the committed active gateway policy document
  (DEC-0009). Not a schema: a validated instance, checked in CI against
  `gateway-policy.schema.json`; the runtime refuses to construct a gateway
  from an invalid or missing policy.
- `human-gate-policy.active.json`, `authority-registry.active.json` — the
  committed active human-gate trust roots (DEC-0014), validated in CI
  including their mutual id/version binding. The runtime loads them through
  a fixed trusted boundary; approval evidence can never select its own
  policy, registry, or key. The active registry currently contains ZERO
  enrolled authorities: no runtime approval can verify until a real key is
  enrolled through a reviewed registry revision.
- `fixtures/positive.json`, `fixtures/negative.json` — validation fixtures (below).

Execution-layer records are operational records, not creative artifacts — they carry
their own required identity fields instead of the full envelope.

## Strict validation design (draft-07)

Unknown or misspelled fields are **rejected**, with a draft-07-safe composition:

- **Envelope-based schemas** (those using `allOf: [envelope, own-body]`) close their
  top level with a root **`propertyNames` enum** listing every allowed property
  (envelope + own). `additionalProperties: false` cannot be used at the top level
  there — inside an `allOf` branch it would reject the *other* branch's properties;
  `propertyNames` validates names globally without that conflict.
- **Standalone schemas** (execution layer) close with plain
  `additionalProperties: false`.
- **Nested objects with declared properties** are closed with
  `additionalProperties: false`.
- The **envelope definition itself stays open** by design (it is an `allOf`
  composition target — see its `$comment`); per-schema `propertyNames` provides the
  actual closure.

**Deliberately open (documented exceptions):**

- `design-system` `themes[].tokens` — token-name → value map (open by nature;
  `minProperties: 1`).
- `visual-world` `motion.tokens` — motion token map.
- `localized_text` — locale-keyed map, open **by pattern only** (`ar`+`en` required,
  additional `[a-z]{2,3}(-[A-Z]{2})?` locale keys allowed, everything else rejected).

Optional-by-design fields are preserved throughout so schema pressure never encourages
fabrication (e.g. a factual copy slot may carry an `unresolved_fact_note` confirm-slot
instead of invented claim refs — see fixture `P02`).

## Versioning

Artifact `schema_version` for all contracts: **1.7.0** (was 1.6.0). The version is
globally synchronized across all contracts; examples, fixtures, and
runtime-generated artifacts carry it consistently.

**Migration implications (1.6.0 → 1.7.0):** four standalone contracts were
added for the authenticated human-gate foundation (DEC-0014, Phase 1B.3A);
no existing contract changed meaning:

- `human-gate-policy` (new): the committed, CI-validated active policy that
  pins the ratified posture as schema constants — Ed25519 only, the
  versioned canonical payload algorithm (`approval-payload-sha256-1.0.0`)
  and domain separator, single-use-nonce replay policy, default deny,
  `independent_reviewer_named: false` (unfreezing the DEC-0008
  independent-review gates is a superseding decision plus a contract
  migration, never a config flip), per-gate role requirements, maximum
  approval TTL, and clock-skew allowance. Semantic layer:
  `gate-requirements-cover-allowed-gates` and
  `independent-review-gates-pinned`.
- `authority-registry` (new): versioned non-secret public-key registry with
  explicit lineage (`supersedes_registry_version` must be exactly
  version − 1, or null for version 1). Each entry binds `key_id` to key
  material ('k' + sha256 over the SPKI DER bytes — recomputed by the
  semantic layer, which also requires the SPKI to decode as a REAL Ed25519
  key), carries roles from the closed DEC-0008 enum, validity windows, and
  status with mandatory revocation metadata. Private keys never appear in
  any contract. An empty `authorities` array is valid and is the committed
  state: nothing can verify until enrollment.
- `approval-evidence` (new): the signed approval. The `payload` block is
  the EXACT signed content — strictly versioned, domain-separated, closed
  to unknown fields — covering approver identity, role, gate, the target
  artifact's address and content digest, verdict, `self_review`, requester,
  nonce, validity window, key ID, and policy binding. Semantic layer:
  `payload-digest-consistency` (recomputed over the domain-separated
  canonical bytes), `expires-after-issued`, and `self-review-consistency`
  (`self_review` must equal `requester_id === approver_id` — DEC-0008).
  Contract validity proves shape only; authorization additionally requires
  the runtime verifier's policy/registry/target/signature/replay checks.
- `approval-receipt` (new): the immutable consumption record. `receipt_id`
  is deterministically derived ('r' + sha256 over the canonical JSON of
  `{key_id, nonce, policy_ref}`, algorithm
  `approval-receipt-id-sha256-1.0.0`; semantic layer recomputes), so a
  second consumption of the same nonce collides with the first receipt.
  `verification_result` is pinned to `authorized`: denials never persist
  receipts.
- No real production artifacts existed at 1.6.0, so no real-artifact
  migration was performed — examples, fixtures, and synthetic runtime
  fixtures were re-issued at 1.7.0 in the same change.

**Historical — migration implications (1.5.0 → 1.6.0):** one contract was added and the
`truth-analysis` contract changed meaning (DEC-0013, Phase 1B.2.2):

- `claim-snapshot` (new, canonical): the store-authoritative snapshot of
  the COMPLETE canonical claim set of one workspace/brand namespace at
  capture time. Carries `workspace`, a versioned `snapshot_algorithm`
  (`claim-set-sha256-1.0.0`: canonical JSON with code-unit-sorted object
  keys and no whitespace; `content_digest` is sha256 over each validated
  claim artifact; `claim_set_digest` is sha256 over the sorted
  `{claim_ref, content_digest}` pair array — implementation
  `src/kernel/canonical-json.ts`, mirrored in `contracts/validate.mjs`),
  the sorted pair array, and the aggregate digest. Semantic layer:
  `sorted-unique-claim-refs` and `aggregate-digest-consistency` (the
  aggregate is recomputed from the listed pairs — a fabricated aggregate
  cannot bind contents it does not bind). A zero-claim namespace is a
  valid snapshot.
- `truth-analysis` gains **required** `claim_snapshot_ref` and
  `claim_set_digest`: an analysis is bound to the exact claim membership
  and contents it analyzed. Canonical claim membership comes from Artifact
  Store enumeration — a caller-supplied claims array is never evidence of
  completeness, the runtime rejects legacy `claims`/`claim_refs` inputs,
  and compilation reconciles the snapshot against the live store, failing
  closed (typed `stale-analysis`) when any claim appeared, disappeared, or
  changed content since analysis.
- The deterministic analyzer version moved `analyze-structured-truth-1.1.0`
  → `-2.0.0` (its public input boundary changed: claims load from the
  store; the caller supplies snapshot/analysis artifact IDs and an
  injected clock).
- No real production artifacts existed at 1.5.0, so no real-artifact
  migration was performed — examples, fixtures, and synthetic runtime
  fixtures were re-issued at 1.6.0 in the same change.

**Historical — migration implications (1.4.0 → 1.5.0):** the `truth-analysis` and
`brand-context` contracts changed meaning (DEC-0012, Phase 1B.2.1):

- `truth-analysis` gains three **required** lineage-projection collections:
  `effective_claim_refs` (validated lineage heads active as current truth —
  the only claims contradiction detection, slot satisfaction, and the
  unstructured/unprofiled listings see), `superseded_claim_refs`
  (historical revisions superseded by another analyzed claim; audit-only),
  and `inactive_head_claims` (heads retained for audit but inactive, each
  `{claim_ref, reason}` with the closed reason enum
  `verification-contradicted` / `verification-rejected` /
  `verification-expired` / `lifecycle-rejected`). Lifecycle `superseded` is
  deliberately not a reason: a superseded head whose successor is missing
  from the complete input set fails closed at projection instead of
  appearing in the artifact.
- `analyzed_claim_refs` keeps its meaning — the exact, deterministically
  sorted claim references the analysis covered — now explicitly defined as
  the COMPLETE validated input revision set. New semantic checks enforce
  that the three new collections partition it exactly (disjoint, complete)
  and that contradictions, gaps, and the unstructured/unprofiled listings
  reference effective claims only. Contradicted claims are retained but
  inactive: they are visible in `inactive_head_claims`, never in
  contradictions or slot support (DEC-0012 — the Phase 1B.2 behavior that
  kept them active is corrected, not preserved).
- `brand-context.claim_refs` changes meaning: it now carries the
  analysis's effective claim references only. Superseded and inactive
  revisions stay auditable through `truth_analysis_ref`, never as package
  claims; compiler references to non-effective claims fail closed.
- No real production artifacts existed at 1.4.0, so no real-artifact
  migration was performed — examples, fixtures, and synthetic runtime
  fixtures were re-issued at 1.5.0 in the same change. The deterministic
  analyzer version moved `analyze-structured-truth-1.0.0` → `-1.1.0`.

**Historical — migration implications (1.3.0 → 1.4.0):** the `claim` and `brand-context`
contracts changed meaning, and two truth-layer contracts were added (DEC-0011,
Phase 1B.2):

- `claim` gains optional structured fact metadata: `fact_key` (dotted lowercase
  machine-readable slot key, e.g. `identity.primary_name`), `normalized_value`
  (scalar only — string, number, or boolean; arrays, objects, and null are
  rejected in this phase), and `normalization_basis` (how the value was
  derived — normalization happens upstream and is disclosed, never hidden in
  comparison). `fact_key` and `normalized_value` must both exist or both be
  absent; a normalized value requires a basis. Fact metadata is permitted only
  on `factual` and `inference` claims — preferences and hypotheses must not
  silently participate as facts. Deterministic comparison is exact and
  type-sensitive: string `"1"` differs from number `1`; no case folding,
  Unicode normalization, unit conversion, or fuzzy matching exists. A
  normalized value never upgrades verification status.
- `truth-profile` (new, canonical): the versioned declaration of the fact
  slots one workflow expects — per slot: fact key, description, cardinality
  (`single`/`multi`), requirement (`required`/`optional`), `why_needed`, and
  profile-owned blocking flags for missing and conflicting states. Strict
  unknown-field rejection; unique, deterministically sorted fact keys
  (semantic layer). A profile is workflow-scoped expectation, not a universal
  ontology, and carries no provider or model policy.
- `truth-analysis` (new, derived): the deterministic analyzer's result —
  analyzed claim references, open contradictions (fixed `status: "open"`;
  at least two claim refs and two distinct type-sensitive values each), gaps
  (`missing`/`unverified`, produced only relative to the referenced profile),
  and the explicit `unstructured_claim_refs` / `unprofiled_fact_claim_refs`
  listings. Semantic layer: every reference stays inside
  `analyzed_claim_refs`; all listings and groupings are deterministically
  sorted. No model or provider field exists.
- `brand-context` gains a **required** `truth_analysis_ref`: open
  contradictions and gaps compile only from a validated truth-analysis
  artifact whose analyzed claim set exactly matches the package's claims;
  the pre-1.4.0 caller-supplied contradiction/gap arrays are rejected by the
  compiler.
- No real production artifacts existed at 1.3.0, so no real-artifact migration
  was performed — examples, fixtures, and synthetic runtime fixtures were
  re-issued at 1.4.0 in the same change.

**Historical — additive contracts at 1.3.0 (Phase 1B.1, DEC-0009/DEC-0010):**
`gateway-policy` and `gateway-request` were added at the synchronized 1.3.0
version. No existing contract changed meaning, so no version bump occurred.
The `gateway-policy` contract pins the ratified zero-provider values (fake
adapter only, synthetic data only, tier 0, no network, no credentials, zero
spend) as constants: relaxing any of them is a meaning change that requires a
superseding decision and the documented versioning procedure. Offline Fake
Adapter runs use the existing `model-run` contract unchanged, recorded
truthfully as `provider: "offline"`, tier 0, zero tokens, and
`cost {mode: "free-tier", usd: 0, allocation: "none"}` — non-billed, zero,
never conflated with measured API cost (see fixture `P08`).

**Historical — migration implications (1.2.0 → 1.3.0):** the `claim` fragment
locator changed meaning (DEC-0007):

- `claim.source_ref` character fragments now use
  `source:<source artifact_id>#codepoints=<start>-<end>` — **zero-based,
  half-open Unicode code-point offsets** `[start, end)`. Offsets count Unicode
  code points (what `Array.from`/string iteration yield), never UTF-8 bytes,
  UTF-16 code units, or user-perceived grapheme clusters; a combining mark is
  its own code point. Captured content is addressed exactly as captured — the
  runtime never normalizes Unicode, so composed and decomposed forms are
  distinct.
- The old `#chars=` form had undefined multilingual semantics (the runtime
  counted UTF-16 code units) and is **rejected at the schema layer with no
  compatibility fallback**. Migration rule: re-issue each old reference as a
  `#codepoints=` reference computed against the original immutable captured
  content. Old offsets are never reinterpreted automatically. No real
  production artifacts existed, so no real-artifact migration was performed —
  examples, fixtures, and synthetic runtime fixtures were re-issued in the
  same change.
- The semantic check `chars-fragment-ordered` is renamed
  `codepoints-fragment-ordered` (`#codepoints=a-b` requires `a < b`; full
  bounds and content-exactness are verified at compile time against the
  content store in code-point coordinates).
- Quarantine semantics (DEC-0007): a `quarantine-release` approvals entry on a
  `source` artifact is **audit metadata without authority**. The runtime
  rejects every claim citing quarantined content — fail-closed pending an
  authenticated human-gate implementation (Q-001 at the time of this
  migration; since closed by DEC-0008 — release still requires a formally
  named independent reviewer and a ratified authenticated gate mechanism,
  neither of which exists); schema validity of an approval never releases
  anything.

**Historical — migration implications (1.1.0 → 1.2.0):** the `source` and
`claim` contracts changed meaning (DEC-0006):

- `source` gains a **required `capture` block** stating how much of the input the
  runtime actually holds: `captured` (content-addressed bytes with `content_ref`
  `sha256:<hex>`, `sha256`, `bytes`, optional `media_type`, and a `safety` state of
  `clear` or `quarantined`), `descriptor-only` (PDF/DOCX/image/logo descriptors —
  no bytes exist until real capture happens), or `external-unfetched` (URLs are
  locators, never fetched in this phase). Captured content is stored in the
  content store, never inline in the artifact.
- `source` visual kinds (`image`, `logo`) must carry `visual_classification`
  **explicitly**; `null` is the honest unresolved state. A silent documentary
  default is prohibited (INV-FACT-003).
- `claim.source_ref` must use the **canonical source-reference form**
  (fragment locator since revised by 1.3.0 above) — deterministic, parseable,
  tied to the source artifact ID, independent of filenames and renames,
  fragment-preserving. Filename-based references (e.g.
  `company-profile.pdf#page=3`) are **rejected at the schema layer, not silently
  migrated**: re-issue the claim against the source artifact ID. There is no
  ambiguous fallback.
- New semantic checks: `flagged-captured-content-must-be-quarantined`
  (INV-SEC-002 — a flag is not a quarantine) and the fragment-order check
  (INV-FACT-001 — fragment `a-b` requires `a < b`; renamed in 1.3.0).

No real production artifact migration was performed in either bump because no
real artifacts exist yet — examples, fixtures, and synthetic runtime fixtures
are the only instances, and all were updated in the same change. Rules going
forward: change a schema → bump `schema_version` expectations, update fixtures,
never silently (AGENTS.md rule 15).

## Validation

```bash
node contracts/validate.mjs
```

Two distinguishable layers, both required green (non-zero exit otherwise):

- **Schema layer** (Ajv, draft-07 — an explicit development dependency): every schema
  compiles · `$id`s unique · every `examples[]` entry
  and `fixtures/positive.json` case validates · the committed
  `gateway-policy.active.json`, `human-gate-policy.active.json`, and
  `authority-registry.active.json` documents validate as positive instances
  (including the policy → registry id/version binding) ·
  every `fixtures/negative.json` case
  with `expect_fail_at: "schema"` is rejected.
- **Semantic layer** — deterministic cross-field checks draft-07 cannot express
  cleanly, each named for the invariant it enforces:
  ratification-approval (INV-HUM-001/INV-DEC-001) · score-requires-rubric and
  blocking-consistency (INV-EVAL-001) · inference-verification-needs-human
  (INV-FACT-002) · cost-mode-consistency (INV-OBS-001) · combination-membership and
  js-disabled-presence (INV-AR-001/INV-PE-001) · factual-slots-claim-backed
  (INV-FACT-001) · unique-sorted-fact-keys and deterministic-ordering
  (DEC-0011) · lineage-partition and refs-within-effective
  (DEC-0011/DEC-0012) · sorted-unique-claim-refs and
  aggregate-digest-consistency (DEC-0013) ·
  gate-requirements-cover-allowed-gates, independent-review-gates-pinned,
  unique-key-ids, key-id-binds-spki-ed25519, validity-window-ordered,
  revocation-metadata-consistency, registry-lineage,
  payload-digest-consistency, expires-after-issued,
  self-review-consistency, and receipt-id-consistency (DEC-0008/DEC-0014).
  Negative fixtures with
  `expect_fail_at: "semantic"` must pass the schema layer and fail here.

The command prints: schemas compiled, positive cases passed, negative cases correctly
rejected (schema/semantic split), semantic checks passed, `$id` uniqueness.
CI: `.github/workflows/validate-foundation.yml` runs this (via `npm run validate`)
on every pull request and push to `main`.

Runtime typed equivalents are deliberately deferred to Phase 1, where they land next
to the code that consumes them. These JSON Schemas remain language-neutral authority.
