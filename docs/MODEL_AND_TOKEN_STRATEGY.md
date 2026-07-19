# Model Gateway and Token Strategy

**Version:** 1.2 · 2026-07-18 · governed by INV-PROV-001 (provider independence),
INV-TOK-001/002 (budgets, artifact passing), INV-OBS-001 (run records).
Empirical anchors: BC-001 measured usage (`retrospective/data/token-summary.json` in
the josouralazl repo, branch `retrospective/bc-001`).

## 1. The gateway

All model calls — text, vision, image, future video — go through one gateway module
(Phase 1 implementation). The gateway owns: provider adapters · model-id configuration
· routing policy · retries/backoff · structured-output enforcement · budget metering ·
run-record writing (every call, no exceptions) · prompt-cache management · redaction.

Product code and skills see: `invoke(skill_capability_request) → typed artifact`.
They never see provider SDKs, model ids, or raw transcripts (INV-PROV-001; enforcement:
grep gate — no provider SDK import outside the gateway).

**One provider is configured and live-disabled (DEC-0018 Option A ratified;
implemented by DEC-0019 as CONFIGURED_BUT_LIVE_DISABLED).** The gateway
kernel (DEC-0010, `src/gateway/`, migrated by DEC-0019) implements the
boundary: a strict policy contract
(`contracts/gateway-policy.schema.json` + committed active policy) pins the
ratified constants — exactly the `anthropic` and `fake` adapters, synthetic
data only, tiers 0-2, the exact model allowlist
(`claude-haiku-4-5-20251001` tier 1, `claude-sonnet-5` tier 2), USD
1/25/40/60 request/run/UTC-day/UTC-month ceilings, 200k/32k token ceilings,
two attempts, zero escalations — plus a mandatory cryptographic binding to
the Product Owner-signed provider-policy candidate (CI re-verifies the
complete candidate -> evidence -> authority -> decision -> policy chain).
Requests are contract-validated; budgets are enforced before invocation
(conservative integer-cent reservation from the pinned price table); a
context manifest is persisted before every adapter call; and every
invocation that passes request validation writes a truthful `model-run`
record. **Live invocation is disabled fail-closed**: the committed
provider-operational-state pins it off as a schema constant, no credential
exists in NABCor, and a live call additionally requires a separately
signed, unconsumed live-call approval — so no provider call or spend has
occurred and CI is mock-transport only. The deterministic Fake Adapter
remains test infrastructure, not a model: its Tier-0 records carry zero
tokens and `cost {mode: "free-tier", usd: 0, allocation: "none"}` and are
**excluded from model-quality and product-quality evaluation** (they never
populate EXP-0001). Anthropic provider runs record `cost {mode: "api",
allocation: "measured"}` from provider-reported usage — none exist yet.

**Human-gate verification never touches the gateway.** Authenticated
approval evidence (DEC-0014, `src/authority/`) is Tier-0 deterministic
code: offline Ed25519 verification with Node.js built-in crypto, zero
tokens, zero spend, no adapter, no network, no model-run record — it is an
authorization boundary, not a model capability, and it consumes no budget.
Approving "real client data to a model provider" is one of its gates, but
that gate is frozen (independent review required, no reviewer enrolled) and
its release would additionally require the DEC-0009-superseding provider
decision.

## 2. Model tiers

Tiers name **capability classes**, not models. Model ids live in gateway config only.

```text
Tier 0  deterministic code — no model. Always preferred when sufficient (P11).
Tier 1  inexpensive extraction/classification — small-context structured tasks.
Tier 2  general generation — solid bilingual writing/extraction, structured output.
Tier 3  advanced reasoning / creative direction — territories, visual worlds,
        homepage composition; the taste-critical tier.
Tier 4  advanced multimodal evaluation — vision judging of previews/renders/captures.
```

BC-001 evidence for tiering (L12, MEASURED usage / INFERRED quality-equivalence):
creative/build rounds ran the top tier (679k output tokens), ops rounds ran a mid tier
at roughly half the token price (236k output) with no observed quality gap on their
goals. Rule: creative/architectural → Tier 3; mechanical/ops → lowest sufficient tier;
escalate only on typed failure, once, then human (escalation budget).

## 3. Routing policy inputs

Route by: task complexity · reasoning need · vision need · context size · sensitivity
(client data → providers cleared for it) · expected business impact (client-facing
creative > internal drafts) · cost budget remaining · latency need · model reliability
history (from run records) · structured-output requirement. Policy is a table in
gateway config, versioned; changes that alter tiering need a decision record.

## 4. Token-efficiency strategies (each traces to evidence or is labeled hypothesis)

| Strategy | Rule | Basis |
|---|---|---|
| Artifact passing | skills exchange typed artifacts, never transcripts | INV-TOK-002; BC-001 practice (VALIDATED as discipline) |
| Context selectors | load only the invariants/decisions/learnings the task names; manifest records what+why | AGENTS.md context policy; reduction size is HYPOTHESIS (L14, EXP-0005) |
| Prompt caching | long-session cache-warm work preferred over many cold sessions; stable prefixes (brand context, visual world) structured for cache hits | VALIDATED_BC001 economics: 312.79M cache-reads at 0.1× ≈ 78% of cost |
| Caching ≠ minimization | cache discounts repeated context; it does not license context growth — reduce what is *sent* | BC-001 rule (changelog C10) |
| Input deduplication | one canonical read per artifact per run; repeated reads are a context-selector defect | run-record `artifact_ids_in` makes this measurable |
| Summaries with provenance | long sources summarized into fragment-cited claims once; downstream reads claims, not sources | domain model (Claim layer) |
| Incremental processing | revision rounds re-enter at the artifact they change; never re-derive upstream | VALIDATED_BC001 practice |
| Decision retrieval | only decisions matching the task area load (naming-convention grep) | DEC-0002 |
| Structured output | schema-enforced outputs; retries on validation failure are bounded | P7 |
| Hard iteration limits | every loop bounded; every fan-out bounded with recorded selection | INV-TOK-001; BC-001 bounded 3-candidate practice |
| Escalation-only upgrades | start at the lowest sufficient tier; one escalation on typed failure | L12 |
| Cache invalidation | artifact version bump invalidates dependent cached prefixes; stable ids keep the rest warm | design rule (Phase 1) |
| No transcript forwarding | new task ⇒ new scoped prompt + artifacts | VALIDATED_BC001 (zero conversation-inheritance waste observed) |

## 5. Budget objects

Budgets exist at three levels, all `contracts/token-budget.schema.json` instances:
per **skill** (declared in its spec), per **workflow/phase**, per **project**. Fields:
fresh input, cached input, cache writes, output, max tool calls, max iterations,
escalation reserve. Breach behavior: pause + human ping (never silent continuation,
never silent truncation of quality). Anomaly alert: hourly output > 3× project median
(would have flagged BC-001's F05 dead-end in flight).

## 6. Accounting

Every gateway call writes a `model-run` record with all four token classes, cost
(measured when API-billed; `{mode: subscription, allocation: none}` otherwise — never
conflated), attribution (org/brand/project/workflow/session/workspace/run +
confidence), and artifact lineage. Derived views (Token Usage entity): per-skill
rollups, budget compliance, and the experimental survival/yield metrics
(EXPERIMENTAL until BC-002 validates calculation — INV-EVAL-001).

Preference proposed for Phase 1: **API-billed keys, not subscription sessions**, so
cost is measured rather than estimated (BC-001's true allocation is unknowable).
This preference feeds the future provider-enablement decision DEC-0009 point 9
requires; Q-002 itself is closed as "no provider approved".
**Status (Phase 1C.1):** DEC-0018 was ratified as Option A and DEC-0019
implemented it. The API-billed preference above is honored: the
configured Anthropic path is pay-as-you-go API-billed, so when live calls
are eventually authorized, cost is measured from provider-reported usage
against the pinned candidate price table — never estimated. No measured
cost exists yet (live invocation disabled; no call, no spend).

## 7. Initial first-vertical-slice budget (hypothesis, stated assumptions)

**Assumptions:** one slice run, evidence-rich mode (the more expensive mode), spec-level
outputs only (DEC-0004), no image generation (briefs only), evaluators included,
BC-001 per-skill estimates as priors (†), 20% contingency. Output-token oriented;
fresh/cached input scale with source volume (BC-001-class archive assumed: ~25 files,
one 60 MB-class PDF).

| Stage | Output budget |
|---|---|
| UNDERSTAND (classify, extract, contradictions, assumptions, brand context) | 40–75k |
| DIRECT (3 territories + critique + DNA + visual world + campaign concept) | 60–120k |
| PRODUCE (homepage spec + 3 social specs + copy + image briefs + motion spec) | 70–140k |
| EVALUATE (claims, fidelity, genericity, hierarchy, coherence, cost) | 35–90k |
| **Slice total (output)** | **≈205–425k out** |

Ceilings for EXP-0005: **project output budget 450k tokens; hard stop 550k;
max tool calls 600; API-equivalent cost ceiling ≈$60–90** (at current Tier-2/3 rates —
assumption recorded in the experiment, not a claim). For scale: BC-001's *full
production build* measured 915k output / ≈$401 API-equivalent — the slice is
deliberately about half that scope. No savings are claimed until EXP-0005 measures a
baseline (that is its purpose).

## 8. Cost reporting

Per Constitution §13.5: "what did this output cost and did it survive?" must be a
query. Slice evaluation cards show actuals vs budget (INV-TOK-001); phase reviews show
per-skill rollups; the experimental metrics stay labeled experimental until validated.
