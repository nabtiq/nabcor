# EXP-0003 — AI-Genericity Detection

**Status:** defined · **Phase:** 2–3 · **Enables:** Q-006; G8 promotion path;
RISK-AI-02 calibration evidence.

**Question.** Can G8 (fingerprints + judge) detect AI-generic output reliably enough
to be more than advisory?

**Hypothesis.** The combined check flags ≥80% of known-generic samples while
false-flagging ≤20% of human-rated-distinctive samples.

**Test cases.** A labeled sample pool: (a) deliberately generic specs/previews
(default palette + default type + cliché layout, generated for this purpose and
labeled synthetic); (b) slice outputs from EXP-0002 cases; (c) reference distinctive
work descriptions (BC-001's shipped identity serves as one distinctive-class
reference — process knowledge, not client assets).

**Baseline.** Fingerprint-only detection (no judge) — measures what the model
judgment adds over the deterministic list.

**Method.** Run G8 on the pool; blind human raters score the same pool
("looks AI-generated" 1–5 + distinctive yes/no); compute detection/false-flag rates
and judge–human correlation; log fingerprint hits separately from judge verdicts.

**Metrics.** Generic detection rate · false-flag rate on distinctive samples ·
judge–human correlation · fingerprint-only vs combined delta · cost per evaluation
vs 10–20k budget.

**Pass.** ≥80% detection, ≤20% false flags, combined > fingerprint-only.

**Fail.** False flags >35% (G8 stays EXPERIMENTAL and un-surfaced to users) ·
fingerprints alone ≈ combined (drop the judge, keep the cheap check).

**Expected cost.** ~20 evaluations × 10–20k ≈ 200–400k output tokens + human rating
time (~2h).

**Decision enabled.** G8 authority level; whether "distinctiveness" gating is
automatable at all or remains purely human (Constitution §13.1 measurement).

## Result

*(empty — filled from runs)*
