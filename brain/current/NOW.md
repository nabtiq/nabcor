# NOW

> Current state only. Git contains history; `brain/archive/` contains retired context.

**Updated:** 2026-07-17

## Current phase

Phase 1A — deterministic truth kernel. The clean foundation baseline (`0.1.0`) is
closed as the historical boundary (`FOUNDATION_BASELINE.md`); DEC-0004 is ratified and
DEC-0005 selected the runtime.

## Current objective

Extend the deterministic kernel toward the full Phase 1 UNDERSTAND path once the
provider-blocking decisions (Q-001, Q-002) are resolved.

## Ratified decisions

- DEC-0001 — NABCor is an AI Creative Operating System.
- DEC-0002 — the Second Brain is file-based from day one; no vector database yet.
- DEC-0003 — legacy website code is archived evidence, not the new product core.
- DEC-0004 — first vertical slice, ratified with its proposed boundary unchanged.
- DEC-0005 — Node.js 20 + strict TypeScript ESM, no application or agent framework.

## Implemented (Phase 1A)

- English-only repository policy with a deterministic language gate
  (`scripts/validate-language.mjs`, in `npm run validate` and CI).
- Contract registry over the existing Ajv schemas (`src/kernel/contract-registry.ts`).
- File artifact store with workspace/brand namespaces, validate-before-write,
  no-overwrite, lineage checks (`src/kernel/artifact-store.ts`).
- Tier-0 `classify-input` with conservative rights defaults and a bounded
  injection-warning scanner (`src/understand/classify-input.ts`).
- Tier-0 `build-brand-context` deterministic compiler
  (`src/compile/build-brand-context.ts`).
- Synthetic CLI example (`src/cli/run-example.ts`) and runtime tests (`test/`).
- Skill specs for exactly the two implemented capabilities (`skills/`).

## Blocked / not implemented

- Provider-backed extraction, the model gateway, and every model call: blocked on
  Q-002 (providers, data policy, spend) — not on the runtime, which is decided.
- Named human gate roles: Q-001 remains open.
- Territories, direction, channel specs, evaluation skills: later phases.
- EXP-0001 has not run; its Result section is empty.

## Immediate next actions

1. Product owner answers Q-001 (gate roles) and Q-002 (providers/spend).
2. Design the model gateway contract against DEC-0005 once Q-002 closes.
3. Keep `npm run validate` green on every change.

## Definition of done for the current objective

Q-001/Q-002 recorded as decisions; gateway design proposed as a decision record;
kernel remains green under `npm run validate`.
