# DEC-0020 — Anthropic smoke verification: exactly one synthetic Haiku request, signed, reconciled, then live-disabled again

decision_id: DEC-0020
title: "Phase 1C.2 authorizes exactly ONE minimal real Anthropic request — synthetic input, claude-haiku-4-5-20251001 only, one attempt, zero escalation, USD 0.25 ceremony ceiling under the standing USD 1.00 per-request ceiling — bound to an immutable Product Owner-signed live-provider-call-request and consumed exactly once; the call counts as successful only after local response validation AND provider-side reconciliation both succeed; on any failure or ambiguity there is no retry and a fresh signed authorization is required; the final merged operational state returns to general-live-disabled with the smoke recorded, EXP-0001 still prohibited, and no reusable authorization remaining"
date: 2026-07-20
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1C.2 execution instruction of 2026-07-20"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1C.2 execution instruction of 2026-07-20 explicitly directing this smoke-verification phase under the DEC-0018 Option A / DEC-0019 authority; self_review: true (DEC-0008)"
approved_at: 2026-07-20

## Context

DEC-0019 delivered the Anthropic implementation in the
CONFIGURED_BUT_LIVE_DISABLED state: adapter, signed candidate, contracts,
budget ledger, and secret boundary exist and are test-proven, but no
credential exists and no live call can be instantiated. DEC-0018 Option A
and the decision packet (§11) require, before EXP-0001, a single minimal
paid smoke call within the per-request ceiling followed by a successful
reconciliation of run records against the provider usage export. This
record authorizes exactly that smoke call and nothing more.

This phase crosses none of DEC-0008's four independent-review gates. The
Product Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record
carries `self_review: true` per DEC-0008. Product Owner approval is NOT
independent review, and a single smoke call is NOT model-quality
evidence.

## Decision

1. **Exactly one synthetic Haiku request.** Provider `anthropic`, model
   `claude-haiku-4-5-20251001` only, data class `synthetic` only. No
   other provider, model, or data class.

2. **No retry, zero escalation.** The smoke path enforces exactly one
   attempt with retry structurally disabled — distinct from the standing
   two-attempt general policy. Zero automatic model escalation.

3. **USD 0.25 ceremony ceiling under the standing USD 1.00 ceiling.** The
   signed request's authorized maximum cost is USD 0.25; the global
   per-request ceiling of USD 1.00 (and the run/day/month ceilings) still
   apply and are enforced pre-invocation. A worst-case projected cost
   above USD 0.25 means no provider call is made.

4. **The signed live-provider-call-request is the complete authorized
   action.** An immutable `live-provider-call-request` artifact binds the
   exact request — namespace, candidate and gateway-policy references and
   digests, provider and model, synthetic fixture references and content
   digests, expected output contract, exact input and maximum output
   tokens, the USD 0.25 maximum, one attempt, no retry, no escalation,
   endpoint and API version, every disabled optional surface, a short
   validity window, the purpose, and a canonical request digest. The
   Product Owner signs that exact artifact's content digest under the
   `live-provider-call-approval` gate; the approval is consumed exactly
   once. Signing anything broader authorizes nothing.

5. **Product Owner approval is required and authentic.** The DEC-0014
   mechanism applies: policy-authorized gate, target-digest-bound,
   atomically nonce-consumed. No independent review is invented.

6. **Provider output has no truth authority.** The smoke response is
   validated against a trivial structured-output contract and never
   creates a claim, resolves a contradiction, upgrades verification
   status, satisfies an approval, or publishes.

7. **Success requires local validation AND reconciliation.** The call is
   marked successful only after (a) the response passes content-type,
   size, JSON, returned-model, usage, structured-content, and
   output-contract validation locally, AND (b) provider-side
   reconciliation confirms exactly one request, the returned model, usage
   agreement where the console exposes it, cost within USD 0.01 of the
   provider-visible amount (or a documented per-request precision
   limitation), a charge no greater than USD 0.25, and the USD 60 hard
   cap still active.

8. **Failure or ambiguity requires a fresh authorization.** On any
   failure, timeout, protocol violation, or reconciliation ambiguity
   there is no retry: the outcome is recorded truthfully without secret
   or body leakage, accounting stays crash-safe, `smoke_call_completed`
   stays false, and any further request requires a new signed
   live-provider-call-request.

9. **Final operational state returns to general-live-disabled.** After a
   verified smoke, the operational state is `SMOKE_VERIFIED_EXP_DISABLED`:
   `credential_provisioned` true (after Product Owner confirmation),
   `console_spend_cap_configured` true (after Product Owner confirmation),
   `smoke_call_completed` true, general `live_invocation_enabled` FALSE,
   `exp_0001_executed` false, EXP-0001 authorization null, and no
   unconsumed smoke authorization remaining reusable. General live
   provider access is NOT opened.

10. **EXP-0001 remains prohibited** and requires its own separate later
    signed approval; this record does not authorize it.

11. **No general provider access is opened.** Tools, caching, Batch,
    Files API, provider memory/storage, fallback providers, automatic
    escalation, production traffic, and client-facing publishing all
    remain disabled and structurally unapprovable by this record.

**Contract migration (1.9.0 -> 1.10.0, synchronized).** New strict
contracts: `live-provider-call-request` (the immutable signed one-shot
authorization target), `provider-smoke-result` (the sanitized run
evidence), and `provider-reconciliation-record` (the local-vs-provider
reconciliation). `provider-operational-state` becomes a fail-closed state
machine over `CONFIGURED_BUT_LIVE_DISABLED` ->
`SMOKE_CALL_AUTHORIZED` -> `SMOKE_VERIFIED_EXP_DISABLED`, with per-state
semantic rules pinning general live invocation and EXP-0001 execution
false in every state. The approval-evidence/receipt gate and
target-type enums gain `live-provider-call-request`.

## Explicitly rejected

- **Enabling general live invocation for the smoke call** — rejected: a
  standing live flag is a broad enablement; the smoke call runs through a
  single consumed authorization while general live invocation stays
  false.
- **A second request for reconciliation** — rejected: reconciliation uses
  the provider console (a human step), never a second API call.
- **Any retry on smoke failure** — rejected: a failed one-shot ceremony
  requires a fresh signed authorization, not an automatic re-attempt.
- **Reusing the DEC-0019 provider-enablement approval for the live call**
  — rejected: the live call needs its own `live-provider-call-approval`
  bound to the exact request digest; the enablement approval authorizes
  configuration, not invocation.

## Evidence and assumptions

Evidence: the Phase 1C.2 execution instruction of 2026-07-20; the DEC-0018
Option A ratification and DEC-0019 implementation; the §2 live
re-verification (docs/PROVIDER_SMOKE_REVERIFICATION_1C2.md, accessed
2026-07-20 — no drift); the mock-transport smoke and recovery-drill test
suites; the green completion gate. Assumptions: the pinned Haiku price
($1/$5 per MTok) is current (re-verified 2026-07-20); the provider console
exposes at least per-request existence and daily/near-real-time usage
sufficient for reconciliation, with documented precision limits accepted.

## Consequences

If the ceremony completes and reconciles, NABCor has one verified real
provider round-trip with truthful accounting — the packet's pre-EXP-0001
evidence — while general live invocation stays disabled and EXP-0001 stays
gated. The honest costs: up to USD 0.25 of real spend; the operational
state machine must be consciously advanced for any future live work; and
the newly created credential becomes a standing secret that RISK-SECRET-01
tracks.

## Revisit trigger

- The smoke call fails, times out, or cannot be reconciled honestly — a
  fresh DEC/authorization is required before any further request.
- EXP-0001 execution is authorized — a new decision and signed approval.
- Anthropic changes model lifecycle, pricing, retention, or API surface
  (RISK-DECAY-01) — re-verify before any further live work.
- Any discovery that the smoke path allows a second request, a retry,
  standing live mode, or a reusable authorization reopens this decision as
  a defect.

## Supersession

supersedes: null (extends DEC-0019's CONFIGURED_BUT_LIVE_DISABLED posture
with a single consumed one-shot authorization; DEC-0019's general-live
disabled posture is preserved, not superseded)
superseded_by: null
