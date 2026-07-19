# DEC-0015 — Product Owner Ed25519 public-key enrollment

decision_id: DEC-0015
title: "Real Product Owner Ed25519 public key enrolled: authority registry version 2 (exactly one least-privilege product-owner authority) pinned by human-gate policy version 2; ordinary fact-resolution approval becomes operationally available; independent-review gates stay frozen"
date: 2026-07-19
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.3B execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.3B product-owner execution instruction of 2026-07-19 plus the explicit fingerprint confirmation 'I confirm that key_id k8cc9db703247760829dcb74819fbe07cd1dc24a2bf66ec7a02ed500391de8b1b is my Product Owner public key and authorize its enrollment in NABCor authority registry version 2.'; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

DEC-0014 built the offline Ed25519 human-gate mechanism but enrolled no
authority: registry version 1 was committed with zero authorities, so no
runtime approval could verify. This record ratifies the first real
enrollment and activates the mechanism for ordinary fact-resolution
approval only.

The key ceremony was performed personally by the Product Owner with the
offline keygen CLI (`src/cli/keygen.ts`) in a separate terminal. The
implementation agent never generated, read, copied, hashed, backed up, or
otherwise handled the private key; it received only the public
registry-entry candidate, the key ID, and the Product Owner's written
confirmations. The private key lives outside the repository under the
Product Owner's sole control with owner-only permissions, and the Product
Owner accepted sole responsibility for maintaining a secure encrypted
backup. The public candidate was validated as untrusted input: strict
nine-field shape, canonical base64, a 44-byte SPKI decoding to a real
Ed25519 public key, the key ID recomputed from the SPKI DER bytes and
matched against the ceremony output, and a scan proving no private or
credential-shaped material. The Product Owner then confirmed the
fingerprint verbatim (recorded in `approved_by` above) before anything was
committed.

## Decision

1. **Authority registry version 2 enrolls exactly one authority**: the
   confirmed Product Owner public key
   `k8cc9db703247760829dcb74819fbe07cd1dc24a2bf66ec7a02ed500391de8b1b`
   (subject_id `ibrahim-mohamed`, label "Ibrahim Mohamed (@ibra2000sd) —
   Product Owner", Ed25519 SPKI
   `MCowBQYDK2VwAyEAp0Y1G8pBZ+LiOanCJNKqG9SLXwRcME8G59qWJEZIjLM=`), valid
   2026-07-19T00:00:00Z through 2027-07-19T00:00:00Z, status active.
2. **The key holds the `product-owner` role only** (least privilege).
   Reviewer, operator, and evaluation-owner roles are NOT enrolled, even
   though DEC-0008 records Ibrahim as currently performing those
   organizational duties — organizational duty is not signing authority.
3. **The key can satisfy ordinary `fact-resolution-approval`** (the only
   active-policy gate requiring role `product-owner` without independent
   review).
4. **The key can never satisfy an independent-review gate.** A Product
   Owner self-signature structurally fails all four DEC-0008
   independent-review gates; `independent_reviewer_named` stays pinned
   false; no independent reviewer is named or enrolled by this decision.
5. **Registry history remains immutable.** Version 2 supersedes version 1
   by explicit lineage; version 1 (zero authorities) is preserved in Git
   history and was never rewritten. Registry v1 cannot satisfy policy v2:
   the trusted boundary rejects any registry whose version differs from
   the policy pin.
6. **Rotation or revocation requires a new reviewed registry revision and
   a new decision record** — never an in-place edit.
7. **Key expiry fails closed.** After 2027-07-19T00:00:00Z the key denies
   authorization until rotated by a reviewed revision.
8. **Losing the private key permits no bypass.** Recovery is rotation:
   generate a new keypair offline, enroll it through a new reviewed
   registry revision + policy pin + decision, and revoke the lost key.
9. **The public key is non-secret.** The SPKI and key ID above are safe to
   publish; possession of them grants no authority.
10. **The private key remains entirely outside Git, CI, the Artifact
    Store, logs, fixtures, and agent context.** Automated tests use
    ephemeral in-memory keypairs only; CI never needs or receives the real
    private key.
11. **Human-gate policy version 2 pins registry version 2** and changes
    nothing else: signature, canonicalization, replay, TTL, clock-skew,
    and default-deny rules are byte-identical to policy version 1.
12. **One genuine schema defect was corrected during enrollment**
    (contracts 1.7.0 → 1.7.1): `human-gate-policy.schema.json` pinned
    `decision_ref` as const `DEC-0014`, which made the documented revision
    procedure — a new `policy_version` ratified by a new decision —
    schema-invalid. The const is relaxed to the same `^DEC-[0-9]{4,}$`
    pattern the authority-registry contract already uses; every 1.7.0
    instance remains valid, all instances were re-issued at 1.7.1 under
    the documented synchronized-migration procedure, and a regression
    fixture (P18) fails under the old schema and passes under the new one.
    No other contract changed meaning.
13. **A safe operator signing boundary exists**
    (`src/cli/sign-approval.ts`): offline, explicit private-key path,
    refuses symlinks, in-repository keys, and non-owner-only permissions,
    derives the key ID from the private key and requires it to be enrolled
    in the active registry, refuses independent-review gates for the
    self-signing flow, uses a cryptographically random single-use nonce,
    exclusive-creates its output, and never prints, logs, or copies
    private material. Producing evidence applies no business action.
14. **This decision applies no fact resolution, mutates no claim truth
    state, releases no quarantine, publishes nothing client-facing,
    enables no provider or model, adds no network path, and processes no
    real client data.** DEC-0009's restrictions are unchanged and
    EXP-0001 remains unexecuted.

## Explicitly rejected

- **Enrolling all four DEC-0008 roles on this key** — rejected: least
  privilege; a compromised or over-scoped Product Owner key must never be
  able to masquerade as a reviewer or evaluation-owner, and independent
  review must stay structurally impossible until a real independent
  reviewer exists.
- **Keeping policy `decision_ref` at DEC-0014 to avoid the schema
  migration** — rejected: each active-document revision must name the
  decision that ratified it (the registry contract already works this
  way); hiding this revision behind DEC-0014's reference would break the
  audit chain.
- **A global major/minor contract bump for the enrollment** — rejected:
  enrollment is an active-instance change; the only schema change is the
  scoped `decision_ref` defect correction, so a patch-level synchronized
  re-issue (1.7.1) is the honest minimum.
- **Agent-side key generation "for convenience"** — rejected: the agent
  handling private material would collapse the human-authority boundary
  the whole mechanism exists to prove.
- **Environment variables for the signing CLI's key path or identity** —
  rejected: attacker-influenceable ambient state; every input is an
  explicit flag and identity is derived from the key itself against the
  registry.

## Evidence and assumptions

Evidence: the Phase 1B.3B product-owner execution instruction of
2026-07-19; the Product Owner's ceremony completion statement (private key
generated outside the repository, sole control, owner-only permissions,
secure-backup responsibility accepted); the verbatim fingerprint
confirmation recorded in `approved_by`; the independent candidate
validation (recomputed key_id equal to the ceremony key_id, Ed25519 SPKI
decode, strict shape, no private material); contract validation of
registry v2 and policy v2 including the mutual id/version binding in
`contracts/validate.mjs`; the regression proof that fixture P18 and the
active policy v2 fail under the 1.7.0 schema and pass under 1.7.1; and the
enrollment/signing-CLI test suite added in Phase 1B.3B.

Assumptions: the Product Owner's machine and backup medium are secure (the
repository cannot verify this; RISK-KEY-01 tracks it); a one-year validity
window balances rotation hygiene against operational continuity; file-level
receipt atomicity assumptions of DEC-0014 are unchanged.

## Consequences

Ordinary fact-resolution approval is now operationally available: evidence
signed by the enrolled key, bound to one exact artifact state under policy
v2, verifies and consumes exactly once. Everything else stays closed —
authenticated approval still applies no business action, fact-resolution
application remains unimplemented, the four independent-review gates
remain frozen, and quarantine remains unreadable. The honest costs: the
enrolled key expires 2027-07-19 and must be rotated by a reviewed revision
before then; losing the private key stalls approvals until rotation; and
every future policy or registry revision must carry its own ratifying
decision reference.

## Revisit trigger

- Fact-resolution application lands — that decision defines how an
  authorized approval creates claim revisions (DEC-0014 revisit trigger).
- The enrolled key approaches expiry (2027-07-19), is suspected
  compromised, or its private half is lost — rotation/revocation via a new
  registry revision and decision record.
- An independent reviewer is formally named and enrolled — a superseding
  decision migrates the policy contract to unfreeze the DEC-0008
  independent-review gates.
- Any discovery that an unknown, expired, revoked, wrong-subject, or
  wrong-role key authorizes anything reopens this decision as a defect.
- Multi-operator or multi-key operation outgrows the single-authority
  registry shape.

## Supersession

supersedes: null (activates DEC-0014's mechanism by enrollment; satisfies
DEC-0014's first revisit trigger; none of DEC-0014's rules change)
superseded_by: null
