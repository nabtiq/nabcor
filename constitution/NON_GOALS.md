# NABCor Non-Goals and Scope

**Status:** ratified pending human review · **Version:** 1.0 · 2026-07-17
Everything here is excluded **on purpose**. Items move out of this file only via a
decision record. Re-proposing a listed item without new evidence is a scope defect.

## The scope test

> **Does this feature directly improve the first vertical slice or its evaluation?**

If not, it is deferred by default. If yes, it still passes Constitution §15 (invariant
mapping, measurability, smallest structure, cost estimate) before implementation.

---

## 1. Excluded from the first vertical slice

The slice (`docs/FIRST_VERTICAL_SLICE.md`) produces **specifications and preview-ready
outputs**, not published products. Excluded from it:

- Full website production/build (the existing nabcor pipeline continues to serve real
  clients independently; the slice stops at `website-spec`).
- Actual publishing/deployment of slice outputs (the deployment-readiness *contract*
  exists; executing it is Phase 2+).
- Image/video *generation* infrastructure (the slice produces image **briefs** and
  labeled placeholder strategy, not a generation farm).
- Authentication, user accounts, billing, subscriptions.
- Any UI beyond the minimal surfaces the slice defines (artifact review + gate actions).
- Marketing analytics, performance-outcome ingestion, preference learning across brands.
- A multi-agent runtime; a vector/embedding database (file-based retrieval first —
  DEC-0002).

## 2. Deferred with named preconditions

| Deferred item | Build only when… |
|---|---|
| Additional channels (presentations, ads, video concepts) | slice channels (web + social specs) score measurably well on coherence + distinctiveness (P9) |
| Performance-outcome learning | real published outputs exist with real metrics to ingest |
| Preference learning across clients | per-brand preference memory works and INV-DATA-001 isolation is proven |
| Vector/embedding retrieval | file-based context selectors measurably fail (recorded retrieval misses in learnings) |
| Multi-agent orchestration | a decision record cites a measured single-orchestrator bottleneck (INV-AGENT-001) |
| Automated image generation at scale | image-brief quality is validated and G6 contact-sheet flow exists in tooling |
| Publishing automation | G5 pre-flight is implemented and INV-HUM-001(4) gate is tooled |
| Fine-tuning / training infrastructure | a benchmark shows prompt+context engineering has plateaued AND rights-clean training data exists (INV-DATA-002) |
| Marketplace / templates | never as a template marketplace (anti-goal); revisit only as "brand world starter kits" with a decision record |
| Multi-page website core architecture | the separate work stream (`outputs/GAP-ANALYSIS.md` in Nabdev; in-flight changes in the main working tree) lands via its own decision — not through this foundation |

## 3. Standing exclusions inherited from the website core

The four deliberately shut doors in `docs/deferred-decisions.md` remain shut, with
their published question lists as the price of entry: **extensions runtime · runtime
theming · site search · auth/logins**. BC-001 produced no evidence to reopen any.

## 4. What must never be built (anti-goals, enforceable form)

- Anything that invents, scrapes, or guesses client facts to fill a gap (INV-FACT-001).
- An auto-approve path for final design acceptance or client communication (INV-HUM-002).
- An autonomous publisher without a human gate (INV-PUB-001).
- Per-task agents / one-agent-per-skill (INV-AGENT-001; BC-001 explicit rejection).
- Full-conversation forwarding between agents (INV-TOK-002).
- Direct provider SDK usage inside skills (INV-PROV-001).
- Benchmark or training use of client assets without recorded permission (INV-DATA-002).
- A second source of truth (any doc that competes with the constitution/invariants/
  decisions/contracts hierarchy instead of referencing it).

## 5. "Cool ideas" to reject during early development

Recorded once so they are not re-litigated:

- **"Add a chat interface over everything."** A chat surface is not a workflow; the
  product is artifacts + gates (anti-goal). Revisit only as a thin layer over the same
  artifacts, post-slice.
- **"Generate 10 homepage variants and let the user pick."** Unbounded generation is
  the competitor's model; NABCor's model is 3 evaluated territories with recorded
  rejection (P4, INV-TOK-001).
- **"Let the model browse the client's competitors and copy what works."** Competitor
  imitation is an anti-goal; competitive *analysis* may inform strategy later, with
  provenance.
- **"Auto-post to Instagram."** Publishing without G5 + human gate is prohibited.
- **"Fine-tune on our best outputs."** Premature; rights-gated; see deferrals.
- **"Score everything 1–10 with an LLM judge."** Fake precision (INV-EVAL-001); judges
  are calibrated, scoped, and never the sole authority.
- **"Add LangGraph/CrewAI now so we're ready."** Framework adoption without a measured
  need is prohibited dependency creep (AGENTS.md; INV-AGENT-001). Patterns first
  (`brain/research/agent-patterns/`), frameworks when a decision record justifies one.

## 6. Rejected ideas log

Append-only. Each entry: idea · date · why rejected · invariant/anti-goal cited ·
what evidence would reopen it. (Empty at foundation; the §5 list seeds the categories.)
