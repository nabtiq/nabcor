# NOW

> Current state only. Git contains history; `brain/archive/` contains retired context.

**Updated:** 2026-07-18

## Current phase

Phase 1B.1 — offline provider-neutral gateway kernel, extending the Phase 1A
deterministic truth kernel. The clean foundation baseline (`0.1.0`) remains the
historical boundary (`FOUNDATION_BASELINE.md`).

## Current objective

Extend the deterministic UNDERSTAND path behind the proven gateway boundary.
Q-001 and Q-002 are closed (DEC-0008, DEC-0009): model-backed work is
prohibited by the zero-provider policy, not blocked on an open question.

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
- DEC-0007 — quarantine is fail-closed pending authenticated human-gate
  implementation (Q-001); provenance fragments use zero-based half-open
  Unicode code-point offsets (`#codepoints=`); contracts at 1.3.0.
- DEC-0008 — human gate roles: Ibrahim Mohamed (@ibra2000sd) holds all four
  roles effective 2026-07-18 with `self_review: true` required on every
  approval; four gates require an independent reviewer (not yet named);
  quarantine release remains fail-closed.
- DEC-0009 — zero-provider offline execution policy: no external provider
  approved, Fake Adapter only, synthetic data only, zero external/model spend;
  Q-002 closed as "no provider approved".
- DEC-0010 — offline provider-neutral gateway kernel: fail-closed policy
  contract, deterministic Fake Adapter, structured-output validation,
  manifest/run-record observability, pre-invocation budget enforcement.

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
  no runtime read path exists pending Q-001 (DEC-0007).
- Tier-0 `classify-input` with conservative rights defaults, honest capture
  states, quarantine-only capture of flagged inline content, explicit-null
  visual classification, and a bounded injection-warning scanner
  (`src/understand/classify-input.ts`).
- Tier-0 `build-brand-context` deterministic compiler with canonical
  `source:<artifact_id>` claim references, code-point fragment bounds checks
  against captured content, and fail-closed rejection of every claim citing a
  quarantined source (`src/compile/build-brand-context.ts`).
- Contracts at `schema_version` 1.3.0 (see `contracts/README.md` migration note).
- Synthetic CLI example (`src/cli/run-example.ts`) and runtime tests (`test/`).
- Skill specs for exactly the two implemented capabilities (`skills/`).

## Implemented (Phase 1B.1, DEC-0009/DEC-0010)

- Offline provider-neutral gateway kernel (`src/gateway/`): strict
  `gateway-policy` and `gateway-request` contracts (additive, 1.3.0), the
  CI-validated committed active policy pinning the zero-provider posture,
  fail-closed policy enforcement before invocation, pre-invocation token-budget
  checks, context manifests persisted before every adapter call,
  structured-output validation, truthful zero-token/zero-cost `model-run`
  records, and an immutable namespaced operational record store.
- Deterministic Fake Adapter (`fake` / `offline` /
  `deterministic-fake-adapter-v1`, tier 0) with an invocation counter proving
  rejected requests never reach it. Infrastructure validation only — no
  model-quality evidence; EXP-0001 remains unstarted and empty.

## Blocked / not implemented

- Provider adapters, real model calls, and provider-backed extraction:
  prohibited by the ratified zero-provider policy (DEC-0009, zero spend);
  enabling any provider requires a new ratified decision meeting DEC-0009's
  nine requirements.
- Quarantine release: gate roles are named (DEC-0008), but release requires
  both an independent reviewer (none formally named) and an authenticated gate
  mechanism (not designed) — DEC-0007's fail-closed rule stands, and flagged
  content stays fenced. The same independent-reviewer gap freezes client-facing
  publishing, BLOCKING evaluation-gate changes, and real-client-data provider
  approval.
- Territories, direction, channel specs, evaluation skills: later phases.
- EXP-0001 has not run; its Result section is empty.

## Immediate next actions

1. Propose the next Phase 1 increment (deterministic UNDERSTAND-path extension
   behind the gateway) as a proposal for product-owner review.
2. Keep `npm run validate` green on every change.

## Definition of done for the current objective

Phase 1B.1 merged with validation green; NOW, ROADMAP, RISKS, and
OPEN_QUESTIONS consistent with DEC-0008..DEC-0010; no model-quality claims
anywhere.
