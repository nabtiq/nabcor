# EXP-0004 — Cross-Channel Coherence

**Status:** defined · **Phase:** 3 · **Enables:** INV-CHAN-001 evaluator calibration;
ASM-001/ASM-004 evidence; DEC-0001 revisit input.

**Question.** Do the slice's four outputs (homepage spec + 3 social specs) read as one
brand world — and can the coherence evaluator tell when they don't?

**Hypothesis.** Specs produced from one visual-world artifact score coherent in ≥80%
of human pairwise checks, and the evaluator detects seeded incoherence (a spec swapped
in from a different brand world) in ≥90% of cases.

**Test cases.** Full slice runs for BM-01, BM-07, BM-15; seeded-incoherence controls
(one social spec swapped across runs); a no-shared-world baseline (social specs
generated from the brief alone, skipping the visual-world reference — measuring what
the shared artifact adds).

**Baseline.** The no-shared-world variant — if humans can't tell the difference, the
coherence machinery isn't earning its cost (honest kill-criterion for ASM-004).

**Method.** Generate sets; evaluator scores coherence per INV-CHAN-001; blind human
side-by-side review ("same company? same campaign?"); seeded-control detection.

**Metrics.** Human same-world rate (shared vs baseline) · evaluator seeded-control
detection · evaluator–human agreement · marginal token cost of the shared-world path.

**Pass.** Shared-world beats baseline on human review by a visible margin AND
evaluator detects ≥90% of seeded controls.

**Fail.** Shared ≈ baseline (coherence value unproven → DEC-0001 revisit trigger data)
· evaluator detection <70% (stays EXPERIMENTAL, human-only).

**Expected cost.** 3 full slices (≈205–425k each) + controls + judging ≈ 0.8–1.5M
output tokens — the most expensive experiment; schedule after EXP-0001/0002 pass.

**Decision enabled.** Whether cross-channel coherence graduates from EXPERIMENTAL;
whether the multi-channel thesis holds (DEC-0001).

## Result

*(empty — filled from runs)*
