---
decision_id: DEC-0004
title: "BC-001 adoption: evidence classes and accepted findings bind the foundation"
date: 2026-07-17
status: ratified
decided_by: "hanafi (product owner) — via the BC-001 integration directive (2026-07-17); dispositions executed per acceptance ledger"
context: >
  A forensic retrospective of the Josour Al Azl production build (branch
  retrospective/bc-001 @ 4b06c2e, josouralazl repo) produced measured evidence about
  what actually creates quality and waste in AI-driven brand/site delivery, an
  amendment set (A1–A16), and machine-readable datasets.
problem: >
  How does one project's evidence bind a general product foundation without
  over-generalizing single-case lessons?
options:
  - option_id: adopt-with-classes
    summary: >
      Adopt findings through explicit evidence classes (VALIDATED_BC001 /
      SUPPORTED_BC001 / HYPOTHESIS_FOR_EXPERIMENT / PROJECT_SPECIFIC /
      INSUFFICIENT_EVIDENCE); validated findings become invariants/gates, hypotheses
      become experiments, project-specific lessons are recorded but not generalized.
  - option_id: adopt-wholesale
    summary: Treat all retrospective recommendations as rules.
  - option_id: ignore
    summary: Treat BC-001 as anecdote; design the foundation from first principles.
selected_option: adopt-with-classes
reason: >
  BC-001 is the only measured baseline in existence for this product; ignoring it
  wastes the strongest available evidence, adopting it wholesale converts one project's
  circumstances into dogma. Evidence classes keep the boundary honest and give BC-002+
  a falsifiable structure.
evidence:
  - "JOSOUR_RETROSPECTIVE_REPORT.md + retrospective/* @ 4b06c2e"
  - "NABCOR_FOUNDATION_v1.0_to_v1.1_CHANGELOG.md (A1–A16 dispositions: 11 accepted, 4 modified, 1 'change nothing')"
  - "retrospective/BC001_ACCEPTANCE_LEDGER.md @ c6c8fe3 (per-lesson dispositions)"
consequences:
  - "Invariants INV-PE-001, INV-AR-001, INV-PUB-001, INV-HUM-001/002, INV-OBS-001, INV-DEC-001 carry BC-001 evidence"
  - "Gates G1–G6 exist; G7 advisory, G8 experimental"
  - "BC-001 data/ registered as the first baseline dataset under rights constraints (INV-DATA-002)"
  - "Experimental metrics (survival, yield, cost-per-artifact) stay experimental until BC-002 validates calculation"
risks:
  - "Anchoring: BC-001 was one bilingual construction-sector site with a strong operator — signals from other verticals may differ; the benchmark dataset spans 15+ verticals to counter this"
affected_artifacts:
  - constitution/INVARIANTS.md
  - docs/EVALUATION_FRAMEWORK.md
  - evals/datasets/README.md
  - NABCOR_FOUNDATION_MASTER_PROMPT_v1.1_BC001.md
revisit_trigger: >
  BC-002 completion: every VALIDATED_BC001 rule is re-scored against the second case;
  contradictions produce superseding decisions.
supersedes: null
superseded_by: null
---

# DEC-0004 — BC-001 adoption

One measured case, adopted through evidence classes — never as universal proof.
