# EXP-0005 — Token Budget Baseline

**Status:** defined · **Phase:** 1–3 (runs alongside every other experiment) ·
**Enables:** real budget values (INV-TOK-001), Q-005, and the ASM-003 check.

**Question.** What does the slice actually cost per stage and per skill — and does
artifact-based context passing reduce spend versus long-session re-reading (BC-001
L14)?

**Hypothesis.** (a) The slice completes within the 450k output budget
(`docs/MODEL_AND_TOKEN_STRATEGY.md` §7). (b) Artifact passing + context manifests
yield a measurably lower fresh+cached input footprint than a monolithic-context
control run.

**Test cases.** Every EXP-0001/0002 run (instrumented by construction); one
monolithic-context control (same brief, whole-corpus context, no selectors) on BM-01;
BM-24 (extreme-budget adversarial) for breach behavior.

**Baseline.** BC-001 anchors (915k output full build; 78% cache-read cost share;
≈7% discard) — for scale orientation, not as a target.

**Method.** If Q-002 approves API billing, runs use measured API cost; otherwise cost
allocation remains explicitly unknown. Run
records + context manifests analyzed per stage/skill; budget breach simulated on
BM-24; per-skill actuals compared to the catalog's budget hypotheses.

**Metrics.** Output/fresh/cached/cache-write per stage and skill · cost per completed
slice · budget-hypothesis error per skill · selector-vs-monolithic input delta ·
breach behavior correctness (pause + ping, no silent decay) · discarded-token ratio.

**Pass.** Slice within 1.25× budget · breach behavior correct · per-skill actuals
recorded for 100% of runs (INV-OBS-001) · selector delta measured (any direction —
the point is the number).

**Fail.** >2× budget (architecture review before Phase 3) · missing run records
(hard fail — observability defect) · monolithic ≤ selectors on cost with equal
quality (L14 hypothesis rejected; caching strategy re-centered).

**Expected cost.** Marginal (~50k output for the control run + analysis) — piggybacks
on other experiments' runs.

**Decision enabled.** Real budget values replacing hypotheses; whether context
selectors are worth their complexity (DEC-0002 adjacent); Phase-3 go/no-go economics.

## Result

*(empty — filled from runs)*
