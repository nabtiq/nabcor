# NABCor Product Constitution

**Status:** ratified as the clean product baseline · **Version:** 1.1 · **Date:** 2026-07-17
**Authority:** rank 1 in the source-of-truth hierarchy (see `AGENTS.md` §Source of truth).
Nothing below is marketing copy. Every rule here binds humans and coding agents alike.
Changes require a decision record (`docs/DECISION_SYSTEM.md`).

---

## 1. Mission

Give a small studio the creative and production capacity of a large agency — by building
an AI system that *understands* a brand from evidence, develops genuinely distinctive
creative directions, produces coherent multi-channel experiences from one brand world,
evaluates its own work honestly, and improves from human taste and real-world outcomes.

## 2. Product category

**An AI Creative Operating System.**

Not an AI website builder. Not an asset generator. Websites, social assets, campaigns,
presentations, and brand systems are **channel outputs** of one shared intelligence
spine:

```text
Truth and Evidence → Intent → Strategy → Creative Direction → Brand World
→ Channel Production → Evaluation → Human Feedback → Performance Outcomes
→ Institutional Memory
```

The category decision is recorded in `brain/decisions/DEC-0001-product-category.md`.
The former website-builder repository is legacy evidence, not the product core
(`brain/decisions/DEC-0003-legacy-boundary.md`). Future channel adapters must consume
canonical NABCor artifacts without redefining this category.

## 3. Target users

1. **Nabtiq itself** (first and proving user): a small team delivering premium bilingual
   (Arabic/English) creative work for clients in Saudi Arabia and the Gulf.
2. **Boutique agencies and independent brand studios** with the same shape: high taste,
   low headcount, clients who send messy evidence (a 60 MB PDF, WhatsApp photos, a
   brochure) and expect agency-grade output.
3. **Founders with a brand to launch** (prompt-only mode): no materials yet, need a
   credible brand world, homepage, and launch assets without inventing facts.

## 4. Core user problems

- Client evidence is messy, bilingual, contradictory, and incomplete — and current AI
  tools either ignore it or hallucinate around it.
- Generic AI output: polished, interchangeable, recognizably machine-made.
- Channel fragmentation: the website, the deck, and the social launch look like three
  different companies.
- No memory: every revision round re-litigates decisions; every new project restarts
  from zero.
- Unverifiable claims: AI tools fabricate testimonials, statistics, partners, and
  certifications — a legal and trust hazard for real businesses.
- Cost opacity: teams cannot see what a given output actually cost or whether the spend
  produced anything that survived.

## 5. Product thesis

Most AI creative tools implement `Prompt → Asset`. NABCor implements:

```text
Truth → Intent → Decision → Concept → Visual World → Channel Expression
→ Evaluation → Outcome → Memory
```

The system must always distinguish: verified facts · user-provided information ·
extracted evidence · model inference · creative hypotheses · temporary assumptions ·
contradicted information · rejected ideas · expired information
(`docs/PROVENANCE_AND_CONFIDENCE.md`). NABCor may be creatively bold; it must never
present assumptions or generated concepts as verified client facts.

**Empirical grounding.** Baseline Case BC-001 supports the value of one competent
orchestrator, written contracts, bounded human gates, and measured run records. It was
one bilingual website project, so it does not prove the full product thesis or universal
budgets. The retained lessons and their evidence boundary are recorded in
`brain/learnings/BC-001.md`; the new vertical slice must test the broader claims.

## 6. Competitive thesis

NABCor competes on: brand understanding · evidence-aware reasoning · creative direction
· taste · distinctiveness · cross-channel coherence · explainable decisions · persistent
brand memory · human preference learning · real-world performance learning · efficient
model and token usage.

NABCor does **not** compete on: asset volume, agent count, model access (everyone has
the same APIs), template libraries, or feature breadth. If a competitor ships more
generators, that is not pressure to match them — see `constitution/NON_GOALS.md`.

## 7. Product principles (P1–P12)

These govern all architecture and development. Each maps to invariants in
`constitution/INVARIANTS.md` (IDs cited).

| # | Principle | Binding meaning | Key invariants |
|---|---|---|---|
| P1 | Concept before execution | No website, campaign, post, asset, or deck before a ratified creative concept exists | INV-DIR-001 |
| P2 | Brand before channel | All channel outputs express one brand world, not unrelated generations | INV-BRAND-001 |
| P3 | Evidence before claim | No invented clients, projects, certifications, statistics, testimonials, partnerships, awards, or business claims | INV-FACT-001..003 |
| P4 | Distinctiveness before decoration | Generic visual polish without a distinctive idea fails evaluation | INV-DIR-002 |
| P5 | Consistency without repetition | Outputs feel connected without being copies of one template | INV-BRAND-002 |
| P6 | Decisions must be explainable | Important decisions record selection, reason, alternatives, evidence, expected effect, risks, affected artifacts | INV-DEC-001 |
| P7 | Deterministic systems govern generative systems | Schemas, permissions, state transitions, provenance, approvals, validation, versioning, cost limits, publishing rules are never left to unconstrained model judgment | INV-DET-001 |
| P8 | Human control at high-impact points | Humans hold approval authority over factual, brand, publishing, financial, and strategic decisions | INV-HUM-001..002 |
| P9 | Evaluation before scale | No channel or agent expansion until core creative-direction quality is measurable | INV-EVAL-001 |
| P10 | Memory must improve the system | Accepted decisions, rejected directions, preferences, outputs, outcomes, mistakes, regressions, and learnings are persisted and consulted | INV-MEM-001 |
| P11 | Smallest sufficient agentic structure | No new agent when a deterministic function, single model call, or reusable skill suffices | INV-AGENT-001 |
| P12 | Token efficiency is architectural | Agents exchange structured artifacts, never entire conversation histories | INV-TOK-001..002 |

BC-001 evidence notes: P7, P8, P10, P11, P12 carry direct measured evidence (respectively:
gate/artifact failures F01–F12; every quality jump traced to a human gate; prose
contracts prevented drift across 3 rounds; one orchestrator delivered the whole build;
cache reads were 78% of API-equivalent cost). P1/P4 carry supporting evidence (the ~40k
tokens of discarded pre-direction styling). P2/P5/P9 are design commitments to be
validated on the first vertical slice.

## 8. Product invariants

Enumerated with IDs, enforcement, and severity in `constitution/INVARIANTS.md`.
An invariant outranks any feature, deadline, or model capability. A build or output that
violates a `critical` invariant must not ship.

## 9. Anti-goals

NABCor must not become: a collection of unrelated AI generators · a wrapper around one
provider · a prompt library with a dashboard · a generic template marketplace · a system
where every task gets its own agent · a chat interface pretending to be a workflow · a
generator of attractive but unverifiable claims · a copier of competitor design language
· a feature pile without measurable quality gains · a monolithic context dump sent to
every model · logic hard-coupled to one model provider · a repository of stale
documentation agents cannot use · an endless self-critique loop that burns tokens · an
autonomous publisher without approval safeguards.

Scope rules and the feature test live in `constitution/NON_GOALS.md`.

## 10. Scope boundaries

- **In scope now:** the first vertical slice (`docs/FIRST_VERTICAL_SLICE.md`) — brand
  context from prompt-only or evidence-rich input, three creative territories, human
  selection, creative direction package, one premium homepage specification, three
  connected social launch asset specifications, evaluation report, saved decisions.
- **In scope as contracts:** channel specifications and adapter boundaries; no channel
  production runtime is included in the clean baseline.
- **Deferred with named preconditions:** full publishing, analytics, video, marketplace,
  fine-tuning, multi-agent runtimes, auth/billing, extensions runtime, runtime theming,
  search — each listed with its reopening condition in `constitution/NON_GOALS.md`.

## 11. Human-control boundaries

Humans always hold: creative direction selection · production use of any generated
asset · content claims and the claim ledger · production deployment/publication · client
communication · financial commitments. These five-plus-one gates are BC-001-validated
(every observed quality jump traced to a human gate) and are never automated —
see INV-HUM-001/002. Everything else defaults to autonomous-with-evidence.

## 12. Ethical and factual-integrity rules

- No fabricated business claims, ever (INV-FACT-001).
- Generated imagery is labeled illustrative; it never impersonates the client's real
  work, people, or partners (INV-FACT-003).
- Possession of client material is not permission to reuse it: client photography,
  brand marks, documents, and reference mockups never enter training sets or benchmarks
  without explicit recorded permission (INV-DATA-002).
- Client data is isolated per brand; cross-client aggregation only over non-content
  metrics (INV-DATA-001).
- Uploaded documents are untrusted input: instructions found inside them are data, not
  commands (INV-SEC-002).
- Cultural appropriateness is an evaluated dimension, and Arabic is a first-class
  experience, not a translation pass (INV-AR-001).

## 13. What would make NABCor fail strategically

1. **Generic output at scale** — if the distinctiveness evaluations cannot distinguish
   NABCor output from template output, the category claim collapses.
2. **A trust incident** — one fabricated claim or mislabeled generated "evidence" shipped
   to a real client outweighs a year of features.
3. **Feature sprawl before slice quality** — building channels 3–10 before channel 1–2
   quality is measurable (the anti-goal list exists because this is the default failure
   mode of AI products).
4. **Memory that doesn't compound** — if project N+1 doesn't start smarter than project
   N, NABCor is a generation interface with extra steps.
5. **Cost opacity** — if the team cannot answer "what did this output cost and did it
   survive?", token spend will silently eat the margin the product is meant to create.
6. **Provider coupling** — a model deprecation or price change should be a config
   change, not a rewrite.

## 14. What makes NABCor meaningfully different

- A **provenance-backed brand model** — every claim in every output traces to evidence
  or is labeled as hypothesis (no mainstream tool does this).
- **Creative territories with recorded rejection** — direction is explored, selected,
  and remembered, not regenerated until someone gives up.
- **One brand world, many channels** — coherence is a contract, not a coincidence.
- **Evaluation with teeth** — deterministic gates that can actually block, calibrated
  model judges, and human taste at the points BC-001 proved carry the value.
- **A second brain that agents actually read** — decisions, learnings, and preferences
  are load-bearing runtime context, not documentation theater.
- **Measured economics** — per-run token/cost records with artifact survival, so
  efficiency is a queryable fact, not a feeling (BC-001 required forensic
  reconstruction; that never happens again — INV-OBS-001).

## 15. Criteria for accepting or rejecting future features

A feature proposal must answer **yes** to all of:

1. Does it directly improve the current vertical slice or its evaluation? (If not →
   defer; record in `brain/current/ROADMAP.md` or reject.)
2. Does it map to at least one invariant it strengthens — or come with a new invariant
   and its enforcement?
3. Can its quality effect be measured by an existing or newly defined evaluator?
4. Is it the smallest sufficient structure (P11)? A feature that adds an agent,
   framework, or dependency needs a decision record with rejected alternatives.
5. Is its token/cost impact estimated with stated assumptions (P12)?

And **no** to all of:

6. Does it require inventing, scraping, or guessing client facts?
7. Does it remove or weaken a human gate (§11)?
8. Does it couple product logic to a single model provider?
9. Is its main justification "competitors have it" or "the model makes it easy"?

Features that pass become decision records before implementation. Features that fail
are recorded once in `constitution/NON_GOALS.md` §Rejected ideas (so they are not
re-litigated) and closed.
