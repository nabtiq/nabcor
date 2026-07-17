# Rubric — Territory Diversity

**Used by:** critique-territories, EXP-0002. **Authority:** EXPERIMENTAL (calibrating).
Scores a *set* of territories (not individuals). Verdict scale 1–5 with anchors;
a numeric score requires citing which anchor and why (INV-EVAL-001).

| Score | Anchor |
|---|---|
| 1 | One idea restyled: same concept, palette shifts only ("three colorways"). |
| 2 | Two territories overlap on concept or imagery world; the third differs superficially. |
| 3 | Distinct palettes/type AND at least two distinct concepts, but imagery worlds converge. |
| 4 | Three distinct concepts with named differentiation axes; sacrifices differ meaningfully; one axis feels safe. |
| 5 | Three genuinely different worldviews a client would experience as different companies' work — each defensible, each with real sacrifices, all honoring the brief/DNA. |

**Deterministic pre-checks (run before the model judge):** pairwise palette distance
above threshold; concept text similarity below threshold; differentiation_axes fields
non-empty and non-duplicated. Fail → regenerate before judging (bounded, INV-TOK-001).

**Evidence required:** per-pair comparison notes naming the axis where the pair
differs or collapses.
