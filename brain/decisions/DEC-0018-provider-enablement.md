# DEC-0018 — First provider enablement (PROPOSED — grants no authority)

decision_id: DEC-0018
title: "Which provider, models, data classes, ceilings, retention posture, secrets design, and gates govern NABCor's first real-model enablement for synthetic EXP-0001 — three mutually exclusive options prepared for Product Owner ratification"
date: 2026-07-19
status: proposed
proposed_by: "Phase 1C.0 research packet prepared under the Product Owner execution instruction of 2026-07-19"
approved_by: null
approved_at: null

## PROPOSED STATUS — READ FIRST

This record is **proposed** and **grants no authority**. No provider is
enabled, no adapter exists, no credential exists, no network path exists,
no spend is authorized, and EXP-0001 remains unexecuted. DEC-0009 (zero
providers, Fake Adapter only, synthetic data only, zero external spend)
remains the active ratified policy, and the active gateway policy is
byte-guarded against drift (`scripts/validate-provider-packet.mjs`).
Ratification requires the Product Owner's explicit statement selecting
exactly one option (Q-010); nothing in this phase may be read as that
approval, and no Product Owner approval is asserted here.

## Context

DEC-0009 closed Q-002 as "no provider approved" and required that any
enablement decision satisfy nine requirements: named provider and
models, permitted data classes, retention/training rules, regulatory
constraints, secret management, spend ceilings, human gates,
observability/failure controls, and pre-EXP-0001 evidence. Phase 1B
completed the offline foundation (DEC-0010..DEC-0017); EXP-0001 — Phase
1's exit evidence — is the only remaining blocked step, and it requires
a real model. Phase 1C.0 produced the evidence base this decision needs:

- **Decision packet:** docs/PROVIDER_ENABLEMENT_DECISION_PACKET.md —
  three first-party candidates (Anthropic API, OpenAI API, Google Gemini
  Developer API) researched from official sources only on 2026-07-19,
  a 29-row comparison matrix with per-fact VERIFIED/INFERRED/UNKNOWN/
  REQUIRES-CONTRACT tags, a reproducible EXP-0001 cost model with six
  scenarios and proposed ceilings, secret-management design, and gate
  design.
- **Threat model:** docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md — 24
  threats with preventive/detective/response controls, implementation
  gates, and the layered emergency-disable path E1.

## The three options (full text in the packet §10)

1. **Option A — recommended narrow enablement:** Anthropic API with
   exactly `claude-haiku-4-5-20251001` and `claude-sonnet-5`; synthetic
   data only; ceilings $1.00/request, $25/run, $40/day, $60/month with
   the provider-console hard cap at $60; caching, Batch, tools, and all
   provider-side storage OFF; no fallback; bounded EXP-0001-only scope.
2. **Option B — cheapest capable configuration:** OpenAI API with
   `gpt-5.4-nano-2026-03-17` and `gpt-5.6-terra` (~5x cheaper expected
   case) at the price of a storage-by-default API surface requiring
   `store:false` on every call, an unverifiable hard-spend-cap
   semantic, and several governance pages unreachable during research.
3. **Option C — preserve DEC-0009:** fake adapter only, zero spend;
   Phase 1 model-backed evidence stays blocked.

## Recommendation

Option A. The properties that decide a FIRST enablement are the ones
that fail closed — verified self-serve hard spend caps, stateless-by-
default transport, guaranteed schema adherence on the cheap tier, and
zero new runtime dependencies (documented raw HTTPS) — and Anthropic is
the only candidate where every one is VERIFIED public capability today.
The packet states the conflict-of-interest note (the researching agent
runs on Anthropic models) and the full evidence for overriding toward
Option B.

## Unresolved questions (carried into ratification or later phases)

- Anthropic retention-documentation reconciliation (docs "not retained
  by default" vs privacy article "deleted within 30 days") — UNKNOWN;
  must be resolved (likely REQUIRES CONTRACT) before any real-client-
  data decision, which remains frozen regardless.
- Subprocessor-list contents for all three providers (machine-unreadable
  or 403 during research) — UNKNOWN.
- Whether OpenAI's self-set monthly budget hard-stops spend — UNKNOWN
  (matters only if Option B is chosen).
- VAT/tax treatment on provider billing for the operating jurisdiction —
  UNKNOWN; ceilings carry headroom.
- Haiku 4.5's tentative retirement floor (2026-10-15) vs the actual
  EXP-0001 execution date — schedule dependency recorded in the packet.

## Evidence and assumptions

Evidence: the packet's §12 source list (43 official pages, all accessed
2026-07-19, each tied to the matrix rows it supports); the repository
workload plan (EXP-0001, MODEL_AND_TOKEN_STRATEGY, token-budget
contract) behind the cost model. Assumptions: cost-model workload
assumptions are stated in packet §6.1 and are ESTIMATES — nothing in
this phase is measured; provider terms drift, so sources must be
re-verified if ratification happens more than ~60 days after the access
date.

## Consequences (of ratifying — none while proposed)

Ratifying A or B authorizes ONLY the implementation phase: adapter
behind the gateway, policy-contract migration embedding the signed
candidate digest (packet §9), secret provisioning per packet §8,
threat-model implementation gates, then separately-approved EXP-0001
execution. Real client data, quarantine release, publishing, provider
storage, fallback providers, tools/network capabilities, and every
DEC-0008 independent-review action remain frozen under every option.
Ratifying C changes nothing and leaves Phase 1 exit evidence blocked.

## Revisit trigger

- The Product Owner ratifies one option (closes Q-010) — this record
  moves to ratified with the selected option and approval evidence.
- Sources age past ~60 days without ratification — re-verify prices,
  retention, and model lifecycle before ratifying.
- Any candidate provider materially changes pricing, retention, or
  model availability — update the packet before ratification.

## Supersession

supersedes: null
superseded_by: null
