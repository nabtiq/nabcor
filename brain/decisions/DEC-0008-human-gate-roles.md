# DEC-0008 — Human gate roles

decision_id: DEC-0008
title: "Human gate roles: Ibrahim Mohamed holds product-owner, operator, reviewer, and evaluation-owner authority with mandatory self-review declaration; four gates require independent review; quarantine release stays fail-closed"
date: 2026-07-18
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), direct declaration of 2026-07-18"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); self_review: true — proposer and approver are the same person, declared per this decision's own rule"
approved_at: 2026-07-18

## Context

Q-001 (human gate roles) has been open since the foundation baseline: no named
identity held product-owner, operator, reviewer, or evaluation-owner authority,
and the required answer was defined as "named people/identities, roles,
effective date, and any gate that requires an independent reviewer"
(`brain/current/OPEN_QUESTIONS.md`). DEC-0007 made the quarantine boundary
fail-closed explicitly because this question was unresolved — the runtime
cannot distinguish a human quarantine-release approval from a fabricated one.
On 2026-07-18 the product owner issued a direct role declaration answering
Q-001 in exactly the required form.

## Decision

1. **Roles, effective 2026-07-18.** Ibrahim Mohamed (GitHub `@ibra2000sd`)
   holds all four gate roles: Product Owner, Operator, Reviewer, and
   Evaluation Owner.
2. **Mandatory self-review declaration.** Because one person holds every role,
   every approval Ibrahim Mohamed grants as Reviewer must carry
   `self_review: true` until an independent reviewer is formally named by a
   later decision record. An approval without this declaration is invalid
   approval evidence.
3. **Four gates require independent review.** Independent review — review by a
   formally named reviewer who is not the author or approver of the work — is
   required for:
   1. releasing quarantined source material;
   2. publishing or sending final client-facing work;
   3. changing a BLOCKING evaluation gate;
   4. approving real client data for a model provider.

   No independent reviewer currently exists, so none of these four actions can
   be approved by anyone: self-review does not satisfy an independent-review
   gate. This is intentional fail-closed governance, not an omission.
4. **Quarantine release remains fail-closed.** This decision names identities
   but designs no authenticated approval mechanism, so only half of DEC-0007's
   revisit trigger is met and its fail-closed rule stands in full force.
   Additionally, quarantine release is gate 1 above: even once an
   authenticated mechanism exists, release also requires the independent
   reviewer. Two conditions must therefore both hold before any release path
   may be built — a formally named independent reviewer and a ratified
   authenticated gate-mechanism design.
5. **Out of scope.** This decision does not select providers, data policy, or
   spend ceilings (Q-002 remains open and continues to block all model-backed
   work), does not design the authenticated approval mechanism, and does not
   name an independent reviewer.

## Alternatives

- **Defer answering Q-001 until an independent reviewer could also be named** —
  rejected: it keeps every named-authority dependency blocked indefinitely,
  while the declaration plus independent-review gates achieves the same safety
  (the sensitive actions stay unapprovable) without blocking ordinary
  gate-role work.
- **Name roles without an independent-review gate list** — rejected: Q-001
  explicitly required naming the gates that need an independent reviewer, and
  single-person governance without carve-outs would let a self-review release
  quarantined material or publish client-facing work.
- **Treat this declaration as authorizing a quarantine release path** —
  rejected: no authenticated approval mechanism exists (DEC-0007), and gate 1
  requires an independent reviewer who has not been named; building a release
  path now would recreate the forgeable-approval failure DEC-0007 corrected.

## Evidence and assumptions

Evidence: the product owner's direct declaration of 2026-07-18, which names
the four roles and their holder, the effective date, the `self_review: true`
requirement, the four independent-review gates, and the continued fail-closed
status of quarantine release. This covers every element of Q-001's required
answer as recorded in `brain/current/OPEN_QUESTIONS.md`.

Assumption: GitHub identity `@ibra2000sd` is the operative repository identity
for approval evidence; it matches the `gh` authentication used for the
repository's merged pull requests.

This decision provides no evidence about providers, data policy, or spend;
Q-002 remains open.

## Consequences

Approvals now have a named human authority, so work blocked only on unnamed
gate roles is unblocked; every approval must carry the `self_review: true`
declaration to be valid. The four independent-review gates are effectively
frozen until an independent reviewer is formally named — quarantined material
stays fenced, client-facing work cannot be published or sent, BLOCKING
evaluation gates cannot be changed, and real client data cannot be approved
for any model provider. DEC-0007's fail-closed quarantine stands unchanged;
runtime messages that cite Q-001 as the reason no release authority exists now
resolve through this record (the missing pieces are the independent reviewer
and the authenticated mechanism). Model-backed work remains blocked on Q-002
only.

## Revisit trigger

- An independent reviewer is formally named — a new decision record amends the
  reviewer role and unfreezes the independent-review gates it satisfies.
- An authenticated gate-mechanism design is ratified — together with a named
  independent reviewer, that decision supersedes DEC-0007's fail-closed rule
  per its own revisit trigger.
- Any change in who holds any of the four roles.

## Supersession

supersedes: null (complements DEC-0007: names gate-role identities but leaves
its fail-closed rule in force because no authenticated approval mechanism is
designed and gate 1 requires an independent reviewer)
superseded_by: null
