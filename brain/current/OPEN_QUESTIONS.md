# Open Questions and Assumptions

**Updated:** 2026-07-18

Unknowns stay visible until evidence or a ratified decision resolves them.

## Blocking before Phase 1

- **Q-009 — Authoritative runtime human decisions (authenticated human-gate
  mechanism).** BLOCKING for the human fact-resolution loop and every
  runtime path that must prove a human acted.

  **Why this is open.** Repository-level product-owner instructions are
  valid approval evidence for repository governance decisions (the DEC-*
  records ratified this way are legitimate). Runtime artifacts are
  different: a decision or approval object that arrives at a runtime
  boundary needs machine-verifiable authority, and none exists. A
  schema-valid approval object proves shape, not identity — the runtime
  cannot authenticate the human, their session, their role, their
  signature, or their approval authority (the forgeable-approval failure
  DEC-0007 corrected for quarantine release applies to every runtime human
  decision). DEC-0008 additionally requires `self_review: true` on every
  approval the current single reviewer grants, and the approval contract
  has no machine-readable `self_review` field, so even a well-intended
  approval cannot currently be recorded in the required form. Consequence:
  fact resolution cannot safely apply claim revisions — DEC-0012 prepared
  the resolution-safe lifecycle (contradicted claims inactive, lineage
  projection, immutable revisions), but creating the losing claim's
  `contradicted` revision from a resolution decision stays unimplemented
  until authority is machine-verifiable.

  **Option A — Offline Ed25519 approval evidence (recommended).** A
  public-key authority registry committed as non-secret configuration
  (key IDs, roles, validity windows); private keys never committed; a
  canonical signed approval payload (artifact digest, gate, verdict,
  approver identity, explicit `self_review`, nonce/replay identifier,
  timestamp); verification with Node.js built-in `crypto` (no new
  dependency); replay protection via recorded nonces; key rotation and
  revocation through registry updates with decision records. Works
  offline with no provider or network, consistent with DEC-0009.
  **Option B — GitHub-backed approval evidence.** Human approval tied to
  GitHub identity and repository evidence (signed commits, reviewed PRs,
  or workflow attestations). Requires network and GitHub coupling;
  appropriate for repository workflows but less suitable for a future
  standalone product runtime.
  **Option C — Defer runtime authority.** Keep contradiction resolution
  manual and repository-only; no runtime claim-resolution path. Safest
  short-term option, but Phase 1 cannot close the human fact-resolution
  loop.

  No option is chosen here. Option A is recommended; the question stays
  open for Product Owner ratification. Separately: naming an independent
  reviewer remains a distinct requirement for DEC-0008's four
  independent-review gates — it is NOT required for ordinary fact
  resolution by the current Product Owner, provided `self_review: true`
  is authenticated and recorded by whatever mechanism this question
  ratifies.

Q-001 and Q-002 are closed (see the answer log). Provider-backed work is
now gated by the DEC-0009 provider-enablement requirements, not by an open
question.

## Experiment-owned questions

- **Q-005 / EXP-0005:** does artifact-based context passing reduce cost versus long
  conversational context?
- **Q-006 / EXP-0002:** can creative-territory diversity be measured reliably?
- **Q-007 / EXP-0003:** can genericity evaluation be calibrated beyond advisory use?
- **Q-008 / EXP-0004:** do users value cross-channel coherence enough to justify its
  cost?

## Deferred questions

- Which provider enablement (provider, models, data classes, retention/training
  policy, regulatory constraints, secret management, spend ceilings, approval
  gates) first supersedes the DEC-0009 zero-provider policy?
- What is the first production channel adapter?
- When does file-based retrieval stop being sufficient?
- What is the productization boundary between internal Nabtiq tooling and an external
  customer product?
- What analytics access is realistically available for performance learning?

## Assumptions in force

| ID | Assumption | Risk | Revisit |
|---|---|---:|---|
| ASM-001 | Spec-level creative direction can be judged before full production. | medium | EXP-0002/0004 |
| ASM-002 | File naming and selective reads are sufficient for the current brain size. | low | recorded retrieval misses or >200 canonical records |
| ASM-003 | BC-001 cost and survival figures are useful anchors, not universal forecasts. | medium | EXP-0005 |
| ASM-004 | Cross-channel coherence is valuable to target users. | medium | EXP-0004 |

## Answer log

Append resolved answers with date and decision ID, then remove the question from the
active section in the same commit.

- **Q-003 — Implementation runtime** · 2026-07-17 · closed by DEC-0005: Node.js 20 +
  strict TypeScript ESM, no application or agent framework; alternatives recorded in
  the decision.
- **Q-004 — First vertical-slice ratification** · 2026-07-17 · closed by ratified
  DEC-0004: slice boundary unchanged; slice risks remain owned by EXP-0002..0004.
- **Q-001 — Human gate roles** · 2026-07-18 · closed by DEC-0008: Ibrahim Mohamed
  (GitHub @ibra2000sd) holds all four roles effective 2026-07-18, with
  `self_review: true` required on every approval; four gates (quarantine release,
  client-facing publishing, BLOCKING evaluation-gate changes, real client data to a
  model provider) require an independent reviewer, who is not yet named — those
  gates are therefore unapprovable, and quarantine release stays fail-closed
  (DEC-0007 stands) until an independent reviewer and an authenticated gate
  mechanism both exist.
- **Q-002 — Providers, data policy, and spend** · 2026-07-18 · closed by
  DEC-0009 as **"no provider approved"**: zero external providers, the
  deterministic Fake Adapter is the only approved gateway adapter, synthetic
  data only, real client data prohibited from every model path, no network
  access or credentials, external/model spend capped at USD 0 per run and per
  month. Closure is not provider approval: enabling any provider requires a
  new ratified decision meeting DEC-0009's nine requirements.
