---
decision_id: DEC-0001
title: "Product category: AI Creative Operating System, not AI website builder"
date: 2026-07-17
status: ratified
decided_by: "hanafi (product owner) — via Foundation Master Prompt §1; executed by foundation agent"
context: >
  nabcor began as a shared foundation for client websites (README three-layer model,
  8-prompt pipeline). The Foundation Master Prompt redefines the product as a Creative
  Operating System producing multi-channel outputs from one intelligence spine.
problem: >
  Is NABCor a website builder with extras, or a creative OS whose first channel is
  websites? The answer determines the domain model, the slice, and every scope test.
options:
  - option_id: website-builder-plus
    summary: Keep the website-builder identity; add social assets as an export feature.
  - option_id: creative-os
    summary: >
      Creative Operating System: truth → direction → brand world → channels; websites
      and social are channel outputs of one spine.
  - option_id: split-products
    summary: Two products (site builder + campaign tool) sharing a brand model.
selected_option: creative-os
reason: >
  The competitive thesis (brand understanding, provenance, direction, coherence,
  memory) only pays off across channels; a website-only frame caps it. BC-001 showed
  the value concentrated in direction/contract/gate layers that are channel-agnostic.
  Split products would duplicate the truth and direction layers — the most expensive
  parts.
evidence:
  - "Foundation Master Prompt §1–§2 (product owner's directive)"
  - "BC-001: quality jumps traced to direction + contracts + gates, not channel mechanics (HUMAN_AI_CONTRIBUTION_MAP)"
  - "FOUNDATION-AUDIT.md: five sites re-invented the same channel layer — the shared value sits above the channel"
assumptions:
  - "Multi-channel demand is real for the target users (MEDIUM risk — validated only anecdotally; slice social specs test it)"
consequences:
  - "Existing nabcor monorepo is re-positioned as the website channel production layer (KEEP)"
  - "Domain model centers on Brand/Claim/Direction, not Site"
  - "First slice produces channel-agnostic direction artifacts + two channel spec types"
risks:
  - "Scope gravity: 'OS' framing invites feature sprawl — countered by NON_GOALS scope test and P9"
affected_artifacts:
  - constitution/PRODUCT_CONSTITUTION.md
  - docs/DOMAIN_MODEL.md
  - docs/FIRST_VERTICAL_SLICE.md
revisit_trigger: >
  If two consecutive evaluation cycles show slice channel outputs scoring well
  individually but cross-channel coherence adding no measured user value, revisit
  whether the OS frame earns its complexity.
supersedes: null
superseded_by: null
---

# DEC-0001 — Product category: AI Creative Operating System

The website builder is the first channel engine, not the product. All future scope
questions test against the Creative OS spine defined in the constitution (§2, §5).
