# DEC-0012 — Resolution-safe claim lifecycle and active-claim projection

decision_id: DEC-0012
title: "Contradicted claims are retained but inactive; current truth is a validated lineage projection over immutable claim revisions, never caller omission; authoritative human contradiction resolution remains unimplemented pending an authenticated human-gate mechanism"
date: 2026-07-18
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.2.1 execution instruction of 2026-07-18"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.2.1 product-owner execution instruction explicitly ratifying these rules; self_review: true (DEC-0008)"
approved_at: 2026-07-18

## Context

The Phase 1B.2 review confirmed a resolution-semantics defect in the
DEC-0011 analyzer. The analyzer excluded claims with verification status
`rejected`/`expired` and lifecycle status `rejected`/`superseded`, but
deliberately kept `verification_status: "contradicted"` claims active. That
judgment made the intended resolution loop impossible: after a human selects
a winner and the loser becomes `contradicted`, re-derived analysis still
included the loser and re-created the very contradiction the human had
resolved. The defect was reproduced with failing tests against main
`e7f226c` before any correction was written.

The review also confirmed three adjacent findings. First, the analyzer
accepted a caller-supplied claim array, so removing an inconvenient claim
made a contradiction disappear with no superseding revision, no resolution
decision, no lineage record, and no auditable reason — exact claim coverage
in the compiler only proved consistency with the supplied array, not that
the array represented the current heads of all loaded claim lineages.
Second, the artifact store prohibits overwrite (INV-VER-001), so any future
resolution must create a new claim revision linked by `supersedes` — never
mutate a stored claim. Third, the Decision and Approval contracts validate
metadata shape but authenticate nothing: not the human, their session, their
role, a signature, or any approval authority — and the approval object has
no machine-readable `self_review` field even though DEC-0008 requires
`self_review: true` on every approval the current reviewer grants.

This correction crosses none of DEC-0008's four independent-review gates:
no quarantine release, no client-facing publishing, no BLOCKING
evaluation-gate change, and no real client data are involved. The Product
Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record carries
`self_review: true` per DEC-0008.

## Decision

1. `verification_status: "contradicted"` means a claim is retained for
   audit but is inactive as current truth.
2. Contradicted claims do not create active contradictions.
3. Contradicted claims do not satisfy required truth-profile slots.
4. Claim revisions are immutable artifacts with new IDs.
5. A successor links to its predecessor using `supersedes`.
6. Current truth is derived from lineage heads, not caller omission.
7. Every supplied lineage must be validated before projection.
8. Cycles, self-supersession, dangling lineage, and ambiguous forks fail
   closed.
9. Historical revisions remain auditable but do not participate in current
   truth.
10. Brand Context compiles current effective claims only.
11. A shape-valid Decision artifact is not evidence that a human acted.
12. Authoritative human contradiction resolution remains unimplemented
    until an authenticated human-gate mechanism exists.
13. The current task does not release quarantine and does not create
    authentication.
14. EXP-0001 remains unexecuted.

The implementation is the deterministic Tier-0 projection
`src/understand/project-active-claims.ts` (DEC-0012's single lineage-rule
implementation — the analyzer holds no second copy): it validates the
complete claim revision set, verifies every supersession relationship
(including that present `superseded_by` metadata agrees with the actual
successor), and partitions claims into effective heads, superseded history,
and inactive heads with a closed reason enum (`verification-contradicted`,
`verification-rejected`, `verification-expired`, `lifecycle-rejected`). A
head with lifecycle status `superseded` whose successor is absent from the
declared complete set fails closed rather than projecting. Absent
`superseded_by` on immutable historical artifacts is permitted — the
successor relationship alone establishes lineage; historical artifacts are
never mutated to add metadata. The truth-analysis contract (1.5.0) records
the partition explicitly and its semantic layer enforces exact,
disjoint partition coverage and effective-only participation.

## Explicitly rejected

- **Treating `contradicted` claims as active truth** — the corrected
  defect: it re-litigates every resolved conflict forever and contradicts
  the domain model's "losing claim becomes `contradicted`" semantics.
- **Deleting losing claims** — capture is evidence; resolved-against claims
  stay queryable so the same conflict is never re-litigated (AGENTS.md rule
  17, BC-001 FAIL-04 lesson).
- **Mutating stored claims in place** — violates artifact immutability
  (INV-VER-001) and the store's no-overwrite rule.
- **Allowing callers to omit claim history silently** — omission would
  imitate resolution with no decision, no lineage, and no audit trail.
- **Treating `superseded_by` metadata alone as sufficient without lineage
  verification** — metadata proves shape; only a verified successor
  relationship in the complete set proves supersession.
- **Accepting caller-authored approval strings as human authentication** —
  the exact failure mode DEC-0007 corrected for quarantine release; schema
  validity never proves a human acted.
- **Building a "temporary trusted boolean" or environment-variable
  identity** — fabricates the authority an authenticated gate mechanism
  exists to establish; rejected for the same reasons as in DEC-0007.
- **Claiming a resolved contradiction before authenticated approval
  exists** — no NABCor surface may state that a human resolved a
  contradiction until the runtime can prove a human acted.

## Alternatives

- **Keep contradicted claims active and filter them downstream in each
  consumer** — rejected: every consumer would re-implement lifecycle rules,
  drift is guaranteed, and the analyzer's own output would keep asserting
  contradictions a human already resolved.
- **Implement human resolution now against the existing approval shape** —
  rejected: a schema-valid `status: ratified` object is not evidence a
  human acted (finding D); building a resolver on unauthenticated metadata
  recreates the forgeable-approval failure DEC-0007 corrected.
- **Trust the caller to supply only current claims** — rejected: that is
  omission-as-resolution; the projection exists precisely so current truth
  is derived and verifiable rather than asserted by the caller.

## Evidence and assumptions

Evidence: the failing reproduction tests against main `e7f226c` (a
contradicted claim re-created its contradiction; a lone contradicted claim
produced an `unverified` rather than `missing` gap; a superseding
contradicted revision resurrected the resolved conflict); the Phase 1B.2.1
product-owner execution instruction ratifying these rules; the artifact
store's no-overwrite and lineage checks this decision builds on
(INV-VER-001); the contracts 1.4.0 → 1.5.0 migration performed under the
documented versioning procedure (contracts/README.md).

Assumption: single-successor lineages are sufficient for this phase;
selecting a branch of a genuine fork requires the future explicit
resolution mechanism, so forks fail closed rather than being resolved
implicitly.

## Consequences

Re-deriving analysis after a resolution now converges: the losing claim
stays visible in `superseded_claim_refs`/`inactive_head_claims` but creates
no contradiction and satisfies no slot, so a closed conflict stays closed.
Brand Context Packages reference effective current claims only, and a
package field resting on superseded or inactive truth fails closed. The
honest cost: callers must supply complete lineages (partial histories fail
closed), and legitimately contradicted material contributes nothing until a
verified successor exists. The human act of choosing a winner still cannot
be recorded as an authoritative runtime artifact — that remains blocked on
the authenticated human-gate mechanism (Q-009), and no surface may claim
otherwise.

## Revisit trigger

- A ratified authenticated human-gate mechanism (Q-009) lands — that
  decision defines how a resolution decision creates the losing claim's
  `contradicted` revision with `resolution_decision_ref`, and how
  `self_review` is recorded and verified.
- Real usage requires legitimate lineage forks (e.g. branch-and-merge
  claim editing) — a new decision defines explicit branch selection.
- Any discovery that a contradicted or superseded claim participates in
  current truth, or that omission passes projection, reopens this decision
  as a defect.

## Supersession

supersedes: null (corrects DEC-0011's contradicted-claims-stay-active
judgment via an append-only note there; DEC-0011's structured-analysis
boundary, exact comparison semantics, and no-prose-interpretation rules
stand unchanged)
superseded_by: null

## Correction note (appended 2026-07-19, Phase 1B.2.2 — original text above is unchanged)

This record required the analyzer input to be "the COMPLETE claim revision
set" and validated every supplied lineage, but completeness itself was
asserted by the caller rather than proven from canonical storage. The
implemented checks proved INTERNAL lineage consistency — dangling
predecessors, hidden successors, cycles, forks, duplicates, and
conflicting `superseded_by` metadata all failed closed — yet none of them
could detect the omission of an entire INDEPENDENT lineage: a standalone
claim left out of the supplied array dangles nothing, so two conflicting
standalone claims could be reduced to one by simply not supplying the
other, and the contradiction disappeared without a superseding revision, a
resolution decision, a lineage record, or an auditable reason. The defect
was reproduced with a failing regression test against main `ba0b080`.

DEC-0013 corrects this: canonical claim membership comes from Artifact
Store enumeration bound into deterministic digest-verified claim
snapshots, the public analysis and compilation APIs reject caller-supplied
claim arrays at runtime, and compilation fails closed on stale analyses.
Everything else in this record stands unchanged: immutable claim
revisions, lineage projection semantics, inactive-head rules, and the
authentication boundary (Q-009).
