# Open Questions and Assumptions

**Updated:** 2026-07-17. Assumptions carry risk class (LOW/MEDIUM/HIGH). High-risk
assumptions must not silently become architectural decisions (Master Prompt §14).

## A. Questions blocking implementation (resolve before/at Phase 1 start)

```yaml
- id: Q-001
  question: How does the in-flight multi-page core work (uncommitted in the main
    working tree: routing/, schema/site.ts, [...segments]/, multipage tests) relate to
    the foundation? Merge first, park, or continue in parallel?
  why_blocking: Phase 4's spec→site bridge and RISK-ARCH-01 depend on which core ships;
    website-spec assumptions differ between single-page and multi-page cores.
  needs: product-owner decision → decision record (DEC series)
  proposed_safe_default: continue Phase 1 (truth layer) which is core-agnostic; decide
    before Phase 3 spec work hardens.

- id: Q-002
  question: Who are the named humans behind the gate roles (operator, reviewer,
    evaluation owner, product owner) while the team is effectively one person?
  why_blocking: INV-HUM-001 requires decided_by naming a human; one person holding all
    roles is acceptable but must be explicit (self-review is a known weakness).
  needs: product-owner statement recorded in a decision or in this file's answer log.

- id: Q-003
  question: Which model providers/accounts are approved for Phase 1, and what is the
    monthly spend ceiling?
  why_blocking: token budgets (EXP-0005) and routing config need real ceilings;
    BC-001 ran on a subscription with unknowable allocation — Phase 1 should prefer
    API-billed usage for measurable cost (INV-OBS-001).
  needs: product-owner decision.
```

## B. Questions testable by experiment

```yaml
- id: Q-004
  question: Does artifact-based context passing actually reduce token cost vs
    long-session re-reading? (BC-001 L14, HYPOTHESIS)
  experiment: EXP-0005 (token budget baseline) + context manifests.

- id: Q-005
  question: Can territory diversity be measured well enough to gate on it?
  experiment: EXP-0002.

- id: Q-006
  question: Can AI-genericity be detected reliably enough to be more than advisory?
  experiment: EXP-0003.
```

## C. Questions requiring user/stakeholder decisions (not blocking Phase 1)

```yaml
- id: Q-007
  question: When generation infrastructure lands (Phase 2+), does Asset get its own
    schema or extend source.schema? (DOMAIN_MODEL §5 note)
  needs: architecture decision at Phase 2 kickoff.

- id: Q-008
  question: Do slice review surfaces live in a minimal web UI, or in files+CLI for
    Phase 1–3? (Master Prompt excludes complex UI; some human gates need a usable surface.)
  needs: product-owner preference before Phase 3.

- id: Q-009
  question: Pricing/positioning of NABCor as a product vs internal Nabtiq tooling —
    when does external productization begin?
  needs: business decision; not before Phase 4 evidence.
```

## D. Long-term questions

```yaml
- id: Q-010
  question: What does performance-outcome ingestion look like for Gulf-market clients
    where analytics access is often unavailable? (Outcome entity is deferred.)
- id: Q-011
  question: At what corpus size does file-based retrieval fail? (DEC-0002 revisit
    trigger monitors this.)
```

## Assumptions in force

```yaml
- id: ASM-001
  statement: The slice's spec-level outputs are judgeable without full rendering.
  risk: MEDIUM
  source: DEC-0003
  revisit: EXP-0002/0004 results.

- id: ASM-002
  statement: File-based Second Brain retrieval suffices at current corpus size.
  risk: LOW (MEDIUM at >200 units)
  source: DEC-0002
  revisit: recorded retrieval misses.

- id: ASM-003
  statement: BC-001's cost anchors (~$401 API-equivalent; ~1M output tokens for a
    full production build) are the right order of magnitude for budget-setting.
  risk: MEDIUM
  source: DEC-0004; token-summary.json
  revisit: EXP-0005 baseline.

- id: ASM-004
  statement: Multi-channel (web + social) coherence is valuable to target users.
  risk: MEDIUM
  source: DEC-0001
  revisit: DEC-0001 revisit trigger.

- id: ASM-005
  statement: The four-domain skill taxonomy (UNDERSTAND/DIRECT/PRODUCE/EVALUATE)
    covers the slice without a fifth domain.
  risk: LOW
  source: docs/AGENT_AND_SKILL_ARCHITECTURE.md
  revisit: any skill that fits no domain.
```

## Answer log

(Append answers here with date + decision ref; move resolved items out of the active
sections above.)
