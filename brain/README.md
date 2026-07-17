# NABCor Second Brain

The Second Brain is part of product architecture, not a notes folder. Its purpose is
to ensure that product truth, decisions, human taste, rejection, experiments, and
failures survive individual conversations and improve later work.

## Layers

1. **Canonical:** constitution, invariants, ratified decisions, contracts, current
   state. Load selectively by task relevance.
2. **Working:** task plans, drafts, local tool output. Promote only durable results.
3. **Archive:** superseded context. Never loaded automatically.

## Directory responsibilities

- `current/` — present state only: NOW, ROADMAP, RISKS, OPEN_QUESTIONS.
- `decisions/` — durable choices and rejected alternatives.
- `experiments/` — hypotheses, methods, thresholds, and measured results.
- `learnings/` — append-only reusable lessons and corrections.
- `research/` — cited external analysis; never product authority by itself.
- `templates/` — canonical record shapes.
- `archive/` — retired snapshots and obsolete working context.

## Update protocol

At the start of work, read NOW and the relevant higher-authority files. At completion:

1. Update NOW only if current state changed.
2. Create or supersede decisions for durable choices.
3. Record measured experiment results without rewriting hypotheses.
4. Append reusable learning; corrections supersede rather than erase.
5. Move stale narrative context to archive.
6. Run `npm run validate:brain`.

Chat transcripts and model summaries are not canonical unless promoted into one of
these record types with provenance.
