# NABCor North Star Experience

**Status:** proposed with DEC-0004 · **Version:** 1.1 · 2026-07-17
The ideal end-to-end experience for the two input modes. This is the experience the
first vertical slice approximates (`docs/FIRST_VERTICAL_SLICE.md`) and later phases
complete. Artifact names reference `contracts/`; gates reference
`docs/EVALUATION_FRAMEWORK.md`; approval points reference INV-HUM-001.

---

## Mode A — Prompt-only

> "Create a premium brand, website, and launch campaign for a forensic consultancy in
> Dubai."

### User journey (what the user sees)

1. **Intent readback (≤1 min).** The system restates what it understood: category,
   market, language expectation (likely EN-first with AR optional for Dubai — asked,
   not assumed), deliverables, tone signals. The user corrects or confirms.
2. **The honesty screen.** Two visible lists before anything is generated:
   - *What we know* — nothing verified yet; every statement is labeled inference or
     assumption with confidence (e.g. "audience likely includes law firms — inference,
     unconfirmed").
   - *What we need to know* — the assumption ledger as questions: company name? real
     services? existing clients we may name? regulatory constraints?
   The user can answer any, or proceed — unanswered items stay visibly provisional.
3. **Three creative territories (the taste moment).** Three *genuinely different*
   directions — not one idea in three colorways. Each shows: name, one-paragraph
   concept, palette + type direction, imagery world, motion stance, one hero-level
   visual sketch, and *why this fits the brief* — plus what each direction deliberately
   sacrifices. Distinctiveness across the three is itself evaluated (EXP-0002) before
   the user ever sees them.
4. **Selection and refinement (HUMAN GATE 1 — direction).** The user picks one (or
   blends with a written note). The choice, the reasons, and the two rejections are
   recorded as a decision artifact. Rejected territories are kept — they train
   preference memory, and they are never silently re-proposed.
5. **Provisional brand world.** Brand DNA + visual world rendered as a readable
   one-pager: palette with rationale, type, imagery rules, motion language, voice.
   Everything derived from assumptions is marked provisional.
6. **The first artifacts.** One premium homepage specification (section by section,
   with copy referencing only ledger-backed statements — for a prompt-only brand that
   means positioning language, not fabricated proof) and three connected social launch
   assets specs that are recognizably the same world. Copy that needs a fact the user
   never provided renders as a clearly-marked slot ("[3 years in Dubai — confirm]"),
   never as an invented number.
7. **The evaluation card.** Factual integrity (zero unsupported claims — G4), creative
   distinctiveness score with reasons, coherence check across the four outputs,
   accessibility basics, token/cost actuals vs budget.
8. **Save and remember.** Decisions, preferences ("rejected both dark directions",
   "hates serif display"), the assumption ledger, and all artifacts persist to the
   brand's memory. A returning user starts from this state, not from zero.

### System journey (what happens internally)

```text
classify-input → interpret intent (claim records, classification=inference)
→ build-assumption-ledger (open questions, risk-ranked)
→ [G: schema validity on brand-context package]
→ generate-creative-territories ×3 (diversity constraint; critique-territories pass)
→ HUMAN GATE 1: select-direction → decision record (DEC series, preference memory)
→ define-brand-dna + define-visual-world (provisional flags on assumption-derived values)
→ compose-homepage (spec) + generate-social-concept ×3 (specs; visual_world_ref required)
→ EVALUATE: validate-claims (G4) · evaluate-genericity · evaluate-brand-fidelity ·
  evaluate-cross-channel-coherence · evaluate-cost
→ evaluation-report artifact → user card
→ persist: decisions, preferences, learnings, run records (INV-OBS-001)
```

### Failure and recovery paths (Mode A)

- **Vague prompt** ("make it premium"): intent readback returns the narrowest honest
  interpretation + the 3–5 questions that most change the outcome; territories proceed
  only on LOW/MEDIUM-risk assumptions.
- **Territory collapse** (three similar directions): the diversity critique rejects the
  set internally and regenerates with explicit differentiation axes — bounded to one
  retry (INV-TOK-001); if still collapsed, the user sees two honest directions rather
  than three fake ones.
- **User rejects all territories:** rejection reasons captured per territory → new set
  generated against recorded dislikes; bounded; preferences persist.
- **Budget breach mid-slice:** work pauses at the last complete artifact; user sees
  spend vs budget and chooses: continue (raise budget), narrow scope, or stop with
  everything produced so far intact.

### What stays internal

Skill orchestration, model routing and tiers, retry mechanics, context manifests, raw
evaluator transcripts, and the full run-record trail. Visible on demand, never pushed.

---

## Mode B — Evidence-rich

The user provides: logo, brand guide, website, documents, images, services, projects,
customer information. BC-001 is the measured archetype for a mixed evidence bundle,
but it is retained only as a bounded learning source—not as the new intake
implementation (`brain/learnings/BC-001.md`).

### User journey

1. **Ingestion receipt.** Every file classified (text / imagery / reference / unsorted)
   with counts and flags; nothing altered; the user sees what the system thinks each
   file *is* — including "this reference mockup carries your own brand and will also be
   mined for content" (the BC-001 misroute, fixed).
2. **The extracted truth.** A provenance-backed brand model: every fact with its source
   ("operates in Dubai — company-profile.pdf p.3"); every asset with rights and
   technical facts (alpha, vector availability, resolution — INV-DATA-002, F04).
3. **Contradiction surfacing (HUMAN GATE — facts).** Conflicts shown side by side
   ("brochure says Josour, PDF footer says Nosour; logo says Josour — which is
   canonical?" — transliterated from the BC-001 Arabic brand-name conflict).
   The user resolves once; the resolution is a decision record; the losing variants
   stay recorded as contradicted.
4. **The gap list.** What a credible site/campaign for this business normally carries
   that the evidence lacks (certifications? named clients we may publish? project
   photos attributable to named projects?) — as requests, never as auto-fill.
5. **Territories that honor identity.** Three directions constrained by the real brand
   DNA (existing palette, logo, market) — distinct *within* fidelity. If the client has
   a strict brand guide, territories express range inside it and say so.
6. **Selection (HUMAN GATE 1)** — as Mode A, plus brand-fidelity notes per territory.
7. **Cross-channel outputs.** Homepage spec + three launch asset specs, every claim
   ledger-backed, every image slot naming its source asset or its generation brief
   (with the illustrative label where generated — INV-FACT-003).
8. **Evaluation card** — adds brand-fidelity vs supplied identity and evidence-coverage
   (what share of rendered claims trace to sources).
9. **Save and remember** — as Mode A, plus the reusable brand model itself: the second
   project for this brand starts from verified truth, not from the ZIP.

### System journey (delta from Mode A)

```text
ingest → classify-input (per-file source records, rights fields, injection flags
  INV-SEC-002)
→ extract-source-facts (verbatim-first, bilingual un-weave; claim records with
  sourceRef)
→ detect-contradictions → HUMAN GATE: resolutions → decision records
→ build-brand-context (verified DNA + gap list + assumption ledger for the remainder)
→ territories constrained by brand DNA → …same as Mode A from Gate 1 →
→ EVALUATE adds: evaluate-brand-fidelity (vs supplied identity), evidence-coverage
```

### Failure and recovery paths (Mode B)

- **Unextractable source** (outlined-text PDF, no OCR for the language): the limitation
  is stated on the receipt; extraction proceeds from remaining sources; the gap list
  grows; nothing is guessed (BC-001 FAIL-03 class).
- **Contradiction the user cannot resolve now:** carried as an open contradiction;
  everything downstream that depends on it renders provisional; publication is blocked
  on critical facts (name, contact) until resolved.
- **Poor material** (three blurry photos, one-line brochure): the system says so and
  switches the imagery strategy to labeled illustrative generation + requests, rather
  than flattering the material or faking coverage.
- **Injection in a document:** instruction-like content is quarantined on the source
  record, flagged to the user, and never executed (INV-SEC-002).

### Human approval points (both modes)

| Gate | Decision | Records |
|---|---|---|
| Facts | contradiction resolutions, claim-ledger contents | decision records, claim states |
| Direction | territory selection/refinement | decision record + preferences |
| Assets | generated-asset production use (contact sheet) | G6 approvals, rejects with reasons |
| Acceptance | final visual confidence on specs | evaluation-report sign-off |
| Publication | any deploy/publish (out of slice scope) | G5 + INV-HUM-001(4) |

### Key artifacts per step (both modes)

`source` records → `claim` + `assumption` records → `brand-context` →
`creative-territory` ×3 → `decision` (selection) → `creative-direction` + `brand-dna` +
`visual-world` → `website-spec` + `social-asset-spec` ×3 → `evaluation-report` →
`model-run` records throughout.

---

## What "north star" means operationally

The slice ships when Mode A and Mode B both run end-to-end to spec-level outputs with
the gates above. Later phases may add preview rendering, explicitly selected channel
adapters, publishing with G5, performance feedback ingestion, and preference learning
across projects. No adapter is assumed to exist in this clean baseline.
