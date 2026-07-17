# DEC-0011 — Deterministic structured-truth analysis boundary

decision_id: DEC-0011
title: "Deterministic contradiction and gap analysis operates only on explicitly structured fact slots with exact type-sensitive comparison, relative to a versioned truth profile; it never interprets unrestricted prose, never uses the gateway or Fake Adapter, and never resolves a contradiction"
date: 2026-07-18
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.2 execution instruction of 2026-07-18"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.2 execution instruction explicitly ratifying these architectural rules; self_review: true (DEC-0008)"
approved_at: 2026-07-18

## Context

Phase 1A's brand-context compiler accepted contradictions and gaps as
caller-supplied arrays: nothing computed them, and nothing prevented a caller
from omitting or rewriting them. The provenance model names contradiction
detection as a standing UNDERSTAND duty (docs/PROVENANCE_AND_CONFIDENCE.md
§6), but the catalog's `detect-contradictions` skill is Tier 2 —
model-assisted — and all model-backed work is prohibited by the ratified
zero-provider policy (DEC-0009). The product owner's Phase 1B.2 instruction
authorizes the deterministic subset that IS possible without a model, and
draws a hard boundary around what deterministic code may honestly claim.

This decision does not cross any of DEC-0008's four independent-review gates:
no quarantine release, no client-facing publishing, no BLOCKING
evaluation-gate change, and no real client data are involved.

## Decision

1. Deterministic contradiction detection may only compare explicitly
   structured fact slots (`fact_key`) and normalized scalar values
   (`normalized_value` with a disclosed `normalization_basis`).
2. The system must not claim to detect semantic contradictions from
   unrestricted natural-language prose.
3. Gaps may only be produced relative to an explicit, versioned truth profile
   (`contracts/truth-profile.schema.json`).
4. Absence from a truth profile is not evidence that information is
   universally required — a profile is workflow-scoped expectation, not a
   universal ontology.
5. Tier-0 truth analysis runs as deterministic code
   (`src/understand/analyze-structured-truth.ts`).
6. It must not be routed through the Fake Adapter.
7. The Fake Adapter remains test infrastructure for the gateway boundary only.
8. No model, provider, network, API key, or external spend is introduced.
9. Contradictions remain open (`status: "open"`) until a future human
   decision resolves them (INV-HUM-001(3)).
10. A deterministic analyzer never selects which conflicting claim is true.
11. The Phase 1B.2 tests are regression evidence for deterministic structure
    only.
12. They do not constitute EXP-0001 execution or model-quality evidence.

Comparison semantics are exact and type-sensitive: string `"1"` differs from
number `1`; no case folding, no Unicode normalization, no unit conversion, no
fuzzy matching. Any normalization happens upstream and is disclosed in
`normalization_basis`. Structured fact metadata is permitted only on `factual`
and `inference` claims; a normalized value never upgrades verification status
— an inference with a normalized value remains an inference. Claims lacking
structured fact metadata are listed explicitly under `unstructured_claim_refs`
(and structured claims outside the profile under
`unprofiled_fact_claim_refs`) rather than being parsed, guessed at, or
silently ignored. The brand-context compiler accepts contradiction and gap
results only from a validated truth-analysis artifact with exact claim
coverage, recorded as `truth_analysis_ref`.

## Explicitly rejected

- **Free-text keyword matching presented as semantic contradiction
  detection** — a keyword heuristic that misses a paraphrase while claiming
  "contradiction detection" fabricates a guarantee (RISK-INTEG-01 class).
- **Hidden normalization heuristics** — silent case folding or Unicode
  normalization inside comparison would make two artifacts compare equal for
  reasons no contract discloses.
- **Using the Fake Adapter to simulate intelligence** — the adapter returns
  predeclared fixtures; routing analysis through it would dress deterministic
  fixtures up as model behavior (DEC-0009 point 7).
- **Automatically resolving contradictions** — resolution is a human decision
  with a durable record; code picking a winner violates INV-HUM-001(3).
- **Treating an unconfirmed inference as verified fact** — surfaced as an
  `unverified` gap instead (INV-FACT-002).
- **Filling missing required information with generated content** — missing
  information is a gap, never invented content (INV-FACT-001).

## Alternatives

- **Wait for a provider decision and implement Tier-2 semantic detection
  directly** — rejected: DEC-0009 prohibits it, and the deterministic
  structured layer is needed regardless as the exact-comparison substrate any
  future semantic layer must reduce its findings into.
- **Detect contradictions by comparing claim statements as text** — rejected:
  that is rule 2's prohibited semantic claim in disguise; string similarity
  over prose is a heuristic with undisclosed failure modes.
- **Keep caller-supplied contradiction/gap arrays alongside the analyzer** —
  rejected: two write paths for the same truth make the analyzer bypassable
  and its results unauditable; one authoritative input with exact claim
  coverage is enforceable.

## Evidence and assumptions

Evidence: the product owner's Phase 1B.2 execution instruction of 2026-07-18,
which states these rules and rejections verbatim; the ratified DEC-0009
policy this boundary respects; the existing claim/brand-context contracts
this increment extends under the documented versioning procedure
(contracts/README.md, 1.3.0 → 1.4.0).

Assumption: exact type-sensitive scalar comparison over disclosed normalized
values is sufficient for the deterministic tier — cases needing richer value
shapes (arrays, structured objects, ranges) are deferred to a future decision
rather than admitted implicitly.

## Consequences

Contradictions and gaps become computed, reproducible, contract-validated
results instead of caller-authored arrays; the Brand Context Package records
which analysis produced them. The honest cost: the deterministic tier only
sees what upstream structuring made explicit — prose conflicts stay invisible
and are listed as unstructured rather than detected. Documentation must keep
saying so; no NABCor surface may describe this capability as semantic
contradiction detection.

## Revisit trigger

- A provider-enablement decision (DEC-0009 point 9) lands and authorizes a
  model-assisted Tier-2 contradiction path — that decision defines how model
  findings reduce onto this deterministic substrate.
- Real usage shows required facts whose values cannot be honestly expressed
  as scalars — a new decision extends the normalized-value shape explicitly.
- Any discovery that the analyzer interprets prose, folds case, normalizes
  Unicode, or resolves a contradiction reopens this decision as a defect.

## Supersession

supersedes: null (complements DEC-0009/DEC-0010: adds the deterministic
truth-analysis boundary behind the same zero-provider posture)
superseded_by: null
