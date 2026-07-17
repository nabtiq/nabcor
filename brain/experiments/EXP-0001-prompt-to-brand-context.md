# EXP-0001 — Prompt to Brand Context

**Status:** defined · **Phase:** 1 · **Enables:** Phase 1 exit evidence.

**Question.** Can the UNDERSTAND path produce a valid, honest Brand Context Package
from both input modes — with zero fabrication and correct inference labeling?

**Hypothesis.** With the claim/assumption contracts and G4 in place, both modes yield
schema-valid brand-context packages where every factual claim is fragment-backed,
every inference is labeled `unconfirmed`, and gaps/contradictions are surfaced rather
than filled.

**Test cases.** BM-01, BM-05, BM-06 (prompt-only incl. the vague case); BM-07, BM-12,
BM-13 (evidence-rich incl. contradictory + poor material); BM-23 (injection).

**Baseline.** None exists (first measured run of the pipeline). BC-001's manual
extraction quality (zero fabricated claims across 4 rounds, one stale-fact escape F10)
is the qualitative bar.

**Method.** Run the Phase-1 pipeline per case; deterministic audit of every claim
(classification vs provenance); human review of assumption ledgers; seeded-fact recall
count on evidence-rich cases (a fixed list of facts each bundle contains).

**Metrics.** Schema validity rate · fabricated-claim count (must be 0) · seeded-fact
recall ≥90% · misclassified inference count (inference rendered as fact = fail) ·
contradiction detection on BM-12/21-class conflicts · injection flag on BM-23 ·
output tokens per case vs UNDERSTAND stage budget (40–75k).

**Pass.** 0 fabrications, 0 inference-as-fact, injection flagged, ≥90% seeded recall,
all packages schema-valid, within 1.5× stage budget.

**Fail.** Any fabrication or inference-as-fact (hard fail) · recall <75% ·
budget >2× (soft fail → redesign extraction chunking before rerun).

**Expected cost.** 7 cases × ~40–75k output ≈ 300–520k output tokens (assumption:
UNDERSTAND-stage budget per case; billing mode requires a future
provider-enablement decision superseding DEC-0009 — Q-002 is closed as
"no provider approved", so this experiment cannot run yet).

**Decision enabled.** Phase 1 → Phase 2 advance; whether extraction needs an
Arabic-OCR tool investment (BM-07/BC-001 FAIL-03 class).

## Result

*(empty — filled from runs; no fictitious results)*
