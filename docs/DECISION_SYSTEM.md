# Decision System

**Version:** 1.0 · 2026-07-17 · governs `brain/decisions/` and all durable choices.
Invariant: INV-DEC-001. Contract: `contracts/decision.schema.json`.

## When a decision record is required

Durable choices only: product category/scope changes · architecture choices ·
creative-direction selections (per brand) · contradiction/fact resolutions with lasting
effect · new dependencies, frameworks, or agent roles · anything that supersedes a
prior decision · anything a future session would otherwise re-litigate.

**Not** decision records: meeting notes, status updates, task plans, reversible
day-to-day choices, anything fully derivable from code. NOW.md and working notes exist
for those.

## Format

Files: `brain/decisions/DEC-NNNN-<slug>.md` (product/architecture scope) with YAML
front-matter conforming to `contracts/decision.schema.json`; brand-scoped decisions
live in the brand's namespace with the same schema. IDs are unique, sequential,
never reused. Machine-readable front-matter is the source of truth; the prose body is
the derived human rendering (INV-DEC-001 dual-form rule).

Required fields: `decision_id`, `title`, `date`, `status`
(`proposed | ratified | superseded | revisited`), `context`, `problem`,
`options` (each with summary), `selected_option`, `reason`, `evidence`,
`assumptions`, `consequences`, `risks`, `affected_artifacts`, `revisit_trigger`,
`supersedes`/`superseded_by`, `decided_by` (a human for INV-HUM-001 classes).

## Rules

1. A decision is binding only in `ratified` status.
2. Superseding requires a new record linking both directions; the old record is never
   edited beyond its `superseded_by` field.
3. Conflicts between decisions and higher sources (constitution, invariants) resolve
   upward; document the conflict, don't silently patch (`AGENTS.md` §hierarchy).
4. Every ratified decision names its **revisit trigger** — the observable condition
   that reopens it. "Never" is not a trigger.
5. Coding agents must read the decision records touching their task's area before
   changing related code (`AGENTS.md` session rules) and must create one for durable
   changes they introduce.

## Seed records

| ID | Title |
|---|---|
| DEC-0001 | Product category: AI Creative Operating System |
| DEC-0002 | Second Brain: file-based, three context layers, no vector DB yet |
| DEC-0003 | First vertical slice: spec-level, two input modes |
| DEC-0004 | BC-001 adoption: evidence classes and accepted findings bind the foundation |
