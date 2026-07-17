# NABCor Foundation Report — Phase 0

**Date:** 2026-07-17 · **Branch:** `foundation/phase-0` (durable worktree
`~/Nabtiq/Nabdev/nabcor-foundation`) · **Status:** complete pending human review.

## 1. Repository audit summary

The repository is **not empty**: it is a working website-foundation monorepo
(`README.md` three-layer model; ADRs 001–007; `packages/core` with Zod content schema,
theme contract, SEO, deploy templates; `packages/theme-novalt`; `apps/demo`;
`prompts/01…08` intake→deploy pipeline; `docs/` operational guides). It has already
been validated against a real client archive (`outputs/FINAL-REPORT.md` in the Nabdev
workspace: candidate content passed the repo's own validator; anti-fabrication held)
and measured against a real production build (BC-001 retrospective, josouralazl repo
@ `retrospective/bc-001`, `4b06c2e`). A prior integration pass produced
`NABCOR_FOUNDATION_MASTER_PROMPT_v1.1_BC001.md` + changelog (both committed on this
branch as the BC-001 evidence record).

**Contradiction found and resolved:** the repo's self-definition ("shared foundation
for client websites", `README.md:3`) vs the Master Prompt's Creative-OS category →
resolved by DEC-0001: the monorepo is the **website channel production layer** of the
Creative OS, kept intact.

## 2. Files created (this phase, all on `foundation/phase-0`)

- `constitution/` — PRODUCT_CONSTITUTION.md, NORTH_STAR_EXPERIENCE.md, INVARIANTS.md
  (23 invariants), NON_GOALS.md
- `docs/` (new) — DOMAIN_MODEL.md, PROVENANCE_AND_CONFIDENCE.md, DECISION_SYSTEM.md,
  AGENT_AND_SKILL_ARCHITECTURE.md, MODEL_AND_TOKEN_STRATEGY.md,
  EVALUATION_FRAMEWORK.md, FIRST_VERTICAL_SLICE.md
- `contracts/` — 20 draft-07 JSON Schemas + `validate.mjs` + README (all green)
- `brain/` — current/{NOW,ROADMAP,RISKS,OPEN_QUESTIONS}.md ·
  decisions/DEC-0001..0004 · experiments/EXP-0001..0005 ·
  research/agent-patterns/500-AI-Agents-Projects-analysis.md ·
  learnings/README.md (format) · archive/README.md · research/README.md
- `evals/` — rubrics/{territory-diversity,genericity,brand-fidelity}.md ·
  datasets/README.md (24-brief benchmark plan incl. 6 adversarial) ·
  regression/README.md (8 seeded expectations)
- `skills/README.md` · `AGENTS.md` · this report
- Copied in as evidence records: `NABCOR_FOUNDATION_MASTER_PROMPT_v1.1_BC001.md`,
  `NABCOR_FOUNDATION_v1.0_to_v1.1_CHANGELOG.md`

## 3. Files changed

**None.** No existing repo file was modified — the foundation is purely additive
(Master Prompt §5 "do not rewrite"; A15 "remove nothing"). The §5-binding edits to
`prompts/01…08` are deliberately deferred to Phase 1 first-touch (smallest-change
rule) and tracked in §10.

## 4. Existing work classification

| Classification | Items (evidence) |
|---|---|
| **KEEP** | `packages/core` (content schema `packages/core/src/schema/content.ts`, theme contract, SEO, deploy templates); `packages/theme-novalt`; `apps/demo`; ADRs 001–007; `docs/` guides (build-a-theme, install-a-site, image-naming, deferred-decisions, delivery-baseline); `prompts/01…08`; v1.1 BC-001 records |
| **ADAPT** | `prompts/01…08` — typed artifact/gate bindings per v1.1 §5, applied in Phase 1/4 when each stage is first touched; `README.md` — gains a constitution pointer (Phase 1, one paragraph); `docs/client-intake-protocol.md` — same binding treatment |
| **DEPRECATE** | none — no existing content contradicted the foundation (A15 held on re-audit) |
| **ARCHIVE** | none yet; `brain/archive/` exists for future use |
| **INVESTIGATE** | uncommitted multi-page core work in the **main working tree** (`packages/core/src/routing/`, `schema/site.ts`, `apps/demo/src/app/[locale]/[...segments]/`, multipage tests — observed via `git status`, untouched) → Q-001; `STC.zip` client archive sitting in the Nabdev workspace root (real client data outside a brand namespace — INV-DATA-001/002 hygiene item) |

## 5. Product definition

An **AI Creative Operating System** (DEC-0001): one intelligence spine
(truth → intent → direction → brand world → channels → evaluation → memory) with
websites and social as first channel outputs. Constitution §1–§6; thesis grounded in
BC-001's measured evidence that artifacts + gates + one orchestrator carry the value.

## 6. First vertical slice

Spec-level (DEC-0003), two input modes, five human-gate classes, budgeted at 450k
output tokens (hypothesis) — fully specified in `docs/FIRST_VERTICAL_SLICE.md` with
10 acceptance criteria each naming its verifier.

## 7. Major architecture decisions

DEC-0001 (Creative OS category; monorepo = website channel layer) · DEC-0002
(file-based Second Brain, three layers, no vector DB — revisit trigger defined) ·
DEC-0003 (spec-level slice boundary) · DEC-0004 (BC-001 adoption via evidence classes)
· plus the standing BC-001-validated architecture in the invariants: single
orchestrator + skills (INV-AGENT-001), provider-independent gateway (INV-PROV-001),
observability by construction (INV-OBS-001), deterministic-governs-generative
(INV-DET-001).

## 8. Major risks

From `brain/current/RISKS.md`: RISK-PROD-01 genericity (critical impact) ·
RISK-AI-01 fabrication/trust incident (critical) · RISK-AI-02 judge miscalibration
(high probability) · RISK-COST-01 silent token growth · RISK-ARCH-01 spec↔channel
drift (coupled to Q-001) · RISK-BUS-02 single-operator dependency · RISK-ARCH-03
ephemeral-workspace loss (occurred during this phase — see §13 — now mitigated by
durable worktree + commit checkpoints).

## 9. Open questions

Blocking Phase 1 start: **Q-001** (multi-page work stream relation), **Q-002** (named
humans behind gate roles), **Q-003** (approved providers + spend ceiling; API-billed
preferred). Testable: Q-004..006 (EXP-0005/0002/0003). Full list:
`brain/current/OPEN_QUESTIONS.md`.

## 10. What must be built next (Phase 1)

The Brand Context Package pipeline (see §15) — plus its scaffolding: model gateway
with run-record/context-manifest writing; artifact store with envelope validation;
skill runner with budgets; gate CLI; G4 deterministic scanner; benchmark fixtures for
the Phase-1 cases; regression fixtures; BC-001 learnings import into
`brain/learnings/*.jsonl`; the §4 ADAPT bindings on prompts 01–02 as they're touched.

## 11. What must not be built next

Everything in `constitution/NON_GOALS.md` §1–§2: no website generation, no publishing,
no image-generation infrastructure, no multi-agent runtime, no vector DB, no
auth/billing, no complex UI, no additional channels, no framework adoption without a
decision record. The four website-core deferred doors stay shut.

## 12. Testing and validation completed

- `node contracts/validate.mjs`: **all 20 schemas compile (draft-07/ajv), all 22
  embedded examples validate, all $ids unique** — runnable by anyone, no new
  dependencies (ajv resolved transitively).
- ID uniqueness sweep across all foundation docs: 62 ID definitions
  (INV/DEC/EXP/RISK/Q/ASM/G/BM/P series), zero duplicates.
- Path-reference sweep across all new docs: all repo-relative references resolve
  (cross-repo references to the josouralazl retrospective and Nabdev outputs are
  explicitly marked as external).
- Cross-consistency by construction: every BLOCKING gate maps to an invariant
  (EVALUATION_FRAMEWORK §2); every slice acceptance criterion names its verifier
  (FIRST_VERTICAL_SLICE §10); every constitution principle maps to invariant IDs
  that exist (P1–P12 table ↔ INVARIANTS.md).
- Slice ↔ domain model mapping: every slice artifact is a defined domain entity with
  a contract (FIRST_VERTICAL_SLICE §3 ↔ DOMAIN_MODEL ↔ contracts/).
- NOT validated: Mermaid ERD rendering (syntax follows standard erDiagram grammar;
  render-check it in any Mermaid viewer); the benchmark cases themselves (defined,
  not yet authored — Phase 1).

## 13. Known limitations

- **Decision records are `ratified` pending product-owner review** — DEC-0002 in
  particular was decided by the foundation agent within Master-Prompt constraints and
  needs explicit human ratification (Q-002 context).
- **Budget numbers are hypotheses** (INV-TOK-001 note; EXP-0005 exists to replace them).
- **The 500-AI-Agents analysis** is catalog-level (README/taxonomy), not
  run-the-projects level — sufficient for pattern verdicts, stated in the note.
- **Process incident, disclosed:** mid-phase, the original working copy lived in a
  session-scoped temp directory that was wiped between sessions; all affected files
  were restored verbatim from the session record into a durable worktree and committed
  in checkpoints (`e848471`…). No content was lost; the incident is now RISK-ARCH-03
  and validates the foundation's own working-memory rules.
- Zod/TypeScript typed contract equivalents deferred to Phase 1 (contracts/README
  rationale).
- G2/G3 gates are fully exercisable only on rendered output (Phase 4); at spec level
  they check declarations.

## 14. Recommended next master prompt

> Execute Phase 1 of NABCor on a new branch from `foundation/phase-0`. Scope: the
> Brand Context Package pipeline per `docs/FIRST_VERTICAL_SLICE.md` §3 steps 1–5 and
> §5 modules (gateway, artifact store, skill runner, gate CLI, G4 scanner), governed
> by `AGENTS.md`, within the budgets of `docs/MODEL_AND_TOKEN_STRATEGY.md` §7.
> Author the Phase-1 skill specs in `skills/` from the §4 template. Build the BM-01/
> BM-05/BM-06/BM-07/BM-12/BM-13/BM-23 fixtures and the regression fixtures. Run
> EXP-0001 and EXP-0005, fill their Result sections from real runs. Do not touch
> DIRECT/PRODUCE skills, generation, publishing, or UI beyond the gate CLI. Exit on
> ROADMAP Phase-1 evidence.

## 15. Exact starting point for Phase 1

```text
Implement the canonical Brand Context Package pipeline for both prompt-only and
evidence-rich input, using the approved contracts (source, claim, assumption,
decision, brand-context), the provenance rules (docs/PROVENANCE_AND_CONFIDENCE.md),
the token budgets (docs/MODEL_AND_TOKEN_STRATEGY.md §7), and the evaluation gates
(G4 deterministic + schema validation), with run records and context manifests
written by construction.
```

**Precondition:** product-owner review of this report; answers to Q-001..Q-003;
ratification confirmation on DEC-0001..0004. Do not begin Phase 1 before that review.
