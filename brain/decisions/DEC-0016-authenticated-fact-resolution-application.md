# DEC-0016 — Authenticated fact-resolution decision and crash-recoverable application

decision_id: DEC-0016
title: "The signed authorization target is an immutable fact-resolution-decision artifact carrying the complete requested action; application creates deterministic contradicted successor revisions for every losing claim, is idempotent and crash-recoverable from the immutable approval receipt, and never mutates, upgrades, or deletes any stored claim"
date: 2026-07-19
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.4 execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.4 product-owner execution instruction of 2026-07-19 explicitly directing this phase; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

Every prior phase deferred the same final step. DEC-0012 built the
resolution-safe claim lifecycle (immutable revisions, lineage projection,
contradicted-heads-inactive) but implemented no resolver. DEC-0013 made
claim membership store-authoritative and required any future resolution
write to compose with snapshot staleness. DEC-0014 built the offline
Ed25519 human-gate mechanism but ruled that authenticated approval applies
no business action. DEC-0015 enrolled the real Product Owner key, making
ordinary `fact-resolution-approval` operationally available — and left
"creating the losing claim's `contradicted` revision from an authorized
approval" as the named follow-on work.

The dangerous shortcut this decision exists to prohibit is signing the
wrong thing. A signature over a truth analysis, a fact key, or a bare
winner ID would let the caller choose or change the actual action after
the human signed: which claim wins, which claims lose, against which claim
state. The signed target must therefore be a separate immutable artifact
that carries the COMPLETE requested action — the exact contradiction, the
exact winner, every loser, and digests of the exact analysis, snapshot,
and claim state the human looked at — so that nothing about the action can
drift between the human's decision and its application.

This phase crosses none of DEC-0008's four independent-review gates: no
quarantine release, no client-facing publishing, no BLOCKING
evaluation-gate change, and no real client data are involved. The Product
Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record carries
`self_review: true` per DEC-0008.

## Decision

1. **Resolution scope.** A fact resolution may target only a currently
   open contradiction taken from a validated, authoritative truth
   analysis — one produced by the deterministic analyzer over a
   store-authoritative claim snapshot (DEC-0011/DEC-0013) and still
   current against the live canonical claim namespace.

2. **The signed target is an immutable fact-resolution-decision
   artifact** (`contracts/fact-resolution-decision.schema.json`), prepared
   by a deterministic boundary that accepts references only and re-derives
   everything from the Artifact Store. The artifact identifies: workspace
   and brand; the exact truth-analysis reference and content digest; the
   exact claim-snapshot reference, content digest, and aggregate claim-set
   digest; the truth-profile reference and digest; the `fact_key`; a
   deterministic contradiction fingerprint
   (`contradiction-fingerprint-sha256-1.0.0`); exactly one winning claim
   with its content digest; every other participating claim as a losing
   claim with its content digest; the rationale; the requester; and the
   creation timestamp. The claim-set digest binds the complete namespace
   contents, so any lineage-head change after preparation is detectable.

3. **Winner plus losers form an exact partition** of the selected
   contradiction's claim references: one winner, every remaining
   participant exactly once as a loser, no omissions, no extras, no
   duplicates, no overlap. Partial resolution is prohibited. The semantic
   contract layer and the preparation boundary both enforce this.

4. **The Product Owner signs the exact decision artifact** under the
   existing `fact-resolution-approval` gate (DEC-0014 mechanism, DEC-0015
   enrollment): `target_artifact_type: "fact-resolution-decision"`, the
   decision's canonical store address as `target_artifact_ref`, and the
   decision's recomputed content digest as `target_artifact_digest`.

5. **The approval target reference and digest must match the stored
   decision exactly.** The verifier recomputes the digest from the stored
   artifact at its exact canonical address; any mismatch denies.

6. **Only an `approved` verdict permits application.** Rejected,
   malformed, stale, replayed-for-another-operation, expired,
   unauthorized, or unverifiable evidence produces zero claim mutations.
   A rejected verdict that verifies authentically still consumes its
   nonce (it is a real human decision) but applies nothing.

7. **Application creates immutable successor revisions.** Existing claims
   are never overwritten, edited, or deleted (INV-VER-001); the store's
   no-overwrite rule stands.

8. **Each losing successor** supersedes the current losing claim head via
   `supersedes`; preserves the original statement, classification, source
   type, provenance references, fact metadata, normalized value,
   confidence, and rights-relevant fields byte-for-byte; changes
   `verification_status` to `contradicted`; records
   `resolution_decision_ref` naming the signed decision artifact; uses a
   deterministic artifact ID derived from the application identity and the
   losing claim reference (`fact-resolution-id-sha256-1.0.0`); and remains
   in the same workspace and brand.

9. **The winning claim is not mutated.** It is not automatically upgraded
   to `verified`, not marked accepted as universal truth, and not
   re-issued. Winning a resolution means the losing conflict is closed,
   nothing more.

10. **The original truth analysis becomes stale by construction.** Writing
    successor revisions changes the canonical claim set, so the
    pre-resolution snapshot and analysis fail the DEC-0013 staleness
    boundary. Application captures a fresh authoritative snapshot and
    re-runs the deterministic analyzer, and only those fresh artifacts are
    current.

11. **Application is idempotent and crash-recoverable.** All
    post-consumption writes use IDs deterministically derived from the
    authorized decision digest and the approval's deterministic receipt
    identity, and all post-consumption timestamps are taken from the
    immutable receipt's `consumed_at`, so a retry recomputes byte-identical
    artifacts. A consumed approval can never leave the system permanently
    unable to finish after a partial write: retrying the same operation
    resumes exactly the missing writes.

12. **Recovery from an already-consumed approval is permitted only for the
    same operation.** The retry must present the same signed evidence; the
    immutable receipt must match its payload digest, key, policy and
    registry binding, gate, verdict, namespace, target type, target
    reference, and recomputed target digest; and the deterministic
    application identity derived from (decision digest, receipt ID) must
    match. Any existing successor or derived artifact must match the
    expected deterministic content exactly (verified by canonical content
    digest); a conflicting or unexpected artifact fails closed. A replay
    after full completion returns the stored application result without
    creating anything.

13. **Single-host / single-writer boundary.** Atomicity relies on
    file-level `linkSync` EEXIST semantics on one host, exactly as
    DEC-0014's receipt store does. Between the pre-consumption preflight
    and the successor writes there is no cross-process lock: a concurrent
    writer mutating the same claim namespace can force the operation into
    a fail-closed state (stale snapshot, lineage fork), never into a wrong
    result. No distributed-transaction or multi-host atomicity claim is
    made; outgrowing this boundary is a new decision.

14. **Nothing else opens.** No provider, model, network, client-data,
    quarantine-release, publishing, or independent-review capability is
    introduced. The four DEC-0008 independent-review gates stay frozen,
    DEC-0009's zero-provider policy is unchanged, and EXP-0001 remains
    unexecuted.

Contracts move 1.7.1 → 1.8.0 (synchronized): two new contracts
(`fact-resolution-decision`, `fact-resolution-application`), and the
`approval-evidence`/`approval-receipt` target-type enums gain
`fact-resolution-decision`. All instances — examples, fixtures, synthetic
runtime fixtures, and the committed active human-gate documents — are
re-issued at 1.8.0 in the same change under the documented synchronized
procedure; the active policy and registry keep `policy_version` 2 and
`registry_version` 2 because only their `schema_version` label changes,
not any pinned semantic content (a semantic change would require a new
revision plus decision).

## Explicitly rejected

- **Signing the truth analysis (or any broader artifact) as the
  authorization target** — rejected: the analysis does not name a winner,
  so the caller would choose the actual action after signing; the exact
  signature-target-confusion failure this decision exists to prevent.
- **Signing only a fact_key or winner/loser IDs without the decision
  envelope** — rejected: an ID without the bound analysis, snapshot, and
  participant digests authorizes an action against unknown claim state.
- **Allowing partial resolution (a subset of losers)** — rejected: a
  contradiction with a surviving unresolved loser is not resolved, and a
  partial partition invites winner/loser games between signing and
  application.
- **Auto-upgrading the winner to `verified`** — rejected: winning a
  human resolution is not verification evidence; verification status
  changes carry their own provenance rules (INV-FACT-002).
- **Mutating the losing claim in place** — rejected: violates artifact
  immutability (INV-VER-001) and DEC-0012's revision lifecycle.
- **Applying on signature validity alone, without policy authorization
  and nonce consumption** — rejected: DEC-0014 rule; a valid signature
  from an unauthorized context authorizes nothing.
- **Wall-clock timestamps in post-consumption artifacts** — rejected:
  a retry would produce byte-different artifacts, making crash recovery
  unable to distinguish resumption from conflict; every post-consumption
  timestamp comes from the receipt's `consumed_at`.
- **A recovery mode that re-runs the full fresh preflight** — rejected:
  after successors are written the old snapshot is stale by design, so a
  full fresh preflight can never pass again and a consumed approval would
  be permanently wedged; recovery validates operation identity and
  existing-artifact exactness instead.
- **Distributed-transaction claims** — rejected as dishonest: the
  implementation is single-host/single-writer file semantics.

## Evidence and assumptions

Evidence: the Phase 1B.4 product-owner execution instruction of
2026-07-19; the contracts 1.7.1 → 1.8.0 migration performed under the
documented versioning procedure (contracts/README.md); the runtime test
suites covering decision preparation (partition, fingerprint, staleness,
fork, cross-brand, tamper cases), signature binding (target confusion,
digest substitution, post-signing modification, gate/role/key/policy
failures), application (successor correctness, predecessor and winner
byte-identity, staleness rollover, unrelated-claim isolation), and crash
recovery (retry at every write boundary, byte-exact resumption,
conflicting-successor rejection, completed-replay idempotency); and the
real-key proof-of-possession smoke test performed by the Product Owner on
synthetic data outside the repository.

Assumptions: file-level `linkSync` EEXIST atomicity remains a sufficient
single-writer guarantee for the current single-host deployment (DEC-0014
assumption, unchanged); a full-namespace re-analysis per application is
acceptable at current scale (DEC-0013 assumption, unchanged); the
`consumed_at` timestamp recorded by the verifier's injected clock is an
acceptable creation timestamp for all derived artifacts of one
application.

## Consequences

The deterministic contradiction-resolution loop is closed: an open
contradiction can now be resolved by a human decision that the runtime
can prove, apply exactly once, and audit forever — offline, spending
nothing, failing closed at every layer. The honest costs: resolution
requires three artifacts (decision, evidence, application result) and a
fresh snapshot/analysis per application; any claim-namespace change
between preparation and application invalidates the decision (stale
digest — re-preparation and re-signing required, which is the protection
working); approvals stay single-use, so an application that fails closed
on a genuine conflict needs a fresh decision and signature after the
conflict is resolved; and the fresh analysis may legitimately surface new
gaps (for example, a slot whose only support lost the resolution now
reports missing) — that is truthful, not a defect.

## Revisit trigger

- Multi-host or concurrent-writer deployment outgrows the single-writer
  file-atomicity boundary — a new decision defines real coordination.
- Legitimate lineage forks need explicit branch selection (DEC-0012
  revisit trigger) — resolution across forks is a new decision.
- An independent reviewer is formally named and enrolled — a superseding
  decision unfreezes the DEC-0008 independent-review gates; nothing in
  this record changes that boundary.
- Any discovery that an application mutates a stored claim, applies
  twice, applies from non-`approved` evidence, resumes a different
  operation from a consumed approval, or leaves a consumed approval
  permanently unable to finish reopens this decision as a defect.
- Namespace scale makes per-application full re-analysis measurably
  expensive (DEC-0013 revisit trigger applies here too).

## Supersession

supersedes: null (implements the follow-on work DEC-0014 and DEC-0015
both named; composes DEC-0012's lifecycle, DEC-0013's snapshot
staleness, and DEC-0014's authorization without changing any of their
rules)
superseded_by: null
