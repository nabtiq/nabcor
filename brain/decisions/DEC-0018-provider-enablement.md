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
enablement decision satisfy nine requirements: the provider, the
allowed models, the permitted data classifications, the retention
policy, the training policy, geographic/regulatory constraints, the
secret-management mechanism, per-run and monthly spend ceilings, and
the human approval gates. The packet's §1 answers all nine and adds
observability/failure controls and pre-EXP-0001 evidence on top. Phase 1B
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
- **Threat model:** docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md — 21
  threat entries covering all 24 required threat categories, each with
  preventive/detective/response controls, residual risk, an
  implementation gate, and an owner, plus the layered emergency-disable
  path E1.

## The three options (full text in the packet §10)

1. **Option A — recommended narrow enablement:** Anthropic API with
   exactly `claude-haiku-4-5-20251001` and `claude-sonnet-5`; synthetic
   data only; ceilings $1.00/request, $25/run, $40/day, $60/month with
   the provider-console hard cap at $60; caching, Batch, tools, and all
   provider-side storage OFF; no fallback; bounded EXP-0001-only scope.
2. **Option B — cheaper configuration:** OpenAI API with
   `gpt-5.4-nano-2026-03-17` and `gpt-5.6-terra` (≈$3.50 vs ≈$5.80
   expected case — about 1.7x cheaper) at the price of a
   storage-by-default API surface requiring
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

Evidence: the packet's §12 source list (every entry an official page
accessed 2026-07-19, tied to the matrix rows it supports); the repository
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

## Correction note (appended 2026-07-19, Phase 1C.0.1 — original text above is unchanged)

Independent review after PR #15 found that the packet's claim "Gemini
Developer API: no zero-retention offering" was FALSE: the official page
https://ai.google.dev/gemini-api/docs/zdr (last updated 2026-05-28 UTC)
documents a CONDITIONAL ZDR — project-approval-gated abuse-log
sanitization plus a self-serve restriction bundle (`store=false`, no
Search/Maps grounding, no retained Files, no explicit caching, no Live
session resumption; implicit in-RAM caching explicitly ZDR-compatible).
A second wording problem was corrected: Anthropic's "stateless-by-
default" transport must not be read as zero backend retention — the
conservative official default is automatic backend deletion within 30
days with listed exceptions, and Anthropic ZDR requires a negotiated
agreement. Where this record's text above says "stateless-by-default
transport", read "no request-state storage (a state-semantics
property); backend deletion within 30 days by default"; and the
"Unresolved questions" bullet on retention-documentation
reconciliation is RESOLVED conservatively by ledger C4 (the docs page
defers to the commercial policy) rather than remaining UNKNOWN.

The comparison was RECOMPUTED from re-verified evidence (all three
providers re-fetched 2026-07-19) via an explicit weighted model with
sensitivity analysis (packet §5b; full correction record in
docs/PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md). Outcome: the
recommendation is UNCHANGED — Option A (Anthropic) leads the baseline
(4.22 vs OpenAI 3.92 vs Google 3.25) and three of five sensitivity
cases; the COST-dominant (OpenAI 3.95) and LIFECYCLE-dominant (OpenAI
4.30) cases flip to OpenAI, both published explicitly — a Product
Owner who weighs price or model-lifetime stability dominant should
choose Option B, and the packet states plainly that the baseline
margin rests on its uncertainty-penalty rule.
Adjacent re-verification deltas: OpenAI's budget hard stop upgraded to
INFERRED from official 429 wording (help-center confirmation still
unreachable); OpenAI's Chat Completions `store` default and org
ID-verification requirement downgraded to UNKNOWN; Google's corrected
conditional ZDR is recorded as a material asset for the FUTURE
real-client-data decision. This note changes no status: this record
remains proposed, grants no authority, and Q-010 remains open.
