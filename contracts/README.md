# Contracts

Versioned JSON Schemas (draft-07) for NABCor's canonical artifacts. These are **initial
contracts, not final database models** — semantic clarity first, storage later.
Authority rank 4 (below decisions, above current state) — see `AGENTS.md`.

## Layout

- `artifact-envelope.schema.json` — shared envelope + definitions (`envelope`,
  `approval`, `localized_text`, `rights`) referenced by artifact schemas via `allOf`.
- Truth layer: `source`, `claim`, `assumption`.
- Decision layer: `decision`.
- Creative layer: `brand-context`, `creative-brief`, `creative-territory`,
  `creative-direction`, `brand-dna`, `visual-world`, `design-system`.
- Production layer: `website-spec`, `social-asset-spec`.
- Evaluation layer: `evaluation-report`.
- Execution layer: `model-run`, `token-budget`, `context-manifest`,
  `validation-matrix`, `deployment-readiness`.
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

Artifact `schema_version` for all contracts: **1.1.0** (was 1.0.0).

**Migration implications (1.0.0 → 1.1.0):** validation is strictly narrower — any
artifact carrying undeclared fields, or violating a semantic check below, is now
rejected. No data migration exists to perform: no real artifacts had been authored
against 1.0.0 (foundation phase; examples and fixtures are the only instances, all
updated). Rules going forward: change a schema → bump `schema_version` expectations,
update fixtures, never silently (AGENTS.md rule 15).

## Validation

```bash
node contracts/validate.mjs
```

Two distinguishable layers, both required green (non-zero exit otherwise):

- **Schema layer** (ajv, draft-07 — resolved from the existing dependency graph, no
  new dependencies): every schema compiles · `$id`s unique · every `examples[]` entry
  and `fixtures/positive.json` case validates · every `fixtures/negative.json` case
  with `expect_fail_at: "schema"` is rejected.
- **Semantic layer** — deterministic cross-field checks draft-07 cannot express
  cleanly, each named for the invariant it enforces:
  ratification-approval (INV-HUM-001/INV-DEC-001) · score-requires-rubric and
  blocking-consistency (INV-EVAL-001) · inference-verification-needs-human
  (INV-FACT-002) · cost-mode-consistency (INV-OBS-001) · combination-membership and
  js-disabled-presence (INV-AR-001/INV-PE-001) · factual-slots-claim-backed
  (INV-FACT-001). Negative fixtures with `expect_fail_at: "semantic"` must pass the
  schema layer and fail here.

The command prints: schemas compiled, positive cases passed, negative cases correctly
rejected (schema/semantic split), semantic checks passed, `$id` uniqueness.
CI: `.github/workflows/foundation-contracts.yml` runs this on every change to
`contracts/`.

Zod/TypeScript typed equivalents: deliberately deferred to Phase 1, where they land
next to the code that consumes them (keeping this directory language-neutral). The
repo's existing Zod validator (`packages/core/src/schema/`) continues to govern the
website channel's `SiteContent` independently.
