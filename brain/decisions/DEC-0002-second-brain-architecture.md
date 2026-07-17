# DEC-0002 — Second Brain architecture

decision_id: DEC-0002
title: "File-based Second Brain from the first repository version"
date: 2026-07-17
status: ratified
proposed_by: "foundation synthesis"
approved_by: "product owner — explicit Second Brain instruction"
approved_at: 2026-07-17

## Decision

Use a file-based, three-layer Second Brain: canonical truth, working memory, and
archive. Do not add a vector database until measured retrieval misses justify it.

## Consequences

Every session reads current state and relevant authority before acting. Decisions,
experiments, learnings, risks, and open questions have canonical homes and validators.
No chat transcript is product authority by default.

## Revisit trigger

The corpus exceeds roughly 200 canonical records or recorded retrieval misses cause
material defects despite correct naming and selective reads.

supersedes: null
superseded_by: null
