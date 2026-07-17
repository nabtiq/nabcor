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

Execution-layer records (`model-run`, `token-budget`, `context-manifest`,
`validation-matrix`, `deployment-readiness`) are operational records, not creative
artifacts — they carry their own required identity fields instead of the full envelope.

## Rules

- Change a schema → bump its `schema_version` example expectations, update fixtures,
  never silently (AGENTS.md rule 15).
- Every schema carries at least one `examples[]` entry; `validate.mjs` validates all
  examples against their schema on every run.
- Canonical artifacts never embed raw source documents — they reference `source`
  artifacts by id (envelope + fragment locators).
- Zod/TypeScript typed equivalents: deliberately deferred to Phase 1, where they land
  next to the code that consumes them (keeping this directory language-neutral).
  The repo's existing Zod validator (`packages/core/src/schema/`) continues to govern
  the website channel's `SiteContent` independently.

## Validate

```bash
node contracts/validate.mjs
```

Checks: every `*.schema.json` parses · compiles as draft-07 (ajv) · `$id` unique ·
every `examples[]` entry validates against its schema. Uses `ajv` already present in
`node_modules` (transitive dependency); no new dependencies added in Phase 0.
