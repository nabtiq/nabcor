# DEC-0014 — Offline Ed25519 authenticated human-gate evidence

decision_id: DEC-0014
title: "Q-009 Option A ratified: runtime human authority requires offline Ed25519 approval evidence — policy-authorized, registry-resolved, target-digest-bound, replay-consumed; legacy approval metadata stays non-authoritative; independent-review gates stay frozen"
date: 2026-07-19
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.3A execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.3A product-owner execution instruction explicitly ratifying Q-009 Option A; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

Q-009 has been the blocking question for every runtime path that must prove
a human acted. Repository-level product-owner instructions are valid
approval evidence for repository governance (the DEC-* records ratified this
way are legitimate), but runtime artifacts are different: a schema-valid
decision or approval object proves shape, not identity — the runtime could
not authenticate the human, their role, their signature, or their approval
authority (the forgeable-approval failure DEC-0007 corrected for quarantine
release applies to every runtime human decision). DEC-0008 additionally
requires `self_review: true` on every approval the current single reviewer
grants, and no machine-readable, authenticated carrier for that declaration
existed. Consequence: fact resolution could not safely apply claim
revisions — DEC-0012 prepared the resolution-safe lifecycle, DEC-0013 made
claim membership store-authoritative, and both explicitly deferred authority
to this decision.

This record ratifies Q-009 **Option A — offline Ed25519 approval
evidence** — and closes Q-009. The Product Owner is Ibrahim Mohamed (GitHub
`@ibra2000sd`); this record carries `self_review: true` per DEC-0008. No
independent reviewer is named by this decision, and no DEC-0008
independent-review gate is released. This decision establishes evidence
machinery only; it authorizes no business action.

## Decision

1. **Runtime human authority requires cryptographic evidence.** Names,
   GitHub usernames, environment variables, boolean flags, and schema-valid
   metadata are never authority.
2. **Ed25519 is the approved signature algorithm.** Algorithm substitution
   is contract-invalid.
3. **Verification uses Node.js built-in `crypto`.**
4. **No new cryptographic or runtime dependency is permitted.** The
   dependency boundary of DEC-0006 stands unchanged.
5. **Private keys are never** committed, logged, embedded in fixtures,
   uploaded to CI, stored in the Artifact Store, or transmitted over a
   network. Operator tooling refuses to write private material inside the
   repository.
6. **Public keys are non-secret, versioned authority configuration**
   (`contracts/authority-registry.schema.json`); registry revisions are
   immutable documents with explicit lineage.
7. **The signed payload is canonical, strictly versioned, domain-separated,
   and closed to unknown fields** (`approval-payload-sha256-1.0.0`:
   code-unit-sorted canonical JSON, strict UTF-8, versioned
   `nabcor-human-gate-approval-v1` domain prefix, sha256 payload digest;
   `src/authority/approval-payload.ts`, mirrored in
   `contracts/validate.mjs`).
8. **The signature covers** identity, role, gate, target artifact address
   and digest, verdict, `self_review`, requester identity, nonce, issued
   time, expiry, key ID, and policy version. No unsigned field can change
   authorization semantics.
9. **Authorization comes from the active trusted policy and its referenced
   registry**, loaded through a fixed trusted boundary
   (`contracts/human-gate-policy.active.json`,
   `contracts/authority-registry.active.json`,
   `src/authority/authority.ts`) — never from a registry, policy, or key
   selected by the approval artifact.
10. **Replays are prevented through atomic nonce consumption.** The
    deterministic receipt (`approval-receipt-id-sha256-1.0.0` over policy,
    key ID, and nonce) is persisted no-overwrite via tmp-plus-hard-link;
    exactly one concurrent consumption succeeds; one approval authorizes
    exactly one consumption; a denial consumes nothing.
11. **Key validity, expiry, rotation, and revocation fail closed.** Unknown,
    not-yet-valid, expired, and revoked keys — and unknown roles, gates,
    algorithms, or fields anywhere in the chain — deny authorization. A
    revoked key cannot authorize any new consumption; historical receipts
    remain immutable audit records; registry history is never rewritten.
12. **Existing inline envelope `approvals` metadata remains unauthenticated
    audit metadata** and grants no runtime authority.
13. **Authenticated approval does not itself apply a business action.** An
    authorized result is evidence; applying a fact resolution, releasing
    quarantine, or publishing remains separate, still-unimplemented work.
14. **Independent-review gates remain frozen** until an independent reviewer
    is formally named and enrolled by a superseding decision; the active
    policy pins `independent_reviewer_named: false` at the schema layer, and
    a Product Owner self-signature can never satisfy an independent-review
    gate.
15. **DEC-0009's provider/model/network restrictions are unchanged.** The
    verifier is Tier-0 deterministic code with no gateway, adapter, model,
    or network involvement.

Q-009 is closed as an architecture decision. Runtime authorization remains
**operationally unavailable** until a real Product Owner public key is
enrolled: the committed active registry contains zero authorities, so no
runtime approval can currently verify. Enrollment is a future reviewed
change (new registry revision + policy version pin) prepared with the
offline key CLI (`src/cli/keygen.ts`) and ratified by a decision record.

## Explicitly rejected

- **Option B — GitHub-backed approval evidence** — rejected: requires
  network and GitHub coupling, contradicting DEC-0009's offline posture,
  and ties product-runtime authority to a repository host's session model.
- **Option C — defer runtime authority** — rejected: Phase 1 cannot close
  the human fact-resolution loop, and deferral leaves every future
  authority-bearing surface tempted toward the shape-valid-metadata failure
  DEC-0007 corrected.
- **Validating approval shape harder instead of authenticating** — rejected:
  every shape check validates form, not authority (DEC-0007's lesson).
- **Environment-variable or "trusted caller" identities** — rejected:
  attacker-controllable inputs masquerading as authentication.
- **JSON Web Tokens / JOSE libraries** — rejected: adds a dependency and an
  algorithm-agility surface; a fixed-algorithm, domain-separated canonical
  payload is smaller and closed.
- **Signature validity as sufficient authority** — rejected: a valid
  signature from an unauthorized, expired, revoked, wrong-role, or
  wrong-gate key must fail; policy authorization and replay consumption are
  mandatory halves of authorization.
- **Reusable approvals (signature-only replay tolerance)** — rejected: an
  approval is evidence a human decided ONE action on ONE artifact state;
  reuse would let one decision authorize unbounded actions.

## Evidence and assumptions

Evidence: the Phase 1B.3A product-owner execution instruction of 2026-07-19
ratifying Q-009 Option A verbatim; the contracts 1.6.0 → 1.7.0 migration
performed under the documented versioning procedure (contracts/README.md);
the adversarial runtime test suite covering signature tampering, wrong keys,
key lifecycle states, caller-selected trust-root rejection, frozen
independent-review gates, target address/digest binding, self-review
recomputation, replay single-use semantics, and a multi-process concurrent
consumption race with exactly one success.

Assumptions: file-level `linkSync` EEXIST atomicity is a sufficient
single-writer guarantee for the current single-host deployment (a
distributed receipt store would be a new decision); Ed25519 remains the
approved algorithm until superseded (a future algorithm is a new payload
version and contract migration, never a silent substitution).

## Consequences

The runtime can now distinguish "a human decided this exact action on this
exact artifact state" from "an object claims a human decided" — with
verification that works offline, spends nothing, and fails closed at every
layer. The honest costs: approvals are single-use (a re-run needs a new
signed approval), any change to the target artifact invalidates pending
approvals through the digest binding, and nothing can actually authorize
until a real key is enrolled. Human fact-resolution application remains
unimplemented: composing an authorized approval with claim-revision
creation (and DEC-0013 snapshot staleness) is the next phase's work,
not this one's.

## Revisit trigger

- A real Product Owner key is enrolled (registry revision + policy pin,
  reviewed and ratified) — runtime authorization becomes operationally
  available for ordinary fact-resolution approval.
- An independent reviewer is formally named and enrolled — a superseding
  decision migrates the policy contract to unfreeze the DEC-0008
  independent-review gates that reviewer satisfies.
- Fact-resolution application lands — that decision defines how an
  authorized approval creates the losing claim's `contradicted` revision
  and composes with snapshot staleness (DEC-0013 revisit trigger).
- Any discovery that an approval verifies without policy authorization,
  replays, or authorizes under a revoked/expired/unknown key reopens this
  decision as a defect.
- A multi-host or distributed deployment outgrows file-level receipt
  atomicity.

## Supersession

supersedes: null (builds on DEC-0007/DEC-0008's fail-closed authority
boundary, DEC-0012's resolution-safe lifecycle, and DEC-0013's
store-authoritative snapshots; none of their rules change)
superseded_by: null
