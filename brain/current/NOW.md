# NOW

> Current state only. Git contains history; `brain/archive/` contains retired context.

**Updated:** 2026-07-17

## Current phase

Clean Foundation Baseline (`0.1.0`). The legacy website-builder runtime has been
removed from the new repository shape. Product truth, contracts, evaluation, and the
Second Brain are present before implementation begins.

## Current objective

Review and ratify the proposed first vertical slice (DEC-0004), resolve the blocking
Phase 1 operating decisions, and only then implement the Brand Context Package truth
layer.

## Ratified foundation decisions

- DEC-0001 — NABCor is an AI Creative Operating System.
- DEC-0002 — the Second Brain is file-based from day one; no vector database yet.
- DEC-0003 — legacy website code is archived evidence, not the new product core.

## Active work

- No product implementation is in flight.
- Contract, brain, and repository validators define the current completion gate.
- DEC-0004 remains proposed; the slice documents are design inputs, not authorization
  to start Phase 1.

## Blockers

1. Product-owner verdict on DEC-0004.
2. Named human gate roles (Q-001).
3. Approved model providers, data policy, and spend ceilings (Q-002).
4. Initial implementation runtime/language (Q-003).

## Immediate next actions

1. Run `npm ci && npm run validate` after creating the repository.
2. Review `docs/FIRST_VERTICAL_SLICE.md` and DEC-0004.
3. Record answers to Q-001..Q-003 as decisions, not chat-only state.
4. Create the Phase 1 branch only after those decisions are ratified.

## Definition of done for the current objective

DEC-0004 and the Phase 1 operating decisions are ratified; budgets are explicit;
synthetic benchmark fixtures are selected; the Phase 1 task names its contracts,
invariants, tests, and stop conditions.
