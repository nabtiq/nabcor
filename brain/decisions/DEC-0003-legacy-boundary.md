# DEC-0003 — Legacy boundary

decision_id: DEC-0003
title: "Legacy website code is evidence, not the new product core"
date: 2026-07-17
status: ratified
proposed_by: "foundation synthesis"
approved_by: "product owner — explicit clean-replacement instruction"
approved_at: 2026-07-17

## Decision

Do not carry the legacy Next.js demo, website core, theme packages, deployment
templates, or clone-and-swap prompts into the clean NABCor baseline. Preserve reusable
lessons, contracts, and evidence boundaries instead.

## Consequences

Future channel adapters start behind explicit contracts and decisions. Legacy code may
be consulted or selectively reintroduced only when a new adapter decision establishes
fit, migration cost, tests, and ownership.

## Revisit trigger

A ratified channel-adapter proposal demonstrates that a specific legacy component is
the smallest suitable implementation and passes all current invariants.

supersedes: null
superseded_by: null
