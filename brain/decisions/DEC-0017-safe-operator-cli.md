# DEC-0017 — Safe operator CLI for the deterministic truth and fact-resolution workflow

decision_id: DEC-0017
title: "One thin operator CLI orchestrates the canonical truth and fact-resolution services without duplicating or weakening them: read-only inspection is free, every mutation requires explicit namespace/reference/digest confirmation, losers are always re-derived, private keys stay exclusively in the separate personally-invoked signing CLI, and application accepts public approval evidence only"
date: 2026-07-19
status: ratified
proposed_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd), Phase 1B.5 execution instruction of 2026-07-19"
approved_by: "Ibrahim Mohamed — product owner (GitHub @ibra2000sd); approval evidence: the Phase 1B.5 product-owner execution instruction of 2026-07-19 explicitly directing this phase; self_review: true (DEC-0008)"
approved_at: 2026-07-19

## Context

Phase 1B.4 (DEC-0016) closed the deterministic contradiction-resolution
loop, but operating it requires direct knowledge of internal service APIs,
artifact-store layouts, and schema structure: the Phase 1B.4 real-key smoke
test had to be driven by hand-written scripts. The loop is only real
operational capability if a human operator can drive it safely from the
command line. The risk this decision manages is NOT new authority — every
authorization boundary already exists (DEC-0014/DEC-0015/DEC-0016) — but
operator error and boundary erosion: a convenience layer that re-implements
domain logic, hides which state an operation targets, accepts
caller-supplied truth, or drifts private-key handling out of its fenced
ceremony would quietly weaken guarantees the kernel enforces.

This phase crosses none of DEC-0008's four independent-review gates. The
Product Owner is Ibrahim Mohamed (GitHub `@ibra2000sd`); this record
carries `self_review: true` per DEC-0008.

## Decision

1. **The CLI is an orchestration boundary, not a second implementation.**
   `src/cli/nabcor.ts` composes the existing canonical services —
   claim-snapshot capture, structured-truth analysis, decision
   preparation, approval verification/consumption, and crash-recoverable
   application — and implements no truth, lineage, signing, verification,
   or resolution logic of its own. A capability the services do not
   expose is not a capability the CLI may synthesize.

2. **Canonical services and JSON Schemas remain authoritative.** Every
   artifact the CLI reads or writes passes through the contract registry
   and the existing store boundaries; every file it loads is treated as
   `unknown` until validated; digests are recomputed, never trusted from
   earlier CLI output.

3. **Every mutating command requires explicit scope and confirmation:**
   an explicit `--artifacts-root` (no environment-variable or hidden
   default root), explicit `--workspace`/`--brand-ref`, explicit artifact
   references, and a `--confirm-digest` bound to the exact state being
   acted on (the current namespace claim-set digest for snapshot/analysis
   writes, the exact truth-analysis content digest for decision
   preparation, the exact decision content digest for application). A
   generic `--yes` is not sufficient authority. The confirmation digest
   is an operator-error guard, not authentication — authentication
   remains the signed approval evidence alone (DEC-0014).

4. **No command accepts caller-supplied contradiction membership as
   truth.** `resolution prepare` takes references only (analysis,
   fact_key, contradiction fingerprint, winner); losers and every digest
   are re-derived by the existing preparation service (DEC-0016), and the
   analyzer's store-authoritative snapshot rules (DEC-0013) stand
   unchanged.

5. **The CLI never reads a private key.** No `nabcor` command has a
   private-key option; signing remains exclusively the separate
   `sign-approval` CLI, personally invoked by the key owner (DEC-0015).
   `resolution prepare` prints a sign-approval command template whose
   private-key argument is a placeholder — the CLI never guesses,
   resolves, or completes a key path.

6. **Resolution application accepts public approval evidence only** (an
   approval-evidence file), verified and consumed through the existing
   trusted policy/registry/verifier and applied through the existing
   crash-recoverable service. Retry after interruption and idempotent
   completed replay are the service's semantics, surfaced unchanged.

7. **Output is honest and closed.** Default output is human-readable
   English; `--json` emits one stable machine-readable object with no
   ANSI codes, no private material, and no claim/source content — command
   results carry references, digests, and fact summaries only, plus
   canonical artifact fields where a contract already defines them.

8. **`status`, `inspect`, `help`, and every `--dry-run` cause zero
   mutation.** Dry runs compute and display what a real run would do
   (including the confirmation digest a real run requires) without
   persisting anything.

9. **Mutating commands fail closed** — stale analysis, namespace
   mismatch, digest mismatch, unexpected lineage, replay conflict,
   symlink/path attacks, malformed evidence, and confirmation mismatch
   all produce typed, non-zero, stack-trace-free failures under a
   stable documented exit-code map. Expected failures never print stack
   traces; unexpected ones exit under a distinct code.

10. **Nothing else opens.** No provider, model, network, credential,
    real-client-data, publishing, or quarantine-release capability is
    enabled; the four DEC-0008 independent-review gates stay frozen;
    DEC-0009 is unchanged; EXP-0001 remains unexecuted.

**No operator-operation-receipt contract is added.** Every consequential
CLI operation already persists its complete, digest-bound, immutable
outcome in canonical artifacts (snapshots, analyses, decisions, approval
receipts, application records) — an operator receipt would duplicate that
audit surface without adding authority, grow the schema set without a
consumer, and create a second "receipt" concept adjacent to approval
receipts, inviting exactly the authorization confusion DEC-0014 exists to
prevent. Approval receipts remain the sole authority record for
authenticated human gates. If a future need for command-level audit
appears (for example multi-operator attribution), that is a new decision
with its own contract.

## Explicitly rejected

- **Re-implementing analysis/preparation/application logic in the CLI
  "for better output"** — rejected: two implementations drift; the CLI
  renders what the canonical services return, nothing more.
- **A generic `--yes`/`--force` confirmation** — rejected: it confirms
  intent to run *some* operation, not *this* operation on *this* state;
  digest-bound confirmation catches wrong-namespace and stale-state
  operator errors.
- **Environment-variable roots or config-file defaults for stores** —
  rejected: ambient state is how an operator mutates the wrong namespace
  (and how an attacker redirects one); every root is an explicit flag.
- **A `--private-key` flag on `resolution apply` "to save a step"** —
  rejected: it would collapse the separation DEC-0015 established between
  personally-held key material and agent/operator tooling.
- **An interactive confirmation prompt** — rejected for this phase:
  prompts are untestable in CI without a TTY harness, invite blind
  Enter-pressing, and are weaker than digest binding; the CLI stays
  non-interactive.
- **An operator-operation-receipt contract** — rejected as unnecessary
  schema growth (rationale above).

## Evidence and assumptions

Evidence: the Phase 1B.5 product-owner execution instruction of
2026-07-19; the CLI test suites (subprocess-level command, safety,
leakage, exit-code, and JSON-stability coverage plus a full synthetic
end-to-end operator workflow with an ephemeral key); the unchanged green
completion gate.

Assumptions: a non-interactive single-invocation CLI is the right shape
at current scale (a long-running console or TUI would be a new decision);
the existing single-host/single-writer boundary (DEC-0016) covers CLI
usage — two operators mutating one namespace concurrently get the
kernel's fail-closed behavior, not coordination.

## Consequences

A human operator can now drive the full loop — inspect, snapshot,
analyze, prepare, personally sign, apply, verify — without touching
internal APIs or file layouts, and without any new authority surface. The
honest costs: digest-bound confirmation makes mutations deliberately
two-step (dry-run or inspect first, then confirm), operators must manage
explicit roots and references, and the CLI's usefulness is bounded by the
deterministic kernel underneath it — it cannot extract facts from prose,
select winners, or resolve anything without a signed decision.

## Revisit trigger

- Multi-operator attribution or command-level audit is needed — a new
  decision defines an operator-receipt contract properly.
- The workflow outgrows single-invocation commands (interactive console,
  TUI, service daemon) — a new decision.
- Any discovery that a CLI path mutates without confirmation, accepts
  caller-supplied contradiction membership, reads a private key, claims
  authorization from unsigned metadata, or weakens a kernel boundary
  reopens this decision as a defect.
- A provider-enablement decision supersedes DEC-0009 — the CLI's status
  and safety surfaces must be re-reviewed for the provider-era
  guarantees they report.

## Supersession

supersedes: null (orchestrates DEC-0013/DEC-0014/DEC-0015/DEC-0016
capabilities; changes none of their rules)
superseded_by: null
