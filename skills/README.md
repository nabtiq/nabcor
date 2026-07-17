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
  (Phase 1A, DEC-0005).

Their model-assisted extensions (catalog Tiers 1–2) remain unimplemented and
blocked on Q-002.
