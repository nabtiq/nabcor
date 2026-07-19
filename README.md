# NABCor

> Evidence-aware AI Creative Operating System for building distinctive, coherent brand worlds across channels.

**Foundation version:** `0.1.0`
**Status:** clean architecture baseline plus the deterministic Phase 1A truth
kernel (DEC-0004/DEC-0005), the Phase 1B.1 offline gateway kernel
(DEC-0009/DEC-0010), the Phase 1B.2 deterministic structured-truth
analysis (DEC-0011), the Phase 1B.2.1 resolution-safe claim lifecycle
correction (DEC-0012), the Phase 1B.2.2 store-authoritative claim
snapshots (DEC-0013), the Phase 1B.3A offline Ed25519 authenticated
human-gate foundation (DEC-0014), the Phase 1B.3B real Product Owner
key enrollment (DEC-0015), and the Phase 1B.4 authenticated
fact-resolution application (DEC-0016: signed immutable decision
artifacts, deterministic crash-recoverable application, contracts 1.8.0 —
the deterministic contradiction-resolution loop is closed). No
provider-backed extraction, no model calls, and no full vertical slice
exist yet; Phase 1 is not complete.

## What NABCor is

NABCor is not a website builder and it is not a collection of AI generators. It is a
creative operating system that turns evidence, intent, human judgment, and measured
outcomes into a durable brand intelligence spine:

```text
Truth and evidence
  → intent and strategy
  → creative territories
  → human direction decision
  → brand DNA and visual world
  → channel specifications
  → deterministic + model-assisted evaluation
  → human feedback and outcomes
  → institutional memory
```

Websites, social assets, campaigns, presentations, ads, and video concepts are channel
expressions of that spine. They are not independent products and must not become
unrelated generators.

## Why the repository was rebuilt

NABCor began as a technical base for building Next.js client websites. That version
proved useful lessons about contracts, validation, Arabic-quality gates, and fact
protection, but it no longer represented the product being built. This baseline starts
directly from the new product definition: a creative operating system that understands
a brand, develops a distinctive direction, evaluates its own output, and learns from
decisions, rejections, and performance. The legacy website and template code is not
here; only the generalizable evidence and learnings were retained.

## Repository language policy (canonical)

English is the canonical language for all repository-authored material: source code
and comments, documentation, Second Brain records, JSON Schemas and their examples,
test fixtures and descriptions, configuration, workflows, commit messages, and PR
text. A deterministic gate (`npm run validate:language`, part of `npm run validate`
and CI) fails the build if any tracked text file contains characters in the Arabic
Unicode blocks (U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF,
U+FE70–U+FEFF).

This is a repository-language policy, not removal of Arabic product support. The `ar`
locale, RTL and logical-property requirements, Arabic quality and visual-review gates
(INV-AR-001), and the ability to receive and generate Arabic at runtime are all
preserved. Repository fixtures use English placeholders in `ar` fields (for example
`"[Arabic copy pending]"`) because literal Arabic text is prohibited in tracked
repository-authored files.

## Two input modes

1. **Prompt-only:** the user has an intent but little verified material. NABCor keeps
   unknowns visible, asks high-impact questions, and never turns assumptions into facts.
2. **Evidence-rich:** the user supplies documents, imagery, brand material, or URLs.
   NABCor records provenance and rights, extracts claims, surfaces contradictions, and
   builds a reusable Brand Context Package.

Both modes converge on three genuinely distinct creative territories, a recorded human
selection, one coherent visual world, channel specs, an evaluation report, and durable
memory.

## Product principles

- Concept before execution.
- Brand before channel.
- Evidence before claim.
- Distinctiveness before decoration.
- Consistency without repetition.
- Explainable, versioned decisions.
- Deterministic systems govern generative systems.
- Human authority at high-impact gates.
- Evaluation before scale.
- Memory must improve the next run.
- Use the smallest sufficient agentic structure.
- Token efficiency is architectural.

The binding definitions live in
[`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md) and
[`constitution/INVARIANTS.md`](constitution/INVARIANTS.md).

## First proof, not the whole platform

The proposed first vertical slice proves the intelligence spine before building broad
production infrastructure:

```text
input
→ Brand Context Package
→ three creative territories
→ human selection
→ creative direction + brand DNA + visual world
→ one homepage specification + three connected social specifications
→ evaluation report + saved decisions
```

It stops at specifications. Authentication, billing, publishing, a multi-agent runtime,
large-scale image/video generation, analytics ingestion, and additional channels are
deferred until the slice produces measured evidence.

## Second Brain from day one

The repository itself is the initial Second Brain. Every working session begins with:

1. [`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md)
2. [`brain/current/NOW.md`](brain/current/NOW.md)
3. relevant invariants, decisions, contracts, risks, and experiments

Durable information is never left only in chat. Decisions go to `brain/decisions/`,
experiments to `brain/experiments/`, reusable findings to `brain/learnings/`, current
state to `brain/current/`, and obsolete context to `brain/archive/`. The operating rules
are in [`brain/README.md`](brain/README.md) and [`AGENTS.md`](AGENTS.md).

## Repository map

```text
constitution/   mission, product boundaries, invariants, north-star experience
brain/          current state, decisions, experiments, learnings, research, archive
contracts/      strict versioned artifact schemas + positive/negative fixtures
docs/           domain, provenance, evaluation, model, workflow, and slice design
evals/          rubrics plus benchmark and regression plans
skills/         skill specifications for implemented capabilities
scripts/        deterministic repository, Second Brain, and language validation
src/            deterministic Phase 1A truth kernel (TypeScript, ESM, no framework)
test/           runtime tests (Node built-in test runner, compiled to dist/)
.github/        validation workflow
```

There is intentionally no legacy website application, theme package, deployment stack,
or production runtime in this baseline.

## Validate the foundation

Requirements: Node.js 20+ and npm 10+.

```bash
npm ci
npm run validate
```

`npm run validate` checks all artifact contracts, positive and negative fixtures,
cross-field invariants, Second Brain record structure, required foundation files, the
absence of legacy product artifacts, the English-only language gate, TypeScript
type checking, and the runtime kernel tests — including the isolated
production-only install smoke test (`npm ci --omit=dev` in a staging directory;
the primary worktree's installation is never mutated).

## Phase 1A deterministic truth kernel

`src/` contains the smallest provider-independent runtime that turns the existing
contracts into executable product boundaries (DEC-0005: Node.js 20, strict
TypeScript, ESM, no application or agent framework). The kernel has exactly two
runtime dependencies — `ajv` and `ajv-formats`, the contract validator (DEC-0006);
`typescript` and `@types/node` are development-only, and an isolated
`npm ci --omit=dev` smoke test proves the compiled runtime works without them.
No provider SDK and no framework exist.

- **Contract registry** — compiles the existing JSON Schemas once, maps artifact
  types to schema IDs, and validates every artifact at runtime boundaries with the
  same strictness as `contracts/validate.mjs`.
- **File artifact store** — workspace/brand-namespaced, validate-before-write,
  no-overwrite, lineage-aware storage per DEC-0002 and INV-VER-001/INV-DATA-001,
  with symlink rejection and path-relative containment.
- **Content store** — immutable, SHA-256-addressed capture of inline
  prompt/text/Markdown source material under workspace/brand isolation, with
  separate clear and quarantine namespaces (DEC-0006). Captured content is
  persisted before its source artifact is returned, deduplicates by digest within
  a namespace, fails digest verification on tampering, and never appears inline in
  artifacts, logs, or CLI output. The quarantine namespace is fail-closed
  (DEC-0007): the store exposes no method that reads quarantined bytes, pending
  a ratified authenticated gate mechanism and a formally named independent
  reviewer (Q-001 is closed by DEC-0008; both prerequisites are still
  missing). PDF/DOCX/image/logo
  descriptors carry no bytes and are recorded `descriptor-only`; URLs stay
  `external-unfetched`.
- **`classify-input` (Tier 0)** — deterministic classification of input descriptors
  into schema-valid `source` artifacts with conservative rights defaults, honest
  capture states, and a bounded injection-warning scanner (INV-SEC-002). Flagged
  inline content is captured only into the quarantine namespace. Unclassified
  visuals record `visual_classification: null` — documentary status is never
  inferred from absence (INV-FACT-003). No OCR, parsing, or fetching.
- **Claim snapshots (Tier 0, Phase 1B.2.2, DEC-0013)** — canonical claim
  membership comes from the Artifact Store, never a caller-supplied array.
  `src/kernel/claim-snapshot.ts` captures the COMPLETE claim set of one
  workspace/brand namespace with strict fail-closed enumeration (a
  symlinked or non-canonical entry fails the capture instead of being
  skipped), per-claim contract validation, an enumerate → load → enumerate
  stability check, and per-claim + aggregate sha256 digests over versioned
  canonical JSON (`claim-set-sha256-1.0.0`, Node built-in crypto — no new
  dependency). Analyses record the snapshot reference and digest;
  compilation reconciles them against the live store and fails closed with
  a typed `stale-analysis` failure when the canonical set changed —
  re-analysis is required, and a supplied subset can never hide an
  independent conflicting lineage.
- **`project-active-claims` (Tier 0, Phase 1B.2.1, DEC-0012)** —
  deterministic active-claim lineage projection. Claim artifacts are
  immutable per version: a revision is a new artifact whose `supersedes`
  names the prior version, and current truth is derived from validated
  lineage heads over the COMPLETE revision set — never from a caller
  omitting inconvenient claims. Self-supersession, lineage cycles, dangling
  predecessors, ambiguous forks, conflicting `superseded_by` metadata, and
  lifecycle-superseded claims with hidden successors all fail closed.
  Heads whose verification status is `contradicted`, `rejected`, or
  `expired` (or lifecycle `rejected`) are retained for audit but inactive
  as current truth.
- **`analyze-structured-truth` (Tier 0, Phase 1B.2, DEC-0011; corrected by
  Phase 1B.2.1, DEC-0012 and Phase 1B.2.2, DEC-0013)** —
  deterministic contradiction and gap analysis over explicitly structured
  fact slots. Claim membership loads from the Artifact Store snapshot of
  the analysis namespace — legacy caller-supplied `claims` arrays are
  rejected at runtime, and the analysis records its snapshot reference and
  claim-set digest. Claims carrying `fact_key`/`normalized_value`/
  `normalization_basis` are grouped per slot and compared with exact,
  type-sensitive equality (string `"1"` differs from number `1`; no case
  folding, no Unicode normalization, no unit conversion, no fuzzy matching).
  Analysis runs over EFFECTIVE claims from the lineage projection only:
  contradicted claims are retained but inactive — they create no active
  contradictions and satisfy no required slots, so a human resolution stays
  closed on re-analysis, and every excluded claim stays explicitly visible
  in the analysis. Gaps exist only relative to a versioned `truth-profile`
  artifact; blocking flags come only from the profile; contradictions stay
  `open` — the analyzer never selects a winner. Claims without fact
  metadata are listed explicitly as unstructured, never keyword-parsed.
  This is **not** semantic contradiction detection: paraphrase conflicts in
  prose remain invisible to it, and the model-assisted capability that
  could see them stays prohibited by DEC-0009. The analyzer never touches
  the gateway or the Fake Adapter.
- **`build-brand-context` (Tier 0)** — deterministic compilation of already
  structured truth into a schema-valid Brand Context Package. The truth
  analysis and its claim snapshot load from the Artifact Store by
  reference; the compiler verifies the analysis-snapshot digest binding,
  re-captures the canonical claim namespace, and fails closed with a typed
  `stale-analysis` failure when the claim set changed after analysis
  (DEC-0013). Open contradictions and gaps compile only from the truth
  analysis (`truth_analysis_ref` recorded; caller-supplied
  contradiction/gap/claims arrays rejected at runtime — DEC-0011,
  DEC-0013).
  The package compiles EFFECTIVE current claims only (DEC-0012): its
  `claim_refs` are the analysis's effective lineage heads, and identity,
  audience, or market references to superseded, contradicted, rejected, or
  expired claims fail closed. Historical revisions stay auditable through
  the referenced truth analysis; no stored claim is mutated or deleted.
  Claim provenance resolves through canonical
  `source:<artifact_id>[#codepoints=a-b|#page=n]` references; fragment offsets
  are zero-based half-open Unicode code-point positions (DEC-0007 — never
  UTF-16 units or bytes) bounds-checked against the captured content; claims
  citing quarantined sources are always rejected with a typed failure —
  quarantine stays fail-closed pending a ratified authenticated gate
  mechanism and a formally named independent reviewer (DEC-0007, DEC-0008).
  It is a compiler over structured truth, not a natural-language extractor.
- **Offline gateway kernel** (`src/gateway/`, DEC-0009/DEC-0010) — a
  provider-neutral invocation boundary, validated as infrastructure only. A
  strict machine-readable policy contract (`contracts/gateway-policy.schema.json`
  plus the committed, CI-validated active policy) pins the ratified
  zero-provider posture: fake adapter only, synthetic data only, tier 0, no
  network, no credentials, zero external spend per run and per month. A strict
  capability-request contract carries full attribution and an inline
  contract-validated token budget; budgets are enforced before invocation; a
  context manifest is persisted before every adapter call; adapter output is
  returned only after validating against the requested contract; and every
  invocation that passes request validation writes a truthful `model-run`
  record to a dedicated immutable operational record store. The only adapter
  is the **deterministic Fake Adapter** — test infrastructure, not a model:
  its Tier-0 records carry zero tokens in all four classes and
  `cost {mode: "free-tier", usd: 0, allocation: "none"}`, and are excluded
  from model-quality and product-quality evidence (they never populate
  EXP-0001).
- **Authenticated human-gate foundation (Tier 0, Phase 1B.3A, DEC-0014)** —
  machine-verifiable evidence that an authorized human approved or rejected
  one exact artifact action, closing Q-009 with Option A. A committed
  trusted human-gate policy and versioned public-key authority registry
  (contracts 1.7.0: `human-gate-policy`, `authority-registry`,
  `approval-evidence`, `approval-receipt`) pin Ed25519 signatures over a
  domain-separated canonical payload (`approval-payload-sha256-1.0.0`)
  covering identity, role, gate, the target artifact's exact address and
  recomputed content digest, verdict, authenticated `self_review`
  (DEC-0008), requester, nonce, validity window, key ID, and policy
  binding. Verification (`src/authority/`) is offline Node.js built-in
  crypto only — no new dependency — and fails closed at every layer: a
  valid signature is never sufficient without policy authorization AND
  atomic single-use nonce consumption through immutable, namespace-isolated
  receipts (exactly one concurrent consumption can succeed). Legacy
  envelope `approvals` entries remain unauthenticated audit metadata with
  no runtime authority. The read boundary now also proves address
  integrity: `store.get` rejects any artifact whose internal `artifact_id`
  differs from its canonical filename (typed `artifact-address-mismatch`).
  An offline operator CLI (`node dist/src/cli/keygen.js`) prepares key
  enrollment (owner-only private key outside the repository, public
  registry-entry candidate). At this phase, authenticated approval applied
  no business action; quarantine release and publishing remain
  unimplemented today, fact-resolution application landed later under
  DEC-0016 (Phase 1B.4), and the four DEC-0008 independent-review gates
  stay frozen — a Product Owner self-signature can never satisfy one.
- **Real Product Owner key enrollment (Phase 1B.3B, DEC-0015)** — the
  committed active authority registry (v2) enrolls exactly ONE real
  authority: the Product Owner's ceremony-generated, fingerprint-confirmed
  Ed25519 public key (subject `ibrahim-mohamed`, role `product-owner`
  only — least privilege, valid 2026-07-19 → 2027-07-19 with fail-closed
  expiry), and the active human-gate policy (v2) pins registry v2
  exactly. The key ceremony ran personally in the Product Owner's own
  terminal; the private key never entered Git, CI, fixtures, logs, the
  Artifact Store, or agent context, and automated tests use ephemeral
  in-memory keys only. Ordinary `fact-resolution-approval` is now
  operationally available; a superseded or unknown registry cannot be
  substituted (the trusted boundary rejects any id/version the policy does
  not pin), and rotation or revocation requires a new reviewed registry
  revision plus decision record. A safe offline signing CLI
  (`node dist/src/cli/sign-approval.js`) produces approval evidence with a
  DERIVED identity — the key_id is recomputed from the operator's private
  key and must be enrolled — refusing symlinked, in-repository, or
  non-owner-only key paths and every independent-review gate; produced
  evidence still applies no business action. The enrollment corrected one
  genuine contract defect (1.7.0 → 1.7.1): the policy schema pinned
  `decision_ref` const `DEC-0014`, which made the documented
  policy-revision procedure itself schema-invalid.
- **Authenticated fact-resolution application (Tier 0, Phase 1B.4,
  DEC-0016)** — the closed deterministic contradiction-resolution loop:
  open truth-analysis contradiction → immutable `fact-resolution-decision`
  artifact → Product Owner signature over that exact decision →
  verification and single-use consumption → deterministic `contradicted`
  successor revision for every losing claim → fresh authoritative snapshot
  and analysis → immutable `fact-resolution-application` result. The
  preparation boundary (`src/resolve/prepare-decision.ts`) accepts
  references only and re-derives the contradiction, losers, and every
  digest from the Artifact Store: the produced decision pins the exact
  analysis, snapshot, profile, and participant digests plus the aggregate
  claim-set digest, and winner + losers must partition the contradiction
  exactly (partial resolution is unrepresentable). The signature target is
  the decision artifact itself — signing a truth analysis, a bare fact
  key, or winner/loser IDs authorizes nothing. Application
  (`src/resolve/apply-resolution.ts`) runs every safe preflight before
  consuming the approval, creates immutable successor revisions (content
  preserved; `verification_status: contradicted`;
  `resolution_decision_ref` recorded; predecessor and winner byte-
  identical — the winner is never auto-verified), and re-derives a fresh
  snapshot and analysis in which the resolved contradiction is closed and
  the old analysis is stale by construction. All post-consumption
  identities derive from the decision digest and receipt
  (`fact-resolution-id-sha256-1.0.0`) with receipt-sourced timestamps, so
  application is idempotent and crash-recoverable: retries resume
  byte-exactly, conflicting or forked state fails closed, and completed
  replays return the stored result. Single-host/single-writer file
  atomicity only — no distributed-transaction claim. A rejected verdict
  consumes its nonce and mutates nothing.
- **Safe operator CLI (Tier 0, Phase 1B.5, DEC-0017)** —
  `node dist/src/cli/nabcor.js <command>` makes the whole deterministic
  loop drivable by a human operator without touching internal APIs or
  layouts, as a THIN orchestration layer over the canonical services (it
  implements no truth, lineage, signing, verification, or resolution
  logic). Commands: `status` (policy/provider/authority/gate/phase state,
  public metadata only), `truth snapshot` / `truth analyze` /
  `truth inspect`, `resolution prepare` / `resolution apply` /
  `resolution inspect`, and `help`. Read-only commands and every
  `--dry-run` mutate nothing; every mutation requires an explicit
  `--artifacts-root` (no ambient defaults), explicit namespace, and a
  `--confirm-digest` bound to the exact reviewed state (an operator-error
  guard, never authentication); losers are always re-derived by the
  preparation service; `resolution apply` accepts PUBLIC approval
  evidence only, and no `nabcor` command reads a private key — signing
  stays exclusively in the separate personally-invoked `sign-approval`
  CLI, for which `resolution prepare` prints a template with a key-path
  placeholder. Typed failures exit under a stable documented code map
  with no stack traces; `--json` emits one stable object with no ANSI and
  no claim/source content. Operator quick start below.
- **Synthetic CLI example** — `node dist/src/cli/run-example.js --out <dir>` runs the
  full deterministic path on English-only synthetic fixtures. No network, no model
  calls, no client data.

What does **not** exist yet: model calls of any kind, provider adapters,
provider-backed extraction, natural-language fact extraction, semantic
contradiction detection, creative territories, channel specs, or the full
vertical slice. Q-009 is closed by DEC-0014 (offline Ed25519 approval
evidence), activated by DEC-0015 (one real Product Owner key enrolled,
registry v2 pinned by policy v2), and since Phase 1B.4 (DEC-0016) a
verified approval over a fact-resolution-decision artifact DOES apply one
business action: the deterministic fact-resolution application. Nothing
else applies from an approval — quarantine release, publishing, and every
independent-review action stay frozen. Q-002 is closed as **"no provider approved"** (DEC-0009):
model-backed work is prohibited by ratified policy — with external/model spend
capped at zero — rather than blocked on an open question, and enabling any
provider requires a new ratified decision meeting DEC-0009's requirements.
Only the offline gateway kernel and the Fake Adapter are validated; the
gateway as a whole is **not** production-ready for model work. Gate roles are
named (DEC-0008), but its four independent-review gates stay unapprovable
until an independent reviewer is formally named and enrolled; quarantined
content remains unreadable. EXP-0001 has not run and has no results.

## Operator quick start (synthetic example)

The full loop, with three strictly separated stages. Build first
(`npm ci && npm run build`); every identifier below is synthetic.

```bash
# 0. Read-only state overview (never mutates)
node dist/src/cli/nabcor.js status

# 1. Learn the current namespace digest (dry run — zero files)
node dist/src/cli/nabcor.js truth snapshot \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo --dry-run

# 2. Analyze structured truth (confirm-digest from step 1)
node dist/src/cli/nabcor.js truth analyze \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \
  --profile-ref tp-0001 --snapshot-id snap-0001 --analysis-id ta-0001 \
  --confirm-digest sha256:<claim-set digest from step 1>

# 3. Inspect contradictions, gaps, fingerprints, and the analysis digest
node dist/src/cli/nabcor.js truth inspect \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo --analysis-ref ta-0001

# 4. Prepare the exact immutable decision (losers are DERIVED, never typed in)
node dist/src/cli/nabcor.js resolution prepare \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \
  --analysis-ref ta-0001 --fact-key identity.primary_name \
  --contradiction-fingerprint <fingerprint printed by step 3> --winner claim-0001 \
  --requester-id op-demo --rationale "matches the registration certificate" \
  --decision-id frd-0001 --confirm-digest sha256:<analysis digest from step 3>

# 5. The KEY OWNER personally signs the exact printed decision digest
#    (nabcor never reads a private key; prepare prints this template):
node dist/src/cli/sign-approval.js --private-key <PATH-TO-YOUR-PRIVATE-KEY> \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \
  --target-type fact-resolution-decision --target-ref frd-0001 \
  --gate fact-resolution-approval --verdict approved \
  --reason "<YOUR-REASON>" --requester-id op-demo \
  --evidence-out <PATH-OUTSIDE-THE-REPOSITORY>/evidence-frd-0001.json

# 6. Apply the PUBLIC evidence (idempotent; safe to retry after a crash)
node dist/src/cli/nabcor.js resolution apply \
  --artifacts-root /ops/store --receipts-root /ops/receipts \
  --workspace ws-demo --brand-ref brand-demo \
  --evidence <PATH-OUTSIDE-THE-REPOSITORY>/evidence-frd-0001.json \
  --confirm-digest sha256:<decision digest from step 4>

# 7. Confirm completion, staleness rollover, and the fresh analysis
node dist/src/cli/nabcor.js resolution inspect \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo \
  --decision-ref frd-0001 --evidence <...>/evidence-frd-0001.json --receipts-root /ops/receipts
node dist/src/cli/nabcor.js truth inspect \
  --artifacts-root /ops/store --workspace ws-demo --brand-ref brand-demo --analysis-ref ta-0001
```

The CLI performs no natural-language extraction, selects no winner
automatically, enables no provider, releases no quarantine, publishes
nothing, and cannot satisfy an independent-review gate. EXP-0001 remains
unexecuted.

## Source-of-truth hierarchy

1. Product Constitution
2. Invariants
3. Ratified decisions
4. Versioned contracts
5. Current Second Brain state
6. Approved roadmap phase
7. Active experiments
8. Research
9. Working notes
10. Archive

Higher sources win. Conflicts are recorded; they are never silently reconciled.

## Start here

- Product definition: [`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md)
- Current state: [`brain/current/NOW.md`](brain/current/NOW.md)
- Roadmap: [`brain/current/ROADMAP.md`](brain/current/ROADMAP.md)
- Open decisions: [`brain/current/OPEN_QUESTIONS.md`](brain/current/OPEN_QUESTIONS.md)
- First slice: [`docs/FIRST_VERTICAL_SLICE.md`](docs/FIRST_VERTICAL_SLICE.md)
- Migration record: [`MIGRATION_MANIFEST.md`](MIGRATION_MANIFEST.md)

## License

No public license has been selected. Treat the repository as private/proprietary until
the product owner records a licensing decision.
