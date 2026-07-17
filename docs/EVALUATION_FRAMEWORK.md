# Evaluation Framework

**Version:** 1.0 · 2026-07-17 · governed by INV-EVAL-001 (declared authority, no fake
precision). Structure: `evals/rubrics/` (scoring guides), `evals/datasets/` (benchmark
inputs), `evals/regression/` (fixed cases that must never regress).
Report contract: `contracts/evaluation-report.schema.json` — every score carries a
reason and evidence.

## 1. Authority levels

```text
BLOCKING      failing output must not pass its gate (maps to a critical invariant)
ADVISORY      reported with reasons; a human decides
EXPERIMENTAL  running to be calibrated; never gates; results feed calibration
```

Promotion path: EXPERIMENTAL → ADVISORY requires demonstrated agreement with human
judgment on the benchmark (recorded in the relevant EXP file); ADVISORY → BLOCKING
requires a decision record.

## 2. The gates (G1–G8)

| Gate | Check | Method | Authority | Invariant | When it runs |
|---|---|---|---|---|---|
| G1 | JS-disabled render: all content visible without JS; enhancer-sabotage shows CSS rescue | deterministic | **BLOCKING** | INV-PE-001 | rendered web output (Phase 4+); spec-level: motion-spec safety fields present |
| G2 | Arabic captures of every text-splitting/per-word animation, reviewed | deterministic capture + human review | **BLOCKING** | INV-AR-001 | rendered output with animation; spec-level: AR animation notes flagged |
| G3 | Declared validation-matrix combinations rendered/reviewed | deterministic capture + review | **BLOCKING** (declared subset) | INV-AR-001/INV-PE-001 | rendered output; spec declares matrix (validation_matrix_ref) |
| G4 | Claim scan: factual-role strings resolve to verified claims; no unledgered contacts/numbers/names/certs; unlabeled generated assets in factual slots | deterministic match | **BLOCKING** | INV-FACT-001..003 | every spec + every render |
| G4b | Paraphrase check: reworded fabrications, smuggled facts in positioning copy | model | ADVISORY (until calibrated) | INV-FACT-001 | every spec |
| G5 | Deployment-readiness record complete and green | deterministic | **BLOCKING** | INV-PUB-001 | any publish (Phase 2+) |
| G6 | Contact-sheet approval for generated assets entering production, rejects recorded | human | **BLOCKING** | INV-HUM-001(2) | any generated asset promotion |
| G7 | Composition-milestone reviews (not only end-of-round) | human + capture | ADVISORY | I8 practice | long production rounds |
| G8 | Genericity/similarity critique vs known-default fingerprints | model + deterministic fingerprints | EXPERIMENTAL | INV-DIR-002 | territories + specs |

## 3. Dimension coverage

Every dimension names its evaluator(s), method, and authority:

| Dimension | Evaluator | Method | Authority |
|---|---|---|---|
| Factual integrity | G4 / G4b | deterministic / model | BLOCKING / ADVISORY |
| Brand fidelity (vs supplied identity) | evaluate-brand-fidelity | model (tier 4) | ADVISORY |
| Strategic clarity (brief → direction traceability) | rubric review at Gate 1 | human | BLOCKING at gate |
| Creative distinctiveness | G8 + territory diversity critique | model + deterministic | EXPERIMENTAL |
| Visual hierarchy | evaluate-visual-hierarchy | model (vision) | ADVISORY |
| Concept coherence (idea → expression) | direction/spec rubric | human + model | ADVISORY |
| Cross-channel consistency | evaluate-cross-channel-coherence | model | EXPERIMENTAL |
| Accessibility | axe + contrast checks (channel layer) | deterministic | BLOCKING (renders) |
| Technical feasibility (spec compiles to channel layer) | DOMAIN_MODEL §9 mapping check | deterministic | ADVISORY until Phase 4, then BLOCKING |
| Conversion clarity (primary action evident) | rubric + human | human | ADVISORY |
| Cultural appropriateness (incl. Arabic quality) | native-reader review + G2 | human | BLOCKING at gates |
| AI-generic appearance | G8 + human "looks AI-generated" rating | model + human | EXPERIMENTAL |
| Cost efficiency | evaluate-cost (budget compliance) | deterministic | BLOCKING (breach ⇒ pause) |

## 4. Deterministic checks (never model judgment)

Missing provenance on factual claims · invalid color contrast (WCAG AA per declared
theme) · unsupported claim strings in output · missing mobile/responsive declaration in
a spec · incorrect channel dimensions · schema violations (all artifacts) · excessive
asset size vs channel constraints · missing alt text (bilingual) · missing
`visual_world_ref`/`direction_ref` on channel specs (INV-BRAND-001) · budget breach ·
matrix combinations missing from capture sets.

## 5. Model-assisted checks

Brand coherence against brand-dna/visual-world · genericity vs default-style
fingerprints · creative concept strength (rubric-anchored) · emotional consistency of
copy vs voice traits · visual hierarchy on previews/renders. All model evaluations:
tier per skill catalog, structured output, reason + evidence mandatory, ADVISORY or
EXPERIMENTAL until calibrated against human judgment (EXP-0003 pattern).

## 6. Human evaluation

Blind pairwise comparison (territory sets, spec variants) · client preference capture
(feedback artifacts) · expert creative review at gates · "looks AI-generated" rating ·
trust/purchase-intent impression on previews. Human verdicts are recorded as
evaluations with `method: human` and are BLOCKING at their gates (INV-HUM-001).
Final aesthetic acceptance is always human (INV-HUM-002).

## 7. Scoring rules

- A score without `reason` + `evidence` is schema-invalid.
- Numeric scores require a `rubric_ref`; otherwise use verdicts
  (`pass | fail | warn | info`). No invented decimal precision.
- Evaluators state what they could NOT evaluate (`info` verdict with reason) — never
  silently skip a dimension (BC-001 "pending — do not backfill" discipline).
- Every evaluation run writes model-run records (INV-OBS-001) — judges are not exempt.

## 8. Rubrics, datasets, regression

- `evals/rubrics/` — one file per rubric-scored dimension; a rubric defines anchors
  (what a 1, 3, 5 look like) with examples. Seeded with: territory-diversity,
  genericity, brand-fidelity.
- `evals/datasets/` — benchmark briefs (see `evals/datasets/README.md`); rights-gated
  (INV-DATA-002).
- `evals/regression/` — frozen cases with expected gate outcomes (e.g. seeded
  fabrication must fail G4; seeded injection must be flagged). Any gate change reruns
  the regression set. Seeded at Phase 1 with the adversarial dataset cases.

## 9. Mapping to slice acceptance

Every acceptance criterion in `docs/FIRST_VERTICAL_SLICE.md` §10 names the evaluator
that verifies it; every BLOCKING evaluator above maps to a critical/high invariant.
The completeness check (criterion ↔ evaluator ↔ invariant) is part of the foundation
validation in `FOUNDATION_REPORT.md` §12.
