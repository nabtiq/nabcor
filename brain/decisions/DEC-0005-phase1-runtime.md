# DEC-0005 — Phase 1 deterministic runtime

decision_id: DEC-0005
title: "Node.js 20 + strict TypeScript ESM, no application or agent framework"
date: 2026-07-17
status: ratified
proposed_by: "Phase 1A implementation task"
approved_by: "product owner — explicit Phase 1A task instruction selecting the runtime"
approved_at: 2026-07-17

## Context

Q-003 blocked Phase 1: no implementation runtime had been selected. The Phase 1A
task requires the smallest provider-independent kernel that turns the existing
contracts into executable boundaries. The repository already carries its entire
validation toolchain in Node (Ajv contracts, `.mjs` validators, an npm-based CI
workflow), and the contracts are draft-07 JSON Schemas with Ajv as the reference
validator.

## Decision

The Phase 1 deterministic kernel and future gateway are implemented on:

- **Node.js 20** (the version CI already runs; `engines` already required >=20).
- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`) compiled with `tsc`;
  artifacts stay `unknown` until validated by the contract registry, so the JSON
  Schemas remain the single source of truth — no parallel interface layer.
- **ESM** (`"type": "module"`), matching the existing `.mjs` validators.
- **No application framework, no agent framework, no web framework, no ORM.** The
  kernel is plain modules + Node's built-in test runner.

New dev dependencies: `typescript` and `@types/node` only. No runtime dependencies.

## Alternatives

- **Python (+ jsonschema/pydantic):** strong schema tooling, but it would split the
  repository into two toolchains, duplicate the Ajv semantics (draft-07 nuances like
  the `propertyNames` closure pattern), and re-implement `contracts/validate.mjs`
  behavior instead of reusing it. Rejected as a second source of truth risk.
- **Plain JavaScript (.mjs) without TypeScript:** smallest dependency set, but gives
  up compile-time strictness for a kernel whose whole job is boundary enforcement.
  Rejected: the type checker is cheap and CI-enforceable.
- **Deno/Bun:** attractive single-binary toolchains, but CI, lockfile, and the
  existing validators are npm/Node-shaped; switching runtimes is not the smallest
  change. Rejected for now.
- **A framework (Nest, tRPC, LangChain-class agent kits):** nothing in Phase 1A is a
  service or an agent; INV-AGENT-001 and P11 forbid structure without measured need.
  Rejected.

## Evidence and assumptions

Evidence: the toolchain reuse above is observable in the repository. Assumption:
`tsc` + built-in test runner stay sufficient through Phase 1; no benchmark or
performance claim is made.

## Consequences

Contracts are enforced at runtime through one registry over the existing schemas;
tests, typecheck, and validation run in one `npm run validate` chain; adding a
provider gateway later is new modules plus configuration, not a runtime change.

## Revisit trigger

Phase 1 work demonstrates a concrete need the runtime cannot meet (e.g. a required
extraction library exists only outside the Node ecosystem, or type-level schema
derivation becomes necessary), or the gateway design requires capabilities Node 20
lacks. Any framework adoption requires a superseding decision with measured need.

## Supersession

supersedes: null
superseded_by: null

## Correction note (2026-07-17, append-only — see DEC-0006)

The sentence "New dev dependencies: `typescript` and `@types/node` only. No
runtime dependencies." was inaccurate as ratified: the kernel's contract
registry imports Ajv and ajv-formats at runtime, so a production-only install
without them cannot run the compiled kernel. DEC-0006 records the corrected,
authoritative dependency boundary — `ajv` and `ajv-formats` as runtime
`dependencies`; `typescript` and `@types/node` as devDependencies. The runtime
selection in this record (Node.js 20, strict TypeScript, ESM, no application or
agent framework, no provider SDK) stands unchanged. This note is appended per
AGENTS.md rule 17; the original text above is preserved, not rewritten.
