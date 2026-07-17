# DEC-0009 — Zero-provider offline execution policy

decision_id: DEC-0009
title: "No external model provider is approved; the deterministic Fake Adapter is the only approved gateway adapter; synthetic data only; external/model spend is capped at zero per run and per month"
date: 2026-07-18
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.1 execution instruction of 2026-07-18"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.1 execution instruction explicitly ratifying this policy; self_review: true (DEC-0008)"
approved_at: 2026-07-18

## Context

Q-002 (providers, data policy, and spend) has blocked every model-backed path
since the foundation baseline: no provider or account was approved for
synthetic or real client data, and no spend ceiling existed. The gateway
design (docs/MODEL_AND_TOKEN_STRATEGY.md) requires a routing and accounting
boundary before any provider can ever be added safely. The product owner's
Phase 1B.1 instruction resolves Q-002 by approving **no** provider and
authorizing an offline, deterministic gateway kernel instead.

## Decision

1. **Approved external model providers: none.**
2. **Approved gateway adapter: the deterministic Fake Adapter only**
   (`fake`, provider namespace `offline`, label
   `deterministic-fake-adapter-v1`, execution tier 0).
3. **Permitted data classification: synthetic data only.** Real client data
   is prohibited from every model or provider path.
4. **External network access by the gateway is prohibited.**
5. **API keys, provider credentials, and model secrets are prohibited.**
6. **Spend ceilings: USD 0 per run and USD 0 per month** for external/model
   spend. No real model invocation is permitted.
7. **The Fake Adapter is deterministic test infrastructure, not a model.**
   Its results must never be reported as model-quality or product-quality
   evidence, and its executions must not populate EXP-0001 results.
8. **Q-002 is closed as "no provider approved."** Closing the question is not
   provider approval and must never be silently reinterpreted as such.
9. **Enabling any future provider requires a new explicit ratified decision**
   defining, at minimum: the provider and allowed models; permitted data
   classifications; retention and training policy; geographic or regulatory
   constraints; the secret-management mechanism; per-run and monthly spending
   ceilings; and the required human approval gates.

The ratified policy is encoded machine-readably in
`contracts/gateway-policy.schema.json` and the committed active policy
document `contracts/gateway-policy.active.json`; the contract pins the
zero-provider values, so any relaxation is schema-invalid until a superseding
decision changes the contract through the documented versioning procedure.

## Alternatives

- **Approve one provider now with a small budget** — rejected: no
  data-policy, retention, or secret-management analysis has been done; the
  gateway boundary itself is unproven; approving a provider before the
  infrastructure exists repeats the "claims exceed enforced behavior" failure
  class (RISK-INTEG-01).
- **Leave Q-002 open and build nothing** — rejected: the gateway contract,
  observability records, and budget enforcement can be built and proven
  offline with zero spend; leaving the question open blocks that work for no
  safety gain.
- **Close Q-002 informally without a policy contract** — rejected: a policy
  that lives only in prose has no enforcement path; the machine-readable
  policy makes the zero-provider boundary CI-checkable and fail-closed.

## Evidence and assumptions

Evidence: the product owner's Phase 1B.1 execution instruction of 2026-07-18,
which states the policy verbatim (no providers, fake adapter only, synthetic
only, zero spend, no network, no credentials, no real model invocation, Fake
Adapter excluded from quality evidence and EXP-0001) and the future-provider
decision requirements listed above.

Assumption: none material — this decision approves the absence of external
capability, which the runtime can and does enforce structurally.

## Consequences

Model-backed work is no longer blocked on an open question; it is prohibited
by ratified policy until a future decision approves a provider. The offline
gateway kernel (DEC-0010) can be implemented and validated with zero external
risk. EXP-0001 remains unstarted with no results. The cost of this decision
is honest: no model-quality evidence of any kind can exist yet, and no
document may imply otherwise.

## Revisit trigger

A provider-enablement decision is proposed carrying all nine required
elements of point 9 above — that decision supersedes this policy's adapter
and spend limits through a new gateway-policy contract version. Independently:
any discovery that a runtime path can reach a network, a credential, or
nonzero spend reopens this decision as a defect.

## Supersession

supersedes: null
superseded_by: null
