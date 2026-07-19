# DEC-0019 — Anthropic provider implementation: signed policy candidate, fail-closed raw-HTTPS adapter, budget enforcement, and mock-only validation

decision_id: DEC-0019
title: "Phase 1C.1 implements the ratified DEC-0018 Option A enablement as CONFIGURED_BUT_LIVE_DISABLED: a Product Owner-signed provider-policy candidate cryptographically bound to the active gateway policy, one raw-HTTPS Anthropic adapter behind the provider-neutral gateway with a pinned endpoint and a narrow injected transport, conservative pre-invocation USD/token budget enforcement, a macOS-Keychain-only secret boundary with no provisioned credential, and mock-only tests and CI — live invocation, the smoke call, and EXP-0001 each remain behind their own separate future authenticated approvals"
date: 2026-07-20
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1C.1 execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1C.1 execution instruction of 2026-07-19 explicitly directing this implementation phase, under the DEC-0018 Option A ratification recorded at commit 215ca1b684e04f86e111d79d9a53f191421bf9b7; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

DEC-0018 Option A was ratified on 2026-07-19 and authorizes exactly one
thing: the Phase 1C.1 implementation phase. This record is that phase's
durable decision. It establishes how the ratified scope is implemented
and — just as important — what the implementation deliberately does NOT
enable. The end state is CONFIGURED_BUT_LIVE_DISABLED: the adapter,
contracts, and signed policy exist and are active; no credential exists,
no network call has been made, no money has been spent, and live
invocation fails closed behind gates that no committed configuration can
satisfy.

This phase crosses none of DEC-0008's four independent-review gates. The
Product Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record
carries `self_review: true` per DEC-0008.

## Decision

1. **Anthropic is the only configured external provider.** The gateway
   policy allowlists exactly the `anthropic` adapter plus the
   deterministic offline `fake` adapter (test infrastructure, DEC-0010).
   No fallback provider exists and none can be added without a new
   ratified decision and contract migration.

2. **Exactly two allowed model IDs**, pinned as schema constants:
   `claude-haiku-4-5-20251001` (tier 1) and `claude-sonnet-5` (tier 2).
   No aliases; a response reporting any other model is rejected (threat
   T09) and never retried.

3. **Synthetic data only.** `allowed_data_classes` stays `["synthetic"]`
   in the policy, the signed candidate, and the adapter's own re-check.
   Real client data remains structurally unapprovable (frozen DEC-0008
   independent-review gate plus a missing ratified decision).

4. **Raw HTTPS through Node built-in fetch; no Anthropic SDK and no new
   runtime dependency.** The dependency boundary stays exactly
   `ajv` + `ajv-formats` (DEC-0006), enforced by the dependency-allowlist
   and production-install tests.

5. **The exact endpoint and protocol version are policy-controlled
   constants, never caller inputs**: `https://api.anthropic.com/v1/messages`
   is pinned inside the single transport module (the only file in the
   repository with network capability, enforced by the
   provider-independence gate), and `anthropic-version: 2023-06-01` is a
   signed-candidate constant. The transport interface carries no URL and
   no header map, so neither can be injected.

6. **Tools, caching, Batch, Files, provider memory/state, fallback
   providers, and automatic model escalation remain disabled** — each
   pinned false as a schema constant in the signed candidate; the request
   body contains none of the corresponding fields, and a response
   reporting nonzero cache tokens is rejected.

7. **Retention is described conservatively** as
   `STANDARD_UP_TO_30_DAYS`: automatic backend deletion within 30 days
   with documented exceptions (trust-and-safety flags up to 2 years,
   legal holds). No ZDR claim is made anywhere (ledger C4/C5 taxonomy:
   request-state statelessness is never rendered as a retention claim).

8. **Live invocation requires ALL of:** an active signed policy
   candidate; a valid runtime policy trio whose digest binding verifies;
   an approved model and the synthetic data class; pre-invocation budget
   availability with an atomic reservation; credential resolution through
   the approved secret boundary; and a separately authenticated,
   unconsumed live-call authorization at the `live-provider-call-approval`
   gate targeting the exact signed candidate. The gates are checked in
   that order, fail-closed, with test-proven ordering (no secret lookup
   before every non-secret gate passes).

9. **No credential is provisioned and no live authorization exists in
   this phase.** The committed provider-operational-state document pins
   `live_invocation_enabled`, `credential_provisioned`,
   `console_spend_cap_configured`, `smoke_call_completed`, and
   `exp_0001_executed` all false AS SCHEMA CONSTANTS — flipping any of
   them requires a future conscious contract migration plus its own
   ceremony, never a document edit.

10. **CI and tests are mock-only and structurally prohibited from
    provider access.** Every test transport is injected; the
    provider-independence gate proves fetch exists only in the pinned
    transport module; no environment variable can select a policy,
    transport, or credential; GitHub Actions contains no Anthropic key.

11. **Every response remains untrusted** until content-type, size, JSON,
    model-identity, usage, content-block, and NABCor contract validation
    all pass. Partial artifacts are never persisted.

12. **Model output cannot verify facts, resolve contradictions,
    authorize actions, or publish.** The DEC-0011..DEC-0017 boundaries
    are unchanged: verification upgrades need human paths, resolution
    needs the DEC-0016 signed loop, authorization needs DEC-0014
    evidence, and a fabricated approval dies at signature verification.

13. **Cost accounting** uses conservative pre-invocation reservation
    (declared token maxima priced by the signed candidate's pinned price
    table, integer cents, rounded up) and provider-reported usage for
    post-invocation settlement. A request whose token maxima project
    above USD 1.00 is rejected even when both token ceilings pass.
    Ceilings: USD 1.00/request, 25/run, 40/UTC-day, 60/UTC-month;
    200,000 input and 32,000 output tokens; two total attempts; zero
    escalations. Unsettled or unknown-usage reservations remain fully
    charged forever (conservative); settlement never releases more than
    provably unused and is idempotent under crash recovery.

14. **Provider request/response bodies never enter logs, errors,
    manifests, or model-run records.** Records carry identifiers, token
    counts, USD values, the pricing version, retention status, and
    references only; provider errors are redacted to status code and
    request-id; no secret length/prefix/suffix/hash diagnostic exists.

15. **Emergency disable is fail-closed and needs no code deployment:**
    the operational state defaults live-disabled; a missing secret,
    missing/invalid live authorization, exhausted budget, model mismatch,
    or policy-binding mismatch each independently disable calls. The
    documented FUTURE external controls — console key revocation,
    Keychain entry removal, console spend cap, active-policy revert —
    are NOT claimed configured by this phase.

16. **EXP-0001 requires a separate later signed approval and is not
    executed here.** Its Result section remains empty (CI-enforced).

**Cryptographic policy binding (packet section 9, implemented).** The
immutable `provider-policy-candidate` artifact carries the complete
ratified configuration; the Product Owner signs the stored candidate's
exact canonical content digest under the new `provider-enablement-approval`
gate (DEC-0014 mechanics: policy-authorized, target-digest-bound,
atomically nonce-consumed); the public evidence and consumption receipt
are committed; and the active gateway policy embeds the signed digest and
both references. CI (`scripts/validate-provider-chain.mjs`) re-verifies
the complete candidate → evidence → authority → decision → active-policy
chain, including the Ed25519 signature, on every run. Any ceiling, model,
or data-class drift breaks the binding and fails closed.

**Contract migration (1.8.0 → 1.9.0, synchronized).** New strict
contracts: `provider-policy-candidate` and `provider-operational-state`;
`gateway-policy` re-pinned from the DEC-0009 zero-provider constants to
the DEC-0018 constants with the mandatory candidate binding;
`human-gate-policy` v3 adds the `provider-enablement-approval` and
`live-provider-call-approval` product-owner gates (the four DEC-0008
independent-review gates stay frozen); the approval-evidence/receipt
enums gain the new gates and the `provider-policy-candidate` target;
`model-run` gains optional truthful provider-accounting fields. No
redundant live-call contract was added: the live-call authorization
reuses the generic approval-evidence contract targeting the candidate.

## Explicitly rejected

- **An Anthropic SDK dependency** — rejected: raw HTTPS is fully
  documented, the SDK widens the supply-chain surface (threat T19), and
  DEC-0006's boundary stays intact at zero new runtime dependencies.
- **A configurable provider base URL** ("for testing flexibility") —
  rejected: a URL parameter anywhere is an SSRF/exfiltration surface
  (threat T03); tests inject mock transports instead.
- **Enabling live invocation behind a runtime flag** — rejected: a flag
  is an edit away from a paid call; the disabled state is a schema
  constant requiring a conscious contract migration plus ceremonies.
- **Streaming in the first implementation** — rejected: bounded
  non-streaming responses are simpler to size-cap and validate; a later
  phase may revisit.
- **A generic multi-provider abstraction layer** — rejected: exactly one
  provider is ratified; the existing provider-neutral gateway boundary is
  the abstraction, and speculative generality would violate P11.

## Evidence and assumptions

Evidence: the Phase 1C.1 execution instruction of 2026-07-19; the
DEC-0018 Option A ratification at commit 215ca1b6; the corrected decision
packet and threat model (Phase 1C.0/1C.0.1); the mocked-transport test
suites (policy chain, adapter behavior, budget, authorization ordering,
live-disabled structural proofs, leakage scans); the green completion
gate. Assumptions: the pinned price table (Haiku $1/$5, Sonnet 5 at the
conservative post-intro $3/$15 per MTok) matches the official prices
re-verified 2026-07-19; provider terms drift, so RISK-DECAY-01's
re-verification rule applies before the smoke-call ceremony.

## Consequences

NABCor is CONFIGURED_BUT_LIVE_DISABLED: the implementation, contracts,
and signed policy are active and test-proven, and the remaining path to
a first paid call is deliberately operational, not code: (1) the
Anthropic account/API-key ceremony and macOS Keychain provisioning under
the policy-bound identifiers; (2) the provider-console USD 60 hard cap;
(3) a separately signed minimal smoke-call approval and reconciliation
drill; (4) a separately signed EXP-0001 execution approval. The honest
costs: the operational-state contract must be consciously migrated to
ever enable live calls, and every future ceiling/model change requires a
new signed candidate.

## Revisit trigger

- The secret-provisioning + smoke-call ceremony is authorized — a new
  phase migrates the operational-state contract consciously.
- Anthropic changes pricing, model lifecycle (Haiku 4.5 retirement floor
  2026-10-15), retention policy, or API surface — re-verify sources and
  re-sign a corrected candidate before any live work.
- The signed candidate's validity window (through 2026-10-15) lapses —
  a re-ratified candidate is required.
- Any discovery that a path resolves a credential before the non-secret
  gates, reaches the network outside the pinned transport, or lets
  provider output acquire authority reopens this decision as a defect.

## Supersession

supersedes: null (implements DEC-0018 within the DEC-0009-superseding
enablement that ratification authorized; DEC-0009's zero-provider
OPERATIONAL posture is now superseded by the CONFIGURED_BUT_LIVE_DISABLED
posture this record activates, while DEC-0009's synthetic-only and
fail-closed principles carry forward unchanged)
superseded_by: null
