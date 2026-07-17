# Decision System

**Version:** 1.1 · 2026-07-17 · governs `brain/decisions/` and all durable choices.
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

Repository-governance files use `brain/decisions/DEC-NNNN-<slug>.md` and the template in
`brain/templates/DECISION_TEMPLATE.md`. They require identity, status, proposer,
approval evidence when ratified, context, alternatives, evidence boundary,
consequences, revisit trigger, and supersession.

Runtime/brand decisions are structured artifacts conforming to
`contracts/decision.schema.json`. The Markdown record is canonical for repository
governance; the JSON contract is canonical for product runtime artifacts. IDs are
unique and never reused.

## Status semantics and ratification

- `proposed` — authored (by anyone, including an agent) but **not approved by the
  product owner**. Proposed records bind nobody; they are input for review, cited only
  as proposals.
- `ratified` — explicitly approved by the authorized human. Ratification is recorded
  **as repository evidence**: repository decisions record `approved_by` and
  `approved_at`; runtime decisions carry the schema-defined approval entry. A ratified
  record without human approval evidence is invalid.
- `rejected` — reviewed and declined; the reasoning remains durable.
- `superseded` — replaced by a linked later record.

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

| ID | Title | Status |
|---|---|---|
| DEC-0001 | NABCor is an AI Creative Operating System | ratified |
| DEC-0002 | File-based Second Brain from day one | ratified |
| DEC-0003 | Legacy website code is evidence, not product core | ratified |
| DEC-0004 | First vertical slice | ratified |
| DEC-0005 | Node.js 20 + strict TypeScript ESM, no framework | ratified |
| DEC-0006 | Runtime packaging truth: Ajv runtime deps, content capture, canonical source refs, quarantine namespace (release claim corrected by DEC-0007) | ratified |
| DEC-0007 | Fail-closed quarantine pending Q-001; Unicode code-point provenance locators; contracts 1.3.0 | ratified |
