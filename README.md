# NABCor

> Evidence-aware AI Creative Operating System for building distinctive, coherent brand worlds across channels.

**Foundation version:** `0.1.0`
**Status:** clean architecture baseline plus the deterministic Phase 1A truth kernel
(DEC-0004/DEC-0005). No provider-backed extraction, no model calls, and no full
vertical slice exist yet.

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
  an authenticated human-gate implementation and an independent reviewer
  (Q-001 answered by DEC-0008; both prerequisites still missing). PDF/DOCX/image/logo
  descriptors carry no bytes and are recorded `descriptor-only`; URLs stay
  `external-unfetched`.
- **`classify-input` (Tier 0)** — deterministic classification of input descriptors
  into schema-valid `source` artifacts with conservative rights defaults, honest
  capture states, and a bounded injection-warning scanner (INV-SEC-002). Flagged
  inline content is captured only into the quarantine namespace. Unclassified
  visuals record `visual_classification: null` — documentary status is never
  inferred from absence (INV-FACT-003). No OCR, parsing, or fetching.
- **`build-brand-context` (Tier 0)** — deterministic compilation of already
  structured claims, assumptions, contradictions, and gaps into a schema-valid
  Brand Context Package. Claim provenance resolves through canonical
  `source:<artifact_id>[#codepoints=a-b|#page=n]` references; fragment offsets
  are zero-based half-open Unicode code-point positions (DEC-0007 — never
  UTF-16 units or bytes) bounds-checked against the captured content; claims
  citing quarantined sources are always rejected with a typed failure —
  quarantined and fail-closed pending authenticated human-gate implementation
  (Q-001, DEC-0008). It is a compiler over structured truth, not a natural-language
  extractor.
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
- **Synthetic CLI example** — `node dist/src/cli/run-example.js --out <dir>` runs the
  full deterministic path on English-only synthetic fixtures. No network, no model
  calls, no client data.

What does **not** exist yet: model calls of any kind, provider adapters,
provider-backed extraction, creative territories, channel specs, or the full
vertical slice. Q-002 is closed as **"no provider approved"** (DEC-0009):
model-backed work is prohibited by ratified policy — with external/model spend
capped at zero — rather than blocked on an open question, and enabling any
provider requires a new ratified decision meeting DEC-0009's requirements.
Only the offline gateway kernel and the Fake Adapter are validated; the
gateway as a whole is **not** production-ready for model work. Gate roles are
named (DEC-0008), but its four independent-review gates stay unapprovable
until an independent reviewer is formally named. EXP-0001 has not run and has
no results.

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
