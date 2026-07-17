# NOW

> Snapshot of the present. Overwritten as state changes — never a diary.
> History lives in git; narratives live in `brain/archive/`.

**Updated:** 2026-07-17

## Current phase

Phase 0 — Foundation. **Authored and validated; pending product-owner ratification**
(this branch: `foundation/phase-0`, worktree `~/Nabtiq/Nabdev/nabcor-foundation`).
Independent-review corrections applied: contracts hardened + negative fixtures +
semantic checks + CI workflow; DEC-0001..0004 set to `proposed`.

## Current objective

Get the foundation package (constitution, invariants, domain model, contracts, Second
Brain, evaluation framework, first-vertical-slice spec) reviewed and ratified by the
product owner so Phase 1 implementation can start from a fixed base.

## Current active work

- None in flight on this branch beyond review. The foundation deliverables are written
  and validated (see `FOUNDATION_REPORT.md` §12).
- **Parallel work stream (not this branch):** multi-page core architecture changes sit
  uncommitted in the main working tree (routing/, schema/site.ts, multipage tests).
  Owned outside Phase 0; see OPEN_QUESTIONS Q-001.

## Current blockers

- Product-owner ratification of the four **proposed** decision records
  (DEC-0001..0004) — exact action in `OPEN_QUESTIONS.md` §Ratification.
- Product-owner answers to Q-001..Q-003 (decision packet in `OPEN_QUESTIONS.md`).
- Review of the invariant set and the slice budget assumptions
  (`docs/MODEL_AND_TOKEN_STRATEGY.md` §7).

## Immediate next actions

1. Product owner reviews `FOUNDATION_REPORT.md` and the constitution package.
2. Resolve OPEN_QUESTIONS items marked BLOCKING (Q-001..Q-003).
3. On ratification: merge `foundation/phase-0`, then start Phase 1 with the exact task
   in `FOUNDATION_REPORT.md` §15.

## Definition of done (current objective)

Foundation branch merged; DEC-0001..0004 status confirmed `ratified` by the product
owner; Phase 1 kickoff task created with its invariant/contract/scope bindings per
AGENTS.md task rules.
