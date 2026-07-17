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
rather than interpreting them (DEC-0011).

Quarantine release remains fail-closed: it requires both a formally named
independent reviewer and a ratified authenticated approval mechanism, neither
of which exists (DEC-0007, DEC-0008).
