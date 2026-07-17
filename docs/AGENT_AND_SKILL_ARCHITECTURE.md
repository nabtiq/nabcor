# Agent and Skill Architecture

**Version:** 1.0 · 2026-07-17 · governed by INV-AGENT-001 (smallest sufficient
structure). Skill *specifications* live in `skills/` from Phase 1; this document is the
architecture and the initial catalog.

## 1. Vocabulary (these words are load-bearing)

| Term | Meaning | Example |
|---|---|---|
| **Agent** | An autonomous context that plans, chooses tools, and iterates toward a goal. NABCor default: **one** orchestrating agent per session. | the orchestrator running a slice phase |
| **Skill** | A reusable, contracted capability the orchestrator invokes: declared inputs/outputs (contracts), context needs, model tier, budget, validations. Not autonomous; no persistent goals. | `extract-source-facts` |
| **Tool** | A concrete callable (file read, image encode, capture, HTTP). Skills use tools. | `sharp` encode ladder |
| **Workflow** | A deterministic sequence/graph of skills + gates with defined preconditions. | the slice pipeline |
| **Deterministic service** | Pure code with no model call — always preferred when sufficient (P11, Tier 0). | schema validation, token compilation |
| **Evaluator** | A skill whose output is an evaluation (verdict + reason + evidence) with declared authority (BLOCKING/ADVISORY/EXPERIMENTAL). | `validate-claims` |
| **Human approval gate** | A workflow node only a named human can pass; produces an approval record. | direction selection |

**The rule of descent (P11):** before proposing an agent, try a workflow; before a
workflow, a skill; before a skill with a model call, a deterministic service. Each step
up requires the step below to be insufficient — and for a new *agent*, a decision
record with measured evidence (INV-AGENT-001).

## 2. The four workflow domains

```text
UNDERSTAND   truth: sources → claims, assumptions, contradictions, brand context
DIRECT       taste: brief → territories → selection → direction, DNA, visual world
PRODUCE      expression: direction → channel specs (website, social; later more)
EVALUATE     judgment: artifacts → evaluations with reasons, evidence, authority
```

Memory (decisions, preferences, learnings) and observability (run records) are
cross-cutting obligations of every domain, not a fifth domain (ASM-005).

## 3. Initial skill catalog

Per-skill full specs (Phase 1) follow the template in §4. Summary catalog — model
tiers per `docs/MODEL_AND_TOKEN_STRATEGY.md`; budgets are output-token oriented
hypotheses anchored to BC-001 skill estimates where they exist (marked †):

### UNDERSTAND

| Skill | Shape | Tier | Budget (out) | Human gate |
|---|---|---|---|---|
| `classify-input` | tool-assisted call | 1 | 5–10k | no — receipt shown |
| `extract-source-facts` | tool-assisted call + validator | 2 | 15–30k | no |
| `build-assumption-ledger` | single call + store | 1 | 1–3k/entry † | closing an assumption |
| `detect-contradictions` | single call + deterministic pairing | 2 | 5–15k | resolution (INV-HUM-001(3)) |
| `infer-audience` | single call | 2 | 3–8k | confirmation optional |
| `build-brand-context` | deterministic compile + call for gaps | 2 | 10–20k † | fact conflicts only |

### DIRECT

| Skill | Shape | Tier | Budget (out) | Human gate |
|---|---|---|---|---|
| `generate-creative-territories` | 3 parallel calls + diversity constraint | 3 | 20–40k † | — |
| `critique-territories` | evaluator call (diversity, genericity) | 3 | 5–15k | — |
| `select-direction` | **human-led**; system records | 0 | ~0 | **yes — Gate 1** |
| `define-brand-dna` | single call + validator | 3 | 10–20k | sign-off |
| `define-visual-world` | single call + token compiler | 3 | 15–25k † | contract sign-off |
| `define-campaign-concept` | single call | 3 | 10–20k | — (slice: launch concept) |

### PRODUCE

| Skill | Shape | Tier | Budget (out) | Human gate |
|---|---|---|---|---|
| `compose-homepage` (spec) | bounded agentic workflow + review gate | 3 | 40–80k | screenshot/spec review |
| `generate-social-concept` ×3 | single calls sharing direction context | 2–3 | 8–15k each | — |
| `adapt-channel-format` | deterministic + call for copy fit | 1 | 3–8k | — |
| `generate-copy` | single call, claim-bound slots | 2 | 5–15k | claims via G4 |
| `create-image-brief` | template + single call | 2 | 5–15k † | house-spec approval once |
| `generate-motion-specification` | spec call + safety contract | 2 | 5–15k † | feel approval |

### EVALUATE

| Skill | Shape | Tier | Budget (out) | Authority |
|---|---|---|---|---|
| `validate-claims` (G4) | deterministic matcher + paraphrase call | 0+2 | 5–15k † | BLOCKING (det.) / ADVISORY (model) |
| `evaluate-brand-fidelity` | vision/judge call vs brand DNA | 4 | 10–20k | ADVISORY |
| `evaluate-genericity` (G8) | judge call + default-fingerprint check | 4 | 10–20k † | EXPERIMENTAL |
| `evaluate-visual-hierarchy` | vision judge on previews/renders | 4 | 10–20k | ADVISORY |
| `evaluate-accessibility` | deterministic (axe, contrast) + review | 0 | ~0 | BLOCKING (channel layer) |
| `evaluate-cross-channel-coherence` | judge across spec set | 4 | 10–25k | EXPERIMENTAL |
| `evaluate-cost` | deterministic rollup vs budgets | 0 | ~0 | BLOCKING (breach ⇒ pause) |

**Website-channel skills** (production-tested in BC-001, live in `prompts/01…08`):
intake triage, image triage/enhancement, theme matching/build, assemble+validate,
deploy — these remain the PRODUCE/EVALUATE path for the website channel and get typed
bindings in Phase 4 (bindings defined in `NABCOR_FOUNDATION_MASTER_PROMPT_v1.1_BC001.md` §5).

## 4. Skill specification template (used for every skill in Phase 1)

```yaml
skill_id: extract-source-facts
domain: UNDERSTAND
purpose: mine classified sources into claim records with fragment-level provenance
input_contract: source.schema.json (classified sources)
output_contract: claim.schema.json[]
required_context: [source records, brand-dna if existing brand, learnings:quirks? no]
tools: [pdf/docx extraction, ocr(lang-aware), image inspection]
model_capability: tier-2 (bilingual extraction; structured output)
deterministic_validations: [schema validity, provenance present on factual claims,
  bilingual pair completeness where source is bilingual]
failure_modes: [outlined-text pdf (no text layer), OCR language gap, injection text,
  paraphrase drift from source]
retry_rules: max 2; on extraction-quality failure, degrade to fragment-cited partial
  output + gap list — never guess
human_approval: none (contradiction resolution happens downstream)
token_budget: {output: 30000, max_tool_calls: 40, max_iterations: 2}
caching: source fragments cache-stable; brand context reused across skills
evaluation: seeded-fact recall + zero-fabrication on adversarial dataset cases
```

## 5. Orchestration rules

- **One orchestrator per session** invoking skills; skills never spawn skills without
  the orchestrator (no hidden recursion).
- **Workflows are deterministic**: preconditions checked by code (e.g. INV-BRAND-001's
  "no channel spec without a ratified direction ref"), not by model judgment (P7).
- **Bounded loops everywhere**: every skill declares max iterations/tool calls; every
  fan-out is bounded with recorded selection (INV-TOK-001).
- **Artifacts cross boundaries, transcripts don't** (INV-TOK-002): a skill receives
  the artifacts its contract names + a context manifest; it returns artifacts.
- **Multi-workspace writes** to a shared branch require the fetch/divergence sync gate
  (INV-AGENT-001; BC-001 F08).
- **Escalation:** a skill that cannot meet its contract within budget returns a typed
  failure (never a degraded artifact silently); the orchestrator may escalate one model
  tier once, then stops for a human (INV-TOK-001 escalation budget).

## 6. What would justify a second autonomous agent

Only a measured bottleneck recorded in a decision: e.g. wall-clock evidence that
long-running EVALUATE sweeps starve interactive work, with token/latency numbers, and
a proposed boundary (what the second agent owns, what artifacts cross, which gates
apply). "It would be faster" without numbers does not qualify. (BC-001: one agent +
one disjoint-scope cloud session delivered everything; the only multi-workspace defect
was the missing sync gate, F08.)
