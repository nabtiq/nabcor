# Decision System

**Version:** 1.1 · 2026-07-17 · governs `brain/decisions/` and all durable choices.
Invariant: INV-DEC-001. Contract: `contracts/decision.schema.json`.

## When a decision record is required

Durable choices only: product category/scope changes · architecture choices ·
creative-direction selections (per brand) · contradiction/fact resolutions with lasting
effect · new dependencies, frameworks, or agent roles · anything that supersedes a
prior decision · anything a future session would otherwise re-litigate.

**Not** decision records: meeting notes, status updates, task plans, reversible
day-to-day choices, anything fully derivable from code. NOW.md and working notes exist
for those.

## Format

Repository-governance files use `brain/decisions/DEC-NNNN-<slug>.md` and the template in
`brain/templates/DECISION_TEMPLATE.md`. They require identity, status, proposer,
approval evidence when ratified, context, alternatives, evidence boundary,
consequences, revisit trigger, and supersession.

Runtime/brand decisions are structured artifacts conforming to
`contracts/decision.schema.json`. The Markdown record is canonical for repository
governance; the JSON contract is canonical for product runtime artifacts. IDs are
unique and never reused.

## Status semantics and ratification

- `proposed` — authored (by anyone, including an agent) but **not approved by the
  product owner**. Proposed records bind nobody; they are input for review, cited only
  as proposals.
- `ratified` — explicitly approved by the authorized human. Ratification is recorded
  **as repository evidence**: repository decisions record `approved_by` and
  `approved_at`; runtime decisions carry the schema-defined approval entry. A ratified
  record without human approval evidence is invalid.
- `rejected` — reviewed and declined; the reasoning remains durable.
- `superseded` — replaced by a linked later record.

## Rules

1. A decision is binding only in `ratified` status.
2. Superseding requires a new record linking both directions; the old record is never
   edited beyond its `superseded_by` field.
3. Conflicts between decisions and higher sources (constitution, invariants) resolve
   upward; document the conflict, don't silently patch (`AGENTS.md` §hierarchy).
4. Every ratified decision names its **revisit trigger** — the observable condition
   that reopens it. "Never" is not a trigger.
5. Coding agents must read the decision records touching their task's area before
   changing related code (`AGENTS.md` session rules) and must create one for durable
   changes they introduce.

## Seed records

| ID | Title | Status |
|---|---|---|
| DEC-0001 | NABCor is an AI Creative Operating System | ratified |
| DEC-0002 | File-based Second Brain from day one | ratified |
| DEC-0003 | Legacy website code is evidence, not product core | ratified |
| DEC-0004 | First vertical slice | ratified |
| DEC-0005 | Node.js 20 + strict TypeScript ESM, no framework | ratified |
| DEC-0006 | Runtime packaging truth: Ajv runtime deps, content capture, canonical source refs, quarantine namespace (release claim corrected by DEC-0007) | ratified |
| DEC-0007 | Fail-closed quarantine pending Q-001; Unicode code-point provenance locators; contracts 1.3.0 | ratified |
| DEC-0008 | Human gate roles: Ibrahim Mohamed holds all four roles with mandatory self-review declaration; four gates require independent review; quarantine release stays fail-closed | ratified |
| DEC-0009 | Zero-provider offline execution policy: no external provider approved, Fake Adapter only, synthetic data only, zero spend; Q-002 closed as "no provider approved" | ratified |
| DEC-0010 | Offline provider-neutral gateway kernel: fail-closed policy contract, deterministic Fake Adapter, structured-output validation, manifest/run-record observability, pre-invocation budgets | ratified |
| DEC-0011 | Deterministic structured-truth analysis boundary: explicit fact slots and exact type-sensitive comparison only, profile-relative gaps, open contradictions, no prose interpretation, no gateway/Fake Adapter involvement (contradicted-claims-stay-active judgment corrected by DEC-0012) | ratified |
| DEC-0012 | Resolution-safe claim lifecycle: contradicted claims retained but inactive; current truth from validated lineage projection over immutable revisions, never caller omission; effective-claims-only Brand Context; authoritative human resolution unimplemented pending an authenticated human-gate mechanism (Q-009); contracts 1.5.0 (caller-asserted completeness corrected by DEC-0013) | ratified |
| DEC-0013 | Store-authoritative claim snapshots: Artifact Store is the authority for claim-set membership; deterministic digest-bound snapshots with strict fail-closed enumeration and stable-capture check; caller claim arrays rejected at runtime; stale analyses fail compilation closed; contracts 1.6.0 (read-boundary address-integrity gap corrected by an append-only note under DEC-0014) | ratified |
| DEC-0014 | Q-009 Option A: offline Ed25519 authenticated human-gate evidence — trusted policy + versioned public-key registry, domain-separated canonical signed payload, built-in-crypto verification, atomic single-use nonce receipts, fail-closed key lifecycle; legacy approvals non-authoritative; independent-review gates frozen; no business action applied; contracts 1.7.0 | ratified |
| DEC-0015 | Real Product Owner Ed25519 public-key enrollment: registry v2 with exactly one least-privilege product-owner authority, policy v2 pins registry v2; ordinary fact-resolution approval operationally available; private key never in Git/CI/agent context; safe offline signing CLI; policy-schema decision_ref const defect corrected; independent-review gates stay frozen; no business action applied; contracts 1.7.1 | ratified |
| DEC-0016 | Authenticated fact-resolution application: the signed target is an immutable fact-resolution-decision artifact carrying the complete requested action (exact winner/loser partition, digest-pinned analysis/snapshot/profile/participants); application creates deterministic contradicted successor revisions, never mutates the winner or predecessor, rolls forward to a fresh snapshot/analysis, and is idempotent and crash-recoverable from the immutable receipt under a single-host/single-writer boundary; independent-review gates stay frozen; contracts 1.8.0 | ratified |
| DEC-0017 | Safe operator CLI: one thin orchestration boundary (nabcor) over the canonical truth/resolution services with zero duplicated domain logic; read-only and dry-run commands mutate nothing; every mutation requires explicit roots, namespace, references, and a digest-bound confirmation (operator-error guard, never authentication); losers always re-derived; no private-key surface (signing stays in the separate personally-invoked sign-approval CLI); application accepts public evidence only; stable exit codes and leak-free output; no operator-receipt contract (canonical artifacts already carry the audit surface); no provider/network/gate change | ratified |
| DEC-0018 | First provider enablement, Option A ratified (2026-07-19, verbatim Product Owner statement pinned to commit bbca93a4): Anthropic API with exactly claude-haiku-4-5-20251001 and claude-sonnet-5, synthetic data only, ceilings $1/request $25/run $40/day $60/month, caching/Batch/tools/storage/fallback/escalation disabled; authorizes the Phase 1C.1 implementation phase ONLY — the DEC-0009 posture stays operationally active until that phase's reviewed policy revision merges; EXP-0001 additionally gated on a separate authenticated approval; evidence base corrected by Phase 1C.0.1 (ledger + weighted comparison) | ratified |
| DEC-0019 | Anthropic provider implementation (Phase 1C.1): CONFIGURED_BUT_LIVE_DISABLED — Product Owner-signed provider-policy candidate cryptographically bound to the active gateway policy (candidate -> evidence -> authority -> decision -> policy chain CI-verified); one raw-HTTPS Anthropic adapter behind the provider-neutral gateway with a pinned endpoint, narrow injected transport, and fail-closed live gates; conservative pre-invocation USD/token budget enforcement ($1/$25/$40/$60, 200k/32k tokens, two attempts, zero escalation); macOS-Keychain-only secret boundary with NO provisioned credential; mock-only tests and CI; live invocation, the smoke call, and EXP-0001 each behind separate future authenticated approvals; contracts 1.9.0 | ratified |
| DEC-0020 | Anthropic smoke verification (Phase 1C.2): authorizes EXACTLY ONE minimal real Anthropic request — synthetic input, claude-haiku-4-5-20251001 only, one attempt, zero escalation, USD 0.25 ceremony ceiling under the standing USD 1.00 per-request ceiling — bound to an immutable Product Owner-signed live-provider-call-request consumed exactly once; success requires local validation AND provider-side reconciliation; failure/ambiguity requires a fresh authorization with no retry; the operational-state machine (CONFIGURED_BUT_LIVE_DISABLED -> SMOKE_CALL_AUTHORIZED -> SMOKE_VERIFIED_EXP_DISABLED) keeps general live invocation and EXP-0001 execution false in every state; no general provider access opened; contracts 1.10.0 | ratified |
