# Foundation Baseline

**Version:** 0.1.0
**Date:** 2026-07-17
**Status:** ready for repository replacement and product-owner review of the proposed
first vertical slice.

## Baseline outcome

This repository now represents one product only: NABCor, the evidence-aware AI Creative
Operating System. The former website-builder runtime is not included.

## Ratified by the product-owner instruction that created this baseline

- NABCor is an AI Creative Operating System, not a website builder.
- The repository is restarted from a clean foundation instead of preserving the old
  application as the product core.
- A file-based Second Brain is operational from the first repository version.
- Only legacy material that supports the new vision is retained.

These instructions are recorded in DEC-0001 through DEC-0003.

## Still proposed

- DEC-0004: the exact first vertical-slice boundary.
- Provider accounts and measurable spend ceilings.
- Named human roles when one person performs product-owner, operator, reviewer, and
  evaluation-owner duties.
- The first implementation language and runtime.

## Verification included

- Strict Draft-07 JSON Schemas for 20 artifact/operational contracts.
- Positive and negative validation fixtures.
- Deterministic semantic checks for cross-field invariants.
- Second Brain structural validator.
- Repository-baseline validator.
- GitHub Actions workflow running the full validation suite.

## Deliberately absent

No product runtime, model-provider integration, UI, website generator, deployment
automation, billing, authentication, vector database, agent swarm, or publishing path
is included. Absence here is scope discipline, not missing implementation.
