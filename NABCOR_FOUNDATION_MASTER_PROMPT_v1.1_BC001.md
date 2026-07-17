# NABCor Foundation Master Prompt — v1.1 (BC-001 integrated)

**Version:** 1.1 · 2026-07-17
**Supersedes:** v1.0 — the de-facto foundation set. No single v1.0 Master Prompt file ever
existed; v1.0 is defined as `README.md` (three-layer model + locked decisions) +
`prompts/01…08` (intake → deploy pipeline) + `docs/*` (intake protocol, theme guide,
install guide, image convention, deferred decisions, ADRs 001–007, delivery baseline).
This document consolidates that set into one executable prompt and integrates the
accepted findings of **NABCor Baseline Case BC-001** (the Josour Al Azl forensic
retrospective, branch `retrospective/bc-001` @ `4b06c2e` in the `josouralazl` /
insulationbridges repo).
**Change record:** `NABCOR_FOUNDATION_v1.0_to_v1.1_CHANGELOG.md` (same directory).
**Lesson disposition:** `retrospective/BC001_ACCEPTANCE_LEDGER.md` (retrospective branch).

---

## 0. How to execute this prompt

You are a coding agent executing the **foundation phase** of NABCor on a **new
foundation branch** of the `nabcor` repository. Your job is to produce the foundation
*artifacts* listed in §12 — contracts, schemas, gate definitions, the evaluation plan,
and updated documentation — and nothing else.

**The foundation phase is not implementation.** Do not build the vertical slice, do not
build skills, do not build the observability pipeline, do not generate assets, do not
deploy anything. Every schema you write is a contract for work that happens *after* the
foundation artifacts have been human-reviewed and accepted.

Evidence discipline for everything below:

```text
INVARIANT      — a product rule; violating builds must not ship
CONTRACT       — a typed artifact shape the system must honor
GATE           — a validation that runs at a defined point; each is BLOCKING, ADVISORY, or EXPERIMENTAL
HYPOTHESIS     — plausible, valuable, unproven; must be tested on BC-002+, never silently promoted
```

Each BC-001-derived rule carries its evidence class from the retrospective:

```text
VALIDATED_BC001 · SUPPORTED_BC001 · HYPOTHESIS_FOR_EXPERIMENT · PROJECT_SPECIFIC · INSUFFICIENT_EVIDENCE
```

BC-001 is **one measured project**, not universal proof. A `VALIDATED_BC001` tag means
the evidence from that one project is direct and strong — it licenses a rule, and BC-002+
either confirms or amends it.

---

## 1. Product vision (unchanged from v1.0)

NABCor is Nabtiq's shared foundation for delivering client websites — and, over time,
the connected brand assets around them — from messy real-world client intake to deployed
production, with quality gates a small team can trust. It exists because five audited
Nabtiq projects reinvented the same site five ways, and because the measurable goal is a
**≥50% reduction in delivery time** against the pre-NABCor baseline (~40–61 working
hours for a Josour-class bilingual RTL site → target ≤ ~20–30; see
`docs/delivery-baseline.md`).

The core bet is separation: **content** (typed, bilingual, validated), **theme** (a
build-time package that must be contract-complete), and **layout** (the Next.js app that
wires them). BC-001 adds a fourth separated layer: **decisions** (§3, I4).

---

## 2. Locked architecture decisions (unchanged; ADRs 001–007)

| # | Decision | Record |
|---|---|---|
| 1 | Next.js App Router + TypeScript, `output: 'standalone'`, npm | ADR 001 |
| 2 | Static-first, build-time rendering — no CMS, no database, no admin UI | ADR 002 |
| 3 | Theme resolved at build time as a dependency; incomplete theme = build failure | ADR 003 |
| 4 | Language and text direction set on the server (next-intl) | ADR 004 |
| 5 | Tailwind v4 `@theme` + semantic CSS-variable aliases | ADR 005 |
| 6 | Content is typed TypeScript, validated by Zod | ADR 006 |
| 7 | Extensions are a typed contract only — no loader, no registry, no runtime | ADR 007 |

The four deferred doors (`docs/deferred-decisions.md`) — extensions runtime, runtime
theming, search, auth — **stay shut**. BC-001 produced no evidence to reopen any of them.

---

## 3. Product invariants

Invariants are numbered I1–I13. I1–I3 restate v1.0; I4–I13 are new or elevated by
BC-001. Every BLOCKING gate in §8 maps to one of these.

- **I1 — Three-layer separation.** Content, theme, and layout never mix. (v1.0;
  reconfirmed by BC-001's 33-file sweep when styling *was* hardcoded per-component —
  the cost of violating it is measured.)
- **I2 — Static-first, validated before ship.** No CMS, no database; content is code,
  checked by the validator before any build ships. (v1.0; ADR 002/006.)
- **I3 — Bilingual by construction.** Every human-readable field carries `ar` and `en`;
  direction is set server-side. (v1.0; ADR 004.)
- **I4 — Decisions are artifacts.** *(NEW — A1; VALIDATED_BC001 for the practice,
  SUPPORTED_BC001 for the typed form.)* Every durable decision — direction selections,
  assumptions, provenance facts, claim rules, deployment facts — lives in a versioned,
  machine-readable artifact, never only in chat, prose, or memory. Dual-form rule:
  - the **machine-readable artifact** (JSON, schema-validated) is the **source of truth**;
  - a **human-readable rendering** (Markdown) may be generated or maintained alongside it
    for review and client communication;
  - on any conflict, the machine-readable artifact wins; the rendering is regenerated,
    never hand-patched into divergence;
  - a decision that exists only as prose is **unratified** — it binds nobody until typed.
- **I5 — Progressive enhancement is architectural.** *(NEW — A4/F03; VALIDATED_BC001.)*
  Core content must render and remain visible with **no** JavaScript execution, no
  client-side hydration, no IntersectionObserver, no reveal scripts, and no non-critical
  JS. Hiding content is permitted only as an *enhancement*: a proof-of-JS gate must arm
  it, a pure-CSS dead-man rescue must undo it on failure, and an enhanced-state disarm
  must confirm it. BC-001's only user-facing reliability incident (F03: content invisible
  to real users for ~4 days) was this rule inverted.
- **I6 — Anti-fabrication with provenance.** *(Elevated from v1.0 prompts — A3;
  VALIDATED_BC001 as discipline, SUPPORTED_BC001 as mechanism.)* No invented facts,
  claims, statistics, testimonials, partner relationships, certifications, or contact
  details. Every published fact traces to a `client-source-manifest` entry or a
  client-confirmed ledger record; contact facts come only from `brand-context`.
  Generated imagery is always labeled as illustrative and never presented as the
  client's real work, people, or partners.
- **I7 — Arabic-first quality.** *(Elevated — A8; VALIDATED_BC001 for the gate,
  SUPPORTED_BC001 as posture.)* Arabic is a first-class default experience, not a
  translation pass: logical properties throughout, direction-scoped CSS for directional
  effects, Arabic-aware typography. Any text-splitting or per-word animation ships only
  after Arabic screenshots of it are captured and reviewed (F09 is the defect class this
  catches). `defaultLocale` remains a per-client content decision.
- **I8 — Human gates carry the taste.** *(NEW — A11; VALIDATED_BC001.)* Five decisions
  always require a human: (1) creative direction selection, (2) production use of any
  generated asset, (3) content claims and claim-ledger contents, (4) production
  deployment, (5) client communication. Everything else defaults to
  autonomous-with-evidence. Final aesthetic acceptance and client communication are
  never automated.
- **I9 — Observability by construction.** *(NEW — A12; the measurement gaps are
  MEASURED; the schema is SUPPORTED_BC001.)* The first NABCor implementation logs every
  model and workflow run per the §10 record from day one. Basic observability is not
  deferred past product launch; a project whose cost requires forensics to reconstruct
  is an observability defect (BC-001's token accounting took a custom transcript miner).
- **I10 — One orchestrator by default.** *(NEW — A6; SUPPORTED_BC001.)* NABCor's
  execution model is one capable orchestrating context invoking skills (deterministic
  functions, single model calls, tool-assisted calls, bounded agentic workflows) against
  typed artifacts, with human gates. **No new autonomous agent role may be introduced
  without a measured bottleneck** written up against BC-anchored data (what the single
  orchestrator failed to do, with numbers). One-agent-per-skill orchestration is
  explicitly rejected. Any second workspace writing to a shared branch requires a
  fetch/divergence sync gate (F08).
- **I11 — Possession is not permission.** *(NEW — asset provenance doc;
  SUPPORTED_BC001.)* Client photography, brand marks, client documents, and reference
  mockups never enter training sets or benchmarks without explicit recorded permission.
  Rights fields (§6.2) are intake-mandatory. Client photos are corrected, never
  regenerated.
- **I12 — Bounded loops, bounded budgets.** *(NEW — A5; mechanism SUPPORTED_BC001,
  budget values HYPOTHESIS.)* Every generate-style loop carries a max-iteration bound;
  every skill and project carries token budgets (§9); breach pauses work and pings a
  human. Candidate fan-outs are bounded with recorded selection rationale and recorded
  rejects.
- **I13 — Attribution boundaries.** *(NEW — 3.9/L08; VALIDATED_BC001.)* All recorded
  work carries project/workspace/brand/workflow/session/run identity and an attribution
  confidence. Unattributed usage is never silently assigned to a project (a naive count
  would have inflated BC-001 by ~12%).

---

## 4. The decision layer — artifact registry

*(A2; SUPPORTED_BC001. Shapes below are contracts to author in the foundation phase;
field lists are minimums, not finals.)*

Artifacts live in the client repo, versioned by git, **immutable per round**: a revision
round writes a new version and links it (`supersedes` / `superseded_by`), never mutates
history.

**Slice-1 set (★ — required before the first vertical slice runs):**

| Artifact | Purpose | BC-001 evidence |
|---|---|---|
| `client-source-manifest.json` ★ | every client file, its class, and its intake facts incl. rights (§6.2) | F04 — alpha/vector unknown until day 7 |
| `brand-context.json` ★ | canonical brand facts: names/spellings, palette, contacts, domains | F10 — wrong email shipped; spelling unsettled 6 days |
| `claim-ledger.json` ★ | every claimable fact with provenance; the anti-fabrication source | L05 — discipline held by prompt alone |
| `assumption-ledger.json` ★ | open questions with owner + expiry; surfaced at session start | pending items lived in one operator's memory |
| `visual-world.json` ★ | the typed successor of THEME.md: direction, palette rationale, type, lighting, motion stance | L03 — prose contract carried 3 rounds without drift |
| `design-system.json` ★ | per-theme token sets (all themes' values from day 1), compiled to CSS | 33-file sweep when light mode was retrofitted |
| `motion-spec.json` ★ | motion tokens + the I5 safety contract, enforceable by test | F03 |
| `content-map.json` ★ | which fact came from which document; the provenance half of content | F10; re-reading client docs per session |
| `deployment-checklist.json` ★ | instance of the deployment-readiness contract (§6.3) | F01/F02/F08 |
| `decision-record` (any) ★ | instances of `contracts/decision.schema.json` (§6.1) | I4 |

**Second wave (author the contracts when first needed, not speculatively):**
`creative-brief.json`, `creative-territories.json` (only when no client reference
exists — L04), `selected-direction.json`, `image-direction.json`, `website-spec.json`,
`responsive-rules.json`, `evaluation-report.json`.

**Artifact lifecycle and lineage** *(3.10/5.7; states SUPPORTED_BC001, metrics
EXPERIMENTAL)* — every major generated artifact carries:

```yaml
lifecycle_status: generated   # generated | reviewed | accepted | revised | rejected | superseded | published
parent_artifacts: []          # artifact ids this was derived from
derived_from_runs: []         # run_ids that produced it
supersedes: null
superseded_by: null
accepted_by: null             # human identity at the gate, when gated
published_reference: null     # production URL / deploy id once live
survived_to_production: null  # tri-state: true | false | null (not yet determinable)
```

---

## 5. Relationship of the decision layer to the existing pipeline

The v1.0 pipeline shape survives — BC-001 contradicted none of it (A15). The 8 prompts
remain the stage definitions, with these bindings:

```text
01 intake-triage        → also writes client-source-manifest.json entries (incl. §6.2 fields)
                          and extracts vector/transparent masters from source files at intake
                          (F04: never on demand); routes any reference that carries the
                          client's OWN brand/content to extraction AS WELL AS theme-matching
02 content-extraction   → also writes content-map.json, claim-ledger.json entries, and a
                          contradiction register (cross-source conflicts are resolved by a
                          human once, in brand-context.json — never silently)
03 image-triage         → manifest entries gain has_alpha, vector_available, variants,
                          resolution, aspect_ratio (§6.2)
04 image-enhancement    → provenance labels on every generated fill; client photos are
                          corrected, never regenerated (I11)
05 theme-matching       → outcome recorded as a typed decision record (§6.1), not prose only
06 theme-build          → design-system.json with per-theme token tables is the input;
                          themes are accepted only with the I5 reveal-safety pattern and
                          per-theme token completeness (A14)
07 assemble-and-validate→ runs the §8 gate set (the four BC-001 gates join the existing three)
08 deploy               → runs the §6.3 deployment-readiness pre-flight; deploy is gated by I8(4)
```

Structure/content work may begin immediately after intake; **styled implementation waits
for a ratified direction decision** (client reference encoded, or a territory selected)
— BC-001 paid ~40k output tokens for styling before the direction existed
(SUPPORTED_BC001; the ~70% recoverable share is a HYPOTHESIS to measure on BC-002).

---

## 6. Contracts to author in the foundation phase

All contracts are JSON Schema files under `contracts/` in the nabcor repo, each with a
one-page human-readable companion (I4 dual-form). The existing content schema
(`packages/core/src/schema/content.ts`) and theme contract stay authoritative for their
layers; new contracts must compose with them, not fork them.

### 6.1 `contracts/decision.schema.json` *(I4; SUPPORTED_BC001)*

Must support at minimum:

```yaml
decision_id: ""
status: proposed            # proposed | ratified | superseded | revisited
decision_type: direction    # direction | assumption | provenance | claim-policy | deployment | scope | other
title: ""
options: []                 # each: {option_id, summary}
selected_option: ""
rejected_options: []        # each: {option_id, reason}
evidence: []                # each: {kind: file|url|run|measurement, reference}
assumptions: []             # assumption-ledger ids this decision rests on
constraints_introduced: []
affected_artifacts: []
revisit_trigger: ""         # the condition that reopens this decision
supersedes: null
superseded_by: null
decided_by: ""              # human | agent — I8 decisions must name a human
decided_at: ""
```

### 6.2 Asset provenance contract *(3.5/A9; F04 fields VALIDATED_BC001, rights fields SUPPORTED_BC001)*

Extend the client-source-manifest / asset entry with intake-mandatory fields:

```yaml
asset_id: ""
origin: client              # client | generated | licensed | derived
authentic: true             # authentic evidence vs illustrative/generated
vector_available: false
has_alpha: false
variants: {dark: null, light: null}
source_resolution: ""       # e.g. "4032x3024"
aspect_ratio: ""
rights:
  commercial_use: unknown   # allowed | forbidden | unknown
  advertising_use: unknown
  benchmark_use: forbidden  # default-deny (I11)
  training_use: forbidden   # default-deny (I11)
transformation_history: []  # each: {step, tool_or_model, params_reference, run_id}
provenance_label_required: false  # true for every generated asset that renders publicly
```

### 6.3 `contracts/deployment-readiness.schema.json` *(3.7/A10; core items VALIDATED_BC001)*

Pre-flight record covering, at minimum:

```yaml
build_validation: {local_build_green: false, gates_green: false}
environment: {required_vars_present: false, secrets_in_ci_only: false}
assets_ready: {ladders_encoded: false, icons_complete: false, manifest_synced: false}
dns: {expected_records: [], preflight_resolution_ok: false, postflight_resolution_ok: false}
hosting: {compose_placeholders_filled: false, traefik_route_unique: false}
vcs_sync: {fetched: false, divergence_clear: false}      # F08 gate
preview: {url: "", approved_by: null}                     # I8(4) input
rollback: {previous_tag: "", procedure_reference: ""}
smoke_matrix: {locales: [], themes: [], routes: [], console_clean: false, single_variant_asset_fetch: false}
post_deploy_verification: {completed: false, evidence_reference: ""}
ci_outage_policy: retry_before_debug                      # F01: outage is a retry class, not a debugging class
```

### 6.4 Validation-matrix contract *(5.6; SUPPORTED_BC001)*

A machine-readable declaration of required render combinations, consumed by the §8
matrix gate:

```json
{
  "matrix_id": "example",
  "dimensions": {
    "theme": ["light", "dark"],
    "locale": ["ar", "en"],
    "viewport": ["360", "768", "1440"],
    "motion_state": ["default", "reduced"],
    "js_state": ["enabled", "disabled"]
  },
  "required_combinations": "declared-subset",
  "arabic_animation_captures_required": true
}
```

The full cross-product is not mandated; the contract must let a project declare its
required subset, and the F09/F03 combinations (Arabic + any text-splitting animation;
js_state=disabled for every content page) are non-optional.

### 6.5 Context manifest *(5.1; the reconstruction pain is MEASURED, the manifest is SUPPORTED_BC001)*

Every significant model run must be able to record:

```yaml
run_id: ""
skill_id: ""
artifacts_loaded: []          # artifact ids read into context
reason_for_each_artifact: []  # parallel array or {artifact_id: reason} map
fresh_context_size: 0         # tokens
cached_context_size: 0
context_selector_version: ""
```

### 6.6 Context and token budget *(5.2; I12)*

```yaml
fresh_input_budget: 0
cached_input_budget: 0
cache_write_budget: 0
output_budget: 0
max_tool_calls: 0
max_iterations: 0
escalation_budget: 0          # reserve a human may unlock; not silently spendable
```

Budgets exist at skill level and project level. Initial values come from BC-001's
per-skill estimates (`retrospective/data/skill-candidates.json`) and its project anchor
(~1M output tokens for a Josour-class scope) — **the values are HYPOTHESIS_FOR_EXPERIMENT;
the budget mechanism is required.**

### 6.7 Observability run record *(I9/3.9; gaps MEASURED, schema SUPPORTED_BC001)*

Adopt `retrospective/NABCOR_OBSERVABILITY_REQUIREMENTS.md` as the logging contract,
with two additions from BC-001's attribution finding:

```yaml
# per model/tool/image run — append-only JSONL per project
run_id: ""
session_id: ""                    # ADDED: the interactive/cloud session this run belongs to
project_id: ""
workspace_id: ""
brand_id: ""
workflow_id: ""
skill_id: ""
attribution_confidence: confirmed # ADDED: confirmed | likely | unrelated | unknown
artifact_ids_in: []
artifact_ids_out: []
provider: ""
model: ""
prompt_version: ""
input_tokens: 0
output_tokens: 0
cached_tokens: 0                  # cache READS — first-class, never omitted
cache_creation_tokens: 0          # cache WRITES — first-class, never omitted
reasoning_tokens: null            # null where the provider doesn't split — never estimated silently
cost: {mode: subscription, allocation: none}  # measured only when API-billed; modes never conflated
latency_ms: 0
tool_calls: 0
retry_count: 0
failure_type: null
human_review: none
accepted: null                    # accepted | rejected | superseded — set when known
rejected_reason: null
revision_reason: null
superseded_by: null
```

Privacy, retention, redaction, per-client isolation, sampling, budget-breach alerting,
and anomaly thresholds follow the observability doc's policies verbatim.

---

## 7. Context, cache, and cost governance *(3.2/A5)*

BC-001's measured shape (VALIDATED_BC001 as measurement):

```text
Fresh input 152,442 · Output 915,409 · Cache writes 4,718,197 · Cache reads 312,791,272
Tool calls 1,134 · User turns 37 — cache reads were ≈78% of API-equivalent cost
```

Rules:

- **Measure everything (INVARIANT via I9).** Token governance accounts for cache reads,
  cache writes, context payload size, repeated artifact reads, per-skill context
  consumption, artifact survival, superseded outputs, and retry/revision cost — not just
  output and fresh input. Anything unmeasurable at call time is recorded as `null`,
  never estimated silently.
- **Caching is not a substitute for context minimization (rule).** Cache pricing
  discounts repeated context ~10×; it does not make repeated context free, and it hides
  growth. Context reduction targets what is *sent*, not what it costs this month.
- **Artifacts are the canonical small reads (HYPOTHESIS_FOR_EXPERIMENT — L14).** Typed
  artifacts (brand-context, content-map, visual-world) should replace re-reading raw
  client files and long prose across rounds. Expected effect on cache-read volume is
  unquantified; BC-002 measures it via the context manifest.
- **Session strategy (SUPPORTED_BC001 — L01/L02).** Prefer one long cache-warm session
  per round over many cold sessions; new task ⇒ new scoped prompt + artifacts, never
  transcript forwarding. Revision rounds re-enter at the artifact they change and never
  re-derive upstream artifacts.
- **Model tiering (SUPPORTED_BC001 — L12).** Creative/architectural work on the top
  tier; ops/deploy/mechanical work on the mid tier. Encode as a `model_capability`
  routing field per skill, not operator habit.
- **Anomaly alerts (SUPPORTED_BC001).** Hour-bucket output > 3× project median pauses
  and pings (would have flagged BC-001's F05 dead-end in flight). Budget breach ⇒ pause
  + human ping (I12).

---

## 8. Validation gates

Existing v1.0 gates (all BLOCKING, unchanged): `validate-content` green ·
`npm run build` clean · `typecheck` green (theme contract totality) · `test:a11y`
passing on `/en` and `/ar`.

New gates from BC-001:

| Gate | What it checks | Status | Maps to | Evidence |
|---|---|---|---|---|
| G1 JS-disabled render | every content page renders all content with JS off; enhancer-sabotage shows the CSS rescue | **BLOCKING** | I5 | F03 (VALIDATED_BC001) |
| G2 Arabic animation captures | screenshots of every text-splitting/per-word animation in Arabic, reviewed before ship | **BLOCKING** | I7 | F09 (VALIDATED_BC001) |
| G3 Theme × locale × viewport matrix | declared §6.4 matrix rendered and reviewed; includes motion_state and js_state dimensions | **BLOCKING** (for the declared required subset) | I3/I5/I7 | L10 (SUPPORTED_BC001) |
| G4 Claim-ledger scan | built output scanned against claim-ledger + brand-context: contact strings, names, numbers, certs must all be ledger-backed | **BLOCKING** (deterministic match) / **ADVISORY** (model paraphrase check) | I6 | F10 (VALIDATED_BC001 for the miss class) |
| G5 Deployment pre-flight | §6.3 record complete and green before any production push | **BLOCKING** | I8(4)/I13 | F01/F02/F08 (VALIDATED_BC001) |
| G6 Contact-sheet approval | any generated asset enters production only via a reviewed contact sheet with recorded accepts/rejects | **BLOCKING** | I8(2)/I12 | imagery rounds (SUPPORTED_BC001) |
| G7 Composition-milestone screenshot review | screenshot review at composition milestones, not only at round end | ADVISORY | I8 | A7 (SUPPORTED_BC001) |
| G8 Genericity critique | model critique against known-default fingerprints | EXPERIMENTAL | — | skill doc (untested) |

A BLOCKING gate that cannot run is a failed gate, not a skipped one.

---

## 9. Agent and skill execution model *(I10/I12)*

- One orchestrating context invokes **skills**, each declared with: shape
  (deterministic function | single model call | tool-assisted call | bounded agentic
  workflow | human-led), `model_capability` tier, token budget (§6.6), required
  artifacts in, artifacts out, and its gates.
- The BC-001 skill priority list (`retrospective/data/skill-candidates.json`: 14 BUILD,
  3 EXPERIMENT, 2 REJECT) is the seed backlog. The two rejections are binding:
  no agent-per-skill; no automated final design approval.
- Deterministic work (encode ladders, token compilation, screenshot capture, DNS/deploy
  checks, claim string-matching, keying) ships as tested library code, not per-project
  scratch scripts (L11) — authored in the implementation phase, specified here.
- Known engine quirks and platform lessons live in a shared learnings register seeded by
  `retrospective/data/nabcor-learnings.jsonl` (e.g. F05: Chromium eager-loads lazy
  images in `display:none` subtrees), consulted by frontend skills before novel
  delivery architecture. *(HYPOTHESIS_FOR_EXPERIMENT — L13.)*

---

## 10. Evaluation framework

Every evaluator declares itself **BLOCKING**, **ADVISORY**, or **EXPERIMENTAL**.

**Deterministic (BLOCKING unless noted):**
- Schema validity of every typed artifact (I4).
- Claim provenance: G4 deterministic scan (I6).
- JS-disabled content visibility: G1 (I5).
- Theme/locale/viewport matrix completion: G3 (I3/I5/I7).
- Required Arabic screenshots present: G2 capture-existence check (I7).
- Asset-rights completeness: every manifest entry carries §6.2 rights fields (I11).
- Deployment pre-flight completeness: G5 (I8).
- Artifact lineage completeness: every major artifact carries §4 lifecycle fields (I4) — ADVISORY until BC-002 validates the fields, then BLOCKING.
- Token-budget compliance: recorded spend vs §6.6 budgets (I12) — BLOCKING as "breach pauses work," not "breach fails the build."

**Model-assisted (ADVISORY unless noted):**
- Creative distinctiveness; generic-AI appearance (G8 — EXPERIMENTAL).
- Brand coherence across pages; cross-channel coherence (EXPERIMENTAL — no BC-001 evidence for non-website channels, A16).
- Arabic visual quality review (feeds the human gate; the G2 captures are its input).
- Motion supports vs obstructs hierarchy.

**Human (BLOCKING at their gates — I8):**
- Pairwise direction preference / direction selection.
- Reference-image relevance confirmation.
- Revision-brief approval before revision work starts (SUPPORTED_BC001 — the written
  brief produced BC-001's one-cycle approval).
- Candidate rejection with recorded reason (G6).
- Final visual confidence; publishing approval.

**Experimental metrics (3.10 — compute from §6.7 records; do not treat as targets until
their calculation is validated on BC-002):**

```text
Production Survival Rate   = accepted-and-published output share
Useful Token Yield         = tokens attributable to surviving artifacts / total output
Cost per Accepted Artifact · Cost per Published Artifact
Discarded Token Ratio      = superseded+rejected output share (BC-001 anchor: ≈7%)
Revision Cost              = tokens per revision cycle (BC-001 anchor: ≈303k output)
```

---

## 11. First vertical slice (updated)

```text
Prompt or Brand Files
→ intake triage + client-source-manifest (rights fields, vector/alpha extraction)   [G-none; I11]
→ Brand Context Package  (brand-context.json + claim-ledger.json + assumption-ledger.json
                          + content-map.json + contradiction register, human-confirmed)
→ IF client supplied a visual reference: encode it into the direction decision (L04)
  ELSE: Three Creative Territories (bounded, distinct, recorded)
→ Human Selection        (typed decision record per §6.1 — I8(1))
→ Creative Direction Package (visual-world.json + design-system.json per-theme tokens
                          + motion-spec.json with I5 safety contract + image-direction.json,
                          whose second-wave contract is authored at this step per §4)
→ One Premium Homepage Specification (spec only; bounded asset candidates with recorded
                          rejects; contact-sheet gate G6 for any generated imagery)
→ Three Connected Social Launch Asset Specifications (spec only; EXPERIMENTAL — no
                          BC-001 evidence for non-website channels; runs under the same
                          artifact/gate/budget rules, introduces no channel invariants)
→ Evaluation Report      (deterministic gates G1–G5 as applicable to specs; model-assisted
                          advisories; human approvals recorded)
→ Saved Decisions and Preferences (decision records, lifecycle states, observability
                          records for every run — I4/I9)
```

Slice-wide requirements: asset manifest + rights status; claim and assumption ledgers;
typed direction-selection decision; bounded candidates with recorded rejects;
theme/locale/viewport declaration (§6.4); progressive-enhancement requirements on
anything rendered (I5); token and context budget declared before the first model run
(§6.6); artifact lifecycle on every output (§4); **deployment-readiness specification
authored (§6.3) without performing any deployment**; observability records for every
run (§6.7); human approval gates (I8).

**Excluded from the slice:** full analytics, video generation, autonomous publishing,
agent swarms, multi-page core architecture work, and everything behind the four
deferred doors.

---

## 12. Foundation-phase deliverables (what executing this prompt produces)

On a new foundation branch of `nabcor`, produce exactly:

1. `contracts/decision.schema.json` (§6.1) + human-readable companion.
2. `contracts/asset-provenance.schema.json` (§6.2) — or an equivalent extension of the
   existing content/manifest schema, with a written justification if equivalent.
3. `contracts/deployment-readiness.schema.json` (§6.3) + companion.
4. `contracts/validation-matrix.schema.json` (§6.4).
5. `contracts/context-manifest.schema.json` (§6.5) and
   `contracts/token-budget.schema.json` (§6.6).
6. `contracts/run-record.schema.json` (§6.7), aligned with
   `retrospective/NABCOR_OBSERVABILITY_REQUIREMENTS.md`.
7. Artifact lifecycle/lineage fields (§4) — as a shared `contracts/artifact-lifecycle.schema.json`
   fragment referenced by the other contracts.
8. Schemas for the remaining slice-1 artifact set (§4): `brand-context`,
   `claim-ledger`, `assumption-ledger`, `visual-world`, `design-system`, `motion-spec`,
   `content-map`, and the manifest container for `client-source-manifest` (whose asset
   entries use §6.2; `deployment-checklist` is an instance of §6.3, `decision-record`
   of §6.1).
9. Updated pipeline docs: the §5 bindings folded into `prompts/01…08` and
   `docs/client-intake-protocol.md` (smallest edits that bind each stage to its
   artifacts and gates — no rewrites; A15).
10. `docs/evaluation-plan.md` implementing §10, each evaluator labeled.
11. `docs/first-vertical-slice.md` implementing §11.
12. Registration of BC-001 as the first baseline dataset (A13): a
    `benchmarks/BC-001.md` pointer to the retrospective data with its rights
    constraints (I11 — client assets excluded; generated set internal-eval only;
    process knowledge freely reusable).
13. A README section adding I4–I13 to the product constitution, preserving the
    existing three-layer model text.

**Acceptance criteria for the foundation phase:** every schema validates against a JSON
Schema validator; every §8 BLOCKING gate maps to an invariant; every contract named in
this prompt exists (or carries a written equivalence justification); no implementation
code, no skills, no slice execution, no deployment; all JSON/YAML examples in authored
docs are syntactically valid; human review requested at the end.

**Explicitly out of scope for the foundation phase:** everything in §11's exclusion
list, plus the multi-page/services-collection core roadmap (a separate, already-analyzed
work stream — see `outputs/GAP-ANALYSIS.md` in the Nabdev workspace; do not fold it in
here).

---

## 13. BC-001 anchors (empirical input, not targets)

```text
Scope:    30 routes × 2 locales · 2 themes · 24 components · ~19 generated + 15 client
          photos · motion system · forms · SEO · CI/CD · migration · production
Process:  6 days 1h calendar · 5 local sessions + 1 cloud · 4 delivery rounds ·
          1 client feedback cycle (approved) · 2 user-facing incidents (both root-fixed)
Tokens:   152,442 fresh in · 915,409 out · 4.72M cache-write · 312.79M cache-read ·
          1,134 tool calls · 37 user turns · ≈$401 API-equivalent · ≈93% survival ·
          ≈7% discarded
Verdict:  ELEVATED BUT JUSTIFIED (medium-high confidence) — BC-001 defines the scale.
```

Missing from BC-001 (recorded, never backfilled): cloud-session tokens; image-generation
cost; subscription allocation; per-request retry/reasoning splits; compaction events;
native-Arabic formal review; fresh performance audit.

---

*End of executable prompt. Next step after review: execute on a new foundation branch;
do not begin Phase 1 implementation until the §12 artifacts are reviewed and accepted.*
