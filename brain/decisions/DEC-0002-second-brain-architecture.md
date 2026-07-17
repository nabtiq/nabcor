---
decision_id: DEC-0002
title: "Second Brain: file-based, three context layers, no vector database yet"
date: 2026-07-17
status: proposed
decided_by: "foundation agent (proposer), per Master Prompt §9 + D8 constraints; ratification required from the product owner"
context: >
  Agents and humans need persistent, discoverable project memory: decisions, state,
  risks, questions, research, experiments, learnings. The Master Prompt mandates a
  Second Brain with canonical/working/archive layers and explicitly discourages
  premature embedding infrastructure.
problem: >
  What storage and retrieval architecture gives agents reliable context without
  injecting everything into every prompt — and without building retrieval
  infrastructure before there is evidence it is needed?
options:
  - option_id: file-based-layers
    summary: >
      Plain versioned files in git: brain/ with current/decisions/research/experiments/
      learnings/archive; discovery via naming convention + explicit context selectors;
      three authority layers (canonical, working, archive).
  - option_id: vector-db
    summary: Embed everything into a vector store; retrieval by similarity.
  - option_id: structured-db
    summary: A database (SQLite/Postgres) with a query API for all brain content.
selected_option: file-based-layers
reason: >
  Files are versioned, diffable, human-editable, agent-readable, and free; the corpus
  is small (tens of documents); naming conventions + front-matter give deterministic
  retrieval; BC-001 proved prose/typed files carry state across rounds. Vector
  retrieval adds infrastructure, hosting, and failure modes with no demonstrated need
  at this corpus size; a database adds an API layer between agents and truth.
evidence:
  - "BC-001 L03 (VALIDATED): file contracts carried three rounds without drift"
  - "Master Prompt D8: 'Do not build an embedding or vector database yet unless there is an immediate demonstrated need' — none demonstrated"
  - "Corpus size at foundation: <60 files (see FOUNDATION_REPORT.md file list)"
assumptions:
  - "File-based context selectors will find the right decisions/learnings at slice scale (LOW risk now, MEDIUM at >200 learnings) — retrieval misses will be recorded as learnings"
consequences:
  - "Context selectors are naming-convention + front-matter driven (AGENTS.md §context policy)"
  - "Layer rules: canonical (constitution/invariants/decisions/contracts/current state) loads by relevance; working memory summarized after tasks; archive never auto-loads"
  - "Preferences/learnings use append-only structured markdown/JSONL (brain/learnings/README.md)"
risks:
  - "Retrieval quality degrades silently as the corpus grows — early signal: agents re-asking answered questions; mitigation: recorded retrieval misses trigger the vector-DB revisit"
affected_artifacts:
  - brain/ (entire structure)
  - AGENTS.md
revisit_trigger: >
  Three or more recorded retrieval misses in learnings within one phase, or brain
  corpus exceeding ~200 retrievable units, triggers a retrieval-architecture
  experiment (EXP series) before any tooling is adopted.
supersedes: null
superseded_by: null
---

# DEC-0002 — Second Brain architecture

Files over infrastructure until evidence demands otherwise. The three-layer authority
model (canonical / working / archive) is enforced by AGENTS.md context policy, not by
tooling, at this stage.

**Ratification:** pending — see `brain/current/OPEN_QUESTIONS.md` §Ratification.
