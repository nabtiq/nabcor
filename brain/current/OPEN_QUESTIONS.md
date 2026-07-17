# Open Questions and Assumptions

**Updated:** 2026-07-17. Assumptions carry risk class (LOW/MEDIUM/HIGH). High-risk
assumptions must not silently become architectural decisions (Master Prompt §14).

## Ratification (blocking — decision records)

DEC-0001..0004 are **proposed**. No product-owner approval exists as repository
evidence, so nothing yet carries rank-3 authority (AGENTS.md §Decision authority).

**Exact action required from the product owner, per record:** review the record, then
either (a) ratify — set `status: ratified`, set `decided_by` to your identity, and add
an approvals entry `{approved_by: <you>, gate: "ratification", verdict: "approved",
at: <timestamp>}` (the semantic validator enforces this shape); or (b) reply with the
requested change and the record is revised as `proposed`. A single commit or written
statement in this file's Answer log naming the four records and the verdict is
sufficient evidence.

## A. Product-owner decision packet (blocking — resolve before/at Phase 1 start)

### Q-001 — In-flight multi-page core work

Uncommitted in the main working tree: `packages/core/src/routing/`, `schema/site.ts`,
`apps/demo/src/app/[locale]/[...segments]/`, multipage tests.

- **Option A — merge/complete first.** The multi-page core lands (its own review/
  decision) before Phase 1 starts. *Consequence:* Phase 1 delayed by that work;
  Phase 3/4 spec assumptions settle early; no parallel-stream sync risk.
- **Option B — park it.** Stash/branch the work; Phase 1 proceeds on the current core.
  *Consequence:* fastest Phase 1 start; the work risks going stale; the spec→site
  bridge (Phase 4) is designed against the single-page core and revisited later.
- **Option C — continue in parallel with an explicit boundary.** Multi-page work
  continues on its own branch; the Foundation slice treats the core as a black box
  until Phase 3, when `website-spec` assumptions must be settled. *Consequence:* no
  delay either side; requires the F08-class sync gate discipline (INV-AGENT-001) and a
  decision before Phase 3 hardens specs.
- **Recommended safe default: Option C** — Phase 1 (truth layer) is core-agnostic
  either way; the real deadline is Phase 3.

### Q-002 — Named humans behind the gate roles

Roles required by INV-HUM-001 and the evaluation framework: **product owner** (scope,
ratification, budgets) · **operator** (runs projects, claim/asset gates) · **reviewer**
(direction/acceptance gates) · **evaluation owner** (calibration, eval-failure triage).

One named person may hold multiple roles — that is acceptable and expected at current
team size — but it must be stated, because it makes several gates **self-review**: the
person approving is the person who produced. Known weakness; the mitigations are the
deterministic gates (which don't care who runs them) and honest recording of the role
under which each approval was made.

**Exact statement needed for ratification (fill and append to the Answer log):**
> "I, <name>, hold the roles: <list>. I understand the direction, claims, asset,
> acceptance, and publication gates will be self-reviewed until additional reviewers
> are named. Effective <date>."

### Q-003 — Approved providers and spend ceilings

Needed before any Phase 1 model call:

1. **Approved providers/accounts** for Phase 1 (foundation default assumption:
   Anthropic + OpenAI, per BC-001 operational history — confirm or amend).
2. **Billing mode:** subscription usage is unmeasurable per project (BC-001's true
   cost is permanently unknown); API billing makes cost a recorded fact (INV-OBS-001).
   Recommended: API keys for all Phase 1 runs.
3. **Ceilings:** a monthly ceiling and a per-slice-run ceiling (the budget artifact's
   `hard_stop`). Foundation hypothesis to confirm or replace: ≈$60–90 per full slice
   run, 450k output tokens, hard stop 550k (`docs/MODEL_AND_TOKEN_STRATEGY.md` §7).
4. **Client-data boundary:** no real client data is sent to any provider until that
   provider is explicitly approved for it (INV-DATA-001); benchmark runs use synthetic
   bundles only.

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
