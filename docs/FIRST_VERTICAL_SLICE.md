# First Vertical Slice

**Version:** 1.1 · 2026-07-17 · **Status: proposed by DEC-0004** (spec-level, two input
modes). It becomes the scope test only if the product owner ratifies that decision.

```text
Prompt or Brand Files
→ Brand Context Package
→ Three Creative Territories
→ Human Selection
→ Creative Direction Package
→ One Premium Homepage Specification
→ Three Connected Social Launch Asset Specifications
→ Evaluation Report
→ Saved Decisions and Preferences
```

## 1. User input

- **Mode A (prompt-only):** a natural-language brief, e.g. *"Create a premium brand,
  website, and launch campaign for a forensic consultancy in Dubai."* Minimum viable
  input: category + market. Everything else becomes assumptions.
- **Mode B (evidence-rich):** a file bundle + optional prompt. BC-001's archive
  (profile PDF, bilingual brochure docx, phone photos, logo files, reference mockups)
  is the reference shape.
- **Mixed:** prompt + partial files — handled as Mode B with a larger assumption ledger.

**Proposed input coverage (subject to the Phase 1 runtime decision):** `.pdf`, `.docx`, `.txt`, `.md` (documents);
`.png`, `.jpg/.jpeg`, `.webp`, `.svg`, `.heic` (images/logos); `.zip` (bundle);
URLs (client's own site). Video and audio are accepted-but-parked (source record with
kind `video`, mined later — BC-001's client video was unused). Unknown types →
`unsorted` with a flag, never silently dropped.

## 2. Mode behaviours

- **Prompt-only:** intent readback → honesty screen (inference/assumption labeling,
  INV-FACT-002) → territories from brief + assumptions → all identity values marked
  `proposed`/`provisional`. No factual proof points can exist; copy uses positioning
  roles + explicit confirm-slots.
- **Evidence-rich:** ingestion receipt → extraction with fragment provenance →
  contradiction surfacing (human resolution) → gap list → territories constrained by
  verified brand DNA. Own-brand reference material is mined as well as
  theme-matched (BC-001 FAIL-01 fix).

Full journeys: `constitution/NORTH_STAR_EXPERIENCE.md`.

## 3. System steps → artifacts

| # | Step | Skills (docs/AGENT_AND_SKILL_ARCHITECTURE.md) | Artifacts out |
|---|---|---|---|
| 1 | Ingest + classify | classify-input | `source` records (rights, injection flags) |
| 2 | Extract truth | extract-source-facts, infer-audience | `claim` records (+fragments) |
| 3 | Surface conflicts | analyze-structured-truth (implemented Tier-0 structured layer, DEC-0011); detect-contradictions (Tier-2 semantic layer, prohibited under DEC-0009) | `truth-analysis` (open contradictions) → human resolutions (`decision`) |
| 4 | Ledger the unknowns | build-assumption-ledger | `assumption` records |
| 5 | Compile | build-brand-context | `brand-context` + `creative-brief` |
| 6 | Explore | generate-creative-territories + critique-territories | `creative-territory` ×3 |
| 7 | **Human Gate 1** | select-direction | selection `decision` + preferences |
| 8 | Define the world | define-brand-dna, define-visual-world, define-campaign-concept | `brand-dna`, `visual-world`, `design-system` (compiled), launch concept |
| 9 | Produce specs | compose-homepage, generate-social-concept ×3, generate-copy, create-image-brief, generate-motion-specification | `website-spec`, `social-asset-spec` ×3 (+ motion spec fields, image briefs, `validation-matrix`) |
| 10 | Evaluate | validate-claims (G4/G4b), evaluate-brand-fidelity, evaluate-genericity (G8), evaluate-visual-hierarchy, evaluate-cross-channel-coherence, evaluate-cost | `evaluation-report` |
| 11 | Persist | (deterministic) | decisions, preferences, learnings, `model-run` + `context-manifest` records throughout |

## 4. Human approval gates

1. **Facts** (Mode B, and Mode A confirmations): contradiction resolutions;
   claim-ledger contents (INV-HUM-001(3)).
2. **Direction** (Gate 1): territory selection with recorded rejections (INV-HUM-001(1)).
3. **World sign-off:** brand-dna + visual-world review (lifecycle → `accepted`).
4. **Acceptance:** final review of specs + evaluation report (INV-HUM-002 — a human,
   never a judge model, accepts).

(G5 publication and G6 generated-asset gates exist in contracts but do not fire in the
slice — nothing is published and nothing is generated beyond briefs.)

## 5. Modules needed (Phase 1–3 implementation surface)

- Model gateway (INV-PROV-001) with run-record + context-manifest writing (INV-OBS-001).
- Artifact store: per-brand namespace directories + envelope validation on write
  (file-based; DEC-0002).
- Skill runner: loads skill spec, enforces budget/iterations (INV-TOK-001), calls
  gateway, validates outputs against contracts.
- Workflow engine (thin): the §3 sequence with deterministic preconditions
  (INV-BRAND-001 check between steps 7→9) — a script, not a framework.
- Gate CLI: presents artifacts for human gates, records approvals/decisions.
- Evaluators: G4 deterministic scanner + the model-assisted evaluator skills.

## 6. UI surfaces needed (minimal — NON_GOALS excludes a complex UI)

Phase 1–3 default: **files + a gate CLI** (renderable markdown/HTML previews of
territories and specs; approval prompts writing decision records). A minimal web
review surface is Q-008 — only if the CLI proves unusable for territory comparison.

## 7. Out of scope

Everything in `constitution/NON_GOALS.md` §1 — notably: website build/publish, image
generation, auth/billing, analytics, multi-agent runtime, vector DB, additional
channels.

## 8. Failure states (each with recovery)

| Failure | Behaviour |
|---|---|
| Unextractable source | stated on receipt; gap list grows; nothing guessed |
| Open critical contradiction | downstream renders provisional; publication-critical facts block |
| Territory collapse (low diversity) | one bounded regeneration with explicit axes; else present fewer, honest options |
| All territories rejected | rejections recorded as preferences; one bounded new set |
| Budget breach | pause at last complete artifact; human chooses continue/narrow/stop (INV-TOK-001) |
| Injection detected in source | quarantine + flag; never executed (INV-SEC-002) |
| Skill contract failure after retries | typed failure to orchestrator; one tier escalation; then human |
| Evaluator unavailable | dimension reported as `info: not evaluated` — never silently skipped |

## 9. Token and cost budget

Per `docs/MODEL_AND_TOKEN_STRATEGY.md` §7: output budget **450k** (hard stop 550k),
max tool calls 600, escalation reserve 50k, API-equivalent ceiling ≈$60–90 (stated
assumptions). Budget artifact: `budget_slice_0001` instance of
`contracts/token-budget.schema.json`. EXP-0005 measures the real baseline; numbers are
hypotheses until then.

## 10. Acceptance criteria (each names its verifier)

1. Both modes run end-to-end producing all §3 artifacts — schema-valid
   (`contracts/validate.mjs`-class validation at runtime; deterministic).
2. Zero unsupported factual claims in any spec — G4 (BLOCKING).
3. Seeded fabrication + seeded stale fact caught — regression set (deterministic).
4. Seeded injection case flagged, not executed — regression set (INV-SEC-002).
5. Three territories with recorded differentiation axes; diversity evaluated —
   EXP-0002 method (EXPERIMENTAL evaluator + human check).
6. Every channel spec carries `visual_world_ref` + `direction_ref` — schema
   (INV-BRAND-001, BLOCKING).
7. Human decisions recorded at all §4 gates with `decided_by` — decision records
   (INV-HUM-001).
8. Evaluation report complete: every §3-step dimension evaluated or explicitly
   `info: not evaluated` with reason — evaluation-report schema (INV-EVAL-001).
9. Full run-record + context-manifest trail; cost actuals vs budget on the report —
   INV-OBS-001/INV-TOK-001 (BLOCKING for the slice's definition of done).
10. Rejected territories persist with reasons; preferences extracted — artifact store
    check (INV-MEM-001).

## 11. Security boundaries

Per-brand namespace isolation (INV-DATA-001) · rights fields on every source, benchmark
use default-deny (INV-DATA-002) · injection quarantine (INV-SEC-002) · no secrets in
artifacts/prompts (INV-SEC-001) · provider data policies respected for client content ·
no client PII in benchmark or regression sets.

## 12. Definition of done

All §10 criteria green on: (a) one evidence-rich benchmark case, (b) two prompt-only
benchmark cases, (c) the adversarial regression subset — within the §9 budget, with
EXP-0001/0002/0005 result sections filled from the runs, and a human acceptance
recorded on the final evaluation reports.
