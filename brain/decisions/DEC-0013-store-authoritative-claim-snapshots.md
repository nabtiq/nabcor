# DEC-0013 — Store-authoritative claim snapshots and omission-proof truth analysis

decision_id: DEC-0013
title: "The Artifact Store is the authority for claim-set membership: truth analysis enumerates canonical claims through deterministic digest-bound snapshots, caller-supplied claim arrays are rejected at the public boundary, and stale analyses fail compilation closed"
date: 2026-07-19
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.2.2 execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.2.2 product-owner execution instruction explicitly ratifying these rules; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

DEC-0012 made current truth a validated lineage projection over the supplied
claim revision set and described that set as "complete" — but completeness
was asserted by the caller, not proven from canonical storage. The lineage
rules reject dangling predecessors, missing declared successors, cycles,
forks, duplicate IDs, and inconsistent `superseded_by` metadata; none of
them can detect the omission of an entire INDEPENDENT lineage, because a
standalone claim leaves nothing dangling when it is left out.

The defect was reproduced with a failing regression test against main
`ba0b080` before any correction: with standalone conflicting claims A and B
both canonical in the store, supplying only A produced an analysis with no
contradiction covering only A, and the compiler — re-deriving the same
projection over the same subset — accepted it. Caller omission could still
imitate resolution.

This correction crosses none of DEC-0008's four independent-review gates:
no quarantine release, no client-facing publishing, no BLOCKING
evaluation-gate change, and no real client data are involved. The Product
Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record carries
`self_review: true` per DEC-0008.

## Decision

1. The Artifact Store is the authority for claim-set membership. Canonical
   current truth is derived from a store snapshot of one exact
   workspace/brand claim namespace.
2. Truth analysis must enumerate canonical claims from the requested
   workspace/brand claim namespace (`FileArtifactStore.listStrict` +
   validated loads), never accept a caller-selected claim array.
3. Public analysis and compilation APIs reject legacy caller-supplied
   `claims`/`claim_refs`/inline-analysis fields AT RUNTIME — removing the
   TypeScript property alone would leave JavaScript callers a silent bypass.
4. Complete-claim snapshots are deterministic, auditable, brand-isolated,
   and bound to the exact claims loaded: strict fail-closed enumeration
   (symlinked, non-file, non-canonical, unreadable, invalid, or ambiguous
   entries fail the capture instead of disappearing), per-claim contract
   validation, an enumerate → load → enumerate stability check (typed
   `snapshot-unstable` failure on mid-capture change), per-claim content
   digests and an aggregate claim-set digest computed with Node.js built-in
   crypto over versioned canonical JSON (`claim-set-sha256-1.0.0`,
   documented in `src/kernel/canonical-json.ts` and the claim-snapshot
   contract), and an injectable capture clock. A zero-claim namespace is a
   valid snapshot whose required profile slots become deterministic missing
   gaps.
5. A stale snapshot fails closed: compilation loads the referenced analysis
   and snapshot from the store, verifies the analysis-snapshot digest
   binding, re-captures the canonical namespace, and rejects with a typed
   `stale-analysis` failure when any canonical claim appeared, disappeared,
   or changed content since analysis. Re-analysis is required; nothing
   compiles silently over a claim set the analysis did not see.
6. The immutable claim revision and lineage rules of DEC-0012 remain
   unchanged: contradicted/rejected/expired heads stay inactive, historical
   revisions stay auditable, and the lineage projection
   (`src/understand/project-active-claims.ts`) remains the single lineage
   implementation — it is an internal helper with an explicit trust
   boundary, reached in production only through the verified store snapshot.
7. No provider, model, network, or Fake Adapter intelligence path is
   involved (DEC-0009, DEC-0011).
8. Human contradiction resolution remains unimplemented.
9. Q-009 (authenticated human-gate mechanism) remains open and unratified.
10. EXP-0001 remains unexecuted.

## Explicitly rejected

- **Trusting caller-declared completeness** — the corrected defect: a
  subset with no internal inconsistency hides independent lineages.
- **Accepting a caller-authored snapshot without store verification** — a
  snapshot is evidence only after reconciliation against the canonical
  namespace; compilation re-captures and compares digests every time.
- **Removing the `claims` parameter from the TypeScript type only** —
  JavaScript callers would silently keep the bypass; the field is rejected
  at runtime with a typed failure.
- **Silently skipping irregular namespace entries during snapshot
  enumeration** — an entry enumeration cannot vouch for could hide a
  canonical claim; strict capture fails closed (the browsing `list()` keeps
  skip semantics, but snapshots never use it).
- **Compiling with a warning when the claim set changed after analysis** —
  a stale analysis is not a degraded input; it is the omission defect
  reappearing through time, and it fails with a dedicated typed failure.
- **localeCompare enumeration ordering** — locale-dependent collation is
  not byte-stable across environments; ordering is code-unit only.
- **A new runtime dependency for digests or canonicalization** — Node.js
  built-in `crypto` and a documented canonical-JSON serializer suffice.

## Alternatives

- **Keep caller-supplied claims but require a completeness attestation
  field** — rejected: an attestation is caller-authored metadata; it proves
  shape, not membership, exactly like the approval objects DEC-0007
  corrected.
- **Verify membership only at compile time, leaving analysis
  caller-driven** — rejected: the analysis artifact itself would remain
  fabricable-by-omission, and every consumer would need the compile-time
  check; deriving membership at the analysis boundary makes the artifact
  trustworthy at creation.
- **Lock the store during analysis instead of the stability check** —
  rejected: the kernel has no locking primitive and needs none; detecting
  mid-capture change and failing closed is deterministic and sufficient at
  this scale.

## Evidence and assumptions

Evidence: the failing regression test against main `ba0b080` (a canonical
conflicting claim omitted from the caller array produced a
no-contradiction analysis covering only the subset); the Phase 1B.2.2
product-owner execution instruction ratifying these rules; the contracts
1.5.0 → 1.6.0 migration performed under the documented versioning
procedure (contracts/README.md).

Assumption: a full-namespace snapshot per analysis is acceptable at the
current scale (file enumeration plus per-claim validation and hashing);
if namespaces grow past that, an incremental snapshot strategy is a new
decision with its own digest semantics, never a silent optimization.

## Consequences

Omission can no longer imitate resolution anywhere in the pipeline: the
analyzer sees every canonical claim, the analysis is digest-bound to
exactly what it saw, and compilation refuses stale or fabricated
memberships with typed failures. The honest costs: callers must persist
claims before analysis (the CLI and fixtures do), every analysis pays a
full-namespace enumeration and hash, and a concurrent claim write between
analysis and compilation forces re-analysis — that friction is the
protection working. Claim mutation on disk (tampering) is now detectable
at compile time through digest mismatch.

## Revisit trigger

- Namespace scale makes full-snapshot capture measurably expensive — a new
  decision defines incremental snapshots with explicit digest semantics.
- A future authenticated human-gate mechanism (Q-009) lands and defines
  how resolution decisions create claim revisions; its writes must compose
  with snapshot staleness (a resolution invalidates prior analyses by
  construction).
- Any discovery that a canonical claim can be absent from an accepted
  analysis, or that a changed claim set compiles without re-analysis,
  reopens this decision as a defect.

## Supersession

supersedes: null (extends DEC-0012 via an append-only correction note
there: its lineage semantics stand; this record adds the membership
authority its "complete revision set" input assumed)
superseded_by: null
