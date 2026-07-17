# EXP-0002 — Creative Territory Diversity

**Status:** defined · **Phase:** 2 · **Enables:** Q-005; ROADMAP Phase 2 exit;
promotion path for the diversity evaluator.

**Question.** Are generated territory sets genuinely diverse — and can we measure
diversity well enough to gate on it?

**Hypothesis.** With explicit differentiation axes + the critique pass, ≥80% of
territory sets score ≥4 on the territory-diversity rubric, and the automated score
agrees with blind human ranking in ≥75% of pairwise comparisons.

**Test cases.** Territory sets for BM-01, BM-02, BM-08 (strict identity — diversity
*within* fidelity), BM-10, BM-13, BM-18; plus one deliberately-collapsed control set
(three colorways of one concept) that must score ≤2.

**Baseline.** The control set + naive generation (no diversity constraint, no critique
pass) on two of the briefs — measuring what the constraint actually adds.

**Method.** Generate sets per case (constrained + naive); deterministic pre-checks
(palette distance, concept similarity); rubric scoring by Tier-4 judge; blind human
review ranks the same sets; agreement computed.

**Metrics.** Rubric score distribution (constrained vs naive) · judge–human pairwise
agreement % · control-set detection (must score ≤2) · regeneration rate ·
DIRECT-stage tokens per set vs budget (20–40k + critique).

**Pass.** ≥80% of constrained sets ≥4 · control detected · judge–human agreement ≥75%
· constrained beats naive on human ranking.

**Fail.** Agreement <60% (evaluator stays EXPERIMENTAL; human-only gating) ·
constrained ≈ naive (the constraint mechanism is rework).

**Expected cost.** ~8 sets × (20–40k gen + 5–15k critique) + judge runs ≈ 250–450k
output tokens.

**Decision enabled.** Whether diversity gating can be automated (ADVISORY promotion)
or stays human; whether the territory prompt needs redesign.

## Result

*(empty — filled from runs)*
