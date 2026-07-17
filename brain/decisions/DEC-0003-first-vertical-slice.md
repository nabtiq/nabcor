---
decision_id: DEC-0003
title: "First vertical slice: spec-level outputs, two input modes, five human gates"
date: 2026-07-17
status: proposed
decided_by: "foundation agent (proposer). Slice shape originates from the product owner's Master Prompt D14; the spec-level boundary is the agent's proposal; ratification required from the product owner"
context: >
  The Master Prompt fixes the slice pipeline: input → brand context → three territories
  → human selection → direction package → one premium homepage spec → three connected
  social launch asset specs → evaluation report → saved decisions. BC-001 integration
  adds artifacts, gates, and budgets.
problem: >
  Where exactly does the slice stop — and what does "produce a homepage" mean before
  generation/publishing infrastructure exists?
options:
  - option_id: spec-level
    summary: >
      The slice produces validated specifications (website-spec, social-asset-specs)
      with claim-bound copy and image briefs — preview-ready, not published.
  - option_id: build-level
    summary: The slice also compiles the website-spec through the nabcor channel layer to a rendered site.
  - option_id: publish-level
    summary: The slice ends with a deployed site and posted assets.
selected_option: spec-level
reason: >
  Spec-level isolates the unproven layers (truth, direction, coherence, evaluation)
  from the proven one (nabcor website production already ships real sites). It keeps
  the slice cheap enough to run repeatedly for evaluation (P9), avoids building
  generation/publishing infrastructure prematurely (Master Prompt §6), and still
  yields a complete, judgeable creative outcome.
evidence:
  - "Master Prompt D14: 'The first vertical slice should produce specifications and preview-ready outputs. It does not need full publishing…'"
  - "nabcor pipeline already covers spec→site for the website channel (prompts/01–08, delivery-baseline.md)"
  - "BC-001: direction+contract quality determined outcome quality; production mechanics were the reliable part"
assumptions:
  - "Spec quality is judgeable without full rendering via structured previews + evaluator rubrics (MEDIUM risk — EXP-0002/0004 test this)"
consequences:
  - "Slice deliverables are artifacts, not deployments; deployment-readiness exists as contract only"
  - "Phase 1 implementation = the UNDERSTAND path (brand context pipeline) first"
  - "Slice budget is sized for repeated evaluation runs (docs/MODEL_AND_TOKEN_STRATEGY.md §7)"
risks:
  - "Spec-level outputs may hide render-time quality issues (typography, real contrast) — mitigated by conceptual previews in territory/direction artifacts and by Phase-2 render checks"
affected_artifacts:
  - docs/FIRST_VERTICAL_SLICE.md
  - contracts/website-spec.schema.json
  - contracts/social-asset-spec.schema.json
revisit_trigger: >
  When slice evaluations are stable and distinctiveness scores are trustworthy, a new
  decision extends the slice to build-level via the existing nabcor channel layer.
supersedes: null
superseded_by: null
---

# DEC-0003 — First vertical slice boundary

Specs, not sites. The slice proves the intelligence spine; the existing channel layer
already proves production.

**Ratification:** pending — see `brain/current/OPEN_QUESTIONS.md` §Ratification.
