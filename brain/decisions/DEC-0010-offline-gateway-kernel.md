# DEC-0010 — Offline provider-neutral gateway kernel

decision_id: DEC-0010
title: "Provider-neutral gateway kernel with a single deterministic Fake Adapter, fail-closed policy enforcement, contract-validated structured output, context-manifest and run-record observability, and pre-invocation budget enforcement"
date: 2026-07-18
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.1 execution instruction of 2026-07-18"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.1 execution instruction authorizing exactly this architecture; self_review: true (DEC-0008)"
approved_at: 2026-07-18

## Context

docs/MODEL_AND_TOKEN_STRATEGY.md defines the gateway as the single boundary
every future model call must cross: provider adapters, routing policy,
structured-output enforcement, budget metering, and run-record writing
(INV-PROV-001, INV-TOK-001/002, INV-OBS-001). DEC-0009 approves zero
providers, so the gateway's first implementation must prove the boundary
itself — request validation, policy enforcement, observability, and budget
preflight — entirely offline. This is infrastructure validation, not model
validation.

## Decision

Implement, in Phase 1B.1, the smallest production-quality offline gateway
kernel with exactly this architecture:

1. **A provider-neutral gateway boundary** (`src/gateway/`): skills and
   product code submit a typed capability request and receive a typed
   `Result`; they never see adapters, model labels, or transcripts. Boundary
   values stay `unknown` until validated against the JSON Schema contracts —
   no hand-maintained TypeScript mirror of the schemas.
2. **A single deterministic Fake Adapter** (`fake` / provider `offline` /
   `deterministic-fake-adapter-v1` / tier 0): returns exact predeclared
   synthetic fixtures for known scenario identifiers, rejects unknown
   scenarios, performs no generative transformation and no inference, and
   exposes an invocation counter so tests can prove rejected requests never
   reached it. It is test infrastructure, not a model (DEC-0009).
3. **Fail-closed adapter allowlisting**: the committed machine-readable
   gateway policy (`contracts/gateway-policy.schema.json` +
   `contracts/gateway-policy.active.json`) pins allowed adapters (`fake`),
   allowed data classes (`synthetic`), no network, no credentials, no real
   client data, tier 0, and zero spend. The policy is validated at gateway
   construction; an invalid or missing policy means no gateway exists.
   Requests naming any other adapter, tier, or data class are rejected
   before adapter invocation with typed failures.
4. **Structured-output validation using existing contracts**: adapter output
   is validated against the requested artifact contract via the existing
   `ContractRegistry`; an artifact is returned only after validation
   succeeds. Deterministic validation failures are not retried.
5. **Context-manifest and run-record observability**: every invocation that
   passes request validation persists a `context-manifest` (what was loaded
   and why, with retrieval failures recorded) before the adapter call, and a
   truthful `model-run` record on success and on post-validation failure.
   Fake Adapter records state tier 0, zero tokens in all four classes,
   `cost: {mode: "free-tier", usd: 0, allocation: "none"}` — the closest
   non-billed mode the contract defines, with zero recorded truthfully —
   and are excluded from model-quality evidence. Completely invalid boundary
   input (request fails schema validation) fails before any record exists;
   that is the documented record-creation boundary.
6. **Pre-invocation budget enforcement**: the request's inline token budget
   is contract-validated; declared maximum output tokens are checked against
   the applicable hard stop, and adapter/iteration limits are enforced,
   all before the adapter is invoked.
7. **A dedicated operational record store** (`model-run` and
   `context-manifest` records) with workspace/brand namespace isolation,
   path-traversal and symlink refusal, validate-before-write, no overwrite,
   and atomic tmp-plus-hard-link writes — the same enforcement idioms as the
   Phase 1A artifact and content stores. Operational records are not forced
   into the canonical artifact store, whose envelope assumptions
   (brand_ref lineage) they do not share.
8. **No provider SDK, no network capability, no credentials, no framework,
   no background agent runtime.** The existing provider-independence and
   dependency-boundary tests remain blocking and unchanged.

## Alternatives

- **Wait for a real provider before building the gateway** — rejected:
  DEC-0009 approves none, and the boundary (contracts, records, budgets,
  fail-closed policy) is exactly the part that must exist and be proven
  before any provider can ever be added safely.
- **Store operational records in the canonical artifact store** — rejected:
  execution-layer records carry their own identity fields instead of the
  artifact envelope (contracts/README.md); forcing them through the envelope
  store would require fabricating `brand_ref`/lineage semantics they do not
  have.
- **Encode the policy in code constants instead of a contract** — rejected:
  code constants have no CI validation path and can drift silently; a strict
  contract plus a committed active policy document makes the zero-provider
  boundary testable and makes any future relaxation a visible schema change.
- **Simulate token counts and costs for the Fake Adapter** — rejected:
  estimated fixture bytes reported as model tokens would fabricate
  measurements (INV-FACT-002); zero is the only truthful accounting for an
  adapter that invokes no model.

## Evidence and assumptions

Evidence: the product owner's Phase 1B.1 execution instruction of 2026-07-18
authorizing this architecture; the ratified DEC-0009 policy it enforces; the
existing contracts (`model-run`, `context-manifest`, `token-budget`) this
kernel writes and validates against, unchanged.

Assumption: the gateway interface (typed request in, validated artifact plus
run/manifest references out) is stable enough that a future provider adapter
slots in behind it without changing skill-facing semantics. The revisit
trigger below covers the case where a real provider needs more than the
boundary currently expresses.

## Consequences

NABCor gains an enforced, observable, budget-checked invocation boundary with
zero external risk: every claim about gateway behavior has a deterministic
test. Future provider work becomes config-plus-adapter behind a proven
boundary, gated by the DEC-0009 provider-enablement requirements. The cost:
the gateway proves infrastructure only — no model-quality signal exists, and
documentation must keep saying so until a provider decision lands.

## Revisit trigger

A provider-enablement decision (DEC-0009 point 9) lands and its provider
adapter cannot be expressed behind the existing gateway boundary without
changing skill-facing semantics — that gap reopens this architecture.
Independently: any gateway path found returning an unvalidated artifact or
skipping a run record reopens this decision as a defect (INV-OBS-001).

## Supersession

supersedes: null
superseded_by: null
