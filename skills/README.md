# Skills

Per-skill specifications land here in Phase 1, one file per skill
(`<skill-id>.skill.yaml`), following the template in
`docs/AGENT_AND_SKILL_ARCHITECTURE.md` §4: purpose, input/output contracts, required
context, tools, model tier, deterministic validations, failure modes, retry rules,
human approval, token budget, caching, evaluation method.

The initial catalog (what gets specced first) is §3 of that document. Rules that bind
every spec: INV-AGENT-001 (skills are capabilities, not agents), INV-TOK-001 (budget
mandatory), INV-TOK-002 (artifact I/O only), INV-PROV-001 (tier, never provider).

Specifications exist only for implemented capabilities (AGENTS.md rule 11 — no
speculative specs):

- `classify-input.skill.yaml` — Tier-0 deterministic classification
  (Phase 1A, DEC-0005).
- `build-brand-context.skill.yaml` — Tier-0 deterministic compilation
  (Phase 1A, DEC-0005; truth-analysis input per Phase 1B.2, DEC-0011).
- `analyze-structured-truth.skill.yaml` — Tier-0 deterministic
  structured-truth analysis (Phase 1B.2, DEC-0011).

Their model-assisted extensions (catalog Tiers 1–2) remain unimplemented and
**prohibited by the ratified zero-provider policy** (DEC-0009; Q-001 and
Q-002 are both closed — Q-002 as "no provider approved"). This is a policy
boundary, not an unanswered question: enabling any provider requires a new
ratified provider-enablement decision meeting DEC-0009's nine requirements.

In particular, the catalog's `detect-contradictions` capability (Tier 2,
semantic contradiction detection over prose) remains prohibited under
DEC-0009. The implemented Tier-0 `analyze-structured-truth` service is not
that capability: it compares explicit structured fact slots with exact
type-sensitive equality only, and lists prose-only claims as unstructured
rather than interpreting them (DEC-0011). Since Phase 1B.2.1 (DEC-0012) it
analyzes effective lineage heads only: contradicted claims are retained but
inactive as current truth, current truth is a validated projection over the
complete immutable claim revision set (never caller omission), and the
lineage rules live in one place — `src/understand/project-active-claims.ts`.
Since Phase 1B.2.2 (DEC-0013) claim membership itself is
store-authoritative: analysis enumerates the canonical workspace/brand
namespace into a digest-bound claim snapshot, caller-supplied claim arrays
are rejected at runtime, and compilation reconciles the snapshot against
the live store — stale analyses fail closed and require re-analysis.

Authoritative human contradiction resolution is NOT implemented as an
applied action. The authenticated human-gate MECHANISM now exists —
DEC-0014 (Phase 1B.3A) closed Q-009 with offline Ed25519 approval
evidence: signed canonical payloads verified against the committed trusted
policy and authority registry with atomic single-use nonce consumption
(`src/authority/`). A schema-valid decision or approval artifact still
proves shape, not that a human acted, and no skill may treat unsigned
metadata as authentication evidence (DEC-0012). The mechanism is
operationally available for ordinary fact-resolution approval — DEC-0015
(Phase 1B.3B) enrolled the real Product Owner public key as the single
least-privilege `product-owner` authority in registry v2, pinned by policy
v2. Two limits still bound it: a verified approval is evidence, not an
action (creating the losing claim's `contradicted` revision remains
unimplemented); and a valid signature is never sufficient without policy
authorization and nonce consumption.

Quarantine release remains fail-closed: it is a DEC-0008 independent-review
gate, frozen in the active human-gate policy (`independent_reviewer_named:
false`, pinned at the schema layer) because no independent reviewer is
formally named or enrolled — a Product Owner self-signature can never
satisfy it (DEC-0007, DEC-0008, DEC-0014).
