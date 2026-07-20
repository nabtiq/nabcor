# Roadmap — evidence-gated outcomes

> A phase advances only when its exit evidence exists. Dates follow measured velocity,
> not wishful planning.

## Foundation — product truth exists *(complete)*

**Outcome:** the new repository represents the Creative OS; source-of-truth hierarchy,
contracts, Second Brain, evaluation authority, and scope boundaries are operational.

**Exit evidence:** `npm run validate` passes; DEC-0001..0003 ratified; DEC-0004
ratified and DEC-0005 (runtime) recorded by the product-owner Phase 1A instruction.

## Phase 1 — truth works *(current — Phase 1A landed, remainder blocked)*

**Outcome:** prompt-only and evidence-rich inputs produce a schema-valid Brand Context
Package: sources, rights, claims with provenance, contradictions, assumptions, and gaps.

**Phase 1A evidence (deterministic kernel only):** contract registry, namespaced
artifact store, Tier-0 classify-input with injection flagging, deterministic
brand-context compiler, English-only language gate — all under `npm run validate`
with runtime tests on synthetic fixtures. The Phase 1A.1 correction pass
(DEC-0006) added declared runtime dependencies with a production-only install
proof, immutable content-addressed capture of inline source material, canonical
`source:` claim references verified against captured content, an isolated
quarantine namespace, explicit-null visual classification. The Phase 1A.2
correction pass (DEC-0007) made the quarantine boundary fail-closed — no
runtime path reads quarantined bytes and no caller-supplied approval metadata
grants release, pending authenticated human-gate implementation (Q-001 at the
time; since closed by DEC-0008 with both release prerequisites still
missing) — and
replaced the UTF-16-ambiguous `#chars=` fragment locator with zero-based
half-open Unicode code-point offsets (`#codepoints=`), moving contracts to
1.3.0. The Phase 1B.1 increment (DEC-0008..DEC-0010) closed Q-001 and Q-002 (gate
roles named; zero providers approved) and added the offline provider-neutral
gateway kernel: strict policy and request contracts, fail-closed adapter and
data-class allowlisting, pre-invocation budget enforcement, context manifests,
truthful zero-token/zero-cost run records, and the deterministic Fake Adapter.
The Phase 1B.2 increment (DEC-0011) added deterministic structured-truth
analysis: claim fact metadata (contracts 1.3.0 → 1.4.0), strict
`truth-profile` and `truth-analysis` contracts, the Tier-0
`analyze-structured-truth` service (exact type-sensitive comparison over
explicit fact slots; open contradictions; profile-relative gaps; explicit
unstructured listings), and the compiler rule that contradictions and gaps
enter a Brand Context Package only through a validated truth analysis. The
Phase 1B.2.1 correction (DEC-0012) fixed that increment's
resolution-semantics defect: contradicted claims are now retained but
inactive as current truth, current truth is a validated lineage projection
over immutable claim revisions (contracts 1.4.0 → 1.5.0 — never caller
omission; cycles, forks, and hidden successors fail closed), and Brand
Context compiles effective claims only. The Phase 1B.2.2 correction
(DEC-0013) closed the residual omission vulnerability DEC-0012 left open:
canonical claim membership now comes from Artifact Store snapshots
(contracts 1.5.0 → 1.6.0) — strict fail-closed enumeration, digest-bound
analyses, runtime rejection of caller claim arrays, and stale-analysis
protection in compilation — so a caller subset can no longer hide an
independent conflicting lineage. The Phase 1B.3A increment (DEC-0014)
closed Q-009 with Option A — offline Ed25519 authenticated human-gate
evidence: a trusted committed policy and versioned public-key registry
(contracts 1.6.0 → 1.7.0), a domain-separated canonical signed payload
bound to the target artifact's exact address and content digest, built-in
crypto verification, fail-closed key lifecycle, authenticated
`self_review`, atomic single-use nonce receipts, an offline key-enrollment
CLI, and the read-boundary address-integrity correction. The Phase 1B.3B
increment (DEC-0015) activated that mechanism: the real Product Owner
public key — ceremony-generated outside the repository and
fingerprint-confirmed — is enrolled as the single least-privilege
`product-owner` authority in registry v2, policy v2 pins registry v2, the
policy-schema `decision_ref` const defect is corrected (contracts
1.7.0 → 1.7.1, synchronized re-issue), and the offline signing CLI
produces derived-identity evidence with fail-closed key-path handling.
Ordinary `fact-resolution-approval` is now operationally available;
legacy approval metadata stays non-authoritative, the four DEC-0008
independent-review gates stay frozen, and the private key never entered
Git, CI, or agent context. The Phase 1B.4 increment (DEC-0016) closed the
deterministic contradiction-resolution loop: an immutable
`fact-resolution-decision` artifact carries the complete requested action
(one open contradiction, exactly one winner, every other participant as a
digest-pinned loser, digest-pinned analysis/snapshot/profile/namespace
state — contracts 1.7.1 → 1.8.0), the Product Owner signs that exact
artifact, and the crash-recoverable application service verifies and
consumes the approval once, creates deterministic `contradicted`
successor revisions (winner and predecessors never mutated), and rolls
the namespace forward to a fresh snapshot and analysis in which the
resolved contradiction is closed — idempotent retries, byte-exact
resume, fail-closed conflicts, single-host/single-writer boundary.
The Phase 1B.5 increment (DEC-0017) made that loop operable by a human:
one thin, safe operator CLI (`nabcor`) orchestrates status, snapshot,
analysis, inspection, decision preparation, public-evidence application,
and completion inspection over the canonical services — read-only and
dry-run commands mutate nothing, every mutation is digest-confirmed,
losers are always re-derived, signing stays in the separate
personally-invoked CLI, and no contract changed. Phase 1B (the offline
foundation) is COMPLETE. The Phase 1C.0 increment produced the
provider-enablement decision packet: official-source research on three
candidates, cost and threat models, secret and gate designs, and
DEC-0018, now RATIFIED as Option A (2026-07-19, verbatim statement in
the decision record): Anthropic API, two pinned models, synthetic only,
conservative ceilings — authorizing the Phase 1C.1 implementation phase
only; no provider enabled yet, active policy unchanged and CI-guarded,
EXP-0001 still unexecuted and separately gated. The Phase 1C.0.1
correction
re-verified all three providers, fixed the false Gemini no-ZDR claim
and the ambiguous Anthropic retention framing (correction ledger), and
recomputed the comparison with explicit weights and sensitivity
analysis — recommendation unchanged except the published cost-dominant and
lifecycle-dominant cases, which favor OpenAI. The Phase 1C.1 increment
(DEC-0019) implemented the ratified enablement as
CONFIGURED_BUT_LIVE_DISABLED: contracts 1.9.0 with the strict
provider-policy-candidate and provider-operational-state contracts and
the migrated gateway policy; the Product Owner-signed candidate with a
CI-verified candidate -> evidence -> authority -> decision -> policy
chain; the raw-HTTPS Anthropic adapter behind the provider-neutral
gateway (pinned endpoint, narrow injected transport, fail-closed live
gates in test-proven order); conservative pre-invocation budget
enforcement; and the macOS-Keychain secret boundary with no provisioned
credential. The Phase 1C.2 increment (DEC-0020) then made EXACTLY ONE
real Anthropic request: contracts 1.10.0 add the immutable
live-provider-call-request signing target, the provider-smoke-result and
provider-reconciliation-record evidence contracts, the trivial
provider-smoke-echo output contract, and turn provider-operational-state
into a fail-closed state machine. The Product Owner provisioned the
Keychain credential and the USD 60 console cap, signed the one-shot
request's exact content digest, and NABCor executed a single succeeded
Haiku request (one transport call, 240 in / 15 out, USD 0.01 settled,
structured output validated), reconciled it against the console review
(with a documented per-request precision limitation), and advanced the
operational state to SMOKE_VERIFIED_EXP_DISABLED. General live invocation
and EXP-0001 execution stay false in every state; the smoke authorization
is consumed and non-replayable.
This is still not Phase 1 completion: no GENERAL live provider-backed or
natural-language extraction exists, no semantic contradiction detection
exists, EXP-0001 has not run and has no results, and no measured
EXP-0001 model costs exist. The remaining path to EXP-0001 is a
separately signed EXP-0001 execution approval and the conscious decision
that governs how live invocation runs for the experiment (the smoke
ceremony verified transport and accounting but did NOT open general live
invocation; quarantine release still requires an independent reviewer).

**Exit evidence (still required):** EXP-0001 passes on synthetic/adversarial fixtures;
seeded fabrication and prompt injection are blocked in the model-backed path; run and
context records exist; actual cost stays within a ratified budget.

## Phase 2 — direction works

**Outcome:** three meaningfully different territories are produced; a human selects or
rejects them; the decision and preference signals persist; the chosen direction
compiles into Brand DNA and a Visual World.

**Exit evidence:** EXP-0002 and EXP-0003 reach their human-calibrated criteria; rejected
territories are not silently recycled.

## Phase 3 — the first slice closes

**Outcome:** one homepage specification and three connected social specifications derive
from the same approved direction, use claim-backed copy, and produce an evidence-rich
evaluation report.

**Exit evidence:** every criterion in `docs/FIRST_VERTICAL_SLICE.md` passes on the
approved benchmark subset; EXP-0004 and EXP-0005 contain measured results.

## Phase 4 — channel adapters

**Outcome:** at least one channel adapter turns a canonical spec into a reviewable
artifact without weakening the truth, brand, approval, or evaluation contracts.

**Exit evidence:** adapter decision record; deterministic channel gates; first new
baseline case measured by construction. Legacy website code may be consulted as
non-canonical evidence but is not imported by default.

## Phase 5 — memory compounds

**Outcome:** a returning brand begins from verified truth and recorded preferences;
rejected directions and resolved facts are not re-litigated.

**Exit evidence:** demonstrated behavioral improvement and measured context/cost delta
across two runs for the same brand.

## Later — only through new decisions

Additional channels, performance-outcome ingestion, publishing automation, generation
at scale, cross-brand learning, product UI, authentication, and billing.
