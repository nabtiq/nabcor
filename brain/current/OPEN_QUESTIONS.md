# Open Questions and Assumptions

**Updated:** 2026-07-19

Unknowns stay visible until evidence or a ratified decision resolves them.

## Blocking before Phase 1

No blocking question is currently open. Q-001, Q-002, and Q-009 are closed
(see the answer log). Provider-backed work is gated by the DEC-0009
provider-enablement requirements, and human fact-resolution APPLICATION
(creating the losing claim's `contradicted` revision from an authorized
approval, composed with DEC-0013 snapshot staleness) is unimplemented
follow-on work under DEC-0014's revisit triggers — a defined next phase,
not an open architecture question.

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
- **Q-009 — Authoritative runtime human decisions (authenticated human-gate
  mechanism)** · 2026-07-19 · closed by DEC-0014 ratifying **Option A —
  offline Ed25519 approval evidence**: a committed trusted human-gate policy
  and versioned public-key authority registry (contracts 1.7.0), a
  domain-separated canonical signed payload covering identity, role, gate,
  target artifact digest, verdict, `self_review`, requester, nonce, validity
  window, key ID, and policy binding, verification with Node.js built-in
  crypto, and atomic single-use nonce consumption through immutable
  receipts. Closure was an architecture decision, not operational
  availability: at closure the active registry contained zero enrolled
  authorities. **Status update (2026-07-19, DEC-0015):** the real Product
  Owner public key is now enrolled (registry v2, least-privilege
  `product-owner` role, policy v2 pin), so ordinary
  `fact-resolution-approval` is operationally available. A valid signature
  is never sufficient without policy authorization and nonce consumption;
  legacy envelope approvals stay non-authoritative; the four DEC-0008
  independent-review gates stay frozen (no independent reviewer is named);
  fact-resolution APPLICATION remains unimplemented.
