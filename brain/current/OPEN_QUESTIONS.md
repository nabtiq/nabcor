# Open Questions and Assumptions

**Updated:** 2026-07-17

Unknowns stay visible until evidence or a ratified decision resolves them.

## Blocking before Phase 1

### Q-001 — Human gate roles

Who holds product-owner, operator, reviewer, and evaluation-owner authority? One person
may hold several roles, but self-review must be declared on each approval.

**Required answer:** named people/identities, roles, effective date, and any gate that
requires an independent reviewer.

**Dependency note (2026-07-17, DEC-0007):** quarantine release is fail-closed
until this question is answered and an authenticated approval mechanism
exists — the runtime cannot currently distinguish a human quarantine-release
approval from a fabricated one, so no runtime path reads quarantined content.
The Phase 1A.2 correction task explicitly did not resolve this question.

### Q-002 — Providers, data policy, and spend

Which model providers/accounts may receive synthetic data? Which may receive real
client data? What are the per-run and monthly hard ceilings? API-billed runs are
preferred where cost must be measured; subscription usage must never be presented as a
known per-project cost.

**Scope note (2026-07-17):** Q-002 blocks provider-backed and model-backed work — the
gateway, extraction, territories, evaluators with model calls. It does not block the
offline deterministic kernel, which is why Phase 1A shipped without it.

## Experiment-owned questions

- **Q-005 / EXP-0005:** does artifact-based context passing reduce cost versus long
  conversational context?
- **Q-006 / EXP-0002:** can creative-territory diversity be measured reliably?
- **Q-007 / EXP-0003:** can genericity evaluation be calibrated beyond advisory use?
- **Q-008 / EXP-0004:** do users value cross-channel coherence enough to justify its
  cost?

## Deferred questions

- What is the first production channel adapter?
- When does file-based retrieval stop being sufficient?
- What is the productization boundary between internal Nabtiq tooling and an external
  customer product?
- What analytics access is realistically available for performance learning?

## Assumptions in force

| ID | Assumption | Risk | Revisit |
|---|---|---:|---|
| ASM-001 | Spec-level creative direction can be judged before full production. | medium | EXP-0002/0004 |
| ASM-002 | File naming and selective reads are sufficient for the current brain size. | low | recorded retrieval misses or >200 canonical records |
| ASM-003 | BC-001 cost and survival figures are useful anchors, not universal forecasts. | medium | EXP-0005 |
| ASM-004 | Cross-channel coherence is valuable to target users. | medium | EXP-0004 |

## Answer log

Append resolved answers with date and decision ID, then remove the question from the
active section in the same commit.

- **Q-003 — Implementation runtime** · 2026-07-17 · closed by DEC-0005: Node.js 20 +
  strict TypeScript ESM, no application or agent framework; alternatives recorded in
  the decision.
- **Q-004 — First vertical-slice ratification** · 2026-07-17 · closed by ratified
  DEC-0004: slice boundary unchanged; slice risks remain owned by EXP-0002..0004.
